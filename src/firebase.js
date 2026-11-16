import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAa1utV-fgUWaM_9vkIzRSj7PL1tkuP90c',
  authDomain: 'skillbridge-fba36.firebaseapp.com',
  projectId: 'skillbridge-fba36',
  storageBucket: 'skillbridge-fba36.firebasestorage.app',
  messagingSenderId: '880017787094',
  appId: '1:880017787094:web:b4e58ffe689725878b2177',
  measurementId: 'G-668FZ31F47',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});
export const db = getFirestore(app);

if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
