import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { FaUser, FaEnvelope, FaLock, FaUniversity, FaImage } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSwitcher from '../shared/LanguageSwitcher';
import AuthHero from '../shared/AuthHero';
import { submitRecruiterRequest } from '../../services/apiClient';

const RecruiterSignUp = () => {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
    profilePicture: null
  });
  const [previewURL, setPreviewURL] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // الجامعات تأتي مباشرة من لوحة الإدارة/Firebase. لا توجد قائمة ثابتة هنا.
  const [universities, setUniversities] = useState([]);
  const [universitiesLoading, setUniversitiesLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'universities'), where('active', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUniversities(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.name || '').localeCompare(b.name || '', language === 'ar' ? 'ar' : 'en')));
      setUniversitiesLoading(false);
    }, (err) => {
      console.error('Failed to load active universities:', err);
      setError(language === 'ar' ? 'تعذر تحميل الجامعات النشطة. أعد المحاولة.' : 'Could not load active universities. Please retry.');
      setUniversitiesLoading(false);
    });
    return unsubscribe;
  }, [language]);

  const handleChange = (e) => {
    if (e.target.name === 'profilePicture') {
      const file = e.target.files[0];
      if (file) {
        setFormData(prev => ({ ...prev, profilePicture: file }));
        setPreviewURL(URL.createObjectURL(file));
      }
    } else {
      setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    if (!formData.university) {
      setError(t('auth.pleaseSelectUniversity'));
      return;
    }

    setLoading(true);

    try {
      let profilePicUrl = '';
      if (formData.profilePicture) {
        const imageFormData = new FormData();
        imageFormData.append('file', formData.profilePicture);
        imageFormData.append('upload_preset', 'profilePic');
        imageFormData.append('cloud_name', 'dpwfyc3mm');
        imageFormData.append('api_key', '242576573136484');

        const response = await fetch(
          'https://api.cloudinary.com/v1_1/dpwfyc3mm/image/upload',
          {
            method: 'POST',
            body: imageFormData,
          }
        );

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${data.error?.message || 'Unknown error'}`);
        }

        if (data.secure_url) {
          profilePicUrl = data.secure_url;
        }
      }

      const selectedUniversity = universities.find(u => u.name === formData.university);
      if (!selectedUniversity) throw new Error(t('auth.pleaseSelectUniversity'));
      await submitRecruiterRequest({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        universityId: selectedUniversity.id,
        profilePicUrl
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Full error details:', error);
      setError(t('common.error') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/70 backdrop-blur-xl rounded-2xl shadow-soft p-8 text-center border border-secondary-100">
          <FaUniversity className="mx-auto h-12 w-12 text-primary-600 mb-4" />
          <h2 className="text-2xl font-bold text-secondary-900 mb-2">{t('auth.submitRequest')}</h2>
          <p className="text-secondary-600 mb-6">
            {t('auth.requestSubmitted')}
          </p>
          <Link
            to="/login"
            className="inline-flex justify-center py-3 px-6 border border-transparent rounded-xl 
                     shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                     transition-all duration-200"
          >
            {t('common.back')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <AuthHero />
      <section className="auth-content">
      {/* Header Bar */}
      <div className="auth-topbar">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Academia Smart" className="h-12 w-auto max-w-[180px] object-contain drop-shadow-md" />
        </Link>
        <LanguageSwitcher />
      </div>

      {/* Form Section */}
      <div className="auth-stage">
        <div className="auth-card-wrap">
          <div className="auth-card space-y-6">
            <div className="text-center space-y-2">
              <img src="/logo.png" alt="Academia Smart" className="h-16 w-auto mx-auto object-contain drop-shadow-md mb-2" />
              <h2 className="text-3xl font-bold text-secondary-900 tracking-tight">
                {t('auth.createRecruiterAccount')}
              </h2>
              <p className="text-secondary-600">{t('auth.recruiterSub')}</p>
            </div>
            
            <form noValidate className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              )}
              
              <div className="space-y-5">
                {/* Profile Picture Section */}
                <div className="flex justify-center">
                  <div className="space-y-3">
                    <label htmlFor="profilePicture" className="block text-sm font-medium text-secondary-700 text-center">
                      {t('auth.profilePicLabel')}
                    </label>
                    <div className="flex flex-col items-center space-y-3">
                      {previewURL ? (
                        <div className="relative">
                          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg">
                            <img 
                              src={previewURL} 
                              alt="Profile preview" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, profilePicture: null }));
                              setPreviewURL(null);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 
                                     hover:bg-red-600 transition-colors duration-200"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="w-28 h-28 rounded-full border-4 border-dashed border-secondary-200 flex items-center justify-center bg-secondary-50">
                          <FaUser className="h-10 w-10 text-secondary-400" />
                        </div>
                      )}
                      
                      <div className="flex justify-center">
                        <label
                          htmlFor="profilePicture"
                          className="cursor-pointer py-2 px-4 border border-secondary-300 rounded-xl 
                                   text-sm text-secondary-700 bg-white hover:bg-secondary-50 
                                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                                   transition-all duration-200 inline-flex items-center gap-2"
                        >
                          <FaImage className="h-5 w-5 text-secondary-400" />
                          <span>{formData.profilePicture ? t('auth.changePhoto') : t('auth.uploadPhoto')}</span>
                          <input
                            id="profilePicture"
                            name="profilePicture"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleChange}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-secondary-700 mb-1.5">
                      {t('auth.firstNameLabel')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                        <FaUser className="h-5 w-5 text-secondary-400" />
                      </div>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        className="appearance-none rounded-xl relative block w-full ps-12 pe-4 py-3 border border-secondary-200 
                                 placeholder-secondary-400 text-secondary-900 focus:outline-none focus:ring-2 
                                 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                        placeholder={t('auth.firstNamePlaceholder')}
                        value={formData.firstName}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-secondary-700 mb-1.5">
                      {t('auth.lastNameLabel')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                        <FaUser className="h-5 w-5 text-secondary-400" />
                      </div>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        className="appearance-none rounded-xl relative block w-full ps-12 pe-4 py-3 border border-secondary-200 
                                 placeholder-secondary-400 text-secondary-900 focus:outline-none focus:ring-2 
                                 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                        placeholder={t('auth.lastNamePlaceholder')}
                        value={formData.lastName}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {/* University Selection */}
                <div>
                  <label htmlFor="university" className="block text-sm font-medium text-secondary-700 mb-1.5">
                    {t('auth.universityLabel')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                      <FaUniversity className="h-5 w-5 text-secondary-400" />
                    </div>
                    <select
                      id="university"
                      name="university"
                      required
                      className="appearance-none rounded-xl relative block w-full ps-12 pe-4 py-3 border border-secondary-200 
                               placeholder-secondary-400 text-secondary-900 focus:outline-none focus:ring-2 
                               focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      value={formData.university}
                      onChange={handleChange}
                    >
                      <option value="">{universitiesLoading ? (language === 'ar' ? 'جاري تحميل الجامعات...' : 'Loading universities...') : t('auth.selectUniversity')}</option>
                      {universities.map((uni) => (
                        <option key={uni.id} value={uni.name}>
                          {uni.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1.5">
                    {t('auth.emailLabel')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                      <FaEnvelope className="h-5 w-5 text-secondary-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="appearance-none rounded-xl relative block w-full ps-12 pe-4 py-3 border border-secondary-200 
                               placeholder-secondary-400 text-secondary-900 focus:outline-none focus:ring-2 
                               focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder={t('auth.emailPlaceholder')}
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-1.5">
                    {t('auth.passwordLabel')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                      <FaLock className="h-5 w-5 text-secondary-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="appearance-none rounded-xl relative block w-full ps-12 pe-4 py-3 border border-secondary-200 
                               placeholder-secondary-400 text-secondary-900 focus:outline-none focus:ring-2 
                               focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder={t('auth.createPasswordPlaceholder')}
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700 mb-1.5">
                    {t('auth.confirmPasswordLabel')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                      <FaLock className="h-5 w-5 text-secondary-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      className="appearance-none rounded-xl relative block w-full ps-12 pe-4 py-3 border border-secondary-200 
                               placeholder-secondary-400 text-secondary-900 focus:outline-none focus:ring-2 
                               focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl 
                           shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('auth.submittingRequest') : t('auth.submitRequest')}
                </button>
              </div>
            </form>

            <div className="text-center pt-2 border-t border-secondary-100">
              <p className="text-sm text-secondary-600">
                {t('auth.alreadyHaveAccount')}{' '}
                <Link
                  to="/login"
                  className="font-semibold text-primary-600 hover:text-primary-500 transition-colors duration-200"
                >
                  {t('nav.login')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      </section>
    </div>
  );
};

export default RecruiterSignUp;
