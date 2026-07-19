/* ============================================
   TICKETS.JS - Photos de tickets (base64 local)
   ============================================ */

'use strict';

const Tickets = {

    // Limite de taille (5 MB en base64)
    MAX_SIZE: 5 * 1024 * 1024,

    // Compression cible
    MAX_WIDTH: 1200,
    QUALITY: 0.7,

    /**
     * ==========================================
     * COMPOSANT UI - UPLOAD
     * ==========================================
     */

    /**
     * Rendu du composant upload de ticket
     */
    renderTicketUpload(hiddenInputId, currentTicket = null) {
        const hasPhoto = currentTicket && currentTicket.length > 0;

        return `
            <div class="ticket-upload ${hasPhoto ? 'has-photo' : ''}" id="${hiddenInputId}Upload">
                ${hasPhoto ? `
                    <div class="ticket-preview">
                        <img src="${currentTicket}" alt="Ticket" id="${hiddenInputId}Preview">
                        <div class="ticket-preview-actions">
                            <button type="button" class="ticket-action-btn" data-ticket-view="${hiddenInputId}" title="Agrandir">🔍</button>
                            <button type="button" class="ticket-action-btn danger" data-ticket-remove="${hiddenInputId}" title="Supprimer">🗑️</button>
                        </div>
                    </div>
                ` : `
                    <span class="ticket-upload-icon">📸</span>
                    <div class="ticket-upload-text">
                        <strong>Ajouter une photo</strong><br>
                        <span style="font-size: var(--text-xs);">du ticket ou de la facture</span>
                    </div>
                `}
            </div>
            <input type="file" id="${hiddenInputId}File" accept="image/*" capture="environment" style="display: none;">
            <input type="hidden" id="${hiddenInputId}" value="${currentTicket || ''}">
        `;
    },

    /**
     * Attache les événements
     */
    attachTicketEvents(container = document, inputId) {
        const uploadZone = container.querySelector(`#${inputId}Upload`);
        const fileInput = container.querySelector(`#${inputId}File`);
        const hiddenInput = container.querySelector(`#${inputId}`);

        if (!uploadZone || !fileInput || !hiddenInput) return;

        // Clic sur la zone → ouvrir le sélecteur
        uploadZone.addEventListener('click', (e) => {
            // Ne pas déclencher si on clique sur les boutons d'action
            if (e.target.closest('.ticket-action-btn')) return;
            fileInput.click();
        });

        // Fichier sélectionné
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                Toast.error('❌ Format non supporté (image uniquement)');
                return;
            }

            try {
                Toast.info('📸 Compression de l\'image...');
                const compressed = await this.compressImage(file);

                if (compressed.length > this.MAX_SIZE) {
                    Toast.error('❌ Image trop lourde (max 5 MB)');
                    return;
                }

                hiddenInput.value = compressed;
                this.refreshUploadZone(container, inputId, compressed);
                Toast.success('✅ Photo ajoutée');
            } catch (error) {
                console.error('Erreur upload:', error);
                Toast.error('❌ Erreur lors du chargement');
            }
        });

        // Bouton voir
        container.querySelectorAll(`[data-ticket-view="${inputId}"]`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewTicket(hiddenInput.value);
            });
        });

        // Bouton supprimer
        container.querySelectorAll(`[data-ticket-remove="${inputId}"]`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                FormHelpers.confirm(
                    'Supprimer la photo ?',
                    'Cette action est irréversible.',
                    () => {
                        hiddenInput.value = '';
                        this.refreshUploadZone(container, inputId, null);
                        Toast.success('🗑️ Photo supprimée');
                    },
                    { danger: true, confirmLabel: 'Supprimer' }
                );
            });
        });
    },

    /**
     * Rafraîchit la zone d'upload
     */
    refreshUploadZone(container, inputId, ticket) {
        const uploadZone = container.querySelector(`#${inputId}Upload`);
        if (!uploadZone) return;

        const hasPhoto = ticket && ticket.length > 0;
        uploadZone.classList.toggle('has-photo', hasPhoto);

        if (hasPhoto) {
            uploadZone.innerHTML = `
                <div class="ticket-preview">
                    <img src="${ticket}" alt="Ticket">
                    <div class="ticket-preview-actions">
                        <button type="button" class="ticket-action-btn" data-ticket-view="${inputId}" title="Agrandir">🔍</button>
                        <button type="button" class="ticket-action-btn danger" data-ticket-remove="${inputId}" title="Supprimer">🗑️</button>
                    </div>
                </div>
            `;
        } else {
            uploadZone.innerHTML = `
                <span class="ticket-upload-icon">📸</span>
                <div class="ticket-upload-text">
                    <strong>Ajouter une photo</strong><br>
                    <span style="font-size: var(--text-xs);">du ticket ou de la facture</span>
                </div>
            `;
        }

        // Ré-attacher les événements
        this.attachTicketEvents(container, inputId);
    },

    /**
     * ==========================================
     * COMPRESSION D'IMAGE
     * ==========================================
     */

    /**
     * Compresse une image et la convertit en base64
     */
    compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    // Calculer les nouvelles dimensions
                    let width = img.width;
                    let height = img.height;

                    if (width > this.MAX_WIDTH) {
                        height = (this.MAX_WIDTH / width) * height;
                        width = this.MAX_WIDTH;
                    }

                    // Créer le canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convertir en base64 avec compression
                    const dataUrl = canvas.toDataURL('image/jpeg', this.QUALITY);
                    resolve(dataUrl);
                };

                img.onerror = () => reject(new Error('Impossible de charger l\'image'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * ==========================================
     * VIEWER PLEIN ÉCRAN
     * ==========================================
     */

    /**
     * Ouvre le viewer plein écran
     */
    viewTicket(ticketData) {
        if (!ticketData) return;

        const html = `
            <div class="ticket-viewer">
                <img src="${ticketData}" alt="Ticket" onclick="Router.closeSheet()">
            </div>
            <div style="text-align: center; margin-top: var(--space-md);">
                <button class="btn btn-secondary" onclick="Router.closeSheet()">Fermer</button>
                <button class="btn btn-primary" onclick="Tickets.downloadTicket('${ticketData.substring(0, 50)}...')">
                    💾 Télécharger
                </button>
            </div>
        `;

        Router.openSheet('ticket-viewer', '📸 Ticket', html);
    },

    /**
     * Télécharge un ticket
     */
    downloadTicket(ticketData) {
        // On récupère la vraie data depuis le contexte actuel
        // (le paramètre est tronqué à cause des guillemets)
        const currentImg = document.querySelector('.ticket-viewer img');
        if (!currentImg) return;

        const link = document.createElement('a');
        link.href = currentImg.src;
        link.download = `ticket_${StateHelpers.today()}.jpg`;
        link.click();

        Toast.success('💾 Téléchargé');
    },

    /**
     * ==========================================
     * MINIATURE POUR LISTES
     * ==========================================
     */

    /**
     * Renvoie le HTML d'une miniature de ticket
     */
    renderThumb(ticketData, size = 44) {
        if (!ticketData) return '';

        return `
            <div class="ticket-thumb" style="width: ${size}px; height: ${size}px;" onclick="event.stopPropagation(); Tickets.viewTicket('${this.escapeForAttribute(ticketData)}')">
                <img src="${ticketData}" alt="Ticket">
                <div class="ticket-thumb-badge">📸</div>
            </div>
        `;
    },

    /**
     * Escape pour attribut HTML (guillemets)
     */
    escapeForAttribute(str) {
        return str.replace(/'/g, "\\'");
    },

    /**
     * ==========================================
     * UTILS
     * ==========================================
     */

    /**
     * Récupère la valeur d'un input ticket
     */
    getTicket(inputId) {
        const input = document.getElementById(inputId);
        return input ? input.value : '';
    },

    /**
     * Renvoie la taille en KB
     */
    getSizeInKB(base64) {
        return Math.round((base64.length * 0.75) / 1024);
    }
};

// Alias global
window.Tickets = Tickets;
