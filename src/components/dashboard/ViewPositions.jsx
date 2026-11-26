import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { FaSpinner, FaBriefcase, FaCalendar, FaFilter, FaBuilding, FaGraduationCap } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import Toast from '../shared/Toast';
import { isLikelyDocumentUrl } from '../../utils/validation';
import { createNotificationOnce } from '../../firebase/notificationService';

const ConfirmationDialog = ({ position, onConfirm, onCancel }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full shadow-soft border border-secondary-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl shadow-soft">
            <FaBriefcase className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="text-xl font-bold text-secondary-900">
            {t('positions.confirmTitle')}
          </h3>
        </div>
        <div className="mb-6">
          <p className="text-secondary-600 mb-4">
            {t('positions.confirmMessage')}
          </p>
          <div className="space-y-3 bg-secondary-50/70 backdrop-blur-sm rounded-xl p-4 border border-secondary-200">
            <div className="flex items-center gap-3">
              <FaBriefcase className="h-5 w-5 text-primary-600" />
              <p className="text-secondary-900 font-semibold">{position.title}</p>
            </div>
            <div className="flex items-center gap-3">
              <FaBuilding className="h-5 w-5 text-primary-600" />
              <p className="text-secondary-700">{position.institution}</p>
            </div>
            <div className="flex items-center gap-3">
              <FaGraduationCap className="h-5 w-5 text-primary-600" />
              <p className="text-secondary-700">{[position.college, position.department].filter(Boolean).join(' • ')}</p>
            </div>
            {position.subject && <div className="text-sm text-primary-700 font-semibold">المادة: {position.subject}{position.subjectCode ? ` (${position.subjectCode})` : ''}</div>}
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-secondary-200 text-sm font-medium 
                     text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 
                     focus:ring-offset-2 focus:ring-secondary-500 transition-all duration-200
                     shadow-sm hover:shadow-md"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl border border-transparent text-sm font-medium 
                     text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 
                     focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200
                     shadow-sm hover:shadow-md"
          >
            {t('positions.confirmBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};

const ViewPositions = () => {
  const { t, language } = useLanguage();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [filter, setFilter] = useState('all');
  const [userApplications, setUserApplications] = useState({});
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast({ message: '', type: 'success' }), 4500);
  };

  useEffect(() => {
    const fetchPositionsAndApplications = async () => {
      try {
        setLoading(true);
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const positionsQuery = query(collection(db, 'positions'), where('status', '==', 'open'));
        const positionsSnapshot = await getDocs(positionsQuery);
        const positionsList = positionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const applicationsQuery = query(
          collection(db, 'applications'),
          where('applicantId', '==', currentUser.uid)
        );
        const applicationsSnapshot = await getDocs(applicationsQuery);
        
        const applications = {};
        applicationsSnapshot.forEach(doc => {
          const data = doc.data();
          applications[data.positionId] = data.status;
        });

        setUserApplications(applications);
        setPositions(positionsList);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPositionsAndApplications();
  }, []);

  const isPositionExpired = (deadline) => {
    return new Date(deadline) < new Date();
  };

  const handleApplyClick = (position) => {
    setSelectedPosition(position);
    setShowConfirmation(true);
  };

  const handleApply = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      const applicationRef = doc(db, 'applications', `application_${selectedPosition.id}_${currentUser.uid}`);
      
      const existingApplicationsQuery = query(
        collection(db, 'applications'),
        where('positionId', '==', selectedPosition.id),
        where('applicantId', '==', currentUser.uid)
      );
      const existingApplications = await getDocs(existingApplicationsQuery);
      
      if (!existingApplications.empty) {
        showToast(t('positions.alreadyAppliedMsg'), 'error');
        setShowConfirmation(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        showToast(t('positions.profileNotFoundMsg'), 'error');
        setShowConfirmation(false);
        return;
      }

      const userData = userDoc.data();

      const requiredFields = ['firstName', 'lastName', 'education', 'cvUrl', 'department'];
      const missingFields = requiredFields.filter(field => !userData[field]);

      if (!userData.teachingExperience || userData.teachingExperience.length === 0) {
        missingFields.push('teaching experience');
      }

      if (missingFields.length > 0) {
        const names={firstName:'الاسم الأول',lastName:'اسم العائلة',education:'المؤهل',cvUrl:'السيرة الذاتية',department:'القسم الأكاديمي','teaching experience':'الخبرة التدريسية'};
        showToast(language==='ar'?`أكمل بيانات ملفك قبل التقديم: ${missingFields.map(x=>names[x]||x).join('، ')}`:t('positions.incompleteProfileMsg'), 'error');
        setShowConfirmation(false);
        return;
      }

      if (!isLikelyDocumentUrl(userData.cvUrl) || (userData.certificatesUrl && !isLikelyDocumentUrl(userData.certificatesUrl))) {
        showToast(language === 'ar' ? 'يرجى تحديث روابط السيرة الذاتية والشهادات بروابط ملفات صالحة قبل التقديم.' : 'Please update your CV/certificate links with valid document URLs before applying.', 'error');
        setShowConfirmation(false);
        return;
      }

      const application = {
        positionId: selectedPosition.id,
        positionTitle: selectedPosition.title,
        institution: selectedPosition.institution,
        universityId: selectedPosition.universityId || '',
        department: selectedPosition.department,
        applicantId: currentUser.uid,
        recruiterId: selectedPosition.postedBy.id,
        applicantName: `${userData.firstName} ${userData.lastName}`,
        applicantEmail: currentUser.email,
        education: userData.education,
        cvUrl: userData.cvUrl,
        certificatesUrl: userData.certificatesUrl,
        status: 'pending',
        subject: selectedPosition.subject || '', subjectId:selectedPosition.subjectId||'', subjectCode:selectedPosition.subjectCode||'', college:selectedPosition.college||'', collegeId:selectedPosition.collegeId||'', departmentId:selectedPosition.departmentId||'', requirements:selectedPosition.requirements||'', experience:userData.yearsExperience||'', teachingExperience:userData.teachingExperience||[], skills:userData.skills||[],
        appliedDate: new Date().toISOString(),
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        timeline:[{status:'pending',label:language==='ar'?'تم تقديم الطلب':'Application submitted',at:new Date().toISOString(),actorId:currentUser.uid}],
      };

      const referenceNumber=`APP-${new Date().getFullYear()}-${applicationRef.id.slice(0,8).toUpperCase()}`;
      try {
        await setDoc(applicationRef,{...application,referenceNumber,updatedAt:serverTimestamp()});
      } catch (writeError) {
        if (writeError?.code === 'permission-denied') {
          const concurrentDuplicate = await getDocs(existingApplicationsQuery);
          if (!concurrentDuplicate.empty) {
            setUserApplications(prev => ({ ...prev, [selectedPosition.id]: concurrentDuplicate.docs[0].data().status || 'pending' }));
            showToast(t('positions.alreadyAppliedMsg'), 'error');
            return;
          }
        }
        throw writeError;
      }

      setUserApplications(prev => ({
        ...prev,
        [selectedPosition.id]: 'pending'
      }));

      await createNotificationOnce({
        type: 'application',
        title: language === 'ar' ? 'طلب توظيف جديد' : 'New Application Received',
        message: language === 'ar' ? `تقدم ${userData.firstName} ${userData.lastName} للوظيفة: ${selectedPosition.title} — رقم الطلب ${referenceNumber}` : `${userData.firstName} ${userData.lastName} applied for ${selectedPosition.title} — ${referenceNumber}`,
        sender:{id:currentUser.uid,name:`${userData.firstName} ${userData.lastName}`,email:currentUser.email||''},
        receiver:{id:selectedPosition.postedBy.id,name:selectedPosition.postedBy.name,email:selectedPosition.postedBy.email},
        userId:selectedPosition.postedBy.id, positionId:selectedPosition.id, positionTitle:selectedPosition.title, applicationId:applicationRef.id, referenceNumber, deepLink:'/recruiter-dashboard?section=applications'
      }, `application:new:${applicationRef.id}`);

      showToast(t('positions.applySuccessMsg'));
    } catch (error) {
      console.error('Error submitting application:', error);
      showToast(t('positions.applyErrorMsg'), 'error');
    } finally {
      setLoading(false);
      setShowConfirmation(false);
      setSelectedPosition(null);
    }
  };

  const filteredPositions = positions.filter(position => position.status !== 'paused' && position.status !== 'closed' && position.status !== 'archived').filter(position => {
    if (filter === 'active') {
      return !isPositionExpired(position.deadline);
    } else if (filter === 'expired') {
      return isPositionExpired(position.deadline);
    }
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const dateLocale = language === 'ar' ? 'ar-EG' : 'en-US';
    return new Date(dateStr).toLocaleDateString(dateLocale);
  };

  if (loading && positions.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin h-8 w-8 text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl shadow-soft">
            <FaBriefcase className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-secondary-900">
            {t('positions.title')}
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <FaFilter className="h-5 w-5 text-primary-600" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-44 px-4 py-2.5 rounded-xl border border-secondary-200 text-sm font-medium
                     text-secondary-700 bg-white shadow-sm focus:outline-none focus:ring-2 
                     focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
          >
            <option value="all">{t('positions.filter.all')}</option>
            <option value="active">{t('positions.filter.active')}</option>
            <option value="expired">{t('positions.filter.expired')}</option>
          </select>
        </div>
      </div>

      {filteredPositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-secondary-100 shadow-sm">
          <FaBriefcase className="h-12 w-12 text-secondary-400 mb-4" />
          <p className="text-secondary-600 text-lg font-medium">{t('positions.noPositions')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredPositions.map((position) => {
            const hasApplied = userApplications[position.id];
            const isExpired = isPositionExpired(position.deadline);
            
            return (
              <div
                key={position.id}
                className="bg-white rounded-2xl shadow-soft border border-secondary-100 
                         hover:shadow-card transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl shadow-soft flex-shrink-0">
                          <FaBriefcase className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-secondary-900 mb-1">
                            {position.title}
                          </h3>
                          <p className="text-secondary-600 text-sm">
                            {position.institution} • {position.department}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="prose prose-sm max-w-none text-secondary-600">
                          {position.description}
                        </div>
                        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-secondary-100">
                          <div className="flex items-center gap-2">
                            <FaCalendar className="h-4 w-4 text-primary-600" />
                            <span className="text-xs sm:text-sm text-secondary-700">
                              {t('positions.deadline', { date: formatDate(position.deadline) })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {hasApplied ? (
                        <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold 
                                     bg-primary-50 text-primary-700 border border-primary-100">
                          {t('positions.appliedStatus')}
                        </span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold 
                                     bg-red-50 text-red-700 border border-red-100">
                          {t('positions.expiredStatus')}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApplyClick(position)}
                          className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm 
                                   font-medium rounded-xl text-white bg-primary-600 hover:bg-primary-700 
                                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                                   transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          {t('positions.applyNow')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showConfirmation && selectedPosition && (
        <ConfirmationDialog
          position={selectedPosition}
          onConfirm={handleApply}
          onCancel={() => {
            setShowConfirmation(false);
            setSelectedPosition(null);
          }}
        />
      )}
    </div>
  );
};

export default ViewPositions;
