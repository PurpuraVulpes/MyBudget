/* ============================================
   PIN.JS - Protection par code PIN
   ============================================ */

'use strict';

/**
 * Système de verrouillage par code PIN
 */
const PinLock = {

    // État interne
    _input: '',
    _mode: 'unlock',      // 'unlock', 'setup', 'confirm', 'change-verify', 'change-new', 'change-confirm', 'remove'
    _tempPin: '',
    _attempts: 0,
    _isModal: false,

    /**
     * ==========================================
     * INITIALISATION
     * ==========================================
     */
    init() {
        console.log('🔒 PinLock initialisé');
    },

    /**
     * Vérifie au démarrage si un PIN est requis
     */
    checkOnStart() {
        if (Storage.hasPin()) {
            this.showLockScreen();
        }
    },

    /**
     * ==========================================
     * ÉCRAN DE VERROUILLAGE
     * ==========================================
     */

    /**
     * Affiche l'écran de verrouillage
     */
    showLockScreen() {
        // Créer l'écran s'il n'existe pas
        let lockScreen = document.getElementById('lockScreen');

        if (!lockScreen) {
            lockScreen = document.createElement('div');
            lockScreen.id = 'lockScreen';
            lockScreen.className = 'auth-screen';
            document.body.appendChild(lockScreen);
        }

        this._mode = 'unlock';
        this._input = '';
        this._attempts = 0;
        this._isModal = false;

        lockScreen.innerHTML = this.renderLockScreen();
        lockScreen.hidden = false;

        // Cacher l'app principale
        const app = document.getElementById('app');
        if (app) app.hidden = true;

        this.attachKeypadEvents(lockScreen);
    },

    /**
     * Cache l'écran de verrouillage
     */
    hideLockScreen() {
        const lockScreen = document.getElementById('lockScreen');
        if (lockScreen) {
            lockScreen.hidden = true;
        }

        const app = document.getElementById('app');
        if (app) app.hidden = false;
    },

    /**
     * Rendu de l'écran de verrouillage
     */
    renderLockScreen() {
        return `
            <div class="auth-container">
                <div class="auth-logo">🔒</div>
                <h1 class="auth-title">Verrouillé</h1>
                <p class="auth-subtitle">Entrez votre code à 6 chiffres</p>

                <div class="pin-dots" id="pinDotsMain">
                    <div class="pin-dot"></div>
                    <div class="pin-dot"></div>
                    <div class="pin-dot"></div>
                    <div class="pin-dot"></div>
                    <div class="pin-dot"></div>
                    <div class="pin-dot"></div>
                </div>

                <p class="form-error" id="pinErrorMain"></p>

                <div class="keypad" id="keypadMain">
                    <button class="key" data-key="1">1</button>
                    <button class="key" data-key="2">2</button>
                    <button class="key" data-key="3">3</button>
                    <button class="key" data-key="4">4</button>
                    <button class="key" data-key="5">5</button>
                    <button class="key" data-key="6">6</button>
                    <button class="key" data-key="7">7</button>
                    <button class="key" data-key="8">8</button>
                    <button class="key" data-key="9">9</button>
                    <button class="key empty"></button>
                    <button class="key" data-key="0">0</button>
                    <button class="key delete" data-action="delete">⌫</button>
                </div>

                <button class="auth-link" id="btnForgotPin" style="margin-top: var(--space-lg);">
                    Code oublié ?
                </button>
            </div>
        `;
    },

    /**
     * Attache les événements au clavier
     */
    attachKeypadEvents(container) {
        // Touches numériques
        container.querySelectorAll('.key[data-key]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.pressKey(btn.dataset.key);
                if (navigator.vibrate) navigator.vibrate(10);
            });
        });

        // Bouton delete
        const deleteBtn = container.querySelector('.key[data-action="delete"]');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.pressDelete();
                if (navigator.vibrate) navigator.vibrate(10);
            });
        }

        // Bouton "Code oublié ?"
        const forgotBtn = container.querySelector('#btnForgotPin');
        if (forgotBtn) {
            forgotBtn.addEventListener('click', () => this.forgotPin());
        }

        // Bouton "Annuler" (dans modal)
        const cancelBtn = container.querySelector('#btnCancelPin');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelModal());
        }

        // Support clavier physique (desktop)
        this._keydownHandler = (e) => {
            if (e.key >= '0' && e.key <= '9') {
                this.pressKey(e.key);
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                this.pressDelete();
            } else if (e.key === 'Escape' && this._isModal) {
                this.cancelModal();
            }
        };
        document.addEventListener('keydown', this._keydownHandler);
    },

    /**
     * Détache les événements clavier
     */
    detachKeypadEvents() {
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
            this._keydownHandler = null;
        }
    },

    /**
     * ==========================================
     * GESTION DES TOUCHES
     * ==========================================
     */

    /**
     * Appui sur une touche numérique
     */
    pressKey(digit) {
        if (this._input.length >= 6) return;

        this._input += digit;
        this.updateDots();

        // Auto-validation à 6 chiffres
        if (this._input.length === 6) {
            setTimeout(() => this.handleComplete(), 200);
        }
    },

    /**
     * Appui sur la touche supprimer
     */
    pressDelete() {
        this._input = this._input.slice(0, -1);
        this.updateDots();
        this.clearError();
    },

    /**
     * Met à jour l'affichage des points
     */
    updateDots() {
        const dotsId = this._isModal ? 'pinDotsModal' : 'pinDotsMain';
        const dots = document.querySelectorAll('#' + dotsId + ' .pin-dot');

        dots.forEach((dot, i) => {
            dot.classList.remove('filled', 'success', 'error');
            if (i < this._input.length) {
                dot.classList.add('filled');
            }
        });
    },

    /**
     * Applique un état aux points (success/error)
     */
    setDotsState(state) {
        const dotsId = this._isModal ? 'pinDotsModal' : 'pinDotsMain';
        const dots = document.querySelectorAll('#' + dotsId + ' .pin-dot');

        dots.forEach(dot => {
            dot.classList.remove('filled', 'success', 'error');
            dot.classList.add(state);
        });
    },

    /**
     * Affiche une erreur
     */
    showError(message) {
        const errId = this._isModal ? 'pinErrorModal' : 'pinErrorMain';
        const err = document.getElementById(errId);
        if (err) err.textContent = message;
    },

    /**
     * Efface l'erreur
     */
    clearError() {
        const errId = this._isModal ? 'pinErrorModal' : 'pinErrorMain';
        const err = document.getElementById(errId);
        if (err) err.textContent = '';
    },

    /**
     * Met à jour titre et sous-titre (mode modal)
     */
    updateTitles(title, subtitle) {
        if (this._isModal) {
            const t = document.getElementById('pinModalTitle');
            const s = document.getElementById('pinModalSubtitle');
            if (t) t.textContent = title;
            if (s) s.textContent = subtitle;
        }
    },

    /**
     * ==========================================
     * TRAITEMENT DU CODE
     * ==========================================
     */

    /**
     * Gère la saisie complète des 6 chiffres
     */
    handleComplete() {
        switch (this._mode) {
            case 'unlock':
                this.handleUnlock();
                break;
            case 'setup':
                this.handleSetupStep1();
                break;
            case 'confirm':
                this.handleSetupStep2();
                break;
            case 'change-verify':
                this.handleChangeVerify();
                break;
            case 'change-new':
                this.handleChangeNew();
                break;
            case 'change-confirm':
                this.handleChangeConfirm();
                break;
            case 'remove':
                this.handleRemove();
                break;
        }
    },

    /**
     * Mode : Déverrouiller
     */
    handleUnlock() {
        const storedPin = Storage.getPin();

        if (this._input === storedPin) {
            this.setDotsState('success');
            this.detachKeypadEvents();

            setTimeout(() => {
                this.hideLockScreen();
                Toast.success('🔓 Déverrouillé');
            }, 400);
        } else {
            this._attempts++;
            this.setDotsState('error');
            this.showError(`Code incorrect (${this._attempts})`);

            setTimeout(() => {
                this._input = '';
                this.updateDots();
            }, 500);

            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
    },

    /**
     * Mode : Setup - Étape 1 (premier code)
     */
    handleSetupStep1() {
        this._tempPin = this._input;
        this._input = '';
        this._mode = 'confirm';
        this.updateTitles('🔐 Confirmer', 'Retapez le même code');
        this.updateDots();
    },

    /**
     * Mode : Setup - Étape 2 (confirmation)
     */
    handleSetupStep2() {
        if (this._input === this._tempPin) {
            this.setDotsState('success');
            Storage.setPin(this._tempPin);

            setTimeout(() => {
                this.closeModal();
                Toast.success('🔒 Code PIN activé !');
                if (typeof Auth !== 'undefined') Auth.updateAccountUI();
            }, 500);
        } else {
            this.setDotsState('error');
            this.showError('Les codes ne correspondent pas');

            setTimeout(() => {
                this._input = '';
                this._tempPin = '';
                this._mode = 'setup';
                this.updateTitles('🔐 Nouveau code', 'Entrez un code à 6 chiffres');
                this.updateDots();
                this.clearError();
            }, 800);
        }
    },

    /**
     * Mode : Change - Vérifier ancien code
     */
    handleChangeVerify() {
        const storedPin = Storage.getPin();

        if (this._input === storedPin) {
            this.setDotsState('success');

            setTimeout(() => {
                this._input = '';
                this._mode = 'change-new';
                this.updateTitles('🔐 Nouveau code', 'Entrez votre nouveau code');
                this.updateDots();
            }, 400);
        } else {
            this.setDotsState('error');
            this.showError('Code incorrect');

            setTimeout(() => {
                this._input = '';
                this.updateDots();
                this.clearError();
            }, 500);
        }
    },

    /**
     * Mode : Change - Nouveau code
     */
    handleChangeNew() {
        this._tempPin = this._input;
        this._input = '';
        this._mode = 'change-confirm';
        this.updateTitles('🔐 Confirmer', 'Retapez le nouveau code');
        this.updateDots();
    },

    /**
     * Mode : Change - Confirmer nouveau code
     */
    handleChangeConfirm() {
        if (this._input === this._tempPin) {
            this.setDotsState('success');
            Storage.setPin(this._tempPin);

            setTimeout(() => {
                this.closeModal();
                Toast.success('🔒 Code PIN modifié !');
            }, 500);
        } else {
            this.setDotsState('error');
            this.showError('Les codes ne correspondent pas');

            setTimeout(() => {
                this._input = '';
                this._tempPin = '';
                this._mode = 'change-new';
                this.updateTitles('🔐 Nouveau code', 'Entrez votre nouveau code');
                this.updateDots();
                this.clearError();
            }, 800);
        }
    },

    /**
     * Mode : Supprimer PIN
     */
    handleRemove() {
        const storedPin = Storage.getPin();

        if (this._input === storedPin) {
            this.setDotsState('success');
            Storage.removePin();

            setTimeout(() => {
                this.closeModal();
                Toast.success('🔓 Code PIN supprimé');
                if (typeof Auth !== 'undefined') Auth.updateAccountUI();
            }, 500);
        } else {
            this.setDotsState('error');
            this.showError('Code incorrect');

            setTimeout(() => {
                this._input = '';
                this.updateDots();
                this.clearError();
            }, 500);
        }
    },

    /**
     * ==========================================
     * CODE OUBLIÉ
     * ==========================================
     */

    forgotPin() {
        const confirmed = prompt(
            '⚠️ Réinitialisation du PIN\n\n' +
            'Tapez RESET pour supprimer le code PIN.\n' +
            'Vos données seront conservées.'
        );

        if (confirmed && confirmed.toUpperCase() === 'RESET') {
            Storage.removePin();
            this.hideLockScreen();
            this.detachKeypadEvents();
            Toast.success('🔓 Code PIN supprimé');
        }
    },

    /**
     * ==========================================
     * MODAL DE GESTION (dans Réglages)
     * ==========================================
     */

    /**
     * Ouvre le modal de configuration PIN
     */
    openPinModal(mode) {
        this._mode = mode;
        this._input = '';
        this._tempPin = '';
        this._isModal = true;

        let title, subtitle;
        switch (mode) {
            case 'setup':
                title = '🔐 Nouveau code';
                subtitle = 'Entrez un code à 6 chiffres';
                break;
            case 'change-verify':
                title = '🔐 Changer le code';
                subtitle = 'Entrez votre code actuel';
                break;
            case 'remove':
                title = '🗑️ Supprimer le code';
                subtitle = 'Entrez votre code pour confirmer';
                break;
        }

        // Utiliser le système de sheet existant
        Router.openSheet('pin-modal', title, this.renderModalContent());

        // Attacher les événements
        setTimeout(() => {
            const sheet = document.getElementById('sheetContent');
            if (sheet) {
                this.attachKeypadEvents(sheet);
            }
            this.updateTitles(title, subtitle);
        }, 100);
    },

    /**
     * Rendu du contenu du modal PIN
     */
    renderModalContent() {
        return `
            <div style="text-align: center; padding: var(--space-md) 0;">
                <p id="pinModalSubtitle" style="color: var(--text2); font-size: var(--text-sm); margin-bottom: var(--space-md);">
                    Entrez votre code
                </p>

                <div class="pin-dots" id="pinDotsModal">
                    <div class="pin-dot"></div>
                    <div class="pin-dot"></div>
                    <div class="pin-dot"></div>
                    <div class="pin-dot"></div>
                    <div class="pin-dot"></div>
                    <div class="pin-dot"></div>
                </div>

                <p class="form-error" id="pinErrorModal"></p>

                <div class="keypad" style="max-width: 240px;">
                    <button class="key" data-key="1">1</button>
                    <button class="key" data-key="2">2</button>
                    <button class="key" data-key="3">3</button>
                    <button class="key" data-key="4">4</button>
                    <button class="key" data-key="5">5</button>
                    <button class="key" data-key="6">6</button>
                    <button class="key" data-key="7">7</button>
                    <button class="key" data-key="8">8</button>
                    <button class="key" data-key="9">9</button>
                    <button class="key delete" id="btnCancelPin" style="font-size: 1rem;">✕</button>
                    <button class="key" data-key="0">0</button>
                    <button class="key delete" data-action="delete">⌫</button>
                </div>
            </div>
        `;
    },

    /**
     * Annule et ferme le modal
     */
    cancelModal() {
        this.closeModal();
    },

    /**
     * Ferme le modal
     */
    closeModal() {
        this.detachKeypadEvents();
        this._isModal = false;
        Router.closeSheet();
    }
};

// Alias global
window.PinLock = PinLock;
