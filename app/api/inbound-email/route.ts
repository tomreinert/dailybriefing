import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Security configurations for demo protection
const SECURITY_LIMITS = {
  MAX_SUBJECT_LENGTH: 200,
  MAX_TEXT_BODY_LENGTH: 5000,
  MAX_HTML_BODY_LENGTH: 10000,
  MAX_FROM_EMAIL_LENGTH: 100,
  RATE_LIMIT_WINDOW_MINUTES: 5,
  MAX_EMAILS_PER_WINDOW: 10,
};

// Basic content sanitization to prevent injection attacks
function sanitizeContent(content: string | null): string | null {
  if (!content) return null;
  
  // Remove potential script tags and other dangerous content
  return content
    .replace(/<script[^>]*>.*?<\/script>/gi, '[script removed]')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '[iframe removed]')
    .replace(/javascript:/gi, 'javascript-blocked:')
    .replace(/data:(?!image\/)/gi, 'data-blocked:')
    .replace(/vbscript:/gi, 'vbscript-blocked:')
    // Remove potential prompt injection patterns
    .replace(/ignore\s+(previous|all)\s+(instructions?|prompts?)/gi, '[injection attempt blocked]')
    .replace(/pretend\s+you\s+are/gi, '[injection attempt blocked]')
    .replace(/act\s+as\s+(if\s+)?you\s+are/gi, '[injection attempt blocked]')
    .trim();
}

// Validate email content for length and suspicious patterns
function validateEmailContent(payload: any): { isValid: boolean; reason?: string } {
  // Check required fields
  if (!payload.From || !payload.To) {
    return { isValid: false, reason: 'Missing required From or To fields' };
  }

  // Length validations
  if (payload.From && payload.From.length > SECURITY_LIMITS.MAX_FROM_EMAIL_LENGTH) {
    return { isValid: false, reason: 'From email address too long' };
  }

  if (payload.Subject && payload.Subject.length > SECURITY_LIMITS.MAX_SUBJECT_LENGTH) {
    return { isValid: false, reason: 'Subject line too long' };
  }

  if (payload.TextBody && payload.TextBody.length > SECURITY_LIMITS.MAX_TEXT_BODY_LENGTH) {
    return { isValid: false, reason: 'Email content too long' };
  }

  if (payload.HtmlBody && payload.HtmlBody.length > SECURITY_LIMITS.MAX_HTML_BODY_LENGTH) {
    return { isValid: false, reason: 'HTML content too long' };
  }

  // Basic suspicious pattern detection
  const suspiciousPatterns = [
    /SYSTEM\s*:/i,
    /USER\s*:/i,
    /ASSISTANT\s*:/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /<\|.*?\|>/g,
  ];

  const textToCheck = (payload.Subject || '') + ' ' + (payload.TextBody || '');
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(textToCheck)) {
      return { isValid: false, reason: 'Content contains suspicious patterns' };
    }
  }

  return { isValid: true };
}

// Check rate limiting for sender
async function checkRateLimit(fromEmail: string, userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const windowStart = new Date(Date.now() - SECURITY_LIMITS.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

  // Count recent emails from this sender for this user
  const { data: recentEmails, error } = await supabase
    .from('emails')
    .select('id')
    .eq('user_id', userId)
    .eq('from_email', fromEmail)
    .gte('created_at', windowStart.toISOString());

  if (error) {
    console.error('Error checking rate limit:', error);
    // Allow on error to avoid blocking legitimate emails
    return { allowed: true };
  }

  if (recentEmails && recentEmails.length >= SECURITY_LIMITS.MAX_EMAILS_PER_WINDOW) {
    return { 
      allowed: false, 
      reason: `Rate limit exceeded: max ${SECURITY_LIMITS.MAX_EMAILS_PER_WINDOW} emails per ${SECURITY_LIMITS.RATE_LIMIT_WINDOW_MINUTES} minutes from same sender` 
    };
  }

  return { allowed: true };
}

function extractHashFromTo(to: string): string | null {
  // Example: tom-abc123@verygooddesignstudio.com => abc123
  const local = to.split('@')[0];
  const parts = local.split('-');
  if (parts.length < 2) return null;
  return parts[parts.length - 1];
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  console.log('Inbound email webhook received');
  
  try {
    const payload = await request.json();
    console.log('Received payload from:', payload.From, 'subject:', payload.Subject?.substring(0, 50));
    console.log('Full payload keys:', Object.keys(payload));
    console.log('TextBody length:', payload.TextBody?.length || 0);
    console.log('Subject length:', payload.Subject?.length || 0);

    // Validate email content first
    const validation = validateEmailContent(payload);
    if (!validation.isValid) {
      console.warn('Email validation failed:', validation.reason);
      console.log('Validation details - From:', payload.From, 'To:', payload.To);
      console.log('Subject:', payload.Subject);
      console.log('TextBody preview:', payload.TextBody?.substring(0, 100));
      // Return 200 OK so Postmark doesn't retry, but log the rejection
      return NextResponse.json({ 
        success: false, 
        reason: validation.reason 
      }, { status: 200 });
    }
    console.log('✅ Email validation passed');

    // Extract hash from To address
    const hash = extractHashFromTo(payload.To || '');
    console.log('Extracted hash from To address:', hash, 'from:', payload.To);
    if (!hash) {
      console.warn('No hash found in To address:', payload.To);
      // Return 200 OK so Postmark does not retry
      return NextResponse.json({ success: false, reason: 'Invalid recipient address' }, { status: 200 });
    }
    console.log('✅ Hash extraction successful');

    // Look up user by inbound_email_hash
    console.log('Looking up user with hash:', hash);
    const { data: userSettings, error: userSettingsError } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('inbound_email_hash', hash)
      .single();
    
    console.log('User lookup result:', { userSettings, userSettingsError });
    if (userSettingsError || !userSettings) {
      console.error('No user found for hash:', hash, 'Error:', userSettingsError);
      return NextResponse.json({ error: 'No user found for this address' }, { status: 404 });
    }
    const userId = userSettings.user_id;
    console.log('✅ User found:', userId);

    // Check rate limiting
    console.log('Checking rate limit for:', payload.From, 'user:', userId);
    const rateLimitCheck = await checkRateLimit(payload.From, userId);
    if (!rateLimitCheck.allowed) {
      console.warn('Rate limit exceeded for:', payload.From, rateLimitCheck.reason);
      return NextResponse.json({ 
        success: false, 
        reason: rateLimitCheck.reason 
      }, { status: 200 });
    }
    console.log('✅ Rate limit check passed');

    // Sanitize content before storing
    const sanitizedSubject = sanitizeContent(payload.Subject);
    const sanitizedTextBody = sanitizeContent(payload.TextBody);
    const sanitizedHtmlBody = sanitizeContent(payload.HtmlBody);
    
    console.log('Sanitized content lengths:', {
      subject: sanitizedSubject?.length || 0,
      textBody: sanitizedTextBody?.length || 0,
      htmlBody: sanitizedHtmlBody?.length || 0
    });

    // Store the email in the database, with user_id
    console.log('Attempting to store email in database...');
    const { error } = await supabase.from('emails').insert({
      from_email: payload.From,
      to_email: payload.To,
      subject: sanitizedSubject,
      text_body: sanitizedTextBody,
      html_body: sanitizedHtmlBody,
      message_id: payload.MessageID,
      date: payload.Date,
      mailbox_hash: payload.MailboxHash,
      tag: payload.Tag,
      stripped_text_reply: sanitizeContent(payload.StrippedTextReply),
      headers: payload.Headers,
      attachments: payload.Attachments,
      user_id: userId,
    });

    if (error) {
      console.error('Error storing email:', error);
      return NextResponse.json(
        { error: 'Failed to store email' },
        { status: 500 }
      );
    }

    console.log('✅ Email successfully stored in database for user:', userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing inbound email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 