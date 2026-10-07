import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/auth';
import {getSettings} from '@/lib/store';
import AdminShell from '@/components/admin/AdminShell';

export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};

export default async function ProtectedAdmin({children}:{children:React.ReactNode}){
  let user:{email:string};
  try{
    user=await requireAdmin();
  }catch(e){
    if(e instanceof Error&&'status'in e&&e.status===401)redirect('/admin');
    throw e;
  }
  const settings = await getSettings(true).catch(() => null);
  const businessName = settings?.businessName || 'MANDAKINI';
  return <AdminShell email={user.email} businessName={businessName}>{children}</AdminShell>;
}
