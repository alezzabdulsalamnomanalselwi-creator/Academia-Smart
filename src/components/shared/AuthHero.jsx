import React from 'react';
import { FaCheck, FaGraduationCap, FaRobot, FaShieldAlt } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';

export default function AuthHero(){
  const {language}=useLanguage();
  const ar=language==='ar';
  return <aside className="auth-hero" aria-label="Academia Smart">
    <div className="auth-hero-brand">
      <img src="/logo.png" alt="" />
      <div><strong>ACADEMIA SMART</strong><span>Modern Academic Recruitment SaaS</span></div>
    </div>
    <div className="auth-hero-copy">
      <span className="as-eyebrow !bg-white/10 !text-cyan-200"><FaGraduationCap/> {ar?'مستقبل التوظيف الأكاديمي':'The future of academic recruitment'}</span>
      <h1>{ar?'منصة ذكية لاستقطاب وإدارة أعضاء هيئة التدريس':'A smarter platform for academic talent recruitment'}</h1>
      <p>{ar?'اربط الجامعات بالمواهب الأكاديمية، وأدر دورة التوظيف كاملة بوضوح وأمان وقرارات مدعومة بالذكاء الاصطناعي.':'Connect universities with academic talent and manage the full recruitment journey with clarity, security and explainable AI.'}</p>
      <div className="auth-features">
        <div className="auth-feature"><i><FaCheck/></i> {ar?'مسارات مخصصة للمحاضر ومسؤول التوظيف والإدارة':'Purpose-built workflows for every role'}</div>
        <div className="auth-feature"><i><FaRobot/></i> {ar?'تحليل ذكي تفسيري مع بديل محلي موثوق':'Explainable AI with a reliable local fallback'}</div>
        <div className="auth-feature"><i><FaShieldAlt/></i> {ar?'صلاحيات دقيقة وحماية للبيانات والملفات':'Fine-grained access and protected data'}</div>
      </div>
    </div>
    <div className="auth-hero-trust">ACADEMIA SMART • Part-Time Faculty Recruitment System</div>
  </aside>;
}
