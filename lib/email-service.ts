import { getOrCreateInboundEmailHash } from '@/actions/userSettings';
import MarkdownIt from 'markdown-it';

/**
 * Shared email service for sending daily briefings
 * Consolidates email generation and sending logic used by both manual and automated briefing routes
 */

// Initialize markdown-it with email-friendly options
const md = new MarkdownIt({
  html: false,        // Disable HTML tags in source
  xhtmlOut: true,     // Use '/' to close single tags (<br />)
  breaks: true,       // Convert '\n' in paragraphs into <br>
  linkify: true,      // Autoconvert URL-like text to links
});

// Convert markdown to HTML (using email client default styles)
export const markdownToHtml = (markdown: string): string => {
  try {
    // Simple conversion - let email clients use their default styles
    return md.render(markdown);
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    // Fallback to simple paragraph if markdown-it fails
    return `<p>${markdown.replace(/\n/g, '<br>')}</p>`;
  }
};

// Generate the HTML email body
export const generateEmailHtml = (briefingContent: string, isTest = false): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Daily Briefing</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${isTest ? '<div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 14px;"><strong>🧪 Test Email</strong><br>This is a test of your daily briefing email. Your actual briefings will be sent according to your schedule.</div>' : ''}
        <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0; font-style: italic;">
          💡 Reply to this email to add context for tomorrow's briefing
        </p>
        ${markdownToHtml(briefingContent)}
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="font-size: 14px; color: #475569; margin: 0 0 8px 0; font-weight: 600;">
            💬 Want to add context for tomorrow's briefing?
          </p>
          <p style="font-size: 14px; color: #64748b; margin: 0;">
            Simply reply to this email with any information, notes, or updates you want your assistant to know about. Your reply will be processed and included in future briefings.
          </p>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin: 10px 0 0 0; text-align: center;">
          This briefing was generated from your calendar events, personal notes, and recent emails.
        </p>
      </body>
    </html>
  `;
};

// Generate the reply-to email address for a user
export const generateReplyToEmail = async (userEmail: string, userId: string): Promise<string> => {
  const userPrefix = userEmail.split('@')[0];
  const inboundHash = await getOrCreateInboundEmailHash(userId);
  return `${userPrefix}-${inboundHash}@verygooddesignstudio.com`;
};

// Generate the reply-to email address using service client (for cron jobs)
export const generateReplyToEmailWithService = async (userEmail: string, userId: string, serviceSupabase: any): Promise<string> => {
  const { data: userData } = await serviceSupabase
    .from('user_settings')
    .select('inbound_email_hash')
    .eq('user_id', userId)
    .single();

  const userPrefix = userEmail.split('@')[0];
  const inboundHash = userData?.inbound_email_hash || 'default';
  return `${userPrefix}-${inboundHash}@verygooddesignstudio.com`;
};

interface SendBriefingEmailParams {
  briefingContent: string;
  deliveryEmail: string;
  replyToEmail: string;
  isTest?: boolean;
  subject?: string;
}

// Send the briefing email via Postmark
export const sendBriefingEmail = async ({
  briefingContent,
  deliveryEmail,
  replyToEmail,
  isTest = false,
  subject
}: SendBriefingEmailParams) => {
  try {
    console.log('📧 Starting email send process...');
    console.log('📄 Briefing content length:', briefingContent?.length || 0);
    console.log('📄 Briefing content preview:', briefingContent?.substring(0, 150) + '...');
    
    // Check if Postmark token is available
    const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
    console.log('Postmark token available:', !!postmarkToken);
    console.log('Postmark token length:', postmarkToken?.length || 0);
    
    // Lazy import Postmark to avoid build-time issues
    const postmark = await import('postmark');
    const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN!);

    // Generate default subject if not provided
    const emailSubject = subject || `${isTest ? '[TEST] ' : ''}Your Daily Briefing - ${new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`;

    const htmlBody = generateEmailHtml(briefingContent, isTest);
    const textBody = `${isTest ? '[TEST EMAIL]\n\n' : ''}${briefingContent}`;

    console.log('📧 Sending email via Postmark...');
    // Send email via Postmark
    const result = await postmarkClient.sendEmail({
      From: 'dailybriefing@verygooddesignstudio.com',
      To: deliveryEmail,
      ReplyTo: replyToEmail,
      Subject: emailSubject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: 'outbound'
    });

    console.log('📧 Email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Error in sendBriefingEmail:', error);
    throw error;
  }
}; 