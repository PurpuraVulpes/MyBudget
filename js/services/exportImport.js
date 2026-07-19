/* ============================================
   EXPORTIMPORT.JS - Export/Import avancé (CSV, PDF)
   ============================================ */

'use strict';

const ExportImport = {

    /**
     * ==========================================
     * OUVERTURE DE LA SHEET DE CHOIX
     * ==========================================
     */

    openExportSheet() {
        const html = `
            <p style="color: var(--text2); font-size: var(--text-sm); text-align: center; margin-bottom: var(--space-md);">
                Choisissez le format d'export
            </p>

            <div class="export-options">
                <button class="export-option" id="exportJSON">
                    <span class="export-option-icon">💾</span>
                    <span class="export-option-title">JSON</span>
                    <span class="export-option-desc">Sauvegarde complète<br>Ré-importable</span>
                </button>

                <button class="export-option" id="exportCSV">
                    <span class="export-option-icon">📊</span>
                    <span class="export-option-title">CSV</span>
                    <span class="export-option-desc">Pour Excel<br>Ou tableur</span>
                </button>

                <button class="export-option" id="exportPDF">
                    <span class="export-option-icon">📄</span>
                    <span class="export-option-title">PDF</span>
                    <span class="export-option-desc">Rapport imprimable<br>Du mois</span>
                </button>

                <button class="export-option" id="exportPrint">
                    <span class="export-option-icon">🖨️</span>
                    <span class="export-option-title">Imprimer</span>
                    <span class="export-option-desc">Résumé mensuel<br>Direct</span>
                </button>
            </div>

            <div class="divider-text">
                <span>OU IMPORTER</span>
            </div>

            <div class="form">
                <button class="btn btn-outline btn-block" id="importJSON">
                    📥 Importer un fichier JSON
                </button>
                <button class="btn btn-outline btn-block" id="importCSV">
                    📥 Importer un fichier CSV
                </button>
            </div>
        `;

        Router.openSheet('export-import', 'Import / Export', html);

        setTimeout(() => this.attachEvents(), 100);
    },

    /**
     * Attache les événements
     */
    attachEvents() {
        document.getElementById('exportJSON')?.addEventListener('click', () => {
            Storage.downloadExport();
            Router.closeSheet();
            Toast.success('📤 Export JSON téléchargé !');
        });

        document.getElementById('exportCSV')?.addEventListener('click', () => {
            this.openCSVExportChoice();
        });

        document.getElementById('exportPDF')?.addEventListener('click', () => {
            this.exportPDF();
        });

        document.getElementById('exportPrint')?.addEventListener('click', () => {
            this.printMonthSummary();
        });

        document.getElementById('importJSON')?.addEventListener('click', () => {
            this.importFile('.json', 'json');
        });

        document.getElementById('importCSV')?.addEventListener('click', () => {
            this.importFile('.csv', 'csv');
        });
    },

    /**
     * ==========================================
     * EXPORT CSV
     * ==========================================
     */

    openCSVExportChoice() {
        const html = `
            <p style="color: var(--text2); font-size: var(--text-sm); text-align: center; margin-bottom: var(--space-md);">
                Quel type de données exporter ?
            </p>

            <div class="form">
                <button class="btn btn-outline btn-block" data-csv-type="depenses">
                    💳 Dépenses (${State.data.depenses.length})
                </button>
                <button class="btn btn-outline btn-block" data-csv-type="horaires">
                    ⏰ Horaires (${State.data.horaires.length})
                </button>
                <button class="btn btn-outline btn-block" data-csv-type="paiements">
                    💼 Paiements (${State.data.paiements.length})
                </button>
                <button class="btn btn-outline btn-block" data-csv-type="extras">
                    🎁 Extras (${State.data.extras.length})
                </button>
                <button class="btn btn-outline btn-block" data-csv-type="epargne">
                    🏦 Épargne (${State.data.epargne.length})
                </button>
                <button class="btn btn-primary btn-block" data-csv-type="all">
                    📦 Tout exporter (fichier ZIP)
                </button>
            </div>
        `;

        Router.openSheet('csv-choice', 'Export CSV', html);

        setTimeout(() => {
            document.querySelectorAll('[data-csv-type]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.csvType;
                    this.exportCSV(type);
                });
            });
        }, 100);
    },

    /**
     * Exporte en CSV
     */
    exportCSV(type) {
        let csv = '';
        let filename = '';

        switch (type) {
            case 'depenses':
                csv = this.generateDepensesCSV();
                filename = `depenses_${StateHelpers.today()}.csv`;
                break;

            case 'horaires':
                csv = this.generateHorairesCSV();
                filename = `horaires_${StateHelpers.today()}.csv`;
                break;

            case 'paiements':
                csv = this.generatePaiementsCSV();
                filename = `paiements_${StateHelpers.today()}.csv`;
                break;

            case 'extras':
                csv = this.generateExtrasCSV();
                filename = `extras_${StateHelpers.today()}.csv`;
                break;

            case 'epargne':
                csv = this.generateEpargneCSV();
                filename = `epargne_${StateHelpers.today()}.csv`;
                break;

            case 'all':
                // Génère un fichier CSV combiné (pas un ZIP pour simplifier)
                csv = this.generateAllCSV();
                filename = `monbudget_${StateHelpers.today()}.csv`;
                break;
        }

        if (!csv) {
            Toast.warning('⚠️ Aucune donnée à exporter');
            return;
        }

        this.downloadCSV(csv, filename);
        Router.closeSheet();
        Toast.success('📊 CSV téléchargé !');
    },

    /**
     * Génère le CSV des dépenses
     */
    generateDepensesCSV() {
        const headers = ['Date', 'Montant', 'Devise', 'Catégorie', 'Description', 'Tags'];
        const rows = State.data.depenses.map(d => [
            d.date,
            d.montant.toFixed(2).replace('.', ','),
            State.settings.devise,
            d.categorie,
            (d.description || '').replace(/"/g, '""'),
            (d.tags || []).join(', ')
        ]);

        return this.buildCSV(headers, rows);
    },

    /**
     * Génère le CSV des horaires
     */
    generateHorairesCSV() {
        const headers = ['Date', 'Début', 'Fin', 'Pause (min)', 'Durée (min)', 'Durée (h)', 'Gain', 'Note'];
        const rows = State.data.horaires.map(h => [
            h.date,
            h.debut,
            h.fin,
            h.pause || 0,
            h.minutes,
            (h.minutes / 60).toFixed(2).replace('.', ','),
            h.gain.toFixed(2).replace('.', ','),
            (h.note || '').replace(/"/g, '""')
        ]);

        return this.buildCSV(headers, rows);
    },

    /**
     * Génère le CSV des paiements
     */
    generatePaiementsCSV() {
        const headers = ['Mois de réception', 'Date enregistrement', 'Montant', 'Description'];
        const rows = State.data.paiements.map(p => [
            p.mois,
            p.date,
            p.montant.toFixed(2).replace('.', ','),
            (p.description || '').replace(/"/g, '""')
        ]);

        return this.buildCSV(headers, rows);
    },

    /**
     * Génère le CSV des extras
     */
    generateExtrasCSV() {
        const headers = ['Date', 'Montant', 'Source', 'Description'];
        const rows = State.data.extras.map(e => [
            e.date,
            e.montant.toFixed(2).replace('.', ','),
            e.source,
            (e.description || '').replace(/"/g, '""')
        ]);

        return this.buildCSV(headers, rows);
    },

    /**
     * Génère le CSV de l'épargne
     */
    generateEpargneCSV() {
        const headers = ['Date', 'Type', 'Montant', 'Raison'];
        const rows = State.data.epargne.map(e => [
            e.date,
            e.type === 'deposit' ? 'Dépôt' : 'Retrait',
            e.montant.toFixed(2).replace('.', ','),
            (e.raison || '').replace(/"/g, '""')
        ]);

        return this.buildCSV(headers, rows);
    },

    /**
     * Génère un CSV combiné de toutes les données
     */
    generateAllCSV() {
        let csv = '=== DÉPENSES ===\n';
        csv += this.generateDepensesCSV();
        csv += '\n\n=== HORAIRES ===\n';
        csv += this.generateHorairesCSV();
        csv += '\n\n=== PAIEMENTS ===\n';
        csv += this.generatePaiementsCSV();
        csv += '\n\n=== EXTRAS ===\n';
        csv += this.generateExtrasCSV();
        csv += '\n\n=== ÉPARGNE ===\n';
        csv += this.generateEpargneCSV();

        return csv;
    },

    /**
     * Construit un CSV
     */
    buildCSV(headers, rows) {
        // BOM UTF-8 pour Excel
        let csv = '\uFEFF';

        // En-têtes
        csv += headers.map(h => `"${h}"`).join(';') + '\n';

        // Lignes
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(';') + '\n';
        });

        return csv;
    },

    /**
     * Télécharge un CSV
     */
    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    },

    /**
     * ==========================================
     * EXPORT PDF (via impression navigateur)
     * ==========================================
     */

    exportPDF() {
        const html = `
            <p style="color: var(--text2); font-size: var(--text-sm); text-align: center; margin-bottom: var(--space-md);">
                Choisissez le mois à exporter en PDF
            </p>

            <div class="form">
                <div class="form-group">
                    <label class="form-label">📅 Mois</label>
                    <input type="month" id="pdfMonth" value="${StateHelpers.currentMonth()}">
                </div>

                <button class="btn btn-primary btn-block" id="btnGeneratePDF">
                    📄 Générer le PDF
                </button>
            </div>

            <div class="banner banner-info" style="margin-top: var(--space-md);">
                <span class="banner-icon">💡</span>
                <div class="banner-body">
                    <div class="banner-title">Comment ça marche</div>
                    <div class="banner-text">
                        La fenêtre d'impression s'ouvrira. Choisissez "Enregistrer au format PDF" pour créer un fichier PDF.
                    </div>
                </div>
            </div>
        `;

        Router.openSheet('pdf-export', 'Export PDF', html);

        setTimeout(() => {
            document.getElementById('btnGeneratePDF')?.addEventListener('click', () => {
                const month = document.getElementById('pdfMonth').value;
                this.generatePDFReport(month);
            });
        }, 100);
    },

    /**
     * Génère un rapport imprimable en PDF
     */
    generatePDFReport(month) {
        const monthLong = Format.monthLong(month);
        const revenue = StateHelpers.computeMonthlyRevenue(month);
        const expenses = StateHelpers.computeMonthlyExpenses(month);
        const solde = revenue.totalReel - expenses;
        const depenses = StateHelpers.getDepensesForMonth(month);
        const horaires = StateHelpers.getHorairesForMonth(month);
        const extras = StateHelpers.getExtrasForMonth(month);
        const paiements = StateHelpers.getPaiementsForMonth(month);

        // Regrouper dépenses par catégorie
        const catTotals = {};
        depenses.forEach(d => {
            catTotals[d.categorie] = (catTotals[d.categorie] || 0) + d.montant;
        });
        const catsSorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

        const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport MonBudget - ${monthLong}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
            color: #1a202c;
            background: white;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.5;
        }
        h1 {
            font-size: 28px;
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 12px;
            margin-bottom: 8px;
        }
        h2 {
            font-size: 18px;
            color: #4a5568;
            margin-top: 32px;
            margin-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
        }
        .subtitle {
            color: #718096;
            font-size: 14px;
            margin-bottom: 24px;
        }
        .bilan {
            display: flex;
            gap: 16px;
            margin: 24px 0;
        }
        .bilan-card {
            flex: 1;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        .bilan-card.success {
            background: #d1fae5;
            color: #065f46;
        }
        .bilan-card.danger {
            background: #fee2e2;
            color: #991b1b;
        }
        .bilan-card.info {
            background: #dbeafe;
            color: #1e40af;
        }
        .bilan-amount {
            font-size: 28px;
            font-weight: 800;
            margin: 8px 0;
        }
        .bilan-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            font-size: 13px;
        }
        th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        th {
            background: #f7fafc;
            font-weight: 700;
            color: #4a5568;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }
        td.amount {
            text-align: right;
            font-weight: 600;
        }
        td.amount.danger { color: #dc2626; }
        td.amount.success { color: #059669; }
        .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin: 16px 0;
        }
        .stat {
            padding: 16px;
            background: #f7fafc;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 20px;
            font-weight: 800;
            color: #667eea;
        }
        .stat-label {
            font-size: 11px;
            color: #718096;
            text-transform: uppercase;
            margin-top: 4px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            color: #a0aec0;
            text-align: center;
        }
        @media print {
            body { padding: 20px; }
            h2 { page-break-after: avoid; }
            table { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <h1>💰 Rapport MonBudget</h1>
    <div class="subtitle">${monthLong} · Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>

    <div class="bilan">
        <div class="bilan-card success">
            <div class="bilan-label">Revenus</div>
            <div class="bilan-amount">${Format.money(revenue.totalReel)}</div>
        </div>
        <div class="bilan-card danger">
            <div class="bilan-label">Dépenses</div>
            <div class="bilan-amount">${Format.money(expenses)}</div>
        </div>
        <div class="bilan-card ${solde >= 0 ? 'info' : 'danger'}">
            <div class="bilan-label">Solde</div>
            <div class="bilan-amount">${solde >= 0 ? '+' : ''}${Format.money(solde)}</div>
        </div>
    </div>

    <h2>📊 Statistiques</h2>
    <div class="stats">
        <div class="stat">
            <div class="stat-value">${new Set(horaires.map(h => h.date)).size}</div>
            <div class="stat-label">Jours travaillés</div>
        </div>
        <div class="stat">
            <div class="stat-value">${Format.duration(horaires.reduce((s, h) => s + h.minutes, 0))}</div>
            <div class="stat-label">Heures totales</div>
        </div>
        <div class="stat">
            <div class="stat-value">${depenses.length}</div>
            <div class="stat-label">Nb dépenses</div>
        </div>
        <div class="stat">
            <div class="stat-value">${Format.money(depenses.length > 0 ? expenses / depenses.length : 0)}</div>
            <div class="stat-label">Dépense moy.</div>
        </div>
    </div>

    ${catsSorted.length > 0 ? `
    <h2>🏷️ Dépenses par catégorie</h2>
    <table>
        <thead>
            <tr><th>Catégorie</th><th>Total</th><th style="text-align:right">%</th></tr>
        </thead>
        <tbody>
            ${catsSorted.map(([cat, amt]) => `
                <tr>
                    <td>${cat}</td>
                    <td class="amount danger">${Format.money(amt)}</td>
                    <td style="text-align:right; color: #718096;">${((amt / expenses) * 100).toFixed(1)}%</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    ` : ''}

    ${depenses.length > 0 ? `
    <h2>💳 Détail des dépenses</h2>
    <table>
        <thead>
            <tr><th>Date</th><th>Catégorie</th><th>Description</th><th style="text-align:right">Montant</th></tr>
        </thead>
        <tbody>
            ${depenses.map(d => `
                <tr>
                    <td>${Format.date(d.date)}</td>
                    <td>${d.categorie}</td>
                    <td>${d.description || '-'}</td>
                    <td class="amount danger">-${Format.money(d.montant)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    ` : ''}

    ${paiements.length > 0 ? `
    <h2>💼 Salaires reçus</h2>
    <table>
        <thead>
            <tr><th>Date</th><th>Description</th><th style="text-align:right">Montant</th></tr>
        </thead>
        <tbody>
            ${paiements.map(p => `
                <tr>
                    <td>${Format.date(p.date)}</td>
                    <td>${p.description || 'Salaire'}</td>
                    <td class="amount success">+${Format.money(p.montant)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    ` : ''}

    ${extras.length > 0 ? `
    <h2>🎁 Revenus supplémentaires</h2>
    <table>
        <thead>
            <tr><th>Date</th><th>Source</th><th>Description</th><th style="text-align:right">Montant</th></tr>
        </thead>
        <tbody>
            ${extras.map(e => `
                <tr>
                    <td>${Format.date(e.date)}</td>
                    <td>${e.source}</td>
                    <td>${e.description || '-'}</td>
                    <td class="amount success">+${Format.money(e.montant)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    ` : ''}

    ${horaires.length > 0 ? `
    <h2>⏰ Horaires de travail</h2>
    <table>
        <thead>
            <tr><th>Date</th><th>Horaire</th><th>Durée</th><th style="text-align:right">Gain</th></tr>
        </thead>
        <tbody>
            ${horaires.map(h => `
                <tr>
                    <td>${Format.date(h.date)}</td>
                    <td>${h.debut} – ${h.fin}${h.pause ? ` (${h.pause}min pause)` : ''}</td>
                    <td>${Format.duration(h.minutes)}</td>
                    <td class="amount success">${Format.money(h.gain)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    ` : ''}

    <div class="footer">
        MonBudget v5 · Rapport généré automatiquement<br>
        ${State.data.depenses.length + State.data.horaires.length + State.data.paiements.length + State.data.extras.length} entrées totales
    </div>
</body>
</html>
        `;

        // Ouvrir dans une nouvelle fenêtre et imprimer
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            Toast.error('❌ Popup bloqué. Autorisez les popups.');
            return;
        }

        printWindow.document.write(html);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.print();
        }, 500);

        Router.closeSheet();
        Toast.success('📄 Fenêtre d\'impression ouverte');
    },

    /**
     * ==========================================
     * IMPRESSION DIRECTE (résumé rapide)
     * ==========================================
     */

    printMonthSummary() {
        const month = StateHelpers.currentMonth();
        this.generatePDFReport(month);
    },

    /**
     * ==========================================
     * IMPORT
     * ==========================================
     */

    importFile(accept, type) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.display = 'none';

        input.addEventListener('change', () => {
            if (input.files.length > 0) {
                if (type === 'json') {
                    this.importJSON(input.files[0]);
                } else if (type === 'csv') {
                    this.importCSV(input.files[0]);
                }
            }
            document.body.removeChild(input);
        });

        document.body.appendChild(input);
        input.click();
    },

    /**
     * Import JSON
     */
    importJSON(file) {
        Storage.importFromFile(file)
            .then(success => {
                if (success) {
                    Toast.success('📥 Données importées !');
                    Router.closeSheet();
                    if (typeof App !== 'undefined') App.refreshUI();

                    if (State.user && !State.isGuestMode) {
                        localStorage.removeItem(Storage.KEYS.UPLOADED + State.user.uid);
                        CloudSync.uploadLocalData(State.user.uid);
                    }
                } else {
                    Toast.error('❌ Erreur import');
                }
            })
            .catch(err => Toast.error('❌ ' + err.message));
    },

    /**
     * Import CSV (dépenses uniquement)
     */
    importCSV(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n').filter(l => l.trim());

                if (lines.length < 2) {
                    Toast.error('❌ Fichier CSV vide ou invalide');
                    return;
                }

                // Détecter le séparateur
                const firstLine = lines[0];
                const separator = firstLine.includes(';') ? ';' : ',';

                // Parser les en-têtes
                const headers = this.parseCSVLine(firstLine, separator);

                // Détecter le type (dépense/horaire/etc.)
                const isDepenses = headers.some(h => /catégorie|categorie/i.test(h));

                if (!isDepenses) {
                    Toast.warning('⚠️ Format non reconnu. Import CSV uniquement pour dépenses.');
                    return;
                }

                let imported = 0;

                for (let i = 1; i < lines.length; i++) {
                    const values = this.parseCSVLine(lines[i], separator);
                    if (values.length < 3) continue;

                    // Trouver les colonnes
                    const dateIdx = headers.findIndex(h => /date/i.test(h));
                    const montantIdx = headers.findIndex(h => /montant|prix|amount/i.test(h));
                    const catIdx = headers.findIndex(h => /catégorie|categorie|category/i.test(h));
                    const descIdx = headers.findIndex(h => /description|desc|libellé/i.test(h));

                    if (dateIdx < 0 || montantIdx < 0) continue;

                    const date = values[dateIdx];
                    let montantStr = values[montantIdx].replace(',', '.').replace(/[^\d.-]/g, '');
                    const montant = parseFloat(montantStr);

                    if (!date || isNaN(montant) || montant <= 0) continue;

                    const depense = {
                        id: StateHelpers.generateId() + imported,
                        date: date,
                        montant: montant,
                        categorie: catIdx >= 0 ? values[catIdx] : '🔧 Autre',
                        description: descIdx >= 0 ? values[descIdx] : ''
                    };

                    App.addData('depenses', depense);
                    imported++;
                }

                if (imported > 0) {
                    Toast.success(`✅ ${imported} dépense${imported > 1 ? 's' : ''} importée${imported > 1 ? 's' : ''}`);
                    Router.closeSheet();
                    if (typeof App !== 'undefined') App.refreshUI();
                } else {
                    Toast.warning('⚠️ Aucune donnée valide trouvée');
                }

            } catch (error) {
                console.error('Erreur import CSV:', error);
                Toast.error('❌ Erreur de lecture du CSV');
            }
        };

        reader.readAsText(file);
    },

    /**
     * Parse une ligne CSV en tenant compte des guillemets
     */
    parseCSVLine(line, separator) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === separator && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result.map(v => v.replace(/^"(.*)"$/, '$1'));
    }
};

// Alias global
window.ExportImport = ExportImport;
