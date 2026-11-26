import { db } from './config';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export const subscribeToNotifications = (userId, callback) => {
  const notificationsRef = collection(db, 'notifications');
  
  const q = query(
    notificationsRef,
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().createdAt?.toDate ? new Date(doc.data().createdAt.toDate()).toLocaleDateString() : 'N/A'
    }));
    callback(notifications);
  }, (err) => {
    console.error("Notifications subscription error:", err);
  });
};