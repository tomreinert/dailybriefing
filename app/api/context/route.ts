import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });
  const { data, error } = await supabase
    .from('user_context_snippets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { content } = await req.json();
  const { data, error } = await supabase
    .from('user_context_snippets')
    .insert({ user_id: user.id, content, active: true })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id, content, active } = await req.json();
  const { data, error } = await supabase
    .from('user_context_snippets')
    .update({ content, active })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await req.json();
  const { error } = await supabase
    .from('user_context_snippets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// New endpoint to seed demo context snippets for GitHub users
export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  
  // Check if user is a GitHub user
  const { getAuthProvider, isGithubProvider } = await import('@/lib/auth-provider');
  const provider = await getAuthProvider();
  
  if (!isGithubProvider(provider)) {
    return NextResponse.json({ error: 'Demo context seeding only available for GitHub users' }, { status: 400 });
  }
  
  // Check if user already has context snippets to avoid duplicates
  const { data: existingSnippets } = await supabase
    .from('user_context_snippets')
    .select('id')
    .eq('user_id', user.id);
  
  if (existingSnippets && existingSnippets.length > 0) {
    return NextResponse.json({ message: 'Context snippets already exist' });
  }
  
  // Import and insert mock context snippets
  const { getMockContextSnippets } = await import('@/lib/mock-calendar');
  const mockSnippets = getMockContextSnippets();
  
  const snippetsToInsert = mockSnippets.map(snippet => ({
    user_id: user.id,
    content: snippet.content,
    active: snippet.active,
  }));
  
  const { data, error } = await supabase
    .from('user_context_snippets')
    .insert(snippetsToInsert)
    .select();
  
  if (error) {
    console.error('Error seeding context snippets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ message: 'Demo context snippets added successfully', data });
} 