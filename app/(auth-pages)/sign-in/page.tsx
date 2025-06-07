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
                <h2 className="text-xl font-bold mb-4">GitHub Sign-In <span className="p-2 bg-green-100 text-green-800 rounded-md text-xs ml-2">Mock data</span></h2>
                <ul className="text-sm list-disc list-inside space-y-1">
                  <li><strong>Mock data</strong> - realistic calendar events, optional demo context</li>
                  <li>Recommended for evaluation</li>
                </ul>
              </div>
              <LoginGithub />
            </div>
          </div>
          
          <span className="my-4 block">or</span>

          <div className="border rounded-lg p-4">
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-xl font-bold mb-4">
                  Google Sign-In 
                  <span className="p-2 bg-yellow-200 text-yellow-900 rounded-md text-xs ml-2">Real data</span>
                </h2>
                <ul className="text-sm list-disc pl-4 space-y-1">
                  <li><strong>Real data</strong> - uses your actual Google Calendar</li>
                  <li>Shows unverified app warning – click "Advanced"</li>
                </ul>
              </div>
              <LoginGoogle />
            </div>
          </div>
        </div>
      
      </div>
    </>
  );
}
