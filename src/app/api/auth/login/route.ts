import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSheetRows, rowToObject } from '@/lib/sheets';
import { User } from '@/lib/types';
import { authCookieName, signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { phone, password } = await req.json();
    const cleanPhone = String(phone || '').trim();
    const cleanPassword = String(password || '');
    const { header, data } = await getSheetRows('Users');
    const users = data.map((r) => rowToObject<User>(header, r));
    const user = users.find((u) => String(u.phone || '').trim() === cleanPhone && String(u.isDeleted || '0') !== '1');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (String(user.authStatus || '').trim() !== '1') return NextResponse.json({ error: 'Your account is not authorized yet' }, { status: 403 });
    const stored = String(user.password || user.passwordHash || '');
    if (stored !== cleanPassword) return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
    const token = signToken(user);
    (await cookies()).set(authCookieName, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return NextResponse.json({ ok: true, role: user.role });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
