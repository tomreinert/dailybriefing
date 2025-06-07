import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic, AnthropicProviderOptions } from '@ai-sdk/anthropic';
import { formatEventTimeInTimezone, formatEventTimeWithWeekdayInTimezone } from './time-utils';
import { DAILY_BRIEFING_PROMPT } from '@/app/api/briefing/test/prompt';

// Simple model switcher - change this to switch between models
const USE_OPENAI = true; // Set to true to use OpenAI, false for Anthropic

// Helper function to format relative time
const getRelativeTime = (date: string) => {
  const emailDate = new Date(date);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - emailDate.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
};

// Helper function to expand multi-day events for briefing
const expandMultiDayEventsForBriefing = (events: any[]) => {
  const expandedEvents: any[] = [];
  
  for (const event of events) {
    // Only expand all-day events that span multiple days
    if (event.start?.date && event.end?.date) {
      const startDate = new Date(event.start.date);
      const endDate = new Date(event.end.date);
      
      // Subtract 1 day from end to get actual last day (Google quirk)
      const actualEndDate = new Date(endDate);
      actualEndDate.setDate(endDate.getDate() - 1);
      
      // Check if it spans multiple days
      if (startDate.getTime() < actualEndDate.getTime()) {
        // Multi-day event: create entry for each day
        const currentDate = new Date(startDate);
        const dayCount = Math.ceil((actualEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        let dayIndex = 0;
        while (currentDate <= actualEndDate) {
          expandedEvents.push({
            ...event,
            summary: `${event.summary} (Day ${dayIndex + 1} of ${dayCount})`,
            start: { date: currentDate.toISOString().split('T')[0] },
            end: { date: currentDate.toISOString().split('T')[0] },
            _isExpandedMultiDay: true
          });
          currentDate.setDate(currentDate.getDate() + 1);
          dayIndex++;
        }
      } else {
        // Single-day event: add as-is
        expandedEvents.push(event);
      }
    } else {
      // Timed events or other formats: add as-is
      expandedEvents.push(event);
    }
  }
  
  return expandedEvents;
};

// Helper function to prepare events section
const prepareEventsSection = (events: any[], userTimezone: string, includeWeekday: boolean = true) => {
  if (!events || events.length === 0) return 'No upcoming events.';
  
  // Expand multi-day events before formatting
  const expandedEvents = expandMultiDayEventsForBriefing(events);
  
  const formatFunction = includeWeekday ? formatEventTimeWithWeekdayInTimezone : formatEventTimeInTimezone;
  
  return expandedEvents
    .map((event, i) => `${i + 1}. ${event.summary || 'Untitled'} (${formatFunction(event, userTimezone)})`)
    .join('\n');
};

// Helper function to prepare context section
const prepareContextSection = (context: string[]) => {
  if (!context || context.length === 0) return '';
  
  return `\n\nPersonal context and notes:\n${context
    .map((item, i) => `${i + 1}. ${item}`)
    .join('\n')}`;
};

// Helper function to prepare emails section
const prepareEmailsSection = (emails: any[]) => {
  if (!emails || emails.length === 0) return '';
  
  // Sort emails by date (most recent first) and take only the latest 10
  const latestEmails = emails
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);
  
  return `\n\nRelevant forwarded emails and messages (latest 10):\n${latestEmails
    .map((email, i) => {
      // Limit email content to 1000 characters to manage token usage
      const content = email.content || '';
      const truncatedContent = content.length > 1000 
        ? content.substring(0, 1000) + '...' 
        : content;
      
      return `${i + 1}. From: ${email.from}\n` +
        `Subject: ${email.subject}\n` +
        `Date: ${new Date(email.date).toLocaleString()} (${getRelativeTime(email.date)})\n` +
        `Content: ${truncatedContent}`;
    })
    .join('\n\n')}`;
};

interface BriefingData {
  events: any[];
  contextSnippets: string[];
  emails: any[];
  userTimezone: string;
  daysInAdvance?: number;
}

/**
 * Generate briefing content using AI
 * Consolidated function used by all briefing routes for consistency
 */
export async function generateBriefingContent(data: BriefingData): Promise<string> {
  const { events, contextSnippets, emails, userTimezone, daysInAdvance = 7 } = data;
  
  // Prepare the current date and time in user's timezone
  const now = new Date();
  const weekday = now.toLocaleDateString([], { 
    weekday: 'long',
    timeZone: userTimezone 
  });
  const dateTime = now.toLocaleString([], { 
    dateStyle: 'short' as const,
    timeStyle: 'short' as const,
    timeZone: userTimezone
  });
  const currentDateTime = `${weekday}, ${dateTime}`;
  
  // Prepare all sections with consistent formatting
  const eventsSection = prepareEventsSection(events, userTimezone, true);
  const contextSection = prepareContextSection(contextSnippets);
  const emailsSection = prepareEmailsSection(emails);
  
  // Construct the full content using the detailed prompt format
  const content = `
    It is ${currentDateTime}.
    Calendar entries for the next ${daysInAdvance} days:
    ${eventsSection}
    ${contextSection}
    ${emailsSection}
  `;

  console.log('📝 Content being sent to AI:');
  console.log(content);

  // Generate briefing using AI - model selection based on USE_OPENAI flag
  const result = USE_OPENAI 
    ? await generateText({
        model: openai('gpt-4.1'),
        temperature: 0.2,
        messages: [
          {
            role: 'system' as const,
            content: DAILY_BRIEFING_PROMPT
          },
          {
            role: 'user' as const,
            content
          }
        ],
      })
    : await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        providerOptions: {
          anthropic: {
            thinking: { type: 'enabled', budgetTokens: 12000 },
          } satisfies AnthropicProviderOptions,
        },
        messages: [
          {
            role: 'system' as const,
            content: DAILY_BRIEFING_PROMPT
          },
          {
            role: 'user' as const,
            content
          }
        ],
        maxTokens: 20000, // Cap tokens as mentioned in requirements
      });

  const briefingText = result.text;
  const reasoning = result.reasoning;

  console.log('🤖 AI briefing generated successfully');
  //console.log('🤖 AI reasoning:', reasoning);
  console.log('�� Generated briefing length:', briefingText?.length || 0);
  console.log('📄 Generated briefing preview:', briefingText?.substring(0, 200) + '...');
  
  // Check if briefing is empty or undefined
  if (!briefingText || briefingText.trim().length === 0) {
    console.error('❌ AI generated empty or null briefing content');
    throw new Error('AI generated empty briefing content');
  }
  
  return briefingText;
}

/**
 * Prepare email data for briefing generation
 * Normalizes email data from different sources
 */
export function prepareEmailsForBriefing(emails: any[]): any[] {
  return emails.map(email => ({
    from: email.from_email || email.from,
    subject: email.subject || 'No subject',
    content: email.stripped_text_reply || email.text_body || email.content || 'No content',
    date: email.created_at || email.date
  }));
} 