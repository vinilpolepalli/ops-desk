import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ops Desk - independent demo',
  description: 'Synthetic operations inbox with a server-enforced approval workflow. Sample data only.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ground font-sans text-ink">{children}</body>
    </html>
  );
}
