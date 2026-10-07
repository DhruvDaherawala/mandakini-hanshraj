import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {getCategories,getProducts,getSettings} from '@/lib/store';
import ProductCard from '@/components/products/ProductCard';
type Props={params:Promise<{slug:string}>;searchParams:Promise<{page?:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params,c=(await getCategories()).find(x=>x.slug===slug);return c?{title:c.seoTitle||c.name,description:c.seoDescription||c.description,alternates:{canonical:`/categories/${c.slug}`}}:{title:'Category not found'};}
export default async function CategoryPage({params,searchParams}:Props){const {slug}=await params,c=(await getCategories()).find(x=>x.slug===slug);if(!c)notFound();const {page}=await searchParams;const [r,s]=await Promise.all([getProducts({category:c._id,page:page||'1',limit:'20'}),getSettings()]);return <div className="container page"><h1>{c.name}</h1><p>{c.description}</p><div className="product-grid">{r.items.map(p=><ProductCard key={p._id} product={p} currency={s.currency}/>)}</div>{!r.items.length&&<p className="empty">New pieces are on their way.</p>}<nav className="pagination">{r.page>1&&<Link href={`?page=${r.page-1}`}>Previous</Link>}<span>{r.page} / {Math.max(1,r.pages)}</span>{r.page<r.pages&&<Link href={`?page=${r.page+1}`}>Next</Link>}</nav></div>;}
