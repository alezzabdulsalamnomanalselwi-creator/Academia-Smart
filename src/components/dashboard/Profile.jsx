import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../firebase/config';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { FaSpinner, FaStar, FaCheckCircle, FaClock, FaTimesCircle, FaTrash, FaUserGraduate } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import Toast from '../shared/Toast';
import { isLikelyDocumentUrl } from '../../utils/validation';
import DocumentUploader from '../shared/DocumentUploader';
import { updateOwnProfile } from '../../services/apiClient';

export const coursesByDepartment = {
  "Faculty of Business": [
    "Principles of Management",
    "Marketing Fundamentals",
    "Financial Accounting",
    "Business Ethics",
    "Human Resource Management",
    "Entrepreneurship & Innovation",
    "Business Statistics",
    "Supply Chain Management"
  ],
  "Faculty of Computer Science": [
    "Introduction to IT",
    "Problem Solving & Algorithms",
    "C# Programming",
    "Database Systems",
    "Operating Systems",
    "Software Engineering",
    "Web Development",
    "Artificial Intelligence",
    "Cybersecurity Fundamentals"
  ],
  "Faculty of Engineering": [
    "Introduction to Engineering",
    "Materials Science",
    "Structural Analysis",
    "Fluid Mechanics",
    "Thermodynamics",
    "Control Systems",
    "Project Management",
    "Environmental Engineering",
    "Renewable Energy Technologies"
  ],
  "Faculty of Arts": [
    "Introduction to Literature",
    "History of Art",
    "Philosophy of Art",
    "Theater History",
    "Creative Writing",
    "Art Criticism",
    "World Literature",
    "Cultural Studies"
  ],
  "Faculty of Science": [
    "Introduction to Biology",
    "Chemistry for Non-Chemists",
    "Physics for Non-Physicists",
    "Environmental Science",
    "Data Analysis",
    "Genetic Engineering",
    "Astrophysics",
    "Mathematical Modeling"
  ],
  "Faculty of Medicine": [
    "Introduction to Medicine",
    "Anatomy and Physiology",
    "Medical Ethics",
    "Public Health",
    "Clinical Skills",
    "Pharmacology",
    "Medical Imaging",
    "Geriatrics"
  ],
  "Faculty of Law": [
    "Introduction to Law",
    "Civil Law",
    "Criminal Law",
    "International Law",
    "Constitutional Law",
    "Tax Law",
    "Human Rights",
    "Legal Ethics"
  ],
  "Faculty of Education": [
    "Introduction to Education",
    "Educational Psychology",
    "Curriculum Development",
    "Classroom Management",
    "Assessment and Evaluation",
    "Educational Technology",
    "Special Education",
    "Adult Education"
  ],
  "Faculty of Social Sciences": [
    "Introduction to Sociology",
    "Psychology of Social Groups",
    "Political Science",
    "Economic Theory",
    "Social Research Methods",
    "Urban Sociology",
    "International Relations",
    "Social Policy"
  ],
  "Faculty of Architecture": [
    "Introduction to Architecture",
    "Building Design",
    "Structural Design",
    "Urban Design",
    "Building Technology",
    "Sustainable Architecture",
    "Architectural History",
    "Architectural Theory"
  ],
  "Faculty of Economics": [
    "Introduction to Economics",
    "Microeconomics",
    "Macroeconomics",
    "Economic Theory",
    "International Trade",
    "Development Economics",
    "Public Finance",
    "Economic Policy"
  ],
  "Faculty of Mathematics": [
    "Introduction to Mathematics",
    "Calculus",
    "Linear Algebra",
    "Discrete Mathematics",
    "Real Analysis",
    "Complex Analysis",
    "Probability Theory",
    "Mathematical Statistics"
  ],
  "Faculty of Psychology": [
    "Introduction to Psychology",
    "Developmental Psychology",
    "Cognitive Psychology",
    "Social Psychology",
    "Clinical Psychology",
    "Industrial-Organizational Psychology",
    "Psychological Assessment",
    "Psychological Treatment"
  ],
  "Faculty of Communication": [
    "Introduction to Communication",
    "Media Theory",
    "Public Speaking",
    "Digital Communication",
    "Visual Communication",
    "Interpersonal Communication",
    "Organizational Communication",
    "Cultural Studies"
  ],
  "Others": ["Other (Please Specify)"]
};

const Profile = () => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast({ message: '', type: 'success' }), 4500);
  };
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    education: '',
    phoneNumber: '',
    department: '',
    cvUrl: '',
    certificatesUrl: ''
  });

  const [academic,setAcademic]=useState({universities:[],colleges:[],departments:[],subjects:[]});
  const [skills,setSkills]=useState([]); const [newSkill,setNewSkill]=useState(''); const [yearsExperience,setYearsExperience]=useState('');
  const [teachingExperience, setTeachingExperience] = useState([
    { 
      universityId:'', collegeId:'', departmentId:'', subjectId:'',
      department: '',
      course: '', 
      university: '', 
      description: '', 
      opinion: '', 
      rating: '5',
      verificationStatus: 'pending',
      verified: false,
      verifiedBy: null,
      verificationId: null,
      otherCourse: ''
    }
  ]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const [userDoc, uniSnap, colSnap, depSnap, subSnap] = await Promise.all([getDoc(doc(db, 'users', currentUser.uid)),getDocs(collection(db,'universities')),getDocs(collection(db,'colleges')),getDocs(collection(db,'departments')),getDocs(collection(db,'subjects'))]);
        setAcademic({universities:uniSnap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.active!==false),colleges:colSnap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.active!==false),departments:depSnap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.active!==false),subjects:subSnap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.active!==false)});
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfile({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            education: userData.education || '',
            phoneNumber: userData.phoneNumber || '',
            department: userData.department || '',
            cvUrl: userData.cvUrl || '',
            certificatesUrl: userData.certificatesUrl || ''
          });
          setSkills(Array.isArray(userData.skills)?userData.skills:[]); setYearsExperience(userData.yearsExperience||'');
          if (userData.teachingExperience) { setTeachingExperience(userData.teachingExperience.map(x=>({universityId:'',collegeId:'',departmentId:'',subjectId:'',...x}))); }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const sendUniversityVerificationRequest = async (experienceData, index) => {
    try {
      const currentUser = auth.currentUser;
      
      const recruitersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'recruiter'),
        where('university', '==', experienceData.university)
      );

      const querySnapshot = await getDocs(recruitersQuery);
      
      if (querySnapshot.empty) {
        return;
      }

      for (const recruiterDoc of querySnapshot.docs) {
        const recruiterData = recruiterDoc.data();
        
        const verificationRequest = {
          type: 'course_verification',
          status: 'pending',
          lecturerId: currentUser.uid,
          lecturerName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Lecturer',
          lecturerEmail: currentUser.email || '',
          recruiterId: recruiterDoc.id,
          recruiterName: `${recruiterData.firstName || ''} ${recruiterData.lastName || ''}`.trim() || 'Recruiter',
          university: experienceData.university || '',
          department: experienceData.department || '',
          course: experienceData.course === 'Other (Please Specify)' ? (experienceData.otherCourse || '') : (experienceData.course || ''),
          description: experienceData.description || '',
          opinion: experienceData.opinion || '',
          rating: experienceData.rating || '5',
          experienceIndex: index,
          createdAt: serverTimestamp(),
          read: false
        };

        const docRef = await addDoc(collection(db, 'verifications'), verificationRequest);
        
        await addDoc(collection(db, 'notifications'), {
          type: 'course_verification',
          title: 'New Course Verification Request',
          message: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() + ` requested verification for teaching course: ${verificationRequest.course}`,
          sender: {
            id: currentUser.uid,
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            email: currentUser.email || ''
          },
          receiver: {
            id: recruiterDoc.id,
            name: `${recruiterData.firstName || ''} ${recruiterData.lastName || ''}`.trim() || 'Recruiter',
            email: recruiterData.email || ''
          },
          verificationId: docRef.id,
          createdAt: serverTimestamp(),
          read: false
        });
      }
    } catch (error) {
      console.error('Error sending verification request:', error);
    }
  };

  const handleTeachingExperienceChange = (index, field, value) => {
    const newTeachingExperience = [...teachingExperience];
    const oldExperience = newTeachingExperience[index];
    
    newTeachingExperience[index] = {
      ...oldExperience,
      [field]: value
    };

    if (field === 'university' && value !== oldExperience.university) {
      newTeachingExperience[index].verificationStatus = 'pending';
      newTeachingExperience[index].verified = false;
      newTeachingExperience[index].verifiedBy = null;
      newTeachingExperience[index].verificationId = null;

      if (value && newTeachingExperience[index].course && newTeachingExperience[index].department) {
        sendUniversityVerificationRequest(newTeachingExperience[index], index);
      }
    }

    if ((field === 'course' || field === 'department') && newTeachingExperience[index].university) {
      newTeachingExperience[index].verificationStatus = 'pending';
      newTeachingExperience[index].verified = false;
      newTeachingExperience[index].verifiedBy = null;
      newTeachingExperience[index].verificationId = null;

      if (value && newTeachingExperience[index].university) {
        sendUniversityVerificationRequest(newTeachingExperience[index], index);
      }
    }

    setTeachingExperience(newTeachingExperience);
  };

  const addTeachingExperience = () => {
    setTeachingExperience([
      ...teachingExperience,
      { 
        universityId:'', collegeId:'', departmentId:'', subjectId:'',
        department: '',
        course: '', 
        university: '', 
        description: '', 
        opinion: '', 
        rating: '5',
        verificationStatus: 'pending',
        verified: false,
        verifiedBy: null,
        verificationId: null,
        otherCourse: ''
      }
    ]);
  };

  const removeTeachingExperience = (index) => {
    setTeachingExperience(teachingExperience.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (profile.cvUrl && !isLikelyDocumentUrl(profile.cvUrl)) {
        showToast(language === 'ar' ? 'رابط السيرة الذاتية غير صالح. استخدم رابط ملف PDF/Word/صورة أو Google Drive موثوق.' : 'Invalid CV link. Use a PDF/Word/image file link or a trusted Google Drive link.', 'error');
        return;
      }
      if (profile.certificatesUrl && !isLikelyDocumentUrl(profile.certificatesUrl)) {
        showToast(language === 'ar' ? 'رابط الشهادات غير صالح. استخدم رابط ملف PDF/Word/صورة أو Google Drive موثوق.' : 'Invalid certificates link. Use a PDF/Word/image file link or a trusted Google Drive link.', 'error');
        return;
      }
      for (let i = 0; i < teachingExperience.length; i++) {
        const exp = teachingExperience[i];
        if (exp.university && exp.course && exp.department && !exp.verificationId) {
          await sendUniversityVerificationRequest(exp, i);
        }
      }

      const sanitizedTeachingExperience = teachingExperience.map(exp => ({
        universityId: exp.universityId || '', collegeId: exp.collegeId || '', departmentId: exp.departmentId || '', subjectId: exp.subjectId || '',
        department: exp.department || academic.departments.find(x=>x.id===exp.departmentId)?.name || '',
        course: exp.course || academic.subjects.find(x=>x.id===exp.subjectId)?.name || '',
        university: exp.university || academic.universities.find(x=>x.id===exp.universityId)?.name || '',
        description: exp.description || '',
        opinion: exp.opinion || '',
        rating: exp.rating || '5',
        verificationStatus: exp.verificationStatus || 'pending',
        verified: Boolean(exp.verified),
        verifiedBy: exp.verifiedBy || null,
        verificationId: exp.verificationId || null,
        otherCourse: exp.otherCourse || ''
      }));

      const result = await updateOwnProfile({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        education: profile.education || '',
        department: profile.department || '',
        cvUrl: profile.cvUrl || '',
        certificatesUrl: profile.certificatesUrl || '',
        teachingExperience: sanitizedTeachingExperience, skills, yearsExperience: yearsExperience || ''
      });
      if (Array.isArray(result.teachingExperience)) setTeachingExperience(result.teachingExperience);

      showToast(t('profile.saveSuccessMsg'));
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast(t('common.error') + ': ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const profileCompleteness=useMemo(()=>{const checks=[profile.firstName,profile.lastName,profile.education,profile.phoneNumber,profile.department,profile.cvUrl,profile.certificatesUrl,yearsExperience,skills.length,teachingExperience.some(x=>x.description||x.subjectId||x.course)];return Math.round(checks.filter(Boolean).length/checks.length*100)},[profile,yearsExperience,skills,teachingExperience]);
  const addSkill=()=>{const v=newSkill.trim();if(v&&!skills.some(x=>x.toLowerCase()===v.toLowerCase()))setSkills([...skills,v]);setNewSkill('')};
  const updateAcademicExperience=(index,field,value)=>{const list=[...teachingExperience];let exp={...list[index],[field]:value};if(field==='universityId'){exp.collegeId='';exp.departmentId='';exp.subjectId='';}if(field==='collegeId'){exp.departmentId='';exp.subjectId='';}if(field==='departmentId'){exp.subjectId='';}const uni=academic.universities.find(x=>x.id===exp.universityId),dep=academic.departments.find(x=>x.id===exp.departmentId),sub=academic.subjects.find(x=>x.id===exp.subjectId);exp.university=uni?.name||exp.university||'';exp.department=dep?.name||'';exp.course=sub?.name||'';list[index]=exp;setTeachingExperience(list)};

  const handleUrlUpdate = async (type, url) => {
    try {
      const currentUser = auth.currentUser;
      const userRef = doc(db, 'users', currentUser.uid);
      const safeUrl = (url || '').trim();
      if (safeUrl && !isLikelyDocumentUrl(safeUrl)) {
        showToast(language === 'ar' ? 'الرابط غير صالح. استخدم رابط ملف مستند/صورة أو خدمة تخزين موثوقة.' : 'Invalid link. Use a document/image file URL or a trusted storage link.', 'error');
        return;
      }
      
      const updateData = type === 'cv' ? { cvUrl: safeUrl } : { certificatesUrl: safeUrl };
      await updateDoc(userRef, updateData);

      setProfile(prev => ({
        ...prev,
        [type === 'cv' ? 'cvUrl' : 'certificatesUrl']: safeUrl
      }));

      showToast(t('profile.linkSaveSuccessMsg'));
    } catch (error) {
      console.error('Error updating URL:', error);
      showToast(t('common.error') + ': ' + error.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin h-8 w-8 text-primary-600" />
      </div>
    );
  }

  return (
    <div className="profile-page max-w-5xl mx-auto p-1 sm:p-3">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
      <div className="bg-white rounded-3xl shadow-soft border border-secondary-100 overflow-hidden">
        <header className="relative overflow-hidden bg-gradient-to-l from-primary-950 via-primary-900 to-primary-800 p-6 sm:p-8 text-white">
          <div className="absolute -left-12 -top-16 h-48 w-48 rounded-full bg-teal-400/20 blur-2xl"/>
          <div className="relative flex flex-wrap items-center justify-between gap-5"><div className="flex items-center gap-4"><div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/15 grid place-items-center text-2xl"><FaUserGraduate/></div><div><p className="text-xs font-bold text-cyan-200">الملف الأكاديمي</p><h2 className="mt-1 text-2xl font-black">{`${profile.firstName||''} ${profile.lastName||''}`.trim()||t('profile.title')}</h2><p className="mt-1 text-sm text-blue-100">محاضر • Academia Smart</p></div></div><div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-center"><b className="block text-2xl">{profileCompleteness}%</b><span className="text-xs text-blue-100">اكتمال الملف</span></div></div>
        </header>
        <div className="p-6 sm:p-8">
          <nav className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-secondary-200 bg-secondary-50 p-2" aria-label="أقسام الملف الشخصي">{[['profile-overview','نظرة عامة'],['profile-qualifications','المؤهلات'],['profile-experience','الخبرات'],['profile-skills','المهارات'],['profile-documents','المستندات']].map(([id,label])=><button type="button" key={id} onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})} className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-bold text-secondary-700 shadow-sm hover:text-primary-700">{label}</button>)}</nav>

          <section id="profile-overview" className="mb-6 bg-gradient-to-l from-primary-50 to-cyan-50 border border-primary-100 rounded-2xl p-5 scroll-mt-24"><div className="flex justify-between gap-3 items-center"><div><h3 className="font-black">اكتمال الملف الأكاديمي</h3><p className="text-sm text-secondary-500">أكمل البيانات والخبرة والمهارات والمستندات لتحسين المطابقة الذكية.</p></div><b className="text-primary-700 text-xl">{profileCompleteness}%</b></div><div className="h-2.5 bg-white rounded-full mt-3 overflow-hidden"><div className="h-full bg-gradient-to-l from-primary-600 to-teal-500 rounded-full" style={{width:`${profileCompleteness}%`}}/></div><div className="grid md:grid-cols-2 gap-3 mt-4"><input type="number" min="0" max="60" value={yearsExperience} onChange={e=>setYearsExperience(e.target.value)} className="border rounded-xl p-3" placeholder="سنوات الخبرة"/><div id="profile-skills" className="flex gap-2 scroll-mt-24"><input value={newSkill} onChange={e=>setNewSkill(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addSkill()}}} className="border rounded-xl p-3 flex-1" placeholder="أضف مهارة"/><button type="button" onClick={addSkill} className="bg-primary-600 text-white rounded-xl px-4">إضافة</button></div></div><div className="flex flex-wrap gap-2 mt-3">{skills.map(x=><button type="button" key={x} onClick={()=>setSkills(skills.filter(s=>s!==x))} className="px-3 py-1 rounded-full bg-white border border-primary-100 text-primary-700 text-sm font-semibold">{x} ×</button>)}</div></section>

      <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info Section */}
            <div id="profile-qualifications" className="grid grid-cols-1 gap-6 md:grid-cols-2 scroll-mt-24">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  {t('auth.firstNameLabel')}
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                           bg-white transition-all duration-200 text-sm"
                  placeholder={t('auth.firstNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  {t('auth.lastNameLabel')}
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                           bg-white transition-all duration-200 text-sm"
                  placeholder={t('auth.lastNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  {t('auth.phoneLabel')}
                </label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={profile.phoneNumber}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 
                           bg-secondary-50 text-secondary-500 cursor-not-allowed text-sm dir-ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  {t('profile.departmentLabel')}
                </label>
                <select
                  name="department"
                  value={profile.department}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                           bg-white transition-all duration-200 text-sm"
                >
                  <option value="">{t('profile.selectDeptPlaceholder')}</option>
                  {Object.keys(coursesByDepartment).map((dept) => (
                    <option key={dept} value={dept}>
                      {((dept && dept !== 'undefined') ? (t(`departments.${dept}`) !== `departments.${dept}` ? t(`departments.${dept}`) : dept) : (language === 'ar' ? 'غير محدد' : 'Not specified'))}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  {t('profile.educationLabel')}
                </label>
                <textarea
                  name="education"
                  value={profile.education}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                           bg-white transition-all duration-200 text-sm"
                  placeholder={t('profile.educationPlaceholder')}
                />
              </div>
            </div>

            {/* Teaching Experience Section */}
            <div id="profile-experience" className="space-y-6 pt-4 border-t border-secondary-100 scroll-mt-24">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-secondary-900">{t('profile.teachingExpTitle')}</h3>
                <button
                  type="button"
                  onClick={addTeachingExperience}
                  className="inline-flex items-center px-4 py-2 border border-transparent 
                           text-sm font-medium rounded-xl shadow-sm text-white 
                           bg-primary-600 hover:bg-primary-700 focus:outline-none 
                           focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                           transition-all duration-200"
                >
                  {t('profile.addExpBtn')}
                </button>
              </div>

              {teachingExperience.map((exp, index) => (
                <div key={index} className="relative bg-secondary-50/50 rounded-2xl p-6 border border-secondary-200 space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-base font-semibold text-secondary-900 flex items-center">
                      {t('profile.expHeader', { number: index + 1 })}
                      {exp.verificationStatus === 'verified' && (
                        <span className="ms-2 text-blue-500" title="Verified by university">
                          <FaCheckCircle className="inline-block h-5 w-5" />
                        </span>
                      )}
                      {exp.verificationStatus === 'pending' && (
                        <span className="ms-2 text-yellow-500" title="Verification pending">
                          <FaClock className="inline-block h-5 w-5" />
                        </span>
                      )}
                      {exp.verificationStatus === 'rejected' && (
                        <span className="ms-2 text-red-500" title="Verification rejected">
                          <FaTimesCircle className="inline-block h-5 w-5" />
                        </span>
                      )}
                    </h4>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeTeachingExperience(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div><label className="block text-sm font-medium text-secondary-700 mb-2">الجامعة</label><select value={exp.universityId||''} onChange={e=>updateAcademicExperience(index,'universityId',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 bg-white" required><option value="">اختر الجامعة</option>{academic.universities.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-secondary-700 mb-2">الكلية</label><select value={exp.collegeId||''} disabled={!exp.universityId} onChange={e=>updateAcademicExperience(index,'collegeId',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 bg-white disabled:bg-secondary-50" required><option value="">اختر الكلية</option>{academic.colleges.filter(x=>x.universityId===exp.universityId).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-secondary-700 mb-2">القسم الأكاديمي</label><select value={exp.departmentId||''} disabled={!exp.collegeId} onChange={e=>updateAcademicExperience(index,'departmentId',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 bg-white disabled:bg-secondary-50" required><option value="">اختر القسم</option>{academic.departments.filter(x=>x.collegeId===exp.collegeId).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-secondary-700 mb-2">المادة</label><select value={exp.subjectId||''} disabled={!exp.departmentId} onChange={e=>updateAcademicExperience(index,'subjectId',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 bg-white disabled:bg-secondary-50" required><option value="">اختر المادة</option>{academic.subjects.filter(x=>x.departmentId===exp.departmentId).map(x=><option key={x.id} value={x.id}>{x.name}{x.code?` (${x.code})`:''}</option>)}</select></div>
                    {(exp.department&&!exp.departmentId)&&<div className="md:col-span-2 text-xs bg-amber-50 text-amber-800 rounded-xl p-3">هذه خبرة قديمة محفوظة كنص: {exp.university||'جامعة غير محددة'} • {exp.department||'قسم غير محدد'} • {exp.course||'مادة غير محددة'}. اختر العلاقات الجديدة أعلاه عند تعديلها.</div>}

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        {t('profile.courseDescLabel')}
                      </label>
                      <textarea
                        value={exp.description}
                        onChange={(e) => handleTeachingExperienceChange(index, 'description', e.target.value)}
                        required
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 
                                 focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                                 bg-white transition-all duration-200 text-sm"
                        placeholder={t('profile.courseDescPlaceholder')}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        {t('profile.opinionLabel')}
                      </label>
                      <textarea
                        value={exp.opinion}
                        onChange={(e) => handleTeachingExperienceChange(index, 'opinion', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 
                                 focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                                 bg-white transition-all duration-200 text-sm"
                        placeholder={t('profile.opinionPlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        {t('profile.courseRatingLabel')}
                      </label>
                      <div className="flex items-center gap-4">
                        <select
                          value={exp.rating}
                          onChange={(e) => handleTeachingExperienceChange(index, 'rating', e.target.value)}
                          className="w-24 px-4 py-2.5 rounded-xl border border-secondary-200 
                                   focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                                   bg-white transition-all duration-200 text-sm"
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                        </select>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FaStar
                              key={star}
                              className={`h-5 w-5 ${
                                star <= parseInt(exp.rating)
                                  ? 'text-yellow-400'
                                  : 'text-secondary-200'
                              } transition-colors duration-200`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Direct document upload */}
            <div id="profile-documents" className="space-y-5 pt-4 border-t border-secondary-100 scroll-mt-24">
              <div className="rounded-xl bg-primary-50 border border-primary-100 p-4 text-sm text-primary-900">
                ارفع السيرة الذاتية والشهادات مباشرة من جهازك. يتم حفظ رابط الملف تلقائياً في ملفك الشخصي بعد اكتمال الرفع.
              </div>
              <DocumentUploader
                kind="cv"
                label="رفع السيرة الذاتية (CV)"
                value={profile.cvUrl}
                onError={(message) => showToast(message, 'error')}
                onUploaded={async (file) => {
                  setProfile(prev => ({ ...prev, cvUrl: file.url }));
                  await handleUrlUpdate('cv', file.url);
                  showToast('تم رفع السيرة الذاتية وحفظها بنجاح.');
                }}
              />
              <DocumentUploader
                kind="certificates"
                label="رفع الشهادات والمرفقات"
                value={profile.certificatesUrl}
                onError={(message) => showToast(message, 'error')}
                onUploaded={async (file) => {
                  setProfile(prev => ({ ...prev, certificatesUrl: file.url }));
                  await handleUrlUpdate('certificates', file.url);
                  showToast('تم رفع الشهادات وحفظها بنجاح.');
                }}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-secondary-100">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 border border-transparent 
                         text-sm font-medium rounded-xl shadow-sm text-white 
                         bg-primary-600 hover:bg-primary-700 focus:outline-none 
                         focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                         disabled:bg-primary-400 transition-all duration-200
                         hover:shadow-md"
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin h-5 w-5" />
                    {t('profile.saving')}
                  </>
                ) : (
                  t('profile.saveProfileBtn')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
