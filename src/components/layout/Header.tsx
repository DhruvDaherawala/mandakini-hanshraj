'use client';
import Link from 'next/link';
import {useState} from 'react';
import type {SiteSettings} from '@/types';
import Photo from '@/components/ui/Photo';
export default function Header({settings,announcement}:{settings:SiteSettings;announcement:string}) { const [open,setOpen]=useState(false);return <><div className="announcement">{announcement}</div><header className="masthead"><button aria-label="Toggle navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>☰</button><Link className="wordmark" href="/">{settings.logo?<Photo className="brand-logo" image={settings.logo} alt={settings.businessName} sizes="150px"/>:<><span aria-hidden="true">✥</span><strong>{settings.businessName}</strong><small>{settings.tagline}</small></>}</Link><nav aria-label="Quick links"><Link aria-label="Search" href="/shop">⌕</Link><Link aria-label="Wishlist" href="/wishlist">♡</Link><Link href="/bag">Bag</Link></nav></header>{open&&<nav className="mobile-nav" aria-label="Main navigation">{[['Home','/'],['Collections','/shop'],['Categories','/categories'],['Our story','/about'],['Contact','/contact']].map(([n,p])=><Link onClick={()=>setOpen(false)} key={p} href={p}>{n}</Link>)}</nav>}</>; }
