import { NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth-provider';

export async function GET() {
  try {
    const provider = await getAuthProvider();
    return NextResponse.json({ provider });
  } catch (error) {
    console.error('Auth provider API error:', error);
    return NextResponse.json(
      { error: 'Failed to get auth provider' },
      { status: 500 }
    );
  }
} 