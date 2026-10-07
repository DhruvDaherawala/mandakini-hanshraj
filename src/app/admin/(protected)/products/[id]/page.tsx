import ProductForm from '@/components/admin/ProductForm';
export default async function Page({params}:{params:Promise<{id:string}>}){return <ProductForm id={(await params).id}/>;}
