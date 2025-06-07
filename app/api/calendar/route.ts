import { NextResponse } from 'next/server';
import { getGoogleCalendarEvents } from '@/lib/google-calendar';
import { getMockEvents } from '@/lib/mock-calendar';
import { getAuthProvider, isGithubProvider } from '@/lib/auth-provider';

export async function POST(request: Request) {
  try {
    const settings = await request.json();
    const provider = await getAuthProvider();
    
    if (isGithubProvider(provider)) {
      // GitHub users get mock calendar events
      const events = getMockEvents(settings.selectedCalendars, settings.daysInAdvance);
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