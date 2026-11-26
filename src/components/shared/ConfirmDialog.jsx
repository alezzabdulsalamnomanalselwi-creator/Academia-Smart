import React from 'react';
import { FaExclamationTriangle,FaTimes } from 'react-icons/fa';

export default function ConfirmDialog({ open, title='تأكيد العملية', message, confirmText='تأكيد', cancelText='إلغاء', danger=false, onConfirm, onCancel }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] bg-secondary-900/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
    <div className="relative w-full max-w-md rounded-3xl bg-white border border-secondary-100 shadow-2xl p-7 as-page-enter" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <button type="button" onClick={onCancel} className="absolute top-4 left-4 h-9 w-9 grid place-items-center rounded-xl text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700" aria-label="إغلاق"><FaTimes/></button>
      <div className={`mb-4 h-12 w-12 rounded-2xl grid place-items-center ${danger?'bg-red-50 text-red-600':'bg-primary-50 text-primary-600'}`}><FaExclamationTriangle/></div>
      <h3 id="confirm-dialog-title" className="text-xl font-black text-secondary-900 mb-3">{title}</h3>
      <p className="text-secondary-600 leading-7">{message}</p>
      <div className="flex gap-3 mt-6">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary-100 text-secondary-700 font-bold hover:bg-secondary-200">{cancelText}</button>
        <button type="button" onClick={onConfirm} className={`flex-1 px-4 py-2.5 rounded-xl text-white font-bold shadow-sm ${danger?'bg-red-600 hover:bg-red-700':'bg-primary-600 hover:bg-primary-700'}`}>{confirmText}</button>
      </div>
    </div>
  </div>;
}
