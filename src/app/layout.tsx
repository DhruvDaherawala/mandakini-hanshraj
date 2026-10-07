import type {Metadata} from 'next';
import {Cormorant_Garamond,Lato} from 'next/font/google';
import './globals.css';
const serif=Cormorant_Garamond({subsets:['latin'],weight:['400','500','600'],variable:'--font-serif'});
const sans=Lato({subsets:['latin'],weight:['400','700'],variable:'--font-body'});
export const metadata:Metadata={metadataBase:new URL(process.env.APP_URL||'http://localhost:3000'),title:{default:'Mandakini',template:'%s | Mandakini'},description:'Handcrafted heritage sarees, suits, lehengas, and textiles.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body className={`${serif.variable} ${sans.variable}`}><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;}
