'use strict';

// ===== STATE =====
const App = {
    horaires: [],
    depenses: [],
    settings: { tauxHoraire: 12.00, devise: '€' },
    activeTab: 'horaires'
};

// ===== PIN STATE =====
let pinInput = '';
let pinMode = 'unlock'; // 'unlock', 'setup', 'confirm', 'change-verify', 'change-new', 'change-confirm', 'remove'
let pinSetupTemp = '';
let pinAttempts = 0;

// Modal PIN state
let modalPinInput = '';
let modalPinMode = ''; // 'setup', 'confirm', 'change-verify', 'change-new', 'change-confirm', 'remove'
let modalPinTemp = '';

const CATEGORIES = [
    { emoji: '🍔', label: 'Alimentation' },
    { emoji: '🏠', label: 'Loyer' },
    { emoji: '🚗', label: 'Transport' },
    { emoji: '📱', label: 'Téléphone' },
    { emoji: '⚡', label: 'Énergie' },
    { emoji: '🎮', label: 'Loisirs' },
    { emoji: '👕', label: 'Vêtements' },
    { emoji: '💊', label: 'Santé' },
    { emoji: '🛒', label: 'Courses' },
    { emoji: '📦', label: 'Abonnements' },
    { emoji: '🎓', label: 'Éducation' },
    { emoji: '🔧', label: 'Autre' }
];

const CAT_COLORS = [
    '#9b59b6','#00d2a0','#e17055','#fdcb6e','#e84393',
    '#a29bfe','#fd79a8','#74b9ff','#ff9f43','#55efc4',
    '#c39bd3','#b2bec3'
];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    buildCategoryGrid();
    initTabs();
    initNavigation();
    initForms();
    initSettings();
    initPinSettings();
    initMonthFilters();
    setDefaultDates();
    renderAll();
    showInstallBanner();
    updateMonthLabel();
    checkPin();
});

// ===== PIN SYSTEM =====
function getStoredPin() {
    return localStorage.getItem('mb_pin');
}

function setStoredPin(pin) {
    localStorage.setItem('mb_pin', pin);
}

function removeStoredPin() {
    localStorage.removeItem('mb_pin');
}

function checkPin() {
    const pin = getStoredPin();
    if (pin) {
        // PIN exists -> show lock screen
        showLockScreen();
    } else {
        // No PIN -> go straight to app
        unlockApp();
    }
}

function showLockScreen() {
    document.getElementById('lockScreen').classList.remove('hidden');
    document.getElementById('appWrapper').style.display = 'none';
    document.getElementById('lockIcon').textContent = '🔒';
    document.getElementById('lockTitle').textContent = 'Entrez votre code';
    document.getElementById('lockSubtitle').textContent = '6 chiffres requis';
    document.getElementById('forgotBtn').style.display = 'block';
    pinInput = '';
    pinMode = 'unlock';
    pinAttempts = 0;
    updateDots('pinDots', pinInput);
    document.getElementById('pinError').textContent = '';
}

function unlockApp() {
    document.getElementById('lockScreen').classList.add('hidden');
    document.getElementById('appWrapper').style.display = 'flex';
}

function lockApp() {
    const pin = getStoredPin();
    if (pin) {
        showLockScreen();
    } else {
        showToast('🔓 Aucun code défini');
    }
}

// Lock screen keypad
function pressKey(num) {
    if (pinInput.length >= 6) return;
    pinInput += num;
    updateDots('pinDots', pinInput);

    // Haptic-like visual feedback
    if (pinInput.length === 6) {
        setTimeout(() => handlePinComplete(), 200);
    }
}

function pressDelete() {
    pinInput = pinInput.slice(0, -1);
    updateDots('pinDots', pinInput);
    document.getElementById('pinError').textContent = '';
}

function handlePinComplete() {
    const stored = getStoredPin();

    if (pinMode === 'unlock') {
        if (pinInput === stored) {
            // Success!
            setDotsState('pinDots', 'success');
            setTimeout(() => {
                unlockApp();
            }, 400);
        } else {
            // Wrong PIN
            pinAttempts++;
            setDotsState('pinDots', 'error');
            document.getElementById('pinError').textContent =
                pinAttempts >= 3
                    ? `Code incorrect (${pinAttempts} essais)`
                    : 'Code incorrect';

            setTimeout(() => {
                pinInput = '';
                updateDots('pinDots', pinInput);
            }, 500);
        }
    }
}

function forgotPin() {
    const secret = prompt(
        '⚠️ Réinitialisation du code PIN\n\n' +
        'Tapez RESET pour supprimer le code.\n' +
        '(Vos données ne seront pas effacées)'
    );

    if (secret && secret.toUpperCase() === 'RESET') {
        removeStoredPin();
        unlockApp();
        showToast('🔓 Code PIN supprimé');
    }
}

function updateDots(containerId, value) {
    const dots = document.querySelectorAll(`#${containerId} .dot`);
    dots.forEach((d, i) => {
        d.classList.remove('filled', 'error', 'success');
        if (i < value.length) d.classList.add('filled');
    });
}

function setDotsState(containerId, state) {
    const dots = document.querySelectorAll(`#${containerId} .dot`);
    dots.forEach(d => {
        d.classList.remove('filled', 'error', 'success');
        d.classList.add(state);
    });
}

// ===== PIN SETUP (in settings modal) =====
function initPinSettings() {
    updatePinStatus();

    document.getElementById('btnSetPin').addEventListener('click', () => {
        openPinModal('setup');
    });

    document.getElementById('btnChangePin').addEventListener('click', () => {
        openPinModal('change-verify');
    });

    document.getElementById('btnRemovePin').addEventListener('click', () => {
        openPinModal('remove');
    });
}

function updatePinStatus() {
    const pin = getStoredPin();
    const icon = document.getElementById('pinStatusIcon');
    const text = document.getElementById('pinStatusText');
    const sub = document.getElementById('pinStatusSub');
    const status = document.querySelector('.pin-status');
    const setBtn = document.getElementById('btnSetPin');
    const changeBtn = document.getElementById('btnChangePin');
    const removeBtn = document.getElementById('btnRemovePin');

    if (pin) {
        icon.textContent = '🔒';
        text.textContent = 'Code PIN activé';
        sub.textContent = 'Votre app est protégée';
        status.classList.add('active-pin');
        setBtn.style.display = 'none';
        changeBtn.style.display = 'block';
        removeBtn.style.display = 'block';
    } else {
        icon.textContent = '🔓';
        text.textContent = 'Aucun code défini';
        sub.textContent = 'Votre app n\'est pas protégée';
        status.classList.remove('active-pin');
        setBtn.style.display = 'block';
        changeBtn.style.display = 'none';
        removeBtn.style.display = 'none';
    }
}

function openPinModal(mode) {
    modalPinMode = mode;
    modalPinInput = '';
    modalPinTemp = '';
    document.getElementById('modalPinError').textContent = '';
    updateDots('modalPinDots', '');

    const title = document.getElementById('pinModalTitle');
    const msg = document.getElementById('pinModalMsg');

    switch(mode) {
        case 'setup':
            title.textContent = '🔐 Nouveau code PIN';
            msg.textContent = 'Entrez un code à 6 chiffres';
            break;
        case 'change-verify':
            title.textContent = '🔄 Changer le code';
            msg.textContent = 'Entrez votre code actuel';
            break;
        case 'remove':
            title.textContent = '🗑️ Supprimer le code';
            msg.textContent = 'Entrez votre code actuel pour confirmer';
            break;
    }

    document.getElementById('pinModal').classList.add('show');
}

function closePinModal() {
    document.getElementById('pinModal').classList.remove('show');
    modalPinInput = '';
    modalPinTemp = '';
}

function modalPressKey(num) {
    if (modalPinInput.length >= 6) return;
    modalPinInput += num;
    updateDots('modalPinDots', modalPinInput);

    if (modalPinInput.length === 6) {
        setTimeout(() => handleModalPinComplete(), 200);
    }
}

function modalPressDelete() {
    modalPinInput = modalPinInput.slice(0, -1);
    updateDots('modalPinDots', modalPinInput);
    document.getElementById('modalPinError').textContent = '';
}

function handleModalPinComplete() {
    const title = document.getElementById('pinModalTitle');
    const msg = document.getElementById('pinModalMsg');
    const err = document.getElementById('modalPinError');

    switch(modalPinMode) {
        case 'setup':
            // First entry — save temp and ask to confirm
            modalPinTemp = modalPinInput;
            modalPinInput = '';
            modalPinMode = 'confirm';
            title.textContent = '🔐 Confirmez le code';
            msg.textContent = 'Entrez le même code une 2ème fois';
            updateDots('modalPinDots', '');
            break;

        case 'confirm':
            if (modalPinInput === modalPinTemp) {
                setDotsState('modalPinDots', 'success');
                setStoredPin(modalPinTemp);
                setTimeout(() => {
                    closePinModal();
                    updatePinStatus();
                    showToast('🔒 Code PIN activé !');
                }, 500);
            } else {
                setDotsState('modalPinDots', 'error');
                err.textContent = 'Les codes ne correspondent pas';
                setTimeout(() => {
                    modalPinInput = '';
                    modalPinMode = 'setup';
                    modalPinTemp = '';
                    title.textContent = '🔐 Nouveau code PIN';
                    msg.textContent = 'Entrez un code à 6 chiffres';
                    updateDots('modalPinDots', '');
                    err.textContent = '';
                }, 800);
            }
            break;

        case 'change-verify':
            if (modalPinInput === getStoredPin()) {
                setDotsState('modalPinDots', 'success');
                setTimeout(() => {
                    modalPinInput = '';
                    modalPinMode = 'change-new';
                    title.textContent = '🔐 Nouveau code';
                    msg.textContent = 'Entrez votre nouveau code à 6 chiffres';
                    updateDots('modalPinDots', '');
                }, 400);
            } else {
                setDotsState('modalPinDots', 'error');
                err.textContent = 'Code incorrect';
                setTimeout(() => {
                    modalPinInput = '';
                    updateDots('modalPinDots', '');
                }, 500);
            }
            break;

        case 'change-new':
            modalPinTemp = modalPinInput;
            modalPinInput = '';
            modalPinMode = 'change-confirm';
            title.textContent = '🔐 Confirmez';
            msg.textContent = 'Entrez le nouveau code une 2ème fois';
            updateDots('modalPinDots', '');
            break;

        case 'change-confirm':
            if (modalPinInput === modalPinTemp) {
                setDotsState('modalPinDots', 'success');
                setStoredPin(modalPinTemp);
                setTimeout(() => {
                    closePinModal();
                    updatePinStatus();
                    showToast('🔒 Code PIN modifié !');
                }, 500);
            } else {
                setDotsState('modalPinDots', 'error');
                err.textContent = 'Les codes ne correspondent pas';
                setTimeout(() => {
                    modalPinInput = '';
                    modalPinMode = 'change-new';
                    modalPinTemp = '';
                    title.textContent = '🔐 Nouveau code';
                    msg.textContent = 'Entrez votre nouveau code à 6 chiffres';
                    updateDots('modalPinDots', '');
                    err.textContent = '';
                }, 800);
            }
            break;

        case 'remove':
            if (modalPinInput === getStoredPin()) {
                setDotsState('modalPinDots', 'success');
                removeStoredPin();
                setTimeout(() => {
                    closePinModal();
                    updatePinStatus();
                    showToast('🔓 Code PIN supprimé');
                }, 500);
            } else {
                setDotsState('modalPinDots', 'error');
                err.textContent = 'Code incorrect';
                setTimeout(() => {
                    modalPinInput = '';
                    updateDots('modalPinDots', '');
                }, 500);
            }
            break;
    }
}

// ===== STORAGE =====
function loadData() {
    try {
        const h = localStorage.getItem('mb_horaires');
        const d = localStorage.getItem('mb_depenses');
        const s = localStorage.getItem('mb_settings');
        if (h) App.horaires = JSON.parse(h);
        if (d) App.depenses = JSON.parse(d);
        if (s) App.settings = { ...App.settings, ...JSON.parse(s) };
    } catch(e) { console.error(e); }
}

function saveData() {
    localStorage.setItem('mb_horaires', JSON.stringify(App.horaires));
    localStorage.setItem('mb_depenses', JSON.stringify(App.depenses));
    localStorage.setItem('mb_settings', JSON.stringify(App.settings));
}

// ===== NAVIGATION =====
function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => goTab(btn.dataset.tab));
    });
}

function goTab(tab) {
    App.activeTab = tab;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === 'tab-' + tab));
    document.querySelector('.dashboard').style.display = 'grid';
    document.getElementById('mainScroll').scrollTo({ top: 0, behavior: 'smooth' });
    if (tab === 'resume') renderResume();
    if (tab === 'depenses') renderCatSummary();
}

// ===== TABS (form toggles) =====
function initTabs() {
    document.getElementById('btnToggleFormH').addEventListener('click', () => toggleForm('formCardH', 'btnToggleFormH'));
    document.getElementById('btnToggleFormD').addEventListener('click', () => toggleForm('formCardD', 'btnToggleFormD'));
}

function toggleForm(cardId, btnId) {
    const card = document.getElementById(cardId);
    const btn = document.getElementById(btnId);
    const collapsed = card.classList.contains('collapsed');
    card.classList.toggle('collapsed', !collapsed);
    btn.textContent = collapsed ? '✕ Fermer' : '+ Ajouter';
    if (collapsed) setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}

// ===== BUILD CATEGORIES =====
function buildCategoryGrid() {
    document.getElementById('catGrid').innerHTML = CATEGORIES.map(c => `
        <div class="cat-chip" data-cat="${c.emoji} ${c.label}" onclick="selectCat(this, '${c.emoji} ${c.label}')">
            <span class="cat-emoji">${c.emoji}</span>
            ${c.label}
        </div>
    `).join('');
}

function selectCat(el, value) {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('categorieDepense').value = value;
}

// ===== DEFAULT DATES =====
function setDefaultDates() {
    const today = todayStr();
    const month = today.substring(0, 7);
    document.getElementById('dateHoraire').value = today;
    document.getElementById('dateDepense').value = today;
    document.getElementById('filtreHoraireMois').value = month;
    document.getElementById('filtreDepenseMois').value = month;
    document.getElementById('filtreResumeMois').value = month;
    document.getElementById('tauxHoraire').value = App.settings.tauxHoraire;
    document.querySelectorAll('.devise-btn').forEach(b => b.classList.toggle('active', b.dataset.devise === App.settings.devise));
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function updateMonthLabel() {
    const now = new Date();
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    document.getElementById('currentMonthLabel').textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ===== FORMS =====
function initForms() {
    document.getElementById('formHoraire').addEventListener('submit', e => { e.preventDefault(); addHoraire(); });
    ['heureDebut','heureFin','pauseMinutes'].forEach(id => {
        document.getElementById(id).addEventListener('input', updatePreview);
    });
    document.getElementById('formDepense').addEventListener('submit', e => { e.preventDefault(); addDepense(); });
}

function updatePreview() {
    const debut = document.getElementById('heureDebut').value;
    const fin = document.getElementById('heureFin').value;
    const pause = parseInt(document.getElementById('pauseMinutes').value) || 0;
    if (debut && fin) {
        const mins = calcMinutes(debut, fin, pause);
        document.getElementById('previewDuree').textContent = formatDuree(mins);
        document.getElementById('previewGain').textContent = formatM((mins / 60) * App.settings.tauxHoraire);
    }
}

function addHoraire() {
    const date = document.getElementById('dateHoraire').value;
    const debut = document.getElementById('heureDebut').value;
    const fin = document.getElementById('heureFin').value;
    const pause = parseInt(document.getElementById('pauseMinutes').value) || 0;
    const note = document.getElementById('noteHoraire').value.trim();

    if (!date || !debut || !fin) { showToast('⚠️ Remplissez les champs'); return; }
    const minutes = calcMinutes(debut, fin, pause);
    if (minutes <= 0) { showToast('⚠️ Durée invalide'); return; }

    App.horaires.push({ id: Date.now(), date, debut, fin, pause, minutes, note, gain: (minutes / 60) * App.settings.tauxHoraire });
    App.horaires.sort((a, b) => b.date.localeCompare(a.date));
    saveData();
    renderAll();
    showToast(`✅ ${formatDuree(minutes)} ajouté !`);
    document.getElementById('heureDebut').value = '';
    document.getElementById('heureFin').value = '';
    document.getElementById('pauseMinutes').value = '0';
    document.getElementById('noteHoraire').value = '';
    document.getElementById('previewDuree').textContent = '--';
    document.getElementById('previewGain').textContent = '--';
    toggleForm('formCardH', 'btnToggleFormH');
}

function addDepense() {
    const date = document.getElementById('dateDepense').value;
    const montant = parseFloat(document.getElementById('montantDepense').value);
    const categorie = document.getElementById('categorieDepense').value;
    const description = document.getElementById('descriptionDepense').value.trim();

    if (!date || !montant || montant <= 0) { showToast('⚠️ Remplissez date et montant'); return; }
    if (!categorie) { showToast('⚠️ Choisissez une catégorie'); return; }

    App.depenses.push({ id: Date.now(), date, montant, categorie, description });
    App.depenses.sort((a, b) => b.date.localeCompare(a.date));
    saveData();
    renderAll();
    showToast(`✅ ${formatM(montant)} ajouté !`);
    document.getElementById('montantDepense').value = '';
    document.getElementById('descriptionDepense').value = '';
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('selected'));
    document.getElementById('categorieDepense').value = '';
    toggleForm('formCardD', 'btnToggleFormD');
}

function deleteHoraire(id) {
    showConfirm('Supprimer ?', 'Supprimer cet horaire ?', () => {
        App.horaires = App.horaires.filter(h => h.id !== id);
        saveData(); renderAll(); showToast('🗑️ Supprimé');
    });
}

function deleteDepense(id) {
    showConfirm('Supprimer ?', 'Supprimer cette dépense ?', () => {
        App.depenses = App.depenses.filter(d => d.id !== id);
        saveData(); renderAll(); showToast('🗑️ Supprimé');
    });
}

// ===== MONTH FILTERS =====
function initMonthFilters() {
    document.getElementById('filtreHoraireMois').addEventListener('change', () => { renderHoraires(); renderQuickStatsH(); });
    document.getElementById('prevH').addEventListener('click', () => changeMonth('filtreHoraireMois', -1, () => { renderHoraires(); renderQuickStatsH(); }));
    document.getElementById('nextH').addEventListener('click', () => changeMonth('filtreHoraireMois', 1, () => { renderHoraires(); renderQuickStatsH(); }));

    document.getElementById('filtreDepenseMois').addEventListener('change', () => { renderDepenses(); renderCatSummary(); renderQuickStatsD(); });
    document.getElementById('prevD').addEventListener('click', () => changeMonth('filtreDepenseMois', -1, () => { renderDepenses(); renderCatSummary(); renderQuickStatsD(); }));
    document.getElementById('nextD').addEventListener('click', () => changeMonth('filtreDepenseMois', 1, () => { renderDepenses(); renderCatSummary(); renderQuickStatsD(); }));

    document.getElementById('filtreResumeMois').addEventListener('change', renderResume);
    document.getElementById('prevR').addEventListener('click', () => changeMonth('filtreResumeMois', -1, renderResume));
    document.getElementById('nextR').addEventListener('click', () => changeMonth('filtreResumeMois', 1, renderResume));
}

function changeMonth(inputId, delta, cb) {
    const input = document.getElementById(inputId);
    if (!input.value) return;
    const [y, m] = input.value.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    input.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    cb();
}

function getHorairesForMonth(m) { return App.horaires.filter(h => h.date.startsWith(m)); }
function getDepensesForMonth(m) { return App.depenses.filter(d => d.date.startsWith(m)); }
function currentMonth() { return todayStr().substring(0, 7); }

// ===== RENDER ALL =====
function renderAll() {
    renderDashboard();
    renderHoraires();
    renderQuickStatsH();
    renderDepenses();
    renderCatSummary();
    renderQuickStatsD();
}

// ===== DASHBOARD =====
function renderDashboard() {
    const m = currentMonth();
    const horaires = getHorairesForMonth(m);
    const depenses = getDepensesForMonth(m);

    const totalMins = horaires.reduce((s, h) => s + h.minutes, 0);
    const revenus = horaires.reduce((s, h) => s + h.gain, 0);
    const totalDep = depenses.reduce((s, d) => s + d.montant, 0);
    const solde = revenus - totalDep;
    const jours = new Set(horaires.map(h => h.date)).size;

    document.getElementById('totalRevenus').textContent = formatM(revenus);
    document.getElementById('totalDepenses').textContent = formatM(totalDep);
    document.getElementById('totalHeures').textContent = formatDuree(totalMins);
    document.getElementById('totalJours').textContent = jours;

    const badge = document.getElementById('soldeBadge');
    const bar = document.getElementById('soldeBar');
    document.getElementById('solde').textContent = formatM(Math.abs(solde));

    if (solde > 0) {
        badge.textContent = '✅ Positif'; badge.className = 'solde-badge positive';
        bar.style.width = (revenus > 0 ? Math.min((solde / revenus) * 100, 100) : 0) + '%';
        bar.style.background = 'linear-gradient(90deg, #00d2a0, #55efc4)';
    } else if (solde < 0) {
        badge.textContent = '⚠️ Déficit'; badge.className = 'solde-badge negative';
        bar.style.width = '100%'; bar.style.background = 'linear-gradient(90deg, #ff6b6b, #fd79a8)';
    } else {
        badge.textContent = '⚖️ Équilibre'; badge.className = 'solde-badge neutral'; bar.style.width = '50%';
    }
}

function renderHoraires() {
    const m = document.getElementById('filtreHoraireMois').value;
    const horaires = getHorairesForMonth(m);
    const c = document.getElementById('listeHoraires');
    if (!horaires.length) { c.innerHTML = '<p class="empty-state">😴 Aucun horaire ce mois.<br><small>Appuyez sur "+ Ajouter"</small></p>'; return; }
    c.innerHTML = horaires.map(h => `<div class="list-item"><div class="list-item-icon">📅</div><div class="list-item-body"><div class="list-item-title">${formatDate(h.date)} · ${h.debut} – ${h.fin}</div><div class="list-item-sub">${formatDuree(h.minutes)}${h.pause > 0 ? ' (pause ' + h.pause + 'min)' : ''}${h.note ? ' · ' + h.note : ''}</div></div><div class="list-item-right"><span class="list-item-amount amount-green">${formatM(h.gain)}</span><button class="delete-btn" onclick="deleteHoraire(${h.id})">🗑️</button></div></div>`).join('');
}

function renderQuickStatsH() {
    const m = document.getElementById('filtreHoraireMois').value;
    const horaires = getHorairesForMonth(m);
    document.getElementById('qsJoursH').textContent = new Set(horaires.map(h => h.date)).size;
    document.getElementById('qsHeuresH').textContent = formatDuree(horaires.reduce((s, h) => s + h.minutes, 0));
    document.getElementById('qsGainH').textContent = formatM(horaires.reduce((s, h) => s + h.gain, 0));
}

function renderDepenses() {
    const m = document.getElementById('filtreDepenseMois').value;
    const depenses = getDepensesForMonth(m);
    const c = document.getElementById('listeDepenses');
    if (!depenses.length) { c.innerHTML = '<p class="empty-state">🎉 Aucune dépense ce mois !</p>'; return; }
    c.innerHTML = depenses.map(d => `<div class="list-item"><div class="list-item-icon">${d.categorie.split(' ')[0]}</div><div class="list-item-body"><div class="list-item-title">${d.description || d.categorie}</div><div class="list-item-sub">${d.categorie} · ${formatDate(d.date)}</div></div><div class="list-item-right"><span class="list-item-amount amount-red">-${formatM(d.montant)}</span><button class="delete-btn" onclick="deleteDepense(${d.id})">🗑️</button></div></div>`).join('');
}

function renderQuickStatsD() {
    const m = document.getElementById('filtreDepenseMois').value;
    const depenses = getDepensesForMonth(m);
    const total = depenses.reduce((s, d) => s + d.montant, 0);
    document.getElementById('qsNbD').textContent = depenses.length;
    document.getElementById('qsMoyD').textContent = formatM(depenses.length ? total / depenses.length : 0);
    document.getElementById('qsMaxD').textContent = formatM(depenses.length ? Math.max(...depenses.map(d => d.montant)) : 0);
}

function renderCatSummary() {
    const m = document.getElementById('filtreDepenseMois').value;
    const depenses = getDepensesForMonth(m);
    const c = document.getElementById('catSummary');
    if (!depenses.length) { c.innerHTML = ''; return; }
    const cats = {};
    depenses.forEach(d => { cats[d.categorie] = (cats[d.categorie] || 0) + d.montant; });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const max = sorted[0][1];
    c.innerHTML = sorted.map(([cat, amt], i) => `<div class="cat-row"><span class="cat-name">${cat}</span><div class="cat-track"><div class="cat-fill" style="width:${(amt/max)*100}%;background:${CAT_COLORS[i%CAT_COLORS.length]};"></div></div><span class="cat-amount">${formatM(amt)}</span></div>`).join('');
}

function renderResume() {
    const m = document.getElementById('filtreResumeMois').value;
    if (!m) return;
    const horaires = getHorairesForMonth(m);
    const depenses = getDepensesForMonth(m);
    const revenus = horaires.reduce((s, h) => s + h.gain, 0);
    const totalDep = depenses.reduce((s, d) => s + d.montant, 0);
    const solde = revenus - totalDep;
    const jours = new Set(horaires.map(h => h.date)).size;
    const mins = horaires.reduce((s, h) => s + h.minutes, 0);
    const moy = depenses.length ? totalDep / depenses.length : 0;

    document.getElementById('bilanRevenus').textContent = formatM(revenus);
    document.getElementById('bilanDepenses').textContent = formatM(totalDep);
    const total = revenus + totalDep;
    document.getElementById('progressGreen').style.width = (total > 0 ? (revenus/total)*100 : 50) + '%';
    document.getElementById('progressRed').style.width = (total > 0 ? (totalDep/total)*100 : 50) + '%';
    const se = document.getElementById('bilanSolde');
    se.textContent = (solde >= 0 ? '' : '-') + formatM(Math.abs(solde));
    se.className = solde >= 0 ? 'positive' : 'negative';
    const pct = revenus > 0 ? Math.round((totalDep/revenus)*100) : 0;
    document.getElementById('bilanPercent').textContent = revenus > 0 ? `Vous avez dépensé ${pct}% de vos revenus` : 'Aucun revenu ce mois';
    document.getElementById('statJours').textContent = jours;
    document.getElementById('statHeures').textContent = formatDuree(mins);
    document.getElementById('statNbDep').textContent = depenses.length;
    document.getElementById('statMoyDep').textContent = formatM(moy);
    renderBarChart(m, depenses);
    renderTopDepenses(depenses);
}

function renderBarChart(mois, depenses) {
    const c = document.getElementById('barChart');
    const [y, mo] = mois.split('-').map(Number);
    const days = new Date(y, mo, 0).getDate();
    const daily = {};
    depenses.forEach(d => { const day = parseInt(d.date.split('-')[2]); daily[day] = (daily[day]||0)+d.montant; });
    const maxVal = Object.values(daily).length ? Math.max(...Object.values(daily)) : 1;
    let html = '';
    for (let day = 1; day <= days; day++) {
        const val = daily[day]||0;
        const h = val > 0 ? Math.max((val/maxVal)*80, 4) : 0;
        html += `<div class="bar-col"><div class="bar-fill" style="height:${h}px;" title="${day}/${mo}: ${formatM(val)}"></div><span class="bar-label">${day}</span></div>`;
    }
    c.innerHTML = html || '<p style="color:var(--text2);font-size:0.85rem;text-align:center;width:100%">Aucune dépense</p>';
}

function renderTopDepenses(depenses) {
    const c = document.getElementById('topDepenses');
    if (!depenses.length) { c.innerHTML = '<p style="color:var(--text2);font-size:0.85rem;text-align:center;padding:12px">Aucune dépense</p>'; return; }
    c.innerHTML = [...depenses].sort((a,b)=>b.montant-a.montant).slice(0,5).map(d => `<div class="top-dep-item"><span>${d.categorie} ${d.description?'· '+d.description:''}</span><strong>-${formatM(d.montant)}</strong></div>`).join('');
}

// ===== SETTINGS =====
function initSettings() {
    document.getElementById('tauxPlus').addEventListener('click', () => { const i = document.getElementById('tauxHoraire'); i.value = (parseFloat(i.value)+0.5).toFixed(2); });
    document.getElementById('tauxMinus').addEventListener('click', () => { const i = document.getElementById('tauxHoraire'); const v = parseFloat(i.value)-0.5; if(v>=0)i.value=v.toFixed(2); });

    document.querySelectorAll('.devise-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.devise-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    document.getElementById('btnSaveSettings').addEventListener('click', () => {
        App.settings.tauxHoraire = parseFloat(document.getElementById('tauxHoraire').value) || 0;
        App.settings.devise = document.querySelector('.devise-btn.active')?.dataset.devise || '€';
        App.horaires.forEach(h => { h.gain = (h.minutes/60)*App.settings.tauxHoraire; });
        saveData(); renderAll(); showToast('⚙️ Réglages sauvegardés !');
    });

    document.getElementById('btnExport').addEventListener('click', () => {
        const data = { horaires: App.horaires, depenses: App.depenses, settings: App.settings, exportDate: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `monbudget_${todayStr()}.json`; a.click();
        URL.revokeObjectURL(url);
        showToast('📤 Données exportées !');
    });

    document.getElementById('btnImport').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if(data.horaires) App.horaires = data.horaires;
                if(data.depenses) App.depenses = data.depenses;
                if(data.settings) App.settings = {...App.settings,...data.settings};
                saveData(); setDefaultDates(); renderAll(); showToast('📥 Données importées !');
            } catch { showToast('❌ Fichier invalide'); }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    document.getElementById('btnReset').addEventListener('click', () => {
        showConfirm('⚠️ Tout supprimer ?', 'Toutes vos données seront effacées.', () => {
            App.horaires = []; App.depenses = [];
            saveData(); renderAll(); showToast('🗑️ Données supprimées');
        });
    });
}

// ===== MODALS =====
function showConfirm(title, message, onConfirm) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('show');
    const close = () => overlay.classList.remove('show');
    document.getElementById('modalConfirm').onclick = () => { close(); onConfirm(); };
    document.getElementById('modalCancel').onclick = close;
    overlay.onclick = e => { if(e.target === overlay) close(); };
}

// ===== INSTALL BANNER =====
function showInstallBanner() {
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isStandalone = window.navigator.standalone === true;
    const dismissed = localStorage.getItem('mb_banner_dismissed');
    if(isIOS && !isStandalone && !dismissed) document.getElementById('installBanner').classList.add('show');
    document.getElementById('installClose').addEventListener('click', () => {
        document.getElementById('installBanner').classList.remove('show');
        localStorage.setItem('mb_banner_dismissed', '1');
    });
}

// ===== TOAST =====
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'toast'; }, 2800);
}

// ===== UTILS =====
function calcMinutes(debut, fin, pause = 0) {
    const [dh,dm] = debut.split(':').map(Number);
    const [fh,fm] = fin.split(':').map(Number);
    let t = (fh*60+fm) - (dh*60+dm);
    if(t<0) t += 1440;
    return Math.max(0, t - pause);
}

function formatDuree(m) { return `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}`; }
function formatM(a) { return a.toFixed(2).replace('.',',') + ' ' + App.settings.devise; }
function formatDate(d) { const [y,m,j] = d.split('-'); return `${j}/${m}/${y}`; }
