import { NextResponse } from 'next/server';
import { getGoogleCalendarEvents } from '@/lib/google-calendar';
import { getMockEvents } from '@/lib/mock-calendar';
import { getAuthProvider, isGithubProvider } from '@/lib/auth-provider';
import { getEmailScheduleSettings } from '@/actions/userSettings';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const settings = await request.json();
    const provider = await getAuthProvider();
    
    if (isGithubProvider(provider)) {
      // GitHub users get mock calendar events - need to get their timezone for accurate mock data
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get user's timezone from their email settings
      let userTimezone = 'UTC';
      if (user) {
        const emailSettings = await getEmailScheduleSettings(user.id);
        userTimezone = emailSettings?.timezone || 'UTC';
      }
      
      console.log('Fetching mock calendar events for GitHub user with timezone:', userTimezone);
      const events = getMockEvents(settings.selectedCalendars, settings.daysInAdvance, userTimezone);
      return NextResponse.json(events);
    } else {
      // Google users get real calendar events
      const events = await getGoogleCalendarEvents(settings);
      return NextResponse.json(events);
    }
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
} 