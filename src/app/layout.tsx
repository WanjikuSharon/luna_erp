import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Cinzel, Poppins } from 'next/font/google';
import { FirebaseClientProvider } from '@/firebase';

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-headline',
  weight: ['700'],
});

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: 'Luna Industries ERP',
  description: 'Enterprise Resource Planning for Luna Industries',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                document.documentElement.classList.add('dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`font-body antialiased ${cinzel.variable} ${poppins.variable}`}>
        <FirebaseClientProvider>
            {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
