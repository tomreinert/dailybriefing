import { NextRequest, NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/utils/supabase/server'
import { storeGoogleTokens } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session) {
      // If this is a Google OAuth login and we have tokens, store them
      if (session.user?.app_metadata?.provider === 'google' && session.provider_token) {
        console.log('📧 Google OAuth detected, storing tokens for user:', session.user.id)
        
        try {
          // Store the Google tokens for future use in cron jobs
          await storeGoogleTokens(
            session.user.id, 
            session.provider_token,
            session.provider_refresh_token || undefined
          )
          console.log('✅ Google tokens stored successfully')
        } catch (error) {
          console.error('❌ Failed to store Google tokens:', error)
          // Don't fail the auth flow, just log the error
        }
      }
      
      // Redirect to the intended destination
      const redirectUrl = new URL(next, origin)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // If something went wrong, redirect to home with error
  const redirectUrl = new URL('/auth/auth-code-error', origin)
  return NextResponse.redirect(redirectUrl)
}