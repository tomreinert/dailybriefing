import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FeedbackPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" asChild className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
      
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <h1>Feedback</h1>
        
        <p>I'd love to hear from you! Whether you have suggestions, found a bug, or just want to say hello - your feedback helps me improve Daily Brief.</p>
        
        <a 
          href="mailto:hello@tomreinert.de?subject=Daily Brief Feedback"
          className="text-xl"
        >
          hello@tomreinert.de
        </a>
      </div>
    </div>
  );
} 