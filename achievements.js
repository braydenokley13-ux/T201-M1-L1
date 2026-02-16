// Knicks Cap Crash v2 - Achievement / Badge System
window.CapCrash = window.CapCrash || {};

CapCrash.Achievements = {
    definitions: [
        {
            id: 'first_win',
            name: 'First W',
            icon: '\u{1F3C6}',
            description: 'Win your first game on any difficulty',
            check: function() { return true; } // Always true on win
        },
        {
            id: 'rookie_clear',
            name: 'Rookie GM',
            icon: '\u{1F31F}',
            description: 'Beat Rookie mode',
            check: function(gameState, config) { return config.key === 'rookie'; }
        },
        {
            id: 'pro_clear',
            name: 'Pro GM',
            icon: '\u{1F3C0}',
            description: 'Beat Pro mode',
            check: function(gameState, config) { return config.key === 'pro'; }
        },
        {
            id: 'legend_clear',
            name: 'Legend GM',
            icon: '\u{1F451}',
            description: 'Beat Legend mode',
            check: function(gameState, config) { return config.key === 'legend'; }
        },
        {
            id: 'all_three',
            name: 'Triple Threat',
            icon: '\u{1F3C5}',
            description: 'Beat all three difficulty levels',
            check: function() {
                var profile = CapCrash.Storage.getProfile();
                return profile.difficultiesBeaten.rookie &&
                       profile.difficultiesBeaten.pro &&
                       profile.difficultiesBeaten.legend;
            }
        },
        {
            id: 'budget_hawk',
            name: 'Budget Hawk',
            icon: '\u{1F4B0}',
            description: 'Win with 20%+ cap space remaining',
            check: function(gameState, config) {
                var efficiency = (config.salaryCap - gameState.totalPayroll) / config.salaryCap;
                return efficiency > 0.2;
            }
        },
        {
            id: 'star_power',
            name: 'Star Power',
            icon: '\u2B50',
            description: 'Sign all 3 Knicks stars in one game',
            check: function(gameState) {
                return gameState.starsKept >= 3;
            }
        },
        {
            id: 'lebron_knick',
            name: 'King of New York',
            icon: '\u{1F451}',
            description: 'Sign LeBron James to the Knicks',
            check: function(gameState) {
                return gameState.players.some(function(p) { return p.id === 101 && p.status === 'Sign'; });
            }
        },
        {
            id: 'curry_knick',
            name: 'Chef in the Garden',
            icon: '\u{1F373}',
            description: 'Sign Stephen Curry to the Knicks',
            check: function(gameState) {
                return gameState.players.some(function(p) { return p.id === 102 && p.status === 'Sign'; });
            }
        },
        {
            id: 'no_mle',
            name: 'No Coupons Needed',
            icon: '\u{1F4AA}',
            description: 'Win without using the MLE',
            check: function(gameState) { return !gameState.mleUsed; }
        },
        {
            id: 'vet_squad',
            name: 'Old School',
            icon: '\u{1F474}',
            description: 'Use all available Vet Min slots in a winning roster',
            check: function(gameState, config) { return gameState.vetMinCount >= config.vetMinSlots; }
        },
        {
            id: 'dynasty',
            name: 'Dynasty Builder',
            icon: '\u{1F48E}',
            description: 'Reach Dynasty tier on any difficulty',
            check: function(gameState, config, seasonResults) {
                return seasonResults && seasonResults.tier === 'Dynasty';
            }
        },
        {
            id: 'perfect_legend',
            name: 'GOAT GM',
            icon: '\u{1F410}',
            description: 'Reach Dynasty tier on Legend mode',
            check: function(gameState, config, seasonResults) {
                return config.key === 'legend' && seasonResults && seasonResults.tier === 'Dynasty';
            }
        },
        {
            id: 'no_undo',
            name: 'No Regrets',
            icon: '\u{1F3AF}',
            description: 'Win without using undo once',
            check: function(gameState) { return (gameState.undoCount || 0) === 0; }
        },
        {
            id: 'speed_run',
            name: 'Fast Break',
            icon: '\u26A1',
            description: 'Win within 60 seconds of starting',
            check: function(gameState) {
                if (!gameState.startTime) return false;
                return (Date.now() - gameState.startTime) < 60000;
            }
        }
    ],

    // Check all achievements on win, return newly earned ones
    checkAll: function(gameState, config, seasonResults) {
        var newlyEarned = [];
        var self = this;

        this.definitions.forEach(function(ach) {
            if (!CapCrash.Storage.hasAchievement(ach.id)) {
                try {
                    if (ach.check(gameState, config, seasonResults)) {
                        var isNew = CapCrash.Storage.addAchievement(ach.id);
                        if (isNew) {
                            newlyEarned.push(ach);
                        }
                    }
                } catch (e) {
                    // Skip broken achievement checks
                }
            }
        });

        return newlyEarned;
    },

    // Show toast notifications for each new achievement
    showNotifications: function(achievements) {
        var delay = 0;
        achievements.forEach(function(ach) {
            setTimeout(function() {
                CapCrash.Achievements.showToast(ach);
            }, delay);
            delay += 1500;
        });
    },

    showToast: function(achievement) {
        var toast = document.createElement('div');
        toast.className = 'achievement-toast';
        toast.innerHTML =
            '<div class="achievement-toast-icon">' + achievement.icon + '</div>' +
            '<div class="achievement-toast-text">' +
                '<div class="achievement-toast-title">Achievement Unlocked!</div>' +
                '<div class="achievement-toast-name">' + achievement.name + '</div>' +
                '<div class="achievement-toast-desc">' + achievement.description + '</div>' +
            '</div>';

        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(function() {
            toast.classList.add('show');
        });

        // Remove after animation
        setTimeout(function() {
            toast.classList.add('hide');
            setTimeout(function() { toast.remove(); }, 500);
        }, 3000);
    },

    // Get all achievements with earned status for trophy case
    getAllWithStatus: function() {
        return this.definitions.map(function(ach) {
            return {
                id: ach.id,
                name: ach.name,
                icon: ach.icon,
                description: ach.description,
                earned: CapCrash.Storage.hasAchievement(ach.id)
            };
        });
    }
};
