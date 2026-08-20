// Firebase 초기화 - 콘솔의 "프로젝트 설정 > 웹 앱"에서 받은 설정값
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBBwTs4Y9kLalC-_isbcXqWI09wATb4-nQ",
  authDomain: "baby-790f5.firebaseapp.com",
  projectId: "baby-790f5",
  storageBucket: "baby-790f5.firebasestorage.app",
  messagingSenderId: "793967138618",
  appId: "1:793967138618:web:2df64b8dcdef821d1fa203",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
