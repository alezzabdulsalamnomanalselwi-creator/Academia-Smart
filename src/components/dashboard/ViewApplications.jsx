import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { FaUserGraduate, FaSpinner, FaSort, FaEye } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import Toast from '../shared/Toast';
import AcademiaSmartAI from './AcademiaSmartAI';
import CandidateRankingCompare from './CandidateRankingCompare';
import { createNotificationOnce } from '../../firebase/notificationService';
import { fileAccessErrorMessage, openProtectedFile } from '../../services/apiClient';

const ViewApplications = () => {
  const { t, language } = useLanguage();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [statusDialog,setStatusDialog]=useState(null);
  const [decisionNote,setDecisionNote]=useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast({ message: '', type: 'success' }), 4500);
  };

  const fetchApplications = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      const positionsSnapshot = await getDocs(query(
        collection(db, 'positions'),
        where('postedBy.id', '==', currentUser.uid)
      ));

      const recruiterPositionIds = new Set(
        positionsSnapshot.docs
          .filter(item => item.data().postedBy?.id === currentUser.uid)
          .map(item => item.id)
      );

      const applicationSnapshots = await Promise.all(
        [...recruiterPositionIds].map(positionId => getDocs(query(
          collection(db, 'applications'),
          where('positionId', '==', positionId)
        )))
      );
      const applicationDocs = applicationSnapshots.flatMap(snapshot => snapshot.docs);
      const applicationsData = [];
      for (const appDoc of applicationDocs) {
        const appData = appDoc.data();
        if (!recruiterPositionIds.has(appData.positionId)) continue;
        const userDoc = await getDoc(doc(db, 'users', appData.applicantId));
        const userData = userDoc.data();
        const ratingsSnapshot = await getDocs(query(
          collection(db, 'ratings'),
          where('lecturerId', '==', appData.applicantId),
          where('recruiterId', '==', currentUser.uid)
        ));
        const ratingValues = ratingsSnapshot.docs
          .map(item => Number(item.data().rating ?? item.data().score))
          .filter(value => Number.isFinite(value) && value >= 1 && value <= 5);
        const averageRating = ratingValues.length
          ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length
          : null;
  
        applicationsData.push({
          id: appDoc.id,
          applicantId: appData.applicantId,
          positionId: appData.positionId,
          name: userData?.firstName && userData?.lastName 
            ? `${userData.firstName} ${userData.lastName}`
            : 'No Name',
          email: appData.applicantEmail || 'No Email',
          position: appData.positionTitle || 'Not Specified',
          status: appData.status || 'pending',
          education: userData?.education || appData.education || 'Not Specified',
          experience: userData?.experience || appData.experience || 'Not Specified',
          yearsExperience: userData?.yearsExperience ?? userData?.experienceYears ?? appData.yearsExperience,
          phoneNumber: userData?.phoneNumber || 'Not Specified',
          currentInstitution: appData.institution || 'Not Specified',
          cvUrl: appData.cvUrl || userData?.cvUrl || '',
          certificatesUrl: appData.certificatesUrl || userData?.certificatesUrl || '',
          submittedAt: appData.appliedDate ? new Date(appData.appliedDate) : new Date(),
          profilePicUrl: userData?.profilePicUrl || '',
          jobTitle: appData.positionTitle || 'Unknown Position',
          department: appData.department || 'Unknown Department',
          jobDepartment: appData.department || 'Unknown Department',
          candidateDepartment: userData?.department || userData?.specialization || '',
          subject: appData.subject || appData.course || '',
          requirements: appData.requirements || '',
          requiredSkills: appData.requiredSkills || appData.skillsRequired || [],
          skills: userData?.skills || appData.skills || [],
          teachingExperience: userData?.teachingExperience || [],
          averageRating,
          referenceNumber: appData.referenceNumber || `APP-${String(appDoc.id).slice(0,8).toUpperCase()}`,
          timeline: Array.isArray(appData.timeline) ? appData.timeline : [],
          recruiterNotes: appData.recruiterNotes || ''
        });
      }

      setApplications(applicationsData);
    } catch (error) {
      console.error('Error in fetchApplications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const statusLabels = {
    pending: language === 'ar' ? 'قيد الانتظار' : 'Pending',
    under_review: language === 'ar' ? 'قيد المراجعة' : 'Under review',
    interview_scheduled: language === 'ar' ? 'مقابلة مجدولة' : 'Interview scheduled',
    under_evaluation: language === 'ar' ? 'تحت التقييم' : 'Under evaluation',
    approved: language === 'ar' ? 'مقبول' : 'Approved',
    rejected: language === 'ar' ? 'مرفوض' : 'Rejected'
  };

  const requestStatusChange = (application, newStatus) => {
    if (newStatus === application.status) return;
    setDecisionNote('');
    setStatusDialog({ application, newStatus });
  };

  const handleStatusUpdate = async () => {
    const application=statusDialog?.application; const newStatus=statusDialog?.newStatus;
    if (!application || !newStatus) return;
    if (newStatus === 'rejected' && !decisionNote.trim()) {
      showToast(language === 'ar' ? 'اكتب سبب الرفض قبل حفظ القرار.' : 'Enter a rejection reason before saving.', 'error');
      return;
    }
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');
      const timelineEntry = { status:newStatus, label:statusLabels[newStatus] || newStatus, note:decisionNote.trim(), at:new Date().toISOString(), actorId:currentUser.uid };
      await updateDoc(doc(db, 'applications', application.id), {
        status: newStatus,
        decisionNote: decisionNote.trim(),
        referenceNumber: application.referenceNumber,
        timeline: arrayUnion(timelineEntry),
        updatedAt: serverTimestamp()
      });

      const recruiterSnap = await getDoc(doc(db, 'users', currentUser.uid));
      const recruiter = recruiterSnap.exists() ? recruiterSnap.data() : {};
      const recruiterName = `${recruiter.firstName || ''} ${recruiter.lastName || ''}`.trim() || currentUser.displayName || (language === 'ar'?'مسؤول التوظيف':'Recruiter');
      const statusText=statusLabels[newStatus] || newStatus;
      const noteText=decisionNote.trim() ? (language==='ar'?` الملاحظة: ${decisionNote.trim()}`:` Note: ${decisionNote.trim()}`) : '';
      await createNotificationOnce({
        type: 'application_status',
        title: language === 'ar' ? 'تحديث حالة طلب التوظيف' : 'Application Status Updated',
        message: language === 'ar' ? `تم تحديث طلبك لوظيفة «${application.jobTitle}» إلى: ${statusText}.${noteText}` : `Your application for “${application.jobTitle}” is now: ${statusText}.${noteText}`,
        applicationId: application.id,
        positionId: application.positionId,
        positionTitle: application.jobTitle,
        applicationStatus: newStatus,
        sender: { id: currentUser.uid, name: recruiterName, email: currentUser.email || recruiter.email || '', university: recruiter.university || '' },
        receiver: { id: application.applicantId, name: application.name, email: application.email },
        userId: application.applicantId,
        deepLink: '/lecturer-dashboard?section=applications',
        relatedId: application.id
      }, `application:${application.id}:status:${newStatus}`);

      setApplications(prev => prev.map(app => app.id === application.id ? { ...app, status: newStatus, decisionNote:decisionNote.trim(), timeline:[...(app.timeline||[]),timelineEntry] } : app));
      showToast(language === 'ar' ? `تم تحديث حالة الطلب إلى ${statusText}` : `Application status updated to ${statusText}`);
      setStatusDialog(null); setDecisionNote('');
    } catch (error) {
      console.error('Error updating status:', error);
      showToast(t('recruiterApps.statusUpdateFailed'), 'error');
    }
  };

  const handleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const filteredAndSortedApplications = () => {
    let filtered = [...applications];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(app => 
        app.name.toLowerCase().includes(searchLower) ||
        app.email.toLowerCase().includes(searchLower) ||
        app.jobTitle.toLowerCase().includes(searchLower)
      );
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.submittedAt);
      const dateB = new Date(b.submittedAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return '';
    const dateLocale = language === 'ar' ? 'ar-EG' : 'en-US';
    return dateObj.toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin h-8 w-8 text-primary-600" />
      </div>
    );
  }

  const displayedApplications = filteredAndSortedApplications();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
      <CandidateRankingCompare applications={applications} />
      {/* Header Controls */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-secondary-900 to-primary-700 bg-clip-text text-transparent mb-4 sm:mb-0">
          {t('recruiterApps.title')}
        </h1>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <input
              type="text"
              placeholder={t('recruiterApps.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full sm:w-64 px-4 py-2.5 rounded-xl border border-secondary-200 
                       shadow-sm placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 
                       focus:border-transparent transition-all duration-200 text-sm"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-secondary-200 
                     shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm"
          >
            <option value="all">{t('recruiterApps.filter.all')}</option>
            {Object.entries(statusLabels).map(([k,v])=><option key={k} value={k}>{v}</option>) }
          </select>

          <button
            onClick={handleSort}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-secondary-200 
                     shadow-sm text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 
                     transition-all duration-200"
          >
            <FaSort />
            {sortOrder === 'asc' ? t('recruiterApps.sort.oldest') : t('recruiterApps.sort.newest')}
          </button>
        </div>
      </div>

      {displayedApplications.length > 0 ? (
        <div className="space-y-6">
          {displayedApplications.map((application) => (
            <div 
              key={application.id}
              className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-soft p-6 border border-secondary-100 
                       hover:shadow-card transition-all duration-200"
            >
              <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                <div className="flex items-start gap-6">
                  <div className="bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl p-3 w-20 h-20 
                               flex items-center justify-center overflow-hidden shadow-soft flex-shrink-0">
                    {application.profilePicUrl ? (
                      <img 
                        src={application.profilePicUrl} 
                        alt={application.name}
                        className="w-full h-full object-cover rounded-xl"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/80?text=NA';
                        }}
                      />
                    ) : (
                      <FaUserGraduate className="h-10 w-10 text-primary-600" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-secondary-900">{application.name}</h3>
                    <p className="text-secondary-600 text-sm">{application.email}</p>
                    <p className="text-primary-600 font-semibold text-sm">
                      {t('recruiterApps.appliedFor', { title: application.jobTitle })}
                    </p>
                    <p className="text-secondary-600 text-sm">{t('recruiterApps.department', { department: application.department })}</p>
                    <p className="text-secondary-600 text-sm">{t('recruiterApps.education', { education: application.education })}</p>
                    <p className="text-secondary-600 text-sm">{t('recruiterApps.experience', { experience: application.experience })}</p>
                    <p className="text-secondary-600 text-sm">
                      {t('recruiterApps.institution', { institution: application.currentInstitution })}
                    </p>
                    <p className="text-secondary-600 text-sm dir-ltr text-start">{t('recruiterApps.phone', { phone: application.phoneNumber })}</p>
                    <p className="text-secondary-500 text-xs mt-2">
                      {t('recruiterApps.appliedOn', { date: formatDate(application.submittedAt) })}
                    </p>
                    <p className="text-primary-700 text-xs font-mono mt-1">الرقم المرجعي: {application.referenceNumber}</p>
                  </div>
                </div>

                <div className="w-full md:w-auto">
                  <select
                    value={application.status}
                    onChange={(e) => requestStatusChange(application, e.target.value)}
                    className={`block w-full px-4 py-2.5 rounded-xl border shadow-sm focus:ring-2 focus:ring-primary-500 
                             focus:border-transparent transition-all duration-200 text-sm font-semibold
                             ${application.status === 'pending' 
                               ? 'text-yellow-800 bg-yellow-50 border-yellow-200' 
                               : application.status === 'approved' 
                               ? 'text-green-800 bg-green-50 border-green-200'
                               : 'text-red-800 bg-red-50 border-red-200'}`}
                  >
                    {Object.entries(statusLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <AcademiaSmartAI application={application} />
              <details className="mt-4 border rounded-xl p-4 bg-secondary-50"><summary className="cursor-pointer font-semibold">السجل الزمني للطلب</summary><div className="mt-3 space-y-2 text-sm">{(application.timeline||[]).length===0?<p className="text-secondary-500">لا توجد تحديثات مسجلة بعد.</p>:[...(application.timeline||[])].reverse().map((x,i)=><div key={i} className="border-r-2 border-primary-300 pr-3"><b>{x.label||statusLabels[x.status]||x.status}</b>{x.note&&<div className="text-secondary-600">{x.note}</div>}<div className="text-xs text-secondary-400">{x.at?new Date(x.at).toLocaleString(language==='ar'?'ar-EG':'en-US'):''}</div></div>)}</div></details>

              {/* Documents Links */}
              <div className="mt-6 pt-4 border-t border-secondary-100">
                <h4 className="text-xs font-semibold text-secondary-900 mb-3 uppercase tracking-wider">{t('recruiterApps.documentsTitle')}</h4>
                <div className="flex flex-wrap gap-4">
                  {application.cvUrl && (
                    <button
                      type="button"
                      onClick={async()=>{try{await openProtectedFile(application.cvUrl)}catch(error){showToast(fileAccessErrorMessage(error),'error')}}}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 text-sm font-medium 
                               text-primary-700 hover:bg-primary-100 transition-all duration-200 border border-primary-100"
                    >
                      <FaEye />
                      {t('recruiterApps.viewCv')}
                    </button>
                  )}
                  {application.certificatesUrl && (
                    <button
                      type="button"
                      onClick={async()=>{try{await openProtectedFile(application.certificatesUrl)}catch(error){showToast(fileAccessErrorMessage(error),'error')}}}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 text-sm font-medium 
                               text-primary-700 hover:bg-primary-100 transition-all duration-200 border border-primary-100"
                    >
                      <FaEye />
                      {t('recruiterApps.viewCertificates')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white/70 backdrop-blur-xl rounded-2xl shadow-soft border border-secondary-100">
          <FaUserGraduate className="mx-auto h-12 w-12 text-secondary-400" />
          <h3 className="mt-4 text-lg font-bold text-secondary-900">{t('recruiterApps.noApplicationsTitle')}</h3>
          <p className="mt-2 text-secondary-600 text-sm">
            {searchTerm || statusFilter !== 'all' 
              ? t('recruiterApps.noApplicationsSearchMsg')
              : t('recruiterApps.noApplicationsMsg')}
          </p>
        </div>
      )}

      {statusDialog&&<div className="fixed inset-0 z-[100] bg-secondary-900/50 flex items-center justify-center p-4" dir="rtl"><div className="bg-white rounded-2xl border shadow-2xl p-6 w-full max-w-lg"><h3 className="text-xl font-bold">تحديث حالة الطلب</h3><p className="text-secondary-600 mt-2">{statusDialog.application.name} — {statusDialog.application.jobTitle}</p><div className="mt-4 rounded-xl bg-primary-50 text-primary-800 p-3">الحالة الجديدة: <b>{statusLabels[statusDialog.newStatus]||statusDialog.newStatus}</b></div><label className="block mt-4 text-sm font-semibold">{statusDialog.newStatus==='rejected'?'سبب الرفض (إلزامي)':'ملاحظة لمسار الطلب (اختياري)'}</label><textarea value={decisionNote} onChange={e=>setDecisionNote(e.target.value)} rows="3" className="mt-2 w-full border rounded-xl p-3" placeholder={statusDialog.newStatus==='rejected'?'اكتب سببًا واضحًا ليستفيد منه المتقدم...':'ملاحظة داخل قرار الحالة...'} /><div className="flex gap-3 mt-5"><button onClick={()=>setStatusDialog(null)} className="flex-1 border rounded-xl py-3">إلغاء</button><button onClick={handleStatusUpdate} className={`flex-1 rounded-xl py-3 text-white ${statusDialog.newStatus==='rejected'?'bg-red-600':'bg-primary-600'}`}>تأكيد التحديث</button></div></div></div>}
    </div>
  );
};

export default ViewApplications;
