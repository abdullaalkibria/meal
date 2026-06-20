import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authCookieName } from '@/lib/auth';

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.set(authCookieName, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return NextResponse.json({
    ok: true,
  });
}
