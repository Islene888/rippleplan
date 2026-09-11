import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://rippleplan-life-2026.islenezhao.chatgpt.site'),
  title: 'RipplePlan — See the whole ripple',
  description: 'An evidence-backed personal AI demo that maps one passport rule to its downstream planning effects.',
  openGraph: {
    title: 'RipplePlan — See the whole ripple',
    description: 'Current supporting evidence, mapped to an inspectable passport-validity rule and its downstream effects.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'RipplePlan — See the whole ripple',
    description: 'Current supporting evidence, mapped to an inspectable passport-validity rule and its downstream effects.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
