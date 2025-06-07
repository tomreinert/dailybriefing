import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getEmailScheduleSettings, updateEmailScheduleSettings, EmailScheduleSettings } from '@/actions/userSettings';

// GET - Get user's email schedule settings
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const settings = await getEmailScheduleSettings(user.id);
    
    if (!settings) {
      return NextResponse.json(
        { error: 'Failed to fetch email schedule settings' },
        { status: 500 }
      );
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching email schedule settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user's email schedule settings
export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const settings: EmailScheduleSettings = await req.json();
    
    // Basic validation
    if (!settings.delivery_time || !settings.weekdays || !Array.isArray(settings.weekdays)) {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM) for both local and UTC times
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(settings.delivery_time)) {
      return NextResponse.json(
        { error: 'Invalid delivery_time format. Use HH:MM format.' },
        { status: 400 }
      );
    }

    // Make delivery_time_utc optional for backward compatibility
    if (settings.delivery_time_utc && !timeRegex.test(settings.delivery_time_utc)) {
      return NextResponse.json(
        { error: 'Invalid delivery_time_utc format. Use HH:MM format.' },
        { status: 400 }
      );
    }

    // Validate weekdays (0-6)
    if (settings.weekdays.some(day => day < 0 || day > 6)) {
      return NextResponse.json(
        { error: 'Invalid weekday values. Use 0-6.' },
        { status: 400 }
      );
    }

    const success = await updateEmailScheduleSettings(user.id, settings);
    
    if (!success) {
      console.error('Failed to update email schedule settings for user:', user.id);
      return NextResponse.json(
        { error: 'Failed to update email schedule settings. Please check server logs for details.' },
        { status: 500 }
      );
    }

    console.log('Email schedule settings updated successfully for user:', user.id);
    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating email schedule settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 