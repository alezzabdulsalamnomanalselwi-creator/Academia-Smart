import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { FaCalendar, FaClock, FaMapMarkerAlt, FaVideo } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { interviewStatusLabel } from '../../utils/interviewScheduling';

export default function LecturerInterviews(){
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [searchParams]=useSearchParams();
  const targetId=searchParams.get('interviewId');
  useEffect(()=>{(async()=>{try{const uid=auth.currentUser?.uid;if(!uid)return;const snap=await getDocs(query(collection(db,'interviews'),where('candidateId','==',uid)));setItems(snap.docs.map(item=>({id:item.id,...item.data()})).sort((a,b)=>new Date(b.scheduledAt||0)-new Date(a.scheduledAt||0)))}catch(err){console.error(err);setError('تعذر تحميل المقابلات.')}finally{setLoading(false)}})()},[]);
  if(loading)return <div className="py-16 text-center">جاري تحميل المقابلات...</div>;
  return <div dir="rtl" className="space-y-5"><div className="flex items-center gap-3"><FaCalendar className="text-primary-600"/><h2 className="text-2xl font-bold">مقابلاتي</h2></div>{error&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}{items.length===0?<div className="rounded-2xl border bg-white p-10 text-center text-secondary-500">لا توجد مقابلات مجدولة.</div>:items.map(item=><article key={item.id} data-interview-id={item.id} className={`rounded-2xl border bg-white p-6 shadow-soft ${item.id===targetId?'border-primary-500 ring-2 ring-primary-200':'border-secondary-100'}`}><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-bold">{item.positionTitle||'وظيفة غير محددة'}</h3><p className="mt-2 text-sm"><FaClock className="inline ml-1"/>{item.date} — {item.time}</p><p className="mt-2 text-sm">{item.type==='online'?<><FaVideo className="inline ml-1"/>عبر الإنترنت: <a className="font-semibold text-primary-700 underline" href={item.location} target="_blank" rel="noopener noreferrer">فتح رابط الاجتماع</a></>:<><FaMapMarkerAlt className="inline ml-1"/>حضورية: {item.location}</>}</p></div><span className="rounded-full bg-secondary-100 px-3 py-1 text-sm font-bold">{interviewStatusLabel(item.status)}</span></div>{item.id===targetId&&<p className="mt-4 text-sm font-semibold text-primary-700">تم فتح المقابلة المحددة من الإشعار.</p>}</article>)}</div>;
}
