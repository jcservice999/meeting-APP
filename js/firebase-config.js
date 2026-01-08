// Firebase 配置
// 請在 Firebase Console 取得您的配置資訊並替換以下內容

const firebaseConfig = {
  apiKey: "AIzaSyBQB0FhR8NiLfOi_n6IxGexlteXCfBaBtY",
  authDomain: "meeting-app-f5a6c.firebaseapp.com",
  projectId: "meeting-app-f5a6c",
  storageBucket: "meeting-app-f5a6c.firebasestorage.app",
  messagingSenderId: "992174855214",
  appId: "1:992174855214:web:8338a330a5735ed6c9bbbf"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 取得服務實例
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// Google 登入提供者
const googleProvider = new firebase.auth.GoogleAuthProvider();

// 匯出供其他模組使用
window.firebaseApp = {
    auth,
    database,
    storage,
    googleProvider
};

console.log('Firebase initialized');
