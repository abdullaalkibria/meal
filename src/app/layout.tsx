import './globals.css';
export const metadata = { title: 'Mess Meal System', description: 'Meal management dashboard' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
