import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSwitcher from '../shared/LanguageSwitcher';
import ThemeSwitcher from '../shared/ThemeSwitcher';

const Header = () => {
  const { t } = useLanguage();

  return (
    <header className="bg-white/80 backdrop-blur-xl shadow-soft border-b border-secondary-100 sticky top-0 z-40">
      <div className="w-full max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative group">
              <img 
                src="/logo.png" 
                alt="Academia Smart Logo" 
                className="h-12 w-12 rounded-xl bg-white p-1 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="hidden xs:block border-s border-secondary-200 ps-3 sm:ps-4 py-1">
              <h1 className="text-base sm:text-lg font-extrabold text-secondary-900 leading-tight">
                ACADEMIA SMART
              </h1>
              <p className="text-xs font-semibold text-primary-600 tracking-wide">
                {t('appName')} • Academic Recruitment SaaS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher /><LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
