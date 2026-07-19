/* ============================================
   RECURRENT-CHECK.JS - Auto-traitement des récurrentes
   ============================================ */

'use strict';

const RecurrentCheck = {

    // Dernière vérification effectuée
    _lastCheck: null,

    /**
     * ==========================================
     * INITIALISATION
     * ==========================================
     */
    init() {
        // Charger la date de la dernière vérification
        const saved = localStorage.getItem('mb_recurrent_last_check');
        if (saved) {
            this._lastCheck = new Date(saved);
        }

        // Vérifier au lancement (avec un léger délai)
        setTimeout(() => this.checkPending(), 2000);

        // Puis vérifier toutes les heures
        setInterval(() => this.checkPending(), 60 * 60 * 1000);
    },

    /**
     * ==========================================
     * VÉRIFICATION DES RÉCURRENTES ÉCHUES
     * ==========================================
     */

    /**
     * Vérifie s'il y a des récurrentes échues à traiter
     */
    checkPending() {
        if (!State.modules.recurrent) return;

        const pending = this.getPendingRecurrents();

        if (pending.length > 0) {
            console.log(`🔁 ${pending.length} récurrente(s) en attente`);
            this.showCheckSheet(pending);
        }

        // Mettre à jour la date de dernière vérification
        this._lastCheck = new Date();
        localStorage.setItem('mb_recurrent_last_check', this._lastCheck.toISOString());
    },

    /**
     * Récupère les récurrentes échues non traitées
     */
    getPendingRecurrents() {
        const recurrent = (State.data.recurrent || []).filter(r => r.actif !== false);
        const today = new Date();
        const pending = [];

        recurrent.forEach(r => {
            // Vérifier si la récurrente a une échéance dans le passé récent (7 derniers jours)
            const dates = this.getExpectedDates(r, 7);

            dates.forEach(expectedDate => {
                // Vérifier si une dépense correspondante existe déjà
                if (!this.hasCorrespondingExpense(r, expectedDate)) {
                    pending.push({
                        recurrent: r,
                        expectedDate: expectedDate,
                        daysAgo: this.daysBetween(expectedDate, today)
                    });
                }
            });
        });

        // Trier par ancienneté (plus vieux d'abord)
        pending.sort((a, b) => b.daysAgo - a.daysAgo);

        return pending;
    },

    /**
     * Calcule les dates d'échéance attendues sur les X derniers jours
     */
    getExpectedDates(recurrent, daysBack) {
        const dates = [];
        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - daysBack);

        // Parcourir chaque jour depuis daysBack jours
        let current = new Date(startDate);

        while (current <= today) {
            if (current.getDate() === recurrent.jour) {
                dates.push(new Date(current));
            }
            current.setDate(current.getDate() + 1);
        }

        return dates;
    },

    /**
     * Vérifie si une dépense correspondante à la récurrente existe déjà
     */
    hasCorrespondingExpense(recurrent, expectedDate) {
        const dateStr = this.dateToString(expectedDate);
        const startDate = new Date(expectedDate);
        startDate.setDate(startDate.getDate() - 2); // Tolérance de 2 jours avant

        const endDate = new Date(expectedDate);
        endDate.setDate(endDate.getDate() + 2); // Tolérance de 2 jours après

        return State.data.depenses.some(d => {
            const depDate = new Date(d.date);

            // Même catégorie et dans la plage de dates
            if (depDate >= startDate && depDate <= endDate) {
                // Vérifier que c'est bien lié à cette récurrente
                if (d.recurrentId === recurrent.id) return true;
                if (d.categorie === recurrent.categorie &&
                    Math.abs(d.montant - recurrent.montant) < 0.01) {
                    return true;
                }
            }

            return false;
        });
    },

    /**
     * Nombre de jours entre 2 dates
     */
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);
        return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    },

    /**
     * Formate une date en YYYY-MM-DD
     */
    dateToString(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    /**
     * ==========================================
     * SHEET DE VÉRIFICATION
     * ==========================================
     */

    /**
     * Affiche la sheet demandant confirmation
     */
    showCheckSheet(pending) {
        const total = pending.reduce((s, p) => s + p.recurrent.montant, 0);

        let html = `
            <div class="banner banner-info" style="margin-bottom: var(--space-md);">
                <span class="banner-icon">🔁</span>
                <div class="banner-body">
                    <div class="banner-title">Dépenses récurrentes échues</div>
                    <div class="banner-text">
                        ${pending.length} paiement${pending.length > 1 ? 's' : ''} devrait${pending.length > 1 ? 'ent' : ''} avoir été effectué${pending.length > 1 ? 's' : ''}.
                        Cochez ceux qui ont été payés.
                    </div>
                </div>
            </div>

            <div class="recurrent-check-list" id="recurrentCheckList">
        `;

        pending.forEach((p, index) => {
            const emoji = p.recurrent.categorie ? p.recurrent.categorie.split(' ')[0] : '🔁';
            const dateLabel = this.formatDateLabel(p.expectedDate, p.daysAgo);

            html += `
                <div class="recurrent-check-item" data-check-index="${index}">
                    <button type="button" class="recurrent-check-checkbox" data-check-toggle="${index}"></button>
                    <div class="recurrent-check-body">
                        <div class="recurrent-check-name">${emoji} ${p.recurrent.nom}</div>
                        <div class="recurrent-check-info">
                            📅 ${dateLabel} · ${p.recurrent.categorie}
                        </div>
                    </div>
                    <div class="recurrent-check-amount">-${Format.money(p.recurrent.montant)}</div>
                </div>
            `;
        });

        html += `
            </div>

            <div style="padding: var(--space-md); background: var(--bg3); border-radius: var(--radius-md); margin-bottom: var(--space-md); text-align: center;">
                <div style="font-size: var(--text-xs); color: var(--text2); margin-bottom: 4px;">Total à enregistrer</div>
                <div style="font-size: var(--text-lg); font-weight: var(--font-extrabold); color: var(--danger);" id="checkTotal">
                    -${Format.money(0)}
                </div>
            </div>

            <div class="form">
                <button class="btn btn-primary btn-block" id="btnCheckAll">
                    ✅ Tout cocher
                </button>
                <button class="btn btn-success btn-block" id="btnConfirmCheck" disabled>
                    💾 Enregistrer les paiements
                </button>
                <button class="btn btn-secondary btn-block" id="btnSkipCheck">
                    Plus tard
                </button>
            </div>
        `;

        Router.openSheet('recurrent-check', '🔁 Récurrentes échues', html);

        // Stocker les pending pour les événements
        this._currentPending = pending;
        this._checkedIndexes = new Set();

        setTimeout(() => this.attachCheckEvents(), 100);
    },

    /**
     * Formate la date en label lisible
     */
    formatDateLabel(date, daysAgo) {
        if (daysAgo === 0) return "Aujourd'hui";
        if (daysAgo === 1) return 'Hier';
        if (daysAgo < 7) return `Il y a ${daysAgo} jours`;

        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long'
        });
    },

    /**
     * Attache les événements
     */
    attachCheckEvents() {
        // Toggle d'un item
        document.querySelectorAll('[data-check-toggle]').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.checkToggle);
                this.toggleCheck(index);
            });
        });

        // Tout cocher
        document.getElementById('btnCheckAll')?.addEventListener('click', () => {
            this.toggleAll();
        });

        // Confirmer
        document.getElementById('btnConfirmCheck')?.addEventListener('click', () => {
            this.confirmChecked();
        });

        // Plus tard
        document.getElementById('btnSkipCheck')?.addEventListener('click', () => {
            Router.closeSheet();
            Toast.info('⏭️ Vous pouvez revenir plus tard');
        });
    },

    /**
     * Toggle la sélection d'un item
     */
    toggleCheck(index) {
        const item = document.querySelector(`[data-check-index="${index}"]`);
        const checkbox = document.querySelector(`[data-check-toggle="${index}"]`);

        if (!item || !checkbox) return;

        if (this._checkedIndexes.has(index)) {
            this._checkedIndexes.delete(index);
            item.classList.remove('checked');
            checkbox.textContent = '';
        } else {
            this._checkedIndexes.add(index);
            item.classList.add('checked');
            checkbox.textContent = '✓';
        }

        this.updateTotal();
    },

    /**
     * Tout cocher / décocher
     */
    toggleAll() {
        const allChecked = this._checkedIndexes.size === this._currentPending.length;

        if (allChecked) {
            // Tout décocher
            this._checkedIndexes.clear();
            document.querySelectorAll('.recurrent-check-item').forEach(item => {
                item.classList.remove('checked');
                const checkbox = item.querySelector('.recurrent-check-checkbox');
                if (checkbox) checkbox.textContent = '';
            });
        } else {
            // Tout cocher
            this._currentPending.forEach((_, index) => {
                this._checkedIndexes.add(index);
                const item = document.querySelector(`[data-check-index="${index}"]`);
                const checkbox = document.querySelector(`[data-check-toggle="${index}"]`);
                if (item) item.classList.add('checked');
                if (checkbox) checkbox.textContent = '✓';
            });
        }

        this.updateTotal();
    },

    /**
     * Met à jour le total
     */
    updateTotal() {
        let total = 0;
        this._checkedIndexes.forEach(index => {
            const item = this._currentPending[index];
            if (item) total += item.recurrent.montant;
        });

        const totalEl = document.getElementById('checkTotal');
        if (totalEl) {
            totalEl.textContent = '-' + Format.money(total);
        }

        const confirmBtn = document.getElementById('btnConfirmCheck');
        if (confirmBtn) {
            confirmBtn.disabled = this._checkedIndexes.size === 0;
            confirmBtn.textContent = this._checkedIndexes.size === 0
                ? '💾 Enregistrer les paiements'
                : `💾 Enregistrer ${this._checkedIndexes.size} paiement${this._checkedIndexes.size > 1 ? 's' : ''}`;
        }
    },

    /**
     * Confirme et enregistre les paiements cochés
     */
    confirmChecked() {
        if (this._checkedIndexes.size === 0) return;

        let count = 0;
        let totalAmount = 0;

        this._checkedIndexes.forEach(index => {
            const pending = this._currentPending[index];
            if (!pending) return;

            const depense = {
                id: StateHelpers.generateId(),
                date: this.dateToString(pending.expectedDate),
                montant: pending.recurrent.montant,
                categorie: pending.recurrent.categorie,
                description: `${pending.recurrent.nom} (récurrent)`,
                recurrentId: pending.recurrent.id
            };

            App.addData('depenses', depense);
            count++;
            totalAmount += depense.montant;
        });

        // Trier les dépenses
        State.data.depenses.sort((a, b) => b.date.localeCompare(a.date));

        Router.closeSheet();

        Toast.success(`✅ ${count} paiement${count > 1 ? 's' : ''} enregistré${count > 1 ? 's' : ''} (${Format.money(totalAmount)})`);

        // Rafraîchir
        if (State.currentPage === 'home' && typeof Dashboard !== 'undefined') Dashboard.render();
        if (State.currentPage === 'budget' && typeof Depenses !== 'undefined') Depenses.refresh();

        this._currentPending = null;
        this._checkedIndexes = null;
    },

    /**
     * ==========================================
     * FONCTION MANUELLE (bouton "Vérifier")
     * ==========================================
     */

    /**
     * Vérification manuelle (depuis les réglages par exemple)
     */
    manualCheck() {
        const pending = this.getPendingRecurrents();

        if (pending.length === 0) {
            Toast.success('✅ Toutes vos dépenses récurrentes sont à jour !');
            return;
        }

        this.showCheckSheet(pending);
    }
};

// Alias global
window.RecurrentCheck = RecurrentCheck;
