// Knicks Cap Crash v2 - Difficulty Configuration
window.CapCrash = window.CapCrash || {};

CapCrash.DIFFICULTIES = {
    rookie: {
        key: 'rookie',
        label: 'Rookie',
        icon: '\u{1F31F}',
        description: 'Learning the ropes — more cap space, fewer requirements',
        salaryCap: 140000000,
        qpMinimum: 75,
        rosterMin: 8,
        rosterMax: 15,
        starsRequired: 1,
        mleDiscount: 0.5,
        vetMinSlots: 3,
        vetMinCost: 2000000,
        birdRightsFee: 0,
        requirePositionDiversity: false,
        minPositions: 0,
        hintsMode: 'auto',       // 'auto' | 'on-request' | 'none'
        hintDelay: 3,            // auto-show after N moves
        reflectionRequired: false,
        seasonTierThresholds: {
            dynasty: 85,
            championship: 80,
            superteam: 75,
            contender: 70,
            playoff: 65
        },
        claimCodePrefix: 'ROOKIE'
    },
    pro: {
        key: 'pro',
        label: 'Pro',
        icon: '\u{1F3C0}',
        description: 'The real deal — standard salary cap challenge',
        salaryCap: 120000000,
        qpMinimum: 85,
        rosterMin: 10,
        rosterMax: 13,
        starsRequired: 2,
        mleDiscount: 0.5,
        vetMinSlots: 3,
        vetMinCost: 2000000,
        birdRightsFee: 0,
        requirePositionDiversity: false,
        minPositions: 0,
        hintsMode: 'on-request',
        hintDelay: 0,
        reflectionRequired: true,
        seasonTierThresholds: {
            dynasty: 95,
            championship: 90,
            superteam: 85,
            contender: 85,
            playoff: 80
        },
        claimCodePrefix: 'PRO'
    },
    legend: {
        key: 'legend',
        label: 'Legend',
        icon: '\u{1F451}',
        description: 'Elite GM challenge — tighter cap, harder rules',
        salaryCap: 110000000,
        qpMinimum: 90,
        rosterMin: 10,
        rosterMax: 12,
        starsRequired: 2,
        mleDiscount: 0.4,
        vetMinSlots: 2,
        vetMinCost: 2000000,
        birdRightsFee: 2000000,
        requirePositionDiversity: true,
        minPositions: 3,
        hintsMode: 'none',
        hintDelay: 0,
        reflectionRequired: true,
        seasonTierThresholds: {
            dynasty: 100,
            championship: 95,
            superteam: 90,
            contender: 90,
            playoff: 85
        },
        claimCodePrefix: 'LEGEND'
    }
};

// Challenge objectives (randomly selected 1-2 per game)
CapCrash.CHALLENGES = [
    {
        id: 'no_fa_stars',
        name: 'Hometown Heroes',
        description: 'Win without signing any free agent stars (LeBron, Curry, Butler, Lillard)',
        check: function(gameState) {
            const faStarIds = [101, 102, 103, 104];
            return !gameState.players.some(p => faStarIds.includes(p.id) && p.status === 'Sign');
        }
    },
    {
        id: 'under_100m',
        name: 'Penny Pincher',
        description: 'Win with total payroll under $100M',
        check: function(gameState) {
            return gameState.totalPayroll < 100000000;
        }
    },
    {
        id: 'all_positions',
        name: 'Position Player',
        description: 'Sign at least one player from every position',
        check: function(gameState) {
            const positions = new Set();
            gameState.players.forEach(function(p) {
                if (p.status === 'Sign') positions.add(p.position);
            });
            return positions.size >= 5;
        }
    },
    {
        id: 'max_qpts',
        name: 'Quality Over Quantity',
        description: 'Reach 95+ Quality Points',
        check: function(gameState) {
            return gameState.totalQPts >= 95;
        }
    },
    {
        id: 'min_roster',
        name: 'Small Ball',
        description: 'Win with exactly the minimum number of players allowed',
        check: function(gameState, config) {
            return gameState.playerCount === config.rosterMin;
        }
    },
    {
        id: 'no_exceptions',
        name: 'No Shortcuts',
        description: 'Win without using MLE or Vet Min exceptions',
        check: function(gameState) {
            return !gameState.mleUsed && gameState.vetMinCount === 0;
        }
    },
    {
        id: 'all_three_stars',
        name: 'Star Collector',
        description: 'Keep all 3 Knicks stars on your roster',
        check: function(gameState) {
            return gameState.starsKept >= 3;
        }
    },
    {
        id: 'budget_master',
        name: 'Cap Wizard',
        description: 'Win with more than 20% cap space remaining',
        check: function(gameState, config) {
            var capEfficiency = (config.salaryCap - gameState.totalPayroll) / config.salaryCap;
            return capEfficiency > 0.2;
        }
    }
];

// Get default difficulty
CapCrash.getSelectedDifficulty = function() {
    var stored = sessionStorage.getItem('capcrash_difficulty');
    if (stored && CapCrash.DIFFICULTIES[stored]) {
        return CapCrash.DIFFICULTIES[stored];
    }
    return CapCrash.DIFFICULTIES.pro; // default to Pro
};

// Select random challenges for a game
CapCrash.getRandomChallenges = function(count) {
    count = count || 2;
    var shuffled = CapCrash.CHALLENGES.slice().sort(function() { return 0.5 - Math.random(); });
    return shuffled.slice(0, count);
};
