// Knicks Cap Crash v2 - localStorage Persistence Layer
window.CapCrash = window.CapCrash || {};

CapCrash.Storage = {
    STORAGE_KEY: 'capcrash_v2',

    getProfile: function() {
        try {
            var raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return this.createDefaultProfile();
            var profile = JSON.parse(raw);
            // Ensure all fields exist (migration from older versions)
            var defaults = this.createDefaultProfile();
            for (var key in defaults) {
                if (!(key in profile)) {
                    profile[key] = defaults[key];
                }
            }
            return profile;
        } catch (e) {
            return this.createDefaultProfile();
        }
    },

    createDefaultProfile: function() {
        return {
            version: 2,
            tutorialComplete: false,
            gamesPlayed: 0,
            gamesWon: 0,
            difficultiesBeaten: {
                rookie: false,
                pro: false,
                legend: false
            },
            bestScores: {
                rookie: { qpts: 0, capEfficiency: 0, tier: null },
                pro: { qpts: 0, capEfficiency: 0, tier: null },
                legend: { qpts: 0, capEfficiency: 0, tier: null }
            },
            claimCodes: [],
            achievements: [],
            reflectionAnswers: [],
            currentGame: null
        };
    },

    saveProfile: function(profile) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile));
        } catch (e) {
            // localStorage full or unavailable — fail silently
        }
    },

    // Auto-save current game state (for resume on refresh)
    saveGameState: function(gameState) {
        var profile = this.getProfile();
        profile.currentGame = {
            difficulty: gameState.difficulty,
            players: gameState.players.map(function(p) {
                return {
                    id: p.id,
                    status: p.status,
                    useMLE: p.useMLE,
                    useVetMin: p.useVetMin
                };
            }),
            challenges: gameState.challenges || [],
            timestamp: Date.now()
        };
        this.saveProfile(profile);
    },

    // Load saved game state
    loadGameState: function() {
        var profile = this.getProfile();
        if (!profile.currentGame) return null;
        // Expire saves older than 7 days
        if (Date.now() - profile.currentGame.timestamp > 7 * 24 * 60 * 60 * 1000) {
            profile.currentGame = null;
            this.saveProfile(profile);
            return null;
        }
        return profile.currentGame;
    },

    clearCurrentGame: function() {
        var profile = this.getProfile();
        profile.currentGame = null;
        this.saveProfile(profile);
    },

    recordWin: function(difficulty, tier, claimCode, qpts, capEfficiency) {
        var profile = this.getProfile();
        profile.gamesWon++;
        profile.difficultiesBeaten[difficulty] = true;

        // Update best score if better
        if (qpts > profile.bestScores[difficulty].qpts) {
            profile.bestScores[difficulty] = {
                qpts: qpts,
                capEfficiency: capEfficiency,
                tier: tier
            };
        }

        // Add claim code
        profile.claimCodes.push({
            code: claimCode,
            difficulty: difficulty,
            tier: tier,
            date: new Date().toISOString()
        });

        this.saveProfile(profile);
    },

    recordGamePlayed: function() {
        var profile = this.getProfile();
        profile.gamesPlayed++;
        this.saveProfile(profile);
    },

    markTutorialComplete: function() {
        var profile = this.getProfile();
        profile.tutorialComplete = true;
        this.saveProfile(profile);
    },

    isTutorialComplete: function() {
        return this.getProfile().tutorialComplete;
    },

    saveReflectionAnswers: function(difficulty, tier, claimCode, answers) {
        var profile = this.getProfile();
        profile.reflectionAnswers.push({
            difficulty: difficulty,
            tier: tier,
            claimCode: claimCode,
            answers: answers,
            date: new Date().toISOString()
        });
        this.saveProfile(profile);
    },

    // Achievement management
    hasAchievement: function(id) {
        return this.getProfile().achievements.indexOf(id) !== -1;
    },

    addAchievement: function(id) {
        var profile = this.getProfile();
        if (profile.achievements.indexOf(id) === -1) {
            profile.achievements.push(id);
            this.saveProfile(profile);
            return true; // newly earned
        }
        return false; // already had it
    },

    // Reset all data
    resetAll: function() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
};
