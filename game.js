// Game State
let gameState = {
    players: [],
    totalPayroll: 0,
    payrollWithoutBirdRights: 0,  // Payroll excluding Bird Rights players (for cap validation)
    totalQPts: 0,
    playerCount: 0,
    starsKept: 0,
    mleUsed: false,
    mlePlayerId: null,
    vetMinCount: 0,
    hasWon: false
};

// Initialize game on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    createParticles();
});

function initializeGame() {
    // Initialize player states - everyone starts CUT
    gameState.players = playersData.map(player => ({
        ...player,
        status: 'Cut',
        useMLE: false,
        useVetMin: false
    }));

    renderPlayers();
    updateGameState();
}

function renderPlayers() {
    const rosterGrid = document.getElementById('rosterGrid');
    rosterGrid.innerHTML = '';

    // Separate Knicks and Free Agents
    const knicks = gameState.players.filter(p => p.isKnick);
    const freeAgents = gameState.players.filter(p => !p.isKnick);

    // Add Knicks section
    const knicksSection = document.createElement('div');
    knicksSection.className = 'player-section';
    knicksSection.innerHTML = '<h2 class="section-title">🏀 KNICKS ROSTER</h2>';
    rosterGrid.appendChild(knicksSection);

    knicks.forEach((player, index) => {
        const card = createPlayerCard(player, index);
        rosterGrid.appendChild(card);
    });

    // Add Free Agents section
    const freeAgentsSection = document.createElement('div');
    freeAgentsSection.className = 'player-section';
    freeAgentsSection.innerHTML = '<h2 class="section-title">⭐ FREE AGENTS</h2>';
    rosterGrid.appendChild(freeAgentsSection);

    freeAgents.forEach((player, index) => {
        const card = createPlayerCard(player, knicks.length + index);
        rosterGrid.appendChild(card);
    });
}

function createPlayerCard(player, index) {
    const card = document.createElement('div');
    const statusClass = player.status === 'Cut' ? 'cut' : player.status === 'Trade' ? 'traded' : '';
    card.className = `player-card ${player.isStar ? 'star' : ''} ${statusClass} ${!player.isKnick ? 'free-agent' : ''}`;
    card.id = `player-${player.id}`;

    // Calculate effective salary for display
    let displaySalary = player.salary;
    let salaryNote = '';

    if (player.status === 'Sign') {
        if (player.useMLE) {
            displaySalary = player.salary * 0.5;
            salaryNote = ' <span class="salary-note">(MLE: 50% off)</span>';
        } else if (player.useVetMin) {
            displaySalary = 2000000;
            salaryNote = ' <span class="salary-note">(Vet Min)</span>';
        }
    }

    card.innerHTML = `
        <div class="player-header">
            <div class="player-number">${player.number}</div>
            ${player.isStar ? '<div class="star-badge">⭐</div>' : ''}
            ${player.status === 'Cut' ? '<div class="status-badge cut-badge">AVAILABLE</div>' :
              player.status === 'Trade' ? '<div class="status-badge trade-badge">TRADED</div>' :
              '<div class="status-badge signed-badge">SIGNED</div>'}
        </div>
        <div class="player-info">
            <div class="player-name">${player.name}</div>
            <div class="player-position">${player.position}</div>
        </div>
        <div class="player-stats">
            <div class="stat-item">
                <div class="stat-item-label">Salary</div>
                <div class="stat-item-value">$${formatSalary(displaySalary)}${salaryNote}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item-label">Q-Points</div>
                <div class="stat-item-value qpts-value">${player.qpts}</div>
            </div>
        </div>
        <div class="player-controls">
            <div class="control-group">
                <select class="move-select" data-player-id="${player.id}" onchange="handleMoveChange(${player.id}, this.value)">
                    <option value="Cut" ${player.status === 'Cut' ? 'selected' : ''}>✗ CUT</option>
                    <option value="Sign" ${player.status === 'Sign' ? 'selected' : ''}>✓ SIGN</option>
                    ${player.isKnick ? `<option value="Trade" ${player.status === 'Trade' ? 'selected' : ''}>↔ TRADE</option>` : ''}
                </select>
            </div>
            <div class="player-badges">
                ${player.birdEligible && player.status === 'Sign' ? '<div class="info-badge bird-badge" title="Has Bird Rights - can be signed over cap">🦅 Bird Rights</div>' : ''}
                ${player.mleEligible && player.status === 'Sign' ? `
                    <div class="checkbox-group mle-group">
                        <input
                            type="checkbox"
                            id="mle-${player.id}"
                            class="exception-checkbox"
                            data-player-id="${player.id}"
                            ${player.useMLE ? 'checked' : ''}
                            ${gameState.mleUsed && !player.useMLE ? 'disabled' : ''}
                            onchange="handleMLEChange(${player.id}, this.checked)"
                        />
                        <label for="mle-${player.id}" class="checkbox-label ${gameState.mleUsed && !player.useMLE ? 'disabled' : ''}">
                            💰 Use MLE (50% off)
                        </label>
                    </div>
                ` : ''}
                ${player.vetMinEligible && player.status === 'Sign' ? `
                    <div class="checkbox-group vet-group">
                        <input
                            type="checkbox"
                            id="vet-${player.id}"
                            class="exception-checkbox"
                            data-player-id="${player.id}"
                            ${player.useVetMin ? 'checked' : ''}
                            ${gameState.vetMinCount >= 3 && !player.useVetMin ? 'disabled' : ''}
                            onchange="handleVetMinChange(${player.id}, this.checked)"
                        />
                        <label for="vet-${player.id}" class="checkbox-label ${gameState.vetMinCount >= 3 && !player.useVetMin ? 'disabled' : ''}">
                            📉 Vet Min ($2M)
                        </label>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    return card;
}

function handleMoveChange(playerId, status) {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    gameState.players[playerIndex].status = status;

    // If cutting or trading a player, reset their exceptions
    if (status === 'Cut' || status === 'Trade') {
        gameState.players[playerIndex].useMLE = false;
        gameState.players[playerIndex].useVetMin = false;
    }

    // Re-render to update the entire view
    renderPlayers();
    updateGameState();
}

function handleMLEChange(playerId, checked) {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    // If checking and MLE already used by another player, prevent it
    if (checked && gameState.mleUsed && gameState.mlePlayerId !== playerId) {
        alert('MLE is already in use! You can only use it on ONE player.');
        renderPlayers(); // Re-render to uncheck the box in UI
        return;
    }

    // Can't use both MLE and Vet Min
    if (checked && gameState.players[playerIndex].useVetMin) {
        gameState.players[playerIndex].useVetMin = false;
    }

    gameState.players[playerIndex].useMLE = checked;

    renderPlayers();
    updateGameState();
}

function handleVetMinChange(playerId, checked) {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    // Check vet min limit - prevent adding more than 3
    if (checked && gameState.vetMinCount >= 3) {
        alert('You can only use Veteran Minimum on 3 players!');
        renderPlayers(); // Re-render to uncheck the box in UI
        return;
    }

    // Can't use both MLE and Vet Min
    if (checked && gameState.players[playerIndex].useMLE) {
        gameState.players[playerIndex].useMLE = false;
    }

    gameState.players[playerIndex].useVetMin = checked;

    renderPlayers();
    updateGameState();
}

function updateGameState() {
    calculateTotals();
    updateScoreboard();
    updateProgressBars();
    validateRules();
}

function calculateTotals() {
    let totalPayroll = 0;
    let payrollWithoutBirdRights = 0;  // Track payroll excluding Bird Rights players
    let totalQPts = 0;
    let playerCount = 0;
    let starsKept = 0;
    let mleUsed = false;
    let mlePlayerId = null;
    let vetMinCount = 0;

    gameState.players.forEach(player => {
        // Only count signed players
        if (player.status === 'Sign') {
            playerCount++;

            // Calculate salary based on exceptions
            let effectiveSalary = player.salary;

            if (player.useMLE) {
                effectiveSalary = player.salary * 0.5;
                mleUsed = true;
                mlePlayerId = player.id;
            } else if (player.useVetMin) {
                effectiveSalary = 2000000;
                vetMinCount++;
            }

            totalPayroll += effectiveSalary;

            // Track payroll without Bird Rights players (for cap validation)
            if (!player.birdEligible) {
                payrollWithoutBirdRights += effectiveSalary;
            }

            // Add quality points
            totalQPts += player.qpts;

            // Count stars
            if (player.isStar) {
                starsKept++;
            }
        }
    });

    gameState.totalPayroll = totalPayroll;
    gameState.payrollWithoutBirdRights = payrollWithoutBirdRights;
    gameState.totalQPts = totalQPts;
    gameState.playerCount = playerCount;
    gameState.starsKept = starsKept;
    gameState.mleUsed = mleUsed;
    gameState.mlePlayerId = mlePlayerId;
    gameState.vetMinCount = vetMinCount;
}

function updateScoreboard() {
    document.getElementById('totalPayroll').textContent = `$${formatSalary(gameState.totalPayroll)}`;

    const capSpace = SALARY_CAP - gameState.totalPayroll;
    document.getElementById('capSpace').textContent = capSpace >= 0
        ? `$${formatSalary(capSpace)}`
        : `-$${formatSalary(Math.abs(capSpace))}`;

    // Animate quality points
    animateNumber('totalQPts', gameState.totalQPts);

    document.getElementById('playerCount').textContent = gameState.playerCount;
}

function updateProgressBars() {
    // Cap usage
    const capPercentage = Math.min((gameState.totalPayroll / SALARY_CAP) * 100, 150);
    const capFill = document.getElementById('capProgress');
    capFill.style.width = `${capPercentage}%`;

    // Change color based on cap status
    if (gameState.totalPayroll > SALARY_CAP) {
        capFill.style.background = 'linear-gradient(90deg, #F44336, #EF5350)';
    } else if (capPercentage > 90) {
        capFill.style.background = 'linear-gradient(90deg, #FF9800, #FFB74D)';
    } else {
        capFill.style.background = 'linear-gradient(90deg, #006BB6, #4a9fd8)';
    }

    document.getElementById('capPercentage').textContent = `${Math.round(capPercentage)}%`;

    // Quality points
    const qptsPercentage = Math.min((gameState.totalQPts / QUALITY_POINTS_MINIMUM) * 100, 100);
    const qptsFill = document.getElementById('qptsProgress');
    qptsFill.style.width = `${qptsPercentage}%`;
    document.getElementById('qptsPercentage').textContent = `${gameState.totalQPts}/${QUALITY_POINTS_MINIMUM}`;
}

function validateRules() {
    // Bird Rights logic: You can go over cap if non-Bird Rights players are under cap
    // This allows signing Bird Rights players even when over the cap
    const underCapWithBirdRights = gameState.payrollWithoutBirdRights <= SALARY_CAP;

    const rules = {
        rosterSize: gameState.playerCount >= 10 && gameState.playerCount <= 13,
        underCap: underCapWithBirdRights,  // Allow going over cap if only due to Bird Rights players
        starsKept: gameState.starsKept >= 2,  // Changed to at least 2 stars
        qualityPoints: gameState.totalQPts >= QUALITY_POINTS_MINIMUM
    };

    // Update rule UI
    updateRuleUI('ruleRoster', rules.rosterSize);
    updateRuleUI('ruleCap', rules.underCap);
    updateRuleUI('ruleStars', rules.starsKept);
    updateRuleUI('ruleQPts', rules.qualityPoints);

    // Check if all rules pass
    const allRulesPass = Object.values(rules).every(rule => rule === true);

    updateStatusBanner(allRulesPass);

    // Show success modal if won for the first time
    if (allRulesPass && !gameState.hasWon) {
        gameState.hasWon = true;
        setTimeout(() => showSuccessModal(), 500);
    } else if (!allRulesPass) {
        gameState.hasWon = false;
    }
}

function updateRuleUI(ruleId, passed) {
    const ruleElement = document.getElementById(ruleId);
    const icon = ruleElement.querySelector('.rule-icon');

    ruleElement.classList.remove('pass', 'fail');

    if (passed) {
        ruleElement.classList.add('pass');
        icon.textContent = '✓';
    } else {
        ruleElement.classList.add('fail');
        icon.textContent = '✗';
    }
}

function updateStatusBanner(success) {
    const banner = document.getElementById('statusBanner');
    const icon = document.getElementById('statusIcon');
    const text = document.getElementById('statusText');

    banner.classList.remove('success', 'fail');

    if (success) {
        banner.classList.add('success');
        icon.textContent = '🎉';
        text.textContent = 'Perfect! You rebuilt the championship roster!';
    } else {
        banner.classList.add('fail');
        icon.textContent = '⚠️';
        text.textContent = 'Keep building! Check the rules on the right.';
    }
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');

    // Calculate season simulation
    const seasonResults = simulateSeason();

    // Update modal content with simulation results
    document.getElementById('seasonRecord').textContent = seasonResults.record;
    document.getElementById('playoffResult').textContent = seasonResults.playoff;
    document.getElementById('tierName').textContent = seasonResults.tier;
    document.getElementById('claimCode').textContent = seasonResults.claimCode;
    document.getElementById('tierDescription').textContent = seasonResults.description;

    // Update stats
    document.getElementById('finalQPts').textContent = gameState.totalQPts + ' pts';
    const capEfficiency = ((SALARY_CAP - gameState.totalPayroll) / SALARY_CAP * 100).toFixed(1);
    document.getElementById('capEfficiency').textContent = capEfficiency + '% saved';

    // Add tier class for styling
    const modalContent = document.querySelector('.modal-content');
    modalContent.className = 'modal-content tier-' + seasonResults.tier.toLowerCase().replace(/\s+/g, '-');

    modal.classList.add('show');
    createConfetti();
}

function simulateSeason() {
    const qpts = gameState.totalQPts;
    const capUsed = gameState.totalPayroll;
    const capEfficiency = ((SALARY_CAP - capUsed) / SALARY_CAP) * 100; // % of cap saved
    const stars = gameState.starsKept;

    // Check for elite players
    const hasLeBron = gameState.players.find(p => p.id === 101 && p.status === 'Sign');
    const hasCurry = gameState.players.find(p => p.id === 102 && p.status === 'Sign');
    const hasEliteFA = hasLeBron || hasCurry;

    // Calculate tier based on quality points and cap efficiency
    let tier, record, playoff, claimCode, description;

    if (qpts >= 95 && capEfficiency > 15) {
        // DYNASTY TIER
        tier = 'Dynasty';
        record = '67-15';
        playoff = '🏆 NBA CHAMPIONS! Finals MVP performance!';
        claimCode = 'DYNASTY2026';
        description = 'Dominant season! Elite roster with incredible cap management!';
    } else if (qpts >= 90 || (qpts >= 85 && capEfficiency > 20)) {
        // CHAMPIONSHIP TIER
        tier = 'Championship';
        record = '62-20';
        playoff = '🏆 NBA CHAMPIONS! Hard-fought Finals victory!';
        claimCode = 'CHAMPS2026';
        description = 'Championship season! Outstanding roster construction!';
    } else if (qpts >= 85 && stars >= 3) {
        // SUPERTEAM TIER
        tier = 'Superteam';
        record = '58-24';
        playoff = '🥈 NBA Finals! Lost in 7 games but great run!';
        claimCode = 'FINALS2026';
        description = 'Superstar-loaded roster! Made it to the Finals!';
    } else if (qpts >= 85 || (qpts >= 80 && capEfficiency > 25)) {
        // CONTENDER TIER
        tier = 'Contender';
        record = '56-26';
        playoff = '🥉 Conference Finals! Lost in 6 games.';
        claimCode = 'CONTEND2026';
        description = 'Strong contender! Great balance of talent and value!';
    } else if (qpts >= 80) {
        // PLAYOFF TEAM TIER
        tier = 'Playoff Team';
        record = '51-31';
        playoff = '🏀 Second Round! Lost in 5 games.';
        claimCode = 'PLAYOFFS2026';
        description = 'Solid playoff team! Good foundation to build on.';
    } else {
        // SCRAPPY TEAM TIER
        tier = 'Scrappy Team';
        record = '46-36';
        playoff = '🎯 First Round! Lost in 6 games but made it!';
        claimCode = 'SCRAPPY2026';
        description = 'Made the playoffs with smart cap management!';
    }

    // Add bonus for elite FA signings
    if (hasEliteFA && tier === 'Championship') {
        tier = 'All-Star Dynasty';
        claimCode = 'ALLSTAR2026';
        description = 'Legendary roster with hall of fame talent!';
    }

    return { tier, record, playoff, claimCode, description };
}

function createConfetti() {
    const container = document.getElementById('confetti');
    container.innerHTML = '';

    const colors = ['#F58426', '#006BB6', '#BEC0C2', '#FFD700'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.opacity = Math.random();
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.animation = `confettiFall ${2 + Math.random() * 3}s linear infinite`;
        confetti.style.animationDelay = Math.random() * 2 + 's';

        container.appendChild(confetti);
    }

    // Add confetti animation
    if (!document.querySelector('#confettiStyle')) {
        const style = document.createElement('style');
        style.id = 'confettiStyle';
        style.textContent = `
            @keyframes confettiFall {
                to {
                    top: 100%;
                    transform: translateY(100%) rotate(720deg);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function createParticles() {
    const container = document.getElementById('particles');

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.backgroundColor = i % 2 === 0 ? '#F58426' : '#006BB6';
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animation = `float ${5 + Math.random() * 10}s ease-in-out infinite`;
        particle.style.animationDelay = Math.random() * 5 + 's';
        particle.style.opacity = '0.6';

        container.appendChild(particle);
    }

    // Add float animation
    if (!document.querySelector('#particleStyle')) {
        const style = document.createElement('style');
        style.id = 'particleStyle';
        style.textContent = `
            @keyframes float {
                0%, 100% {
                    transform: translateY(0) translateX(0);
                }
                25% {
                    transform: translateY(-20px) translateX(10px);
                }
                50% {
                    transform: translateY(-10px) translateX(-10px);
                }
                75% {
                    transform: translateY(-30px) translateX(5px);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const currentValue = parseInt(element.textContent) || 0;
    const difference = targetValue - currentValue;
    const duration = 500; // ms
    const steps = 20;
    const stepValue = difference / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;

    const interval = setInterval(() => {
        currentStep++;
        const newValue = Math.round(currentValue + (stepValue * currentStep));
        element.textContent = newValue;

        if (currentStep >= steps) {
            element.textContent = targetValue;
            clearInterval(interval);
        }
    }, stepDuration);
}

function formatSalary(amount) {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M';
    }
    return amount.toLocaleString();
}

// Reset button handler
document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset the game?')) {
        initializeGame();
    }
});

// Close modal handler
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('successModal').classList.remove('show');
});

// Close modal on outside click
document.getElementById('successModal').addEventListener('click', (e) => {
    if (e.target.id === 'successModal') {
        document.getElementById('successModal').classList.remove('show');
    }
});
