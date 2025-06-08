import { signInAction } from "@/actions/auth";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import LoginGoogle from "@/components/LoginGoogle";
import LoginGithub from "@/components/LoginGithub";

export default async function Login(props: { searchParams: Promise<Message> }) {

  const searchParams = await props.searchParams;
  return (
    <>
      <div className="flex-1 flex flex-col w-full pt-4">
        <h1 className="text-2xl font-medium mb-4">Sign in</h1>
        <p className="mb-8">
          This is a demo of the Daily Brief app. Sign in with GitHub (Mock data) or Google (Real data) to get started.
        </p>
        
        <div className="space-y-3">
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-bold">GitHub Sign-In</h2>
                  <span className="py-1 px-2 bg-green-200 text-green-800 rounded-md text-xs font-bold">Mock data</span>
                </div>
                <strong>Mock data</strong> - realistic calendar events & demo context
              </div>
              <LoginGithub />
            </div>
          </div>
          
          <span className="my-4 block">or</span>

          <div className="border rounded-lg p-4">
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-bold">Google Sign-In</h2>
                  <span className="py-1 px-2 bg-yellow-200 text-yellow-900 rounded-md text-xs font-bold">Real data</span>
                </div>
                <strong>Real data</strong> - uses your actual Google Calendar
              </div>
              <LoginGoogle />
            </div>
          </div>
        </div>
      
      </div>
    </>
  );
}
