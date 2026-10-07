import type {MetadataRoute} from 'next';
import {getCategories,getProducts} from '@/lib/store';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const base=process.env.APP_URL||'http://localhost:3000';const rows:MetadataRoute.Sitemap=['','/shop','/categories','/about','/contact'].map(p=>({url:base+p}));const cats=await getCategories();for(const c of cats)rows.push({url:`${base}/categories/${c.slug}`});let page=1,pages=1;do{const r=await getProducts({page:String(page),limit:'20'});pages=r.pages;for(const p of r.items)rows.push({url:`${base}/products/${p.slug}`,lastModified:new Date(p.updatedAt)});page++;}while(page<=pages&&rows.length<49000);return rows;}
