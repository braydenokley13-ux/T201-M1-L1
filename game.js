// Game State
let gameState = {
    players: [],
    totalPayroll: 0,
    totalQPts: 0,
    playerCount: 0,
    starsKept: 0,
    mleCount: 0,
    vetMinCount: 0,
    birdAllowance: 0,
    hasWon: false
};

// Initialize game on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    createParticles();
});

function initializeGame() {
    // Initialize player states
    gameState.players = playersData.map(player => ({
        ...player,
        move: 'Keep',
        useBirdRights: false
    }));

    renderPlayers();
    updateGameState();
}

function renderPlayers() {
    const rosterGrid = document.getElementById('rosterGrid');
    rosterGrid.innerHTML = '';

    gameState.players.forEach((player, index) => {
        const card = createPlayerCard(player, index);
        rosterGrid.appendChild(card);
    });
}

function createPlayerCard(player, index) {
    const card = document.createElement('div');
    card.className = `player-card ${player.isStar ? 'star' : ''}`;
    card.id = `player-${player.id}`;

    card.innerHTML = `
        <div class="player-header">
            <div class="player-number">${player.number}</div>
            ${player.isStar ? '<div class="star-badge">⭐</div>' : ''}
        </div>
        <div class="player-info">
            <div class="player-name">${player.name}</div>
            <div class="player-position">${player.position}</div>
        </div>
        <div class="player-stats">
            <div class="stat-item">
                <div class="stat-item-label">Salary</div>
                <div class="stat-item-value">$${formatSalary(player.salary)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item-label">Q-Points</div>
                <div class="stat-item-value qpts-value">${player.qpts}</div>
            </div>
        </div>
        <div class="player-controls">
            <div class="control-group">
                <label class="control-label">Move:</label>
                <select class="move-select" data-player-id="${player.id}" onchange="handleMoveChange(${player.id}, this.value)">
                    <option value="Keep">✓ Keep</option>
                    <option value="Cut">✗ Cut</option>
                    <option value="Trade">↔ Trade</option>
                    <option value="Re-sign">✍ Re-sign</option>
                </select>
            </div>
            ${player.birdEligible ? `
                <div class="control-group">
                    <div class="checkbox-group">
                        <input
                            type="checkbox"
                            id="bird-${player.id}"
                            class="bird-checkbox"
                            data-player-id="${player.id}"
                            onchange="handleBirdRightsChange(${player.id}, this.checked)"
                        />
                        <label for="bird-${player.id}" class="checkbox-label">
                            Bird Rights <span class="bird-icon">🦅</span>
                        </label>
                    </div>
                </div>
            ` : ''}
            ${player.vetMinEligible ? `
                <div class="vet-min-badge" style="font-size: 0.8em; color: #666; margin-top: 5px; text-align: center;">
                    ✓ Vet Min Eligible
                </div>
            ` : ''}
            ${player.mleEligible ? `
                <div class="mle-badge" style="font-size: 0.8em; color: #666; margin-top: 5px; text-align: center;">
                    ✓ MLE Eligible
                </div>
            ` : ''}
        </div>
    `;

    return card;
}

function handleMoveChange(playerId, move) {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    gameState.players[playerIndex].move = move;

    // Update card styling
    const card = document.getElementById(`player-${playerId}`);
    card.classList.remove('cut', 'traded');

    if (move === 'Cut') {
        card.classList.add('cut');
    } else if (move === 'Trade') {
        card.classList.add('traded');
    }

    // Add bounce animation
    card.style.animation = 'none';
    setTimeout(() => {
        card.style.animation = 'bounceIn 0.4s ease-out';
    }, 10);

    updateGameState();
}

function handleBirdRightsChange(playerId, useBirdRights) {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    gameState.players[playerIndex].useBirdRights = useBirdRights;
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
    let totalQPts = 0;
    let playerCount = 0;
    let starsKept = 0;
    let mleCount = 0;
    let vetMinCount = 0;
    let birdAllowance = 0;

    gameState.players.forEach(player => {
        const move = player.move;

        // Count players
        if (move === 'Keep' || move === 'Re-sign') {
            playerCount++;

            // Add salary
            if (player.useBirdRights && player.birdEligible && move === 'Re-sign') {
                // Bird Rights: doesn't count against cap but adds to total
                birdAllowance += player.salary;
            } else {
                totalPayroll += player.salary;
            }

            // Add quality points
            totalQPts += player.qpts;

            // Count stars
            if (player.isStar) {
                starsKept++;
            }

            // Track MLE usage (players signed with MLE don't count fully against cap)
            if (player.mleEligible && move === 'Re-sign' && !player.useBirdRights) {
                mleCount++;
            }

            // Track Vet Min usage
            if (player.vetMinEligible && player.salary <= 2000000) {
                vetMinCount++;
            }
        }
    });

    gameState.totalPayroll = totalPayroll;
    gameState.totalQPts = totalQPts;
    gameState.playerCount = playerCount;
    gameState.starsKept = starsKept;
    gameState.mleCount = mleCount;
    gameState.vetMinCount = vetMinCount;
    gameState.birdAllowance = birdAllowance;
}

function updateScoreboard() {
    const totalWithBird = gameState.totalPayroll + gameState.birdAllowance;

    document.getElementById('totalPayroll').textContent = `$${formatSalary(totalWithBird)}`;

    const capSpace = SALARY_CAP - gameState.totalPayroll;
    document.getElementById('capSpace').textContent = capSpace >= 0
        ? `$${formatSalary(capSpace)}`
        : `-$${formatSalary(Math.abs(capSpace))}`;

    // Animate quality points
    animateNumber('totalQPts', gameState.totalQPts);

    document.getElementById('playerCount').textContent = gameState.playerCount;
}

function updateProgressBars() {
    // Cap usage (allow over 100% with Bird Rights)
    const totalWithBird = gameState.totalPayroll + gameState.birdAllowance;
    const capPercentage = Math.min((totalWithBird / SALARY_CAP) * 100, 150);
    const capFill = document.getElementById('capProgress');
    capFill.style.width = `${capPercentage}%`;

    // Change color if over cap
    if (gameState.totalPayroll > SALARY_CAP && gameState.birdAllowance === 0) {
        capFill.style.background = 'linear-gradient(90deg, #F44336, #EF5350)';
    } else if (totalWithBird > SALARY_CAP) {
        capFill.style.background = 'linear-gradient(90deg, #FF9800, #FFB74D)';
    } else {
        capFill.style.background = 'linear-gradient(90deg, #006BB6, #4a9fd8)';
    }

    document.getElementById('capPercentage').textContent = `${Math.round(capPercentage)}%`;

    // Quality points
    const qptsPercentage = Math.min((gameState.totalQPts / QUALITY_POINTS_MINIMUM) * 100, 100);
    const qptsFill = document.getElementById('qptsProgress');
    qptsFill.style.width = `${qptsPercentage}%`;
    document.getElementById('qptsPercentage').textContent = `${gameState.totalQPts}/64`;
}

function validateRules() {
    const rules = {
        rosterSize: gameState.playerCount >= 12 && gameState.playerCount <= 15,
        underCap: gameState.totalPayroll <= SALARY_CAP || gameState.birdAllowance > 0,
        starsKept: gameState.starsKept === 3,
        qualityPoints: gameState.totalQPts >= QUALITY_POINTS_MINIMUM,
        mleOk: gameState.mleCount <= 3, // Max 3 MLE signings
        vetMinOk: gameState.vetMinCount <= 5 // Max 5 vet min players
    };

    // Update rule UI
    updateRuleUI('ruleRoster', rules.rosterSize);
    updateRuleUI('ruleCap', rules.underCap);
    updateRuleUI('ruleStars', rules.starsKept);
    updateRuleUI('ruleQPts', rules.qualityPoints);
    updateRuleUI('ruleMLE', rules.mleOk);
    updateRuleUI('ruleVetMin', rules.vetMinOk);

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
        text.textContent = 'Perfect! You built a championship roster!';
    } else {
        banner.classList.add('fail');
        icon.textContent = '⚠️';
        text.textContent = 'Keep working! Check the rules on the right.';
    }
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.add('show');
    createConfetti();
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
