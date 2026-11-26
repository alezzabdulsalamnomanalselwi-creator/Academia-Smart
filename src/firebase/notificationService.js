import { serverTimestamp, writeBatch, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

export const createNotificationOnce = async (payload, eventKey) => {
  if (!payload?.userId && !payload?.receiver?.id) throw new Error('Notification receiver is required');
  const key = eventKey || payload.eventKey || `${payload.type || 'notification'}:${payload.userId || payload.receiver?.id}:${payload.relatedId || payload.interviewId || payload.applicationId || Date.now()}`;
  const bytes = new TextEncoder().encode(key);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, '0')).join('');
  const ref = doc(db, 'notifications', `event_${hash}`);
  try {
    const notification = {
      ...payload,
      eventKey: key,
      read: payload.read === true,
      createdAt: payload.createdAt || serverTimestamp()
    };
    if (!Object.prototype.hasOwnProperty.call(payload, 'status')) delete notification.status;
    await setDoc(ref, notification);
    return { id: ref.id, duplicate: false };
  } catch (error) {
    // A deterministic document ID plus create-only Rules turns a concurrent
    // second write into permission-denied. Confirm the existing event and
    // report it as a harmless duplicate instead of overwriting it.
    if (error?.code === 'permission-denied') {
      const existing = await getDoc(ref);
      if (existing.exists()) return { id: ref.id, duplicate: true };
    }
    throw error;
  }
};

export const markNotificationsRead = async (items = []) => {
  const unread = items.filter(x => x?.id && x.read !== true);
  if (!unread.length) return 0;
  const batch = writeBatch(db);
  unread.forEach(item => batch.update(doc(db, 'notifications', item.id), { read: true, readAt: serverTimestamp() }));
  await batch.commit();
  return unread.length;
};
