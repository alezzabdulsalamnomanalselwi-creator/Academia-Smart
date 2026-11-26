import React, { useState } from 'react';
import { FaCloudUploadAlt, FaEye, FaCheckCircle } from 'react-icons/fa';
import { auth } from '../../firebase/config';
import { uploadUserDocument, validateDocumentFile } from '../../utils/fileUpload';
import { fileAccessErrorMessage, openProtectedFile } from '../../services/apiClient';

const DocumentUploader = ({ kind, label, value, onUploaded, onError }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateDocumentFile(file, kind);
    if (validation) { onError?.(validation); e.target.value = ''; return; }
    try {
      setUploading(true); setProgress(0); setFileName(file.name);
      const result = await uploadUserDocument({ userId: auth.currentUser?.uid, file, category: kind, onProgress: setProgress });
      onUploaded?.(result);
    } catch (err) {
      console.error('Document upload failed:', err);
      onError?.(`تعذر رفع الملف: ${err?.message || 'تأكد أن خدمة الملفات المحلية تعمل.'}`);
    } finally { setUploading(false); }
  };

  return (
    <div className="rounded-2xl border border-secondary-200 bg-secondary-50/50 p-4">
      <label className="block text-sm font-semibold text-secondary-800 mb-2">{label}</label>
      <label className={`flex items-center justify-center gap-3 min-h-24 rounded-xl border-2 border-dashed cursor-pointer transition ${uploading ? 'border-primary-300 bg-primary-50' : 'border-secondary-300 bg-white hover:border-primary-400'}`}>
        <FaCloudUploadAlt className="h-7 w-7 text-primary-600" />
        <span className="text-sm text-secondary-700">{uploading ? `جاري الرفع ${progress}%` : 'اضغط لاختيار ملف من الجهاز'}</span>
        <input type="file" className="hidden" onChange={handleFile} disabled={uploading} accept={kind === 'cv' ? '.pdf,.doc,.docx' : '.pdf,.jpg,.jpeg,.png,.zip'} />
      </label>
      {uploading && <div className="mt-3 h-2 rounded-full bg-secondary-200 overflow-hidden"><div className="h-full bg-primary-600 transition-all" style={{ width: `${progress}%` }} /></div>}
      {(value || fileName) && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><FaCheckCircle className="text-green-600"/><span className="text-secondary-600">{fileName || 'تم رفع الملف'}</span>{value && <button type="button" onClick={()=>openProtectedFile(value).catch(error=>onError?.(fileAccessErrorMessage(error)))} className="inline-flex items-center gap-1 text-primary-700 font-semibold"><FaEye/> معاينة</button>}</div>}
      <p className="mt-2 text-xs text-secondary-500">يتم الرفع إلى التخزين المحلي للمشروع. الحد الأقصى 25MB. {kind === 'cv' ? 'PDF أو Word.' : 'PDF أو JPG أو PNG أو ZIP.'}</p>
    </div>
  );
};
export default DocumentUploader;
