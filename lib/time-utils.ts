// Utility functions for handling timezone-aware time formatting

/**
 * Format event time in the user's timezone
 * @param event Calendar event object
 * @param userTimezone User's timezone (e.g., "America/New_York")
 * @returns Formatted time string
 */
export function formatEventTimeInTimezone(event: any, userTimezone: string = 'UTC'): string {
  if (event.start?.dateTime) {
    const start = new Date(event.start.dateTime);
    const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
    
    const options: Intl.DateTimeFormatOptions = {
      timeZone: userTimezone,
      dateStyle: 'short' as const,
      timeStyle: 'short' as const
    };
    
    const endOptions: Intl.DateTimeFormatOptions = {
      timeZone: userTimezone,
      timeStyle: 'short' as const
    };
    
    return `${start.toLocaleString([], options)}${end ? ' - ' + end.toLocaleString([], endOptions) : ''}`;
  } else if (event.start?.date) {
    // All-day events don't need timezone conversion
    return new Date(event.start.date).toLocaleDateString();
  }
  return 'unknown';
}

/**
 * Format event time with weekday in the user's timezone
 * @param event Calendar event object  
 * @param userTimezone User's timezone (e.g., "America/New_York")
 * @returns Formatted time string with weekday
 */
export function formatEventTimeWithWeekdayInTimezone(event: any, userTimezone: string = 'UTC'): string {
  if (event.start?.dateTime) {
    const start = new Date(event.start.dateTime);
    const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
    
    const weekday = start.toLocaleDateString('en-US', { 
      weekday: 'long',
      timeZone: userTimezone 
    });
    
    const dateTime = start.toLocaleString([], { 
      timeZone: userTimezone,
      dateStyle: 'short',
      timeStyle: 'short' 
    });
    
    const endTime = end ? ' - ' + end.toLocaleString([], { 
      timeZone: userTimezone,
      timeStyle: 'short' 
    }) : '';
    
    return `${weekday}, ${dateTime}${endTime}`;
  } else if (event.start?.date) {
    const date = new Date(event.start.date);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = date.toLocaleDateString();
    return `${weekday}, ${dateStr}`;
  }
  return 'unknown';
} 