import React, { useMemo, useState } from 'react';
import { FaPaperPlane, FaStar, FaUser } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';
import { recordNotificationAction, submitRating } from '../../services/apiClient';
import { useNotifications } from '../../context/NotificationContext';

export default function SendRatings() {
  const [searchParams] = useSearchParams();
  const { notifications, loading } = useNotifications();
  const [selectedId, setSelectedId] = useState(searchParams.get('requestId') || '');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const requests = useMemo(() => notifications.filter(item => item.type === 'rating_request'), [notifications]);
  const selected = requests.find(item => item.id === selectedId) || null;
  const status = selected?.businessStatus || selected?.status || 'pending';

  const accept = async () => {
    setSaving(true);
    try {
      await recordNotificationAction(selected.id, 'accepted');
      setMessage({ type: 'success', text: 'تم قبول طلب التقييم. يمكنك الآن تسجيل النتيجة.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally { setSaving(false); }
  };

  const submit = async event => {
    event.preventDefault();
    if (!selected || !rating || !comment.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await submitRating(selected.id, rating, comment);
      setMessage({ type: 'success', text: 'تم حفظ التقييم وإشعار المحاضر بنجاح.' });
      setRating(0);
      setComment('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="py-16 text-center">جاري تحميل طلبات التقييم...</div>;
  return <div dir="rtl" className="space-y-6">
    <div><h2 className="text-2xl font-bold">تقييم المحاضرين بعد المقابلة</h2><p className="mt-2 text-sm text-secondary-600">اختر طلبًا مرتبطًا بمقابلة مكتملة. يُسمح بتقييم واحد فقط لكل مقابلة.</p></div>
    {message && <div className={`rounded-xl p-3 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{message.text}</div>}
    <label className="block text-sm font-semibold">طلب التقييم
      <select value={selectedId} onChange={event => setSelectedId(event.target.value)} className="mt-2 w-full rounded-xl border p-3">
        <option value="">اختر طلبًا</option>
        {requests.map(item => <option key={item.id} value={item.id}>{item.sender?.name || 'محاضر'} — {item.positionTitle || 'الوظيفة'} — {item.businessStatus || item.status}</option>)}
      </select>
    </label>
    {!selected ? <div className="rounded-2xl border bg-white p-10 text-center text-secondary-500">لا يوجد طلب تقييم محدد.</div> : <section data-rating-request-id={selected.id} className="rounded-2xl border bg-white p-6">
      <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-primary-100 p-3"><FaUser className="text-primary-700"/></div><div><b>{selected.sender?.name || 'المحاضر'}</b><p className="text-sm text-secondary-600">{selected.positionTitle || 'التقييم بعد المقابلة'}</p></div></div>
      {status === 'pending' ? <button onClick={accept} disabled={saving} className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white">قبول الطلب وبدء التقييم</button> : status === 'resolved' ? <p className="rounded-xl bg-green-50 p-4 font-semibold text-green-700">تم إكمال هذا الطلب وتسجيل التقييم.</p> : <form onSubmit={submit} noValidate className="space-y-5">
        <div><span className="text-sm font-semibold">الدرجة (1–5)</span><div className="mt-2 flex gap-2">{[1,2,3,4,5].map(star => <button key={star} type="button" aria-label={`تقييم ${star}`} onClick={() => setRating(star)}><FaStar className={`h-9 w-9 ${star <= rating ? 'text-amber-400' : 'text-secondary-200'}`}/></button>)}</div></div>
        <label className="block text-sm font-semibold">تعليق مهني<textarea value={comment} onChange={event => setComment(event.target.value)} rows="4" className="mt-2 w-full rounded-xl border p-3" placeholder="اكتب ملاحظة مهنية غير حساسة"/></label>
        <button disabled={saving || !rating || !comment.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 font-bold text-white disabled:opacity-50"><FaPaperPlane/>{saving ? 'جاري الحفظ...' : 'إرسال التقييم'}</button>
      </form>}
    </section>}
  </div>;
}
