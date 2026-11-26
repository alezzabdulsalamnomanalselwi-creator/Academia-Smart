import React,{useMemo,useState} from 'react';
import {doc,serverTimestamp,updateDoc} from 'firebase/firestore';
import {FaBell,FaCheckDouble} from 'react-icons/fa';
import {useNavigate} from 'react-router-dom';
import {db} from '../../firebase/config';
import {markNotificationsRead} from '../../firebase/notificationService';
import {useNotifications} from '../../context/NotificationContext';
import Toast from '../shared/Toast';
import {resolveNotificationDeepLink} from '../../utils/notificationRouting';

const labels={new_position:'وظيفة جديدة',application_status:'حالة طلب التوظيف',document_review:'نتيجة مراجعة مستند',document_approved:'مستند معتمد',document_rejected:'مستند مرفوض',interview:'مقابلة',interview_status:'حالة المقابلة',interview_rescheduled:'إعادة جدولة مقابلة',rating_received:'تقييم',recruiter_interest:'اهتمام مسؤول توظيف'};

export default function LecturerNotifications(){
 const {notifications,loading,unreadCount}=useNotifications();
 const [filter,setFilter]=useState('all'),[toast,setToast]=useState(null);
 const navigate=useNavigate();
 const notify=(message,type='success')=>{setToast({message,type});window.setTimeout(()=>setToast(null),3500)};
 const shown=useMemo(()=>notifications.filter(item=>filter==='all'||(filter==='unread'?item.read!==true:item.type===filter)),[notifications,filter]);
 const openNotification=async item=>{try{if(item.read!==true)await updateDoc(doc(db,'notifications',item.id),{read:true,readAt:serverTimestamp()});const target=resolveNotificationDeepLink(item,'lecturer');if(target)navigate(target)}catch(error){notify('تعذر فتح الإشعار.','error')}};
 const markAll=async()=>{try{const count=await markNotificationsRead(notifications);notify(count?`تم تعليم ${count} إشعار كمقروء.`:'لا توجد إشعارات غير مقروءة.')}catch(error){notify('تعذر تعليم الإشعارات كمقروءة.','error')}};
 const formatDate=value=>{const date=value?.toDate?value.toDate():new Date(value||0);return Number.isNaN(date.getTime())?'':date.toLocaleString('ar-EG')};
 if(loading)return <div className="py-16 text-center">جاري تحميل الإشعارات...</div>;
 return <div className="space-y-5" dir="rtl"><Toast message={toast?.message} type={toast?.type}/>
  <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><FaBell className="text-primary-600"/><h2 className="text-2xl font-bold">الإشعارات والتنبيهات</h2>{unreadCount>0&&<span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">{unreadCount}</span>}</div><button onClick={markAll} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><FaCheckDouble/>تعليم الكل كمقروء</button></div>
  <select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="all">كل الإشعارات</option><option value="unread">غير المقروءة</option><option value="new_position">الوظائف</option><option value="application_status">طلبات التوظيف</option><option value="document_approved">المستندات المعتمدة</option><option value="document_rejected">المستندات المرفوضة</option><option value="interview">موعد مقابلة</option><option value="interview_rescheduled">إعادة جدولة مقابلة</option><option value="interview_status">حالة مقابلة</option><option value="rating_received">التقييمات</option></select>
  {shown.length===0?<div className="rounded-2xl border bg-white p-10 text-center text-secondary-500">لا توجد إشعارات ضمن هذا الفلتر.</div>:shown.map(item=>{const reviewStatus=item.reviewStatus||item.businessStatus||item.status;return <article key={item.id} data-notification-type={item.type} onClick={()=>openNotification(item)} onKeyDown={event=>{if(event.key==='Enter')openNotification(item)}} role="button" tabIndex={0} className={`rounded-2xl border bg-white p-5 transition hover:border-primary-300 ${item.read===true?'opacity-80':'border-primary-200 shadow-soft'}`}><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.title||labels[item.type]||'إشعار'}</h3>{item.read!==true&&<span className="rounded-full bg-primary-100 px-2 py-1 text-xs font-bold text-primary-800">جديد</span>}<span className="rounded-full bg-secondary-100 px-2 py-1 text-xs">{labels[item.type]||item.type}</span>{reviewStatus&&['approved','rejected'].includes(reviewStatus)&&<span className={`rounded-full px-2 py-1 text-xs font-bold ${reviewStatus==='approved'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{reviewStatus==='approved'?'تمت الموافقة':'مرفوض'}</span>}</div><p className="mt-2 text-sm text-secondary-700">{item.message}</p>{item.comments&&<p className="mt-2 rounded-lg bg-secondary-50 p-3 text-sm"><b>ملاحظة المراجع:</b> {item.comments}</p>}<p className="mt-2 text-xs text-secondary-400">{formatDate(item.createdAt)}</p>{resolveNotificationDeepLink(item,'lecturer')&&<p className="mt-2 text-xs font-semibold text-primary-700">اضغط لفتح العنصر المرتبط.</p>}</article>})}
 </div>;
}
