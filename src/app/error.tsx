'use client';
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <div className="container page"><h1>We couldn’t load this page.</h1><p>Please try again in a moment.</p><button className="btn" onClick={reset}>Try again</button></div>;}
