import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { FaUser, FaSearch, FaSpinner, FaBell, FaStar, FaGraduationCap, FaBuilding, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import { coursesByDepartment } from './Profile';
import { useLanguage } from '../../context/LanguageContext';
import Toast from '../shared/Toast';
import { fileAccessErrorMessage, openProtectedFile } from '../../services/apiClient';

const ViewLecturers = () => {
  const { t, language } = useLanguage();
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [lecturerRatings, setLecturerRatings] = useState({});
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [recruiterName, setRecruiterName] = useState('');
  const [toast,setToast]=useState({message:'',type:'success'});
  const notify=(message,type='success')=>{setToast({message,type});setTimeout(()=>setToast({message:'',type:'success'}),3500)};

  const departments = [
    "Faculty of Business",
    "Faculty of Computer Science",
    "Faculty of Engineering",
    "Faculty of Arts",
    "Faculty of Science",
    "Faculty of Medicine",
    "Faculty of Law",
    "Faculty of Education",
    "Faculty of Social Sciences",
    "Faculty of Architecture",
    "Faculty of Economics",
    "Faculty of Mathematics",
    "Faculty of Psychology",
    "Faculty of Communication"
  ];

  useEffect(() => {
    fetchLecturers();
    // selectedDepartment is the only reactive input used by this fetch path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment]);

  useEffect(() => {
    const fetchRecruiterName = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const name = userData.firstName && userData.lastName 
            ? `${userData.firstName} ${userData.lastName}`
            : userData.firstName || 'Recruiter';
          setRecruiterName(name);
        }
      }
    };
    fetchRecruiterName();
  }, []);

  const fetchLecturerRatings = async (lecturerId) => {
    try {
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('lecturerId', '==', lecturerId),
        where('recruiterId', '==', auth.currentUser.uid)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery);
      const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating);
      
      if (ratings.length > 0) {
        const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        return {
          average: averageRating.toFixed(1),
          count: ratings.length
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching ratings:', error);
      return null;
    }
  };

  const fetchLecturers = async () => {
    try {
      let q = query(
        collection(db, 'users'),
        where('role', '==', 'lecturer')
      );

      if (selectedDepartment !== 'all') {
        q = query(q, where('department', '==', selectedDepartment));
      }

      const querySnapshot = await getDocs(q);
      const lecturersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const ratingsPromises = lecturersList.map(async (lecturer) => {
        const ratings = await fetchLecturerRatings(lecturer.id);
        return [lecturer.id, ratings];
      });

      const ratingsResults = await Promise.all(ratingsPromises);
      const ratingsMap = Object.fromEntries(ratingsResults);
      
      setLecturerRatings(ratingsMap);
      setLecturers(lecturersList);
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (lecturerId, lecturerName) => {
    setSendingNotification(true);
    try {
      const existing=query(collection(db,'notifications'),where('receiverId','==',lecturerId),where('senderId','==',auth.currentUser.uid),where('type','==','recruiter_interest'));
      const existingSnap=await getDocs(existing);
      if(!existingSnap.empty){notify(language==='ar'?'تم إرسال إبداء اهتمام لهذا المحاضر مسبقًا.':'Interest was already sent to this lecturer.','error');return;}
      const message = language === 'ar'
        ? `مرحباً ${lecturerName}، أبدى مسؤول التوظيف ${recruiterName} اهتمامه بملفك الشخصي، وسيتم التواصل معك قريباً بشأن فرص التوظيف المحتملة.`
        : `Hello ${lecturerName}, recruiter ${recruiterName} is interested in your profile and will contact you about potential opportunities.`;

      await addDoc(collection(db, 'notifications'), {
        receiverId: lecturerId,
        userId: lecturerId,
        receiver: { id: lecturerId, name: lecturerName },
        message: message,
        type: 'recruiter_interest',
        createdAt: serverTimestamp(),
        read: false,
        senderId: auth.currentUser.uid,
        senderName: recruiterName,
        sender: { id: auth.currentUser.uid, name: recruiterName, email: auth.currentUser.email || '' }
      });

      notify(t('viewLecturers.interestSuccessMsg'));
    } catch (error) {
      console.error('Error sending notification:', error);
      notify(t('viewLecturers.interestErrorMsg'),'error');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleViewProfile = (lecturer) => {
    setSelectedLecturer(lecturer);
  };

  const RatingStars = ({ rating }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-amber-400 fill-amber-400'
                : 'text-secondary-200'
            }`}
          />
        ))}
      </div>
    );
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

  const filteredLecturers = lecturers.filter(lecturer => {
    const matchesSearch = 
      lecturer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lecturer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lecturer.department?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = 
      selectedDepartment === 'all' || 
      lecturer.department === selectedDepartment;

    const matchesCourse = 
      selectedCourse === 'all' || 
      lecturer.teachingExperience?.some(exp => 
        exp.course === selectedCourse || 
        (exp.course === 'Other (Please Specify)' && exp.otherCourse?.toLowerCase().includes(selectedCourse.toLowerCase()))
      );

    return matchesSearch && matchesDepartment && matchesCourse;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin h-8 w-8 text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-4">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl shadow-soft">
          <FaGraduationCap className="h-6 w-6 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-br from-secondary-900 to-primary-700 bg-clip-text text-transparent">
          {t('viewLecturers.title')}
        </h2>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder={t('viewLecturers.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-secondary-200 rounded-xl shadow-soft 
                       bg-white/70 backdrop-blur-sm placeholder-secondary-400 text-sm
                       focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
            />
            <FaSearch className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-3.5 text-secondary-400`} />
          </div>
        </div>

        <div className="sm:w-64">
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedCourse('all');
            }}
            className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl shadow-soft
                     bg-white/70 backdrop-blur-sm text-secondary-700 text-sm font-medium
                     focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">{t('viewLecturers.allDepartments')}</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {((dept && dept !== 'undefined') ? (t(`departments.${dept}`) !== `departments.${dept}` ? t(`departments.${dept}`) : dept) : (language === 'ar' ? 'غير محدد' : 'Not specified'))}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-64">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl shadow-soft
                     bg-white/70 backdrop-blur-sm text-secondary-700 text-sm font-medium
                     focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">{t('viewLecturers.allCourses')}</option>
            {selectedDepartment !== 'all' && coursesByDepartment[selectedDepartment]?.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLecturers.map((lecturer) => (
          <div
            key={lecturer.id}
            className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-soft border border-secondary-100 
                     hover:shadow-card transition-all duration-300 flex flex-col justify-between"
          >
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 h-14 w-14">
                  {lecturer.profilePicUrl ? (
                    <img
                      className="h-14 w-14 rounded-2xl object-cover border-2 border-white shadow-soft"
                      src={lecturer.profilePicUrl}
                      alt={`${lecturer.firstName} ${lecturer.lastName}`}
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 
                                flex items-center justify-center shadow-soft border-2 border-white">
                      <FaUser className="h-6 w-6 text-primary-600" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-secondary-900">
                    {lecturer.firstName} {lecturer.lastName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <FaBuilding className="h-3.5 w-3.5 text-primary-600 flex-shrink-0" />
                    <p className="text-xs text-secondary-600 font-medium">
                      {((lecturer.department && lecturer.department !== 'undefined') ? (t(`departments.${lecturer.department}`) !== `departments.${lecturer.department}` ? t(`departments.${lecturer.department}`) : lecturer.department) : (language === 'ar' ? 'غير محدد' : 'Not specified'))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {lecturerRatings[lecturer.id] && (
                  <div className="flex items-center gap-2">
                    <RatingStars rating={parseFloat(lecturerRatings[lecturer.id].average)} />
                    <span className="text-xs text-secondary-600 font-medium">
                      {t('viewLecturers.reviewsCount', { count: lecturerRatings[lecturer.id].count })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 pt-0 border-t border-secondary-100/50 mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
                {lecturer.cvUrl && (
                  <button
                    type="button"
                    onClick={async()=>{try{await openProtectedFile(lecturer.cvUrl)}catch(error){notify(fileAccessErrorMessage(error),'error')}}}
                    className="inline-flex items-center px-3.5 py-2 rounded-xl bg-primary-50 
                             text-primary-700 hover:bg-primary-100 transition-all duration-200 text-xs font-semibold
                             shadow-sm border border-primary-100"
                  >
                    {t('viewLecturers.viewCv')}
                  </button>
                )}
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleViewProfile(lecturer)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary-50 
                             text-secondary-700 hover:bg-secondary-100 transition-all duration-200 text-xs font-semibold
                             shadow-sm border border-secondary-200"
                  >
                    <FaUser className="h-3.5 w-3.5" />
                    {t('viewLecturers.viewProfile')}
                  </button>
                  <button
                    onClick={() => handleSendNotification(lecturer.id, `${lecturer.firstName} ${lecturer.lastName}`)}
                    disabled={sendingNotification}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-600 
                             text-white hover:bg-primary-700 transition-all duration-200 text-xs font-semibold
                             shadow-sm hover:shadow-md disabled:bg-primary-400 disabled:cursor-not-allowed"
                  >
                    <FaBell className="h-3.5 w-3.5" />
                    {t('viewLecturers.sendRequest')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredLecturers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 bg-white/70 
                       backdrop-blur-xl rounded-2xl shadow-soft border border-secondary-100">
          <FaUser className="h-12 w-12 text-secondary-400 mb-4" />
          <h3 className="text-xl font-bold text-secondary-900">{t('viewLecturers.noLecturersTitle')}</h3>
          <p className="mt-2 text-secondary-600 text-sm">
            {t('viewLecturers.noLecturersMsg')}
          </p>
        </div>
      )}

      {/* Profile Modal */}
      {selectedLecturer && (
        <div className="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 md:p-8 border w-full max-w-4xl shadow-xl rounded-2xl bg-white/95 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl shadow-soft">
                    <FaGraduationCap className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-br from-secondary-900 to-primary-700 bg-clip-text text-transparent">
                    {t('viewLecturers.modalTitle')}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedLecturer(null)}
                  className="text-secondary-400 hover:text-secondary-600 transition-colors p-1"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6"><Toast message={toast.message} type={toast.type}/>
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <h5 className="text-xs font-semibold text-secondary-700 uppercase tracking-wider">{t('viewLecturers.firstName')}</h5>
                    <p className="text-secondary-900 bg-secondary-50/70 backdrop-blur-sm px-4 py-2.5 rounded-xl font-medium text-sm">
                      {selectedLecturer.firstName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-semibold text-secondary-700 uppercase tracking-wider">{t('viewLecturers.lastName')}</h5>
                    <p className="text-secondary-900 bg-secondary-50/70 backdrop-blur-sm px-4 py-2.5 rounded-xl font-medium text-sm">
                      {selectedLecturer.lastName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-semibold text-secondary-700 uppercase tracking-wider">{t('viewLecturers.phoneNumber')}</h5>
                    <p className="text-secondary-900 bg-secondary-50/70 backdrop-blur-sm px-4 py-2.5 rounded-xl font-medium text-sm dir-ltr text-start">
                      {selectedLecturer.phoneNumber}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-semibold text-secondary-700 uppercase tracking-wider">{t('viewLecturers.department')}</h5>
                    <p className="text-secondary-900 bg-secondary-50/70 backdrop-blur-sm px-4 py-2.5 rounded-xl font-medium text-sm">
                      {((selectedLecturer.department && selectedLecturer.department !== 'undefined') ? (t(`departments.${selectedLecturer.department}`) !== `departments.${selectedLecturer.department}` ? t(`departments.${selectedLecturer.department}`) : selectedLecturer.department) : (language === 'ar' ? 'غير محدد' : 'Not specified'))}
                    </p>
                  </div>
                </div>

                {/* Education Background */}
                <div className="space-y-1">
                  <h5 className="text-xs font-semibold text-secondary-700 uppercase tracking-wider">{t('viewLecturers.education')}</h5>
                  <p className="text-secondary-900 bg-secondary-50/70 backdrop-blur-sm px-4 py-3 rounded-xl font-medium text-sm">
                    {selectedLecturer.education}
                  </p>
                </div>

                {/* Teaching Experience */}
                <div className="space-y-4">
                  <h5 className="text-xs font-semibold text-secondary-700 uppercase tracking-wider">{t('viewLecturers.teachingExp')}</h5>
                  {selectedLecturer.teachingExperience?.map((exp, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-soft border border-secondary-100 space-y-4">
                      <div className="flex justify-between items-center">
                        <h6 className="font-bold text-secondary-900 text-sm">
                          {t('viewLecturers.expHeader', { number: index + 1 })}
                        </h6>
                        <div>
                          {exp.verificationStatus === 'verified' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                              <FaCheckCircle className="h-3.5 w-3.5" />
                              {t('viewLecturers.verifiedStatus')}
                            </span>
                          ) : exp.verificationStatus === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                              <FaTimesCircle className="h-3.5 w-3.5" />
                              {t('viewLecturers.rejectedStatus')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                              <FaClock className="h-3.5 w-3.5" />
                              {t('viewLecturers.pendingStatus')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-secondary-500">{t('viewLecturers.department')}</p>
                          <p className="text-secondary-900 bg-secondary-50/50 px-3.5 py-2 rounded-xl text-sm font-medium">
                            {((exp.department && exp.department !== 'undefined') ? (t(`departments.${exp.department}`) !== `departments.${exp.department}` ? t(`departments.${exp.department}`) : exp.department) : (language === 'ar' ? 'غير محدد' : 'Not specified'))}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-secondary-500">{t('viewLecturers.course')}</p>
                          <p className="text-secondary-900 bg-secondary-50/50 px-3.5 py-2 rounded-xl text-sm font-medium">
                            {exp.course === 'Other (Please Specify)' ? exp.otherCourse : exp.course}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-secondary-500">{t('viewLecturers.university')}</p>
                          <p className="text-secondary-900 bg-secondary-50/50 px-3.5 py-2 rounded-xl text-sm font-medium">
                            {t(`universities.${exp.university}`) || exp.university}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-secondary-500">{t('viewLecturers.rating')}</p>
                          <div className="flex items-center gap-2 bg-secondary-50/50 px-3.5 py-2 rounded-xl">
                            <RatingStars rating={parseInt(exp.rating)} />
                            <span className="text-secondary-700 text-xs font-bold">({exp.rating}/5)</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-secondary-500">{t('viewLecturers.courseDesc')}</p>
                        <p className="text-secondary-900 bg-secondary-50/50 px-3.5 py-2 rounded-xl text-sm">
                          {exp.description}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-secondary-500">{t('viewLecturers.opinion')}</p>
                        <p className="text-secondary-900 bg-secondary-50/50 px-3.5 py-2 rounded-xl text-sm">
                          {exp.opinion}
                        </p>
                      </div>

                      {exp.verifiedBy && (
                        <div className="pt-3 border-t border-secondary-100 text-xs text-secondary-500 font-medium">
                          {t('viewLecturers.verifiedBy', { 
                            university: t(`universities.${exp.verifiedBy.university}`) || exp.verifiedBy.university, 
                            date: formatDate(exp.verifiedBy.timestamp) 
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* CV Link and Close Button */}
                <div className="pt-4 border-t border-secondary-100 flex items-center justify-end gap-3">
                  {selectedLecturer.cvUrl && (
                    <button
                      type="button"
                    onClick={async()=>{try{await openProtectedFile(selectedLecturer.cvUrl)}catch(error){notify(fileAccessErrorMessage(error),'error')}}}
                      className="inline-flex items-center px-4 py-2.5 rounded-xl bg-primary-50 
                               text-primary-700 hover:bg-primary-100 transition-all duration-200 text-sm font-semibold
                               shadow-sm border border-primary-100"
                    >
                      {t('viewLecturers.viewCv')}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedLecturer(null)}
                    className="inline-flex items-center px-5 py-2.5 rounded-xl bg-secondary-100 
                             text-secondary-700 hover:bg-secondary-200 transition-all duration-200 text-sm font-semibold"
                  >
                    {t('viewLecturers.close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewLecturers;
