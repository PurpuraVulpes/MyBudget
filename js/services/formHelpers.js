/* ============================================
   FORMHELPERS.JS - Helpers pour les formulaires
   ============================================ */

'use strict';

const FormHelpers = {

    /**
     * ==========================================
     * SÉLECTEURS DE CATÉGORIES
     * ==========================================
     */

    /**
     * Génère un sélecteur de catégories (grille de chips)
     * @param {Array} categories - Liste de catégories [{emoji, label}]
     * @param {string} hiddenInputId - ID de l'input hidden qui stockera la valeur
     * @param {string} currentValue - Valeur actuellement sélectionnée
     */
    renderCategoryGrid(categories, hiddenInputId, currentValue = '') {
        let html = '<div class="cat-grid">';

        categories.forEach(cat => {
            const value = `${cat.emoji} ${cat.label}`;
            const isSelected = value === currentValue;
            html += `
                <button type="button" class="cat-item ${isSelected ? 'selected' : ''}"
                        data-cat-value="${value}"
                        data-cat-target="${hiddenInputId}">
                    <span class="cat-item-emoji">${cat.emoji}</span>
                    <span>${cat.label}</span>
                </button>
            `;
        });

        html += '</div>';
        html += `<input type="hidden" id="${hiddenInputId}" value="${currentValue}" required>`;

        return html;
    },

    /**
     * Attache les événements aux catégories
     */
    attachCategoryEvents(container = document) {
        container.querySelectorAll('.cat-item[data-cat-value]').forEach(item => {
            item.addEventListener('click', () => {
                const targetId = item.dataset.catTarget;
                const value = item.dataset.catValue;

                // Désélectionner les autres
                container.querySelectorAll(`.cat-item[data-cat-target="${targetId}"]`).forEach(c => {
                    c.classList.remove('selected');
                });

                // Sélectionner celui-ci
                item.classList.add('selected');

                // Mettre à jour l'input hidden
                const input = document.getElementById(targetId);
                if (input) input.value = value;
            });
        });
    },

    /**
     * ==========================================
     * SÉLECTEURS D'EMOJIS
     * ==========================================
     */

    renderEmojiGrid(emojis, hiddenInputId, currentValue = '🎯') {
        let html = '<div class="emoji-grid">';

        emojis.forEach(emoji => {
            const isSelected = emoji === currentValue;
            html += `
                <button type="button" class="emoji-chip ${isSelected ? 'selected' : ''}"
                        data-emoji-value="${emoji}"
                        data-emoji-target="${hiddenInputId}">
                    ${emoji}
                </button>
            `;
        });

        html += '</div>';
        html += `<input type="hidden" id="${hiddenInputId}" value="${currentValue}">`;

        return html;
    },

    attachEmojiEvents(container = document) {
        container.querySelectorAll('.emoji-chip[data-emoji-value]').forEach(chip => {
            chip.addEventListener('click', () => {
                const targetId = chip.dataset.emojiTarget;
                const value = chip.dataset.emojiValue;

                container.querySelectorAll(`.emoji-chip[data-emoji-target="${targetId}"]`).forEach(c => {
                    c.classList.remove('selected');
                });

                chip.classList.add('selected');

                const input = document.getElementById(targetId);
                if (input) input.value = value;
            });
        });
    },

    /**
     * ==========================================
     * FILTRES DE MOIS
     * ==========================================
     */

    /**
     * Génère un filtre de mois avec flèches
     */
    renderMonthFilter(inputId, currentValue = null) {
        const value = currentValue || StateHelpers.currentMonth();
        return `
            <div class="month-filter">
                <button class="month-filter-arrow" data-month-prev="${inputId}">‹</button>
                <input type="month" id="${inputId}" value="${value}">
                <button class="month-filter-arrow" data-month-next="${inputId}">›</button>
            </div>
        `;
    },

    /**
     * Attache les événements au filtre de mois
     * @param {Function} onChange - Callback appelé quand le mois change
     */
    attachMonthFilterEvents(container, onChange) {
        // Flèche précédente
        container.querySelectorAll('[data-month-prev]').forEach(btn => {
            btn.addEventListener('click', () => {
                const inputId = btn.dataset.monthPrev;
                const input = document.getElementById(inputId);
                if (input && input.value) {
                    input.value = StateHelpers.getPreviousMonth(input.value);
                    if (onChange) onChange(input.value);
                }
            });
        });

        // Flèche suivante
        container.querySelectorAll('[data-month-next]').forEach(btn => {
            btn.addEventListener('click', () => {
                const inputId = btn.dataset.monthNext;
                const input = document.getElementById(inputId);
                if (input && input.value) {
                    input.value = StateHelpers.getNextMonth(input.value);
                    if (onChange) onChange(input.value);
                }
            });
        });

        // Changement manuel
        container.querySelectorAll('input[type="month"]').forEach(input => {
            input.addEventListener('change', () => {
                if (onChange) onChange(input.value);
            });
        });
    },

    /**
     * ==========================================
     * SÉLECTEURS DE PRIORITÉ
     * ==========================================
     */

    renderPrioritySelector(hiddenInputId, currentValue = 'normal') {
        const options = [
            { value: 'urgent', label: '🔴 Urgent', class: 'chip-danger' },
            { value: 'normal', label: '📦 Normal', class: '' },
            { value: 'envie', label: '💫 Envie', class: 'chip-warning' }
        ];

        let html = '<div class="grid-3">';
        options.forEach(opt => {
            const isSelected = opt.value === currentValue;
            html += `
                <button type="button" class="chip ${opt.class} ${isSelected ? 'active' : ''}"
                        data-prio-value="${opt.value}"
                        data-prio-target="${hiddenInputId}"
                        style="justify-content: center;">
                    ${opt.label}
                </button>
            `;
        });
        html += '</div>';
        html += `<input type="hidden" id="${hiddenInputId}" value="${currentValue}">`;

        return html;
    },

    attachPriorityEvents(container = document) {
        container.querySelectorAll('.chip[data-prio-value]').forEach(chip => {
            chip.addEventListener('click', () => {
                const targetId = chip.dataset.prioTarget;
                const value = chip.dataset.prioValue;

                container.querySelectorAll(`.chip[data-prio-target="${targetId}"]`).forEach(c => {
                    c.classList.remove('active');
                });

                chip.classList.add('active');

                const input = document.getElementById(targetId);
                if (input) input.value = value;
            });
        });
    },

    /**
     * ==========================================
     * VALIDATION
     * ==========================================
     */

    /**
     * Récupère la valeur numérique d'un input
     */
    getNumber(inputId, defaultValue = 0) {
        const input = document.getElementById(inputId);
        if (!input) return defaultValue;
        const val = parseFloat(input.value);
        return isNaN(val) ? defaultValue : val;
    },

    /**
     * Récupère la valeur texte d'un input
     */
    getText(inputId, trim = true) {
        const input = document.getElementById(inputId);
        if (!input) return '';
        return trim ? input.value.trim() : input.value;
    },

    /**
     * Vérifie que tous les inputs requis sont remplis
     */
    validateRequired(inputIds) {
        for (const id of inputIds) {
            const input = document.getElementById(id);
            if (!input || !input.value || input.value.trim() === '') {
                return { valid: false, missing: id };
            }
        }
        return { valid: true };
    },

    /**
     * ==========================================
     * DATES / HEURES
     * ==========================================
     */

    /**
     * Renvoie la date d'aujourd'hui au bon format pour input[type=date]
     */
    todayForInput() {
        return StateHelpers.today();
    },

    /**
     * Renvoie le mois actuel pour input[type=month]
     */
    currentMonthForInput() {
        return StateHelpers.currentMonth();
    },

    /**
     * ==========================================
     * ITEMS DE LISTE (rendu réutilisable)
     * ==========================================
     */

    /**
     * Génère un item de liste standard
     */
    renderListItem({ icon, title, subtitle, amount, amountClass = 'neutral', id, collection }) {
        return `
            <div class="list-item">
                <div class="list-item-icon">${icon}</div>
                <div class="list-item-body">
                    <div class="list-item-title">${title}</div>
                    ${subtitle ? `<div class="list-item-subtitle">${subtitle}</div>` : ''}
                </div>
                <div class="list-item-right">
                    ${amount !== undefined ? `<span class="list-item-amount ${amountClass}">${amount}</span>` : ''}
                    <button class="list-item-action" data-delete-id="${id}" data-delete-collection="${collection}" title="Supprimer">🗑️</button>
                </div>
            </div>
        `;
    },

    /**
     * Attache les événements de suppression
     */
    attachDeleteEvents(container, onDelete) {
        container.querySelectorAll('[data-delete-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.deleteId);
                const collection = btn.dataset.deleteCollection;
                if (onDelete) onDelete(id, collection);
            });
        });
    },

    /**
     * ==========================================
     * CONFIRMATIONS
     * ==========================================
     */

    /**
     * Ouvre une sheet de confirmation
     */
    confirm(title, message, onConfirm, options = {}) {
        const confirmLabel = options.confirmLabel || 'Confirmer';
        const cancelLabel = options.cancelLabel || 'Annuler';
        const isDanger = options.danger === true;

        const html = `
            <p style="color: var(--text2); text-align: center; margin-bottom: var(--space-lg); line-height: 1.5;">
                ${message}
            </p>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="confirmCancel">${cancelLabel}</button>
                <button class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" id="confirmOk">${confirmLabel}</button>
            </div>
        `;

        Router.openSheet('confirm', title, html);

        setTimeout(() => {
            const okBtn = document.getElementById('confirmOk');
            const cancelBtn = document.getElementById('confirmCancel');

            if (okBtn) {
                okBtn.addEventListener('click', () => {
                    Router.closeSheet();
                    if (onConfirm) onConfirm();
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => Router.closeSheet());
            }
        }, 100);
    },

    /**
     * ==========================================
     * EMPTY STATE
     * ==========================================
     */

    renderEmptyState(icon, title, subtitle = '') {
        return `
            <div class="empty-page" style="min-height: 200px;">
                <div class="empty-icon">${icon}</div>
                <h2 style="font-size: var(--text-md);">${title}</h2>
                ${subtitle ? `<p style="font-size: var(--text-sm);">${subtitle}</p>` : ''}
            </div>
        `;
    },

    /**
     * ==========================================
     * QUICK STATS (petites cartes de stats)
     * ==========================================
     */

    renderQuickStats(stats) {
        let html = '<div class="stat-grid stat-grid-3">';
        stats.forEach(stat => {
            html += `
                <div class="stat-card">
                    <span class="stat-value">${stat.value}</span>
                    <span class="stat-label">${stat.label}</span>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }
};

// Alias global
window.FormHelpers = FormHelpers;
