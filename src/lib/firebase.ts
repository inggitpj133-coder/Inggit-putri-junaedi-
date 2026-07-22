import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDyyUEGwppRdyxr-60liT-bwJW6VOkegZs",
  authDomain: "sample-firebase-ai-app-f0370.firebaseapp.com",
  projectId: "sample-firebase-ai-app-f0370",
  storageBucket: "sample-firebase-ai-app-f0370.firebasestorage.app",
  messagingSenderId: "78879187370",
  appId: "1:78879187370:web:6ccdceeb35cf2b45b90bd3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID
const db = initializeFirestore(app, {}, "remixed-firestore-database-id");

// Initialize Auth
const auth = getAuth(app);

export { app, db, auth };
