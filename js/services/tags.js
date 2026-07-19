/* ============================================
   TAGS.JS - Tags personnalisés
   ============================================ */

'use strict';

const Tags = {

    /**
     * ==========================================
     * GESTION DES TAGS
     * ==========================================
     */

    /**
     * Récupère tous les tags uniques déjà utilisés
     */
    getAllUsedTags() {
        const tagSet = new Set();

        // Depuis les dépenses
        State.data.depenses.forEach(d => {
            if (d.tags && Array.isArray(d.tags)) {
                d.tags.forEach(t => tagSet.add(t));
            }
        });

        // Depuis les extras
        State.data.extras.forEach(e => {
            if (e.tags && Array.isArray(e.tags)) {
                e.tags.forEach(t => tagSet.add(t));
            }
        });

        return Array.from(tagSet).sort();
    },

    /**
     * Récupère les tags les plus utilisés
     */
    getMostUsedTags(limit = 10) {
        const tagCount = {};

        [...State.data.depenses, ...State.data.extras].forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.forEach(t => {
                    tagCount[t] = (tagCount[t] || 0) + 1;
                });
            }
        });

        return Object.entries(tagCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([tag, count]) => ({ tag, count }));
    },

    /**
     * ==========================================
     * COMPOSANT UI - INPUT DE TAGS
     * ==========================================
     */

    /**
     * Rendu d'un input de tags
     */
    renderTagsInput(hiddenInputId, currentTags = []) {
        const suggestionsTags = this.getMostUsedTags(6);

        let html = `
            <div class="tags-input-wrap" id="${hiddenInputId}Wrap">
                <div class="tags-list" id="${hiddenInputId}List">
        `;

        // Tags actuels
        currentTags.forEach(tag => {
            html += `
                <span class="tag-chip">
                    #${tag}
                    <button type="button" class="tag-chip-remove" data-remove-tag="${tag}" data-input="${hiddenInputId}">×</button>
                </span>
            `;
        });

        html += `
                <input type="text" class="tags-input" id="${hiddenInputId}Text" placeholder="+ Ajouter un tag..." maxlength="20">
            </div>
            <input type="hidden" id="${hiddenInputId}" value='${JSON.stringify(currentTags)}'>
        `;

        // Suggestions
        if (suggestionsTags.length > 0) {
            html += '<div class="tags-suggestions">';
            html += '<div style="width: 100%; font-size: var(--text-xs); color: var(--text3); margin-bottom: 4px;">💡 Tags fréquents :</div>';

            suggestionsTags.forEach(({ tag }) => {
                if (!currentTags.includes(tag)) {
                    html += `<button type="button" class="tag-suggestion" data-add-tag="${tag}" data-input="${hiddenInputId}">#${tag}</button>`;
                }
            });

            html += '</div>';
        }

        return html;
    },

    /**
     * Attache les événements aux tags
     */
    attachTagsEvents(container = document, inputId) {
        const inputText = container.querySelector(`#${inputId}Text`);
        const inputHidden = container.querySelector(`#${inputId}`);
        const list = container.querySelector(`#${inputId}List`);

        if (!inputText || !inputHidden || !list) return;

        // Récupérer les tags actuels
        const getCurrentTags = () => {
            try {
                return JSON.parse(inputHidden.value || '[]');
            } catch {
                return [];
            }
        };

        // Sauvegarder les tags
        const saveTags = (tags) => {
            inputHidden.value = JSON.stringify(tags);
        };

        // Ajouter un tag
        const addTag = (tagName) => {
            tagName = tagName.trim().toLowerCase().replace(/[^a-z0-9-àâäéèêëïîôöùûüÿçñ ]/gi, '').replace(/\s+/g, '-');

            if (!tagName || tagName.length === 0) return;
            if (tagName.length > 20) return;

            const currentTags = getCurrentTags();

            if (currentTags.includes(tagName)) {
                Toast.warning('⚠️ Ce tag existe déjà');
                return;
            }

            if (currentTags.length >= 5) {
                Toast.warning('⚠️ Maximum 5 tags');
                return;
            }

            currentTags.push(tagName);
            saveTags(currentTags);
            this.renderTagsList(list, currentTags, inputId, inputText);
            inputText.value = '';

            // Retirer de la suggestion si présente
            const suggestion = container.querySelector(`.tag-suggestion[data-add-tag="${tagName}"]`);
            if (suggestion) suggestion.style.display = 'none';
        };

        // Retirer un tag
        const removeTag = (tagName) => {
            const currentTags = getCurrentTags().filter(t => t !== tagName);
            saveTags(currentTags);
            this.renderTagsList(list, currentTags, inputId, inputText);

            // Réafficher la suggestion si elle existait
            const suggestion = container.querySelector(`.tag-suggestion[data-add-tag="${tagName}"]`);
            if (suggestion) suggestion.style.display = '';
        };

        // Événement input (Entrée)
        inputText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (inputText.value.trim()) {
                    addTag(inputText.value);
                }
            } else if (e.key === 'Backspace' && !inputText.value) {
                // Supprimer le dernier tag si input vide
                const currentTags = getCurrentTags();
                if (currentTags.length > 0) {
                    removeTag(currentTags[currentTags.length - 1]);
                }
            }
        });

        // Clic sur le wrap → focus l'input
        const wrap = container.querySelector(`#${inputId}Wrap`);
        if (wrap) {
            wrap.addEventListener('click', (e) => {
                if (e.target === wrap || e.target === list) {
                    inputText.focus();
                }
            });
        }

        // Attacher les événements delegates initiaux
        this.attachTagEvents(container, inputId, addTag, removeTag);
    },

    /**
     * Ré-attache les événements après re-render
     */
    attachTagEvents(container, inputId, addTag, removeTag) {
        // Boutons de suppression
        container.querySelectorAll(`[data-remove-tag][data-input="${inputId}"]`).forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                removeTag(btn.dataset.removeTag);
            };
        });

        // Suggestions
        container.querySelectorAll(`[data-add-tag][data-input="${inputId}"]`).forEach(btn => {
            btn.onclick = () => addTag(btn.dataset.addTag);
        });
    },

    /**
     * Re-render de la liste des tags
     */
    renderTagsList(listElement, tags, inputId, inputText) {
        // Vider (sauf l'input)
        Array.from(listElement.children).forEach(child => {
            if (child !== inputText) child.remove();
        });

        // Ajouter les tags avant l'input
        tags.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = `
                #${tag}
                <button type="button" class="tag-chip-remove" data-remove-tag="${tag}" data-input="${inputId}">×</button>
            `;
            listElement.insertBefore(chip, inputText);
        });

        // Ré-attacher les événements
        const container = listElement.closest('body') || document;
        this.attachTagEvents(container, inputId,
            (tag) => { /* déjà géré dans attachTagsEvents */ },
            (tagName) => {
                const currentTags = JSON.parse(document.getElementById(inputId).value || '[]').filter(t => t !== tagName);
                document.getElementById(inputId).value = JSON.stringify(currentTags);
                this.renderTagsList(listElement, currentTags, inputId, inputText);
            }
        );
    },

    /**
     * Récupère les tags depuis un input hidden
     */
    getTags(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return [];
        try {
            return JSON.parse(input.value || '[]');
        } catch {
            return [];
        }
    },

    /**
     * ==========================================
     * AFFICHAGE DES TAGS
     * ==========================================
     */

    /**
     * Renvoie le HTML des tags d'un item (pour affichage compact)
     */
    renderTagsBadges(tags) {
        if (!tags || tags.length === 0) return '';

        return '<div style="display: inline-flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">' +
            tags.map(t => `<span style="font-size: 0.65rem; color: var(--primary-light); background: var(--primary-glow); padding: 1px 6px; border-radius: var(--radius-full); font-weight: var(--font-semibold);">#${t}</span>`).join('') +
            '</div>';
    },

    /**
     * ==========================================
     * FILTRE PAR TAGS
     * ==========================================
     */

    /**
     * Rendu d'un filtre par tags
     */
    renderTagsFilter(activeTag = null) {
        const usedTags = this.getMostUsedTags(15);

        if (usedTags.length === 0) return '';

        let html = '<div class="tag-filter">';
        html += `<button class="tag-filter-item ${!activeTag ? 'active' : ''}" data-filter-tag="">Tous</button>`;

        usedTags.forEach(({ tag, count }) => {
            const isActive = activeTag === tag;
            html += `<button class="tag-filter-item ${isActive ? 'active' : ''}" data-filter-tag="${tag}">#${tag} <span style="opacity: 0.6;">(${count})</span></button>`;
        });

        html += '</div>';
        return html;
    },

    /**
     * Attache les événements du filtre
     */
    attachFilterEvents(container, onChange) {
        container.querySelectorAll('[data-filter-tag]').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('[data-filter-tag]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const tag = btn.dataset.filterTag || null;
                if (onChange) onChange(tag);
            });
        });
    },

    /**
     * Filtre des items par tag
     */
    filterByTag(items, tag) {
        if (!tag) return items;
        return items.filter(item => item.tags && item.tags.includes(tag));
    }
};

// Alias global
window.Tags = Tags;
