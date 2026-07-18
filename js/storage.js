/* ============================================
   STORAGE.JS - Gestion du stockage local
   ============================================ */

'use strict';

/**
 * Gestion du stockage local (localStorage)
 * Structure v5 : tout est stocké sous une seule clé "mb_state_v5"
 */
const Storage = {

    // Clés localStorage
    KEYS: {
        STATE: 'mb_state_v5',
        PIN: 'mb_pin_v5',
        UPLOADED: 'mb_uploaded_',       // + uid
        LAST_SYNC: 'mb_last_sync_',     // + uid
        BANNER_DISMISSED: 'mb_banner_v5'
    },

    /**
     * ==========================================
     * SAUVEGARDE
     * ==========================================
     */

    /**
     * Sauvegarde tout l'état dans localStorage
     */
    save() {
        try {
            const payload = {
                version: State.version,
                settings: State.settings,
                modules: State.modules,
                data: State.data,
                lastSaved: new Date().toISOString()
            };

            const json = JSON.stringify(payload);
            localStorage.setItem(this.KEYS.STATE, json);

            // Événement personnalisé pour la synchronisation
            document.dispatchEvent(new CustomEvent('state:saved', {
                detail: { size: json.length }
            }));

            return true;
        } catch (e) {
            console.error('❌ Erreur sauvegarde:', e);

            // Si le localStorage est plein
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                this.handleQuotaExceeded();
            }

            return false;
        }
    },

    /**
     * Sauvegarde uniquement une partie des données (optimisation)
     * @param {string} section - 'settings', 'modules', 'data'
     */
    saveSection(section) {
        // Pour l'instant on sauve tout, mais on garde la méthode pour évoluer
        return this.save();
    },

    /**
     * Sauvegarde silencieuse (pas d'événement)
     */
    saveSilent() {
        try {
            const payload = {
                version: State.version,
                settings: State.settings,
                modules: State.modules,
                data: State.data,
                lastSaved: new Date().toISOString()
            };
            localStorage.setItem(this.KEYS.STATE, JSON.stringify(payload));
            return true;
        } catch (e) {
            console.error('❌ Erreur sauvegarde silencieuse:', e);
            return false;
        }
    },

    /**
     * ==========================================
     * CHARGEMENT
     * ==========================================
     */

    /**
     * Charge l'état depuis localStorage
     */
    load() {
        try {
            const raw = localStorage.getItem(this.KEYS.STATE);
            if (!raw) return false;

            const payload = JSON.parse(raw);

            // Vérifier la version
            if (!payload.version || payload.version < 5) {
                console.warn('⚠️ Version incompatible, migration nécessaire');
                return false;
            }

            // Charger les settings (fusion avec les defaults)
            if (payload.settings) {
                State.settings = { ...State.settings, ...payload.settings };
                // Fusion des widgets
                if (payload.settings.widgets) {
                    State.settings.widgets = { ...State.settings.widgets, ...payload.settings.widgets };
                }
            }

            // Charger les modules (fusion avec les defaults)
            if (payload.modules) {
                State.modules = { ...State.modules, ...payload.modules };
            }

            // Charger les données
            if (payload.data) {
                Object.keys(State.data).forEach(key => {
                    if (Array.isArray(payload.data[key])) {
                        State.data[key] = payload.data[key];
                    }
                });
            }

            console.log('✅ État chargé');
            return true;

        } catch (e) {
            console.error('❌ Erreur chargement:', e);
            return false;
        }
    },

    /**
     * ==========================================
     * INITIALISATION
     * ==========================================
     */

    /**
     * Initialise le stockage au démarrage de l'app
     * Gère la migration si nécessaire
     */
    init() {
        // 1. Vérifier s'il faut migrer
        if (Migration.needsMigration()) {
            console.log('🔄 Migration détectée');
            const migrated = Migration.migrate();
            if (migrated) {
                // Sauvegarder dans le nouveau format
                this.save();
                // Note: on ne nettoie PAS les anciennes clés tout de suite
                // On les gardera pour sécurité pendant quelques semaines
            }
        }

        // 2. Charger l'état
        const loaded = this.load();

        if (!loaded) {
            console.log('🆕 Premier lancement ou données vides');
            // Sauvegarder l'état par défaut
            this.save();
        }

        // 3. Écouter les changements pour auto-save
        this.setupAutoSave();

        return loaded;
    },

    /**
     * Configure l'auto-save avec debounce
     */
    setupAutoSave() {
        let saveTimer = null;

        document.addEventListener('state:changed', () => {
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                this.save();
            }, 500); // Attendre 500ms avant de sauver
        });
    },

    /**
     * ==========================================
     * GESTION DES ERREURS
     * ==========================================
     */

    /**
     * Gère le cas où le localStorage est plein
     */
    handleQuotaExceeded() {
        console.error('💾 Quota localStorage dépassé !');

        // Essayer de nettoyer les anciennes clés
        const oldKeys = [
            'mb_horaires', 'mb_depenses', 'mb_paiements', 'mb_extras',
            'mb_epargne', 'mb_shopping', 'mb_objectifs', 'mb_settings'
        ];

        let cleaned = 0;
        oldKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                cleaned++;
            }
        });

        if (cleaned > 0) {
            console.log(`🧹 ${cleaned} anciennes clés supprimées, réessai...`);
            // Réessayer la sauvegarde
            setTimeout(() => this.save(), 100);
        } else {
            // Alerter l'utilisateur
            if (typeof Toast !== 'undefined') {
                Toast.error('Stockage plein ! Exportez vos données puis effacez-en.');
            }
        }
    },

    /**
     * ==========================================
     * EXPORT / IMPORT
     * ==========================================
     */

    /**
     * Exporte toutes les données en JSON
     * @returns {Object} Payload à exporter
     */
    export() {
        return {
            version: State.version,
            settings: State.settings,
            modules: State.modules,
            data: State.data,
            exportDate: new Date().toISOString(),
            app: 'MonBudget v5'
        };
    },

    /**
     * Génère un fichier JSON téléchargeable
     */
    downloadExport() {
        try {
            const data = this.export();
            const blob = new Blob(
                [JSON.stringify(data, null, 2)],
                { type: 'application/json' }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `monbudget_${StateHelpers.today()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            return true;
        } catch (e) {
            console.error('❌ Erreur export:', e);
            return false;
        }
    },

    /**
     * Importe des données depuis un fichier
     * @param {File} file
     * @returns {Promise<boolean>}
     */
    importFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('Aucun fichier'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    const success = this.importData(data);
                    resolve(success);
                } catch (e) {
                    console.error('❌ Erreur parsing import:', e);
                    reject(new Error('Fichier JSON invalide'));
                }
            };

            reader.onerror = () => reject(new Error('Erreur lecture fichier'));
            reader.readAsText(file);
        });
    },

    /**
     * Importe des données depuis un objet
     * @param {Object} data
     * @returns {boolean}
     */
    importData(data) {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('Format invalide');
            }

            // Version v5+
            if (data.version && data.version >= 5) {
                if (data.settings) {
                    State.settings = { ...State.settings, ...data.settings };
                }
                if (data.modules) {
                    State.modules = { ...State.modules, ...data.modules };
                }
                if (data.data) {
                    Object.keys(State.data).forEach(key => {
                        if (Array.isArray(data.data[key])) {
                            State.data[key] = data.data[key];
                        }
                    });
                }
            }
            // Ancienne version v4 (à plat)
            else {
                if (data.horaires) State.data.horaires = data.horaires;
                if (data.depenses) State.data.depenses = data.depenses;
                if (data.paiements) State.data.paiements = data.paiements;
                if (data.extras) State.data.extras = data.extras;
                if (data.epargne) State.data.epargne = data.epargne;
                if (data.shopping) State.data.shopping = data.shopping;
                if (data.objectifs) State.data.objectifs = data.objectifs;
                if (data.settings) {
                    State.settings = { ...State.settings, ...data.settings };
                }
            }

            this.save();
            return true;

        } catch (e) {
            console.error('❌ Erreur import:', e);
            return false;
        }
    },

    /**
     * ==========================================
     * RESET
     * ==========================================
     */

    /**
     * Efface toutes les données (garde les settings et le PIN)
     */
    clearData() {
        Object.keys(State.data).forEach(key => {
            State.data[key] = [];
        });
        this.save();
    },

    /**
     * Efface TOUT (données + settings + PIN)
     */
    clearAll() {
        // Reset State
        State.data = {
            horaires: [],
            depenses: [],
            paiements: [],
            extras: [],
            epargne: [],
            objectifs: [],
            shopping: [],
            recurrent: [],
            budgets: [],
            tickets: []
        };

        State.settings = {
            tauxHoraire: 12.00,
            devise: '€',
            arrondi: 'none',
            theme: 'purple',
            deviseSecondaire: null,
            tauxChange: 1,
            notificationsActives: false,
            widgets: {
                solde: true,
                revenus: true,
                depenses: true,
                epargne: true,
                objectifs: true,
                recurrent: true,
                budgets: false,
                suggestions: true
            }
        };

        // Vider localStorage
        localStorage.removeItem(this.KEYS.STATE);
        localStorage.removeItem(this.KEYS.PIN);

        // Nettoyer les vieilles clés aussi
        const oldKeys = [
            'mb_horaires', 'mb_depenses', 'mb_paiements', 'mb_extras',
            'mb_epargne', 'mb_shopping', 'mb_objectifs', 'mb_settings',
            'mb_pin', 'mb_banner_dismissed'
        ];
        oldKeys.forEach(key => localStorage.removeItem(key));

        // Nettoyer les clés d'upload cloud
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('mb_uploaded_') || key.startsWith('mb_last_sync_')) {
                localStorage.removeItem(key);
            }
        });

        console.log('🗑️ Toutes les données ont été effacées');
    },

    /**
     * ==========================================
     * PIN CODE
     * ==========================================
     */

    getPin() {
        // Nouvelle clé
        let pin = localStorage.getItem(this.KEYS.PIN);
        // Fallback ancienne clé (migration progressive)
        if (!pin) {
            pin = localStorage.getItem('mb_pin');
        }
        return pin;
    },

    setPin(pin) {
        localStorage.setItem(this.KEYS.PIN, pin);
    },

    removePin() {
        localStorage.removeItem(this.KEYS.PIN);
        localStorage.removeItem('mb_pin'); // Ancienne clé aussi
    },

    hasPin() {
        return this.getPin() !== null;
    },

    /**
     * ==========================================
     * INFOS / DEBUG
     * ==========================================
     */

    /**
     * Renvoie la taille du stockage utilisé
     */
    getStorageSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    },

    /**
     * Renvoie la taille formatée
     */
    getStorageSizeFormatted() {
        const bytes = this.getStorageSize();
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    },

    /**
     * Renvoie des statistiques sur les données
     */
    getStats() {
        return {
            horaires: State.data.horaires.length,
            depenses: State.data.depenses.length,
            paiements: State.data.paiements.length,
            extras: State.data.extras.length,
            epargne: State.data.epargne.length,
            objectifs: State.data.objectifs.length,
            shopping: State.data.shopping.length,
            recurrent: State.data.recurrent.length,
            budgets: State.data.budgets.length,
            tickets: State.data.tickets.length,
            storageSize: this.getStorageSizeFormatted()
        };
    }
};

/**
 * Helper global pour notifier un changement d'état
 * Déclenche l'auto-save
 */
function notifyStateChange() {
    document.dispatchEvent(new CustomEvent('state:changed'));
}
