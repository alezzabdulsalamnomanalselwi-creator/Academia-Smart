import React, { useEffect, useMemo, useState } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, addDoc, getDocs, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { FaSpinner, FaBriefcase, FaFilePdf, FaPrint, FaSearch } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import Toast from '../shared/Toast';
import { createNotificationOnce } from '../../firebase/notificationService';

const PostPosition = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: '',
    institution: '',
    universityId: '',
    collegeId: '',
    departmentId: '',
    subjectId: '',
    college: '',
    department: '',
    subject: '',
    subjectCode: '',
    type: 'Full-time',
    description: '',
    requirements: '',
    deadline: '',
    contactEmail: '',
    status: 'open'
  });

  const [universities, setUniversities] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const subscriptions = [
      onSnapshot(collection(db, 'universities'), snap => setUniversities(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'colleges'), snap => setColleges(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'departments'), snap => setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'subjects'), snap => setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    ];
    return () => subscriptions.forEach(unsubscribe => unsubscribe());
  }, []);

  const activeUniversities = useMemo(() => universities.filter(x => x.active !== false), [universities]);
  const availableColleges = useMemo(() => colleges.filter(x => x.active !== false && x.universityId === formData.universityId), [colleges, formData.universityId]);
  const availableDepartments = useMemo(() => departments.filter(x => x.active !== false && x.collegeId === formData.collegeId), [departments, formData.collegeId]);
  const availableSubjects = useMemo(() => subjects.filter(x => x.active !== false && x.departmentId === formData.departmentId), [subjects, formData.departmentId]);

  const [loading, setLoading] = useState(false);
  const [aiBusy,setAiBusy]=useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [myPositions, setMyPositions] = useState([]);
  const [applicationCounts, setApplicationCounts] = useState({});
  const [positionFilter, setPositionFilter] = useState('all');
  const [positionSearch, setPositionSearch] = useState('');
  const showToast=(message,type='success')=>{setToast({message,type});window.setTimeout(()=>setToast({message:'',type:'success'}),4000);};

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return undefined;
    const q = query(collection(db, 'positions'), where('postedBy.id', '==', user.uid));
    return onSnapshot(q, snap => setMyPositions(snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b)=>String(b.postedDate||'').localeCompare(String(a.postedDate||'')))), () => setMyPositions([]));
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return undefined;
    const q = query(collection(db, 'applications'), where('recruiterId', '==', user.uid));
    return onSnapshot(q, snap => {
      const counts = snap.docs.reduce((result, item) => {
        const positionId = item.data().positionId;
        if (positionId) result[positionId] = (result[positionId] || 0) + 1;
        return result;
      }, {});
      setApplicationCounts(counts);
    }, () => setApplicationCounts({}));
  }, []);

  const statusLabel={open:'منشورة',draft:'مسودة',paused:'موقوفة',closed:'مغلقة',archived:'مؤرشفة'};
  const shownPositions=useMemo(()=>myPositions.filter(p=>(positionFilter==='all'||(p.status||'open')===positionFilter)&&`${p.title||''} ${p.institution||''} ${p.college||''} ${p.department||''} ${p.subject||''}`.toLowerCase().includes(positionSearch.toLowerCase())),[myPositions,positionFilter,positionSearch]);
  const reportHtml=()=>{const u=auth.currentUser;const now=new Date().toLocaleString('ar-YE');const rows=shownPositions.map((p,i)=>`<tr><td>${i+1}</td><td>${p.title||'-'}</td><td>${p.institution||'-'}</td><td>${p.college||'-'}</td><td>${p.department||'-'}</td><td>${p.subject||'-'} ${p.subjectCode?`(${p.subjectCode})`:''}</td><td>${statusLabel[p.status||'open']||p.status||'-'}</td><td>${applicationCounts[p.id]||0}</td><td>${p.deadline||'-'}</td></tr>`).join('');return `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>تقرير الوظائف</title><style>body{font-family:Arial,Tahoma,sans-serif;margin:28px;color:#172033}header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #2563eb;padding-bottom:14px;margin-bottom:18px}.brand{display:flex;gap:12px;align-items:center}.brand img{width:58px;height:58px;object-fit:contain}.meta{font-size:12px;line-height:1.8}h1{font-size:21px;margin:0}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:right}th{background:#eff6ff}.summary{display:flex;gap:12px;margin:14px 0;font-size:12px}.summary span{border:1px solid #dbeafe;border-radius:8px;padding:7px 10px}footer{margin-top:18px;border-top:1px solid #ddd;padding-top:8px;font-size:10px;color:#64748b}@page{size:A4 landscape;margin:12mm}@media print{button{display:none}}</style></head><body><header><div class="brand"><img src="${window.location.origin}/logo.png"><div><h1>Academia Smart</h1><b>تقرير الوظائف التي أنشأتها</b></div></div><div class="meta"><b>صاحب الحساب:</b> ${u?.displayName||'مسؤول التوظيف'}<br><b>البريد:</b> ${u?.email||'-'}<br><b>تاريخ ووقت الطباعة:</b> ${now}<br><b>الفلتر:</b> ${positionFilter==='all'?'كل الحالات':statusLabel[positionFilter]}</div></header><div class="summary"><span>إجمالي النتائج: <b>${shownPositions.length}</b></span><span>المنشورة: <b>${shownPositions.filter(x=>(x.status||'open')==='open').length}</b></span><span>إجمالي المتقدمين: <b>${shownPositions.reduce((n,x)=>n+(applicationCounts[x.id]||0),0)}</b></span></div><table><thead><tr><th>#</th><th>المسمى</th><th>الجامعة</th><th>الكلية</th><th>القسم</th><th>المادة</th><th>الحالة</th><th>المتقدمون</th><th>آخر موعد</th></tr></thead><tbody>${rows||'<tr><td colspan="9">لا توجد بيانات</td></tr>'}</tbody></table><footer>تم إنشاء هذا التقرير إلكترونيًا بواسطة Academia Smart — يمكن اختيار “Save as PDF / حفظ كملف PDF” من نافذة الطباعة.</footer><script>window.onload=()=>setTimeout(()=>window.print(),350)</script></body></html>`};
  const printReport=()=>{const w=window.open('','_blank','width=1200,height=800');if(!w)return showToast('اسمح بالنوافذ المنبثقة لإنشاء التقرير.','error');w.document.open();w.document.write(reportHtml());w.document.close();};

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'universityId') {
      const item = universities.find(x => x.id === value);
      setFormData(prev => ({ ...prev, universityId: value, institution: item?.name || '', collegeId: '', college: '', departmentId: '', department: '', subjectId: '', subject: '', subjectCode: '' }));
      return;
    }
    if (name === 'collegeId') {
      const item = colleges.find(x => x.id === value);
      setFormData(prev => ({ ...prev, collegeId: value, college: item?.name || '', departmentId: '', department: '', subjectId: '', subject: '', subjectCode: '' }));
      return;
    }
    if (name === 'departmentId') {
      const item = departments.find(x => x.id === value);
      setFormData(prev => ({ ...prev, departmentId: value, department: item?.name || '', subjectId: '', subject: '', subjectCode: '' }));
      return;
    }
    if (name === 'subjectId') {
      const item = subjects.find(x => x.id === value);
      setFormData(prev => ({ ...prev, subjectId: value, subject: item?.name || '', subjectCode: item?.code || '' }));
      return;
    }

    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const suggestJobContent = async () => {
    if (!formData.title.trim() || !formData.subject) return showToast('أدخل المسمى واختر المادة أولاً.', 'error');
    setAiBusy(true);
    const local = {
      description:`تدريس مادة ${formData.subject}${formData.subjectCode?` (${formData.subjectCode})`:''}، إعداد المحاضرات والأنشطة، متابعة تعلم الطلاب، والمشاركة في الأعمال الأكاديمية للقسم.`,
      requirements:`مؤهل أكاديمي مناسب في ${formData.department||'التخصص المطلوب'}، خبرة تدريسية أو عملية مرتبطة بالمادة، مهارات تواصل وعرض جيدة، والقدرة على استخدام أدوات التعليم الحديثة.`
    };
    try{
      const endpoint=process.env.REACT_APP_AI_API_URL;
      if(endpoint){const c=new AbortController();const timer=setTimeout(()=>c.abort(),7000);const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:'job-description',position:formData}),signal:c.signal});clearTimeout(timer);if(r.ok){const d=await r.json();if(d?.description&&d?.requirements){setFormData(x=>({...x,description:d.description,requirements:d.requirements}));showToast('تم إنشاء اقتراح AI ويمكنك تعديله قبل النشر.');setAiBusy(false);return;}}}
      setFormData(x=>({...x,...local}));showToast('تم استخدام الاقتراح المحلي الاحتياطي ويمكنك تعديله.');
    }catch(e){setFormData(x=>({...x,...local}));showToast('تعذر AI السحابي؛ تم استخدام الاقتراح المحلي.','warning')}finally{setAiBusy(false)}
  };

  const savePosition = async (e, requestedStatus='open') => {
    e?.preventDefault?.();
    const formElement = e?.currentTarget?.tagName === 'FORM' ? e.currentTarget : e?.currentTarget?.form;
    const submittedFields = formElement ? Object.fromEntries(new FormData(formElement).entries()) : {};
    const effectiveFormData = { ...formData, ...submittedFields };
    if (requestedStatus === 'open' && (!effectiveFormData.title || !effectiveFormData.universityId || !effectiveFormData.collegeId || !effectiveFormData.departmentId || !effectiveFormData.subjectId || !effectiveFormData.deadline || !effectiveFormData.contactEmail || !effectiveFormData.description || !effectiveFormData.requirements)) {
      return showToast('أكمل جميع الحقول المطلوبة قبل النشر.', 'error');
    }
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');
      const position = {...effectiveFormData,status:requestedStatus,postedBy:{id:currentUser.uid,email:currentUser.email,name:currentUser.displayName||'مسؤول التوظيف'},postedDate:new Date().toISOString(),applications:0,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
      const positionRef = await addDoc(collection(db, 'positions'), position);
      if(requestedStatus==='open'){
        const lecturerSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'lecturer')));
        const relevantLecturers = lecturerSnap.docs.filter(d => {const u=d.data();if(['blocked','suspended'].includes(u.accountStatus))return false;const deptMatch=!effectiveFormData.departmentId||u.departmentId===effectiveFormData.departmentId||u.department===effectiveFormData.department;const subjectMatch=!effectiveFormData.subjectId||(Array.isArray(u.subjectIds)&&u.subjectIds.includes(effectiveFormData.subjectId))||(Array.isArray(u.teachingExperience)&&u.teachingExperience.some(e=>e.subjectId===effectiveFormData.subjectId||e.subject===effectiveFormData.subject||e.course===effectiveFormData.subject));return deptMatch||subjectMatch;});
        await Promise.all(relevantLecturers.map(d=>createNotificationOnce({type:'new_position',title:'وظيفة أكاديمية جديدة',message:`تم نشر وظيفة جديدة: ${effectiveFormData.title}${effectiveFormData.subject?` — ${effectiveFormData.subject}${effectiveFormData.subjectCode?` (${effectiveFormData.subjectCode})`:''}`:''}`,receiver:{id:d.id,email:d.data().email||'',name:`${d.data().firstName||''} ${d.data().lastName||''}`.trim()},sender:{id:currentUser.uid,email:currentUser.email||'',name:currentUser.displayName||'مسؤول التوظيف'},userId:d.id,positionId:positionRef.id,deepLink:`/lecturer-dashboard?section=positions&positionId=${positionRef.id}`},`new_position:${positionRef.id}:${d.id}`)));
      }
      setFormData({title:'',institution:'',universityId:'',collegeId:'',departmentId:'',subjectId:'',college:'',department:'',subject:'',subjectCode:'',type:'Full-time',description:'',requirements:'',deadline:'',contactEmail:'',status:'open'});
      showToast(requestedStatus==='draft'?'تم حفظ الوظيفة كمسودة.':t('postPosition.successMsg'));
    } catch (error) { console.error('Error posting position:', error); showToast(t('postPosition.errorMsg'), 'error'); } finally { setLoading(false); }
  };

  const handleSubmit = (e) => savePosition(e,'open');

  return (
    <div className="space-y-8 max-w-4xl mx-auto"><Toast message={toast.message} type={toast.type} onClose={()=>setToast({message:'',type:'success'})}/>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl shadow-soft">
          <FaBriefcase className="h-6 w-6 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-br from-secondary-900 to-primary-700 bg-clip-text text-transparent">
          {t('postPosition.title')}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white/70 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-secondary-100 shadow-soft">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-secondary-900 mb-2">
              {t('postPosition.positionTitleLabel')}
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border border-secondary-200 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm"
              placeholder={t('postPosition.positionTitlePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-secondary-900 mb-2">الجامعة / المؤسسة التعليمية*</label>
            <select name="universityId" value={formData.universityId} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-secondary-200 bg-white/50 focus:ring-2 focus:ring-primary-500 text-sm font-medium">
              <option value="">اختر الجامعة</option>
              {activeUniversities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-secondary-900 mb-2">الكلية*</label>
            <select name="collegeId" value={formData.collegeId} onChange={handleChange} required disabled={!formData.universityId} className="w-full px-4 py-3 rounded-xl border border-secondary-200 bg-white/50 focus:ring-2 focus:ring-primary-500 text-sm font-medium disabled:bg-secondary-50 disabled:text-secondary-400">
              <option value="">{formData.universityId ? 'اختر الكلية' : 'اختر الجامعة أولاً'}</option>
              {availableColleges.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-secondary-900 mb-2">القسم الأكاديمي*</label>
            <select name="departmentId" value={formData.departmentId} onChange={handleChange} required disabled={!formData.collegeId} className="w-full px-4 py-3 rounded-xl border border-secondary-200 bg-white/50 focus:ring-2 focus:ring-primary-500 text-sm font-medium disabled:bg-secondary-50 disabled:text-secondary-400">
              <option value="">{formData.collegeId ? 'اختر القسم' : 'اختر الكلية أولاً'}</option>
              {availableDepartments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-secondary-900 mb-2">المادة*</label>
            <select name="subjectId" value={formData.subjectId} onChange={handleChange} required disabled={!formData.departmentId} className="w-full px-4 py-3 rounded-xl border border-secondary-200 bg-white/50 focus:ring-2 focus:ring-primary-500 text-sm font-medium disabled:bg-secondary-50 disabled:text-secondary-400">
              <option value="">{formData.departmentId ? 'اختر المادة' : 'اختر القسم أولاً'}</option>
              {availableSubjects.map(item => <option key={item.id} value={item.id}>{item.name}{item.code ? ` (${item.code})` : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-secondary-900 mb-2">
              {t('postPosition.employmentTypeLabel')}
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border border-secondary-200 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm font-medium"
            >
              <option value="Full-time">{t('postPosition.types.fullTime')}</option>
              <option value="Part-time">{t('postPosition.types.partTime')}</option>
              <option value="Contract">{t('postPosition.types.contract')}</option>
              <option value="Visiting">{t('postPosition.types.visiting')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-secondary-900 mb-2">
              {t('postPosition.deadlineLabel')}
            </label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border border-secondary-200 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-secondary-900 mb-2">
              {t('postPosition.contactEmailLabel')}
            </label>
            <input
              type="email"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border border-secondary-200 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm"
              placeholder={t('postPosition.contactEmailPlaceholder')}
            />
          </div>
        </div>

        <div className="flex justify-end"><button type="button" onClick={suggestJobContent} disabled={aiBusy} className="px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800 text-sm font-semibold">{aiBusy?'جاري إنشاء الاقتراح...':'✨ اقتراح الوصف والشروط بالذكاء الاصطناعي'}</button></div>

        <div>
          <label className="block text-sm font-semibold text-secondary-900 mb-2">
            {t('postPosition.descriptionLabel')}
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-secondary-200 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm resize-none"
            placeholder={t('postPosition.descriptionPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-secondary-900 mb-2">
            {t('postPosition.requirementsLabel')}
          </label>
          <textarea
            name="requirements"
            value={formData.requirements}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-secondary-200 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm resize-none"
            placeholder={t('postPosition.requirementsPlaceholder')}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3"><button type="button" disabled={loading||!formData.title.trim()} onClick={(e)=>savePosition(e,'draft')} className="w-full py-3.5 px-6 rounded-xl border border-primary-200 text-primary-700 bg-primary-50 font-bold disabled:opacity-50">حفظ كمسودة</button><button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 py-3.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 transition-all duration-200 hover:shadow-md">{loading?<><FaSpinner className="animate-spin h-5 w-5" />{t('postPosition.submitting')}</>:t('postPosition.submitBtn')}</button></div>
      </form>

      <section className="bg-white/80 rounded-2xl border border-secondary-100 shadow-soft p-5 md:p-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h3 className="text-xl font-bold text-secondary-900">الوظائف التي أنشأتها</h3><p className="text-sm text-secondary-500">إدارة ومراجعة الوظائف التابعة لحسابك وتصديرها كتقرير رسمي.</p></div><div className="flex flex-wrap gap-2"><div className="relative"><FaSearch className="absolute right-3 top-3 text-secondary-400"/><input value={positionSearch} onChange={e=>setPositionSearch(e.target.value)} placeholder="بحث في الوظائف" className="border rounded-xl py-2 pr-9 pl-3 text-sm"/></div><select value={positionFilter} onChange={e=>setPositionFilter(e.target.value)} className="border rounded-xl px-3 py-2 text-sm"><option value="all">كل الحالات</option>{Object.entries(statusLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead><tr className="bg-secondary-50"><th className="p-3">#</th><th>المسمى الوظيفي</th><th>الجامعة</th><th>الكلية</th><th>القسم</th><th>المادة</th><th>نوع التوظيف</th><th>آخر موعد</th><th>الحالة</th><th>المتقدمون</th></tr></thead><tbody>{shownPositions.map((p,i)=><tr key={p.id} className="border-t"><td className="p-3">{i+1}</td><td className="font-semibold">{p.title}</td><td>{p.institution||'-'}</td><td>{p.college||'-'}</td><td>{p.department||'-'}</td><td>{p.subject||'-'}{p.subjectCode?` (${p.subjectCode})`:''}</td><td>{p.type||'-'}</td><td>{p.deadline||'-'}</td><td>{statusLabel[p.status||'open']||p.status}</td><td className="text-center font-bold">{applicationCounts[p.id]||0}</td></tr>)}</tbody></table>{shownPositions.length===0&&<div className="text-center py-10 text-secondary-500">لا توجد وظائف ضمن البحث أو الفلتر الحالي.</div>}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="text-sm text-secondary-600">النتائج: <b>{shownPositions.length}</b> • إجمالي المتقدمين: <b>{shownPositions.reduce((n,x)=>n+(applicationCounts[x.id]||0),0)}</b></div><div className="flex gap-2"><button onClick={printReport} className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold flex items-center gap-2"><FaFilePdf/> تصدير PDF</button><button onClick={printReport} className="px-4 py-2 rounded-xl border font-semibold flex items-center gap-2"><FaPrint/> طباعة</button></div></div>
      </section>
    </div>
  );
};

export default PostPosition;
