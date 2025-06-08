import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateBriefingContent, prepareEmailsForBriefing } from '@/lib/briefing-utils';
import { sendBriefingEmail, generateReplyToEmailWithService } from '@/lib/email-service';

// This endpoint is called by github actions
// It processes all users and sends briefings based on their schedules
export async function GET(req: Request) {
  try {
    // Verify this is a legitimate Vercel cron request
    const userAgent = req.headers.get('user-agent');
    const isVercelCron = userAgent?.includes('vercel-cron/1.0');
    
    // For local testing, also allow requests with the secret token
    const authHeader = req.headers.get('Authorization');
    const expectedToken = `Bearer ${process.env.CRON_SECRET_TOKEN}`;
    const hasValidToken = authHeader === expectedToken;
    
    if (!isVercelCron && !hasValidToken) {
      console.log('Unauthorized cron request - not from Vercel cron and no valid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕒 Starting scheduled briefing delivery process...');

    // Use service role to access all user data
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all users with email scheduling enabled
    const { data: enabledUsers, error: usersError } = await serviceSupabase
      .from('user_settings')
      .select(`
        user_id,
        delivery_time,
        delivery_time_utc,
        weekdays,
        delivery_email,
        timezone,
        last_briefing_sent_date
      `)
      .not('weekdays', 'is', null)
      .neq('weekdays', '{}'); // PostgreSQL array not empty

    if (usersError) {
      console.error('Error fetching enabled users:', usersError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!enabledUsers || enabledUsers.length === 0) {
      console.log('No users with email scheduling enabled');
      return NextResponse.json({ 
        message: 'No users with email scheduling enabled',
        processed: 0,
        sent: 0 
      });
    }

    console.log(`Found ${enabledUsers.length} users with email scheduling enabled`);

    let processedCount = 0;
    let sentCount = 0;
    const results = [];

    for (const userSettings of enabledUsers) {
      processedCount++;
      
      try {
        // Skip if missing required data
        if (!userSettings.delivery_email || !userSettings.weekdays) {
          console.log(`Skipping user ${userSettings.user_id}: missing required settings`);
          results.push({ 
            status: 'skipped', 
            reason: 'missing_settings' 
          });
          continue;
        }

        // Check if we have UTC delivery time (new format) or need to skip legacy entries
        if (!userSettings.delivery_time_utc) {
          console.log(`Skipping user ${userSettings.user_id}: no UTC delivery time (legacy entry, user needs to re-save settings)`);
          results.push({ 
            status: 'skipped', 
            reason: 'missing_utc_time' 
          });
          continue;
        }

        // MUCH SIMPLER: Just work with UTC times
        const now = new Date();
        const currentUTCTime = now.toISOString().substring(11, 16); // Extract HH:MM from ISO string
        const currentUTCDay = now.getUTCDay(); // 0=Sunday, 1=Monday, etc.
        
        console.log(`🕐 Simple UTC Debug for user ${userSettings.user_id}:`);
        console.log(`- Current UTC time: ${currentUTCTime}`);
        console.log(`- Scheduled UTC time: ${userSettings.delivery_time_utc}`);
        console.log(`- Current UTC day: ${currentUTCDay}`);
        console.log(`- Scheduled days: ${userSettings.weekdays}`);
        console.log(`- User timezone: ${userSettings.timezone} (for reference only)`);

        // Check if today is in the user's scheduled weekdays
        if (!userSettings.weekdays.includes(currentUTCDay)) {
          console.log(`Skipping user ${userSettings.user_id}: today (${currentUTCDay}) not in schedule`);
          results.push({ 
            status: 'skipped', 
            reason: 'not_scheduled_day' 
          });
          continue;
        }

        // Check if we already sent a briefing today (deduplication)
        const todayUTC = now.toISOString().substring(0, 10); // YYYY-MM-DD format
        if (userSettings.last_briefing_sent_date === todayUTC) {
          console.log(`Skipping user ${userSettings.user_id}: briefing already sent today (${todayUTC})`);
          results.push({ 
            status: 'skipped', 
            reason: 'already_sent_today',
            lastSentDate: todayUTC
          });
          continue;
        }

        // Simple time comparison in UTC
        const [deliveryHour, deliveryMinute] = userSettings.delivery_time_utc.split(':').map(Number);
        const [currentHour, currentMinute] = currentUTCTime.split(':').map(Number);
        const deliveryTimeMinutes = deliveryHour * 60 + deliveryMinute;
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        // Calculate time difference properly handling same-day only
        let timeDiff;
        if (currentTimeMinutes >= deliveryTimeMinutes) {
          // Current time is after delivery time (normal case)
          timeDiff = currentTimeMinutes - deliveryTimeMinutes;
        } else {
          // Current time is before delivery time
          timeDiff = deliveryTimeMinutes - currentTimeMinutes;
        }
        
        console.log(`- Time calculation (UTC):`);
        console.log(`  Current: ${currentHour}:${currentMinute.toString().padStart(2, '0')} = ${currentTimeMinutes} minutes`);
        console.log(`  Scheduled: ${deliveryHour}:${deliveryMinute.toString().padStart(2, '0')} = ${deliveryTimeMinutes} minutes`);
        console.log(`  Difference: ${timeDiff} minutes`);
        console.log(`  Normal window (≤10min): ${timeDiff <= 10 ? 'YES' : 'NO'}`);
        console.log(`  Catch-up window (≤180min late): ${currentTimeMinutes > deliveryTimeMinutes && timeDiff <= 180 ? 'YES' : 'NO'}`);
        console.log(`  Will send: ${timeDiff <= 10 || (currentTimeMinutes > deliveryTimeMinutes && timeDiff <= 180) ? 'YES' : 'NO'}`);

        // Check if we should send the email
        const shouldSend = timeDiff <= 10 || // Within normal 10-minute window
          (currentTimeMinutes > deliveryTimeMinutes && timeDiff <= 180); // Or up to 3 hours late (catch-up)
        
        if (!shouldSend) {
          console.log(`Skipping user ${userSettings.user_id}: time mismatch (current: ${currentUTCTime}, scheduled: ${userSettings.delivery_time_utc}, diff: ${timeDiff}min)`);
          results.push({ 
            status: 'skipped', 
            reason: 'time_mismatch',
            currentTime: currentUTCTime,
            scheduledTime: userSettings.delivery_time_utc,
            timeDiffMinutes: timeDiff
          });
          continue;
        }
        
        // Log if this is a catch-up send
        if (timeDiff > 10) {
          console.log(`⚠️ Catch-up send for user ${userSettings.user_id}: ${timeDiff} minutes late`);
        }

        console.log(`✅ Sending briefing to user ${userSettings.user_id} at ${currentUTCTime} (scheduled: ${userSettings.delivery_time_utc})`);

        // Send the briefing for this user
        const briefingResult = await sendBriefingForUser(userSettings);
        
        if (briefingResult.success) {
          // Update the last_briefing_sent_date to prevent duplicates
          await serviceSupabase
            .from('user_settings')
            .update({ last_briefing_sent_date: todayUTC })
            .eq('user_id', userSettings.user_id);
          
          sentCount++;
          results.push({ 
            status: 'sent',
            sentTo: userSettings.delivery_email,
            sentDate: todayUTC
          });
          console.log(`✅ Successfully sent briefing to user ${userSettings.user_id}, marked as sent on ${todayUTC}`);
        } else {
          results.push({ 
            status: 'failed',
            error: briefingResult.error
          });
          console.error(`❌ Failed to send briefing to user ${userSettings.user_id}:`, briefingResult.error);
        }

      } catch (userError) {
        console.error(`Error processing user ${userSettings.user_id}:`, userError);
        results.push({ 
          status: 'error',
          error: userError instanceof Error ? userError.message : 'Unknown error'
        });
      }
    }

    console.log(`🏁 Briefing delivery process complete. Processed: ${processedCount}, Sent: ${sentCount}`);

    return NextResponse.json({
      message: 'Briefing delivery process completed',
      processed: processedCount,
      sent: sentCount,
      results
    });

  } catch (error) {
    console.error('Error in scheduled briefing delivery:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduled briefings' },
      { status: 500 }
    );
  }
}

// Also support POST for manual testing
export async function POST(req: Request) {
  return GET(req);
}

// Helper function to send briefing for a specific user
async function sendBriefingForUser(userSettings: any) {
  try {
    // We need to generate the briefing content without relying on user session
    // This will be similar to the existing send API but adapted for server-side use
    
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const userId = userSettings.user_id;

    // Fetch user's calendar settings
    const { data: calendarSettings } = await serviceSupabase
      .from('user_calendar_settings')
      .select('selected_calendars, days_in_advance')
      .eq('user_id', userId)
      .single();

    // Fetch user's context snippets
    const { data: contextSnippets } = await serviceSupabase
      .from('user_context_snippets')
      .select('content')
      .eq('user_id', userId)
      .eq('active', true);

    // Fetch user's recent emails
    const { data: emails } = await serviceSupabase
      .from('emails')
      .select('from_email, subject, text_body, stripped_text_reply, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch calendar events
    const events = await fetchCalendarEvents(calendarSettings || { selected_calendars: [], days_in_advance: 7 }, userSettings.timezone || 'UTC', userId);

    // Use consolidated briefing generation
    const briefingContent = await generateBriefingContent({
      events,
      contextSnippets: (contextSnippets || []).map((s: any) => s.content),
      emails: prepareEmailsForBriefing(emails || []),
      userTimezone: userSettings.timezone || 'UTC',
      daysInAdvance: calendarSettings?.days_in_advance || 7
    });

    // Get user email from auth table
    const { data: authUser } = await serviceSupabase.auth.admin.getUserById(userSettings.user_id);
    const userEmail = authUser?.user?.email || 'user';

    // Generate reply-to email using service client
    const replyToEmail = await generateReplyToEmailWithService(userEmail, userId, serviceSupabase);

    // Generate custom subject for scheduled emails
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Send email using shared email service
    const emailResult = await sendBriefingEmail({
      briefingContent,
      deliveryEmail: userSettings.delivery_email,
      replyToEmail,
      isTest: false,
      subject: `Your Daily Briefing - ${currentDate}`
    });
    
    return { success: true, emailResult };

  } catch (error) {
    console.error('Error in sendBriefingForUser:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to fetch calendar events using the same API as dashboard
async function fetchCalendarEvents(calendarSettings: any, userTimezone: string, userId: string) {
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
    
    // Pass userId to getAuthProvider for cron job context
    const provider = await getAuthProvider(userId);
    
    const settings = {
      selectedCalendars: calendarSettings.selected_calendars,
      daysInAdvance: calendarSettings.days_in_advance || 7
    };
    
    if (isGithubProvider(provider)) {
      // GitHub users get mock calendar events - now with proper timezone support
      console.log('Fetching mock calendar events for GitHub user with timezone:', userTimezone);
      const events = getMockEvents(settings.selectedCalendars, settings.daysInAdvance, userTimezone);
      return events;
    } else {
      // Google users get real calendar events - now passing userId for stored token access
      console.log('Fetching real Google calendar events for user:', userId);
      const events = await getGoogleCalendarEvents(settings, userId);
      return events;
    }
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
} 