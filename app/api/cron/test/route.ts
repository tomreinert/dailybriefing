import { NextResponse } from 'next/server';

// Simple test endpoint to verify cron authentication and basic functionality
export async function GET(req: Request) {
  return handleCronTest(req);
}

// Also support POST for manual testing
export async function POST(req: Request) {
  return handleCronTest(req);
}

async function handleCronTest(req: Request) {
  try {
    // Verify this is a legitimate Vercel cron request or has valid token
    const userAgent = req.headers.get('user-agent');
    const isVercelCron = userAgent?.includes('vercel-cron/1.0');
    
    // For local testing, also allow requests with the secret token
    const authHeader = req.headers.get('Authorization');
    const expectedToken = `Bearer ${process.env.CRON_SECRET_TOKEN}`;
    const hasValidToken = authHeader === expectedToken;
    
    if (!isVercelCron && !hasValidToken) {
      console.log('Unauthorized cron test request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Cron test endpoint called successfully');
    console.log('Request type:', isVercelCron ? 'Vercel Cron' : 'Manual with token');

    // Get current time in a few different timezones to test the logic
    const now = new Date();
    const timezones = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London'];
    const timeZoneInfo = timezones.map(tz => {
      const localTime = new Date(now.toLocaleString("en-US", { timeZone: tz }));
      return {
        timezone: tz,
        currentTime: localTime.toTimeString().slice(0, 5),
        dayOfWeek: localTime.getDay(),
        fullDateTime: localTime.toLocaleString()
      };
    });

    return NextResponse.json({
      message: 'Cron test endpoint working correctly',
      timestamp: now.toISOString(),
      requestType: isVercelCron ? 'Vercel Cron' : 'Manual with token',
      userAgent: userAgent,
      timeZoneInfo,
      environment: {
        hasPostmarkToken: !!process.env.POSTMARK_SERVER_TOKEN,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasCronToken: !!process.env.CRON_SECRET_TOKEN
      }
    });

  } catch (error) {
    console.error('Error in cron test endpoint:', error);
    return NextResponse.json(
      { error: 'Test endpoint failed' },
      { status: 500 }
    );
  }
} 