import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

const profiles = collection(db, 'profiles');

export function profileFromUser(user) {
  return {
    uid: user.uid,
    name: user.displayName || '',
    college: '',
    bio: '',
    teachingSkills: [],
    learningSkills: [],
  };
}

export async function saveProfile(uid, values) {
  const profileRef = doc(db, 'profiles', uid);
  const current = await getDoc(profileRef);
  const profile = {
    uid,
    name: values.name.trim(),
    college: values.college.trim(),
    bio: values.bio.trim(),
    teachingSkills: values.teachingSkills,
    learningSkills: values.learningSkills,
    ...(current.exists() ? {} : { createdAt: serverTimestamp() }),
    updatedAt: serverTimestamp(),
  };
  await setDoc(profileRef, profile, { merge: true });
  return { ...profile, createdAt: current.exists() ? current.data().createdAt : null };
}

export async function getProfile(uid) {
  const result = await getDoc(doc(db, 'profiles', uid));
  return result.exists() ? result.data() : null;
}

export async function listProfiles() {
  const result = await getDocs(query(profiles, limit(100)));
  return result.docs.map((item) => item.data());
}

export async function createExchangeRequest(from, to, message) {
  const [sent, received] = await Promise.all([
    getDocs(query(
      collection(db, 'exchangeRequests'),
      where('fromId', '==', from.uid),
      where('toId', '==', to.uid),
    )),
    getDocs(query(
      collection(db, 'exchangeRequests'),
      where('fromId', '==', to.uid),
      where('toId', '==', from.uid),
    )),
  ]);
  const previous = [...sent.docs, ...received.docs].map((item) => item.data().status);
  if (previous.includes('accepted')) throw new Error('You are already connected with this learner.');
  if (previous.includes('pending')) throw new Error('There is already a pending exchange request with this learner.');
  await addDoc(collection(db, 'exchangeRequests'), {
    fromId: from.uid,
    toId: to.uid,
    message: message.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function listExchangeRequests(uid) {
  const [sent, received] = await Promise.all([
    getDocs(query(collection(db, 'exchangeRequests'), where('fromId', '==', uid))),
    getDocs(query(collection(db, 'exchangeRequests'), where('toId', '==', uid))),
  ]);
  return [...sent.docs, ...received.docs]
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

export async function respondToExchangeRequest(request, status) {
  const requestRef = doc(db, 'exchangeRequests', request.id);
  const batch = writeBatch(db);
  batch.update(requestRef, { status, updatedAt: serverTimestamp() });
  if (status === 'accepted') {
    batch.set(doc(db, 'conversations', request.id), {
      requestId: request.id,
      participants: [request.fromId, request.toId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: '',
    });
  }
  await batch.commit();
}

export async function listConversations(uid) {
  const result = await getDocs(query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', uid),
  ));
  return result.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
}

export function listenToMessages(conversationId, onMessages, onError) {
  const messages = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100),
  );
  return onSnapshot(messages, (snapshot) => {
    onMessages(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}

export async function getUserSettings(uid) {
  const result = await getDoc(doc(db, 'userSettings', uid));
  return { readReceiptsEnabled: result.exists() ? result.data().readReceiptsEnabled !== false : true };
}

export async function setReadReceiptsEnabled(uid, enabled) {
  await setDoc(doc(db, 'userSettings', uid), {
    readReceiptsEnabled: enabled,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function listBlockedUsers(uid) {
  const result = await getDocs(collection(db, 'users', uid, 'blockedUsers'));
  return result.docs.map((item) => item.id);
}

export async function blockUser(uid, blockedUid) {
  await setDoc(doc(db, 'users', uid, 'blockedUsers', blockedUid), {
    blockedUid,
    createdAt: serverTimestamp(),
  });
}

export async function unblockUser(uid, blockedUid) {
  await deleteDoc(doc(db, 'users', uid, 'blockedUsers', blockedUid));
}

export async function listArchivedConversations(uid) {
  const result = await getDocs(collection(db, 'users', uid, 'archivedConversations'));
  return result.docs.map((item) => item.id);
}

export async function archiveConversation(uid, conversationId) {
  await setDoc(doc(db, 'users', uid, 'archivedConversations', conversationId), {
    conversationId,
    createdAt: serverTimestamp(),
  });
}

export async function restoreConversation(uid, conversationId) {
  await deleteDoc(doc(db, 'users', uid, 'archivedConversations', conversationId));
}

export async function markMessagesRead(conversationId, uid, messages) {
  const unread = messages.filter((message) => message.fromId !== uid && !message.readBy?.includes(uid));
  if (!unread.length) return;
  const batch = writeBatch(db);
  unread.forEach((message) => {
    batch.update(doc(db, 'conversations', conversationId, 'messages', message.id), {
      readBy: [uid],
      readAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function createTeachingVerificationRequest(uid, request) {
  await addDoc(collection(db, 'teachingVerificationRequests'), {
    uid,
    skill: request.skill.trim(),
    qualifications: request.qualifications.trim(),
    evidenceLink: request.evidenceLink.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listTeachingVerificationRequests(uid) {
  const result = await getDocs(query(
    collection(db, 'teachingVerificationRequests'),
    where('uid', '==', uid),
  ));
  return result.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

export async function sendMessage(conversationId, uid, text) {
  const conversationRef = doc(db, 'conversations', conversationId);
  const batch = writeBatch(db);
  batch.set(doc(collection(conversationRef, 'messages')), {
    fromId: uid,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
  batch.update(conversationRef, {
    updatedAt: serverTimestamp(),
    lastMessage: text.trim().slice(0, 160),
    lastMessageFrom: uid,
  });
  await batch.commit();
}

export async function listLearningGoals(uid) {
  const result = await getDocs(collection(db, 'profiles', uid, 'learningGoals'));
  return result.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
}

export async function saveLearningGoal(uid, goal) {
  const goalRef = doc(db, 'profiles', uid, 'learningGoals', goal.id || crypto.randomUUID());
  await setDoc(goalRef, {
    skillName: goal.skillName.trim(),
    currentTopic: goal.currentTopic.trim(),
    progressPercentage: Number(goal.progressPercentage),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function listSessions(uid) {
  const result = await getDocs(query(
    collection(db, 'sessions'),
    where('participants', 'array-contains', uid),
  ));
  return result.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
}

export async function createSession(conversation, user, session) {
  await addDoc(collection(db, 'sessions'), {
    conversationId: conversation.id,
    participants: conversation.participants,
    createdBy: user.uid,
    title: session.title.trim(),
    skillName: session.skillName.trim(),
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function updateSessionStatus(sessionId, status) {
  await updateDoc(doc(db, 'sessions', sessionId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function createSessionCallRoom(sessionId) {
  return runTransaction(db, async (transaction) => {
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists()) throw new Error('This session is no longer available.');
    const session = sessionSnapshot.data();
    if (session.status !== 'accepted') throw new Error('Accept the session before creating or joining its call.');
    if (session.callRoom) return session.callRoom;

    const callRoom = `skillbridge-${crypto.randomUUID().replace(/-/g, '')}`;
    transaction.update(sessionRef, {
      callRoom,
      callUpdatedAt: serverTimestamp(),
    });
    return callRoom;
  });
}

