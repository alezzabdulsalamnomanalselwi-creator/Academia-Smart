import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, getDocs, where, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { FaLink, FaUpload, FaFile } from 'react-icons/fa';
import { uploadUserDocument, validateDocumentFile } from '../../utils/fileUpload';
import { useLanguage } from '../../context/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import { createNotificationOnce } from '../../firebase/notificationService';

const UploadDocuments = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [recruiters, setRecruiters] = useState([]);
  const [applications, setApplications] = useState([]);
  const [ownDocuments, setOwnDocuments] = useState([]);
  const [selectedRecruiter, setSelectedRecruiter] = useState('');
  const [showOnlyApproved, setShowOnlyApproved] = useState(false);
  const [searchParams] = useSearchParams();
  const targetDocumentId = searchParams.get('documentId');

  useEffect(() => {
    const fetchRecruitersAndApprovals = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const approvedApplicationsQuery = query(
          collection(db, 'applications'),
          where('applicantId', '==', user.uid),
          where('status', '==', 'approved')
        );
        const approvedApplications = await getDocs(approvedApplicationsQuery);
        const applicationsQuery = query(collection(db, 'applications'), where('applicantId', '==', user.uid));
        const applicationSnapshot = await getDocs(applicationsQuery);
        setApplications(applicationSnapshot.docs.map(item => ({ id: item.id, ...item.data() })));
        const approvedRecruiterIds = new Set(
          approvedApplications.docs.map(doc => doc.data().recruiterId)
        );

        const recruitersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'recruiter')
        );
        const recruitersSnapshot = await getDocs(recruitersQuery);
        const recruitersData = recruitersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          hasApprovedApplication: approvedRecruiterIds.has(doc.id)
        }));

        setRecruiters(recruitersData);
      } catch (error) {
        console.error('Error fetching recruiters:', error);
      }
    };

    fetchRecruitersAndApprovals();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return undefined;
    return onSnapshot(query(collection(db, 'documents'), where('userId', '==', user.uid)), snapshot => {
      setOwnDocuments(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
        .sort((a,b)=>new Date(b.uploadedAt||0)-new Date(a.uploadedAt||0)));
    }, error => console.error('Error loading own documents:', error));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!documentTitle.trim()) {
      setError(t('uploadDocs.errTitle'));
      return;
    }

    if (!documentType) {
      setError(t('uploadDocs.errType'));
      return;
    }

    if (!file && !documentUrl.trim()) { setError('اختر ملفًا من جهازك أو أدخل رابطًا اختياريًا.'); return; }

    if (!selectedRecruiter) {
      setError(t('uploadDocs.errRecruiter'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      const user = auth.currentUser;

      const userDoc = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userDoc);
      
      if (!userSnapshot.exists()) {
        throw new Error('User data not found');
      }
      
      const userData = userSnapshot.data();
      const selectedRecruiterData = recruiters.find(r => r.id === selectedRecruiter);
      if (!selectedRecruiterData) throw new Error('Recruiter not found');
      const relatedApplication = applications
        .filter(item => item.recruiterId === selectedRecruiter)
        .sort((a,b)=>new Date(b.appliedDate||0)-new Date(a.appliedDate||0))[0] || null;

      let uploaded = null;
      if (file) { const kind = documentType === 'CV' ? 'cv' : 'certificate'; const validation = validateDocumentFile(file, kind); if (validation) throw new Error(validation); uploaded = await uploadUserDocument({ userId:user.uid, file, category:documentType || 'document', onProgress:setProgress }); }

      const documentRef = doc(collection(db, 'documents'));
      const documentData = {
        userId: user.uid,
        userName: `${userData.firstName} ${userData.lastName}`,
        userEmail: user.email,
        title: documentTitle,
        fileURL: uploaded?.url || documentUrl.trim(),
        storagePath: uploaded?.path || null,
        fileName: uploaded?.name || null,
        fileType: uploaded?.type || null,
        fileSize: uploaded?.size || null,
        uploadedAt: new Date().toISOString(),
        status: 'pending',
        type: documentType,
        reviewedAt: null,
        reviewerComments: null,
        recruiterId: selectedRecruiter,
        recruiterName: `${selectedRecruiterData.firstName} ${selectedRecruiterData.lastName}`.trim(),
        applicationId: relatedApplication?.id || null,
        positionId: relatedApplication?.positionId || null,
        jobId: relatedApplication?.positionId || null,
        positionTitle: relatedApplication?.positionTitle || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (userData.department) {
        documentData.department = userData.department;
      }

      await setDoc(documentRef, documentData);
      await createNotificationOnce({
        type: 'document_uploaded',
        title: 'مستند جديد بانتظار المراجعة',
        message: `لديك مستند جديد بانتظار المراجعة: «${documentTitle.trim()}».`,
        sender: { id: user.uid, name: documentData.userName, email: user.email || '', department: userData.department || '' },
        receiver: { id: selectedRecruiter, name: documentData.recruiterName, email: selectedRecruiterData.email || '' },
        userId: selectedRecruiter,
        documentId: documentRef.id,
        documentTitle: documentTitle.trim(),
        applicationId: documentData.applicationId,
        positionId: documentData.positionId,
        businessStatus: 'pending',
        deepLink: `/recruiter-dashboard?section=documents&documentId=${encodeURIComponent(documentRef.id)}`
      }, `document_uploaded:${documentRef.id}:${selectedRecruiter}`);

      setSuccess(t('uploadDocs.successMsg'));
      setDocumentTitle('');
      setDocumentType('');
      setDocumentUrl('');
      setFile(null); setProgress(0);
      setSelectedRecruiter('');
    } catch (error) {
      console.error('Error submitting document:', error);
      setError(t('common.error') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecruiters = showOnlyApproved 
    ? recruiters.filter(recruiter => recruiter.hasApprovedApplication)
    : recruiters;

  const documentTypes = [
    { value: 'CV', label: 'السيرة الذاتية (CV)' },
    { value: 'Research Paper', label: t('uploadDocs.types.research') },
    { value: 'Publication', label: t('uploadDocs.types.publication') },
    { value: 'Certificate', label: t('uploadDocs.types.certificate') },
    { value: 'Award', label: t('uploadDocs.types.award') },
    { value: 'Other', label: t('uploadDocs.types.other') }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('uploadDocs.title')}</h2>
        <p className="mt-1 text-gray-600">{t('uploadDocs.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Document Title */}
        <div>
          <label htmlFor="documentTitle" className="block text-sm font-medium text-gray-700 mb-1">
            {t('uploadDocs.docTitleLabel')}
          </label>
          <input
            type="text"
            id="documentTitle"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            placeholder={t('uploadDocs.docTitlePlaceholder')}
          />
        </div>

        {/* Document Type */}
        <div>
          <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-1">
            {t('uploadDocs.docTypeLabel')}
          </label>
          <select
            id="documentType"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          >
            <option value="">{t('uploadDocs.selectType')}</option>
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Select Recruiter */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
            <label htmlFor="recruiter" className="block text-sm font-medium text-gray-700">
              {t('uploadDocs.selectRecruiterLabel')}
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showApproved"
                checked={showOnlyApproved}
                onChange={(e) => setShowOnlyApproved(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="showApproved" className="ms-2 text-sm text-gray-600">
                {t('uploadDocs.showApprovedOnly')}
              </label>
            </div>
          </div>
          <select
            id="recruiter"
            value={selectedRecruiter}
            onChange={(e) => setSelectedRecruiter(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          >
            <option value="">{t('uploadDocs.selectRecruiterPlaceholder')}</option>
            {filteredRecruiters.map((recruiter) => (
              <option 
                key={recruiter.id} 
                value={recruiter.id}
                className={recruiter.hasApprovedApplication ? 'text-green-600 font-medium' : ''}
              >
                {`${recruiter.firstName} ${recruiter.lastName}`}
                {recruiter.hasApprovedApplication ? ` ${t('uploadDocs.approvedBadge')}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">رفع الملف مباشرة من الجهاز</label>
          <label className="border-2 border-dashed rounded-xl p-5 flex items-center gap-3 cursor-pointer hover:bg-primary-50">
            <FaUpload className="text-primary-600"/><div className="flex-1"><b>{file ? file.name : 'اختيار ملف'}</b><p className="text-xs text-gray-500">CV: PDF/Word • الشهادات: PDF/JPG/PNG/ZIP • الحد 25MB</p></div>
            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip" onChange={e=>{setFile(e.target.files?.[0]||null);setError('')}}/>
          </label>
          {file&&<div className="mt-2 text-sm flex items-center gap-2"><FaFile/> {(file.size/1024/1024).toFixed(2)} MB {progress>0&&progress<100?`• رفع ${progress}%`:''}</div>}
        </div>

        {/* Document URL */}
        <div>
          <label htmlFor="documentUrl" className="block text-sm font-medium text-gray-700 mb-1">
            رابط المستند (اختياري إذا رفعت ملفًا)
          </label>
          <div className="mt-1 flex rounded-xl shadow-sm overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500">
            <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-e border-gray-300">
              <FaLink className="h-4 w-4" />
            </span>
            <input
              type="url"
              id="documentUrl"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              className="flex-1 block w-full border-0 px-4 py-2.5 focus:ring-0 text-sm"
              placeholder="https://drive.google.com/your-document"
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {t('uploadDocs.urlHint')}
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white 
              ${loading ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} 
              transition-colors duration-200`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('uploadDocs.submitting')}
              </>
            ) : (
              t('uploadDocs.submitBtn')
            )}
          </button>
        </div>
      </form>

      {ownDocuments.length > 0 && (
        <section className="mt-8 space-y-3" aria-label="مستنداتي">
          <h3 className="text-lg font-bold text-secondary-900">مستنداتي ونتائج المراجعة</h3>
          {ownDocuments.map(item => {
            const highlighted = item.id === targetDocumentId;
            const statusLabel = item.status === 'approved' ? 'تمت الموافقة' : item.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة';
            return <article key={item.id} data-document-id={item.id} className={`rounded-xl border p-4 ${highlighted ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-secondary-200 bg-secondary-50'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2"><b>{item.title}</b><span className="text-sm font-semibold">{statusLabel}</span></div>
              <p className="mt-1 text-sm text-secondary-600">{item.type || 'مستند'}{item.positionTitle ? ` • ${item.positionTitle}` : ''}</p>
              {item.reviewerComments && <p className="mt-2 rounded-lg bg-white p-3 text-sm text-secondary-700"><b>ملاحظة المراجع:</b> {item.reviewerComments}</p>}
              {highlighted && <p className="mt-2 text-xs font-semibold text-primary-700">تم فتح المستند المحدد من الإشعار.</p>}
            </article>;
          })}
        </section>
      )}
    </div>
  );
};

export default UploadDocuments;
