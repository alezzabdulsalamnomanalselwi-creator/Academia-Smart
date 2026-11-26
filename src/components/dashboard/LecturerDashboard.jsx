import React, { useState, useEffect } from 'react';
import { FaUpload, FaBell, FaStar, FaUser, FaBriefcase, FaClipboardList, FaCalendar } from 'react-icons/fa';
import { auth, db } from '../../firebase/config';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import UploadDocuments from './UploadDocuments';
import RequestRatings from './RequestRatings';
import ViewPositions from './ViewPositions';
import TrackApplications from './TrackApplications';
import Profile from './Profile';
import LecturerNotifications from './LecturerNotifications';
import LecturerInterviews from './LecturerInterviews';
import DashboardShell from '../shared/DashboardShell';

const LecturerDashboard = () => {
  const { t, language } = useLanguage();
  const [activeComponent, setActiveComponent] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { unreadCount } = useNotifications();
  const [summary, setSummary] = useState({ applications: 0, documents: 0, interviews: 0, ratings: 0 });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    let active = true;
    const loadSummary = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const [applications, documents, interviews, ratings] = await Promise.all([
          getDocs(query(collection(db, 'applications'), where('applicantId', '==', user.uid), limit(50))),
          getDocs(query(collection(db, 'documents'), where('userId', '==', user.uid), limit(50))),
          getDocs(query(collection(db, 'interviews'), where('candidateId', '==', user.uid), limit(50))),
          getDocs(query(collection(db, 'ratings'), where('lecturerId', '==', user.uid), limit(50)))
        ]);
        if (active) setSummary({ applications: applications.size, documents: documents.size, interviews: interviews.size, ratings: ratings.size });
      } catch (error) {
        if (active) setSummary({ applications: 0, documents: 0, interviews: 0, ratings: 0 });
      }
    };
    loadSummary();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const section = searchParams.get('section');
    const aliases = { applications: 'track-applications', positions: 'view-positions', documents: 'upload' };
    const target = aliases[section] || section;
    if (['upload','notifications','interviews','ratings','view-positions','track-applications','profile'].includes(target)) {
      setActiveComponent(target);
    }
  }, [searchParams]);


  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
    setShowLogoutModal(false);
  };

  const dashboardCards = [
    {
      id: 'upload',
      title: t('dashboard.cards.uploadTitle'),
      description: t('dashboard.cards.uploadDesc'),
      icon: <FaUpload className="h-6 w-6 text-primary-600" />,
      component: UploadDocuments
    },
    {
      id: 'notifications',
      title: t('dashboard.cards.notificationsTitle'),
      description: t('dashboard.cards.notificationsDesc'),
      icon: <FaBell className="h-6 w-6 text-primary-600" />,
      component: LecturerNotifications,
      badge: unreadCount > 0 ? unreadCount : null
    },
    {
      id: 'ratings',
      title: t('dashboard.cards.ratingsTitle'),
      description: t('dashboard.cards.ratingsDesc'),
      icon: <FaStar className="h-6 w-6 text-primary-600" />,
      component: RequestRatings
    },
    {
      id: 'interviews',
      title: language==='ar'?'مقابلاتي':'My Interviews',
      description: language==='ar'?'عرض مواعيد المقابلات وروابط الاجتماعات وتحديثاتها':'View interview schedules, meeting links, and updates',
      icon: <FaCalendar className="h-6 w-6 text-primary-600" />,
      component: LecturerInterviews
    },
    {
      id: 'view-positions',
      title: t('dashboard.cards.positionsTitle'),
      description: t('dashboard.cards.positionsDesc'),
      icon: <FaBriefcase className="h-6 w-6 text-primary-600" />,
      component: ViewPositions
    },
    {
      id: 'track-applications',
      title: t('dashboard.cards.applicationsTitle'),
      description: t('dashboard.cards.applicationsDesc'),
      icon: <FaClipboardList className="h-6 w-6 text-primary-600" />,
      component: TrackApplications
    },
    {
      id: 'profile',
      title: t('dashboard.cards.profileTitle'),
      description: t('dashboard.cards.profileDesc'),
      icon: <FaUser className="h-6 w-6 text-primary-600" />,
      component: Profile
    }
  ];

  const renderComponent = () => {
    const activeCard = dashboardCards.find(card => card.id === activeComponent);
    return activeCard?.component ? <activeCard.component /> : null;
  };
  const profileFields = [userData?.firstName, userData?.lastName, userData?.education, userData?.department, userData?.cvUrl, userData?.phoneNumber, Array.isArray(userData?.skills) && userData.skills.length, Array.isArray(userData?.teachingExperience) && userData.teachingExperience.length];
  const profilePercent = userData ? Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100) : 0;
  const overviewCopy = language === 'ar' ? ['طلباتي', 'مستنداتي', 'مقابلاتي', 'تقييماتي', 'اكتمال الملف'] : ['Applications', 'Documents', 'Interviews', 'Ratings', 'Profile completeness'];
  const overview = <div className="as-kpi-grid as-kpi-grid-five">
    {[[overviewCopy[0], summary.applications, FaClipboardList], [overviewCopy[1], summary.documents, FaUpload], [overviewCopy[2], summary.interviews, FaCalendar], [overviewCopy[3], summary.ratings, FaStar], [overviewCopy[4], `${profilePercent}%`, FaUser]].map(([label, value, Icon]) => <div className="as-kpi-card" key={label}><span className="as-kpi-icon"><Icon /></span><div><span>{label}</span><b>{value}</b></div></div>)}
  </div>;

  return <>
      <DashboardShell
        cards={dashboardCards}
        activeId={activeComponent}
        onSelect={setActiveComponent}
        user={userData}
        roleLabel={language==='ar'?'محاضر':'Lecturer'}
        title={t('dashboard.welcomeUser', { name: userData?.firstName || 'Lecturer' })}
        subtitle={t('dashboard.lecturerSubtext')}
        unreadCount={unreadCount}
        onLogout={handleLogoutClick}
        overview={overview}
      >
        {renderComponent()}
      </DashboardShell>
      {showLogoutModal && (
          <div className="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative p-7 border w-full max-w-md shadow-2xl rounded-3xl bg-white" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="lecturer-logout-title">
              <div className="text-center">
                <h3 id="lecturer-logout-title" className="text-xl font-black text-secondary-900">{t('dashboard.logoutConfirmTitle')}</h3>
                <div className="mt-4 py-2">
                  <p className="text-sm text-secondary-600">
                    {t('dashboard.logoutConfirmMessage')}
                  </p>
                </div>
                <div className="flex justify-center gap-4 mt-6">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="px-5 py-2.5 bg-secondary-100 text-secondary-700 text-sm font-medium 
                             rounded-xl shadow-sm hover:bg-secondary-200 focus:outline-none 
                             focus:ring-2 focus:ring-secondary-300 transition-all duration-200"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleConfirmLogout}
                    className="px-5 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl 
                             shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 
                             focus:ring-red-500 transition-all duration-200"
                  >
                    {t('common.logout')}
                  </button>
                </div>
              </div>
            </div>
          </div>
      )}
    </>;
};

export default LecturerDashboard;
