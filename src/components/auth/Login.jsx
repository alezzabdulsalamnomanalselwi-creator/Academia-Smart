import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSwitcher from '../shared/LanguageSwitcher';
import ThemeSwitcher from '../shared/ThemeSwitcher';
import AuthHero from '../shared/AuthHero';

const Login = () => {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError(language === 'ar' ? 'أدخل البريد الإلكتروني وكلمة المرور.' : 'Enter your email and password.');
      return;
    }
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.accountStatus === 'suspended' || userData.accountStatus === 'blocked') {
          await signOut(auth);
          setError(userData.accountStatus === 'blocked' ? 'تم حظر حسابك. يرجى التواصل مع إدارة النظام.' : 'تم إيقاف حسابك مؤقتًا. يرجى التواصل مع إدارة النظام.');
          setLoading(false);
          return;
        }
        if (userData.role === 'admin') {
          navigate('/admin-dashboard');
        } else if (userData.role === 'recruiter') {
          navigate('/recruiter-dashboard');
        } else if (userData.role === 'lecturer') {
          navigate('/lecturer-dashboard');
        }
      } else {
        await signOut(auth);
        setError(language === 'ar' ? 'لم يتم العثور على ملف المستخدم.' : 'User profile not found.');
      }
    } catch (error) {
      if (auth.currentUser) await signOut(auth);
      setError(language === 'ar' ? 'تعذر تسجيل الدخول. تحقق من بيانات الحساب وحاول مجددًا.' : 'Failed to sign in. Please check your credentials.');
      console.error('Login error:', error);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <AuthHero />
      <section className="auth-content">
      {/* Top Header Bar */}
      <div className="auth-topbar">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Academia Smart" className="h-14 w-auto max-w-[190px] object-contain drop-shadow-md" />
        </Link>
        <div className="flex items-center gap-2"><ThemeSwitcher /><LanguageSwitcher /></div>
      </div>

      {/* Login Form */}
      <div className="auth-stage">
        <div className="auth-card-wrap">
          <div className="auth-card space-y-6">
            <div className="text-center space-y-2">
              <img src="/logo.png" alt="Academia Smart" className="h-20 w-auto mx-auto object-contain drop-shadow-md mb-2" />
              <h2 className="text-3xl font-bold leading-[1.4] text-secondary-900 tracking-tight">
                {t('auth.welcomeBack')}
              </h2>
              <p className="text-secondary-600">{t('auth.signInSub')}</p>
            </div>
            
            <form noValidate className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              )}
              
              <div className="space-y-5">
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      type={showPassword ? "text" : "password"}
                      required
                      className="appearance-none rounded-xl relative block w-full ps-12 pe-4 py-3 border border-secondary-200 
                               placeholder-secondary-400 text-secondary-900 focus:outline-none focus:ring-2 
                               focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder={t('auth.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  <button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute inset-y-0 end-0 pe-4 flex items-center text-secondary-400" aria-label={language==='ar'?'إظهار أو إخفاء كلمة المرور':'Show or hide password'}>{showPassword?<FaEyeSlash/>:<FaEye/>}</button>
                  </div>
                  <div className="mt-2 text-end"><Link to="/forgot-password" className="text-sm font-semibold text-primary-600">{language==='ar'?'نسيت كلمة المرور؟':'Forgot password?'}</Link></div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl 
                           shadow-lg text-sm font-bold text-white bg-[#0b1f3a] hover:bg-[#07172d] 
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('auth.signingIn') : t('auth.signInButton')}
                </button>
              </div>
            </form>

            <div className="text-center space-y-2 pt-2 border-t border-secondary-100">
              <p className="text-sm text-secondary-600">
                {t('auth.dontHaveAccount')}{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-primary-600 hover:text-primary-500 transition-colors duration-200"
                >
                  {t('auth.signUpLecturer')}
                </Link>
              </p>
              <p className="text-xs text-secondary-500">
                <Link
                  to="/recruiter-signup"
                  className="font-medium text-secondary-600 hover:text-primary-600 transition-colors duration-200"
                >
                  {t('auth.signUpRecruiter')}
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

export default Login;
