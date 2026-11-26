import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const ProtectedRoute = ({ children, requiredRole, requiredRoles, permission }) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState({ authenticated:false, authorized:false });
  const location = useLocation();

  useEffect(() => {
    let unsubscribeProfile = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeProfile = null;
      setLoading(true);
      if (!user) {
        setResult({ authenticated:false, authorized:false });
        setLoading(false);
        return;
      }
      unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async userDoc => {
        if (!userDoc.exists()) {
          await signOut(auth);
          setResult({ authenticated:false, authorized:false });
          setLoading(false);
          return;
        }
        const data = userDoc.data();
        if (['suspended','blocked'].includes(data.accountStatus)) {
          await signOut(auth);
          setResult({ authenticated:false, authorized:false });
          setLoading(false);
          return;
        }
        const roles = requiredRoles || (requiredRole ? [requiredRole] : []);
        const roleOk = !roles.length || roles.includes(data.role);
        const isLegacyAdmin = data.role === 'admin' && !data.adminLevel && !Array.isArray(data.permissions);
        const isSuper = data.role === 'admin' && (data.adminLevel === 'super' || data.isSuperAdmin === true || isLegacyAdmin);
        const permissions = Array.isArray(data.permissions) ? data.permissions : [];
        const permissionOk = !permission || isSuper || permissions.includes('*') || permissions.includes(permission);
        setResult({ authenticated:true, authorized: Boolean(roleOk && permissionOk) });
        setLoading(false);
      }, error => {
        console.error('Authorization check failed:', error);
        setResult({ authenticated:true, authorized:false });
        setLoading(false);
      });
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [requiredRole, requiredRoles, permission]);

  if (loading) return <div className="min-h-screen flex items-center justify-center" dir="rtl">جاري التحقق من الصلاحيات...</div>;
  if (!result.authenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!result.authorized) return <Navigate to="/unauthorized" replace />;
  return children;
};
export default ProtectedRoute;
