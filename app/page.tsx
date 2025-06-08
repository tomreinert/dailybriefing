import DailybriefIcon from "@/components/icons/DailybriefIcon";
import CalendarIcon from "@/components/icons/CalendarIcon";
import EmailIcon from "@/components/icons/EmailIcon";
import ContextIcon from "@/components/icons/ContextIcon";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen dark:prose-invert prose prose-xl prose-headings:font-extrabold prose-headings:leading-tight flex flex-col gap-8 items-center w-full mx-auto">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center gap-8 px-4">
        <DailybriefIcon />
        <div className="text-center">
          <h1 className="mb-10">Daily Brief</h1>
          <p className="lead">
            Wake up to a personalized email briefing in your inbox.<br/> Everything you need to know for the day ahead, delivered every morning.
          </p>
          <div className="border rounded-lg px-6 py-3 text-sm mb-8 inline-block ">
            <strong>Early Access:</strong> Join the prototype and help shape the future of daily briefings
          </div>
        </div>
        <div className="flex gap-4">
          <Button asChild size="lg" className="text-lg px-8 not-prose">
            <Link href="/sign-in">Get Started</Link>
          </Button>
        </div>

        <Image
              src="/images/dailybriefing-email.png"
              alt="Daily Brief Email Example"
              width={800}
              height={600}
              className="rounded-lg"
            />
      </section>

      {/* Problem Section */}
      <section className="py-16 px-4 border-t">
        <div className="max-w-3xl  text-center text-balance">
          <h2>Too much going on? Not enough focus?</h2>
          <p>
            Your calendar is packed, your inbox is full, and you're constantly wondering: <strong>what should I actually focus on today?</strong>
          </p>
          <p>
            You need someone to look at everything and tell you what really matters.
          </p>
        </div>
      </section>

              {/* Solution Section */}
        <section className="py-16 px-4 border-t flex flex-col items-center">
          <div className="max-w-5xl ">
            <div className="text-center mb-16 ">
              <h2>To the rescue: Your personal morning briefer</h2>
              <p>
                Daily Brief looks at your calendar and context, then tells you exactly what to focus on.
              </p>
            </div>
            <div className="space-y-16">
              {/* Left layout */}
              <div className="flex flex-col items-center">
                <div className="flex-shrink-0 scale-150">
                  <CalendarIcon />
                </div>
                <div className="text-center">
                  <h4 className="mt-0 mb-4">Know what's coming</h4>
                  <p className="text-lg">
                    See your day ahead with context, so you're never caught off guard.
                  </p>
                </div>
              </div>

              {/* Right layout */}
              <div className="flex flex-col items-center">
                <div className="flex-shrink-0 scale-150">
                  <ContextIcon />
                </div>
                <div className="text-center">
                  <h4 className="mt-0 mb-4">Teach your assistant about you</h4>
                  <p className="text-lg">
                    Add notes, talking points, and context so your assistant understands what matters to you.
                  </p>
                </div>
              </div>

              {/* Left layout */}
              <div className="flex flex-col items-center">
                <div className="flex-shrink-0 scale-150">
                  <EmailIcon />
                </div>
                <div className="text-center">
                  <h4 className="mt-0 mb-4">Add context on the go</h4>
                  <p className="text-lg">
                    Email your personal assistant address to add context for tomorrow's briefing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* Additional Screenshots */}
      <section className="py-16 px-4 border-t">
        <div className="">
          
          <div className="space-y-16">
            {/* Dashboard Screenshot */}
            <div className="text-center">
              <h2>Manage everything from your dashboard</h2>
              <p>Connect your Google Calendar, create personal notes, and set your delivery preferences. Preview your briefings and adjust your schedule—all from one simple interface.</p>
              <Image
                src="/images/dailybriefing-dashboard.png"
                alt="Daily Brief Dashboard"
                width={800}
                height={600}
                className="rounded-lg mx-auto"
              />
            </div>

            {/* Email Inbox Screenshot */}
            <div className="text-center">
              <h3>Email context to your personal assistant</h3>
              <p>Got something important for tomorrow's briefing? Just email your unique Daily Brief address. Meeting prep, project updates, reminders—it all gets included automatically.</p>
              <Image
                src="/images/dailybriefing-inbox.png"
                alt="Email your Daily Brief assistant"
                width={800}
                height={600}
                className="rounded-lg mx-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 border-t">
        <div className="max-w-3xl  text-center ">
          <h2>Start your focused mornings</h2>
          <p>
            Join early users who wake up knowing exactly what matters.
          </p>
          <div className="">
            <Button asChild size="lg" className="not-prose">
              <Link href="/sign-in">Get Started Today</Link>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Early access • Free during prototype
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
