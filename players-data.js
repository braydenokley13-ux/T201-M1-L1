// Knicks 2025-2026 Roster Data
const SALARY_CAP = 120000000; // $120M salary cap
const QUALITY_POINTS_MINIMUM = 85; // Minimum quality points needed to win (raised for new scale)

const playersData = [
    // CURRENT KNICKS ROSTER (2025-26)
    {
        id: 1,
        name: 'Jalen Brunson',
        number: 11,
        position: 'Point Guard',
        salary: 25000000,
        qpts: 18,
        isStar: true,
        birdEligible: true,
        vetMinEligible: false,
        mleEligible: false,
        isKnick: true
    },
    {
        id: 2,
        name: 'Karl-Anthony Towns',
        number: 32,
        position: 'Center',
        salary: 49200000,
        qpts: 18,
        isStar: true,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: false,
        isKnick: true
    },
    {
        id: 3,
        name: 'Mikal Bridges',
        number: 25,
        position: 'Small Forward',
        salary: 23300000,
        qpts: 16,
        isStar: true,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: false,
        isKnick: true
    },
    {
        id: 4,
        name: 'OG Anunoby',
        number: 8,
        position: 'Power Forward',
        salary: 36600000,
        qpts: 13,
        isStar: false,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: false,
        isKnick: true
    },
    {
        id: 5,
        name: 'Josh Hart',
        number: 3,
        position: 'Shooting Guard',
        salary: 18100000,
        qpts: 12,
        isStar: false,
        birdEligible: true,
        vetMinEligible: false,
        mleEligible: false,
        isKnick: true
    },
    {
        id: 6,
        name: 'Mitchell Robinson',
        number: 23,
        position: 'Center',
        salary: 14300000,
        qpts: 10,
        isStar: false,
        birdEligible: true,
        vetMinEligible: false,
        mleEligible: false,
        isKnick: true
    },
    {
        id: 7,
        name: 'Miles McBride',
        number: 2,
        position: 'Point Guard',
        salary: 13000000,
        qpts: 9,
        isStar: false,
        birdEligible: true,
        vetMinEligible: false,
        mleEligible: true,
        isKnick: true
    },
    {
        id: 8,
        name: 'Precious Achiuwa',
        number: 5,
        position: 'Power Forward',
        salary: 6000000,
        qpts: 7,
        isStar: false,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: true,
        isKnick: true
    },
    {
        id: 9,
        name: 'Cameron Payne',
        number: 1,
        position: 'Point Guard',
        salary: 3100000,
        qpts: 4,
        isStar: false,
        birdEligible: false,
        vetMinEligible: true,
        mleEligible: true,
        isKnick: true
    },
    {
        id: 10,
        name: 'Jericho Sims',
        number: 20,
        position: 'Center',
        salary: 2000000,
        qpts: 3,
        isStar: false,
        birdEligible: true,
        vetMinEligible: true,
        mleEligible: true,
        isKnick: true
    },
    {
        id: 11,
        name: 'Tyler Kolek',
        number: 13,
        position: 'Point Guard',
        salary: 2000000,
        qpts: 2,
        isStar: false,
        birdEligible: false,
        vetMinEligible: true,
        mleEligible: true,
        isKnick: true
    },
    {
        id: 12,
        name: 'Pacome Dadiet',
        number: 4,
        position: 'Small Forward',
        salary: 3100000,
        qpts: 2,
        isStar: false,
        birdEligible: false,
        vetMinEligible: true,
        mleEligible: true,
        isKnick: true
    },

    // FREE AGENTS - BIG NAMES (Expensive but elite)
    {
        id: 101,
        name: 'LeBron James',
        number: 23,
        position: 'Small Forward',
        salary: 48000000,
        qpts: 20,
        isStar: true,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: false,
        isKnick: false
    },
    {
        id: 102,
        name: 'Stephen Curry',
        number: 30,
        position: 'Point Guard',
        salary: 51000000,
        qpts: 20,
        isStar: true,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: false,
        isKnick: false
    },
    {
        id: 103,
        name: 'Jimmy Butler',
        number: 22,
        position: 'Shooting Guard',
        salary: 48000000,
        qpts: 17,
        isStar: true,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: false,
        isKnick: false
    },
    {
        id: 104,
        name: 'Damian Lillard',
        number: 0,
        position: 'Point Guard',
        salary: 45000000,
        qpts: 17,
        isStar: true,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: false,
        isKnick: false
    },

    // FREE AGENTS - SOLID ROLE PLAYERS
    {
        id: 105,
        name: 'Klay Thompson',
        number: 11,
        position: 'Shooting Guard',
        salary: 15000000,
        qpts: 12,
        isStar: false,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: true,
        isKnick: false
    },
    {
        id: 106,
        name: 'DeMar DeRozan',
        number: 10,
        position: 'Small Forward',
        salary: 25000000,
        qpts: 14,
        isStar: false,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: false,
        isKnick: false
    },
    {
        id: 107,
        name: 'Brook Lopez',
        number: 11,
        position: 'Center',
        salary: 23000000,
        qpts: 11,
        isStar: false,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: true,
        isKnick: false
    },
    {
        id: 108,
        name: 'Tobias Harris',
        number: 12,
        position: 'Power Forward',
        salary: 8000000,
        qpts: 9,
        isStar: false,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: true,
        isKnick: false
    },

    // FREE AGENTS - CHEAP VETERANS (Vet Min Eligible)
    {
        id: 109,
        name: 'Kyle Lowry',
        number: 7,
        position: 'Point Guard',
        salary: 3000000,
        qpts: 4,
        isStar: false,
        birdEligible: false,
        vetMinEligible: true,
        mleEligible: true,
        isKnick: false
    },
    {
        id: 110,
        name: 'Carmelo Anthony',
        number: 7,
        position: 'Power Forward',
        salary: 2500000,
        qpts: 3,
        isStar: false,
        birdEligible: false,
        vetMinEligible: true,
        mleEligible: true,
        isKnick: false
    },
    {
        id: 111,
        name: 'Derrick Rose',
        number: 4,
        position: 'Point Guard',
        salary: 2000000,
        qpts: 3,
        isStar: false,
        birdEligible: false,
        vetMinEligible: true,
        mleEligible: true,
        isKnick: false
    },
    {
        id: 112,
        name: 'Blake Griffin',
        number: 23,
        position: 'Power Forward',
        salary: 2000000,
        qpts: 2,
        isStar: false,
        birdEligible: false,
        vetMinEligible: true,
        mleEligible: true,
        isKnick: false
    },
    {
        id: 113,
        name: 'Dwight Howard',
        number: 12,
        position: 'Center',
        salary: 2000000,
        qpts: 2,
        isStar: false,
        birdEligible: false,
        vetMinEligible: true,
        mleEligible: true,
        isKnick: false
    },

    // FREE AGENTS - YOUNG TALENT / BUDGET OPTIONS
    {
        id: 114,
        name: 'Lonnie Walker IV',
        number: 1,
        position: 'Shooting Guard',
        salary: 4000000,
        qpts: 6,
        isStar: false,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: true,
        isKnick: false
    },
    {
        id: 115,
        name: 'Markieff Morris',
        number: 8,
        position: 'Power Forward',
        salary: 3000000,
        qpts: 4,
        isStar: false,
        birdEligible: false,
        vetMinEligible: true,
        mleEligible: true,
        isKnick: false
    },
    {
        id: 116,
        name: 'Dennis Schroder',
        number: 17,
        position: 'Point Guard',
        salary: 13000000,
        qpts: 9,
        isStar: false,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: true,
        isKnick: false
    }
];

// Export for use in game.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { playersData, SALARY_CAP, QUALITY_POINTS_MINIMUM };
}
