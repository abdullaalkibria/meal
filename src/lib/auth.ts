import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getSheetRows, rowToObject } from './sheets';
import { User } from './types';

const COOKIE = 'meal_token';

export function signToken(user: Pick<User, 'phone' | 'name' | 'role'>) {
  return jwt.sign({ phone: user.phone, name: user.name, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const { header, data } = await getSheetRows('Users');
    const users = data.map((r) => rowToObject<User>(header, r));
    return users.find((u) =>
      String(u.phone || '').trim() === String(decoded.phone || '').trim() &&
      String(u.authStatus || '').trim() === '1' &&
      String(u.isDeleted || '0').trim() !== '1'
    ) || null;
  } catch { return null; }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (String(user.role || '').trim() !== 'admin') throw new Error('Admin only');
  return user;
}

export const authCookieName = COOKIE;
