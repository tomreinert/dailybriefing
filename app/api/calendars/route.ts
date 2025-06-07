import { NextResponse } from 'next/server';
import { getAvailableCalendars } from '@/lib/google-calendar';
import { getMockCalendars } from '@/lib/mock-calendar';
import { getAuthProvider, isGithubProvider } from '@/lib/auth-provider';

export async function GET() {
  try {
    const provider = await getAuthProvider();
    
    if (isGithubProvider(provider)) {
      // GitHub users get mock calendar data
      const calendars = getMockCalendars();
      return NextResponse.json(calendars);
    } else {
      // Google users get real calendar data
      const calendars = await getAvailableCalendars();
      return NextResponse.json(calendars);
    }
  } catch (error) {
    console.error('Calendars API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendars' },
      { status: 500 }
    );
  }
} 