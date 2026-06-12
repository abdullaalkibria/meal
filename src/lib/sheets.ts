import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

function auth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!SHEET_ID) throw new Error('GOOGLE_SHEET_ID missing');
  if (!process.env.GOOGLE_CLIENT_EMAIL) throw new Error('GOOGLE_CLIENT_EMAIL missing');
  if (!privateKey) throw new Error('GOOGLE_PRIVATE_KEY missing');
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function sheetsApi() { return google.sheets({ version: 'v4', auth: auth() }); }

export async function readRows(range: string) {
  const sheets = await sheetsApi();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range });
  return res.data.values || [];
}

export async function appendRow(range: string, values: any[]) {
  const sheets = await sheetsApi();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values.map(v => v === undefined || v === null ? '' : String(v))] },
  });
}

export async function updateRange(range: string, values: any[][]) {
  const sheets = await sheetsApi();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: values.map(row => row.map(v => v === undefined || v === null ? '' : String(v))) },
  });
}

export async function getSheetRows(sheet: string) {
  const rows = await readRows(`${sheet}!A:Z`);
  const [header, ...data] = rows;
  return { header: header || [], data: data.filter(r => r.some(c => String(c || '').trim() !== '')) };
}

function normalizeHeader(headerName: string) {
  const key = String(headerName).trim();
  const compact = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  const map: Record<string, string> = {
    userid: 'id', usercode: 'id', id: 'id',
    name: 'name', username: 'name',
    phone: 'phone', mobile: 'phone', phonenumber: 'phone',
    password: 'password', passwordhash: 'password', pass: 'password',
    role: 'role', authstatus: 'authStatus', authorizationstatus: 'authStatus',
    createdat: 'createdAt', deletedat: 'deletedAt', isdeleted: 'isDeleted',
    date: 'date', month: 'month', year: 'year', lunch: 'lunch', dinner: 'dinner', updatedat: 'updatedAt',
    amount: 'amount', note: 'note', status: 'status', submittedat: 'submittedAt', verifiedat: 'verifiedAt', verifiedby: 'verifiedBy',
    seatrent: 'seatRent', utilitybill: 'utilityBill', wifibill: 'wifiBill', cookbill: 'cookBill', electricitybill: 'electricityBill',
    key: 'key', value: 'value', description: 'description'
  };
  return map[compact] || key;
}

export function rowToObject<T>(header: any[], row: any[]): T {
  const obj: any = {};
  header.forEach((h, i) => { obj[normalizeHeader(String(h))] = row[i] ?? ''; });
  return obj as T;
}
