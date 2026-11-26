import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, addDoc, query, getDocs, where, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { FaSpinner, FaBell } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import Toast from '../shared/Toast';

const SendNotifications = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentRecruiter, setCurrentRecruiter] = useState(null);
  const [toast,setToast]=useState({message:'',type:'success'});
  const notify=(message,type='success')=>{setToast({message,type});setTimeout(()=>setToast({message:'',type:'success'}),3500)};
  const [notification, setNotification] = useState({
    title: '',
    message: '',
    type: 'document',
    selectedUsers: []
  });

  useEffect(() => {
    fetchUsers();
    fetchCurrentRecruiter();
  }, []);

  const fetchCurrentRecruiter = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const recruiterDoc = await getDoc(doc(db, 'users', user.uid));
        if (recruiterDoc.exists()) {
          setCurrentRecruiter({
            id: user.uid,
            email: user.email,
            ...recruiterDoc.data()
          });
        }
      }
    } catch (error) {
      console.error('Error fetching recruiter details:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'lecturer'));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      const notificationsRef = collection(db, 'notifications');
      
      const promises = notification.selectedUsers.map(async userId => {
        const lecturer = users.find(user => user.id === userId);
        
        if (!lecturer) {
          console.error('Lecturer not found:', userId);
          return;
        }

        const senderName = currentRecruiter?.firstName && currentRecruiter?.lastName
          ? `${currentRecruiter.firstName} ${currentRecruiter.lastName}`
          : 'Recruiter';

        const receiverName = lecturer.firstName && lecturer.lastName
          ? `${lecturer.firstName} ${lecturer.lastName}`
          : lecturer.name || 'Lecturer';

        const notificationData = {
          userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          status: 'unread',
          createdAt: serverTimestamp(),
          sender: {
            id: currentUser.uid,
            name: senderName,
            email: currentUser.email,
            role: 'recruiter'
          },
          receiver: {
            id: userId,
            name: receiverName,
            email: lecturer.email,
            role: 'lecturer'
          }
        };

        await addDoc(notificationsRef, notificationData);
      });

      await Promise.all(promises);

      setNotification({
        title: '',
        message: '',
        type: 'document',
        selectedUsers: []
      });

      notify(t('sendNotifications.successMsg'));
    } catch (error) {
      console.error('Error sending notifications:', error);
      notify(t('sendNotifications.errorMsg'),'error');
    } finally {
      setSending(false);
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
    <div className="max-w-4xl mx-auto py-4"><Toast message={toast.message} type={toast.type}/>
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl shadow-soft">
          <FaBell className="h-6 w-6 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-br from-secondary-900 to-primary-700 bg-clip-text text-transparent">
          {t('sendNotifications.title')}
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white/70 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-secondary-100 shadow-soft">
        <div>
          <label className="block text-sm font-semibold text-secondary-900 mb-2">
            {t('sendNotifications.selectLecturersLabel')}
          </label>
          <select
            multiple
            value={notification.selectedUsers}
            onChange={(e) => setNotification({
              ...notification,
              selectedUsers: Array.from(e.target.selectedOptions, option => option.value)
            })}
            className="mt-1 block w-full px-4 py-3 rounded-xl border border-secondary-200
                     focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     bg-white/50 backdrop-blur-sm transition-all duration-200 text-sm min-h-[140px]"
            required
          >
            {users.map((user) => (
              <option key={user.id} value={user.id} className="py-1.5 px-2">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName} (${user.email})` 
                  : user.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-secondary-900 mb-2">
            {t('sendNotifications.notificationTypeLabel')}
          </label>
          <select
            value={notification.type}
            onChange={(e) => setNotification({
              ...notification,
              type: e.target.value
            })}
            className="mt-1 block w-full px-4 py-3 rounded-xl border border-secondary-200
                     focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     bg-white/50 backdrop-blur-sm transition-all duration-200 text-sm font-medium"
          >
            <option value="document">{t('sendNotifications.types.document')}</option>
            <option value="interview">{t('sendNotifications.types.interview')}</option>
            <option value="rating">{t('sendNotifications.types.rating')}</option>
            <option value="general">{t('sendNotifications.types.general')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-secondary-900 mb-2">
            {t('sendNotifications.titleLabel')}
          </label>
          <input
            type="text"
            value={notification.title}
            onChange={(e) => setNotification({
              ...notification,
              title: e.target.value
            })}
            placeholder={t('sendNotifications.titlePlaceholder')}
            className="mt-1 block w-full px-4 py-3 rounded-xl border border-secondary-200
                     focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     bg-white/50 backdrop-blur-sm transition-all duration-200 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-secondary-900 mb-2">
            {t('sendNotifications.messageLabel')}
          </label>
          <textarea
            value={notification.message}
            onChange={(e) => setNotification({
              ...notification,
              message: e.target.value
            })}
            rows={4}
            placeholder={t('sendNotifications.messagePlaceholder')}
            className="mt-1 block w-full px-4 py-3 rounded-xl border border-secondary-200
                     focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     bg-white/50 backdrop-blur-sm transition-all duration-200 text-sm resize-none"
            required
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={sending || notification.selectedUsers.length === 0}
            className="w-full flex justify-center items-center gap-2 px-6 py-3.5 border border-transparent 
                     text-sm font-bold rounded-xl shadow-sm text-white 
                     bg-primary-600 hover:bg-primary-700 focus:outline-none 
                     focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                     disabled:bg-primary-300 transition-all duration-200
                     hover:shadow-md disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <FaSpinner className="animate-spin h-5 w-5" />
                {t('sendNotifications.submitting')}
              </>
            ) : (
              <>
                <FaBell className="h-4 w-4" />
                {t('sendNotifications.submitBtn')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SendNotifications;