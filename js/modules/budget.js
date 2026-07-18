/* ============================================
   BUDGETS.JS - Budgets par catégorie
   ============================================ */

'use strict';

const Budgets = {

    /**
     * ==========================================
     * FORMULAIRE D'AJOUT
     * ==========================================
     */

    openAddForm() {
        const html = `
            <div class="banner banner-info" style="margin-bottom: var(--space-md);">
                <span class="banner-icon">💡</span>
                <div class="banner-body">
                    <div class="banner-title">Budget par catégorie</div>
                    <div class="banner-text">
                        Fixez une limite mensuelle par catégorie de dépense.
                    </div>
                </div>
            </div>

            <div class="form">
                <div class="form-group">
                    <label class="form-label">🏷️ Catégorie</label>
                    ${FormHelpers.renderCategoryGrid(CATEGORIES_DEPENSES, 'addBudgetCategorie')}
                </div>

                <div class="form-group">
                    <label class="form-label">💶 Limite mensuelle (${State.settings.devise})</label>
                    <input type="number" id="addBudgetMax" step="1" min="1"
                           placeholder="0,00" inputmode="decimal" required>
                </div>

                <div class="form-group">
                    <label class="form-label">🔔 Alerte à</label>
                    <div class="grid-4">
                        <button type="button" class="chip active" data-budget-alerte="70">70%</button>
                        <button type="button" class="chip" data-budget-alerte="80">80%</button>
                        <button type="button" class="chip" data-budget-alerte="90">90%</button>
                        <button type="button" class="chip" data-budget-alerte="100">100%</button>
                    </div>
                    <input type="hidden" id="addBudgetAlerte" value="80">
                    <div class="form-hint">Vous serez alerté quand la limite est presque atteinte</div>
                </div>

                <button class="btn btn-primary btn-block" id="btnSaveBudget">
                    ✅ Enregistrer
                </button>
            </div>
        `;

        Router.openSheet('add-budget', '📊 Nouveau budget', html);

        setTimeout(() => {
            FormHelpers.attachCategoryEvents(document.getElementById('sheetContent'));

            // Alertes
            document.querySelectorAll('.chip[data-budget-alerte]').forEach(chip => {
                chip.addEventListener('click', () => {
                    document.querySelectorAll('.chip[data-budget-alerte]').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    document.getElementById('addBudgetAlerte').value = chip.dataset.budgetAlerte;
                });
            });

            document.getElementById('btnSaveBudget')?.addEventListener('click', () => this.save());
        }, 100);
    },

    /**
     * Sauvegarde
     */
    save() {
        const categorie = FormHelpers.getText('addBudgetCategorie');
        const max = FormHelpers.getNumber('addBudgetMax');
        const alerte = FormHelpers.getNumber('addBudgetAlerte', 80);

        if (!categorie) {
            Toast.warning('⚠️ Choisissez une catégorie');
            return;
        }

        if (max <= 0) {
            Toast.warning('⚠️ Montant invalide');
            return;
        }

        // Vérifier si un budget existe déjà pour cette catégorie
        const existing = State.data.budgets.find(b => b.categorie === categorie);
        if (existing) {
            App.updateData('budgets', existing.id, { max, alerte });
            Toast.success('✅ Budget mis à jour');
        } else {
            const budget = {
                id: StateHelpers.generateId(),
                categorie: categorie,
                max: max,
                alerte: alerte,
                dateCreation: StateHelpers.today()
            };
            App.addData('budgets', budget);
            Toast.success('✅ Budget créé');
        }

        Router.closeSheet();
        if (State.currentPage === 'home') Dashboard.render();
        if (State.currentPage === 'budget') this.refresh();
    },

    /**
     * ==========================================
     * AFFICHAGE
     * ==========================================
     */

    renderPage() {
        return `
            <div id="budgetsList"></div>
        `;
    },

    /**
     * Rafraîchit
     */
    refresh() {
        const budgets = State.data.budgets || [];
        const container = document.getElementById('budgetsList');
        if (!container) return;

        if (budgets.length === 0) {
            container.innerHTML = FormHelpers.renderEmptyState(
                '📊', 'Aucun budget',
                'Créez des budgets pour suivre vos dépenses par catégorie'
            );
            return;
        }

        const currentM = StateHelpers.currentMonth();
        const depenses = StateHelpers.getDepensesForMonth(currentM);

        // Calculer les totaux par catégorie
        const catTotals = {};
        depenses.forEach(d => {
            catTotals[d.categorie] = (catTotals[d.categorie] || 0) + d.montant;
        });

        // Enrichir les budgets
        const enriched = budgets.map(b => {
            const spent = catTotals[b.categorie] || 0;
            const percent = b.max > 0 ? (spent / b.max) * 100 : 0;
            const remaining = b.max - spent;

            let status;
            if (percent >= 100) status = 'danger';
            else if (percent >= (b.alerte || 80)) status = 'warning';
            else status = 'safe';

            return { ...b, spent, percent, remaining, status };
        });

        // Trier par % décroissant
        enriched.sort((a, b) => b.percent - a.percent);

        container.innerHTML = enriched.map(b => this.renderBudgetCard(b)).join('');

        this.attachBudgetEvents(container);
    },

    /**
     * Rendu d'une carte budget
     */
    renderBudgetCard(b) {
        const percentDisplay = Math.min(100, Math.round(b.percent));
        const barColor = b.status === 'danger' ? 'var(--danger)' :
                         b.status === 'warning' ? 'var(--warning)' : 'var(--success)';

        const statusClass = `budget-status-${b.status}`;

        let statusText;
        if (b.status === 'danger') {
            statusText = `⚠️ Dépassé de ${Format.money(-b.remaining)}`;
        } else if (b.status === 'warning') {
            statusText = `⚠️ Attention, ${Format.money(b.remaining)} restant`;
        } else {
            statusText = `✅ ${Format.money(b.remaining)} restant`;
        }

        return `
            <div class="budget-card">
                <div class="budget-header">
                    <span class="budget-category">${b.categorie}</span>
                    <span class="budget-amounts">
                        <strong>${Format.money(b.spent)}</strong> / ${Format.money(b.max)}
                    </span>
                </div>

                <div class="progress progress-lg" style="margin-bottom: var(--space-sm);">
                    <div class="progress-bar" style="width: ${percentDisplay}%; background: ${barColor};"></div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: var(--text-xs);">
                    <span class="${statusClass}" style="font-weight: var(--font-semibold);">${statusText}</span>
                    <div style="display: flex; gap: 4px;">
                        <button class="objectif-action-btn" data-budget-edit="${b.id}" title="Modifier">✏️</button>
                        <button class="objectif-action-btn danger" data-budget-delete="${b.id}" title="Supprimer">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Événements
     */
    attachBudgetEvents(container) {
        // Édition
        container.querySelectorAll('[data-budget-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.budgetEdit);
                const budget = State.data.budgets.find(b => b.id === id);
                if (!budget) return;

                const newMax = prompt(
                    `Nouvelle limite mensuelle pour "${budget.categorie}"\n(Actuellement : ${Format.money(budget.max)})`,
                    budget.max
                );

                if (newMax === null) return;

                const val = parseFloat(newMax);
                if (isNaN(val) || val <= 0) {
                    Toast.warning('⚠️ Montant invalide');
                    return;
                }

                App.updateData('budgets', id, { max: val });
                this.refresh();
                if (State.currentPage === 'home') Dashboard.render();
                Toast.success('✅ Budget mis à jour');
            });
        });

        // Suppression
        container.querySelectorAll('[data-budget-delete]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.budgetDelete);
                const budget = State.data.budgets.find(b => b.id === id);
                if (!budget) return;

                FormHelpers.confirm(
                    'Supprimer ?',
                    `Supprimer le budget "${budget.categorie}" ?`,
                    () => {
                        App.removeData('budgets', id);
                        this.refresh();
                        if (State.currentPage === 'home') Dashboard.render();
                        Toast.success('🗑️ Supprimé');
                    },
                    { danger: true, confirmLabel: 'Supprimer' }
                );
            });
        });
    }
};

// Alias global
window.Budgets = Budgets;
