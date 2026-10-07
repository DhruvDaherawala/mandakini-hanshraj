import 'server-only';
import {assertOrigin,login,logout,requireAdmin} from './auth';
import {response,errorResponse,json,query,noQuery,uploadForm} from './http';
import {fail} from './errors';
import {uploadImage,deleteImage} from './media';
import {getProducts,getProductRecord,createProduct,updateProduct,deleteProduct,duplicateProduct,getCategories,getCategory,createCategory,updateCategory,deleteCategory,getContent,updateContent,getSettings,updateSettings,dashboard} from './store';
import {loginSchema,viewQuerySchema,productCreateSchema,productUpdateSchema,categoryCreateSchema,categoryUpdateSchema,contentSchema,settingsSchema,uploadDeleteSchema,versionSchema,duplicateSchema} from './validation';
function method(allowed:string):never{throw Object.assign(new Error('Method not allowed'),{allowed});}
export async function handle(request:Request,path:string[]):Promise<Response>{try{
  const verb=request.method,key=path.join('/');
  if(!['GET','POST','PUT','DELETE'].includes(verb))return response({error:{code:'METHOD_NOT_ALLOWED',message:'Method not allowed.'}},405,{Allow:'GET, POST, PUT, DELETE'});
  if(verb!=='GET')assertOrigin(request);
  if(key==='auth/login'){if(verb!=='POST')return response({error:{code:'METHOD_NOT_ALLOWED',message:'Use POST.'}},405,{Allow:'POST'});noQuery(request);return response(await login(request,await json(request,loginSchema)));}
  if(key==='auth/logout'){if(verb!=='POST')return response({error:{code:'METHOD_NOT_ALLOWED',message:'Use POST.'}},405,{Allow:'POST'});noQuery(request);return response(await logout());}
  if(key==='auth/me'){if(verb!=='GET')method('GET');noQuery(request);return response(await requireAdmin());}
  // Authorization is enforced here for all mutations, again within catalog services,
  // and explicitly for every admin read. Proxy redirects are not the security boundary.
  if(verb!=='GET')await requireAdmin();
  if(key==='products'){
    if(verb==='GET')return response(await getProducts(query(request)));
    noQuery(request);if(verb==='POST')return response(await createProduct(await json(request,productCreateSchema)),201);method('GET, POST');
  }
  if(path[0]==='products'&&path.length===3&&path[2]==='duplicate'){
    if(verb!=='POST')method('POST');noQuery(request);
    const body=request.headers.get('content-type')?await json(request,duplicateSchema):{};
    return response(await duplicateProduct(path[1],body.version),201);
  }
  if(path[0]==='products'&&path.length===2){
    if(verb==='GET'){const q=viewQuerySchema.parse(query(request)),p=await getProductRecord(path[1],q.admin==='1');if(!p)fail(404,'NOT_FOUND','Product not found.');return response(p);}
    noQuery(request);if(verb==='PUT')return response(await updateProduct(path[1],await json(request,productUpdateSchema)));if(verb==='DELETE')return response(await deleteProduct(path[1],(await json(request,versionSchema)).version));method('GET, PUT, DELETE');
  }
  if(key==='categories'){
    if(verb==='GET'){const q=viewQuerySchema.parse(query(request));return response(await getCategories(q.admin==='1'));}
    noQuery(request);if(verb==='POST')return response(await createCategory(await json(request,categoryCreateSchema)),201);method('GET, POST');
  }
  if(path[0]==='categories'&&path.length===2){
    if(verb==='GET'){const q=viewQuerySchema.parse(query(request)),c=await getCategory(path[1],q.admin==='1');if(!c)fail(404,'NOT_FOUND','Category not found.');return response(c);}
    noQuery(request);if(verb==='PUT')return response(await updateCategory(path[1],await json(request,categoryUpdateSchema)));if(verb==='DELETE')return response(await deleteCategory(path[1],(await json(request,versionSchema)).version));method('GET, PUT, DELETE');
  }
  if(key==='content'){
    if(verb==='GET'){const q=viewQuerySchema.parse(query(request));return response(await getContent(q.admin==='1'));}noQuery(request);if(verb==='PUT')return response(await updateContent(await json(request,contentSchema)));method('GET, PUT');
  }
  if(key==='settings'){
    if(verb==='GET'){const q=viewQuerySchema.parse(query(request));return response(await getSettings(q.admin==='1'));}noQuery(request);if(verb==='PUT')return response(await updateSettings(await json(request,settingsSchema)));method('GET, PUT');
  }
  if(key==='admin/dashboard'||key==='dashboard'){if(verb!=='GET')method('GET');noQuery(request);return response(await dashboard());}
  if(key==='upload'){
    noQuery(request);if(verb==='POST'){const f=await uploadForm(request);return response(await uploadImage(f.bytes,f.mime,f.alt),201);}if(verb==='DELETE')return response(await deleteImage((await json(request,uploadDeleteSchema)).cloudinaryPublicId));method('POST, DELETE');
  }
  return response({error:{code:'NOT_FOUND',message:'Endpoint not found.'}},404);
}catch(e){if(e instanceof Error&&'allowed'in e&&typeof e.allowed==='string')return response({error:{code:'METHOD_NOT_ALLOWED',message:'Method not allowed.'}},405,{Allow:e.allowed});return errorResponse(e);}}
