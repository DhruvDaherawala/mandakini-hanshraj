import {getSettings} from '@/lib/store';
import SavedCollection from '@/components/products/SavedCollection';
export const metadata={title:'Your Enquiry Bag',robots:{index:false}};
export default async function Bag(){const s=await getSettings();return <div className="container page"><h1>Your enquiry bag.</h1><SavedCollection mode="bag" currency={s.currency} whatsapp={s.whatsapp}/></div>;}
