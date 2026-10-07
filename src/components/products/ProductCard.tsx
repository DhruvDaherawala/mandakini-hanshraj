import Link from 'next/link';
import type {Product} from '@/types';
import Photo from '@/components/ui/Photo';
import WishButton from './WishButton';
import {money,stockOf} from '@/lib/frontend';
export default function ProductCard({product:p,currency}:{product:Product;currency:string}) {return <article className="product-card"><div className="product-photo"><Link href={`/products/${p.slug}`}><Photo image={p.images[p.thumbnail]||p.images[0]} alt={p.name}/></Link><WishButton id={p._id}/>{(!stockOf(p)||p.newArrival)&&<span className="tag">{stockOf(p)?'New arrival':'Sold out'}</span>}</div><Link href={`/products/${p.slug}`}><h3>{p.name}</h3></Link><div>{p.variants.some(v=>v.price!==undefined)?'From ':''}{money(p.variants.length?Math.min(...p.variants.map(v=>v.price??p.discountPrice??p.price)):p.discountPrice??p.price,currency)}{p.discountPrice!==undefined&&<del>{money(p.price,currency)}</del>}</div><small>{p.fabric}</small></article>;}
