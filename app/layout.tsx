import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FoodMarket - Crowd-Powered Food Pricing',
  description: 'Live local prices and recipes powered by your community.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-white">
        {children}
      </body>
    </html>
  );
}
