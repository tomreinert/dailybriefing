import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getEmailScheduleSettings } from '@/actions/userSettings';
import { generateBriefingContent, prepareEmailsForBriefing } from '@/lib/briefing-utils';
import { sendBriefingEmail, generateReplyToEmail } from '@/lib/email-service';

// Helper function to fetch user data directly from database
async function fetchUserBriefingData(userId: string, supabase: any) {
  try {
    // Fetch calendar settings
    const { data: calendarSettings } = await supabase
      .from('user_calendar_settings')
      .select('selected_calendars, days_in_advance')
      .eq('user_id', userId)
      .single();

    // Fetch context snippets
    const { data: contextSnippets } = await supabase
      .from('user_context_snippets')
      .select('content')
      .eq('user_id', userId)
      .eq('active', true);

    // Fetch recent emails
    const { data: emails } = await supabase
      .from('emails')
      .select('from_email, subject, text_body, stripped_text_reply, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      calendarSettings: calendarSettings || { selected_calendars: [], days_in_advance: 7 },
      contextSnippets: contextSnippets || [],
      emails: emails || []
    };
  } catch (error) {
    console.error('Error fetching user briefing data:', error);
    return {
      calendarSettings: { selected_calendars: [], days_in_advance: 7 },
      contextSnippets: [],
      emails: []
    };
  }
}

// Helper function to fetch calendar events using the same API as dashboard
async function fetchCalendarEvents(calendarSettings: any, userId?: string) {
  try {
    // Only fetch events if user has selected calendars
    if (!calendarSettings.selected_calendars || calendarSettings.selected_calendars.length === 0) {
      console.log('No calendars selected, returning empty events');
      return [];
    }

    // Import the calendar functions dynamically to avoid build issues
    const { getGoogleCalendarEvents } = await import('@/lib/google-calendar');
    const { getMockEvents } = await import('@/lib/mock-calendar');
    const { getAuthProvider, isGithubProvider } = await import('@/lib/auth-provider');
    
    // No userId needed since we're in an authenticated context
    const provider = await getAuthProvider();
    
    const settings = {
      selectedCalendars: calendarSettings.selected_calendars,
      daysInAdvance: calendarSettings.days_in_advance || 7
    };
    
    if (isGithubProvider(provider)) {
      // GitHub users get mock calendar events
      console.log('Fetching mock calendar events for GitHub user');
      const events = getMockEvents(settings.selectedCalendars, settings.daysInAdvance);
      return events;
    } else {
      // Google users get real calendar events - pass userId for token access
      console.log('Fetching real Google calendar events for user:', userId || 'current session');
      const events = await getGoogleCalendarEvents(settings, userId);
      return events;
    }
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

// POST - Send daily briefing to user via email
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if this is a test email (from query params)
    const url = new URL(req.url);
    const isTest = url.searchParams.get('test') === 'true';

    // Get user's email schedule settings (includes timezone)
    const emailSettings = await getEmailScheduleSettings(user.id);
    
    if (!emailSettings) {
      return NextResponse.json(
        { error: 'Failed to fetch email settings' },
        { status: 500 }
      );
    }

    const userTimezone = emailSettings.timezone || 'UTC';

    // For test emails, only require a delivery email
    // For scheduled emails, require full configuration
    if (isTest) {
      if (!emailSettings.delivery_email) {
        return NextResponse.json(
          { error: 'No delivery email configured. Please set a delivery email first.' },
          { status: 400 }
        );
      }
    } else {
      // Regular scheduled send - require full configuration
      if (!emailSettings.enabled) {
        return NextResponse.json(
          { error: 'Email delivery is not enabled. Please enable it in settings first.' },
          { status: 400 }
        );
      }

      if (!emailSettings.delivery_email) {
        return NextResponse.json(
          { error: 'No delivery email configured. Please set a delivery email first.' },
          { status: 400 }
        );
      }
    }

    // Fetch user data for briefing generation
    const briefingData = await fetchUserBriefingData(user.id, supabase);
    const { calendarSettings, contextSnippets, emails } = briefingData;

    // Fetch calendar events
    const events = await fetchCalendarEvents(calendarSettings, user.id);

    // Use consolidated briefing generation
    const briefingText = await generateBriefingContent({
      events,
      contextSnippets: contextSnippets.map((s: any) => s.content),
      emails: prepareEmailsForBriefing(emails),
      userTimezone,
      daysInAdvance: calendarSettings.days_in_advance || 7
    });

    // Send email using shared email service
    try {
      const replyToEmail = await generateReplyToEmail(user.email!, user.id);
      
      await sendBriefingEmail({
        briefingContent: briefingText,
        deliveryEmail: emailSettings.delivery_email,
        replyToEmail,
        isTest
      });

      return NextResponse.json({ 
        message: isTest ? 'Test briefing sent successfully' : 'Daily briefing sent successfully',
        sentTo: emailSettings.delivery_email,
        ...(isTest && { briefing: briefingText }) // Include briefing content in response for test emails
      });
    } catch (error) {
      console.error('Error sending email:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending daily briefing:', error);
    return NextResponse.json(
      { error: 'Failed to send daily briefing' },
      { status: 500 }
    );
  }
} 