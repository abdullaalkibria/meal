'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function AuthForm({mode}:{mode:'login'|'register'}){
 const [form,setForm]=useState({name:'',phone:'',password:''}); const [msg,setMsg]=useState(''); const router=useRouter();
 async function submit(e:any){e.preventDefault();setMsg('');const res=await fetch(`/api/auth/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const data=await res.json(); if(!res.ok){setMsg(data.error);return} if(mode==='login') router.push(data.role==='admin'?'/admin':'/dashboard'); else setMsg(data.message||'Registered');}
 return <form onSubmit={submit} className="card grid" style={{maxWidth:430,margin:'60px auto'}}><h1>{mode==='login'?'Login':'Register'}</h1>{mode==='register'&&<div><label>Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>}<div><label>Phone</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div><div><label>Password</label><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div><button className="btn">{mode==='login'?'Login':'Create account'}</button>{msg&&<p className={msg.includes('error')?'error':'muted'}>{msg}</p>}<a href={mode==='login'?'/register':'/login'}>{mode==='login'?'Create new account':'Already have account?'}</a></form>
}
