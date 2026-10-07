import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {getProduct,getSettings} from '@/lib/store';
import ProductDetails from '@/components/products/ProductDetails';
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params,p=await getProduct(slug);if(!p)return {title:'Product not found'};return {title:p.seoTitle||p.name,description:p.seoDescription||p.shortDescription,alternates:{canonical:`/products/${p.slug}`},openGraph:{title:p.seoTitle||p.name,description:p.seoDescription||p.shortDescription,images:p.images.slice(0,1).map(i=>({url:i.cloudinaryUrl,alt:i.alt||p.name}))}};}
export default async function ProductPage({params}:Props){const {slug}=await params,[p,s]=await Promise.all([getProduct(slug),getSettings()]);if(!p)notFound();return <div className="container page"><p className="breadcrumb"><Link href="/shop">Collection</Link> / {p.name}</p><ProductDetails product={p} settings={s}/></div>;}
