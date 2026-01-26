// Knicks 2024-2025 Roster Data
const SALARY_CAP = 120000000; // $120M salary cap
const QUALITY_POINTS_MINIMUM = 50; // Minimum quality points needed to win (lowered for better balance)

const playersData = [
    {
        id: 1,
        name: 'Jalen Brunson',
        number: 11,
        position: 'Point Guard',
        salary: 25000000,
        qpts: 10,
        isStar: true,
        birdEligible: true,
        vetMinEligible: false,
        mleEligible: false
    },
    {
        id: 2,
        name: 'Karl-Anthony Towns',
        number: 32,
        position: 'Center',
        salary: 49200000,
        qpts: 10,
        isStar: true,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: false
    },
    {
        id: 3,
        name: 'Mikal Bridges',
        number: 25,
        position: 'Small Forward',
        salary: 23300000,
        qpts: 10,
        isStar: true,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: false
    },
    {
        id: 4,
        name: 'OG Anunoby',
        number: 8,
        position: 'Power Forward',
        salary: 36600000,
        qpts: 8,
        isStar: false,
        birdEligible: false,
        vetMinEligible: false,
        mleEligible: false
    },
    {
        id: 5,
        name: 'Josh Hart',
        number: 3,
        position: 'Shooting Guard',
        salary: 18100000,
        qpts: 7,
        isStar: false,
        birdEligible: true,
        vetMinEligible: false,
        mleEligible: false
    },
    {
        id: 6,
        name: 'Mitchell Robinson',
        number: 23,
        position: 'Center',
        salary: 14300000,
        qpts: 6,
        isStar: false,
        birdEligible: true,
        vetMinEligible: false,
        mleEligible: false
    },
    {
        id: 7,
        name: 'Miles McBride',
        number: 2,
        position: 'Point Guard',
        salary: 13000000,
        qpts: 6,
        isStar: false,
        birdEligible: true,
        vetMinEligible: false,
        mleEligible: true
    },
    {
        id: 8,
        name: 'Precious Achiuwa',
        number: 5,
        position: 'Power Forward',
        salary: 6000000,
        qpts: 5,
        isStar: false,
        birdEligible: false,
        vetMinEligible: false,  // >= 5 qpts, NOT eligible
        mleEligible: true
    },
    {
        id: 9,
        name: 'Cam Payne',
        number: 1,
        position: 'Point Guard',
        salary: 3100000,
        qpts: 4,
        isStar: false,
        birdEligible: false,
        vetMinEligible: true,  // < 5 qpts
        mleEligible: true
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
        vetMinEligible: true,  // < 5 qpts
        mleEligible: true
    },
    {
        id: 11,
        name: 'Tyler Kolek',
        number: 13,
        position: 'Point Guard',
        salary: 2000000,
        qpts: 3,
        isStar: false,
        birdEligible: false,
        vetMinEligible: true,  // < 5 qpts
        mleEligible: true
    },
    {
        id: 12,
        name: 'Pacome Dadiet',
        number: 4,
        position: 'Small Forward',
        salary: 3100000,
        qpts: 3,
        isStar: false,
        birdEligible: false,
        vetMinEligible: true,  // < 5 qpts
        mleEligible: true
    }
];

// Export for use in game.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { playersData, SALARY_CAP, QUALITY_POINTS_MINIMUM };
}
