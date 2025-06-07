import { google } from 'googleapis';
import { createClient } from '@/utils/supabase/server';

// Initialize the Google Calendar API
const calendar = google.calendar('v3');

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
}

export interface CalendarSettings {
  selectedCalendars: string[];
  daysInAdvance: number;
}

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

/**
 * Store Google OAuth tokens for a user in the database
 */
export async function storeGoogleTokens(userId: string, accessToken: string, refreshToken?: string) {
  try {
    // Use service role to store tokens securely
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    // Google access tokens typically expire after 1 hour
    const expiresAt = new Date(now.getTime() + 3600 * 1000);

    const { error } = await serviceSupabase
      .from('user_google_tokens')
      .upsert({
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString()
      }, {
        onConflict: 'user_id' // Specify which column to use for conflict resolution
      });

    if (error) {
      console.error('Error storing Google tokens:', error);
      return false;
    }

    console.log('✅ Google tokens stored successfully for user:', userId);
    return true;
  } catch (error) {
    console.error('Error in storeGoogleTokens:', error);
    return false;
  }
}

/**
 * Get valid Google access token for a user (refreshes if needed)
 */
export async function getValidGoogleToken(userId: string): Promise<string | null> {
  try {
    // Use service role to access tokens
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tokenData, error } = await serviceSupabase
      .from('user_google_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single();

    if (error || !tokenData) {
      console.log('No Google tokens found for user:', userId);
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    // If token is still valid, return it
    if (expiresAt > now) {
      console.log('✅ Using cached Google token for user:', userId);
      return tokenData.access_token;
    }

    // Token is expired, try to refresh it
    if (tokenData.refresh_token) {
      console.log('🔄 Refreshing expired Google token for user:', userId);
      const newAccessToken = await refreshGoogleToken(userId, tokenData.refresh_token);
      return newAccessToken;
    }

    console.log('❌ Google token expired and no refresh token available for user:', userId);
    return null;
  } catch (error) {
    console.error('Error in getValidGoogleToken:', error);
    return null;
  }
}

/**
 * Refresh an expired Google access token
 */
async function refreshGoogleToken(userId: string, refreshToken: string): Promise<string | null> {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Google OAuth credentials not configured');
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();
    const newAccessToken = credentials.access_token;

    if (!newAccessToken) {
      console.error('Failed to refresh Google token - no access token returned');
      return null;
    }

    // Store the new token
    const stored = await storeGoogleTokens(userId, newAccessToken, refreshToken);
    if (!stored) {
      console.error('Failed to store refreshed Google token');
      return null;
    }

    console.log('✅ Google token refreshed successfully for user:', userId);
    return newAccessToken;
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return null;
  }
}

/**
 * Get Google access token from either session (when user is logged in) or database (for cron jobs)
 */
async function getGoogleAccessToken(userId?: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    
    // Try to get token from authenticated user first (for logged-in users)
    // Use secure getUser() instead of getSession() to ensure authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // For authenticated users, try to get the provider token from session
    // Note: provider_token is only available in session, so we need to get session
    // but only after confirming the user is authenticated
    let sessionToken = null;
    if (!authError && user) {
      const { data: { session } } = await supabase.auth.getSession();
      sessionToken = session?.provider_token;
    }
    
    if (sessionToken) {
      console.log('✅ Using session token for Google API');
      return sessionToken;
    }

    // If no session token and we have a userId, try to get from database (for cron jobs)
    if (userId) {
      console.log('🔍 No session token, attempting to get stored token for user:', userId);
      const storedToken = await getValidGoogleToken(userId);
      if (storedToken) {
        console.log('✅ Using stored token for Google API');
        return storedToken;
      }
    }

    console.log('❌ No valid Google token found');
    return null;
  } catch (error) {
    console.error('Error getting Google access token:', error);
    return null;
  }
}

export async function getAvailableCalendars(userId?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && !userId) {
      return [];
    }

    const actualUserId = userId || user?.id;
    const accessToken = await getGoogleAccessToken(actualUserId);

    if (!accessToken) {
      console.log('No Google access token available for calendar access');
      return [];
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const response = await calendar.calendarList.list({
      auth,
      maxResults: 100,
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching calendars:', error);
    return [];
  }
}

export async function getGoogleCalendarEvents(settings: CalendarSettings, userId?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && !userId) {
      console.log('No user context for calendar events');
      return [];
    }

    const actualUserId = userId || user?.id;
    const accessToken = await getGoogleAccessToken(actualUserId);

    if (!accessToken) {
      console.log('No Google access token available for calendar events');
      return [];
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    // Get events for the specified number of days
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + settings.daysInAdvance);

    console.log(`📅 Fetching events from ${settings.selectedCalendars.length} calendars for ${settings.daysInAdvance} days`);
    console.log(`📅 Date range: ${now.toISOString()} to ${endDate.toISOString()}`);

    // Fetch events from all selected calendars
    const calendarPromises = settings.selectedCalendars.map(calendarId =>
      calendar.events.list({
        auth,
        calendarId,
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      })
    );

    const responses = await Promise.all(calendarPromises);
    
    // Log the complete raw responses from Google Calendar API
    console.log('📅 COMPLETE GOOGLE CALENDAR API RESPONSES:');
    responses.forEach((response, calendarIndex) => {
      console.log(`📅 Calendar ${calendarIndex + 1} response:`, JSON.stringify(response.data, null, 2));
    });
    
    // Combine and sort all events
    const allEvents = responses.flatMap(response => response.data.items || []);
    allEvents.sort((a, b) => {
      const aTime = a.start?.dateTime || a.start?.date || '';
      const bTime = b.start?.dateTime || b.start?.date || '';
      return aTime.localeCompare(bTime);
    });

    console.log(`📅 Successfully fetched ${allEvents.length} calendar events`);
    console.log('📅 FINAL COMBINED EVENTS ARRAY:', JSON.stringify(allEvents, null, 2));
    
    return allEvents;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
} 