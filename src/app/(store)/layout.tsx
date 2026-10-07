import {getSettings,getContent} from '@/lib/store';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
export const dynamic='force-dynamic';
export default async function StoreLayout({children}:{children:React.ReactNode}) {const [settings,content]=await Promise.all([getSettings(),getContent()]);return <><Header settings={settings} announcement={content.announcement}/><main id="main">{children}</main><Footer settings={settings}/></>;}
