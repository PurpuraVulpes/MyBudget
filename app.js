'use strict';

// ===== STATE =====
const App = {
    horaires: [],
    depenses: [],
    settings: { tauxHoraire: 12.00, devise: '€' },
    activeTab: 'horaires'
};

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
    '#e17055','#00b894','#6c5ce7','#fdcb6e','#e84393',
    '#00cec9','#fd79a8','#a29bfe','#74b9ff','#ff9f43',
    '#55efc4','#b2bec3'
];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    buildCategoryGrid();
    initTabs();
    initNavigation();
    initForms();
    initSettings();
    initMonthFilters();
    setDefaultDates();
    renderAll();
    showInstallBanner();
    updateMonthLabel();
});

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
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            goTab(tab);
        });
    });
}

function goTab(tab) {
    App.activeTab = tab;

    // Nav buttons
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
    });

    // Sections
    document.querySelectorAll('.tab-section').forEach(s => {
        s.classList.toggle('active', s.id === 'tab-' + tab);
    });

    // Dashboard always visible
    document.querySelector('.dashboard').style.display = 'grid';

    // Scroll to top
    document.getElementById('mainScroll').scrollTo({ top: 0, behavior: 'smooth' });

    if (tab === 'resume') renderResume();
    if (tab === 'depenses') renderCatSummary();
}

// ===== TABS (form toggles) =====
function initTabs() {
    document.getElementById('btnToggleFormH').addEventListener('click', () => {
        toggleForm('formCardH', 'btnToggleFormH');
    });
    document.getElementById('btnToggleFormD').addEventListener('click', () => {
        toggleForm('formCardD', 'btnToggleFormD');
    });
}

function toggleForm(cardId, btnId) {
    const card = document.getElementById(cardId);
    const btn = document.getElementById(btnId);
    const isCollapsed = card.classList.contains('collapsed');
    card.classList.toggle('collapsed', !isCollapsed);
    btn.textContent = isCollapsed ? '✕ Fermer' : '+ Ajouter';

    if (isCollapsed) {
        setTimeout(() => {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}

// ===== BUILD CATEGORIES =====
function buildCategoryGrid() {
    const grid = document.getElementById('catGrid');
    grid.innerHTML = CATEGORIES.map((c, i) => `
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

    // Devise buttons
    document.querySelectorAll('.devise-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.devise === App.settings.devise);
    });
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

function updateMonthLabel() {
    const now = new Date();
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    document.getElementById('currentMonthLabel').textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ===== FORMS =====
function initForms() {
    // Horaire
    document.getElementById('formHoraire').addEventListener('submit', e => {
        e.preventDefault();
        addHoraire();
    });

    ['heureDebut','heureFin','pauseMinutes'].forEach(id => {
        document.getElementById(id).addEventListener('input', updatePreview);
    });

    // Dépense
    document.getElementById('formDepense').addEventListener('submit', e => {
        e.preventDefault();
        addDepense();
    });
}

// ===== PREVIEW =====
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

// ===== ADD HORAIRE =====
function addHoraire() {
    const date = document.getElementById('dateHoraire').value;
    const debut = document.getElementById('heureDebut').value;
    const fin = document.getElementById('heureFin').value;
    const pause = parseInt(document.getElementById('pauseMinutes').value) || 0;
    const note = document.getElementById('noteHoraire').value.trim();

    if (!date || !debut || !fin) {
        showToast('⚠️ Remplissez date, début et fin', 'error');
        return;
    }

    const minutes = calcMinutes(debut, fin, pause);
    if (minutes <= 0) {
        showToast('⚠️ Durée invalide', 'error');
        return;
    }

    App.horaires.push({
        id: Date.now(),
        date, debut, fin, pause, minutes, note,
        gain: (minutes / 60) * App.settings.tauxHoraire
    });

    App.horaires.sort((a, b) => b.date.localeCompare(a.date));
    saveData();
    renderAll();

    showToast(`✅ ${formatDuree(minutes)} ajouté !`, 'success');
    document.getElementById('heureDebut').value = '';
    document.getElementById('heureFin').value = '';
    document.getElementById('pauseMinutes').value = '0';
    document.getElementById('noteHoraire').value = '';
    document.getElementById('previewDuree').textContent = '--';
    document.getElementById('previewGain').textContent = '--';
    toggleForm('formCardH', 'btnToggleFormH');
}

// ===== ADD DEPENSE =====
function addDepense() {
    const date = document.getElementById('dateDepense').value;
    const montant = parseFloat(document.getElementById('montantDepense').value);
    const categorie = document.getElementById('categorieDepense').value;
    const description = document.getElementById('descriptionDepense').value.trim();

    if (!date || !montant || montant <= 0) {
        showToast('⚠️ Remplissez date et montant', 'error');
        return;
    }
    if (!categorie) {
        showToast('⚠️ Choisissez une catégorie', 'error');
        return;
    }

    App.depenses.push({ id: Date.now(), date, montant, categorie, description });
    App.depenses.sort((a, b) => b.date.localeCompare(a.date));
    saveData();
    renderAll();

    showToast(`✅ ${formatM(montant)} ajouté !`, 'success');
    document.getElementById('montantDepense').value = '';
    document.getElementById('descriptionDepense').value = '';
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('selected'));
    document.getElementById('categorieDepense').value = '';
    toggleForm('formCardD', 'btnToggleFormD');
}

// ===== DELETE =====
function deleteHoraire(id) {
    showConfirm('Supprimer cet horaire ?', 'Cette action est irréversible.', () => {
        App.horaires = App.horaires.filter(h => h.id !== id);
        saveData();
        renderAll();
        showToast('🗑️ Horaire supprimé', 'info');
    });
}

function deleteDepense(id) {
    showConfirm('Supprimer cette dépense ?', 'Cette action est irréversible.', () => {
        App.depenses = App.depenses.filter(d => d.id !== id);
        saveData();
        renderAll();
        showToast('🗑️ Dépense supprimée', 'info');
    });
}

// ===== MONTH FILTERS =====
function initMonthFilters() {
    // Horaires
    document.getElementById('filtreHoraireMois').addEventListener('change', () => {
        renderHoraires();
        renderQuickStatsH();
    });
    document.getElementById('prevH').addEventListener('click', () => changeMonth('filtreHoraireMois', -1, () => { renderHoraires(); renderQuickStatsH(); }));
    document.getElementById('nextH').addEventListener('click', () => changeMonth('filtreHoraireMois', 1, () => { renderHoraires(); renderQuickStatsH(); }));

    // Depenses
    document.getElementById('filtreDepenseMois').addEventListener('change', () => {
        renderDepenses();
        renderCatSummary();
        renderQuickStatsD();
    });
    document.getElementById('prevD').addEventListener('click', () => changeMonth('filtreDepenseMois', -1, () => { renderDepenses(); renderCatSummary(); renderQuickStatsD(); }));
    document.getElementById('nextD').addEventListener('click', () => changeMonth('filtreDepenseMois', 1, () => { renderDepenses(); renderCatSummary(); renderQuickStatsD(); }));

    // Resume
    document.getElementById('filtreResumeMois').addEventListener('change', renderResume);
    document.getElementById('prevR').addEventListener('click', () => changeMonth('filtreResumeMois', -1, renderResume));
    document.getElementById('nextR').addEventListener('click', () => changeMonth('filtreResumeMois', 1, renderResume));
}

function changeMonth(inputId, delta, callback) {
    const input = document.getElementById(inputId);
    if (!input.value) return;
    const [y, m] = input.value.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    input.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    callback();
}

// ===== GETTERS =====
function getHorairesForMonth(monthStr) {
    return App.horaires.filter(h => h.date.startsWith(monthStr));
}

function getDepensesForMonth(monthStr) {
    return App.depenses.filter(d => d.date.startsWith(monthStr));
}

function currentMonth() {
    return todayStr().substring(0, 7);
}

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

    // Solde
    document.getElementById('solde').textContent = formatM(Math.abs(solde));
    const badge = document.getElementById('soldeBadge');
    const bar = document.getElementById('soldeBar');

    if (solde > 0) {
        badge.textContent = '✅ Positif';
        badge.className = 'solde-badge positive';
        const pct = revenus > 0 ? Math.min((solde / revenus) * 100, 100) : 0;
        bar.style.width = pct + '%';
        bar.style.background = 'linear-gradient(90deg, #00c896, #55efc4)';
    } else if (solde < 0) {
        badge.textContent = '⚠️ Déficit';
        badge.className = 'solde-badge negative';
        bar.style.width = '100%';
        bar.style.background = 'linear-gradient(90deg, #ff6b6b, #fd79a8)';
    } else {
        badge.textContent = '⚖️ Équilibre';
        badge.className = 'solde-badge neutral';
        bar.style.width = '50%';
    }
}

// ===== HORAIRES LIST =====
function renderHoraires() {
    const m = document.getElementById('filtreHoraireMois').value;
    const horaires = getHorairesForMonth(m);
    const container = document.getElementById('listeHoraires');

    if (!horaires.length) {
        container.innerHTML = '<p class="empty-state">😴 Aucun horaire ce mois.<br><small>Appuyez sur "+ Ajouter" pour commencer.</small></p>';
        return;
    }

    container.innerHTML = horaires.map(h => `
        <div class="list-item">
            <div class="list-item-icon">📅</div>
            <div class="list-item-body">
                <div class="list-item-title">${formatDate(h.date)} · ${h.debut} – ${h.fin}</div>
                <div class="list-item-sub">${formatDuree(h.minutes)}${h.pause > 0 ? ' (pause ' + h.pause + 'min)' : ''}${h.note ? ' · ' + h.note : ''}</div>
            </div>
            <div class="list-item-right">
                <span class="list-item-amount amount-green">${formatM(h.gain)}</span>
                <button class="delete-btn" onclick="deleteHoraire(${h.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderQuickStatsH() {
    const m = document.getElementById('filtreHoraireMois').value;
    const horaires = getHorairesForMonth(m);
    const jours = new Set(horaires.map(h => h.date)).size;
    const mins = horaires.reduce((s, h) => s + h.minutes, 0);
    const gain = horaires.reduce((s, h) => s + h.gain, 0);

    document.getElementById('qsJoursH').textContent = jours;
    document.getElementById('qsHeuresH').textContent = formatDuree(mins);
    document.getElementById('qsGainH').textContent = formatM(gain);
}

// ===== DEPENSES LIST =====
function renderDepenses() {
    const m = document.getElementById('filtreDepenseMois').value;
    const depenses = getDepensesForMonth(m);
    const container = document.getElementById('listeDepenses');

    if (!depenses.length) {
        container.innerHTML = '<p class="empty-state">🎉 Aucune dépense ce mois !<br><small>Profitez-en !</small></p>';
        return;
    }

    container.innerHTML = depenses.map(d => {
        const parts = d.categorie.split(' ');
        const emoji = parts[0];
        return `
            <div class="list-item">
                <div class="list-item-icon">${emoji}</div>
                <div class="list-item-body">
                    <div class="list-item-title">${d.description || d.categorie}</div>
                    <div class="list-item-sub">${d.categorie} · ${formatDate(d.date)}</div>
                </div>
                <div class="list-item-right">
                    <span class="list-item-amount amount-red">-${formatM(d.montant)}</span>
                    <button class="delete-btn" onclick="deleteDepense(${d.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderQuickStatsD() {
    const m = document.getElementById('filtreDepenseMois').value;
    const depenses = getDepensesForMonth(m);
    const total = depenses.reduce((s, d) => s + d.montant, 0);
    const moy = depenses.length ? total / depenses.length : 0;
    const max = depenses.length ? Math.max(...depenses.map(d => d.montant)) : 0;

    document.getElementById('qsNbD').textContent = depenses.length;
    document.getElementById('qsMoyD').textContent = formatM(moy);
    document.getElementById('qsMaxD').textContent = formatM(max);
}

// ===== CATEGORY SUMMARY =====
function renderCatSummary() {
    const m = document.getElementById('filtreDepenseMois').value;
    const depenses = getDepensesForMonth(m);
    const container = document.getElementById('catSummary');

    if (!depenses.length) { container.innerHTML = ''; return; }

    const cats = {};
    depenses.forEach(d => {
        cats[d.categorie] = (cats[d.categorie] || 0) + d.montant;
    });

    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const max = sorted[0][1];

    container.innerHTML = sorted.map(([cat, amt], i) => {
        const pct = (amt / max) * 100;
        const color = CAT_COLORS[i % CAT_COLORS.length];
        return `
            <div class="cat-row">
                <span class="cat-name">${cat}</span>
                <div class="cat-track">
                    <div class="cat-fill" style="width:${pct}%;background:${color};"></div>
                </div>
                <span class="cat-amount">${formatM(amt)}</span>
            </div>
        `;
    }).join('');
}

// ===== RESUME =====
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

    // Bilan
    document.getElementById('bilanRevenus').textContent = formatM(revenus);
    document.getElementById('bilanDepenses').textContent = formatM(totalDep);

    const total = revenus + totalDep;
    const pctRev = total > 0 ? (revenus / total) * 100 : 50;
    const pctDep = total > 0 ? (totalDep / total) * 100 : 50;
    document.getElementById('progressGreen').style.width = pctRev + '%';
    document.getElementById('progressRed').style.width = pctDep + '%';

    const soldeEl = document.getElementById('bilanSolde');
    soldeEl.textContent = (solde >= 0 ? '' : '-') + formatM(Math.abs(solde));
    soldeEl.className = solde >= 0 ? 'positive' : 'negative';

    const pct = revenus > 0 ? Math.round((totalDep / revenus) * 100) : 0;
    document.getElementById('bilanPercent').textContent = revenus > 0
        ? `Vous avez dépensé ${pct}% de vos revenus`
        : 'Aucun revenu enregistré ce mois';

    // Stats
    document.getElementById('statJours').textContent = jours;
    document.getElementById('statHeures').textContent = formatDuree(mins);
    document.getElementById('statNbDep').textContent = depenses.length;
    document.getElementById('statMoyDep').textContent = formatM(moy);

    // Chart
    renderBarChart(m, depenses);

    // Top dépenses
    renderTopDepenses(depenses);
}

function renderBarChart(mois, depenses) {
    const container = document.getElementById('barChart');
    const [y, mo] = mois.split('-').map(Number);
    const daysInMonth = new Date(y, mo, 0).getDate();

    const daily = {};
    depenses.forEach(d => {
        const day = parseInt(d.date.split('-')[2]);
        daily[day] = (daily[day] || 0) + d.montant;
    });

    const maxVal = Object.values(daily).length ? Math.max(...Object.values(daily)) : 1;

    let html = '';
    for (let day = 1; day <= daysInMonth; day++) {
        const val = daily[day] || 0;
        const h = val > 0 ? Math.max((val / maxVal) * 80, 4) : 0;
        html += `
            <div class="bar-col">
                <div class="bar-fill" style="height:${h}px;" title="${day}/${mo}: ${formatM(val)}"></div>
                <span class="bar-label">${day}</span>
            </div>
        `;
    }

    container.innerHTML = html || '<p style="color:var(--text2);font-size:0.85rem;text-align:center;width:100%">Aucune dépense</p>';
}

function renderTopDepenses(depenses) {
    const container = document.getElementById('topDepenses');
    if (!depenses.length) {
        container.innerHTML = '<p style="color:var(--text2);font-size:0.85rem;text-align:center;padding:12px">Aucune dépense</p>';
        return;
    }
    const sorted = [...depenses].sort((a, b) => b.montant - a.montant).slice(0, 5);
    container.innerHTML = sorted.map(d => `
        <div class="top-dep-item">
            <span>${d.categorie} ${d.description ? '· ' + d.description : ''}</span>
            <strong>-${formatM(d.montant)}</strong>
        </div>
    `).join('');
}

// ===== SETTINGS =====
function initSettings() {
    // Stepper
    document.getElementById('tauxPlus').addEventListener('click', () => {
        const input = document.getElementById('tauxHoraire');
        input.value = (parseFloat(input.value) + 0.5).toFixed(2);
    });
    document.getElementById('tauxMinus').addEventListener('click', () => {
        const input = document.getElementById('tauxHoraire');
        const val = parseFloat(input.value) - 0.5;
        if (val >= 0) input.value = val.toFixed(2);
    });

    // Devise
    document.querySelectorAll('.devise-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.devise-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Save
    document.getElementById('btnSaveSettings').addEventListener('click', () => {
        const taux = parseFloat(document.getElementById('tauxHoraire').value);
        const devise = document.querySelector('.devise-btn.active')?.dataset.devise || '€';

        if (isNaN(taux) || taux < 0) {
            showToast('⚠️ Taux invalide', 'error');
            return;
        }

        App.settings.tauxHoraire = taux;
        App.settings.devise = devise;

        // Recalculate gains
        App.horaires.forEach(h => {
            h.gain = (h.minutes / 60) * taux;
        });

        saveData();
        renderAll();
        showToast('⚙️ Réglages sauvegardés !', 'success');
    });

    // Export
    document.getElementById('btnExport').addEventListener('click', () => {
        const data = {
            horaires: App.horaires,
            depenses: App.depenses,
            settings: App.settings,
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monbudget_${todayStr()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('📤 Données exportées !', 'success');
    });

    // Import
    document.getElementById('btnImport').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.horaires) App.horaires = data.horaires;
                if (data.depenses) App.depenses = data.depenses;
                if (data.settings) App.settings = { ...App.settings, ...data.settings };
                saveData();
                setDefaultDates();
                renderAll();
                showToast('📥 Données importées !', 'success');
            } catch {
                showToast('❌ Fichier invalide', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // Reset
    document.getElementById('btnReset').addEventListener('click', () => {
        showConfirm(
            '⚠️ Supprimer tout ?',
            'Toutes vos données seront effacées définitivement.',
            () => {
                App.horaires = [];
                App.depenses = [];
                saveData();
                renderAll();
                showToast('🗑️ Données supprimées', 'info');
            }
        );
    });
}

// ===== MODAL CONFIRM =====
function showConfirm(title, message, onConfirm) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('show');

    const confirm = document.getElementById('modalConfirm');
    const cancel = document.getElementById('modalCancel');

    const close = () => overlay.classList.remove('show');

    confirm.onclick = () => { close(); onConfirm(); };
    cancel.onclick = close;
    overlay.onclick = e => { if (e.target === overlay) close(); };
}

// ===== INSTALL BANNER (iOS) =====
function showInstallBanner() {
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isStandalone = window.navigator.standalone === true;
    const dismissed = localStorage.getItem('mb_banner_dismissed');

    if (isIOS && !isStandalone && !dismissed) {
        document.getElementById('installBanner').classList.add('show');
    }

    document.getElementById('installClose').addEventListener('click', () => {
        document.getElementById('installBanner').classList.remove('show');
        localStorage.setItem('mb_banner_dismissed', '1');
    });
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'toast'; }, 2800);
}

// ===== UTILS =====
function calcMinutes(debut, fin, pause = 0) {
    const [dh, dm] = debut.split(':').map(Number);
    const [fh, fm] = fin.split(':').map(Number);
    let total = (fh * 60 + fm) - (dh * 60 + dm);
    if (total < 0) total += 1440;
    return Math.max(0, total - pause);
}

function formatDuree(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${String(m).padStart(2, '0')}`;
}

function formatM(amount) {
    return amount.toFixed(2).replace('.', ',') + ' ' + App.settings.devise;
}

function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}