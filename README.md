# Mess Meal Management System

Next.js + Google Sheets + Vercel meal management app.

## Main rules
- Phone/password login with plain password column.
- Admin phone comes from `ADMIN_PHONE`.
- Users can login only when `authStatus=1` and `isDeleted=0`.
- Lunch and dinner editing are blocked only during lock windows:
  - lunchLockStart to lunchLockEnd
  - dinnerLockStart to dinnerLockEnd
- Daily bazar submissions go to `DailyBazar` as `pending`.
- Admin approves/rejects bazar. Pending bazar auto-approves after 72 hours.
- Reports are month-wise using `YYYY-MM` month column and year-wise using `YYYY` year column.
- Admin delete is soft delete: old history remains, login disabled.

## Required Google Sheet tabs
Users, MealStatus, DailyBazar, Bills, Settings, Dashboard, MonthlySummary, ReadMe

## Local setup
```bash
npm install
npm run dev
```

## Environment variables
```env
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_CLIENT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ADMIN_PHONE=01518469198
JWT_SECRET=change_this_secret
```

Share the Google Sheet with the service-account email as Editor and enable Google Sheets API.
