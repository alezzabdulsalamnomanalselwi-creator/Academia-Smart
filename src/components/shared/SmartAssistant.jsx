import React,{useEffect,useMemo,useRef,useState} from 'react';
import { FaRobot,FaTimes,FaPaperPlane,FaTrash,FaExternalLinkAlt,FaShieldAlt,FaCloud,FaCompass } from 'react-icons/fa';
import { auth,db } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection,doc,getDoc,getDocs,limit,query,where } from 'firebase/firestore';
import { useLocation,useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { getAssistantPageContext,getContextualQuickSuggestions,getLocalAssistantAnswer,getProactiveInsight,missingProfileFields,profileCompleteness,resolveAssistantRole,safeAssistantEntity } from './assistantKnowledge';
import { readAssistantMessages,writeAssistantMessages } from './assistantSession';

const welcome = 'مرحبًا، أنا Academia Smart Assistant. أسأل عن الصفحة الحالية أو الخطوة التالية، وسأبقى ضمن صلاحياتك.';
const entityCollection = { application: 'applications', document: 'documents', interview: 'interviews', rating: 'ratings', position: 'positions', job: 'positions' };
const entityBelongsToUser = (entity, role, uid) => {
  if (!entity || !uid) return false;
  if (role === 'lecturer') return [entity.userId, entity.applicantId, entity.candidateId, entity.lecturerId].includes(uid);
  if (role === 'recruiter') return entity.recruiterId === uid || entity.postedBy?.id === uid;
  return role === 'admin';
};
const initialMessages = owner => {
  const saved = readAssistantMessages(owner);
  return saved.length ? saved : [{ from: 'bot', text: welcome }];
};

export default function SmartAssistant(){
 const location=useLocation(),navigate=useNavigate(); const { unreadCount=0 }=useNotifications(); const { language }=useLanguage();
 const firstOwner=auth.currentUser?.uid||'anonymous';
 const [open,setOpen]=useState(false),[profile,setProfile]=useState(null),[role,setRole]=useState('common'),[owner,setOwner]=useState(firstOwner),[q,setQ]=useState(''),[busy,setBusy]=useState(false),[source,setSource]=useState('local'),[entity,setEntity]=useState(null),[workflow,setWorkflow]=useState({applications:[],interviews:[],documents:[],jobs:[]});
 const [messages,setMessages]=useState(()=>initialMessages(firstOwner)); const ownerRef=useRef(firstOwner);
 const page=useMemo(()=>getAssistantPageContext(location.pathname,location.search),[location.pathname,location.search]);

 useEffect(()=>onAuthStateChanged(auth,user=>{
   const nextOwner=user?.uid||'anonymous';
   if(ownerRef.current!==nextOwner){ ownerRef.current=nextOwner; setOwner(nextOwner); setMessages(initialMessages(nextOwner)); setEntity(null); setSource('local'); }
   if(!user){ setProfile(null); setRole('common'); return; }
   getDoc(doc(db,'users',user.uid)).then(snapshot=>{ const data=snapshot.exists()?snapshot.data():null; setProfile(data); setRole(resolveAssistantRole(data)); }).catch(()=>{ setProfile(null); setRole('common'); });
 }),[]);
 useEffect(()=>{ writeAssistantMessages(owner,messages); },[owner,messages]);
 useEffect(()=>{
   let active=true; const user=auth.currentUser; const collectionName=page.entity && entityCollection[page.entity.type];
   if(!user||!collectionName){ setEntity(null); return ()=>{active=false}; }
   getDoc(doc(db,collectionName,page.entity.id)).then(snapshot=>{
     if(!active||!snapshot.exists()) return setEntity(null);
     const data={id:snapshot.id,type:page.entity.type,...snapshot.data()};
     setEntity(entityBelongsToUser(data,role,user.uid)?safeAssistantEntity(data,role):null);
   }).catch(()=>active&&setEntity(null));
   return ()=>{active=false};
 },[page.entity,role]);
 useEffect(()=>{
   let active=true; const user=auth.currentUser; const lecturerScope=role==='lecturer'&&(page.key==='lecturer-dashboard'||page.key==='applications'); const recruiterScope=role==='recruiter'&&(page.key==='interviews'||page.key==='recruiter-dashboard');
   if(!user||(!lecturerScope&&!recruiterScope)){ setWorkflow({applications:[],interviews:[],documents:[],jobs:[]}); return ()=>{active=false}; }
   const read=async()=>{ try {
     if(recruiterScope){
       const [interviewsSnapshot, documentsSnapshot, jobsSnapshot] = await Promise.all([
         getDocs(query(collection(db,'interviews'),where('recruiterId','==',user.uid),limit(5))),
         getDocs(query(collection(db,'documents'),where('recruiterId','==',user.uid),limit(5))),
         getDocs(query(collection(db,'positions'),where('postedBy.id','==',user.uid),limit(5)))
       ]);
       const jobs=jobsSnapshot.docs.map(item=>safeAssistantEntity({id:item.id,type:'job',...item.data()},role)).filter(Boolean);
       const applicationSnapshots=await Promise.all(jobsSnapshot.docs.map(item=>getDocs(query(collection(db,'applications'),where('positionId','==',item.id),limit(5)))));
       if(active)setWorkflow({jobs,documents:documentsSnapshot.docs.map(item=>safeAssistantEntity({id:item.id,type:'document',...item.data()},role)).filter(Boolean),applications:applicationSnapshots.flatMap(snapshot=>snapshot.docs.map(item=>safeAssistantEntity({id:item.id,type:'application',...item.data()},role)).filter(Boolean)),interviews:interviewsSnapshot.docs.map(item=>safeAssistantEntity({id:item.id,type:'interview',...item.data()},role)).filter(Boolean)});
     }
     if(lecturerScope){ const snapshot=await getDocs(query(collection(db,'applications'),where('applicantId','==',user.uid),limit(5))); if(active)setWorkflow({applications:snapshot.docs.map(item=>safeAssistantEntity({id:item.id,type:'application',...item.data()},role)).filter(Boolean),interviews:[],documents:[],jobs:[]}); }
   } catch (_) { if(active)setWorkflow({applications:[],interviews:[],documents:[],jobs:[]}); } }; read(); return ()=>{active=false};
 },[role,page.key]);

 const context=useMemo(()=>({role,page,entity,workflow,unreadCount,language,profileCompleteness:profileCompleteness(profile),missingProfileFields:missingProfileFields(profile),permissions:Array.isArray(profile?.permissions)?profile.permissions.filter(item=>['reports.view','audit.view','requests.manage','users.manage'].includes(item)):[]}),[role,page,entity,workflow,unreadCount,profile,language]);
 const suggestions=useMemo(()=>getContextualQuickSuggestions(context),[context]);
 const insight=useMemo(()=>getProactiveInsight(context),[context]);
 const ask=async(raw=q)=>{
   const question=String(raw||'').trim(); if(!question||busy)return;
   setMessages(items=>[...items,{from:'user',text:question}]); setQ(''); setBusy(true);
   const local=getLocalAssistantAnswer({text:question,role,pathname:location.pathname,search:location.search,context});
   let answer=null; const endpoint=process.env.REACT_APP_AI_API_URL;
   if(endpoint){
     const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),7000);
     try {
       const cloudContext={role,page:{key:page.key,title:page.title},unreadCount:context.unreadCount,profileCompleteness:context.profileCompleteness,entity:entity?{type:entity.type,status:entity.status,title:entity.title,date:entity.date,matchScore:role==='recruiter'?entity.matchScore:null}:null};
       const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:'assistant-help',question,context:cloudContext,guardrails:['no-rbac-bypass','no-autonomous-actions','no-hiring-decision']}),signal:controller.signal});
       const data=response.ok?await response.json():null;
       if(typeof data?.answer==='string'&&data.answer.trim().length>2){ answer={a:data.answer.trim().slice(0,1600),to:typeof data.to==='string'&&data.to.startsWith('/')?data.to:undefined}; setSource('cloud'); }
     } catch (_) { setSource('local'); } finally { clearTimeout(timer); }
   }
   const result=answer||local; if(!answer)setSource('local');
   setMessages(items=>[...items,{from:'bot',text:result.a,to:result.to}]); setBusy(false);
 };
 const clear=()=>setMessages([{from:'bot',text:'تم مسح هذه المحادثة لهذه الجلسة فقط. كيف أساعدك؟'}]);
 const roleLabel={admin:'Super Admin',limitedAdmin:'Limited Admin',recruiter:'Recruiter',lecturer:'Lecturer',common:'Guest'}[role];
 return <>
  <button type="button" onClick={()=>setOpen(value=>!value)} className="smart-assistant-launcher fixed bottom-5 left-5 z-50 h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-600 to-teal-500 text-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform" title="المساعد الأكاديمي الذكي" aria-label={open?'إغلاق المساعد الأكاديمي الذكي':'فتح المساعد الأكاديمي الذكي'} aria-expanded={open}><FaRobot className="text-2xl"/><span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-400"/></button>
  {open&&<section dir={language==='ar'?'rtl':'ltr'} role="dialog" aria-label={language==='ar'?'المساعد الأكاديمي الذكي':'Academia Smart Assistant'} className="smart-assistant-panel fixed bottom-24 left-3 sm:left-5 z-50 w-[calc(100vw-24px)] sm:w-[410px] max-h-[76vh] bg-white border border-secondary-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
    <header className="bg-gradient-to-l from-primary-900 via-primary-800 to-primary-700 text-white p-4 flex justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><span className="h-10 w-10 shrink-0 rounded-xl bg-white/10 grid place-items-center"><FaRobot className="text-xl"/></span><div className="min-w-0"><b className="block">المساعد الأكاديمي الذكي</b><div className="text-xs text-blue-100 flex items-center gap-1">{source==='cloud'?<FaCloud/>:<FaShieldAlt/>}{source==='cloud'?'AI Cloud':'Smart Local'} • آمن حسب الدور</div><div className="mt-1 flex flex-wrap gap-1"><span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{roleLabel}</span><span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{page.title}</span></div></div></div><div className="flex gap-1"><button type="button" onClick={clear} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/10" aria-label="مسح المحادثة"><FaTrash/></button><button type="button" onClick={()=>setOpen(false)} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/10" aria-label="إغلاق"><FaTimes/></button></div></header>
    <div className="px-4 py-2.5 text-xs bg-cyan-50 text-cyan-900 border-b border-cyan-100 flex gap-2"><FaCompass className="mt-0.5 shrink-0"/><span>{page.hint}</span></div>
    {insight&&<div className="mx-3 mt-3 rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-900">{insight}</div>}
    <div className="p-4 overflow-y-auto space-y-3 bg-gradient-to-b from-secondary-50 to-white flex-1" aria-live="polite">{messages.map((m,i)=><div key={i} className={`p-3.5 rounded-2xl text-sm leading-6 max-w-[92%] whitespace-pre-line shadow-sm ${m.from==='user'?'mr-auto bg-primary-600 text-white rounded-bl-md':'ml-auto bg-white border border-secondary-200 rounded-br-md'}`}>{m.text}{m.to&&<button type="button" onClick={()=>{navigate(m.to);setOpen(false)}} className="mt-2 flex items-center gap-2 text-primary-700 font-semibold"><FaExternalLinkAlt/> الانتقال للصفحة</button>}</div>)}{busy&&<div className="ml-auto bg-white border border-secondary-200 p-3 rounded-2xl text-sm flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse"/><span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse [animation-delay:150ms]"/><span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse [animation-delay:300ms]"/> جاري تجهيز الإجابة...</div>}</div>
    <div className="px-3 py-2.5 flex flex-wrap gap-2 border-t border-secondary-100 bg-white">{suggestions.slice(0,4).map(item=><button type="button" key={item} onClick={()=>ask(item)} className="text-xs border border-secondary-200 rounded-full px-3 py-1.5 hover:bg-primary-50 hover:border-primary-200 transition-colors">{item}</button>)}</div>
    <div className="p-3 border-t border-secondary-100 flex gap-2 bg-white"><label className="sr-only" htmlFor="assistant-question">اكتب سؤالك</label><input id="assistant-question" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()} placeholder="اسأل عن الصفحة أو الإجراء..." className="min-w-0 flex-1 border border-secondary-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:outline-none"/><button type="button" aria-label="إرسال السؤال" disabled={busy||!q.trim()} onClick={()=>ask()} className="bg-primary-600 text-white p-3 rounded-xl disabled:opacity-50"><FaPaperPlane/></button></div>
  </section>}
 </>;
}
