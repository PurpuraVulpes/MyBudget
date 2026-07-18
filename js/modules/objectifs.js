/* ============================================
   OBJECTIFS.JS - Objectifs d'épargne
   ============================================ */

'use strict';

const Objectifs = {

    /**
     * ==========================================
     * FORMULAIRE D'AJOUT
     * ==========================================
     */

    openAddForm() {
        const html = `
            <div class="form">
                <div class="form-group">
                    <label class="form-label">🎯 Nom de l'objectif</label>
                    <input type="text" id="addObjNom" placeholder="Ex: Vacances au Japon" required>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">💶 Montant total (${State.settings.devise})</label>
                        <input type="number" id="addObjMontant" step="0.01" min="0.01"
                               placeholder="0,00" inputmode="decimal" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">💰 Épargne/mois</label>
                        <input type="number" id="addObjMensuel" step="0.01" min="0.01"
                               placeholder="0,00" inputmode="decimal" required>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">💵 Déjà mis de côté</label>
                    <input type="number" id="addObjDeja" step="0.01" min="0"
                           value="0" inputmode="decimal">
                </div>

                <div class="form-group">
                    <label class="form-label">🎨 Icône</label>
                    ${FormHelpers.renderEmojiGrid(EMOJIS_OBJECTIFS, 'addObjEmoji', '🎯')}
                </div>

                <div id="objPreview" style="display: none;">
                    <div class="calc-result" style="margin-top: var(--space-md);">
                        <span class="calc-result-icon">⏱️</span>
                        <div class="calc-result-text" id="objPreviewText"></div>
                    </div>
                </div>

                <button class="btn btn-primary btn-block" id="btnSaveObj">
                    ✅ Créer l'objectif
                </button>
            </div>
        `;

        Router.openSheet('add-objectif', '🎯 Nouvel objectif', html);

        setTimeout(() => {
            FormHelpers.attachEmojiEvents(document.getElementById('sheetContent'));

            // Preview en temps réel
            ['addObjMontant', 'addObjMensuel', 'addObjDeja'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', () => this.updatePreview());
            });

            document.getElementById('btnSaveObj')?.addEventListener('click', () => this.save());
        }, 100);
    },

    /**
     * Preview du temps nécessaire
     */
    updatePreview() {
        const montant = FormHelpers.getNumber('addObjMontant');
        const mensuel = FormHelpers.getNumber('addObjMensuel');
        const deja = FormHelpers.getNumber('addObjDeja');

        const preview = document.getElementById('objPreview');
        const text = document.getElementById('objPreviewText');

        if (!preview || !text || montant <= 0 || mensuel <= 0) {
            if (preview) preview.style.display = 'none';
            return;
        }

        preview.style.display = 'block';
        const calc = this.calculate(montant, mensuel, deja);

        if (calc.done) {
            text.innerHTML = `<strong>Objectif déjà atteint !</strong><br>Vous avez ${Format.money(deja)} sur ${Format.money(montant)}`;
            text.className = 'calc-result-text done';
        } else {
            const dateStr = calc.date ? ` → <strong>${Format.dateToMonthYear(calc.date)}</strong>` : '';
            text.innerHTML = `Il vous faudra <strong>${Format.monthsToDuration(calc.mois)}</strong>${dateStr}<br><small style="color: var(--text2); font-size: 0.75rem;">(${Math.round(calc.percent)}% déjà atteint)</small>`;
            text.className = 'calc-result-text';
        }
    },

    /**
     * Sauvegarde un objectif
     */
    save() {
        const nom = FormHelpers.getText('addObjNom');
        const montant = FormHelpers.getNumber('addObjMontant');
        const mensuel = FormHelpers.getNumber('addObjMensuel');
        const deja = FormHelpers.getNumber('addObjDeja');
        const emoji = FormHelpers.getText('addObjEmoji') || '🎯';

        if (!nom || montant <= 0 || mensuel <= 0) {
            Toast.warning('⚠️ Remplissez tous les champs obligatoires');
            return;
        }

        const objectif = {
            id: StateHelpers.generateId(),
            nom: nom,
            montant: montant,
            mensuel: mensuel,
            deja: deja,
            emoji: emoji,
            dateCreation: StateHelpers.today()
        };

        App.addData('objectifs', objectif);

        Router.closeSheet();
        Toast.success('✅ Objectif "' + nom + '" créé !');

        if (State.currentPage === 'home') Dashboard.render();
    },

    /**
     * ==========================================
     * CALCULATEUR RAPIDE (sans enregistrer)
     * ==========================================
     */

    openCalculator() {
        const html = `
            <div class="calc-card">
                <div class="calc-header">
                    <span class="calc-icon">🧮</span>
                    <div class="calc-header-text">
                        <strong>Calculateur rapide</strong>
                        <small>Simulez sans enregistrer</small>
                    </div>
                </div>

                <div class="calc-fields">
                    <div class="form-group">
                        <label class="form-label">🎯 Montant à atteindre (${State.settings.devise})</label>
                        <input type="number" id="calcMontant" step="0.01" min="0"
                               placeholder="Ex: 3000" inputmode="decimal">
                    </div>
                    <div class="form-group">
                        <label class="form-label">💰 J'épargne par mois (${State.settings.devise})</label>
                        <input type="number" id="calcMensuel" step="0.01" min="0"
                               placeholder="Ex: 150" inputmode="decimal">
                    </div>
                    <div class="form-group">
                        <label class="form-label">💵 J'ai déjà (${State.settings.devise})</label>
                        <input type="number" id="calcDeja" step="0.01" min="0"
                               value="0" inputmode="decimal">
                    </div>
                </div>

                <div class="calc-result" id="calcResult">
                    <span class="calc-result-icon">⏱️</span>
                    <div class="calc-result-text" id="calcResultText">
                        Entrez un montant et une épargne mensuelle
                    </div>
                </div>
            </div>

            <button class="btn btn-primary btn-block" onclick="Router.closeSheet(); setTimeout(() => Objectifs.openAddForm(), 200);" style="margin-top: var(--space-md);">
                ✨ Créer un vrai objectif
            </button>
        `;

        Router.openSheet('calc', '🧮 Calculateur', html);

        setTimeout(() => {
            ['calcMontant', 'calcMensuel', 'calcDeja'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', () => this.updateCalcResult());
            });
        }, 100);
    },

    /**
     * Met à jour le résultat du calculateur
     */
    updateCalcResult() {
        const montant = FormHelpers.getNumber('calcMontant');
        const mensuel = FormHelpers.getNumber('calcMensuel');
        const deja = FormHelpers.getNumber('calcDeja');

        const text = document.getElementById('calcResultText');
        const icon = document.querySelector('#calcResult .calc-result-icon');

        if (!text || !icon) return;

        if (montant <= 0 || mensuel <= 0) {
            text.textContent = 'Entrez un montant et une épargne mensuelle';
            text.className = 'calc-result-text';
            icon.textContent = '⏱️';
            return;
        }

        const calc = this.calculate(montant, mensuel, deja);

        if (calc.done) {
            icon.textContent = '🎉';
            text.innerHTML = `<strong>Objectif atteint !</strong><br>Vous avez déjà ${Format.money(deja)} sur ${Format.money(montant)}`;
            text.className = 'calc-result-text done';
        } else {
            icon.textContent = '⏱️';
            const dateStr = calc.date ? ` → <strong>${Format.dateToMonthYear(calc.date)}</strong>` : '';
            text.innerHTML = `Il vous faudra <strong>${Format.monthsToDuration(calc.mois)}</strong>${dateStr}<br><small style="color: var(--text2); font-size: 0.75rem;">(${Math.round(calc.percent)}% déjà atteint)</small>`;
            text.className = 'calc-result-text';
        }
    },

    /**
     * ==========================================
     * CALCUL
     * ==========================================
     */

    calculate(montant, mensuel, deja) {
        const restant = montant - deja;

        if (restant <= 0) {
            return { done: true, mois: 0, date: null, percent: 100 };
        }

        if (mensuel <= 0) {
            return { done: false, mois: Infinity, date: null, percent: (deja / montant) * 100 };
        }

        const mois = Math.ceil(restant / mensuel);
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth() + mois, 1);
        const percent = (deja / montant) * 100;

        return { done: false, mois: mois, date: target, percent: percent };
    },

    /**
     * ==========================================
     * PAGE PRINCIPALE (liste des objectifs)
     * ==========================================
     */

    renderPage() {
        let html = '';

        // Bouton calculateur
        html += `
            <button class="btn btn-outline btn-block" onclick="Objectifs.openCalculator()" style="margin-bottom: var(--space-md);">
                🧮 Calculateur rapide
            </button>
        `;

        // Bouton nouvel objectif
        html += `
            <button class="btn btn-primary btn-block" onclick="Objectifs.openAddForm()" style="margin-bottom: var(--space-md);">
                ➕ Nouvel objectif
            </button>
        `;

        // Liste
        html += '<div id="objectifsList"></div>';

        Router.openSheet('objectifs-page', '🎯 Mes Objectifs', html);

        setTimeout(() => this.refreshList(), 100);
    },

    /**
     * Rafraîchit la liste des objectifs
     */
    refreshList() {
        const container = document.getElementById('objectifsList');
        if (!container) return;

        const objectifs = State.data.objectifs || [];

        if (objectifs.length === 0) {
            container.innerHTML = FormHelpers.renderEmptyState(
                '🎯', 'Aucun objectif',
                'Créez votre premier objectif !'
            );
            return;
        }

        container.innerHTML = objectifs.map(o => this.renderObjectifCard(o)).join('');

        // Attacher les événements
        this.attachObjectifEvents(container);
    },

    /**
     * Rendu d'une carte objectif
     */
    renderObjectifCard(o) {
        const calc = this.calculate(o.montant, o.mensuel, o.deja);
        const percentTxt = Math.min(100, Math.round(calc.percent));
        const dateStr = calc.date ? Format.dateToMonthYear(calc.date) : '—';
        const doneClass = calc.done ? ' done' : '';
        const fillClass = calc.done ? ' success' : '';
        const percentClass = calc.done ? ' done' : '';
        const badge = calc.done ? '<span class="done-badge">✅ Atteint !</span>' : '';

        let html = `
            <div class="objectif-card${doneClass}">
                <div class="objectif-header">
                    <div class="objectif-emoji">${o.emoji}</div>
                    <div class="objectif-info">
                        <div class="objectif-name">${o.nom}</div>
                        <div class="objectif-target">Objectif : ${Format.money(o.montant)}</div>
                    </div>
                    <div class="objectif-actions">
                        ${badge}
                        <button class="objectif-action-btn" data-obj-edit="${o.id}" title="Modifier">✏️</button>
                        <button class="objectif-action-btn danger" data-obj-delete="${o.id}" title="Supprimer">🗑️</button>
                    </div>
                </div>

                <div class="objectif-progress-wrap">
                    <div class="progress progress-lg">
                        <div class="progress-bar${fillClass}" style="width: ${percentTxt}%;"></div>
                    </div>
                    <div class="objectif-progress-info">
                        <span class="objectif-progress-percent${percentClass}">${percentTxt}%</span>
                        <span class="objectif-progress-amount">${Format.money(o.deja)} / ${Format.money(o.montant)}</span>
                    </div>
                </div>

                <div class="objectif-stats-row">
                    <div class="objectif-stat">
                        <span class="objectif-stat-icon">💰</span>
                        <div class="objectif-stat-text">
                            <strong>${Format.money(o.mensuel)}</strong>
                            <small>par mois</small>
                        </div>
                    </div>
                    <div class="objectif-stat">
                        <span class="objectif-stat-icon">🗓️</span>
                        <div class="objectif-stat-text">
                            <strong>${calc.done ? '—' : Format.monthsToDuration(calc.mois)}</strong>
                            <small>${calc.done ? 'Terminé' : dateStr}</small>
                        </div>
                    </div>
                </div>
        `;

        // Boutons rapides (si non terminé)
        if (!calc.done) {
            html += `
                <div class="deja-quick-buttons">
                    <button class="deja-quick-btn" data-obj-add="${o.id}" data-obj-delta="10">+10${State.settings.devise}</button>
                    <button class="deja-quick-btn" data-obj-add="${o.id}" data-obj-delta="50">+50${State.settings.devise}</button>
                    <button class="deja-quick-btn" data-obj-add="${o.id}" data-obj-delta="100">+100${State.settings.devise}</button>
                    <button class="deja-quick-btn primary" data-obj-add="${o.id}" data-obj-delta="${o.mensuel}">+${Format.money(o.mensuel)}</button>
                </div>

                <div class="deja-custom">
                    <input type="number" id="dejaCustom${o.id}" placeholder="Montant..."
                           step="0.01" min="0" inputmode="decimal">
                    <button class="deja-add-btn" data-obj-custom-add="${o.id}">+ Ajouter</button>
                    <button class="deja-sub-btn" data-obj-custom-sub="${o.id}">− Retirer</button>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    /**
     * Attache les événements des objectifs
     */
    attachObjectifEvents(container) {
        // Suppression
        container.querySelectorAll('[data-obj-delete]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.objDelete);
                this.deleteObjectif(id);
            });
        });

        // Édition
        container.querySelectorAll('[data-obj-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.objEdit);
                this.editDeja(id);
            });
        });

        // Boutons rapides +
        container.querySelectorAll('[data-obj-add]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.objAdd);
                const delta = parseFloat(btn.dataset.objDelta);
                this.updateDeja(id, delta);
            });
        });

        // Boutons custom + et -
        container.querySelectorAll('[data-obj-custom-add]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.objCustomAdd);
                const input = document.getElementById('dejaCustom' + id);
                if (!input) return;

                const val = parseFloat(input.value);
                if (isNaN(val) || val <= 0) {
                    Toast.warning('⚠️ Entrez un montant valide');
                    return;
                }
                this.updateDeja(id, val);
                input.value = '';
            });
        });

        container.querySelectorAll('[data-obj-custom-sub]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.objCustomSub);
                const input = document.getElementById('dejaCustom' + id);
                if (!input) return;

                const val = parseFloat(input.value);
                if (isNaN(val) || val <= 0) {
                    Toast.warning('⚠️ Entrez un montant valide');
                    return;
                }
                this.updateDeja(id, -val);
                input.value = '';
            });
        });
    },

    /**
     * Met à jour le "déjà épargné" d'un objectif
     */
    updateDeja(id, delta) {
        const obj = State.data.objectifs.find(o => o.id === id);
        if (!obj) return;

        const newDeja = Math.max(0, obj.deja + delta);
        obj.deja = newDeja;

        App.updateData('objectifs', id, { deja: newDeja });

        this.refreshList();

        if (State.currentPage === 'home') Dashboard.render();

        if (delta > 0) {
            Toast.success('✅ +' + Format.money(delta) + ' ajouté');
        } else {
            Toast.info('➖ ' + Format.money(Math.abs(delta)) + ' retiré');
        }
    },

    /**
     * Édite manuellement le "déjà"
     */
    editDeja(id) {
        const obj = State.data.objectifs.find(o => o.id === id);
        if (!obj) return;

        const newVal = prompt(
            `Nouveau montant déjà épargné pour "${obj.nom}"\n(Actuellement : ${Format.money(obj.deja)})`,
            obj.deja
        );

        if (newVal === null) return;

        const val = parseFloat(newVal);
        if (isNaN(val) || val < 0) {
            Toast.warning('⚠️ Montant invalide');
            return;
        }

        App.updateData('objectifs', id, { deja: val });
        this.refreshList();

        if (State.currentPage === 'home') Dashboard.render();
        Toast.success('✅ Montant mis à jour');
    },

    /**
     * Supprime un objectif
     */
    deleteObjectif(id) {
        const obj = State.data.objectifs.find(o => o.id === id);
        if (!obj) return;

        FormHelpers.confirm(
            'Supprimer ?',
            `Supprimer l'objectif "${obj.nom}" ?`,
            () => {
                App.removeData('objectifs', id);
                this.refreshList();
                if (State.currentPage === 'home') Dashboard.render();
                Toast.success('🗑️ Supprimé');
            },
            { danger: true, confirmLabel: 'Supprimer' }
        );
    }
};

// Alias global
window.Objectifs = Objectifs;
