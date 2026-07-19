/* ============================================
   GRAPHIQUES.JS - Moteur de rendu des graphiques
   ============================================ */

'use strict';

const Graphiques = {

    /**
     * ==========================================
     * BAR CHART HORIZONTAL (par catégorie)
     * ==========================================
     */
    renderBarChartHorizontal(data, options = {}) {
        if (!data || data.length === 0) {
            return `
                <div class="empty-page" style="min-height: 150px;">
                    <p style="color: var(--text2); font-size: var(--text-sm);">Aucune donnée</p>
                </div>
            `;
        }

        // Trier par valeur décroissante
        const sorted = [...data].sort((a, b) => b.value - a.value);
        const max = sorted[0].value;
        const total = data.reduce((s, d) => s + d.value, 0);

        let html = '<div class="bar-chart">';

        sorted.forEach((item, i) => {
            const percent = (item.value / max) * 100;
            const color = item.color || PALETTE_COULEURS[i % PALETTE_COULEURS.length];
            const displayValue = options.formatter ?
                options.formatter(item.value) :
                Format.money(item.value);

            html += `
                <div class="bar-row">
                    <span class="bar-label">${item.label}</span>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: ${percent}%; background: ${color};"></div>
                    </div>
                    <span class="bar-value">${displayValue}</span>
                </div>
            `;
        });

        html += '</div>';

        if (options.showTotal !== false) {
            html += `
                <div style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--border-light); display: flex; justify-content: space-between; font-size: var(--text-sm); font-weight: var(--font-bold);">
                    <span>Total</span>
                    <span style="color: var(--primary-light);">${Format.money(total)}</span>
                </div>
            `;
        }

        return html;
    },

    /**
     * ==========================================
     * BAR CHART VERTICAL (par jour)
     * ==========================================
     */
    renderBarChartVertical(data, options = {}) {
        if (!data || data.length === 0) {
            return `
                <div class="empty-page" style="min-height: 150px;">
                    <p style="color: var(--text2); font-size: var(--text-sm);">Aucune donnée</p>
                </div>
            `;
        }

        const max = Math.max(...data.map(d => Math.abs(d.value)));

        let html = '<div class="bar-chart-vertical">';

        data.forEach(item => {
            const height = max > 0 ? Math.max((Math.abs(item.value) / max) * 100, 3) : 0;
            const isNegative = item.value < 0;
            const barClass = options.colorType === 'success' ? 'success' :
                             (isNegative ? 'negative' : '');
            const displayValue = options.formatter ?
                options.formatter(item.value) :
                Format.money(Math.abs(item.value));

            html += `
                <div class="bar-col" title="${item.label}: ${displayValue}">
                    <span class="bar-col-value">${displayValue}</span>
                    <div class="bar-col-fill ${barClass}" style="height: ${item.value !== 0 ? height : 0}%;"></div>
                    <span class="bar-col-label">${item.shortLabel || item.label}</span>
                </div>
            `;
        });

        html += '</div>';

        return html;
    },

    /**
     * ==========================================
     * LINE CHART (évolution)
     * ==========================================
     */
    renderLineChart(datasets, options = {}) {
        // datasets = [{ label, color, points: [{ x, y }] }]
        if (!datasets || datasets.length === 0) {
            return `
                <div class="empty-page" style="min-height: 150px;">
                    <p style="color: var(--text2); font-size: var(--text-sm);">Aucune donnée</p>
                </div>
            `;
        }

        const width = 600;
        const height = 200;
        const padding = { top: 20, right: 20, bottom: 30, left: 45 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Trouver les min/max
        let allPoints = [];
        datasets.forEach(ds => allPoints = allPoints.concat(ds.points));

        if (allPoints.length === 0) {
            return `
                <div class="empty-page" style="min-height: 150px;">
                    <p style="color: var(--text2); font-size: var(--text-sm);">Aucune donnée</p>
                </div>
            `;
        }

        const yValues = allPoints.map(p => p.y);
        const yMax = Math.max(...yValues, 0);
        const yMin = Math.min(...yValues, 0);
        const yRange = yMax - yMin || 1;

        // Nombre de points sur l'axe X (basé sur le premier dataset)
        const nbPoints = datasets[0].points.length;
        const xStep = nbPoints > 1 ? chartWidth / (nbPoints - 1) : 0;

        // Fonction pour convertir une valeur en pixel
        const toX = (i) => padding.left + (i * xStep);
        const toY = (val) => padding.top + chartHeight - ((val - yMin) / yRange * chartHeight);

        let svg = `<svg class="line-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">`;

        // Grille horizontale (3 lignes)
        for (let i = 0; i <= 3; i++) {
            const y = padding.top + (chartHeight / 3) * i;
            const value = yMax - (yRange / 3) * i;
            svg += `<line class="line-chart-grid" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"/>`;
            svg += `<text class="line-chart-label" x="${padding.left - 8}" y="${y + 4}" text-anchor="end" style="font-size: 9px;">${this.formatCompact(value)}</text>`;
        }

        // Ligne zéro (si négatif présent)
        if (yMin < 0) {
            const zeroY = toY(0);
            svg += `<line class="line-chart-axis" x1="${padding.left}" y1="${zeroY}" x2="${width - padding.right}" y2="${zeroY}"/>`;
        }

        // Datasets
        datasets.forEach((ds, dsIndex) => {
            const color = ds.color || PALETTE_COULEURS[dsIndex % PALETTE_COULEURS.length];

            // Path pour la ligne
            let pathData = '';
            let areaData = '';

            ds.points.forEach((pt, i) => {
                const x = toX(i);
                const y = toY(pt.y);

                if (i === 0) {
                    pathData += `M ${x} ${y}`;
                    areaData += `M ${x} ${toY(0)} L ${x} ${y}`;
                } else {
                    pathData += ` L ${x} ${y}`;
                    areaData += ` L ${x} ${y}`;
                }
            });

            // Fermer l'aire
            if (ds.points.length > 0) {
                const lastX = toX(ds.points.length - 1);
                areaData += ` L ${lastX} ${toY(0)} Z`;
            }

            // Zone (opaque léger)
            if (options.showArea !== false) {
                svg += `<path d="${areaData}" fill="${color}" opacity="0.15"/>`;
            }

            // Ligne
            svg += `<path class="line-chart-line" d="${pathData}" stroke="${color}"/>`;

            // Points
            ds.points.forEach((pt, i) => {
                const x = toX(i);
                const y = toY(pt.y);
                svg += `<circle class="line-chart-point" cx="${x}" cy="${y}" r="4" fill="${color}"/>`;
            });
        });

        // Labels axe X
        if (options.xLabels && options.xLabels.length > 0) {
            options.xLabels.forEach((lbl, i) => {
                const x = toX(i);
                svg += `<text class="line-chart-label" x="${x}" y="${height - 8}">${lbl}</text>`;
            });
        }

        svg += '</svg>';

        // Légende
        let legend = '';
        if (datasets.length > 1) {
            legend = '<div class="line-chart-legend">';
            datasets.forEach((ds, i) => {
                const color = ds.color || PALETTE_COULEURS[i % PALETTE_COULEURS.length];
                legend += `
                    <div class="line-legend-item">
                        <span class="line-legend-color" style="background: ${color};"></span>
                        <span>${ds.label}</span>
                    </div>
                `;
            });
            legend += '</div>';
        }

        return `<div class="line-chart">${svg}</div>${legend}`;
    },

    /**
     * ==========================================
     * PIE CHART (camembert / donut)
     * ==========================================
     */
    renderPieChart(data, options = {}) {
        if (!data || data.length === 0) {
            return `
                <div class="empty-page" style="min-height: 150px;">
                    <p style="color: var(--text2); font-size: var(--text-sm);">Aucune donnée</p>
                </div>
            `;
        }

        const total = data.reduce((s, d) => s + d.value, 0);
        if (total <= 0) {
            return `
                <div class="empty-page" style="min-height: 150px;">
                    <p style="color: var(--text2); font-size: var(--text-sm);">Aucune donnée</p>
                </div>
            `;
        }

        // Trier par valeur décroissante
        const sorted = [...data].sort((a, b) => b.value - a.value);

        // Assigner les couleurs
        sorted.forEach((item, i) => {
            if (!item.color) {
                item.color = PALETTE_COULEURS[i % PALETTE_COULEURS.length];
            }
        });

        // Générer le SVG (donut)
        const size = 140;
        const strokeWidth = 24;
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const cx = size / 2;
        const cy = size / 2;

        let svg = `<svg viewBox="0 0 ${size} ${size}" style="width: 100%; height: 100%;">`;

        let currentOffset = 0;

        sorted.forEach((item) => {
            const percent = item.value / total;
            const dashArray = percent * circumference;
            const dashOffset = -currentOffset;

            svg += `
                <circle cx="${cx}" cy="${cy}" r="${radius}"
                        fill="none"
                        stroke="${item.color}"
                        stroke-width="${strokeWidth}"
                        stroke-dasharray="${dashArray} ${circumference}"
                        stroke-dashoffset="${dashOffset}"
                        transform="rotate(-90 ${cx} ${cy})"
                        style="transition: stroke-dasharray 0.6s var(--ease-out);"/>
            `;

            currentOffset += dashArray;
        });

        svg += '</svg>';

        // Légende
        let legend = '<div class="pie-legend">';
        sorted.forEach(item => {
            const percent = ((item.value / total) * 100).toFixed(0);
            legend += `
                <div class="pie-legend-item">
                    <span class="pie-legend-dot" style="background: ${item.color};"></span>
                    <span class="pie-legend-name">${item.label}</span>
                    <span class="pie-legend-value">${percent}%</span>
                </div>
            `;
        });
        legend += '</div>';

        return `
            <div class="pie-chart-wrapper">
                <div class="pie-chart">
                    ${svg}
                    <div class="pie-chart-total">
                        <span class="pie-chart-total-value">${Format.money(total)}</span>
                        <span class="pie-chart-total-label">Total</span>
                    </div>
                </div>
                ${legend}
            </div>
        `;
    },

    /**
     * ==========================================
     * COMPARAISON DE PÉRIODES
     * ==========================================
     */
    renderCompare(items, options = {}) {
        // items = [{ label, current, previous }]
        let html = `<div class="compare-card">`;

        if (options.title) {
            html += `<div class="compare-header">${options.title}</div>`;
        }

        items.forEach(item => {
            const diff = item.current - item.previous;
            const percentDiff = item.previous !== 0 ?
                (diff / Math.abs(item.previous)) * 100 : 0;

            let diffClass = 'neutral';
            let diffSign = '';
            let diffIcon = '';

            if (Math.abs(percentDiff) < 1) {
                diffClass = 'neutral';
                diffIcon = '=';
            } else if (diff > 0) {
                diffClass = item.reverseColors ? 'down' : 'up';
                diffSign = '+';
                diffIcon = '↑';
            } else {
                diffClass = item.reverseColors ? 'up' : 'down';
                diffIcon = '↓';
            }

            const displayValue = options.formatter ?
                options.formatter(item.current) :
                Format.money(item.current);

            html += `
                <div class="compare-row">
                    <span class="compare-label">${item.label}</span>
                    <div class="compare-values">
                        <span class="compare-value-current">${displayValue}</span>
                        <span class="compare-value-diff ${diffClass}">
                            ${diffIcon} ${diffSign}${Math.abs(percentDiff).toFixed(0)}%
                        </span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    },

    /**
     * ==========================================
     * TOP ITEMS (top 5 des dépenses par ex)
     * ==========================================
     */
    renderTopItems(items, options = {}) {
        if (!items || items.length === 0) {
            return `
                <div class="empty-page" style="min-height: 100px;">
                    <p style="color: var(--text2); font-size: var(--text-sm);">Aucune donnée</p>
                </div>
            `;
        }

        const limit = options.limit || 5;
        const sorted = [...items].sort((a, b) => b.value - a.value).slice(0, limit);

        let html = '<div class="top-list">';

        sorted.forEach((item, i) => {
            const rank = i + 1;
            const rankClass = rank <= 3 ? ` top-${rank}` : '';

            html += `
                <div class="top-item">
                    <div class="top-item-info">
                        <div class="top-item-rank${rankClass}">${rank}</div>
                        <span class="top-item-name">${item.label}</span>
                    </div>
                    <span class="top-item-value">${Format.money(item.value)}</span>
                </div>
            `;
        });

        html += '</div>';
        return html;
    },

    /**
     * ==========================================
     * HELPERS
     * ==========================================
     */

    /**
     * Formate un nombre de manière compacte : 1500 -> "1.5k"
     */
    formatCompact(value) {
        const abs = Math.abs(value);

        if (abs >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (abs >= 1000) {
            return (value / 1000).toFixed(1) + 'k';
        } else if (abs >= 100) {
            return Math.round(value).toString();
        } else {
            return value.toFixed(0);
        }
    },

    /**
     * Génère les données pour un graphique par catégorie (dépenses)
     */
    dataFromDepensesByCategory(depenses) {
        const cats = {};
        depenses.forEach(d => {
            cats[d.categorie] = (cats[d.categorie] || 0) + d.montant;
        });

        return Object.entries(cats).map(([label, value]) => ({
            label,
            value
        }));
    },

    /**
     * Génère les données pour un graphique par source (extras)
     */
    dataFromExtrasBySource(extras) {
        const sources = {};
        extras.forEach(e => {
            sources[e.source] = (sources[e.source] || 0) + e.montant;
        });

        return Object.entries(sources).map(([label, value]) => ({
            label,
            value
        }));
    },

    /**
     * Génère les données journalières pour un mois donné
     */
    dataFromDepensesByDay(depenses, monthStr) {
        const [year, month] = monthStr.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();

        const daily = {};
        depenses.forEach(d => {
            const day = parseInt(d.date.split('-')[2]);
            daily[day] = (daily[day] || 0) + d.montant;
        });

        const data = [];
        for (let i = 1; i <= daysInMonth; i++) {
            data.push({
                label: `${i}/${month}`,
                shortLabel: String(i),
                value: daily[i] || 0
            });
        }

        return data;
    },

    /**
     * Génère les données sur les N derniers mois
     */
    dataMonthlyEvolution(nbMonths, dataType = 'revenus') {
        const data = [];
        const currentM = StateHelpers.currentMonth();
        let month = currentM;

        // Reculer de N-1 mois
        for (let i = 0; i < nbMonths - 1; i++) {
            month = StateHelpers.getPreviousMonth(month);
        }

        // Puis avancer et calculer
        for (let i = 0; i < nbMonths; i++) {
            let value = 0;

            switch (dataType) {
                case 'revenus':
                    const rev = StateHelpers.computeMonthlyRevenue(month);
                    value = rev.totalReel;
                    break;
                case 'depenses':
                    value = StateHelpers.computeMonthlyExpenses(month);
                    break;
                case 'solde':
                    value = StateHelpers.computeMonthlyBalance(month);
                    break;
                case 'epargne':
                    // Cumul de l'épargne à la fin du mois
                    const [y, m] = month.split('-').map(Number);
                    const endOfMonth = new Date(y, m, 0);
                    value = State.data.epargne
                        .filter(e => new Date(e.date) <= endOfMonth)
                        .reduce((sum, e) => sum + (e.type === 'deposit' ? e.montant : -e.montant), 0);
                    break;
            }

            data.push({
                label: Format.monthShort(month),
                y: value,
                monthStr: month
            });

            month = StateHelpers.getNextMonth(month);
        }

        return data;
    }
};

// Alias global
window.Graphiques = Graphiques;
