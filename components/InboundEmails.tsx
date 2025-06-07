import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Shield } from "lucide-react";
import { Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Email {
  id: string;
  from_email: string;
  subject: string;
  text_body: string;
  stripped_text_reply?: string;
  created_at: string;
}

// Helper function to detect if content was sanitized
function detectSanitization(content: string): boolean {
  const sanitizationMarkers = [
    '[script removed]',
    '[iframe removed]',
    'javascript-blocked:',
    'data-blocked:',
    'vbscript-blocked:',
    '[injection attempt blocked]'
  ];
  return sanitizationMarkers.some(marker => content.includes(marker));
}

export default function InboundEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEmails = async () => {
    try {
      const response = await fetch('/api/emails');
      if (response.ok) {
        const data = await response.json();
        setEmails(data);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchEmails, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const response = await fetch('/api/emails', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (response.ok) {
        // Remove the deleted email from the state
        setEmails(prev => prev.filter(email => email.id !== id));
      } else {
        console.error('Failed to delete email:', data.error);
        // Optionally show an error message to the user
        alert('Failed to delete email: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Error deleting email. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        {/* Compact status indicators */}
        <div className="flex gap-3 mb-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-secondary text-sm rounded-lg border cursor-help">
                <Shield className="w-4 h-4" />
                <span className="font-medium">Security Active</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Emails are automatically filtered for length limits, malicious content, and rate limiting.<br />
              Maximum 5,000 characters per email, 10 emails per 5 minutes per sender.</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-secondary text-sm rounded-lg border cursor-help">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
                <span className="font-medium">Live Monitoring</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Checking for new emails every 5 seconds while this dialog is open</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <p>Loading emails...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No emails received yet
          </div>
        ) : (
          <div className="space-y-4">
            {emails.map((email) => {
              const contentSanitized = detectSanitization(email.text_body || '') || 
                                     detectSanitization(email.subject || '');
              
              // Check if this email has stripped content (indicating it was a reply)
              const isReply = email.stripped_text_reply && email.stripped_text_reply.trim().length > 0;
              const displayContent = isReply ? email.stripped_text_reply : email.text_body;
              
              return (
                <Card key={email.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{email.subject || '(No subject)'}</p>
                        {contentSanitized && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                            <Shield className="w-3 h-3" />
                            <span>Filtered</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(email.created_at).toLocaleString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(email.id)}
                          disabled={deletingId === email.id}
                          className="h-8 w-8"
                        >
                          {deletingId === email.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">From: {email.from_email}</p>
                    <p className="text-sm">
                      {displayContent && displayContent.length > 300 
                        ? `${displayContent.slice(0, 300)}...` 
                        : displayContent || '(No content)'}
                    </p>
                    {isReply && (
                      <p className="text-xs text-blue-600 mt-2">
                        📧 Quoted content from previous emails was automatically removed from this reply
                      </p>
                    )}
                    {contentSanitized && (
                      <p className="text-xs text-yellow-600 mt-2">
                        ⚠️ Some content was filtered for security (scripts, suspicious patterns, or length limits)
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
} 