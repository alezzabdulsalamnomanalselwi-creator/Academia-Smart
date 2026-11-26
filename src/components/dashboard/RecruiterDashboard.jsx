import React, { useState, useEffect } from 'react';
import { FaUserGraduate, FaClipboardList, FaStar, FaEnvelope, FaCalendar, FaBell, FaBriefcase } from 'react-icons/fa';
import { auth, db } from '../../firebase/config';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import ViewApplications from './ViewApplications';
import ReviewDocuments from './ReviewDocuments';
import SendRatings from './SendRatings';
import SendNotifications from './SendNotifications';
import ManageInterviews from './ManageInterviews';
import RecruiterNotifications from './RecruiterNotifications';
import PostPosition from './PostPosition';
import ViewLecturers from './ViewLecturers';
import ManagePositions from './ManagePositions';
import { useNotifications } from '../../context/NotificationContext';
import DashboardShell from '../shared/DashboardShell';
import { statusLabel as displayStatusLabel } from '../../utils/displayLabels';

const RecruiterDashboard = () => {
  const { t, language } = useLanguage();
  const [activeComponent, setActiveComponent] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { unreadCount } = useNotifications();
  const [summary, setSummary] = useState({ jobs: [], applications: [], interviews: [] });

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
        const jobsSnapshot = await getDocs(query(collection(db, 'positions'), where('postedBy.id', '==', user.uid), limit(12)));
        const jobs = jobsSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        const applicationSets = await Promise.all(jobs.slice(0, 12).map(job => getDocs(query(collection(db, 'applications'), where('positionId', '==', job.id), limit(12)))));
        const applications = applicationSets.flatMap(snapshot => snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
        const interviewsSnapshot = await getDocs(query(collection(db, 'interviews'), where('recruiterId', '==', user.uid), limit(12)));
        if (active) setSummary({ jobs, applications, interviews: interviewsSnapshot.docs.map(item => ({ id: item.id, ...item.data() })) });
      } catch (error) {
        if (active) setSummary({ jobs: [], applications: [], interviews: [] });
      }
    };
    loadSummary();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const section = searchParams.get('section');
    if (['applications','documents','ratings','notifications','send-notifications','interviews','post-position','manage-positions','view-lecturers'].includes(section)) {
      setActiveComponent(section);
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
      id: 'applications',
      title: t('recruiterDashboard.cards.applicationsTitle'),
      description: t('recruiterDashboard.cards.applicationsDesc'),
      icon: <FaUserGraduate className="h-6 w-6 text-primary-600" />,
      component: ViewApplications
    },
    {
      id: 'documents',
      title: t('recruiterDashboard.cards.documentsTitle'),
      description: t('recruiterDashboard.cards.documentsDesc'),
      icon: <FaClipboardList className="h-6 w-6 text-primary-600" />,
      component: ReviewDocuments
    },
    {
      id: 'ratings',
      title: t('recruiterDashboard.cards.ratingsTitle'),
      description: t('recruiterDashboard.cards.ratingsDesc'),
      icon: <FaStar className="h-6 w-6 text-primary-600" />,
      component: SendRatings
    },
    {
      id: 'notifications',
      title: t('recruiterDashboard.cards.notificationsTitle'),
      description: t('recruiterDashboard.cards.notificationsDesc'),
      icon: <FaBell className="h-6 w-6 text-primary-600" />,
      component: RecruiterNotifications,
      badge: unreadCount > 0 ? unreadCount : null
    },
    {
      id: 'send-notifications',
      title: t('recruiterDashboard.cards.sendNotificationsTitle'),
      description: t('recruiterDashboard.cards.sendNotificationsDesc'),
      icon: <FaEnvelope className="h-6 w-6 text-primary-600" />,
      component: SendNotifications
    },
    {
      id: 'interviews',
      title: t('recruiterDashboard.cards.interviewsTitle'),
      description: t('recruiterDashboard.cards.interviewsDesc'),
      icon: <FaCalendar className="h-6 w-6 text-primary-600" />,
      component: ManageInterviews
    },
    {
      id: 'post-position',
      title: t('recruiterDashboard.cards.postPositionTitle'),
      description: t('recruiterDashboard.cards.postPositionDesc'),
      icon: <FaBriefcase className="h-6 w-6 text-primary-600" />,
      component: PostPosition
    },
    {
      id: 'manage-positions',
      title: language==='ar'?'إدارة الوظائف المنشورة':'Manage Published Jobs',
      description: language==='ar'?'عرض الوظائف وإيقافها أو تفعيلها أو إغلاقها وأرشفتها':'View, pause, activate, close, or archive your jobs',
      icon: <FaBriefcase className="h-6 w-6 text-primary-600" />,
      component: ManagePositions
    },
    {
      id: 'view-lecturers',
      title: t('recruiterDashboard.cards.viewLecturersTitle'),
      description: t('recruiterDashboard.cards.viewLecturersDesc'),
      icon: <FaUserGraduate className="h-6 w-6 text-primary-600" />,
      component: ViewLecturers
    }
  ];

  const renderComponent = () => {
    const component = dashboardCards.find(card => card.id === activeComponent);
    if (component) {
      const Component = component.component;
      return <Component />;
    }
    return null;
  };
  const copy = language === 'ar' ? { jobs: 'الوظائف المنشورة', applications: 'الطلبات', interviews: 'المقابلات', unread: 'إشعارات غير مقروءة', recent: 'أحدث الطلبات', current: 'الوظائف الحالية', upcoming: 'المقابلات القادمة', application: 'طلب محاضر', job: 'وظيفة منشورة', interview: 'مقابلة', noApplications: 'لا توجد طلبات مرتبطة بوظائفك بعد.', noJobs: 'لا توجد وظائف منشورة حاليًا.', noInterviews: 'لا توجد مقابلات قادمة.' } : { jobs: 'Published jobs', applications: 'Applications', interviews: 'Interviews', unread: 'Unread notifications', recent: 'Recent applications', current: 'Current jobs', upcoming: 'Upcoming interviews', application: 'Lecturer application', job: 'Published job', interview: 'Interview', noApplications: 'No applications are linked to your jobs yet.', noJobs: 'No jobs are published yet.', noInterviews: 'No upcoming interviews.' };
  const overview = <>
    <div className="as-kpi-grid">
      {[[copy.jobs, summary.jobs.length, FaBriefcase], [copy.applications, summary.applications.length, FaUserGraduate], [copy.interviews, summary.interviews.length, FaCalendar], [copy.unread, unreadCount, FaBell]].map(([label, value, Icon]) => <div className="as-kpi-card" key={label}><span className="as-kpi-icon"><Icon /></span><div><span>{label}</span><b>{value}</b></div></div>)}
    </div>
    <div className="as-preview-grid">
      <section className="as-preview-card"><div className="as-preview-heading"><h2>{copy.recent}</h2><span>{summary.applications.length}</span></div>{summary.applications.slice(0, 3).map(item => <div className="as-preview-row" key={item.id}><span>{item.applicantName || item.lecturerName || copy.application}</span><em>{displayStatusLabel(item.status, language)}</em></div>)}{!summary.applications.length && <p className="as-preview-empty">{copy.noApplications}</p>}</section>
      <section className="as-preview-card"><div className="as-preview-heading"><h2>{copy.current}</h2><span>{summary.jobs.length}</span></div>{summary.jobs.slice(0, 3).map(item => <div className="as-preview-row" key={item.id}><span>{item.title || item.positionTitle || copy.job}</span><em>{displayStatusLabel(item.status, language)}</em></div>)}{!summary.jobs.length && <p className="as-preview-empty">{copy.noJobs}</p>}</section>
      <section className="as-preview-card"><div className="as-preview-heading"><h2>{copy.upcoming}</h2><span>{summary.interviews.filter(item => ['scheduled', 'rescheduled', 'interview_scheduled'].includes(item.status)).length}</span></div>{summary.interviews.filter(item => ['scheduled', 'rescheduled', 'interview_scheduled'].includes(item.status)).slice(0, 3).map(item => <div className="as-preview-row" key={item.id}><span>{item.candidateName || item.applicantName || copy.interview}</span><em>{displayStatusLabel(item.status, language)}</em></div>)}{!summary.interviews.some(item => ['scheduled', 'rescheduled', 'interview_scheduled'].includes(item.status)) && <p className="as-preview-empty">{copy.noInterviews}</p>}</section>
    </div>
  </>;

  return <>
      <DashboardShell
        cards={dashboardCards}
        activeId={activeComponent}
        onSelect={setActiveComponent}
        user={userData}
        roleLabel={language==='ar'?'مسؤول التوظيف':'Recruiter'}
        title={t('recruiterDashboard.welcomeUser', { name: userData?.firstName || 'Recruiter' })}
        subtitle={t('recruiterDashboard.subtext')}
        unreadCount={unreadCount}
        onLogout={handleLogoutClick}
        overview={overview}
      >
        {renderComponent()}
      </DashboardShell>
      {showLogoutModal && (
          <div className="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative p-7 border w-full max-w-md shadow-2xl rounded-3xl bg-white" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="recruiter-logout-title">
              <div className="text-center">
                <h3 id="recruiter-logout-title" className="text-xl font-black text-secondary-900">{t('dashboard.logoutConfirmTitle')}</h3>
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

export default RecruiterDashboard;
