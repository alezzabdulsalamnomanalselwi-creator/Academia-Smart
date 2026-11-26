import ErrorBoundary from './components/system/ErrorBoundary';
import Unauthorized from './components/system/Unauthorized';
import NotFound from './components/system/NotFound';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import SmartAssistant from './components/shared/SmartAssistant';
import SignUp from './components/auth/SignUp';
import RecruiterSignUp from './components/auth/RecruiterSignUp';
import RecruiterDashboard from './components/dashboard/RecruiterDashboard';
import LecturerDashboard from './components/dashboard/LecturerDashboard';
import LecturerNotifications from './components/dashboard/LecturerNotifications';
import UploadDocuments from './components/dashboard/UploadDocuments';
import RequestRatings from './components/dashboard/RequestRatings';
import ViewRecruiters from './components/dashboard/ViewRecruiters';
import { NotificationProvider } from './context/NotificationContext';
import AdminDashboard from './components/dashboard/AdminDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SendRatings from './components/dashboard/SendRatings';

import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider><LanguageProvider>
      <Router>
        <NotificationProvider>
          <ErrorBoundary><div className="App">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route 
                path="/admin-dashboard" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/recruiter-signup" element={<RecruiterSignUp />} />
              <Route path="/recruiter-dashboard" element={<ProtectedRoute requiredRole="recruiter"><RecruiterDashboard /></ProtectedRoute>} />
              <Route path="/lecturer-dashboard" element={<ProtectedRoute requiredRole="lecturer"><LecturerDashboard /></ProtectedRoute>} />
              <Route path="/lecturer/notifications" element={<ProtectedRoute requiredRole="lecturer"><LecturerNotifications /></ProtectedRoute>} />
              <Route path="/lecturer/upload-documents" element={<ProtectedRoute requiredRole="lecturer"><UploadDocuments /></ProtectedRoute>} />
              <Route path="/lecturer/ratings" element={<ProtectedRoute requiredRole="lecturer"><RequestRatings /></ProtectedRoute>} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/recruiter-dashboard/send-ratings" element={<ProtectedRoute requiredRole="recruiter"><SendRatings /></ProtectedRoute>} />
              <Route path="/lecturer/recruiters" element={<ProtectedRoute requiredRole="lecturer"><ViewRecruiters /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <SmartAssistant />

          </div></ErrorBoundary>
        </NotificationProvider>
      </Router>
    </LanguageProvider></ThemeProvider>
  );
}

export default App;
