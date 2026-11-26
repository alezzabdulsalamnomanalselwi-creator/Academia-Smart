import React, { useState } from 'react';
import { FaBars, FaBell, FaChevronRight, FaGraduationCap, FaHome, FaSignOutAlt, FaTimes, FaUser } from 'react-icons/fa';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import { useLanguage } from '../../context/LanguageContext';

export default function DashboardShell({
  cards, activeId, onSelect, user, roleLabel, title, subtitle, unreadCount=0,
  onLogout, overview, children
}){
  const [menuOpen,setMenuOpen]=useState(false);
  const {language,dir}=useLanguage();
  const copy=language==='ar'?{overview:'نظرة عامة',workspace:'مساحة العمل',dashboard:'لوحة التحكم الرئيسية',areas:'مساحات العمل',choose:'اختر المهمة التي تريد البدء بها',back:'العودة إلى لوحة التحكم',logout:'تسجيل الخروج'}:{overview:'Overview',workspace:'Workspace',dashboard:'Main dashboard',areas:'Workspaces',choose:'Choose a task to get started',back:'Back to dashboard',logout:'Log out'};
  const activeCard=cards.find(card=>card.id===activeId);
  const select=id=>{onSelect(id);setMenuOpen(false)};
  const displayName=`${user?.firstName||''} ${user?.lastName||''}`.trim()||user?.firstName||roleLabel;
  const initials=displayName.split(/\s+/).slice(0,2).map(part=>part[0]).join('');
  return <div className="as-app-shell" dir={dir}>
    {menuOpen&&<button className="as-sidebar-scrim" aria-label="إغلاق القائمة" onClick={()=>setMenuOpen(false)}/>} 
    <aside className={`as-sidebar ${menuOpen?'is-open':''}`} aria-label="التنقل الرئيسي">
      <div className="as-brand"><img className="as-brand-logo" src="/logo.png" alt="Academia Smart"/><div><div className="as-brand-name">ACADEMIA SMART</div><div className="as-brand-subtitle">Academic Recruitment SaaS</div></div><button type="button" className="as-icon-button as-mobile-menu ms-auto !bg-white/10 !border-white/10 !text-white" aria-label={language==='ar'?'إغلاق القائمة':'Close menu'} onClick={()=>setMenuOpen(false)}><FaTimes/></button></div>
      <div className="as-role-chip">{roleLabel}</div>
      <nav className="as-nav">
        <button type="button" className={`as-nav-button ${!activeId?'is-active':''}`} onClick={()=>select(null)}><span className="as-nav-icon"><FaHome/></span><span>{copy.overview}</span></button>
        {cards.map(card=><button type="button" key={card.id} className={`as-nav-button ${activeId===card.id?'is-active':''}`} onClick={()=>select(card.id)}><span className="as-nav-icon">{card.icon}</span><span>{card.title}</span>{card.badge?<span className="as-nav-badge">{card.badge}</span>:null}</button>)}
      </nav>
      <div className="as-sidebar-footer"><button type="button" className="as-nav-button as-logout" onClick={onLogout}><span className="as-nav-icon"><FaSignOutAlt/></span><span>{copy.logout}</span></button></div>
    </aside>
    <div className="as-main">
      <header className="as-topbar">
        <div className="flex items-center gap-3"><button type="button" className="as-icon-button as-mobile-menu" aria-label={language==='ar'?'فتح القائمة':'Open menu'} onClick={()=>setMenuOpen(true)}><FaBars/></button><div><div className="as-topbar-title">{activeCard?.title||title}</div><div className="as-topbar-kicker">{activeCard?copy.workspace:copy.dashboard}</div></div></div>
        <div className="as-topbar-actions"><div className="as-language"><LanguageSwitcher/></div><ThemeSwitcher/><button type="button" className="as-icon-button" aria-label={`${language==='ar'?'الإشعارات':'Notifications'}${unreadCount?`، ${unreadCount}`:''}`} onClick={()=>cards.some(card=>card.id==='notifications')&&select('notifications')}><FaBell/>{unreadCount?<span className="as-nav-badge absolute -top-2 -end-2">{unreadCount}</span>:null}</button><div className="as-user"><div className="as-avatar">{user?.profilePicUrl?<img src={user.profilePicUrl} alt=""/>:initials||<FaUser/>}</div><div className="as-user-copy"><div className="as-user-name">{displayName}</div><div className="as-user-role">{roleLabel}</div></div></div></div>
      </header>
      <main className="as-content">
        {!activeId?<div className="as-page-enter"><section className="as-welcome"><span className="as-eyebrow"><FaGraduationCap/> Academia Smart Workspace</span><h1>{title}</h1><p>{subtitle}</p></section>{overview?<section className="as-dashboard-overview" aria-label={language==='ar'?'ملخص الحساب':'Account summary'}>{overview}</section>:null}<section aria-label={copy.areas}><div className="mb-4"><h2 className="text-xl font-black text-secondary-900">{copy.areas}</h2><p className="mt-1 text-sm text-secondary-500">{copy.choose}</p></div><div className="as-quick-grid">{cards.map(card=><button type="button" key={card.id} className="as-quick-card" onClick={()=>select(card.id)}><span className="as-quick-icon">{card.icon}</span><h3>{card.title}</h3><p>{card.description}</p>{card.badge?<span className="as-nav-badge absolute top-4 end-4">{card.badge}</span>:null}</button>)}</div></section></div>:<div className="as-page-enter"><button type="button" className="as-section-back" onClick={()=>select(null)}><FaChevronRight/> {copy.back}</button><section className="as-module-surface">{children}</section></div>}
      </main>
    </div>
  </div>;
}
