import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authCookieName } from '@/lib/auth';
export async function POST() {
  (await cookies()).delete(authCookieName);
  return NextResponse.json({ ok: true });
}
