import React, { useEffect, useMemo, useState } from 'react';
import {
  FaBalanceScale, FaBolt, FaCheckCircle, FaCloud, FaExclamationTriangle,
  FaInfoCircle, FaRobot, FaShieldAlt, FaSpinner, FaStar
} from 'react-icons/fa';
import { analyzeCandidateHybrid, compareCandidatesLocal } from '../../services/aiService';
import { buildPhase1rCandidateDataset } from '../../data/phase1rCandidateFixtures';

const ScoreRing=({score,compact=false})=>{
  const value=Math.max(0,Math.min(100,Number(score)||0));
  const color=value>=75?'#0d9488':value>=50?'#d97706':'#e11d48';
  return <div className={`relative grid shrink-0 place-items-center rounded-full ${compact?'h-16 w-16':'h-20 w-20'}`} style={{background:`conic-gradient(${color} ${value*3.6}deg,#e8eef5 0deg)`}} role="img" aria-label={`نسبة التوافق ${value} من 100`}><div className="absolute inset-[6px] rounded-full bg-white"/><div className="relative text-center"><b className={`${compact?'text-base':'text-xl'} block text-secondary-900`}>{value}%</b><span className="text-[9px] font-bold text-secondary-400">MATCH</span></div></div>;
};

const EmptyList = ({ text }) => <p className="text-sm text-secondary-500">{text}</p>;

const CandidateRankingCompare = ({ applications = [] }) => {
  const candidates = useMemo(() => buildPhase1rCandidateDataset(applications), [applications]);
  const [ranked, setRanked] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    if (!candidates.length) {
      setRanked([]);
      setSelected([]);
      setLoading(false);
      return () => { alive = false; };
    }
    setLoading(true);
    setError('');
    Promise.all(candidates.map(async candidate => ({
      candidate,
      analysis: await analyzeCandidateHybrid(candidate)
    })))
      .then(results => {
        if (!alive) return;
        const ordered = results.sort((left, right) => right.analysis.score - left.analysis.score
          || String(left.candidate.id).localeCompare(String(right.candidate.id)));
        setRanked(ordered);
        setSelected(ordered.slice(0, 3).map(item => item.candidate.id));
      })
      .catch(() => alive && setError('تعذر تجهيز التحليل الذكي. أعد المحاولة بعد تحديث الصفحة.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [candidates]);

  const toggleCandidate = id => {
    setSelected(current => current.includes(id)
      ? current.filter(item => item !== id)
      : current.length < 3 ? [...current, id] : current);
  };
  const selectedCandidates = ranked.filter(item => selected.includes(item.candidate.id));
  const comparison = compareCandidatesLocal(selectedCandidates.map(item => item.candidate));
  const resolvedComparison = comparison.map(row => ({
    ...row,
    analysis: selectedCandidates.find(item => item.candidate.id === row.id)?.analysis
  }));

  if (!applications.length) return (
    <section className="mb-8 rounded-2xl border border-dashed border-secondary-300 bg-white p-8 text-center" dir="rtl">
      <FaRobot className="mx-auto text-3xl text-secondary-400" />
      <h2 className="mt-3 text-lg font-bold text-secondary-800">ترتيب ومقارنة المرشحين</h2>
      <p className="mt-2 text-sm text-secondary-500">لا توجد طلبات مرتبطة بوظائفك لبدء التحليل.</p>
    </section>
  );

  return (
    <section className="ai-ranking-premium mb-8 overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-white via-indigo-50/60 to-sky-50 shadow-card" dir="rtl" data-testid="candidate-ranking-compare">
      <header className="border-b border-indigo-100 bg-gradient-to-l from-primary-950 via-primary-900 to-primary-800 px-5 py-6 text-white sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-white"><FaRobot /><h2 className="text-xl font-black">Academia Smart — ترتيب ومقارنة المرشحين</h2></div>
            <p className="mt-2 max-w-3xl text-sm text-blue-100">تحليل تفسيري مبني على بيانات الملف والوظيفة المتاحة فقط، مع ترتيب ثابت لنفس المدخلات.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700"><FaBolt /> ترتيب تلقائي تفسيري</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><FaShieldAlt /> لا يغيّر حالة الطلب</span>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900"><FaInfoCircle className="mt-0.5 shrink-0" /><span>التقييم الذكي أداة مساعدة ولا يمثل قرار التوظيف النهائي.</span></div>
      </header>

      {loading && <div className="flex items-center justify-center gap-3 px-6 py-12 text-indigo-700"><FaSpinner className="animate-spin" /><span>جاري تحليل المرشحين؛ سيعمل Smart Local تلقائيًا عند غياب Cloud AI...</span></div>}
      {error && <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"><FaExclamationTriangle className="inline ml-2" />{error}</div>}

      {!loading && !error && ranked.length > 0 && <div className="space-y-8 p-5 sm:p-7">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-black text-secondary-900">الترتيب حسب نسبة التوافق</h3>
            <p className="text-xs text-secondary-500">اختر مرشحين أو ثلاثة للمقارنة</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {ranked.map((item, index) => <article key={item.candidate.id} className="rounded-2xl border border-secondary-200 bg-white p-5 shadow-soft" data-candidate-id={item.candidate.id}>
              <div className="flex items-start justify-between gap-3">
                <div><span className="text-xs font-black text-indigo-600">الترتيب #{index + 1}</span><h4 className="mt-1 text-lg font-black text-secondary-900">{item.candidate.name}</h4>{item.candidate.testFixture && <span className="mt-2 inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-800">بيانات TEST محلية — غير محفوظة</span>}</div>
                <ScoreRing score={item.analysis.score}/>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary-100 px-2.5 py-1 font-bold text-secondary-700">{item.analysis.source === 'cloud' ? <FaCloud /> : <FaShieldAlt />}{item.analysis.source === 'cloud' ? 'Cloud AI' : 'Smart Local'}</span>
                <span className="rounded-full bg-sky-100 px-2.5 py-1 font-bold text-sky-800">اكتمال الملف {item.analysis.profileCompleteness}%</span>
                {item.candidate.averageRating !== null && item.candidate.averageRating !== undefined && Number.isFinite(Number(item.candidate.averageRating)) && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-bold text-amber-800"><FaStar /> {Number(item.candidate.averageRating).toFixed(1)}/5</span>}
              </div>
              <p className="mt-4 text-sm font-semibold text-secondary-700">{item.analysis.recommendation}</p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {Object.entries(item.analysis.breakdown || {}).map(([key, value]) => <div key={key} className="rounded-lg bg-secondary-50 p-2"><dt className="text-secondary-500">{{subject:'المادة',department:'القسم',qualification:'المؤهل',skills:'المهارات',experience:'الخبرة',completeness:'اكتمال الملف',evidence:'الأدلة',rating:'التقييم'}[key] || key}</dt><dd className="mt-1 font-black text-secondary-900">{value}</dd></div>)}
              </dl>
              <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-secondary-200 p-3 text-sm font-bold"><input type="checkbox" checked={selected.includes(item.candidate.id)} onChange={() => toggleCandidate(item.candidate.id)} disabled={!selected.includes(item.candidate.id) && selected.length >= 3} /> تضمين في المقارنة</label>
            </article>)}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2"><FaBalanceScale className="text-indigo-700" /><h3 className="text-lg font-black text-secondary-900">المقارنة التفصيلية</h3></div>
          {resolvedComparison.length < 2 ? <EmptyList text="اختر مرشحين على الأقل لعرض المقارنة." /> : <div className="grid gap-4 xl:grid-cols-3">
            {resolvedComparison.map(row => <article key={row.id} className="rounded-2xl border border-indigo-100 bg-white p-5">
              <div className="flex items-start justify-between gap-2"><div><h4 className="font-black text-secondary-900">{row.name}</h4>{row.testFixture && <span className="text-[11px] font-bold text-violet-700">TEST محلي</span>}</div><ScoreRing compact score={row.analysis?.score ?? row.score}/></div>
              <dl className="mt-4 space-y-2 text-sm"><div><dt className="font-bold text-secondary-500">المؤهل</dt><dd>{row.qualification}</dd></div><div><dt className="font-bold text-secondary-500">الخبرة</dt><dd>{row.experience ? `${row.experience} سنوات` : 'غير متوفرة'}</dd></div><div><dt className="font-bold text-secondary-500">المهارات</dt><dd>{row.skills.length ? row.skills.join('، ') : 'غير متوفرة'}</dd></div><div><dt className="font-bold text-secondary-500">التقييم</dt><dd>{row.averageRating === null ? 'غير متوفر' : `${row.averageRating}/5`}</dd></div></dl>
              <div className="mt-5"><h5 className="font-black text-emerald-800">نقاط القوة</h5>{row.analysis?.strengths?.length ? row.analysis.strengths.map((text, index) => <p key={index} className="mt-2 flex gap-2 text-sm"><FaCheckCircle className="mt-1 shrink-0 text-emerald-600" />{text}</p>) : <EmptyList text="لا توجد نقاط قوة قابلة للاستخلاص من البيانات الحالية." />}</div>
              <div className="mt-5"><h5 className="font-black text-amber-800">الفجوات</h5>{row.analysis?.gaps?.length ? row.analysis.gaps.map((text, index) => <p key={index} className="mt-2 flex gap-2 text-sm"><FaExclamationTriangle className="mt-1 shrink-0 text-amber-600" />{text}</p>) : <EmptyList text="لا توجد فجوات أساسية ظاهرة." />}</div>
              <div className="mt-5"><h5 className="font-black text-rose-800">المهارات الناقصة</h5><p className="mt-2 text-sm">{row.analysis?.missingSkills?.length ? row.analysis.missingSkills.join('، ') : 'لا توجد مهارات ناقصة ظاهرة.'}</p></div>
              <details className="mt-5 rounded-xl bg-indigo-50 p-4"><summary className="cursor-pointer font-black text-indigo-900">أسئلة ومحاور مقابلة مقترحة</summary><ol className="mt-3 list-decimal space-y-2 pr-5 text-sm">{(row.analysis?.questions || row.interviewFocus).map((question, index) => <li key={index}>{question}</li>)}</ol></details>
            </article>)}
          </div>}
        </div>
      </div>}
    </section>
  );
};

export default CandidateRankingCompare;
