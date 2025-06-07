import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getEmailScheduleSettings } from '@/actions/userSettings';
import { generateBriefingContent, prepareEmailsForBriefing } from '@/lib/briefing-utils';

// Simple rate limiting for demo
const MAX_OUTPUT_TOKENS = 5000; // Cap AI output to control costs

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Basic authentication check to prevent anonymous usage
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's timezone from their email schedule settings
    const emailSettings = await getEmailScheduleSettings(user.id);
    const userTimezone = emailSettings?.timezone || 'UTC';

    const { events, context, emails } = await req.json();
    
    console.log('AI Prompt data received:', {
      events: events?.length || 0,
      context: context?.length || 0,
      emails: emails?.length || 0,
      userTimezone
    });

    try {
      // Use consolidated briefing generation function
      const briefingText = await generateBriefingContent({
        events: events || [],
        contextSnippets: context || [],
        emails: prepareEmailsForBriefing(emails || []),
        userTimezone,
        daysInAdvance: 5  // Test uses 5 days as mentioned in the original prompt
      });

      console.log('Generated text length:', briefingText?.length || 0);
      console.log('Generated text preview:', briefingText?.substring(0, 200) || 'NO TEXT GENERATED');

      if (!briefingText || briefingText.trim().length === 0) {
        console.error('AI generated empty or null response');
        return NextResponse.json(
          { error: 'AI generated empty response. Check API key and model configuration.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ briefing: briefingText });
    } catch (aiError: any) {
      console.error('OpenAI API error details:', {
        message: aiError.message,
        name: aiError.name,
        stack: aiError.stack,
        status: aiError.status,
        error: aiError.error,
      });

      // Check for common OpenAI API issues
      if (aiError.message?.includes('API key')) {
        return NextResponse.json(
          { error: 'OpenAI API key is missing or invalid. Please check your environment variables.' },
          { status: 500 }
        );
      } else if (aiError.message?.includes('model')) {
        return NextResponse.json(
          { error: 'Invalid model specified. Please check the model name.' },
          { status: 500 }
        );
      } else {
        return NextResponse.json(
          { error: `AI generation failed: ${aiError.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Briefing API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate briefing' },
      { status: 500 }
    );
  }
} 