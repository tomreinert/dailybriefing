import { createClient } from '@/utils/supabase/server';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

// Interface for email schedule settings
export interface EmailScheduleSettings {
  enabled: boolean;
  delivery_time: string; // HH:MM format (24-hour) in user's local timezone
  delivery_time_utc?: string; // HH:MM format (24-hour) in UTC - optional during migration
  weekdays: number[]; // Array of weekday numbers (0=Sunday, 1=Monday, etc.)
  delivery_email: string;
  timezone: string; // User's timezone (e.g., "America/New_York")
}

// Returns the user's inbound email hash, creating it if missing
export async function getOrCreateInboundEmailHash(userId: string): Promise<string | null> {
  const supabase = await createClient();
  // Try to fetch existing
  const { data, error } = await supabase
    .from('user_settings')
    .select('inbound_email_hash')
    .eq('user_id', userId)
    .single();
  if (data?.inbound_email_hash) return data.inbound_email_hash;
  if (error && error.code !== 'PGRST116') return null; // Not found is ok
  // Generate new hash
  const hash = nanoid();
  const { error: insertError } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, inbound_email_hash: hash });
  if (insertError) return null;
  return hash;
}

// Get user's email schedule settings
export async function getEmailScheduleSettings(userId: string): Promise<EmailScheduleSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_settings')
    .select('email_schedule_enabled, delivery_time, delivery_time_utc, weekdays, delivery_email, timezone')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') return null; // Not found is ok
  
  // Return default settings if no data exists
  if (!data) {
    return {
      enabled: false,
      delivery_time: '08:00',
      weekdays: [1, 2, 3, 4, 5], // Monday to Friday
      delivery_email: '',
      timezone: 'UTC' // Safe fallback - client will update with actual timezone
    };
  }
  
  return {
    enabled: data.email_schedule_enabled || false,
    delivery_time: data.delivery_time || '08:00',
    delivery_time_utc: data.delivery_time_utc || undefined,
    weekdays: data.weekdays || [1, 2, 3, 4, 5],
    delivery_email: data.delivery_email || '',
    timezone: data.timezone || 'UTC' // Safe fallback - client will update with actual timezone
  };
}

// Update user's email schedule settings
export async function updateEmailScheduleSettings(userId: string, settings: EmailScheduleSettings): Promise<boolean> {
  const supabase = await createClient();
  
  console.log('Attempting to update email schedule settings for user:', userId);
  console.log('Settings:', settings);
  
  // First, get the existing record to preserve the inbound_email_hash
  const { data: existingData, error: fetchError } = await supabase
    .from('user_settings')
    .select('inbound_email_hash')
    .eq('user_id', userId)
    .single();
  
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching existing user settings:', fetchError);
    return false;
  }
  
  // Prepare the upsert data
  const upsertData: any = {
    user_id: userId,
    email_schedule_enabled: settings.enabled,
    delivery_time: settings.delivery_time,
    weekdays: settings.weekdays,
    delivery_email: settings.delivery_email,
    timezone: settings.timezone,
    updated_at: new Date().toISOString()
  };
  
  // Only include delivery_time_utc if it's provided (column might not exist yet)
  if (settings.delivery_time_utc) {
    upsertData.delivery_time_utc = settings.delivery_time_utc;
  }
  
  // Include the existing inbound_email_hash if it exists, or generate a new one
  if (existingData?.inbound_email_hash) {
    upsertData.inbound_email_hash = existingData.inbound_email_hash;
  } else {
    // Generate a new hash if none exists
    const hash = nanoid();
    upsertData.inbound_email_hash = hash;
  }
  
  const { error } = await supabase
    .from('user_settings')
    .upsert(upsertData);
  
  if (error) {
    console.error('Database error updating email schedule settings:', error);
    return false;
  }
  
  console.log('Successfully updated email schedule settings');
  return true;
} 