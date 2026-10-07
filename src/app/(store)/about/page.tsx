import {getContent,getSettings} from '@/lib/store';
import Photo from '@/components/ui/Photo';
export const metadata={title:'Our Story'};
export default async function About(){const [c,s]=await Promise.all([getContent(),getSettings()]);return <div className="container page"><h1>{c.aboutHeading}</h1><p className="preline prose">{c.aboutText}</p><p className="prose">{s.footerText}</p><div className="artisan-grid">{c.artisans.map((a,i)=><article key={i}><Photo image={a.image} alt={a.name}/><h2>{a.name}</h2><p>{a.role} · {a.location}</p></article>)}</div></div>;}
