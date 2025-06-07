import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Use secure getUser() instead of getSession() to ensure authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth check:', { user: user?.id, authError });

    if (authError || !user) {
      console.log('No authenticated user found, returning unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User ID:', user.id);

    const { data: emails, error } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching emails:', error);
      return NextResponse.json(
        { error: 'Failed to fetch emails' },
        { status: 500 }
      );
    }

    console.log('Found emails:', emails?.length);
    return NextResponse.json(emails);
  } catch (error) {
    console.error('Error in emails API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    
    // Parse the request body
    const body = await req.json();
    const { id } = body;
    
    console.log('Delete request received:', { id });
    
    if (!id) {
      console.log('No ID provided in delete request');
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      );
    }

    // Use secure getUser() instead of getSession() to ensure authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth check:', { user: user?.id, authError });
    
    if (authError || !user) {
      console.log('No authenticated user found, returning unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Attempting to delete email:', { id, user_id: user.id });

    // Delete the email
    const { error } = await supabase
      .from('emails')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user can only delete their own emails

    if (error) {
      console.error('Error deleting email:', error);
      return NextResponse.json(
        { error: 'Failed to delete email' },
        { status: 500 }
      );
    }

    console.log('Email successfully deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in emails DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 