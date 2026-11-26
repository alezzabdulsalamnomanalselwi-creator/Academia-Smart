import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { FaSpinner, FaCircle } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';

const ApplicationTimeline=({status,language})=>{
  const steps=[['pending',language==='ar'?'تم التقديم':'Applied'],['under_review',language==='ar'?'قيد المراجعة':'Under review'],['interview_scheduled',language==='ar'?'المقابلة':'Interview'],['accepted',language==='ar'?'القرار':'Decision']];
  const normalized=status==='approved'?'accepted':status;
  const current=Math.max(0,steps.findIndex(([key])=>key===normalized));
  return <div className="mt-5 rounded-2xl bg-secondary-50 p-4" aria-label="مراحل الطلب"><div className="flex items-start">{steps.map(([key,label],index)=><React.Fragment key={key}><div className="relative z-10 flex min-w-0 flex-1 flex-col items-center text-center"><span className={`h-7 w-7 rounded-full border-4 border-secondary-50 grid place-items-center text-[10px] font-black ${status==='rejected'&&index===current?'bg-red-500 text-white':index<=current?'bg-primary-600 text-white':'bg-secondary-200 text-secondary-500'}`}>{index+1}</span><span className={`mt-1 text-[10px] sm:text-xs font-bold ${index<=current?'text-primary-800':'text-secondary-400'}`}>{label}</span></div>{index<steps.length-1&&<span className={`mt-3 h-1 flex-1 rounded-full -mx-3 ${index<current?'bg-primary-500':'bg-secondary-200'}`}/>}</React.Fragment>)}</div>{status==='rejected'&&<p className="mt-3 text-center text-xs font-bold text-red-600">تم إيقاف المسار بعد قرار الرفض</p>}</div>;
};

const TrackApplications = () => {
  const { t, language } = useLanguage();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        let querySnapshot;
        try {
          const q = query(
            collection(db, 'applications'),
            where('applicantId', '==', currentUser.uid),
            orderBy('appliedDate', 'desc')
          );
          querySnapshot = await getDocs(q);
        } catch (indexErr) {
          const fallbackQ = query(
            collection(db, 'applications'),
            where('applicantId', '==', currentUser.uid)
          );
          querySnapshot = await getDocs(fallbackQ);
        }
        const applicationsList = [];
        querySnapshot.forEach((doc) => {
          applicationsList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setApplications(applicationsList);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500';
      case 'under_review':
        return 'text-blue-500';
      case 'interview_scheduled':
        return 'text-purple-600';
      case 'accepted':
      case 'approved':
        return 'text-green-500';
      case 'rejected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return t('trackApps.status.pending');
      case 'under_review':
        return language === 'ar' ? 'قيد المراجعة' : 'Under review';
      case 'interview_scheduled':
        return language === 'ar' ? 'مقابلة مجدولة' : 'Interview scheduled';
      case 'accepted':
      case 'approved':
        return t('trackApps.status.accepted');
      case 'rejected':
        return t('trackApps.status.rejected');
      default:
        return status;
    }
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

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const dateLocale = language === 'ar' ? 'ar-EG' : 'en-US';
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredApplications = applications.filter(app => 
    filter === 'all' ? true : app.status === filter
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin h-8 w-8 text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Status Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-secondary-900">{t('trackApps.title')}</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-44 px-4 py-2.5 rounded-xl border border-secondary-200 text-sm font-medium
                   text-secondary-700 bg-white shadow-sm focus:outline-none focus:ring-2 
                   focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
        >
          <option value="all">{t('trackApps.filter.all')}</option>
          <option value="pending">{t('trackApps.filter.pending')}</option>
          <option value="under_review">{language === 'ar' ? 'قيد المراجعة' : 'Under review'}</option>
          <option value="interview_scheduled">{language === 'ar' ? 'مقابلة مجدولة' : 'Interview scheduled'}</option>
          <option value="accepted">{t('trackApps.filter.accepted')}</option>
          <option value="rejected">{t('trackApps.filter.rejected')}</option>
        </select>
      </div>

      {filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-secondary-100 shadow-sm">
          <p className="text-secondary-600 font-medium">{t('trackApps.noApplications')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <div
              key={application.id}
              className="bg-white rounded-2xl shadow-soft border border-secondary-100 p-6 hover:shadow-card transition-all duration-200"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-bold text-secondary-900">
                    {application.positionTitle}
                  </h3>
                  <p className="text-primary-600 font-medium text-sm mt-0.5">{application.institution}</p>
                  <p className="text-secondary-500 text-sm">{application.department}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-50 border border-secondary-100">
                  <FaCircle className={`h-2.5 w-2.5 ${getStatusColor(application.status)}`} />
                  <span className="text-xs font-semibold text-secondary-800">
                    {getStatusText(application.status)}
                  </span>
                </div>
              </div>

              <ApplicationTimeline status={application.status} language={language}/>

              <div className="mt-4 pt-3 border-t border-secondary-100">
                <div className="text-xs sm:text-sm text-secondary-500 font-medium">
                  {t('trackApps.appliedOn', { date: formatDate(application.appliedDate) })}
                </div>
              </div>

              {application.feedback && (
                <div className="mt-4 p-4 bg-secondary-50 rounded-xl border border-secondary-100">
                  <h4 className="text-sm font-semibold text-secondary-900 mb-1">{t('trackApps.feedbackTitle')}</h4>
                  <p className="text-sm text-secondary-700">{application.feedback}</p>
                </div>
              )}

              {application.interviewDate && (
                <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                  <h4 className="text-sm font-semibold text-green-900 mb-1">{t('trackApps.interviewScheduled')}</h4>
                  <p className="text-sm text-green-700">
                    {t('trackApps.interviewDate', { date: formatDateTime(application.interviewDate) })}
                  </p>
                  {application.interviewLocation && (
                    <p className="text-sm text-green-700 mt-1">
                      {t('trackApps.interviewLocation', { location: application.interviewLocation })}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrackApplications;
