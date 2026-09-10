import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://rippleplan-life-2026.comet-tetra-2493.chatgpt.site'),
  title: 'RipplePlan — See the whole ripple',
  description: 'An evidence-backed personal AI that maps how one life change affects every deadline and requirement downstream.',
  openGraph: {
    title: 'RipplePlan — See the whole ripple',
    description: 'Live official evidence, mapped to the life decisions it changes.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'RipplePlan — See the whole ripple',
    description: 'Live official evidence, mapped to the life decisions it changes.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
