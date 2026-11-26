import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { FaGlobe } from 'react-icons/fa';

const LanguageSwitcher = ({ className = '' }) => {
  const { language, changeLanguage } = useLanguage();

  return (
    <div className={`inline-flex items-center gap-1 bg-white/80 backdrop-blur-md p-1 rounded-xl border border-secondary-200 shadow-sm ${className}`}>
      <FaGlobe className="h-4 w-4 text-primary-600 mx-1.5" />
      <button
        type="button"
        aria-pressed={language === 'ar'}
        onClick={() => changeLanguage('ar')}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
          language === 'ar'
            ? 'bg-primary-600 text-white shadow-soft'
            : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100'
        }`}
      >
        العربية
      </button>
      <button
        type="button"
        aria-pressed={language === 'en'}
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
          language === 'en'
            ? 'bg-primary-600 text-white shadow-soft'
            : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100'
        }`}
      >
        English
      </button>
    </div>
  );
};

export default LanguageSwitcher;
