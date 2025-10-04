// app.js
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  doc, setDoc, getDoc, updateDoc, increment, collection, query, where, getDocs, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const AD_LINK = "https://www.revenuecpmgate.com/dnm2jrcaj?key=c73c264e4447410ce55eb32960238eaa";
const AD_REWARD = 0.0001;
const CAPTCHA_REWARD = 0.00015;
const WATCH_SECONDS = 5;
const MIN_WITHDRAW = 0.1; // USDT

// UI elements
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

// helper: generate referral code
function genRefCode(uid) {
  return "ACP" + uid.slice(0,6).toUpperCase();
}

// set pending ref from URL (telegram mini app opens with ?start or ?ref)
(function captureRefFromURL(){
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref') || params.get('start') || params.get('u');
  if(ref) localStorage.setItem('pendingRef', ref);
})();

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

// Auth flows
registerBtn.addEventListener('click', async ()=>{
  const name = (displayNameInput.value || "").trim();
  const email = (emailInput.value || "").trim();
  const password = (passwordInput.value || "").trim();
  const ref = (refInput.value || "").trim() || localStorage.getItem('pendingRef');

  if(!name || !email || !password){ alert('Fill name, email, password'); return; }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // update profile display name
    await updateProfile(cred.user, { displayName: name });

    // create user doc
    const uid = cred.user.uid;
    const code = genRefCode(uid);
    let initialBalance = 0;
    let referredBy = null;

    if(ref) {
      // check if valid referral code
      const q = query(collection(db, "users"), where("refCode","==", ref));
      const snap = await getDocs(q);
      if(!snap.empty){
        // valid referral
        referredBy = ref;
        initialBalance = 0; // user doesn't get bonus per prior spec? earlier we set 0.01 to referrer; spec: "Ref code provided -> referrer gets $0.01"
        // credit the referrer
        const refDoc = snap.docs[0];
        await updateDoc(refDoc.ref, { balance: increment(0.01), referrals: arrayUnion(uid) });
      }
    }

    await setDoc(doc(db, "users", uid), {
      uid,
      name,
      email,
      balance: initialBalance,
      refCode: code,
      referredBy: referredBy || null,
      withdraws: [],
      adsWatched: 0,
      createdAt: Date.now()
    });

    alert('Registered — Welcome!');
    // redirect to dashboard
    // For Telegram Mini App: navigate back to app main or show
    // show user UI
    // automatically sign-in state listener will handle UI
  } catch (err) {
    alert(err.message);
  }
});

loginBtn.addEventListener('click', async ()=>{
  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value.trim());
  } catch (err) {
    alert(err.message);
  }
});

logoutBtn.addEventListener('click', async ()=>{
  await signOut(auth);
  showAuth();
});

// auth state listener
onAuthStateChanged(auth, async (user)=>{
  if(!user){ showAuth(); return; }
  // load user doc
  const ud = await getDoc(doc(db, "users", user.uid));
  if(!ud.exists()){
    // create fallback doc
    const code = genRefCode(user.uid);
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid, name: user.displayName || user.email, email: user.email,
      balance: 0, refCode: code, withdraws: [], adsWatched: 0
    });
    currentUserDoc = await getDoc(doc(db, "users", user.uid));
  } else {
    currentUserDoc = ud;
  }
  // update UI
  nameDisp.innerText = currentUserDoc.data().name || user.email;
  balanceDisp.innerText = "$" + Number(currentUserDoc.data().balance || 0).toFixed(5);
  myRef.value = currentUserDoc.data().refCode;
  withdrawEmail.value = currentUserDoc.data().email || user.email;

  showDash();
});

// AD logic
openAdBtn.addEventListener('click', ()=>{
  // open ad in new tab
  window.open(AD_LINK, '_blank');

  // start watch timer in UI (counts up to WATCH_SECONDS)
  watchSeconds = 0;
  adTimerSpan.innerText = watchSeconds;
  adTimerBtn.classList.remove('ghost');
  adTimerBtn.disabled = true;
  watchTimer = setInterval(()=> {
    watchSeconds++;
    adTimerSpan.innerText = watchSeconds;
    if(watchSeconds >= WATCH_SECONDS){
      clearInterval(watchTimer);
      adTimerBtn.disabled = false;
      // credit user in firestore
      creditAd();
    }
  }, 1000);
});

async function creditAd(){
  const user = auth.currentUser;
  if(!user) return alert('Please login');
  const uref = doc(db, "users", user.uid);
  await updateDoc(uref, { balance: increment(AD_REWARD), adsWatched: increment(1) });
  const snap = await getDoc(uref);
  balanceDisp.innerText = "$" + Number(snap.data().balance || 0).toFixed(5);
  alert(`+ $${AD_REWARD.toFixed(5)} (Ad credited)`);
}

// CAPTCHA logic
function genCaptcha(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s=''; for(let i=0;i<6;i++) s+=chars.charAt(Math.floor(Math.random()*chars.length));
  currentCaptcha = s;
  captchaCodeEl.innerText = currentCaptcha;
  captchaMsg.innerText = '';
}
regenCaptcha.addEventListener('click', genCaptcha);
genCaptcha();

submitCaptcha.addEventListener('click', async ()=>{
  const v = (captchaInput.value||'').trim().toUpperCase();
  if(!v) return alert('Enter CAPTCHA');
  if(v !== currentCaptcha) { captchaMsg.innerText = 'Incorrect — try again'; return; }
  // open ad link and require watch time
  window.open(AD_LINK, '_blank');
  captchaMsg.innerText = 'Open ad — wait 5s to get credit';
  // wait 5 seconds then credit
  setTimeout(async ()=>{
    const user = auth.currentUser;
    if(!user){ alert('Login required'); return; }
    const uref = doc(db, "users", user.uid);
    await updateDoc(uref, { balance: increment(CAPTCHA_REWARD) });
    const snap = await getDoc(uref);
    balanceDisp.innerText = "$" + Number(snap.data().balance || 0).toFixed(5);
    captchaMsg.innerText = 'CAPTCHA correct — credited!';
    captchaInput.value = '';
    genCaptcha();
  }, WATCH_SECONDS * 1000);
});

// Withdraw button -> call serverless endpoint to perform FaucetPay API call & Telegram notify
withdrawBtn.addEventListener('click', async ()=>{
  const user = auth.currentUser;
  if(!user) return alert('Login required');

  const uref = doc(db, "users", user.uid);
  const snap = await getDoc(uref);
  const data = snap.data();
  const balance = Number(data.balance || 0);

  if(balance < MIN_WITHDRAW) return alert(`Minimum withdraw $${MIN_WITHDRAW} required`);

  const femail = (withdrawEmail.value || data.email || user.email || "").trim();
  if(!femail) return alert('Enter FaucetPay email for payout');

  // POST to serverless API /api/withdraw
  withdrawBtn.disabled = true;
  withdrawMsg.innerText = 'Processing withdraw...';

  try {
    const res = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: balance.toString(), // send as string
        to: femail,
        currency: 'USDT',
        uid: user.uid,
        name: data.name || user.email
      })
    });
    const json = await res.json();
    if(res.ok && json.success){
      // On success: clear user balance and add withdraw record
      await updateDoc(uref, {
        balance: 0,
        withdraws: arrayUnion({
          amount: balance,
          to: femail,
          at: Date.now(),
          tx: json.tx || null
        })
      });
      const afterSnap = await getDoc(uref);
      balanceDisp.innerText = "$" + Number(afterSnap.data().balance || 0).toFixed(5);
      withdrawMsg.innerText = 'Withdraw successful and sent to FaucetPay';
      alert('Withdraw sent — check FaucetPay.'); 
    } else {
      withdrawMsg.innerText = 'Withdraw failed: ' + (json.message || 'unknown');
      alert('Withdraw failed: ' + (json.message || 'see console'));
      console.error(json);
    }
  } catch (err) {
    console.error(err);
    alert('Withdraw request failed');
  } finally {
    withdrawBtn.disabled = false;
  }
});

// Withdraw history
withdrawHistoryBtn.addEventListener('click', async ()=>{
  const user = auth.currentUser;
  if(!user) return alert('Login required');
  const uref = doc(db, "users", user.uid);
  const snap = await getDoc(uref);
  const list = snap.data().withdraws || [];
  historyList.innerHTML = list.length ? list.map(w=>`• ${w.amount ? ('$'+w.amount) : ''} → ${w.to || ''} @ ${w.at ? new Date(w.at).toLocaleString():''}`).join('<br>') : 'No withdraws';
  showHistory();
});
closeHistory.addEventListener('click', ()=> showDash());

// copy referral
copyRef.addEventListener('click', ()=>{
  myRef.select();
  navigator.clipboard.writeText(myRef.value).then(()=> alert('Referral copied'));
});

// Open Telegram (open in same window if inside Telegram Mini App)
openTelegramBtn.addEventListener('click', ()=>{
  // If running inside Telegram WebApp
  try {
    // prefer opening via Telegram WebApp interface if available
    if(window.Telegram && window.Telegram.WebApp){
      window.Telegram.WebApp.openTelegramLink(window.location.href);
    } else {
      // fallback: open app in new tab
      window.open(window.location.href, '_blank');
    }
  } catch (e){
    window.open(window.location.href, '_blank');
  }
});

// Utility getDoc reference
function docRef(path){
  return doc(db, path);
}
