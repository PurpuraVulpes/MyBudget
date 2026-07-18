/* ============================================
   RECURRENT.JS - Dépenses récurrentes
   ============================================ */

'use strict';

const Recurrent = {

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
                    <div class="banner-title">Dépense récurrente</div>
                    <div class="banner-text">
                        Loyer, abonnements... L'app vous rappellera les échéances.
                    </div>
                </div>
            </div>

            <div class="form">
                <div class="form-group">
                    <label class="form-label">📛 Nom</label>
                    <input type="text" id="addRecNom" placeholder="Ex: Netflix, Loyer..." required>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">💶 Montant (${State.settings.devise})</label>
                        <input type="number" id="addRecMontant" step="0.01" min="0.01"
                               placeholder="0,00" inputmode="decimal" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">📅 Jour du mois</label>
                        <input type="number" id="addRecJour" min="1" max="31"
                               value="1" placeholder="1-31" required>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">🏷️ Catégorie</label>
                    ${FormHelpers.renderCategoryGrid(CATEGORIES_DEPENSES, 'addRecCategorie')}
                </div>

                <button class="btn btn-primary btn-block" id="btnSaveRec">
                    ✅ Enregistrer
                </button>
            </div>
        `;

        Router.openSheet('add-recurrent', '🔁 Nouvelle récurrente', html);

        setTimeout(() => {
            FormHelpers.attachCategoryEvents(document.getElementById('sheetContent'));
            document.getElementById('btnSaveRec')?.addEventListener('click', () => this.save());
        }, 100);
    },

    /**
     * Sauvegarde
     */
    save() {
        const nom = FormHelpers.getText('addRecNom');
        const montant = FormHelpers.getNumber('addRecMontant');
        const jour = FormHelpers.getNumber('addRecJour');
        const categorie = FormHelpers.getText('addRecCategorie');

        if (!nom || montant <= 0 || jour < 1 || jour > 31) {
            Toast.warning('⚠️ Remplissez tous les champs correctement');
            return;
        }

        if (!categorie) {
            Toast.warning('⚠️ Choisissez une catégorie');
            return;
        }

        const item = {
            id: StateHelpers.generateId(),
            nom: nom,
            montant: montant,
            jour: jour,
            categorie: categorie,
            actif: true,
            dateCreation: StateHelpers.today()
        };

        App.addData('recurrent', item);

        Router.closeSheet();
        Toast.success('✅ ' + nom + ' ajouté !');

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
            <div id="recurrentSummary"></div>
            <div class="list" id="recurrentList"></div>
        `;
    },

    /**
     * Rafraîchit
     */
    refresh() {
        const items = State.data.recurrent || [];
        const summaryContainer = document.getElementById('recurrentSummary');
        const listContainer = document.getElementById('recurrentList');

        if (!listContainer) return;

        // Résumé
        if (summaryContainer) {
            if (items.length > 0) {
                const actifs = items.filter(r => r.actif !== false);
                const totalMensuel = actifs.reduce((s, r) => s + r.montant, 0);
                const totalAnnuel = totalMensuel * 12;

                summaryContainer.innerHTML = `
                    <div class="shop-summary" style="margin-bottom: var(--space-md);">
                        <div>
                            <div class="shop-summary-label">🔁 ${actifs.length} active${actifs.length > 1 ? 's' : ''}</div>
                            <div style="font-size: var(--text-xs); color: var(--text3); margin-top: 2px;">
                                ${Format.money(totalAnnuel)}/an
                            </div>
                        </div>
                        <span class="shop-summary-amount">${Format.money(totalMensuel)}/mois</span>
                    </div>
                `;
            } else {
                summaryContainer.innerHTML = '';
            }
        }

        if (items.length === 0) {
            listContainer.innerHTML = FormHelpers.renderEmptyState(
                '🔁', 'Aucune récurrente',
                'Ajoutez vos abonnements et paiements réguliers'
            );
            return;
        }

        // Calculer les prochaines échéances
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const withDates = items.map(r => {
            let nextDate;
            if (r.jour >= currentDay) {
                nextDate = new Date(currentYear, currentMonth, r.jour);
            } else {
                nextDate = new Date(currentYear, currentMonth + 1, r.jour);
            }
            const daysLeft = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
            return { ...r, nextDate, daysLeft };
        });

        // Trier : actifs d'abord (par date), puis inactifs
        withDates.sort((a, b) => {
            if (a.actif !== b.actif) return a.actif ? -1 : 1;
            return a.daysLeft - b.daysLeft;
        });

        listContainer.innerHTML = withDates.map(r => this.renderRecurrentCard(r)).join('');

        this.attachRecurrentEvents(listContainer);
    },

    /**
     * Rendu d'une carte récurrente
     */
    renderRecurrentCard(r) {
        const inactiveClass = r.actif === false ? ' inactive' : '';
        const emoji = r.categorie ? r.categorie.split(' ')[0] : '🔁';

        let nextLabel = '';
        if (r.actif !== false) {
            if (r.daysLeft === 0) nextLabel = '<span class="recurrent-next">📌 Aujourd\'hui</span>';
            else if (r.daysLeft === 1) nextLabel = '<span class="recurrent-next">⏰ Demain</span>';
            else if (r.daysLeft < 7) nextLabel = `<span class="recurrent-next">⏰ Dans ${r.daysLeft} jours</span>`;
            else nextLabel = `<span style="font-size: var(--text-xs); color: var(--text2); margin-top: 2px; display: block;">Le ${r.jour} du mois</span>`;
        } else {
            nextLabel = '<span style="font-size: var(--text-xs); color: var(--text3); margin-top: 2px; display: block;">⏸️ Désactivé</span>';
        }

        return `
            <div class="recurrent-card${inactiveClass}">
                <div class="recurrent-icon">${emoji}</div>
                <div class="recurrent-body">
                    <div class="recurrent-name">${r.nom}</div>
                    <div class="recurrent-info">${r.categorie}</div>
                    ${nextLabel}
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                    <span class="recurrent-amount">-${Format.money(r.montant)}</span>
                    <div style="display: flex; gap: 4px;">
                        <button class="objectif-action-btn" data-rec-toggle="${r.id}" title="${r.actif !== false ? 'Désactiver' : 'Activer'}">
                            ${r.actif !== false ? '⏸️' : '▶️'}
                        </button>
                        <button class="objectif-action-btn danger" data-rec-delete="${r.id}" title="Supprimer">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Événements
     */
    attachRecurrentEvents(container) {
        // Toggle actif/inactif
        container.querySelectorAll('[data-rec-toggle]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.recToggle);
                const item = State.data.recurrent.find(r => r.id === id);
                if (!item) return;

                const newActif = !(item.actif !== false);
                App.updateData('recurrent', id, { actif: newActif });
                this.refresh();

                if (State.currentPage === 'home') Dashboard.render();
                Toast.info(newActif ? '▶️ Activé' : '⏸️ Désactivé');
            });
        });

        // Suppression
        container.querySelectorAll('[data-rec-delete]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.recDelete);
                const item = State.data.recurrent.find(r => r.id === id);
                if (!item) return;

                FormHelpers.confirm(
                    'Supprimer ?',
                    `Supprimer "${item.nom}" ?`,
                    () => {
                        App.removeData('recurrent', id);
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
window.Recurrent = Recurrent;
