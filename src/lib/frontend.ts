import type { ImageAsset, Product, Variant } from '@/types';
export function money(value: number, currency: string) { try { return new Intl.NumberFormat('en-IN',{style:'currency',currency}).format(value); } catch { return `${currency} ${value.toFixed(2)}`; } }
export const priceOf = (p: Product, v?: Variant) => v?.price ?? p.discountPrice ?? p.price;
export const stockOf = (p: Product) => p.variants.length ? p.variants.reduce((n,v)=>n+v.stock,0) : p.stock;
export function localHref(value: string, fallback='/shop') { return /^\/(?!\/)/.test(value) && !/[\s\\\u0000-\u001f]/.test(value) ? value : fallback; }
export function imageUrl(image: ImageAsset) { return image.cloudinaryUrl.startsWith('/') ? image.cloudinaryUrl : image.cloudinaryUrl.replace('/image/upload/','/image/upload/f_auto,q_auto/'); }
