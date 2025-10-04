// app.js — Panda Technic (Updated Version)
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  doc, setDoc, getDoc, updateDoc, increment,
  collection, query, where, getDocs, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ⚙️ Config
const AD_LINK = "https://www.revenuecpmgate.com/dnm2jrcaj?key=c73c264e4447410ce55eb32960238eaa";
const AD_REWARD = 0.0001;
const CAPTCHA_REWARD = 0.00015;
const WATCH_SECONDS = 5;
const MIN_WITHDRAW = 0.1;
const REF_REWARD = 0.01;

// UI references
const authCard = document.getElementById("authCard");
const dashCard = document.getElementById("dashCard");
const historyCard = document.getElementById("historyCard");

const displayNameInput = document.getElementById("displayName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const refInput = document.getElementById("refInput");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");

const nameDisp = document.getElementById("nameDisp");
const balanceDisp = document.getElementById("balanceDisp");
const openAdBtn = document.getElementById("openAdBtn");
const adTimerBtn = document.getElementById("adTimerBtn");
const adTimerSpan = document.getElementById("adTimer");

const captchaCodeEl = document.getElementById("captchaCode");
const captchaInput = document.getElementById("captchaInput");
const submitCaptcha = document.getElementById("submitCaptcha");
const regenCaptcha = document.getElementById("regenCaptcha");
const captchaMsg = document.getElementById("captchaMsg");

const withdrawEmail = document.getElementById("withdrawEmail");
const withdrawBtn = document.getElementById("withdrawBtn");
const withdrawMsg = document.getElementById("withdrawMsg");

const myRef = document.getElementById("myRef");
const copyRef = document.getElementById("copyRef");
const logoutBtn = document.getElementById("logoutBtn");
const openTelegramBtn = document.getElementById("openTelegramBtn");

const historyList = document.getElementById("historyList");
const withdrawHistoryBtn = document.getElementById("withdrawHistoryBtn");
const closeHistory = document.getElementById("closeHistory");

let currentCaptcha = "";
let watchTimer = null;
let watchSeconds = 0;
let currentUserDoc = null;
let adStartTime = null;

// 🔹 Helper — generate referral code
function genRefCode(uid) {
  return "PT" + uid.slice(0, 6).toUpperCase();
}

// 🔹 Capture referral from Telegram or link
(function captureRefFromURL() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref') || params.get('start') || params.get('u');
  if (ref) localStorage.setItem('pendingRef', ref);
})();

// 🔹 UI control
function showAuth() {
  authCard.classList.remove('hidden');
  dashCard.classList.add('hidden');
  historyCard.classList.add('hidden');
}
function showDash() {
  authCard.classList.add('hidden');
  dashCard.classList.remove('hidden');
  historyCard.classList.add('hidden');
}
function showHistory() {
  authCard.classList.add('hidden');
  dashCard.classList.add('hidden');
  historyCard.classList.remove('hidden');
}

// 🔹 Register user
registerBtn.addEventListener('click', async () => {
  const name = displayNameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const ref = refInput.value.trim() || localStorage.getItem('pendingRef');

  if (!name || !email || !password) return alert('Please fill all fields');

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const uid = cred.user.uid;
    const code = genRefCode(uid);
    let referredBy = null;

    if (ref) {
      const q = query(collection(db, "users"), where("refCode", "==", ref));
      const snap = await getDocs(q);
      if (!snap.empty) {
        referredBy = ref;
        const refDoc = snap.docs[0];
        await updateDoc(refDoc.ref, {
          balance: increment(REF_REWARD),
          referrals: arrayUnion(uid)
        });
      }
    }

    await setDoc(doc(db, "users", uid), {
      uid, name, email,
      balance: 0,
      refCode: code,
      referredBy: referredBy || null,
      withdraws: [],
      adsWatched: 0,
      referrals: [],
      createdAt: Date.now()
    });

    alert('✅ Account created! Please login.');
  } catch (err) {
    alert(err.message);
  }
});

// 🔹 Login
loginBtn.addEventListener('click', async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value.trim());
  } catch (err) {
    alert(err.message);
  }
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  showAuth();
});

// 🔹 Auth listener
onAuthStateChanged(auth, async (user) => {
  if (!user) return showAuth();

  const ud = await getDoc(doc(db, "users", user.uid));
  if (!ud.exists()) {
    const code = genRefCode(user.uid);
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid, name: user.displayName || user.email, email: user.email,
      balance: 0, refCode: code, withdraws: [], adsWatched: 0
    });
  }

  currentUserDoc = await getDoc(doc(db, "users", user.uid));
  const data = currentUserDoc.data();

  nameDisp.innerText = data.name || user.email;
  balanceDisp.innerText = "$" + Number(data.balance || 0).toFixed(5);
  myRef.value = data.refCode;
  withdrawEmail.value = data.email || user.email;
  showDash();
});

// 🔹 Ad view
openAdBtn.addEventListener('click', () => {
  window.open(AD_LINK, '_blank');
  adStartTime = Date.now();
  adTimerSpan.innerText = WATCH_SECONDS;
  adTimerBtn.disabled = true;

  let remaining = WATCH_SECONDS;
  watchTimer = setInterval(() => {
    remaining--;
    adTimerSpan.innerText = remaining;
    if (remaining <= 0) {
      clearInterval(watchTimer);
      adTimerBtn.disabled = false;
      creditAd(true);
    }
  }, 1000);
});

async function creditAd(valid) {
  const user = auth.currentUser;
  if (!user) return alert('Login required');

  if (!valid) return alert('❌ Invalid click — Watch full ad 5 seconds!');
  const diff = Date.now() - adStartTime;
  if (diff < WATCH_SECONDS * 1000) return alert('⛔ You left early — no reward!');

  const uref = doc(db, "users", user.uid);
  await updateDoc(uref, {
    balance: increment(AD_REWARD),
    adsWatched: increment(1)
  });
  const snap = await getDoc(uref);
  balanceDisp.innerText = "$" + Number(snap.data().balance).toFixed(5);
  alert(`✅ +$${AD_REWARD.toFixed(5)} added!`);
}

// 🔹 CAPTCHA
function genCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  currentCaptcha = s;
  captchaCodeEl.innerText = currentCaptcha;
  captchaMsg.innerText = '';
}
regenCaptcha.addEventListener('click', genCaptcha);
genCaptcha();

submitCaptcha.addEventListener('click', async () => {
  const v = captchaInput.value.trim().toUpperCase();
  if (!v) return alert('Enter CAPTCHA');
  if (v !== currentCaptcha) return captchaMsg.innerText = '❌ Wrong CAPTCHA';
  window.open(AD_LINK, '_blank');
  captchaMsg.innerText = '⏳ Wait 5s and you’ll get reward';

  setTimeout(async () => {
    const user = auth.currentUser;
    if (!user) return alert('Login first!');
    const uref = doc(db, "users", user.uid);
    await updateDoc(uref, { balance: increment(CAPTCHA_REWARD) });
    const snap = await getDoc(uref);
    balanceDisp.innerText = "$" + Number(snap.data().balance).toFixed(5);
    captchaMsg.innerText = '✅ Credited!';
    captchaInput.value = '';
    genCaptcha();
  }, WATCH_SECONDS * 1000);
});

// 🔹 Withdraw system
withdrawBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return alert('Login first');
  const uref = doc(db, "users", user.uid);
  const snap = await getDoc(uref);
  const data = snap.data();
  const balance = Number(data.balance || 0);
  if (balance < MIN_WITHDRAW) return alert(`Minimum withdraw $${MIN_WITHDRAW}`);
  const femail = withdrawEmail.value.trim() || data.email;

  withdrawBtn.disabled = true;
  withdrawMsg.innerText = 'Processing...';
  try {
    const res = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: balance, to: femail, currency: 'USDT', uid: user.uid })
    });
    const json = await res.json();
    if (json.success) {
      await updateDoc(uref, {
        balance: 0,
        withdraws: arrayUnion({ amount: balance, to: femail, at: Date.now(), tx: json.tx || null })
      });
      withdrawMsg.innerText = '✅ Withdraw successful!';
    } else {
      withdrawMsg.innerText = '❌ Withdraw failed';
    }
  } catch (err) {
    console.error(err);
    withdrawMsg.innerText = '⚠️ Error processing withdraw';
  } finally {
    withdrawBtn.disabled = false;
  }
});

// 🔹 Withdraw history
withdrawHistoryBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return alert('Login required');
  const snap = await getDoc(doc(db, "users", user.uid));
  const list = snap.data().withdraws || [];
  historyList.innerHTML = list.length
    ? list.map(w => `• $${w.amount} → ${w.to} (${new Date(w.at).toLocaleString()})`).join('<br>')
    : 'No history';
  showHistory();
});
closeHistory.addEventListener('click', showDash);

// 🔹 Copy referral
copyRef.addEventListener('click', () => {
  myRef.select();
  navigator.clipboard.writeText(myRef.value);
  alert('Referral code copied!');
});

// 🔹 Open Telegram (Mini App compatible)
openTelegramBtn.addEventListener('click', () => {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.openTelegramLink(window.location.href);
  } else {
    window.open(window.location.href, '_blank');
  }
});
