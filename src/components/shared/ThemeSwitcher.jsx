import React, { useState } from 'react';
import { FaDesktop, FaMoon, FaSun } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeSwitcher({ className = '' }) {
  const { language } = useLanguage();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const copy = language === 'ar' ? { label: 'المظهر', light: 'فاتح', dark: 'داكن', system: 'النظام' } : { label: 'Theme', light: 'Light', dark: 'Dark', system: 'System' };
  const Icon = resolvedTheme === 'dark' ? FaMoon : FaSun;
  return <div className={`relative ${className}`}>
    <button type="button" aria-label={copy.label} aria-expanded={open} onClick={() => setOpen(value => !value)} className="as-theme-button"><Icon /></button>
    {open && <div className="as-theme-menu" role="menu" aria-label={copy.label}>{[['light', FaSun], ['dark', FaMoon], ['system', FaDesktop]].map(([value, ItemIcon]) => <button key={value} type="button" role="menuitemradio" aria-checked={theme === value} onClick={() => { setTheme(value); setOpen(false); }} className={theme === value ? 'is-selected' : ''}><ItemIcon /><span>{copy[value]}</span></button>)}</div>}
  </div>;
}
