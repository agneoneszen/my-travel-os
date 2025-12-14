import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD2KzYtFyyHH6JEDGkQQvfN0YKLxGcSmuY",
    authDomain: "travel-os-753af.firebaseapp.com",
    projectId: "travel-os-753af",
    storageBucket: "travel-os-753af.firebasestorage.app",
    messagingSenderId: "606896568056",
    appId: "1:606896568056:web:013e1a98f3159bc8b06d0d"
  };
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);

  // 匯出工具讓 App.jsx 使用
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);