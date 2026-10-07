'use client';
export default function GlobalError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <html lang="en"><body style={{background:'#fbf2e7',color:'#943e2b',fontFamily:'Georgia,serif',padding:40}}><h1>We’ll be back shortly.</h1><p>The shop could not be loaded. Please try again.</p><button onClick={reset}>Try again</button></body></html>;}
