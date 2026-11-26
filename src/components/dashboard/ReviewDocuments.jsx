import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { FaClipboardList, FaSpinner, FaCheck, FaTimes, FaDownload, FaUser, FaCalendar, FaBuilding, FaFileAlt, FaComment, FaMagic } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { fileAccessErrorMessage, openProtectedFile } from '../../services/apiClient';
import { createNotificationOnce } from '../../firebase/notificationService';
import { suggestDocumentReviewNoteHybrid } from '../../services/aiService';
import { useSearchParams } from 'react-router-dom';
import Toast from '../shared/Toast';

const ReviewDocuments = () => {
  const { t, language } = useLanguage();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewComment, setReviewComment] = useState('');
  const [viewError, setViewError] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSource, setAiSource] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [searchParams] = useSearchParams();
  const targetDocumentId = searchParams.get('documentId');
  const notify=(message,type='success')=>{setToast({message,type});window.setTimeout(()=>setToast({message:'',type:'success'}),4000)};

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Not authenticated');
        const q = query(collection(db, 'documents'), where('recruiterId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        const documentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDocuments(documentsData.sort((a,b)=>new Date(b.uploadedAt||0)-new Date(a.uploadedAt||0)));
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleSuggestNote = async document => {
    setAiBusy(true);
    try {
      const result = await suggestDocumentReviewNoteHybrid(document);
      setReviewComment(result.note);
      setAiSource(result.source);
      notify(result.source === 'cloud' ? 'تم إنشاء اقتراح AI سحابي ويمكنك تعديله.' : 'تم استخدام اقتراح AI المحلي الاحتياطي ويمكنك تعديله.');
    } catch (error) {
      notify('تعذر إنشاء اقتراح المراجعة.','error');
    } finally { setAiBusy(false); }
  };

  const handleReviewDocument = async (documentId, status) => {
    try {
      const documentRef = doc(db, 'documents', documentId);
      const document = documents.find(doc => doc.id === documentId);
      if (!document) throw new Error('Document not found');
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');
      const comment = reviewComment.trim();
      if (status === 'rejected' && !comment) {
        notify('أدخل ملاحظة توضح سبب رفض المستند.','error');
        return;
      }

      await updateDoc(documentRef, {
        status,
        reviewedAt: serverTimestamp(),
        reviewerComments: comment,
        reviewerId: currentUser.uid,
        updatedAt: serverTimestamp()
      });

      const reviewerSnap = currentUser ? await getDoc(doc(db, 'users', currentUser.uid)) : null;
      const reviewer = reviewerSnap?.exists() ? reviewerSnap.data() : {};
      const reviewerName = `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() || currentUser?.displayName || 'مسؤول التوظيف';
      const approved = status === 'approved';
      const notificationType = approved ? 'document_approved' : 'document_rejected';
      await createNotificationOnce({
        type: notificationType,
        title: approved ? 'تمت الموافقة على المستند' : 'تم رفض المستند',
        message: approved ? `تمت الموافقة على المستند «${document.title}».` : `تم رفض المستند «${document.title}».`,
        userId: document.userId,
        receiver: { id: document.userId, name: document.userName || '', email: document.userEmail || '' },
        sender: { id: currentUser?.uid || '', name: reviewerName, firstName: reviewer.firstName || '', lastName: reviewer.lastName || '', email: currentUser?.email || reviewer.email || '', university: reviewer.university || '' },
        documentId, documentTitle: document.title, reviewStatus: status, businessStatus: status,
        comments: comment, applicationId: document.applicationId || null, positionId: document.positionId || null,
        read: false,
        deepLink: `/lecturer-dashboard?section=upload&documentId=${encodeURIComponent(documentId)}`
      }, `${notificationType}:${documentId}:${document.userId}`);

      setDocuments(documents.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              status: status, 
              reviewedAt: new Date().toISOString(),
              reviewerComments: comment,
              reviewerId: currentUser.uid
            }
          : doc
      ));
      
      setReviewComment('');
      setAiSource('');
      notify(approved ? 'تمت الموافقة على المستند وإشعار المحاضر.' : 'تم رفض المستند وإشعار المحاضر.');
    } catch (error) {
      console.error('Error updating document status:', error);
      notify('تعذر تحديث حالة المستند.','error');
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return t('dashboard.status.pending');
      case 'approved':
        return t('dashboard.status.approved');
      case 'rejected':
        return t('dashboard.status.rejected');
      default:
        return status;
    }
  };

  const getDocumentViewUrl = (document) => {
    const apiBase = (process.env.REACT_APP_FILE_API_URL || 'http://localhost:5050').replace(/\/$/, '');
    const storedUrl = String(document?.fileURL || '').trim();
    const storagePath = String(document?.storagePath || '').trim();

    // Local uploads always have storagePath. Rebuild the URL from it so a
    // stale/root-only fileURL (for example http://localhost:5050/) can never
    // send the reviewer to the API home page.
    if (storagePath) {
      return `${apiBase}/uploads/${storagePath.split('/').map(encodeURIComponent).join('/')}`;
    }

    return storedUrl || '#';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const dateLocale = language === 'ar' ? 'ar-EG' : 'en-US';
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Toast message={toast.message} type={toast.type} />
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl shadow-soft">
          <FaClipboardList className="h-6 w-6 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-br from-secondary-900 to-primary-700 bg-clip-text text-transparent">
          {t('reviewDocs.title')}
        </h2>
      </div>
      {viewError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{viewError}</div>}
      
      {documents.length > 0 ? (
        <div className="space-y-6">
          {documents.map((document) => (
            <div
              key={document.id}
              data-document-id={document.id}
              className={`bg-white/70 backdrop-blur-xl rounded-2xl shadow-soft border
                       ${document.id === targetDocumentId ? 'border-primary-500 ring-2 ring-primary-200' : 'border-secondary-100'}
                       hover:shadow-card transition-all duration-300`}
            >
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl shadow-soft flex-shrink-0">
                      <FaUser className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-secondary-900">
                        {document.title}
                      </h3>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <FaUser className="h-4 w-4 text-primary-600" />
                          <p className="text-secondary-600 text-sm">
                            {document.userName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaBuilding className="h-4 w-4 text-primary-600" />
                          <p className="text-secondary-600 text-sm">
                            {((document.department && document.department !== 'undefined') ? (t(`departments.${document.department}`) !== `departments.${document.department}` ? t(`departments.${document.department}`) : document.department) : (language === 'ar' ? 'غير محدد' : 'Not specified'))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaFileAlt className="h-4 w-4 text-primary-600" />
                          <p className="text-secondary-600 text-sm">
                            {document.type}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaCalendar className="h-4 w-4 text-primary-600" />
                          <p className="text-secondary-600 text-sm">
                            {formatDate(document.uploadedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-xs font-semibold
                    ${document.status === 'pending' 
                      ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' 
                      : document.status === 'approved' 
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : document.status === 'rejected' 
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-secondary-50 text-secondary-700 border border-secondary-200'}`}
                  >
                    {getStatusText(document.status)}
                  </span>
                </div>
                
                {document.status === 'pending' && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-secondary-700">
                      <FaComment className="h-4 w-4 text-primary-600" />
                      <span>{t('reviewDocs.reviewCommentLabel')}</span>
                    </label>
                    <textarea
                      rows="2"
                      className="w-full px-4 py-3 rounded-xl border border-secondary-200 
                               bg-white/50 backdrop-blur-sm placeholder-secondary-400 
                               focus:ring-2 focus:ring-primary-500 focus:border-transparent 
                               transition-all duration-200 resize-none text-sm"
                      placeholder={t('reviewDocs.reviewCommentPlaceholder')}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    ></textarea>
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" onClick={()=>handleSuggestNote(document)} disabled={aiBusy} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 disabled:opacity-60">
                        <FaMagic /> {aiBusy ? 'جاري إنشاء الاقتراح...' : 'اقتراح ملاحظة بالذكاء الاصطناعي'}
                      </button>
                      {aiSource && <span className="text-xs font-semibold text-secondary-600">اقتراح بالذكاء الاصطناعي — {aiSource === 'cloud' ? 'Cloud' : 'Local Fallback'}</span>}
                    </div>
                    <p className="text-xs text-secondary-500">الاقتراح قابل للتعديل ولا يُحفظ ولا يوافق أو يرفض تلقائيًا؛ القرار النهائي لمسؤول التوظيف.</p>
                  </div>
                )}

                {document.reviewerComments && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FaComment className="h-4 w-4 text-primary-600" />
                      <p className="text-sm font-medium text-secondary-700">{t('reviewDocs.commentsLabel')}</p>
                    </div>
                    <div className="bg-secondary-50/50 backdrop-blur-sm px-4 py-3 rounded-xl border border-secondary-200">
                      <p className="text-secondary-600 text-sm">
                        {document.reviewerComments}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <button
                    type="button"
                    onClick={async()=>{setViewError('');try{await openProtectedFile(getDocumentViewUrl(document),{documentId:document.id})}catch(error){setViewError(fileAccessErrorMessage(error))}}}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-50 
                             text-primary-700 hover:bg-primary-100 transition-all duration-200 text-sm font-medium
                             shadow-sm hover:shadow-md border border-primary-100 w-full sm:w-auto justify-center"
                  >
                    <FaDownload className="h-4 w-4" />
                    {t('reviewDocs.viewDocument')}
                  </button>
                  
                  {document.status === 'pending' && (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => handleReviewDocument(document.id, 'approved')}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 
                                 text-green-700 hover:bg-green-100 transition-all duration-200 text-sm font-medium
                                 shadow-sm hover:shadow-md border border-green-200 flex-1 sm:flex-initial"
                      >
                        <FaCheck className="h-4 w-4" />
                        {t('reviewDocs.approve')}
                      </button>
                      <button
                        onClick={() => handleReviewDocument(document.id, 'rejected')}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 
                                 text-red-700 hover:bg-red-100 transition-all duration-200 text-sm font-medium
                                 shadow-sm hover:shadow-md border border-red-200 flex-1 sm:flex-initial"
                      >
                        <FaTimes className="h-4 w-4" />
                        {t('reviewDocs.reject')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 bg-white/70 backdrop-blur-xl rounded-2xl shadow-soft border border-secondary-100">
          <FaClipboardList className="h-12 w-12 text-secondary-400 mb-4" />
          <h3 className="text-xl font-bold text-secondary-900">{t('reviewDocs.noDocsTitle')}</h3>
          <p className="mt-2 text-secondary-600 text-sm">
            {t('reviewDocs.noDocsMsg')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewDocuments;
