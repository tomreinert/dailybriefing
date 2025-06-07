import { createClient } from '@/utils/supabase/server';
import { getAvailableCalendars } from '@/lib/google-calendar';

export async function getUserCalendarSettings(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_calendar_settings')
    .select('selected_calendars, selected_calendar_names, days_in_advance')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data;
}

export async function setUserCalendarSettings(userId: string, selectedCalendars: string[], daysInAdvance: number) {
  const supabase = await createClient();
  // Fetch calendar names for the selected IDs
  let selectedCalendarNames: string[] = [];
  try {
    const allCalendars = await getAvailableCalendars();
    selectedCalendarNames = allCalendars
      .filter((c: any) => selectedCalendars.includes(c.id))
      .map((c: any) => c.summary);
  } catch (e) {
    // fallback: just use IDs as names
    selectedCalendarNames = selectedCalendars;
  }
  const { error } = await supabase
    .from('user_calendar_settings')
    .upsert({
      user_id: userId,
      selected_calendars: selectedCalendars,
      selected_calendar_names: selectedCalendarNames,
      days_in_advance: daysInAdvance,
      updated_at: new Date().toISOString(),
    });
  return !error;
} 