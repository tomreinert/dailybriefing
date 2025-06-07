import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { DeleteAccountButton } from "@/components/delete-account-button";


export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser(); 
  if (!user) {
    return redirect("/sign-in");
  }
  return (
    <div className="flex flex-col gap-8 w-full max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div>
        <div>Signed in via {user.user?.app_metadata.provider}</div>
        <div>{user.user?.email}</div>
      </div>



      
      {/* Sign out button */}
      <form action={signOutAction}>
        <Button type="submit" variant={"outline"}>
          Sign out
        </Button>
      </form>
      
      {/* Delete account section */}
      <div className="border-t pt-8 w-full">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <DeleteAccountButton />
        </div>
      </div>     
    </div>
  );
}
