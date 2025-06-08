import { signOutAction } from "@/actions/auth";
import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/utils/supabase/server";

export default async function HeaderAuth() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();


  return user ? (
    <div className="flex items-center gap-4">
      <Link 
        href="/feedback" 
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Feedback
      </Link>
      <Link href="/profile" rel="nofollow">
        <img src={ "https://ui-avatars.com/api/?background=random&name=" + user.email} alt={user.email} className="w-8 h-8 rounded-full" />
      </Link>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/sign-in">Sign in</Link>
      </Button>
    </div>
  );
}
