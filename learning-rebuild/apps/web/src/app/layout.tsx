import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LMS SMK Nagara Rebuild',
  description: 'Learning Management System SMK Nagara Modern Rebuild',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
