import React from 'react';
import { createPortal } from 'react-dom';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';

const Toast = ({ message, type = 'success', onClose }) => {
  if (!message) return null;
  const isError = type === 'error';
  const content = (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-[calc(100%-2rem)] max-w-md pointer-events-auto as-page-enter" role={isError?'alert':'status'} aria-live={isError?'assertive':'polite'}>
      <div className={`flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${isError ? 'bg-red-50/95 border-red-200 text-red-800' : 'bg-emerald-50/95 border-emerald-200 text-emerald-800'}`}>
        {isError ? <FaExclamationCircle className="mt-0.5 h-5 w-5 flex-shrink-0" /> : <FaCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />}
        <p className="flex-1 text-sm font-semibold leading-6">{message}</p>
        {onClose&&<button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-black/5" aria-label="إغلاق الرسالة">
          <FaTimes className="h-4 w-4" />
        </button>}
      </div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export default Toast;
