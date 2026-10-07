import ProductList from '@/components/admin/ProductList';
import {getSettings} from '@/lib/store';
export default async function Page(){const s=await getSettings();return <ProductList categories={[]} currency={s.currency}/>;}
