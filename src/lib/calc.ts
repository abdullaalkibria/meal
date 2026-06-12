import { Bazar, Bills, Meal } from './types';

export const TZ = 'Asia/Dhaka';

export function dhakaNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

export function dateKey(d = dhakaNow()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function monthKey(d = dhakaNow()) {
  return dateKey(d).slice(0, 7);
}

export function yearKey(d = dhakaNow()) {
  return String(d.getFullYear());
}

export function today() { return dateKey(); }

export function parseMonth(input?: string | null) {
  const m = String(input || '').trim();
  return /^\d{4}-\d{2}$/.test(m) ? m : monthKey();
}

function minutes(t: string, fallback: string) {
  const value = String(t || fallback).trim();
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return minutes(fallback, '00:00');
  return h * 60 + m;
}

export function isLocked(mealType: 'lunch' | 'dinner', settings: Record<string, string>) {
  const now = dhakaNow();
  const current = now.getHours() * 60 + now.getMinutes();
  const start = mealType === 'lunch'
    ? minutes(settings.lunchLockStart || settings.LunchLockStart, '10:00')
    : minutes(settings.dinnerLockStart || settings.DinnerLockStart, '18:00');
  const end = mealType === 'lunch'
    ? minutes(settings.lunchLockEnd || settings.LunchLockEnd, '13:00')
    : minutes(settings.dinnerLockEnd || settings.DinnerLockEnd, '21:00');
  return current >= start && current <= end;
}

export function lockMessage(mealType: 'lunch'|'dinner', settings: Record<string,string>) {
  const start = mealType === 'lunch' ? (settings.lunchLockStart || '10:00') : (settings.dinnerLockStart || '18:00');
  const end = mealType === 'lunch' ? (settings.lunchLockEnd || '13:00') : (settings.dinnerLockEnd || '21:00');
  return `${mealType === 'lunch' ? 'Lunch' : 'Dinner'} editing is locked from ${start} to ${end}.`;
}

export function mealCount(meals: Meal[]) {
  return meals.reduce((s, m) => s + Math.max(0, Number(m.lunch || 0)) + Math.max(0, Number(m.dinner || 0)), 0);
}

export function safeCount(value: any) {
  const n = Math.floor(Number(value || 0));
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 20) return 20;
  return n;
}

export function approvedBazarTotal(bazars: Bazar[]) {
  return bazars.filter((b) => b.status === 'approved').reduce((s, b) => s + Number(b.amount || 0), 0);
}

export function fixedBillTotal(b: Bills) {
  return Number(b.seatRent || 0) + Number(b.utilityBill || 0) + Number(b.wifiBill || 0) + Number(b.cookBill || 0) + Number(b.electricityBill || 0);
}
