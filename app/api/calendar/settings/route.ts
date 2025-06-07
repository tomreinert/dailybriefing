import { NextResponse } from 'next/server';
import { getUserCalendarSettings, setUserCalendarSettings } from '@/actions/calendarSettings';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const settings = await getUserCalendarSettings(user.id);
  return NextResponse.json(settings || {});
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { selectedCalendars, daysInAdvance } = await req.json();
  const ok = await setUserCalendarSettings(user.id, selectedCalendars, daysInAdvance);
  if (!ok) return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  return NextResponse.json({ success: true });
} 