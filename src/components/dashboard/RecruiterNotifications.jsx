import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { FaBell, FaCheck, FaCheckCircle, FaCheckDouble, FaTimes, FaTimesCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { markNotificationsRead } from '../../firebase/notificationService';
import { useNotifications } from '../../context/NotificationContext';
import { decideVerification, recordNotificationAction } from '../../services/apiClient';
import Toast from '../shared/Toast';
import { resolveNotificationDeepLink } from '../../utils/notificationRouting';

const labels = {
  application: 'طلب توظيف جديد',
  document_uploaded: 'مستند جديد',
  rating_request: 'طلب تقييم',
  university_verification: 'تحقق جامعي',
  course_verification: 'تحقق مقرر'
};
const actionable = new Set(['rating_request','university_verification','course_verification']);

export default function RecruiterNotifications(){
  const { notifications, loading, unreadCount } = useNotifications();
  const [filter,setFilter]=useState('all');
  const [toast,setToast]=useState(null);
  const navigate=useNavigate();
  const notify=(message,type='success')=>{setToast({message,type});window.setTimeout(()=>setToast(null),3500)};
  const shown=useMemo(()=>notifications.filter(item=>filter==='all'||(filter==='unread'?item.read!==true:item.type===filter)),[notifications,filter]);

  const markRead=async item=>{
    if(item.read===true)return;
    await updateDoc(doc(db,'notifications',item.id),{read:true,readAt:serverTimestamp()});
  };
  const openNotification=async item=>{
    try{
      await markRead(item);
      const target=resolveNotificationDeepLink(item,'recruiter');
      if(target)navigate(target);
    }catch(error){notify('تعذر فتح الإشعار.','error')}
  };
  const markAll=async()=>{try{const count=await markNotificationsRead(notifications);notify(count?`تم تعليم ${count} إشعار كمقروء.`:'لا توجد إشعارات غير مقروءة.')}catch(error){notify('تعذر تعليم الإشعارات كمقروءة.','error')}};
  const act=async(item,decision)=>{
    try{
      if(decision==='accepted'&&item.type==='rating_request'){
        await recordNotificationAction(item.id,decision);
        navigate(`/recruiter-dashboard?section=ratings&requestId=${encodeURIComponent(item.id)}`);
        return;
      }
      if(['university_verification','course_verification'].includes(item.type)){
        if(!item.verificationId)throw new Error('Missing verification ID');
        await decideVerification(item.verificationId,decision);
      }
      await recordNotificationAction(item.id,decision);
      notify('تم تنفيذ الإجراء بنجاح.');
    }catch(error){notify('تعذر تنفيذ إجراء الإشعار.','error')}
  };
  const formatDate=value=>{const date=value?.toDate?value.toDate():new Date(value||0);return Number.isNaN(date.getTime())?'':date.toLocaleString('ar-EG')};

  if(loading)return <div className="py-16 text-center">جاري تحميل الإشعارات...</div>;
  return <div className="space-y-5" dir="rtl">
    <Toast message={toast?.message} type={toast?.type}/>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><FaBell className="text-primary-600"/><h2 className="text-2xl font-bold">الإشعارات</h2>{unreadCount>0&&<span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">{unreadCount}</span>}</div><button onClick={markAll} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><FaCheckDouble/>تعليم الكل كمقروء</button></div>
    <select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="all">كل الإشعارات</option><option value="unread">غير المقروءة</option><option value="application">طلبات التوظيف</option><option value="document_uploaded">المستندات الجديدة</option><option value="rating_request">طلبات التقييم</option><option value="university_verification">طلبات التحقق</option></select>
    {shown.length===0?<div className="rounded-2xl border bg-white p-10 text-center text-secondary-500">لا توجد إشعارات ضمن هذا الفلتر.</div>:shown.map(item=>{
      const businessStatus=item.businessStatus||item.status||'pending';
      return <article key={item.id} data-notification-type={item.type} onClick={()=>openNotification(item)} onKeyDown={event=>{if(event.key==='Enter')openNotification(item)}} role="button" tabIndex={0} className={`rounded-2xl border bg-white p-5 transition hover:border-primary-300 ${item.read===true?'opacity-80':'border-primary-200 shadow-soft'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-secondary-900">{item.title||labels[item.type]||'إشعار'}</h3>{item.read!==true&&<span className="rounded-full bg-primary-100 px-2 py-1 text-xs font-bold text-primary-800">جديد</span>}<span className="rounded-full bg-secondary-100 px-2 py-1 text-xs">{labels[item.type]||item.type}</span></div><p className="mt-2 text-sm text-secondary-700">{item.message}</p><p className="mt-2 text-xs text-secondary-400">{formatDate(item.createdAt)}</p>{resolveNotificationDeepLink(item,'recruiter')&&<p className="mt-2 text-xs font-semibold text-primary-700">اضغط لفتح العنصر المرتبط.</p>}</div>
        {actionable.has(item.type)&&<div className="flex gap-2" onClick={event=>event.stopPropagation()}>{businessStatus==='pending'?<><button onClick={()=>act(item,'accepted')} className="flex items-center gap-1 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white"><FaCheck/>قبول</button><button onClick={()=>act(item,'rejected')} className="flex items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white"><FaTimes/>رفض</button></>:<span className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${['accepted','resolved'].includes(businessStatus)?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>{['accepted','resolved'].includes(businessStatus)?<FaCheckCircle/>:<FaTimesCircle/>}{businessStatus==='resolved'?'مكتمل':businessStatus}</span>}</div>}
        </div>
      </article>;
    })}
  </div>;
}
