import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getOrCreateInboundEmailHash } from '@/actions/userSettings';

const DOMAIN = 'verygooddesignstudio.com';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Get or create the hash
  const hash = await getOrCreateInboundEmailHash(user.id);
  if (!hash) return NextResponse.json({ error: 'Could not generate address' }, { status: 500 });

  // Use the part before @ in their email as a prefix (sanitized)
  const prefix = user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '') || 'user';
  const address = `${prefix}-${hash}@${DOMAIN}`;
  return NextResponse.json({ address });
} 