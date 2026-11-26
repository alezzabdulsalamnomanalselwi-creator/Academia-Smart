import React, { useEffect, useMemo, useState } from 'react';
import { FaPaperPlane, FaStar } from 'react-icons/fa';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { createRatingRequest } from '../../services/apiClient';

const formatDate = value => {
  const date = value?.toDate ? value.toDate() : new Date(value || 0);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ar-EG');
};

export default function RequestRatings() {
  const [searchParams] = useSearchParams();
  const [interviews, setInterviews] = useState([]);
  const [requests, setRequests] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const highlightedRatingId = searchParams.get('ratingId') || '';

  const load = async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const [interviewSnap, requestSnap, ratingSnap] = await Promise.all([
        getDocs(query(collection(db, 'interviews'), where('candidateId', '==', uid))),
        getDocs(query(collection(db, 'notifications'), where('sender.id', '==', uid))),
        getDocs(query(collection(db, 'ratings'), where('lecturerId', '==', uid)))
      ]);
      setInterviews(interviewSnap.docs.map(item => ({ id: item.id, ...item.data() })));
      setRequests(requestSnap.docs.map(item => ({ id: item.id, ...item.data() })).filter(item => item.type === 'rating_request'));
      setRatings(ratingSnap.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (b.ratedAt?.seconds || 0) - (a.ratedAt?.seconds || 0)));
    } catch (error) {
      setMessage({ type: 'error', text: 'تعذر تحميل طلبات ونتائج التقييم.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const requestedInterviewIds = useMemo(() => new Set(requests.map(item => item.interviewId)), [requests]);
  const eligible = useMemo(() => interviews.filter(item => item.status === 'completed' && !requestedInterviewIds.has(item.id)), [interviews, requestedInterviewIds]);

  const submit = async event => {
    event.preventDefault();
    if (!selectedInterview) return;
    setSaving(true);
    setMessage(null);
    try {
      await createRatingRequest(selectedInterview);
      setSelectedInterview('');
      setMessage({ type: 'success', text: 'تم إرسال طلب التقييم لمسؤول التوظيف المرتبط بالمقابلة.' });
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: error.code === 'DUPLICATE_RATING_REQUEST' ? 'تم إرسال طلب تقييم لهذه المقابلة مسبقًا.' : error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-16 text-center">جاري تحميل التقييمات...</div>;
  return <div dir="rtl" className="space-y-7">
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-2xl font-bold">طلب تقييم بعد المقابلة</h2>
      <p className="mt-2 text-sm text-secondary-600">يمكن إرسال طلب واحد فقط لكل مقابلة مكتملة، ويُرسل تلقائيًا لمسؤول التوظيف المرتبط بها.</p>
      {message && <div className={`mt-4 rounded-xl p-3 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{message.text}</div>}
      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        <label className="block text-sm font-semibold">المقابلة المكتملة
          <select value={selectedInterview} onChange={event => setSelectedInterview(event.target.value)} className="mt-2 w-full rounded-xl border p-3">
            <option value="">اختر مقابلة</option>
            {eligible.map(item => <option key={item.id} value={item.id}>{item.positionTitle || 'الوظيفة'} — {item.date || ''}</option>)}
          </select>
        </label>
        {eligible.length === 0 && <p className="text-sm text-secondary-500">لا توجد مقابلة مكتملة جديدة متاحة لطلب تقييم.</p>}
        <button disabled={saving || !selectedInterview} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white disabled:opacity-50"><FaPaperPlane/>{saving ? 'جاري الإرسال...' : 'إرسال طلب التقييم'}</button>
      </form>
    </section>

    <section className="rounded-2xl border bg-white p-6">
      <h3 className="text-xl font-bold">نتائج التقييم</h3>
      {ratings.length === 0 ? <p className="py-8 text-center text-secondary-500">لا توجد نتائج تقييم بعد.</p> : <div className="mt-4 space-y-3">{ratings.map(item => <article key={item.id} data-rating-id={item.id} className={`rounded-xl border p-4 ${highlightedRatingId === item.id ? 'border-primary-500 ring-2 ring-primary-100' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><b>{item.positionTitle || 'التقييم بعد المقابلة'}</b><p className="text-sm text-secondary-600">بواسطة {item.recruiterName || 'مسؤول التوظيف'}</p></div><div className="flex items-center gap-2 font-bold text-amber-600"><FaStar/> {item.rating}/5</div></div>
        <p className="mt-3 rounded-lg bg-secondary-50 p-3 text-sm">{item.comment || item.feedback}</p>
        <p className="mt-2 text-xs text-secondary-400">{formatDate(item.ratedAt || item.createdAt)} — مكتمل</p>
      </article>)}</div>}
    </section>
  </div>;
}
