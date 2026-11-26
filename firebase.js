import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAlxgtirRO5jleCXB4lp1uGEPLjRCNFiWQ",
  authDomain: "pvp-armory-a0300.firebaseapp.com",
  projectId: "pvp-armory-a0300",
  storageBucket: "pvp-armory-a0300.firebasestorage.app",
  messagingSenderId: "257400728909",
  appId: "1:257400728909:web:a7c9cd1d51681a69251b04"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);