import DailybriefIcon from "@/components/icons/DailybriefIcon";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-6 py-16">
      <DailybriefIcon />
      <h1 className="text-4xl font-black text-center">Daily Brief</h1>
      <p className="text-lg text-center max-w-xl">
        Your personalized daily brief, combining Google Calendar events, custom notes, and important emails—delivered to your inbox or previewed in your dashboard.
      </p>
      <div className="bg-yellow-100 text-yellow-800 rounded px-4 py-2 text-center border border-yellow-300">
        <strong>This project is an early prototype.</strong>
      </div>
      <div className="flex gap-4 mt-4">
        <Button asChild variant="default" size="lg">
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </div>
    </section>
  );
}
