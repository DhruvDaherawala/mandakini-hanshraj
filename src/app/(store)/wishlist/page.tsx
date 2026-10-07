import {getSettings} from '@/lib/store';
import SavedCollection from '@/components/products/SavedCollection';
export const metadata={title:'Your Wishlist',robots:{index:false}};
export default async function Wishlist(){const s=await getSettings();return <div className="container page"><h1>Saved for a little later.</h1><SavedCollection mode="wishlist" currency={s.currency} whatsapp={s.whatsapp}/></div>;}
