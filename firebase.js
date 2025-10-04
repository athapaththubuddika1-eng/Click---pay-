// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJeZK0T16WndIoMNFMYKUBQxIc6Ft4z8w",
  authDomain: "adsclickpay.firebaseapp.com",
  projectId: "adsclickpay",
  storageBucket: "adsclickpay.firebasestorage.app",
  messagingSenderId: "161364491561",
  appId: "1:161364491561:web:9617563e4e116d7cbf0b38"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
