// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDgAGAiYil4K3iFWRcgdLhQf8nmJICsyQk",
  authDomain: "homewildhunt-52dc2.firebaseapp.com",
  databaseURL: "https://homewildhunt-52dc2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "homewildhunt-52dc2",
  storageBucket: "homewildhunt-52dc2.firebasestorage.app",
  messagingSenderId: "996325144096",
  appId: "1:996325144096:web:97cbb2bc68bd6bd650ee45",
  measurementId: "G-KG6PJM8T6J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

export { db, auth, storage, analytics };