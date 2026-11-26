import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeReceiver = null;
    let unsubscribeLegacy = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (unsubscribeReceiver) unsubscribeReceiver();
      if (unsubscribeLegacy) unsubscribeLegacy();
      unsubscribeReceiver = null;
      unsubscribeLegacy = null;

      if (!currentUser) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      const sources = { receiver: [], legacy: [] };
      const publish = () => {
        const merged = new Map();
        [...sources.receiver, ...sources.legacy].forEach(item => merged.set(item.id, item));
        const list = Array.from(merged.values()).sort((a, b) => {
          const bd = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.timestamp || 0);
          const ad = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.timestamp || 0);
          return bd - ad;
        });
        setNotifications(list);
        setUnreadCount(list.filter(n => n.read !== true).length);
        setLoading(false);
      };

      unsubscribeReceiver = onSnapshot(
        query(collection(db, 'notifications'), where('receiver.id', '==', currentUser.uid)),
        snap => { sources.receiver = snap.docs.map(d => ({ id: d.id, ...d.data() })); publish(); },
        err => { console.error('Notification receiver query:', err); setLoading(false); }
      );
      unsubscribeLegacy = onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', currentUser.uid)),
        snap => { sources.legacy = snap.docs.map(d => ({ id: d.id, ...d.data() })); publish(); },
        err => { console.error('Legacy notification query:', err); setLoading(false); }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeReceiver) unsubscribeReceiver();
      if (unsubscribeLegacy) unsubscribeLegacy();
    };
  }, []);

  return <NotificationContext.Provider value={{ notifications, unreadCount, loading, setNotifications }}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};

export default NotificationContext;
