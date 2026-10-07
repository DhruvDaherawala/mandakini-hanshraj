import Link from 'next/link';
import {getCategories} from '@/lib/store';
import Photo from '@/components/ui/Photo';
export const metadata={title:'Categories'};
export default async function Categories(){const cats=await getCategories();return <div className="container page"><h1>Find your kind of heritage.</h1><div className="category-grid">{cats.map(c=><Link key={c._id} href={`/categories/${c.slug}`}><Photo className="category-photo" image={c.image} alt={c.name}/><h2>{c.name}</h2><p>{c.description}</p></Link>)}</div>{!cats.length&&<p className="empty">Collections are being prepared.</p>}</div>;}
