"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Copy, Check } from "lucide-react";
import ContextSnippets from "@/components/ContextSnippets";
import InboundEmails from "@/components/InboundEmails";
import EmailScheduleSettings from "@/components/EmailScheduleSettings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import CalendarIcon from "@/components/icons/CalendarIcon";
import ContextIcon from "@/components/icons/ContextIcon";
import EmailIcon from "@/components/icons/EmailIcon";

interface CalendarSettingsType {
  selectedCalendars: string[];
  selectedCalendarNames?: string[];
  daysInAdvance: number;
}

const cards = [
  {
    key: "calendar",
    title: "Calendar",
    summary: "", // Will be set dynamically
  },
  {
    key: "context",
    title: "Personal Notes",
    summary: "Add your important information and preferences.",
  },
  {
    key: "email",
    title: "Email Inbox",
    summary: "Forward important emails to include in your brief.",
  },
];

function formatEventTime(event: any) {
  if (event.start?.dateTime) {
    const start = new Date(event.start.dateTime);
    const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
    return `${start.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}${end ? ' - ' + end.toLocaleTimeString([], { timeStyle: 'short' }) : ''}`;
  } else if (event.start?.date && event.end?.date) {
    const startDate = new Date(event.start.date);
    const endDate = new Date(event.end.date);
    
    // Subtract 1 day from end to get actual last day (Google quirk)
    const actualEndDate = new Date(endDate);
    actualEndDate.setDate(endDate.getDate() - 1);
    
    // Check if it spans multiple days
    if (startDate.getTime() < actualEndDate.getTime()) {
      // Multi-day event: show date range
      return `${startDate.toLocaleDateString()} - ${actualEndDate.toLocaleDateString()}`;
    } else {
      // Single-day event: show single date
      return startDate.toLocaleDateString();
    }
  }
  return '';
}

function useDebouncedEffect(effect: () => void, deps: any[], delay: number) {
  useEffect(() => {
    const handler = setTimeout(() => effect(), delay);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}

export default function DashboardPage() {
  const [open, setOpen] = useState<null | string>(null);
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettingsType>({ selectedCalendars: [], selectedCalendarNames: [], daysInAdvance: 7 });
  const [modalSettings, setModalSettings] = useState<CalendarSettingsType | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<Array<{ id: string; summary: string; primary?: boolean }>>([]);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [contextSnippets, setContextSnippets] = useState<any[]>([]);
  const [contextLoading, setContextLoading] = useState(true);
  const [emails, setEmails] = useState<any[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [inboundEmail, setInboundEmail] = useState<string | null>(null);
  const [inboundEmailLoading, setInboundEmailLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  // Track auth provider to show appropriate UI
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  // Add calendar settings loading state
  const [calendarSettingsLoading, setCalendarSettingsLoading] = useState(true);
  // Add user state to get user email
  const [user, setUser] = useState<any>(null);

  // Fetch calendar settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      setCalendarSettingsLoading(true);
      const settingsRes = await fetch('/api/calendar/settings');
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setCalendarSettings({
          selectedCalendars: settings.selected_calendars || [],
          selectedCalendarNames: settings.selected_calendar_names || [],
          daysInAdvance: typeof settings.days_in_advance === 'number' ? settings.days_in_advance : 7,
        });
      }
      setCalendarSettingsLoading(false);
    };
    
    const fetchAuthProvider = async () => {
      try {
        const res = await fetch('/api/auth/provider');
        if (res.ok) {
          const data = await res.json();
          setAuthProvider(data.provider);
        }
      } catch (error) {
        console.error('Failed to fetch auth provider:', error);
      }
    };

    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/user');
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    
    fetchSettings();
    fetchAuthProvider();
    fetchUser();
  }, []);

  // When opening the modal, copy dashboard state to modal state
  useEffect(() => {
    if (open === "calendar") {
      // Only fetch if we don't have events yet
      if (events.length === 0 && calendarSettings.selectedCalendars.length > 0) {
        handleCalendarSettingsChange(calendarSettings);
      }
    }
  }, [open]);

  // Load available calendars and settings when opening the modal
  useEffect(() => {
    if (open === "calendar") {
      const loadData = async () => {
        setIsLoading(true);
        try {
          // Load settings first
          const settingsRes = await fetch('/api/calendar/settings');
          if (settingsRes.ok) {
            const settings = await settingsRes.json();
            const hasSettings = settings.selected_calendars?.length > 0;
            
            if (hasSettings) {
              // If user has settings, load their calendars (will use appropriate data source)
              const calendarsRes = await fetch('/api/calendars');
              if (calendarsRes.ok) {
                const calendarsData = await calendarsRes.json();
                setAvailableCalendars(calendarsData);
              }
              
              setCalendarSettings({
                selectedCalendars: settings.selected_calendars || [],
                selectedCalendarNames: settings.selected_calendar_names || [],
                daysInAdvance: typeof settings.days_in_advance === 'number' ? settings.days_in_advance : 7,
              });

              // Fetch events using standard calendar API
              const eventsRes = await fetch("/api/calendar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  selectedCalendars: settings.selected_calendars,
                  selectedCalendarNames: settings.selected_calendar_names,
                  daysInAdvance: settings.days_in_advance,
                }),
              });
              const eventsData = await eventsRes.json();
              setEvents(eventsData);
            }
          }
        } catch (error) {
          console.error('Failed to load calendar data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [open]);

  // Handle calendar settings changes
  const handleCalendarSettingsChange = async (newSettings: CalendarSettingsType) => {
    if (isLoading) return;
    
    setIsLoading(true);
    let retryCount = 0;
    const maxRetries = 2;

    const saveSettings = async () => {
      try {
        const settingsRes = await fetch('/api/calendar/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedCalendars: newSettings.selectedCalendars,
            selectedCalendarNames: newSettings.selectedCalendarNames,
            daysInAdvance: newSettings.daysInAdvance,
          }),
        });

        if (!settingsRes.ok) {
          const errorText = await settingsRes.text();
          throw new Error(`Settings save failed: ${settingsRes.status} ${settingsRes.statusText} - ${errorText}`);
        }

        return true;
      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error);
        if (retryCount < maxRetries) {
          retryCount++;
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          return saveSettings();
        }
        throw error;
      }
    };

    try {
      // Try to save settings
      await saveSettings();
      
      // Update local state
      setCalendarSettings(newSettings);
      
      // Only fetch events if we have calendars selected
      if (newSettings.selectedCalendars.length > 0) {
        // Use standard calendar endpoint (will route to appropriate data source)
        const eventsRes = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSettings),
        });
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('All attempts to save settings failed:', error);
      // Still update local state even if API calls fail
      setCalendarSettings(newSettings);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle connecting calendar (for both Google and GitHub users)
  const handleConnectCalendar = async () => {
    setIsLoading(true);
    try {
      // Load calendars (will use appropriate data source based on auth provider)
      const calendarsRes = await fetch('/api/calendars');
      if (calendarsRes.ok) {
        const calendarsData = await calendarsRes.json();
        setAvailableCalendars(calendarsData);
        
        // Auto-select the primary calendar
        const primaryCalendar = calendarsData.find((cal: any) => cal.primary);
        if (primaryCalendar) {
          const newSettings = {
            selectedCalendars: [primaryCalendar.id],
            selectedCalendarNames: [primaryCalendar.summary],
            daysInAdvance: 7,
          };
          await handleCalendarSettingsChange(newSettings);
        }
      }
    } catch (error) {
      console.error('Failed to connect calendar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch context snippets on mount and expose for reuse
  const fetchSnippets = async () => {
    setContextLoading(true);
    const res = await fetch('/api/context');
    if (res.ok) {
      const data = await res.json();
      setContextSnippets(data);
    }
    setContextLoading(false);
  };

  // Fetch emails on mount and expose for reuse
  const fetchEmails = async (silent = false) => {
    if (!silent) {
      setEmailsLoading(true);
    }
    
    try {
      const res = await fetch('/api/emails');
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } finally {
      if (!silent) {
        setEmailsLoading(false);
      }
    }
  };

  // Initial data load
  useEffect(() => {
    fetchSnippets();
    fetchEmails();
  }, []);

  // Poll for new emails every 5 seconds when email dialog is open
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (open === "email") {
      // Start polling every 5 seconds
      intervalId = setInterval(() => {
        // Only fetch if not already loading to prevent overlapping requests
        if (!emailsLoading) {
          fetchEmails(true); // Silent mode - don't show loading states during polling
        }
      }, 5000);
    }
    
    // Cleanup interval when dialog closes or component unmounts
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [open, emailsLoading]);

  useEffect(() => {
    const fetchInboundEmail = async () => {
      setInboundEmailLoading(true);
      try {
        const res = await fetch('/api/user/inbound-email');
        if (res.ok) {
          const data = await res.json();
          setInboundEmail(data.address);
        }
      } finally {
        setInboundEmailLoading(false);
      }
    };
    fetchInboundEmail();
  }, []);

  // When modal closes, just close it - no need to refresh since we're saving immediately
  const handleModalChange = (v: boolean) => {
    if (!v) {
      if (open === "context") {
        fetchSnippets();
      } else if (open === "email") {
        fetchEmails();
      }
      setOpen(null);
    }
  };

  // Card state logic
  const contextActiveCount = contextSnippets.filter((s: any) => s.active).length;
  const emailsCount = emails.length;

  const cardStates = {
    calendar: {
      needsAction: !calendarSettingsLoading && calendarSettings.selectedCalendars.length === 0,
      summary: calendarSettingsLoading
        ? "" // Show empty summary while loading, spinner will show in footer
        : calendarSettings.selectedCalendars.length === 0
          ? "No calendars selected."
          : calendarSettings.selectedCalendarNames && calendarSettings.selectedCalendarNames.length > 0
            ? `${calendarSettings.selectedCalendarNames.join(", ")}`
            : `${calendarSettings.selectedCalendars.length} calendar(s) selected`,
    },
    context: {
      needsAction: !contextLoading && contextActiveCount === 0,
      summary: contextLoading
        ? "" // Show empty summary while loading, spinner will show in footer
        : contextActiveCount === 0
          ? "No notes yet."
          : `${contextActiveCount} note${contextActiveCount > 1 ? 's' : ''}`,
    },
    email: {
      needsAction: !emailsLoading && !inboundEmailLoading && emailsCount === 0,
      summary: emailsLoading || inboundEmailLoading
        ? "" // Show empty summary while loading, spinner will show in footer
        : emailsCount === 0
          ? inboundEmail 
            ? (
                <div className="flex flex-col gap-2">
                  <span>Your inbox address:</span>
                  <div className="flex gap-2">
                    <a
                      href={`mailto:${inboundEmail}`}
                      className="flex-1 min-w-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex-1 min-w-0 p-3 bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm truncate">{inboundEmail}</span>
                        </div>
                      </div>
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-12 px-3"
                      disabled={!inboundEmail}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (inboundEmail) {
                          await navigator.clipboard.writeText(inboundEmail);
                          setCopySuccess(true);
                          setTimeout(() => setCopySuccess(false), 2000);
                        }
                      }}
                    >
                      {copySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )
              : "No inbox address available"
          : `${emailsCount} email${emailsCount > 1 ? 's' : ''} received`,
    },
  };

  // Pulse dot and checkmark dot components
  function PulseDot() {
    return (
      <span className="mr-2 inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse align-middle" title="Needs action" />
    );
  }
  function CheckDot() {
    return (
      <span className="mr-2 inline-block w-2 h-2 rounded-full bg-green-500 align-middle" title="Done" />
    );
  }

  const handleTestBriefing = async () => {
    setBriefingOpen(true);
    setBriefingLoading(true);
    setBriefing(null);
    
    // Fetch current events for selected calendars (will route to appropriate data source)
    const eventsRes = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(calendarSettings),
    });
    const events = await eventsRes.json();
    console.log('Calendar Events:', events);

    // Fetch active context snippets
    const contextRes = await fetch('/api/context');
    const contextSnippets = await contextRes.json();
    const activeSnippets = contextSnippets.filter((s: any) => s.active);
    console.log('Active Context Snippets:', activeSnippets);

    // Fetch recent emails
    const emailsRes = await fetch('/api/emails');
    const emails = await emailsRes.json();
    console.log('Recent Emails:', emails);

    // Call the AI briefing API
    const aiRes = await fetch("/api/briefing/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        events,
        context: activeSnippets.map((s: any) => s.content),
        emails: emails.map((e: any) => ({
          subject: e.subject,
          content: e.stripped_text_reply || e.text_body,
          from: e.from_email,
          date: e.created_at
        }))
      }),
    });

    // Check if the API call was successful
    if (!aiRes.ok) {
      const errorData = await aiRes.json();
      console.error('Briefing API error:', errorData);
      setBriefing(`Error generating briefing: ${errorData.error || 'Unknown error'}`);
      setBriefingLoading(false);
      return;
    }

    const { briefing: aiBriefing } = await aiRes.json();
    console.log('AI Briefing Response:', aiBriefing);
    
    setBriefing(aiBriefing);
    setBriefingLoading(false);
  };

  return (
    <main className="max-w-5xl flex flex-col gap-8 mx-auto">
      {/* Headline and friendly intro */}
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white mb-4 mt-4">Your Daily Morning Brief</h1>
        <p className="text-muted-foreground text-xl max-w-3xl mx-auto text-balance mb-4">
          Get a personalized summary every morning with your upcoming events, important notes, and key information—all in one simple email.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const needsAction = cardStates[card.key as keyof typeof cardStates]?.needsAction;
          const isDone = !needsAction;
          // Step descriptions for each card
          const stepDescriptions = {
            calendar: "Connect your calendar so we can include your upcoming meetings and events in your daily brief.",
            context: "Add information that's important to you—like names of key people, your preferences, or regular commitments.",
            email: "Your special email address where you can forward important emails. We'll automatically include the key details in your brief.",
          };
          return (
            <Dialog key={card.key} open={open === card.key} onOpenChange={(v) => {
              if (v) {
                setOpen(card.key);
              } else {
                handleModalChange(false);
              }
            }}>
              <DialogTrigger asChild>
                <Card
                  className={cn(
                    "min-h-[13rem] flex flex-col justify-between border hover:shadow-lg cursor-pointer transition-all duration-200 group rounded-2xl overflow-hidden p-0",
                    needsAction
                      ? "bg-amber-50 dark:bg-accent border-amber-300 dark:border-accent"
                      : ""
                  )}
                  onClick={() => setOpen(card.key)}
                >
                  {/* Card Header: Icon and Title */}
                  <CardHeader className="p-6 gap-0">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-full"
                      )}>
                        {card.key === "calendar" ? <CalendarIcon /> :
                         card.key === "context" ? <ContextIcon /> :
                         <EmailIcon />}
                      </div>
                      <CardTitle className="text-xl font-bold tracking-tight">
                        {card.title}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  {/* Card Content: Description */}
                  <CardContent className="flex-1 pb-0">
                    <CardDescription className="text-base break-words whitespace-normal leading-relaxed">
                      {stepDescriptions[card.key as keyof typeof stepDescriptions]}
                    </CardDescription>
                  </CardContent>

                  {/* Card Footer: Status/Summary and Actions */}
                  <CardFooter className="border-t p-6 flex-col items-start gap-3">
                    <div className="w-full text-sm">
                      {/* Only show summary if this specific card is not loading */}
                      {!((card.key === "calendar" && calendarSettingsLoading) || 
                         (card.key === "context" && contextLoading) || 
                         (card.key === "email" && (emailsLoading || inboundEmailLoading))) && 
                        (cardStates[card.key as keyof typeof cardStates]?.summary || card.summary)
                      }
                      {/* Show loading spinners for each card type */}
                      {card.key === "calendar" && calendarSettingsLoading && (
                        <div className="flex items-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm">Loading...</span>
                        </div>
                      )}
                      {card.key === "context" && contextLoading && (
                        <div className="flex items-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm">Loading...</span>
                        </div>
                      )}
                      {card.key === "email" && (emailsLoading || inboundEmailLoading) && (
                        <div className="flex items-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm">Loading...</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Show action buttons only when not loading and action is needed */}
                    {needsAction && card.key !== "email" && !calendarSettingsLoading && !contextLoading && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(card.key);
                        }}
                      >
                        {card.key === "calendar" ? "Add Your Calendar" :
                         card.key === "context" ? "Add Your Notes" :
                         "Get Your Email Address"}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </DialogTrigger>
              <DialogContent className="min-w-[80vw] h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{card.title}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-scroll p-1">
                  {card.key === "calendar" && (
                    <>
                      {availableCalendars.length === 0 ? (
                        // Calendar Connection Screen - shows for both providers when not connected
                        <div className="flex flex-col items-center justify-center py-8 text-center max-w-md mx-auto">
                          <div className="mb-6">
                            {authProvider === 'github' ? (
                              <>
                                <h3 className="text-lg font-semibold mb-3">Demo Mode</h3>
                                <p className="text-muted-foreground mb-4">
                                  Since you logged in with GitHub, we'll use sample calendar data to show you how the daily briefing works.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  The demo calendar includes typical work meetings, personal appointments, and family events to demonstrate the briefing functionality.
                                </p>
                              </>
                            ) : authProvider === 'google' ? (
                              <>
                                <h3 className="text-lg font-semibold mb-3">Connect Your Google Calendar</h3>
                                <p className="text-muted-foreground mb-4">
                                  We'll securely access your Google Calendar to pull in your real events for your daily briefing.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Only you can see your calendar data, and we only read upcoming events to create your briefings.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Calendar events are only used to create your briefing. They are not stored or shared with anyone.
                                </p>
                              </>
                            ) : (
                              <>
                                <h3 className="text-lg font-semibold mb-3">Connect Calendar</h3>
                                <p className="text-muted-foreground mb-4">
                                  Loading your authentication details...
                                </p>
                              </>
                            )}
                          </div>
                          <Button 
                            onClick={handleConnectCalendar}
                            disabled={isLoading || !authProvider}
                            className="w-full max-w-xs"
                            size="lg"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Connecting...
                              </>
                            ) : authProvider === 'github' ? (
                              'Connect Demo Calendar'
                            ) : authProvider === 'google' ? (
                              'Connect Google Calendar'
                            ) : (
                              'Loading...'
                            )}
                          </Button>
                        </div>
                      ) : (
                        // Calendar Settings Screen - shows when calendars are connected
                        <>
                          {authProvider === 'github' && (
                            <div className="mb-4 p-3 bg-blue-50 rounded text-sm border border-blue-200">
                              <span className="text-blue-800 font-medium">✓ Demo Calendar Connected</span>
                              <p className="text-blue-700 mt-1">You're using sample calendar data for this demo.</p>
                            </div>
                          )}
                          {authProvider === 'google' && (
                            <div className="mb-4 p-3 bg-secondary rounded text-sm border">
                              <span className="font-medium">✓ Google Calendar Connected</span>
                              <p className="mt-1">Your real Google Calendar events are being used.</p>
                              <p className="mt-1">Calendar events are only used to create your briefing. They are not stored or shared with anyone.</p>
                            </div>
                          )}
                          <div className="mb-4">
                            <Label className="text-base font-medium mr-4">Calendars:</Label>
                            {isLoading && availableCalendars.length === 0 ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                <span className="text-muted-foreground">Loading calendars...</span>
                              </div>
                            ) : authProvider === 'google' && availableCalendars.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-4 text-center text-destructive text-sm gap-2">
                                <span>No calendars found.</span>
                                <span>Your Google session may have expired. Please log out and log in again to reconnect your calendar.</span>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    window.location.href = "/sign-out";
                                  }}
                                  className="mt-2"
                                >
                                  Log out and reconnect Google
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-4 mt-2">
                                {availableCalendars.map((cal) => (
                                  <div key={cal.id} className="flex items-center gap-1 text-sm">
                                    <Checkbox
                                      checked={calendarSettings.selectedCalendars.includes(cal.id)}
                                      onCheckedChange={(checked) => {
                                        const newSelected = checked
                                          ? [...calendarSettings.selectedCalendars, cal.id]
                                          : calendarSettings.selectedCalendars.filter(id => id !== cal.id);
                                        const newNames = checked
                                          ? [...(calendarSettings.selectedCalendarNames || []), cal.summary]
                                          : (calendarSettings.selectedCalendarNames || []).filter((_, i) => 
                                              calendarSettings.selectedCalendars[i] !== cal.id
                                            );
                                        handleCalendarSettingsChange({
                                          ...calendarSettings,
                                          selectedCalendars: newSelected,
                                          selectedCalendarNames: newNames,
                                        });
                                      }}
                                    />
                                    <span className="font-normal">
                                      {cal.summary}
                                      {cal.primary && <span className="text-muted-foreground ml-1">(Primary)</span>}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                            <Label htmlFor="days" className="text-base font-medium">Days in Advance:</Label>
                            <Input
                              id="days"
                              type="number"
                              min="1"
                              max="30"
                              value={calendarSettings.daysInAdvance}
                              onChange={(e) => {
                                const newDays = Number(e.target.value);
                                handleCalendarSettingsChange({
                                  ...calendarSettings,
                                  daysInAdvance: newDays,
                                });
                              }}
                              className="w-20 h-8 text-sm"
                            />
                          </div>
                          <div className="mt-4">
                            {isLoading && calendarSettings.selectedCalendars.length > 0 ? (
                              <div className="flex items-center justify-center py-4 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Loading events...
                              </div>
                            ) : events.length > 0 ? (
                              <div className="divide-y-1">
                                {events.map((event, index) => (
                                  <div key={index} className="text-sm flex justify-between py-2">
                                    <div className="font-medium">{event.summary || 'Untitled'}</div>
                                    <div className="text-muted-foreground text-right">{formatEventTime(event)}</div>
                                  </div>
                                ))}
                              </div>
                            ) : calendarSettings.selectedCalendars.length ? (
                              <div className="text-muted-foreground text-sm">No upcoming events found</div>
                            ) : null}
                          </div>
                        </>
                      )}
                    </>
                  )}
                  {card.key === "context" && (
                    <>
                      <ContextSnippets />
                    </>
                  )}
                  {card.key === "email" && (
                    <>
                      {/* How it works section */}
                      <div className="mb-6 p-6 bg-indigo-50 dark:bg-card rounded-lg border text-card-foreground">
                        <h3 className="text-lg font-semibold mb-3">Your Personal Email Address</h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-3">
                              Forward any important emails to this address and we'll automatically include the key information in your daily brief.
                            </p>
                            <div className="flex gap-2">
                              <a
                                href={`mailto:${inboundEmail}`}
                                className="flex-1 min-w-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex-1 min-w-0 p-4 bg-card rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                  {inboundEmailLoading ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded-full bg-muted-foreground animate-pulse"></div>
                                      <span className="text-muted-foreground animate-pulse">Setting up your inbox...</span>
                                    </div>
                                  ) : inboundEmail ? (
                                    <div className="flex items-center gap-2">
                                      <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground mb-1">Your forwarding address:</p>
                                        <p className="font-mono text-sm text-foreground truncate">{inboundEmail}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-red-600">Unable to create address</span>
                                    </div>
                                  )}
                                </div>
                              </a>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0 h-auto px-4 py-2"
                                disabled={inboundEmailLoading || !inboundEmail}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (inboundEmail) {
                                    await navigator.clipboard.writeText(inboundEmail);
                                    setCopySuccess(true);
                                    setTimeout(() => setCopySuccess(false), 2000);
                                  }
                                }}
                              >
                                {copySuccess ? (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copy
                                  </>
                                )}
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              💡 Tip: Save this address in your contacts for easy forwarding
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Emails list */}
                      <div className="space-y-4">
                        <InboundEmails />
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>
      

      <EmailScheduleSettings userEmail={user?.email} />
      

      <div className="bg-card rounded-2xl p-8 border">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ready to see your brief?</h2>
          <p className="text-muted-foreground ">
            Once you've set up your calendar and notes above, click here to see what your daily morning email will look like.
          </p>
          <Button
            size="lg"
            onClick={handleTestBriefing}
            disabled={calendarSettings.selectedCalendars.length === 0 || briefingLoading}
            className="px-8 py-3 text-lg"
          >
            {briefingLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating your brief...
              </>
            ) : (
              "Show Me My Brief"
            )}
          </Button>
          {calendarSettings.selectedCalendars.length === 0 && (
            <p className="text-sm text-amber-600">
              ⚠️ Connect your calendar first to see your personalized brief
            </p>
          )}
        </div>
      </div>
      {briefingOpen && (
        <div className="rounded-2xl p-8 border bg-card">
          {briefingLoading ? (
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <div className="space-y-1">
                <p className="text-lg font-medium text-gray-900 dark:text-white">Creating your personalized brief...</p>
                <p className="text-sm text-muted-foreground">Looking at your calendar, notes, and emails</p>
              </div>
            </div>
          ) : briefing ? (
            <div className="space-y-4">
              <div className="pb-6 border-b">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Daily Brief Preview</h3>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  This is what your morning email will look like. Set up email delivery to receive this automatically every day.
                </p>
              </div>
              <div className="prose prose-headings:text-xl max-w-none prose-headings:font-bold prose-headings:text-foreground dark:prose-invert prose-headings:mb-4 prose-p:mb-4">
                <ReactMarkdown>{briefing}</ReactMarkdown>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
} 