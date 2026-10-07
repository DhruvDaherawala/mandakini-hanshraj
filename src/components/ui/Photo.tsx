import Image from 'next/image';
import type { ImageAsset } from '@/types';
import { imageUrl } from '@/lib/frontend';
export default function Photo({image,alt='',priority=false,className='',sizes='(max-width: 700px) 50vw, 25vw'}:{image?:ImageAsset|null;alt?:string;priority?:boolean;className?:string;sizes?:string}) {
  return <div className={`photo ${className}`}>{image ? <Image src={imageUrl(image)} alt={image.alt||alt} fill sizes={sizes} priority={priority}/> : <div className="photo-empty" role="img" aria-label={alt||'No photograph'}>✥</div>}</div>;
}
