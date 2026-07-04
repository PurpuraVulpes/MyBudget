'use strict';

// ============================================================
// 🔥 FIREBASE CONFIGURATION - REMPLACEZ PAR VOS VALEURS
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyDK7eRyDOCgITy_rMiTu-kOvWlPWuwze7E",
    authDomain: "budget-5372e.firebaseapp.com",
    projectId: "budget-5372e",
    storageBucket: "budget-5372e.firebasestorage.app",
    messagingSenderId: "871085643686",
    appId: "1:871085643686:web:9a4dd73501ddb6657b2167"
};

// ============================================================

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    console.warn('Firestore persistence:', err.code);
});

let currentUser = null;
let isGuestMode = false;
let unsubHoraires = null;
let unsubDepenses = null;
let unsubPaiements = null;
let unsubSettings = null;

auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user && !isGuestMode) {
        onUserLoggedIn(user);
    }
});

async function loginWithEmail(email, password) {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return cred.user;
}

async function registerWithEmail(email, password) {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    return cred.user;
}

async function resetPassword(email) {
    await auth.sendPasswordResetEmail(email);
}

async function logout() {
    if (unsubHoraires) { unsubHoraires(); unsubHoraires = null; }
    if (unsubDepenses) { unsubDepenses(); unsubDepenses = null; }
    if (unsubPaiements) { unsubPaiements(); unsubPaiements = null; }
    if (unsubSettings) { unsubSettings(); unsubSettings = null; }
    await auth.signOut();
    currentUser = null;
    isGuestMode = false;
}

function onUserLoggedIn(user) {
    updateSyncUI('online', user.email);
    startRealtimeSync(user.uid);
    uploadLocalDataIfNeeded(user.uid);
}

function updateSyncUI(status, email) {
    const dot = document.getElementById('syncDot');
    const label = document.getElementById('syncLabel');
    const accEmail = document.getElementById('accountEmail');
    const accStatus = document.getElementById('accountStatus');
    const accAvatar = document.getElementById('accountAvatar');
    const accInfo = document.getElementById('accountInfo');
    const loginBtn = document.getElementById('btnLoginFromSettings');
    const loggedActions = document.getElementById('loggedInActions');
    const accountActions = document.getElementById('accountActions');

    if (!dot) return;

    if (status === 'online') {
        dot.className = 'sync-dot online';
        label.textContent = 'Cloud';
        if (accEmail) accEmail.textContent = email || 'Connecté';
        if (accStatus) accStatus.textContent = '☁️ Synchronisé';
        if (accAvatar) accAvatar.textContent = '👤';
        if (accInfo) accInfo.classList.add('connected');
        if (loginBtn) loginBtn.style.display = 'none';
        if (accountActions) accountActions.style.display = 'none';
        if (loggedActions) loggedActions.classList.remove('hidden');
    } else if (status === 'syncing') {
        dot.className = 'sync-dot syncing';
        label.textContent = 'Sync...';
    } else {
        dot.className = 'sync-dot offline';
        label.textContent = 'Local';
        if (accEmail) accEmail.textContent = 'Mode local';
        if (accStatus) accStatus.textContent = 'Non connecté';
        if (accAvatar) accAvatar.textContent = '👤';
        if (accInfo) accInfo.classList.remove('connected');
        if (loginBtn) loginBtn.style.display = 'block';
        if (accountActions) accountActions.style.display = 'block';
        if (loggedActions) loggedActions.classList.add('hidden');
    }
}

async function uploadLocalDataIfNeeded(uid) {
    const uploaded = localStorage.getItem('mb_uploaded_' + uid);
    if (uploaded) return;

    updateSyncUI('syncing');

    try {
        const ref = db.collection('users').doc(uid);
        const cloudSettings = await ref.collection('data').doc('settings').get();

        if (!cloudSettings.exists && App.horaires.length > 0) {
            await ref.collection('data').doc('settings').set({
                tauxHoraire: App.settings.tauxHoraire,
                devise: App.settings.devise,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const batch1 = db.batch();
            App.horaires.forEach(h => {
                const docRef = ref.collection('horaires').doc(String(h.id));
                batch1.set(docRef, { ...h, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            });
            await batch1.commit();

            const batch2 = db.batch();
            App.depenses.forEach(d => {
                const docRef = ref.collection('depenses').doc(String(d.id));
                batch2.set(docRef, { ...d, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            });
            await batch2.commit();

            if (App.paiements && App.paiements.length > 0) {
                const batch3 = db.batch();
                App.paiements.forEach(p => {
                    const docRef = ref.collection('paiements').doc(String(p.id));
                    batch3.set(docRef, { ...p, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
                });
                await batch3.commit();
            }

            showToast('☁️ Données locales synchronisées !');
        }

        localStorage.setItem('mb_uploaded_' + uid, '1');
    } catch (e) {
        console.error('Upload error:', e);
    }

    updateSyncUI('online', currentUser?.email);
}

function startRealtimeSync(uid) {
    const ref = db.collection('users').doc(uid);

    unsubHoraires = ref.collection('horaires').onSnapshot(snapshot => {
        App.horaires = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            delete data.updatedAt;
            App.horaires.push(data);
        });
        App.horaires.sort((a, b) => b.date.localeCompare(a.date));
        saveLocalData();
        if (typeof renderAll === 'function') renderAll();
    }, err => console.error('Horaires sync:', err));

    unsubDepenses = ref.collection('depenses').onSnapshot(snapshot => {
        App.depenses = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            delete data.updatedAt;
            App.depenses.push(data);
        });
        App.depenses.sort((a, b) => b.date.localeCompare(a.date));
        saveLocalData();
        if (typeof renderAll === 'function') renderAll();
    }, err => console.error('Depenses sync:', err));

    unsubPaiements = ref.collection('paiements').onSnapshot(snapshot => {
        App.paiements = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            delete data.updatedAt;
            App.paiements.push(data);
        });
        App.paiements.sort((a, b) => b.mois.localeCompare(a.mois));
        saveLocalData();
        if (typeof renderAll === 'function') renderAll();
    }, err => console.error('Paiements sync:', err));

    unsubSettings = ref.collection('data').doc('settings').onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.tauxHoraire !== undefined) App.settings.tauxHoraire = data.tauxHoraire;
            if (data.devise !== undefined) App.settings.devise = data.devise;
            saveLocalData();
            if (typeof renderAll === 'function') renderAll();
        }
    }, err => console.error('Settings sync:', err));
}

async function cloudAddHoraire(horaire) {
    if (!currentUser || isGuestMode) return;
    try {
        const ref = db.collection('users').doc(currentUser.uid).collection('horaires').doc(String(horaire.id));
        await ref.set({ ...horaire, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (e) { console.error('Cloud add horaire:', e); }
}

async function cloudDeleteHoraire(id) {
    if (!currentUser || isGuestMode) return;
    try {
        await db.collection('users').doc(currentUser.uid).collection('horaires').doc(String(id)).delete();
    } catch (e) { console.error('Cloud delete horaire:', e); }
}

async function cloudAddDepense(depense) {
    if (!currentUser || isGuestMode) return;
    try {
        const ref = db.collection('users').doc(currentUser.uid).collection('depenses').doc(String(depense.id));
        await ref.set({ ...depense, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (e) { console.error('Cloud add depense:', e); }
}

async function cloudDeleteDepense(id) {
    if (!currentUser || isGuestMode) return;
    try {
        await db.collection('users').doc(currentUser.uid).collection('depenses').doc(String(id)).delete();
    } catch (e) { console.error('Cloud delete depense:', e); }
}

async function cloudAddPaiement(paiement) {
    if (!currentUser || isGuestMode) return;
    try {
        const ref = db.collection('users').doc(currentUser.uid).collection('paiements').doc(String(paiement.id));
        await ref.set({ ...paiement, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (e) { console.error('Cloud add paiement:', e); }
}

async function cloudDeletePaiement(id) {
    if (!currentUser || isGuestMode) return;
    try {
        await db.collection('users').doc(currentUser.uid).collection('paiements').doc(String(id)).delete();
    } catch (e) { console.error('Cloud delete paiement:', e); }
}

async function cloudSaveSettings() {
    if (!currentUser || isGuestMode) return;
    try {
        await db.collection('users').doc(currentUser.uid).collection('data').doc('settings').set({
            tauxHoraire: App.settings.tauxHoraire,
            devise: App.settings.devise,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.error('Cloud save settings:', e); }
}

async function cloudDeleteAll() {
    if (!currentUser || isGuestMode) return;
    try {
        const uid = currentUser.uid;
        const ref = db.collection('users').doc(uid);

        const horaires = await ref.collection('horaires').get();
        const batch1 = db.batch();
        horaires.forEach(doc => batch1.delete(doc.ref));
        await batch1.commit();

        const depenses = await ref.collection('depenses').get();
        const batch2 = db.batch();
        depenses.forEach(doc => batch2.delete(doc.ref));
        await batch2.commit();

        const paiements = await ref.collection('paiements').get();
        const batch3 = db.batch();
        paiements.forEach(doc => batch3.delete(doc.ref));
        await batch3.commit();
    } catch (e) { console.error('Cloud delete all:', e); }
}

function saveLocalData() {
    localStorage.setItem('mb_horaires', JSON.stringify(App.horaires));
    localStorage.setItem('mb_depenses', JSON.stringify(App.depenses));
    localStorage.setItem('mb_paiements', JSON.stringify(App.paiements || []));
    localStorage.setItem('mb_settings', JSON.stringify(App.settings));
}
