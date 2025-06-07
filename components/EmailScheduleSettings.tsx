"use client";

import { useState, useEffect, useCallback } from 'react';
import { toDate } from 'date-fns-tz';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Loader2, Mail, Check, ChevronDown, X, Plus, Calendar } from "lucide-react";
import SettingsIcon from "./icons/SettingsIcon";

interface EmailScheduleSettings {
  enabled: boolean;
  delivery_time: string;
  weekdays: number[];
  delivery_email: string;
  timezone: string;
}

interface Props {
  userEmail?: string;
}

const WEEKDAYS = [
  { id: 0, name: 'Sunday', short: 'Sun' },
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

// Debounce hook for auto-save
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Generate time options in 30-minute increments
const generateTimeOptions = () => {
  const times: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute of [0, 30]) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      times.push({ value: timeString, label: displayTime });
    }
  }
  return times;
};

// Helper function to round time to nearest 30-minute increment
const roundToNearestHalfHour = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const roundedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 0;
  const roundedHours = minutes >= 45 ? (hours + 1) % 24 : hours;
  return `${roundedHours.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
};

const TIME_OPTIONS = generateTimeOptions();

export default function EmailScheduleSettings({ userEmail }: Props) {
  const [settings, setSettings] = useState<EmailScheduleSettings>({
    enabled: false,
    delivery_time: '08:00',
    weekdays: [1, 2, 3, 4, 5], // Monday to Friday by default
    delivery_email: '',
    timezone: 'UTC' // Will be updated with actual timezone on client
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [testSending, setTestSending] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // New state for multi-email input
  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);
  const [emailError, setEmailError] = useState('');
  
  // Flag to prevent auto-save during initialization
  const [isInitialized, setIsInitialized] = useState(false);

  // Debounce settings changes to auto-save
  const debouncedSettings = useDebounce(settings, 1000); // 1 second delay

  // Load current settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/user/email-schedule');
        if (response.ok) {
          const data = await response.json();
          
          const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          
          // Parse comma-separated emails into array, defaulting to user's email if none exist
          const emails = data.delivery_email 
            ? data.delivery_email.split(',').map((email: string) => email.trim()).filter(Boolean)
            : (userEmail ? [userEmail] : []);
          
          setEmailList(emails);
          
          setSettings(prevSettings => {
            const newSettings = {
              ...data,
              // Default to user's email if no delivery email is set
              delivery_email: data.delivery_email || userEmail || '',
              // FORCE browser timezone if database has UTC (means it's not set properly)
              timezone: (data.timezone === 'UTC' || !data.timezone) ? userTimezone : data.timezone,
              // Round delivery time to nearest 30-minute increment for consistency
              delivery_time: roundToNearestHalfHour(data.delivery_time || '08:00')
            };
            return newSettings;
          });
        } else {
          // If no settings exist, default to user's email and browser timezone
          const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          
          if (userEmail) {
            setEmailList([userEmail]);
          }
          
          setSettings(prevSettings => ({
            ...prevSettings,
            delivery_email: userEmail || '',
            timezone: userTimezone
          }));
        }
      } catch (error) {
        console.error('Error loading email schedule settings:', error);
        // On error, still default to user's email and browser timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        if (userEmail) {
          setEmailList([userEmail]);
        }
        
        setSettings(prevSettings => ({
          ...prevSettings,
          delivery_email: userEmail || '',
          timezone: userTimezone
        }));
      } finally {
        setLoading(false);
        // Mark as initialized after loading completes
        setIsInitialized(true);
      }
    };

    loadSettings();
  }, [userEmail]);

  // Auto-save when debounced settings change
  useEffect(() => {
    // Don't save during initial load or before initialization is complete
    if (loading || !isInitialized) return;

    const autoSave = async () => {
      // Only validate and save if we have actual email addresses in the list
      // This prevents saving when user is just typing in the input field
      if (emailList.length === 0) {
        return; // Don't save if no emails are actually added
      }
      
      if (!validateEmails(debouncedSettings.delivery_email)) {
        return; // Don't save invalid emails
      }

      // Convert local delivery time to UTC
      const deliveryTimeUTC = convertLocalTimeToUTC(debouncedSettings.delivery_time, debouncedSettings.timezone);

      // Determine enabled status based on weekdays selection
      const settingsToSave = {
        ...debouncedSettings,
        enabled: debouncedSettings.weekdays.length > 0,
        delivery_time_utc: deliveryTimeUTC // Add the UTC time
      };

      setSaving(true);
      try {
        const response = await fetch('/api/user/email-schedule', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsToSave),
        });

        if (response.ok) {
          setLastSaved(new Date());
        } else {
          console.error('Failed to auto-save settings');
        }
      } catch (error) {
        console.error('Error auto-saving settings:', error);
      } finally {
        setSaving(false);
      }
    };

    autoSave();
  }, [debouncedSettings, loading, isInitialized, emailList.length]);

  // Validate email addresses (support comma-separated)
  const validateEmails = (emailString: string): boolean => {
    if (!emailString.trim()) return false;
    
    const emails = emailString.split(',').map(email => email.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    return emails.every(email => emailRegex.test(email));
  };

  // Update settings when email list changes
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      delivery_email: emailList.join(', ')
    }));
  }, [emailList]);

  // Helper function to convert local time to UTC using date-fns-tz
  const convertLocalTimeToUTC = (localTime: string, timezone: string): string => {
    try {
      if (!localTime || !timezone) {
        throw new Error(`Invalid input - localTime or timezone is missing.`);
      }
      
      const [hours, minutes] = localTime.split(':').map(Number);
      
      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error(`Invalid time format, could not parse hours/minutes.`);
      }

      const today = new Date();
      const datePart = today.toISOString().split('T')[0];
      const dateTimeString = `${datePart}T${localTime}:00`;

      const utcDate = toDate(dateTimeString, { timeZone: timezone });

      // Use native Date methods to get UTC hours and minutes. This is the most reliable way
      // to format the time and avoids any library-specific formatting quirks.
      const utcHours = utcDate.getUTCHours().toString().padStart(2, '0');
      const utcMinutes = utcDate.getUTCMinutes().toString().padStart(2, '0');
      const result = `${utcHours}:${utcMinutes}`;
      
      return result;
    } catch (error) {
      console.error('Timezone conversion failed. Falling back to local time.', error);
      return localTime;
    }
  };

  // Validate single email address
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Add email to list
  const addEmail = () => {
    const trimmedEmail = emailInput.trim();
    
    if (!trimmedEmail) {
      setEmailError('Please enter an email address');
      return;
    }
    
    if (!validateEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    if (emailList.includes(trimmedEmail)) {
      setEmailError('This email is already added');
      return;
    }
    
    setEmailList([...emailList, trimmedEmail]);
    setEmailInput('');
    setEmailError('');
  };

  // Remove email from list
  const removeEmail = (emailToRemove: string) => {
    setEmailList(emailList.filter(email => email !== emailToRemove));
  };

  // Handle Enter key in email input
  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  };

  const handleTestEmail = async () => {
    if (emailList.length === 0) {
      setTestMessage({ type: 'error', text: 'Please add at least one email address first.' });
      return;
    }

    setTestSending(true);
    setTestMessage(null); // Clear any previous message
    try {
      const response = await fetch('/api/briefing/send?test=true', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setTestMessage({ type: 'success', text: `Test briefing sent successfully to ${data.sentTo}` });
        // Clear the message after 5 seconds
        setTimeout(() => setTestMessage(null), 5000);
      } else {
        const error = await response.json();
        console.error('Failed to send test email:', error.error);
        setTestMessage({ type: 'error', text: 'Failed to send test email: ' + error.error });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setTestMessage({ type: 'error', text: 'Error sending test email. Please try again.' });
    } finally {
      setTestSending(false);
    }
  };

  const toggleWeekday = (dayId: number) => {
    setSettings(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(dayId)
        ? prev.weekdays.filter(id => id !== dayId)
        : [...prev.weekdays, dayId].sort()
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading settings...</span>
        </CardContent>
      </Card>
    );
  }

  const isValidEmail = emailList.length > 0;
  const isEnabled = settings.weekdays.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <SettingsIcon />
              Set Up Your Daily Email
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Recipients Section */}
        <section>
          <h2 className="text-lg font-bold">Where should we send your daily brief?</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            {emailList.map((email) => (
              <div
                key={email}
                className="inline-flex items-center gap-2 pl-4 pr-1 px-3 py-1 border rounded-lg text-sm h-11"
              >
                <span>{email}</span>
                <Button
                  onClick={() => removeEmail(email)}
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${email}`}
                >
                  <X className="h-2 w-2" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 items-center">
              <Input
                id="email_input"
                type="text"
                placeholder="another@email.com"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setEmailError('');
                }}
                onKeyDown={handleEmailKeyDown}
                onBlur={() => {
                  // Auto-add email when user leaves the input field
                  if (emailInput.trim()) {
                    addEmail();
                  }
                }}
                className={`shadow-none h-11 w-56 ${emailError ? 'border-red-300' : ''}`}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addEmail}
                aria-label="Add email"
                className="h-11 w-11 aspect-square"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {emailError && (
            <p className="text-sm text-red-600 mt-1">{emailError}</p>
          )}
          {emailList.length === 0 && (
            <p className="text-sm text-muted-foreground mt-1">Add one or more email addresses</p>
          )}
        </section>

        <hr className="my-2 border-gray-200 dark:border-gray-700" />

        {/* Schedule Section */}
        <section>
          <div className="flex flex-col md:flex-row md:items-end gap-8">
            {/* Time of day */}
            <div>
              <Label htmlFor="delivery_time" className="text-lg font-bold">Time of day</Label>
              <div className="flex items-center gap-3 mt-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-[120px] h-11 justify-between">
                      {TIME_OPTIONS.find(time => time.value === settings.delivery_time)?.label || 'Select time'}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-[300px] overflow-auto">
                    {TIME_OPTIONS.map((time) => (
                      <DropdownMenuItem
                        key={time.value}
                        onClick={() => setSettings(prev => ({ ...prev, delivery_time: time.value }))}
                      >
                        {time.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex items-center h-11 px-4 bg-secondary rounded-md border text-sm text-muted-foreground">
                  {settings.timezone.split('/').pop()} time
                </div>
              </div>
            </div>
            {/* Days of week */}
            <div className="flex flex-col gap-2">
              <Label className="text-lg font-bold">Which days?</Label>
              <div className="flex gap-1">
                {WEEKDAYS.map((day) => (
                  <Toggle
                    key={day.id}
                    pressed={settings.weekdays.includes(day.id)}
                    onPressedChange={() => toggleWeekday(day.id)}
                    aria-label={`Toggle ${day.name}`}
                    className={`h-11 w-12 px-0 font-medium text-sm border transition-colors cursor-pointer ${
                      settings.weekdays.includes(day.id)
                        ? '!bg-emerald-600 hover:!bg-emerald-700 !text-white border-transparent'
                        : 'bg-white dark:bg-secondary border'
                    }`}
                  >
                    {day.short}
                  </Toggle>
                ))}
              </div>
            </div>
          </div>
        </section>

        <hr className="my-2 border-gray-200 dark:border-gray-700" />

        {/* Status and Test Email */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Status Box */}
          <div className="flex gap-2">
            {isEnabled && isValidEmail ? (
              <>
                <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-1" />
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">Your daily brief is active!</p>
                  <p className="text-sm text-muted-foreground">Next delivery: {settings.delivery_time}</p>
                </div>
              </>
            ) : !isValidEmail ? (
              <>
                <Mail className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Add your email address</p>
                  <p className="text-sm text-muted-foreground">Enter an email above to activate delivery</p>
                </div>
              </>
            ) : (
              <>
                <Mail className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Select delivery days</p>
                  <p className="text-sm text-muted-foreground">Choose which days to receive your brief</p>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-grow-1 gap-2">
              <>
                { saving ? <Loader2 className="h-5 w-5 animate-spin mt-1 text-green-600 dark:text-green-400" /> : <Check className="h-5 w-5 mt-1 text-green-600 dark:text-green-400" /> }
                <div>
                  <p className='font-semibold text-green-700 dark:text-green-400'>{saving ? 'Saving...' : 'Settings saved'}</p>
                  <p className='text-sm text-muted-foreground'>{lastSaved?.toLocaleTimeString()}</p>
                </div>
              </>
          </div>

          {/* Test Email Button */}
          <div className="flex flex-col gap-2 items-end">
            <Button 
              variant="outline" 
              onClick={handleTestEmail}
              disabled={testSending || !isValidEmail}
              className="h-11 px-6"
            >
              {testSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>
            {/* Test email result message */}
            {testMessage && (
              <div className={`text-sm p-3 rounded-lg border w-full md:w-auto ${
                testMessage.type === 'success' 
                  ? 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800' 
                  : 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  {testMessage.type === 'success' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  <span>{testMessage.text}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 