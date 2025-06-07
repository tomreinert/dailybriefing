import { createClient } from '@/utils/supabase/server';

export async function getAuthProvider(userId?: string) {
  try {
    const supabase = await createClient();
    
    // Try to get provider from authenticated user session first (for interactive use)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!authError && user) {
      // Successfully authenticated user - use their provider info
      return user.app_metadata?.provider || null;
    }
    
    // If no authenticated session but we have a userId (for cron jobs), 
    // look up the provider from the auth.users table using service role
    if (userId) {
      try {
        const { createClient: createServiceClient } = await import('@supabase/supabase-js');
        const serviceSupabase = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        const { data: authUser } = await serviceSupabase.auth.admin.getUserById(userId);
        return authUser?.user?.app_metadata?.provider || null;
      } catch (serviceError) {
        console.error('Error getting provider via service role:', serviceError);
        return null;
      }
    }
    
    // No authenticated session and no userId provided
    return null;
  } catch (error) {
    console.error('Error getting auth provider:', error);
    return null;
  }
}

export function isGoogleProvider(provider: string | null): boolean {
  return provider === 'google';
}

export function isGithubProvider(provider: string | null): boolean {
  return provider === 'github';
} 