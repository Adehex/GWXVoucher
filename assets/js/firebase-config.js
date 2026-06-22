// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
// 1. Go to https://console.firebase.google.com/ and create a new project.
// 2. Click the Web icon (</>) to register a web app.
// 3. Copy the firebaseConfig object they give you and replace the one below.
// 4. Enable Authentication (Email/Password) in the Firebase console.
// 5. Enable Firestore Database (Start in test mode or add rules).

const firebaseConfig = {
  apiKey: "AIzaSyDLn2guaTmRCdkkuFjfmGdc1KisZIoDhfM",
  authDomain: "voucher-b2439.firebaseapp.com",
  projectId: "voucher-b2439",
  storageBucket: "voucher-b2439.firebasestorage.app",
  messagingSenderId: "462960692563",
  appId: "1:462960692563:web:8f316864bab73d609065a6",
  measurementId: "G-SNRYJPG6XX"
};

// Initialize Firebase
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth ? firebase.auth() : null;
const db = firebase.firestore ? firebase.firestore() : null;
