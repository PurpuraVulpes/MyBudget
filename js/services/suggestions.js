/* ============================================
   SUGGESTIONS.JS - Suggestions intelligentes
   ============================================ */

'use strict';

const Suggestions = {

    /**
     * ==========================================
     * GÉNÉRATION DE SUGGESTIONS
     * ==========================================
     */

    /**
     * Génère toutes les suggestions pour un mois donné
     * @param {string} monthStr - Format YYYY-MM (optionnel, sinon mois actuel)
     * @returns {Array} Liste de suggestions [{icon, text, type}]
     */
    generate(monthStr) {
        const month = monthStr || StateHelpers.currentMonth();
        const suggestions = [];

        // Ajouter toutes les catégories de suggestions
        suggestions.push(...this.checkDepenseEvolution(month));
        suggestions.push(...this.checkRevenuEvolution(month));
        suggestions.push(...this.checkObjectifs());
        suggestions.push(...this.checkEpargne(month));
        suggestions.push(...this.checkRecurrent());
        suggestions.push(...this.checkBudgets(month));
        suggestions.push(...this.checkTauxEpargne(month));
        suggestions.push(...this.checkHoraires(month));

        // Trier par priorité (positive d'abord, puis warning, puis info)
        const priority = { positive: 0, warning: 1, info: 2, default: 3 };
        suggestions.sort((a, b) => (priority[a.type] || 3) - (priority[b.type] || 3));

        return suggestions;
    },

    /**
     * ==========================================
     * ÉVOLUTION DES DÉPENSES
     * ==========================================
     */
    checkDepenseEvolution(month) {
        const suggestions = [];
        const prevMonth = StateHelpers.getPreviousMonth(month);

        const currentDep = StateHelpers.computeMonthlyExpenses(month);
        const prevDep = StateHelpers.computeMonthlyExpenses(prevMonth);

        if (prevDep > 0 && currentDep > 0) {
            const diff = ((currentDep - prevDep) / prevDep) * 100;

            if (diff > 20) {
                suggestions.push({
                    icon: '📈',
                    type: 'warning',
                    text: `Vos dépenses ont augmenté de <strong>${Math.round(diff)}%</strong> par rapport à ${Format.monthShort(prevMonth)}. Peut-être temps de revoir votre budget ?`
                });
            } else if (diff < -20) {
                suggestions.push({
                    icon: '📉',
                    type: 'positive',
                    text: `Bravo ! Vos dépenses ont baissé de <strong>${Math.round(Math.abs(diff))}%</strong> par rapport à ${Format.monthShort(prevMonth)}. Continuez comme ça !`
                });
            } else if (Math.abs(diff) < 5) {
                suggestions.push({
                    icon: '⚖️',
                    type: 'info',
                    text: `Vos dépenses sont stables par rapport à ${Format.monthShort(prevMonth)} (${diff >= 0 ? '+' : ''}${Math.round(diff)}%).`
                });
            }
        }

        return suggestions;
    },

    /**
     * ==========================================
     * ÉVOLUTION DES REVENUS
     * ==========================================
     */
    checkRevenuEvolution(month) {
        const suggestions = [];
        const prevMonth = StateHelpers.getPreviousMonth(month);

        const currentRev = StateHelpers.computeMonthlyRevenue(month);
        const prevRev = StateHelpers.computeMonthlyRevenue(prevMonth);

        if (prevRev.totalReel > 0 && currentRev.totalReel > 0) {
            const diff = ((currentRev.totalReel - prevRev.totalReel) / prevRev.totalReel) * 100;

            if (diff > 15) {
                suggestions.push({
                    icon: '💰',
                    type: 'positive',
                    text: `Vos revenus ont augmenté de <strong>${Math.round(diff)}%</strong> par rapport à ${Format.monthShort(prevMonth)}. Excellent !`
                });
            } else if (diff < -15) {
                suggestions.push({
                    icon: '💸',
                    type: 'warning',
                    text: `Vos revenus ont baissé de <strong>${Math.round(Math.abs(diff))}%</strong> par rapport à ${Format.monthShort(prevMonth)}.`
                });
            }
        }

        return suggestions;
    },

    /**
     * ==========================================
     * OBJECTIFS
     * ==========================================
     */
    checkObjectifs() {
        const suggestions = [];
        const objectifs = State.data.objectifs || [];

        if (objectifs.length === 0) return suggestions;

        objectifs.forEach(o => {
            const percent = (o.deja / o.montant) * 100;

            // Objectif atteint récemment
            if (percent >= 100) {
                suggestions.push({
                    icon: '🎉',
                    type: 'positive',
                    text: `🏆 Objectif <strong>${o.nom}</strong> atteint ! Bravo !`
                });
            }
            // Presque atteint
            else if (percent >= 90) {
                const restant = o.montant - o.deja;
                suggestions.push({
                    icon: '🎯',
                    type: 'positive',
                    text: `Votre objectif <strong>${o.nom}</strong> est presque atteint (${Math.round(percent)}%). Encore ${Format.money(restant)} !`
                });
            }
            // Objectif en retard (moins de 25% après plusieurs mois)
            else if (o.dateCreation) {
                const created = new Date(o.dateCreation);
                const now = new Date();
                const monthsSince = (now.getFullYear() - created.getFullYear()) * 12 +
                                    (now.getMonth() - created.getMonth());

                if (monthsSince >= 3 && percent < 25) {
                    suggestions.push({
                        icon: '⏳',
                        type: 'warning',
                        text: `Votre objectif <strong>${o.nom}</strong> avance lentement (${Math.round(percent)}% en ${monthsSince} mois). Peut-être augmenter la mensualité ?`
                    });
                }
            }
        });

        return suggestions;
    },

    /**
     * ==========================================
     * ÉPARGNE
     * ==========================================
     */
    checkEpargne(month) {
        const suggestions = [];
        const epargneSolde = StateHelpers.getEpargneSolde();
        const revenue = StateHelpers.computeMonthlyRevenue(month);

        if (epargneSolde <= 0) return suggestions;

        if (revenue.totalReel > 0) {
            const ratio = epargneSolde / revenue.totalReel;

            if (ratio >= 6) {
                suggestions.push({
                    icon: '🏆',
                    type: 'positive',
                    text: `Votre épargne représente <strong>${Math.floor(ratio)} mois</strong> de revenus. Excellent bas de laine !`
                });
            } else if (ratio >= 3) {
                suggestions.push({
                    icon: '🏦',
                    type: 'positive',
                    text: `Votre épargne représente <strong>${Math.floor(ratio)} mois</strong> de revenus. C'est un bon coussin de sécurité !`
                });
            } else if (ratio < 1) {
                suggestions.push({
                    icon: '💡',
                    type: 'info',
                    text: `Idéalement, essayez d'avoir au moins <strong>3 mois de revenus</strong> en épargne pour la sécurité.`
                });
            }
        }

        // Épargne du mois
        const mvts = StateHelpers.getEpargneForMonth(month);
        const depots = mvts.filter(e => e.type === 'deposit');
        const retraits = mvts.filter(e => e.type === 'withdraw');

        if (depots.length === 0 && retraits.length === 0 && revenue.totalReel > 0) {
            suggestions.push({
                icon: '🐷',
                type: 'info',
                text: `Vous n'avez rien épargné ce mois. Même <strong>${Format.money(revenue.totalReel * 0.1)}</strong> (10% de vos revenus) ferait la différence !`
            });
        }

        return suggestions;
    },

    /**
     * ==========================================
     * DÉPENSES RÉCURRENTES
     * ==========================================
     */
    checkRecurrent() {
        const suggestions = [];
        const recurrent = (State.data.recurrent || []).filter(r => r.actif !== false);

        if (recurrent.length === 0) return suggestions;

        // Total mensuel des récurrentes
        const totalMensuel = recurrent.reduce((s, r) => s + r.montant, 0);
        const revenue = StateHelpers.computeMonthlyRevenue(StateHelpers.currentMonth());

        if (revenue.totalReel > 0) {
            const ratio = (totalMensuel / revenue.totalReel) * 100;

            if (ratio > 60) {
                suggestions.push({
                    icon: '⚠️',
                    type: 'warning',
                    text: `Vos dépenses fixes représentent <strong>${Math.round(ratio)}%</strong> de vos revenus. C'est beaucoup ! Il vous reste peu de marge pour l'imprévu.`
                });
            } else if (ratio > 40) {
                suggestions.push({
                    icon: '📊',
                    type: 'info',
                    text: `Vos dépenses fixes représentent <strong>${Math.round(ratio)}%</strong> de vos revenus.`
                });
            }
        }

        // Prochaines échéances (dans les 3 prochains jours)
        const today = new Date();
        const currentDay = today.getDate();

        recurrent.forEach(r => {
            const daysUntil = r.jour - currentDay;
            if (daysUntil >= 0 && daysUntil <= 3) {
                let when;
                if (daysUntil === 0) when = 'aujourd\'hui';
                else if (daysUntil === 1) when = 'demain';
                else when = `dans ${daysUntil} jours`;

                suggestions.push({
                    icon: '🔔',
                    type: 'warning',
                    text: `<strong>${r.nom}</strong> (${Format.money(r.montant)}) est prévu ${when}.`
                });
            }
        });

        return suggestions;
    },

    /**
     * ==========================================
     * BUDGETS
     * ==========================================
     */
    checkBudgets(month) {
        const suggestions = [];
        const budgets = State.data.budgets || [];

        if (budgets.length === 0) return suggestions;

        const depenses = StateHelpers.getDepensesForMonth(month);

        // Calculer les totaux par catégorie
        const catTotals = {};
        depenses.forEach(d => {
            catTotals[d.categorie] = (catTotals[d.categorie] || 0) + d.montant;
        });

        budgets.forEach(b => {
            const spent = catTotals[b.categorie] || 0;
            const percent = b.max > 0 ? (spent / b.max) * 100 : 0;

            if (percent >= 100) {
                const overrun = spent - b.max;
                suggestions.push({
                    icon: '🚨',
                    type: 'warning',
                    text: `Budget <strong>${b.categorie}</strong> dépassé de ${Format.money(overrun)} ! (${Math.round(percent)}%)`
                });
            } else if (percent >= 90) {
                suggestions.push({
                    icon: '⚠️',
                    type: 'warning',
                    text: `Budget <strong>${b.categorie}</strong> presque atteint (${Math.round(percent)}%).`
                });
            }
        });

        return suggestions;
    },

    /**
     * ==========================================
     * TAUX D'ÉPARGNE
     * ==========================================
     */
    checkTauxEpargne(month) {
        const suggestions = [];

        const revenue = StateHelpers.computeMonthlyRevenue(month);
        const depenses = StateHelpers.computeMonthlyExpenses(month);

        if (revenue.totalReel <= 0) return suggestions;

        const solde = revenue.totalReel - depenses;
        const tauxEpargne = (solde / revenue.totalReel) * 100;

        if (tauxEpargne >= 20) {
            suggestions.push({
                icon: '🌟',
                type: 'positive',
                text: `Vous économisez <strong>${Math.round(tauxEpargne)}%</strong> de vos revenus ce mois. Un taux d'épargne excellent !`
            });
        } else if (tauxEpargne >= 10) {
            suggestions.push({
                icon: '👍',
                type: 'positive',
                text: `Vous économisez <strong>${Math.round(tauxEpargne)}%</strong> de vos revenus ce mois. C'est un bon taux !`
            });
        } else if (tauxEpargne < 0) {
            suggestions.push({
                icon: '📉',
                type: 'warning',
                text: `Vous avez dépensé plus que vous n'avez gagné ce mois (déficit de ${Format.money(Math.abs(solde))}).`
            });
        }

        return suggestions;
    },

    /**
     * ==========================================
     * HORAIRES
     * ==========================================
     */
    checkHoraires(month) {
        const suggestions = [];
        const horaires = StateHelpers.getHorairesForMonth(month);

        if (horaires.length === 0) return suggestions;

        const totalMinutes = horaires.reduce((s, h) => s + h.minutes, 0);
        const totalHeures = totalMinutes / 60;
        const nbJours = new Set(horaires.map(h => h.date)).size;

        // Moyenne journalière
        const moyJour = totalHeures / nbJours;

        if (moyJour > 10) {
            suggestions.push({
                icon: '😰',
                type: 'warning',
                text: `Vous travaillez en moyenne <strong>${moyJour.toFixed(1)}h par jour</strong> travaillé. Attention au surmenage !`
            });
        }

        // Comparaison avec mois précédent
        const prevMonth = StateHelpers.getPreviousMonth(month);
        const prevHoraires = StateHelpers.getHorairesForMonth(prevMonth);

        if (prevHoraires.length > 0) {
            const prevMinutes = prevHoraires.reduce((s, h) => s + h.minutes, 0);
            const diff = ((totalMinutes - prevMinutes) / prevMinutes) * 100;

            if (diff > 30) {
                suggestions.push({
                    icon: '⚡',
                    type: 'info',
                    text: `Vous avez travaillé <strong>${Math.round(diff)}%</strong> de plus qu'en ${Format.monthShort(prevMonth)}.`
                });
            }
        }

        return suggestions;
    }
};

// Alias global
window.Suggestions = Suggestions;
