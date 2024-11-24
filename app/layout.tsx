import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { APP } from '@/lib/constants';
import Header from '@/components/Header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { FilterProvider } from '@/components/Context/FilterContext';
import { Toaster } from '@/components/ui/sonner';
import { CSPostHogProvider } from '@/components/posthog-provider';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: APP.NAME,
  description: APP.DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <head>
        {/* <script
          src='https://unpkg.com/react-scan/dist/auto.global.js'
          async
        ></script> */}
      </head>
      <CSPostHogProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <div className='flex h-full w-full justify-center'>
            <SidebarProvider defaultOpen={false}>
              <FilterProvider>
                <Header />
                <AppSidebar />
                <div className='w-full'>{children}</div>
                <Toaster />
              </FilterProvider>
            </SidebarProvider>
          </div>
        </body>
      </CSPostHogProvider>
    </html>
  );
}
