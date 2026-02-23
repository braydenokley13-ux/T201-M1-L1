// === GAME STATE ===
let gameState = {
    players: [],
    tradeReturns: [],           // Players acquired via trade
    pendingTradePlayerId: null, // Player currently being traded (waiting for return selection)
    totalPayroll: 0,
    payrollWithoutBirdRights: 0,
    totalQPts: 0,
    playerCount: 0,
    starsKept: 0,
    positionCounts: { G: 0, F: 0, C: 0 },
    mleUsed: false,
    mlePlayerId: null,
    vetMinCount: 0,
    hasWon: false
};

// Tutorial step tracker
let tutorialStep = 0;
const TUTORIAL_STEPS = [
    {
        target: '#capProgress',
        title: 'Your Salary Cap',
        text: 'Stay under $120M. The bar turns orange then red as you approach the limit. Bird Rights players are the one exception!'
    },
    {
        target: '#player-1',
        title: 'Star Players',
        text: 'Jalen Brunson is one of your 3 required stars. You must keep at least 2 of: Brunson, Towns, or Bridges to win.'
    },
    {
        target: '.info-box',
        title: 'Cap Exceptions',
        text: '🦅 Bird Rights: re-sign your own players even over cap. 💰 MLE: 50% off one player. 📉 Vet Min: $2M each for up to 3 low-impact players.'
    },
    {
        target: '#rulePosition',
        title: 'Lineup Balance (New in V2!)',
        text: 'Build a complete team — you need at least 2 Guards, 2 Forwards, and 1 Center. You can\'t win with all guards!'
    },
    {
        target: '#qptsProgress',
        title: 'Quality Points Goal',
        text: 'Reach 85 Quality Points to win. Higher Q-Pts = better season simulation. Aim for 90+ for a shot at the championship!'
    }
];

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    createParticles();
    decodeBuildFromURL();
    initTutorial();
});

function initializeGame() {
    gameState.tradeReturns = [];
    gameState.pendingTradePlayerId = null;
    gameState.hasWon = false;

    gameState.players = playersData.map(player => ({
        ...player,
        status: 'Cut',
        useMLE: false,
        useVetMin: false
    }));

    loadFromStorage();
    renderPlayers();
    updateGameState();
}

// === RENDER ===
function renderPlayers() {
    const rosterGrid = document.getElementById('rosterGrid');
    rosterGrid.innerHTML = '';

    const knicks = gameState.players.filter(p => p.isKnick);
    const freeAgents = gameState.players.filter(p => !p.isKnick);
    const tradeReturnIds = gameState.tradeReturns.map(p => p.id);

    // KNICKS ROSTER section
    const knicksSection = document.createElement('div');
    knicksSection.className = 'player-section';
    knicksSection.innerHTML = '<h2 class="section-title">🏀 KNICKS ROSTER</h2>';
    rosterGrid.appendChild(knicksSection);

    knicks.forEach((player, index) => {
        rosterGrid.appendChild(createPlayerCard(player, index, false));
    });

    // ACQUIRED VIA TRADE section (if any trades made)
    if (gameState.tradeReturns.length > 0) {
        const acquiredSection = document.createElement('div');
        acquiredSection.className = 'player-section';
        acquiredSection.innerHTML = '<h2 class="section-title">↔ ACQUIRED VIA TRADE</h2>';
        rosterGrid.appendChild(acquiredSection);

        gameState.tradeReturns.forEach((player, index) => {
            rosterGrid.appendChild(createPlayerCard(player, knicks.length + index, true));
        });
    }

    // FREE AGENTS section (exclude any already in tradeReturns)
    const freeAgentsSection = document.createElement('div');
    freeAgentsSection.className = 'player-section';
    freeAgentsSection.innerHTML = '<h2 class="section-title">⭐ FREE AGENTS</h2>';
    rosterGrid.appendChild(freeAgentsSection);

    const availableFAs = freeAgents.filter(p => !tradeReturnIds.includes(p.id));
    availableFAs.forEach((player, index) => {
        rosterGrid.appendChild(createPlayerCard(player, knicks.length + gameState.tradeReturns.length + index, false));
    });
}

function createPlayerCard(player, index, isTradeReturn) {
    const card = document.createElement('div');
    const statusClass = player.status === 'Cut' ? 'cut' : player.status === 'Trade' ? 'traded' : '';
    const isFA = !player.isKnick && !isTradeReturn;
    card.className = `player-card ${player.isStar ? 'star' : ''} ${statusClass} ${isFA ? 'free-agent' : ''} ${isTradeReturn ? 'trade-return' : ''}`;
    card.id = `player-${player.id}`;

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

    // Only original Knicks (not trade returns) can be traded
    const showTradeOption = player.isKnick && !isTradeReturn;

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
                <select class="move-select" data-player-id="${player.id}"
                    onchange="handleMoveChange(${player.id}, this.value, ${isTradeReturn ? 'true' : 'false'})">
                    <option value="Cut" ${player.status === 'Cut' ? 'selected' : ''}>✗ CUT</option>
                    <option value="Sign" ${player.status === 'Sign' ? 'selected' : ''}>✓ SIGN</option>
                    ${showTradeOption ? `<option value="Trade" ${player.status === 'Trade' ? 'selected' : ''}>↔ TRADE</option>` : ''}
                </select>
            </div>
            <div class="player-badges">
                ${player.birdEligible && player.status === 'Sign' ? '<div class="info-badge bird-badge" title="Has Bird Rights - can be signed over cap">🦅 Bird Rights</div>' : ''}
                ${player.mleEligible && player.status === 'Sign' ? `
                    <div class="checkbox-group mle-group">
                        <input type="checkbox" id="mle-${player.id}" class="exception-checkbox"
                            data-player-id="${player.id}"
                            ${player.useMLE ? 'checked' : ''}
                            ${gameState.mleUsed && !player.useMLE ? 'disabled' : ''}
                            onchange="handleMLEChange(${player.id}, this.checked)" />
                        <label for="mle-${player.id}" class="checkbox-label ${gameState.mleUsed && !player.useMLE ? 'disabled' : ''}">
                            💰 Use MLE (50% off)
                        </label>
                    </div>
                ` : ''}
                ${player.vetMinEligible && player.status === 'Sign' ? `
                    <div class="checkbox-group vet-group">
                        <input type="checkbox" id="vet-${player.id}" class="exception-checkbox"
                            data-player-id="${player.id}"
                            ${player.useVetMin ? 'checked' : ''}
                            ${gameState.vetMinCount >= 3 && !player.useVetMin ? 'disabled' : ''}
                            onchange="handleVetMinChange(${player.id}, this.checked)" />
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

// === HANDLERS ===
function handleMoveChange(playerId, status, isTradeReturn) {
    // If a Knick is being set to Trade, open the trade modal instead of applying immediately
    if (status === 'Trade' && !isTradeReturn) {
        const player = gameState.players.find(p => p.id === playerId);
        if (player && player.isKnick) {
            gameState.pendingTradePlayerId = playerId;
            showTradeModal(playerId);
            return;
        }
    }

    if (isTradeReturn) {
        const idx = gameState.tradeReturns.findIndex(p => p.id === playerId);
        if (idx !== -1) {
            gameState.tradeReturns[idx].status = status;
            if (status === 'Cut') {
                gameState.tradeReturns[idx].useMLE = false;
                gameState.tradeReturns[idx].useVetMin = false;
            }
        }
    } else {
        const playerIndex = gameState.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;
        gameState.players[playerIndex].status = status;
        if (status === 'Cut' || status === 'Trade') {
            gameState.players[playerIndex].useMLE = false;
            gameState.players[playerIndex].useVetMin = false;
        }
    }

    renderPlayers();
    updateGameState();
}

function handleMLEChange(playerId, checked) {
    // Search both pools
    let player = gameState.players.find(p => p.id === playerId);
    if (!player) player = gameState.tradeReturns.find(p => p.id === playerId);
    if (!player) return;

    if (checked && gameState.mleUsed && gameState.mlePlayerId !== playerId) {
        alert('MLE is already in use! You can only use it on ONE player.');
        renderPlayers();
        return;
    }

    if (checked && player.useVetMin) {
        player.useVetMin = false;
    }

    player.useMLE = checked;
    renderPlayers();
    updateGameState();
}

function handleVetMinChange(playerId, checked) {
    let player = gameState.players.find(p => p.id === playerId);
    if (!player) player = gameState.tradeReturns.find(p => p.id === playerId);
    if (!player) return;

    if (checked && gameState.vetMinCount >= 3) {
        alert('You can only use Veteran Minimum on 3 players!');
        renderPlayers();
        return;
    }

    if (checked && player.useMLE) {
        player.useMLE = false;
    }

    player.useVetMin = checked;
    renderPlayers();
    updateGameState();
}

// === TWO-WAY TRADES ===
function showTradeModal(playerId) {
    const tradedPlayer = gameState.players.find(p => p.id === playerId);
    if (!tradedPlayer) return;

    const maxReturnSalary = tradedPlayer.salary * 1.25;
    const tradeReturnIds = gameState.tradeReturns.map(p => p.id);

    // Available FAs not already acquired via trade and not signed
    const availableFAs = gameState.players.filter(p =>
        !p.isKnick &&
        p.status !== 'Sign' &&
        !tradeReturnIds.includes(p.id)
    );

    const eligible = availableFAs.filter(p => p.salary <= maxReturnSalary);
    const ineligible = availableFAs.filter(p => p.salary > maxReturnSalary);

    document.getElementById('tradeModalPlayerName').textContent = tradedPlayer.name;
    document.getElementById('tradeModalSalary').textContent = `$${formatSalary(tradedPlayer.salary)}`;
    document.getElementById('tradeModalMaxReturn').textContent = `$${formatSalary(maxReturnSalary)}`;

    const eligibleList = document.getElementById('tradeEligibleList');
    const ineligibleList = document.getElementById('tradeIneligibleList');

    eligibleList.innerHTML = eligible.length === 0
        ? '<div class="trade-empty">No eligible trade targets available</div>'
        : eligible.map(p => `
            <div class="trade-player-row" onclick="confirmTrade(${tradedPlayer.id}, ${p.id})">
                <div class="trade-player-info">
                    <span class="trade-player-name">${p.name}</span>
                    <span class="trade-player-pos">${p.position}</span>
                </div>
                <div class="trade-player-stats">
                    <span class="trade-player-salary">$${formatSalary(p.salary)}</span>
                    <span class="trade-player-qpts">${p.qpts} Q-Pts</span>
                </div>
                <button class="trade-select-btn">SELECT</button>
            </div>
        `).join('');

    ineligibleList.innerHTML = ineligible.length === 0
        ? ''
        : `<div class="trade-ineligible-header">⛔ Salary Too High (over $${formatSalary(maxReturnSalary)})</div>` +
          ineligible.map(p => `
            <div class="trade-player-row ineligible">
                <div class="trade-player-info">
                    <span class="trade-player-name">${p.name}</span>
                    <span class="trade-player-pos">${p.position}</span>
                </div>
                <div class="trade-player-stats">
                    <span class="trade-player-salary">$${formatSalary(p.salary)}</span>
                    <span class="trade-player-qpts">${p.qpts} Q-Pts</span>
                </div>
                <span class="trade-blocked-label">BLOCKED</span>
            </div>
        `).join('');

    document.getElementById('tradeModal').classList.add('show');
}

function confirmTrade(tradedPlayerId, returnPlayerId) {
    // Mark the Knick as traded
    const playerIndex = gameState.players.findIndex(p => p.id === tradedPlayerId);
    if (playerIndex !== -1) {
        gameState.players[playerIndex].status = 'Trade';
        gameState.players[playerIndex].useMLE = false;
        gameState.players[playerIndex].useVetMin = false;
    }

    // Add the acquired player to tradeReturns
    const returnPlayer = gameState.players.find(p => p.id === returnPlayerId);
    if (returnPlayer) {
        gameState.tradeReturns.push({
            ...returnPlayer,
            status: 'Cut',
            useMLE: false,
            useVetMin: false
        });
    }

    gameState.pendingTradePlayerId = null;
    document.getElementById('tradeModal').classList.remove('show');
    renderPlayers();
    updateGameState();
}

function cancelTrade() {
    // Revert the dropdown back to its previous status
    if (gameState.pendingTradePlayerId) {
        const player = gameState.players.find(p => p.id === gameState.pendingTradePlayerId);
        if (player) {
            const select = document.querySelector(`select[data-player-id="${gameState.pendingTradePlayerId}"]`);
            if (select) select.value = player.status;
        }
        gameState.pendingTradePlayerId = null;
    }
    document.getElementById('tradeModal').classList.remove('show');
}

// === STATE UPDATE ===
function updateGameState() {
    calculateTotals();
    updateScoreboard();
    updateProgressBars();
    updateCapBreakdown();
    validateRules();
    saveToStorage();
}

function calculateTotals() {
    let totalPayroll = 0;
    let payrollWithoutBirdRights = 0;
    let totalQPts = 0;
    let playerCount = 0;
    let starsKept = 0;
    let positionCounts = { G: 0, F: 0, C: 0 };
    let mleUsed = false;
    let mlePlayerId = null;
    let vetMinCount = 0;

    const allSignedPlayers = [
        ...gameState.players,
        ...gameState.tradeReturns
    ].filter(p => p.status === 'Sign');

    allSignedPlayers.forEach(player => {
        playerCount++;

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

        if (!player.birdEligible) {
            payrollWithoutBirdRights += effectiveSalary;
        }

        totalQPts += player.qpts;

        if (player.isStar) starsKept++;

        if (player.positionGroup) {
            positionCounts[player.positionGroup] = (positionCounts[player.positionGroup] || 0) + 1;
        }
    });

    gameState.totalPayroll = totalPayroll;
    gameState.payrollWithoutBirdRights = payrollWithoutBirdRights;
    gameState.totalQPts = totalQPts;
    gameState.playerCount = playerCount;
    gameState.starsKept = starsKept;
    gameState.positionCounts = positionCounts;
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

    animateNumber('totalQPts', gameState.totalQPts);
    document.getElementById('playerCount').textContent = gameState.playerCount;

    // Position badges
    const pc = gameState.positionCounts;
    const gEl = document.getElementById('posG');
    const fEl = document.getElementById('posF');
    const cEl = document.getElementById('posC');

    if (gEl) {
        gEl.textContent = `G:${pc.G || 0}`;
        gEl.className = `pos-badge ${(pc.G || 0) >= 2 ? 'pos-met' : 'pos-unmet'}`;
    }
    if (fEl) {
        fEl.textContent = `F:${pc.F || 0}`;
        fEl.className = `pos-badge ${(pc.F || 0) >= 2 ? 'pos-met' : 'pos-unmet'}`;
    }
    if (cEl) {
        cEl.textContent = `C:${pc.C || 0}`;
        cEl.className = `pos-badge ${(pc.C || 0) >= 1 ? 'pos-met' : 'pos-unmet'}`;
    }
}

function updateProgressBars() {
    const capPercentage = Math.min((gameState.totalPayroll / SALARY_CAP) * 100, 150);
    const capFill = document.getElementById('capProgress');
    capFill.style.width = `${capPercentage}%`;

    if (gameState.totalPayroll > SALARY_CAP) {
        capFill.style.background = 'linear-gradient(90deg, #F44336, #EF5350)';
    } else if (capPercentage > 90) {
        capFill.style.background = 'linear-gradient(90deg, #FF9800, #FFB74D)';
    } else {
        capFill.style.background = 'linear-gradient(90deg, #006BB6, #4a9fd8)';
    }

    document.getElementById('capPercentage').textContent = `${Math.round(capPercentage)}%`;

    const qptsPercentage = Math.min((gameState.totalQPts / QUALITY_POINTS_MINIMUM) * 100, 100);
    document.getElementById('qptsProgress').style.width = `${qptsPercentage}%`;
    document.getElementById('qptsPercentage').textContent = `${gameState.totalQPts}/${QUALITY_POINTS_MINIMUM}`;
}

// === CAP BREAKDOWN VISUAL ===
function updateCapBreakdown() {
    const bar = document.getElementById('capBreakdown');
    if (!bar) return;
    bar.innerHTML = '';

    const signedPlayers = [
        ...gameState.players,
        ...gameState.tradeReturns
    ].filter(p => p.status === 'Sign');

    if (signedPlayers.length === 0) {
        bar.innerHTML = '<div class="breakdown-empty">Sign players to see cap breakdown</div>';
        return;
    }

    signedPlayers.forEach(player => {
        let effectiveSalary = player.salary;
        if (player.useMLE) effectiveSalary = player.salary * 0.5;
        else if (player.useVetMin) effectiveSalary = 2000000;

        const widthPct = Math.max((effectiveSalary / SALARY_CAP) * 100, 1.5);
        const segClass = player.isStar ? 'seg-star' : player.useVetMin ? 'seg-vetmin' : 'seg-rotation';

        const seg = document.createElement('div');
        seg.className = `breakdown-segment ${segClass}`;
        seg.style.width = `${widthPct}%`;
        seg.title = `${player.name}: $${formatSalary(effectiveSalary)}`;
        bar.appendChild(seg);
    });
}

// === VALIDATE RULES ===
function validateRules() {
    const underCapWithBirdRights = gameState.payrollWithoutBirdRights <= SALARY_CAP;
    const pc = gameState.positionCounts;
    const positionBalanced = (pc.G || 0) >= 2 && (pc.F || 0) >= 2 && (pc.C || 0) >= 1;

    const rules = {
        rosterSize: gameState.playerCount >= 10 && gameState.playerCount <= 13,
        underCap: underCapWithBirdRights,
        starsKept: gameState.starsKept >= 2,
        qualityPoints: gameState.totalQPts >= QUALITY_POINTS_MINIMUM,
        positionBalance: positionBalanced
    };

    updateRuleUI('ruleRoster', rules.rosterSize);
    updateRuleUI('ruleCap', rules.underCap);
    updateRuleUI('ruleStars', rules.starsKept);
    updateRuleUI('ruleQPts', rules.qualityPoints);
    updateRuleUI('rulePosition', rules.positionBalance);

    const allRulesPass = Object.values(rules).every(rule => rule === true);
    updateStatusBanner(allRulesPass);

    if (allRulesPass && !gameState.hasWon) {
        gameState.hasWon = true;
        setTimeout(() => showSuccessModal(), 500);
    } else if (!allRulesPass) {
        gameState.hasWon = false;
    }
}

function updateRuleUI(ruleId, passed) {
    const ruleElement = document.getElementById(ruleId);
    if (!ruleElement) return;
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

// === SUCCESS MODAL ===
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    const seasonResults = simulateSeason();
    updateModalContent(seasonResults);
    modal.classList.add('show');
    createConfetti();
}

function updateModalContent(seasonResults) {
    document.getElementById('seasonRecord').textContent = seasonResults.record;
    document.getElementById('playoffResult').textContent = seasonResults.playoff;
    document.getElementById('tierName').textContent = seasonResults.tier;
    document.getElementById('claimCode').textContent = seasonResults.claimCode;
    document.getElementById('tierDescription').textContent = seasonResults.description;
    document.getElementById('finalQPts').textContent = gameState.totalQPts + ' pts';

    const capEfficiency = ((SALARY_CAP - gameState.totalPayroll) / SALARY_CAP * 100).toFixed(1);
    document.getElementById('capEfficiency').textContent = capEfficiency + '% saved';

    // Luck display
    const luckEl = document.getElementById('luckRating');
    if (luckEl) {
        if (seasonResults.luck > 4) luckEl.textContent = '🍀 Lucky Break!';
        else if (seasonResults.luck < -4) luckEl.textContent = '😤 Unlucky Season';
        else luckEl.textContent = '⚖️ Average Luck';
    }

    const modalContent = document.querySelector('.modal-content');
    modalContent.className = 'modal-content tier-' + seasonResults.tier.toLowerCase().replace(/\s+/g, '-');

    // Share link
    const shareInput = document.getElementById('shareLink');
    if (shareInput) shareInput.value = encodeBuild();
}

// === RANDOMIZED SEASON SIMULATION ===
function simulateSeason() {
    const qpts = gameState.totalQPts;
    const capUsed = gameState.totalPayroll;
    const capEfficiency = ((SALARY_CAP - capUsed) / SALARY_CAP) * 100;
    const stars = gameState.starsKept;

    // Randomized luck factor: ±8 Q-Pts swing (same build can produce different results)
    const luck = (Math.random() * 16) - 8;
    const effectiveQPts = qpts + luck;

    const allSigned = [...gameState.players, ...gameState.tradeReturns];
    const hasLeBron = allSigned.find(p => p.id === 101 && p.status === 'Sign');
    const hasCurry = allSigned.find(p => p.id === 102 && p.status === 'Sign');
    const hasEliteFA = hasLeBron || hasCurry;

    let tier, record, playoff, claimCode, description;

    if (effectiveQPts >= 95 && capEfficiency > 15) {
        tier = 'Dynasty';
        record = '67-15';
        playoff = '🏆 NBA CHAMPIONS! Finals MVP performance!';
        claimCode = 'DYNASTY2026';
        description = 'Dominant season! Elite roster with incredible cap management!';
    } else if (effectiveQPts >= 90 || (effectiveQPts >= 85 && capEfficiency > 20)) {
        tier = 'Championship';
        record = '62-20';
        playoff = '🏆 NBA CHAMPIONS! Hard-fought Finals victory!';
        claimCode = 'CHAMPS2026';
        description = 'Championship season! Outstanding roster construction!';
    } else if (effectiveQPts >= 85 && stars >= 3) {
        tier = 'Superteam';
        record = '58-24';
        playoff = '🥈 NBA Finals! Lost in 7 games but great run!';
        claimCode = 'FINALS2026';
        description = 'Superstar-loaded roster! Made it to the Finals!';
    } else if (effectiveQPts >= 85 || (effectiveQPts >= 80 && capEfficiency > 25)) {
        tier = 'Contender';
        record = '56-26';
        playoff = '🥉 Conference Finals! Lost in 6 games.';
        claimCode = 'CONTEND2026';
        description = 'Strong contender! Great balance of talent and value!';
    } else if (effectiveQPts >= 80) {
        tier = 'Playoff Team';
        record = '51-31';
        playoff = '🏀 Second Round! Lost in 5 games.';
        claimCode = 'PLAYOFFS2026';
        description = 'Solid playoff team! Good foundation to build on.';
    } else {
        tier = 'Scrappy Team';
        record = '46-36';
        playoff = '🎯 First Round! Lost in 6 games but made it!';
        claimCode = 'SCRAPPY2026';
        description = 'Made the playoffs with smart cap management!';
    }

    if (hasEliteFA && tier === 'Championship') {
        tier = 'All-Star Dynasty';
        claimCode = 'ALLSTAR2026';
        description = 'Legendary roster with hall of fame talent!';
    }

    return { tier, record, playoff, claimCode, description, luck };
}

// === LOCAL STORAGE ===
function saveToStorage() {
    const saveData = {
        players: gameState.players.map(p => ({
            id: p.id, status: p.status, useMLE: p.useMLE, useVetMin: p.useVetMin
        })),
        tradeReturns: gameState.tradeReturns.map(p => ({
            id: p.id, status: p.status, useMLE: p.useMLE, useVetMin: p.useVetMin
        }))
    };
    try {
        localStorage.setItem('knicksCapCrash_v2', JSON.stringify(saveData));
    } catch (e) { /* ignore quota errors */ }
}

function loadFromStorage() {
    try {
        const raw = localStorage.getItem('knicksCapCrash_v2');
        if (!raw) return;
        const saveData = JSON.parse(raw);

        if (saveData.players) {
            saveData.players.forEach(saved => {
                const player = gameState.players.find(p => p.id === saved.id);
                if (player) {
                    player.status = saved.status;
                    player.useMLE = saved.useMLE;
                    player.useVetMin = saved.useVetMin;
                }
            });
        }

        if (saveData.tradeReturns && saveData.tradeReturns.length > 0) {
            saveData.tradeReturns.forEach(saved => {
                const original = gameState.players.find(p => p.id === saved.id);
                if (original) {
                    gameState.tradeReturns.push({
                        ...original,
                        status: saved.status,
                        useMLE: saved.useMLE,
                        useVetMin: saved.useVetMin
                    });
                }
            });
        }
    } catch (e) { /* ignore parse errors */ }
}

function clearStorage() {
    localStorage.removeItem('knicksCapCrash_v2');
}

// === URL BUILD SHARING ===
function encodeBuild() {
    const parts = [];

    gameState.players.forEach(p => {
        if (p.status === 'Sign') {
            let code = String(p.id);
            if (p.useMLE) code += 'm';
            else if (p.useVetMin) code += 'v';
            parts.push(code);
        } else if (p.status === 'Trade') {
            parts.push(`T${p.id}`);
        }
    });

    gameState.tradeReturns.forEach(p => {
        if (p.status === 'Sign') {
            let code = `R${p.id}`;
            if (p.useMLE) code += 'm';
            else if (p.useVetMin) code += 'v';
            parts.push(code);
        }
    });

    const base = window.location.href.split('?')[0];
    return parts.length > 0 ? `${base}?build=${parts.join(',')}` : base;
}

function decodeBuildFromURL() {
    const params = new URLSearchParams(window.location.search);
    const build = params.get('build');
    if (!build) return;

    // URL build takes precedence over localStorage
    clearStorage();

    const parts = build.split(',');

    parts.forEach(part => {
        if (part.startsWith('T')) {
            const id = parseInt(part.slice(1));
            const player = gameState.players.find(p => p.id === id);
            if (player) player.status = 'Trade';
        } else if (part.startsWith('R')) {
            const hasMLE = part.includes('m');
            const hasVet = part.includes('v');
            const id = parseInt(part.slice(1).replace('m', '').replace('v', ''));
            const original = gameState.players.find(p => p.id === id);
            if (original) {
                gameState.tradeReturns.push({
                    ...original,
                    status: 'Sign',
                    useMLE: hasMLE,
                    useVetMin: hasVet
                });
            }
        } else {
            const hasMLE = part.includes('m');
            const hasVet = part.includes('v');
            const id = parseInt(part.replace('m', '').replace('v', ''));
            const player = gameState.players.find(p => p.id === id);
            if (player) {
                player.status = 'Sign';
                player.useMLE = hasMLE;
                player.useVetMin = hasVet;
            }
        }
    });
}

function copyShareLink() {
    const input = document.getElementById('shareLink');
    if (!input || !input.value) return;
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = document.getElementById('copyLinkBtn');
        if (btn) {
            btn.textContent = '✓ Copied!';
            setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
        }
    }).catch(() => {
        input.select();
        document.execCommand('copy');
    });
}

// === TUTORIAL ===
function initTutorial() {
    if (localStorage.getItem('kccTutorial') === 'done') return;
    setTimeout(() => showTutorialStep(0), 800);
}

function showTutorialStep(step) {
    tutorialStep = step;
    const overlay = document.getElementById('tutorialOverlay');
    const data = TUTORIAL_STEPS[step];
    if (!overlay || !data) return;

    document.getElementById('tutorialTitle').textContent = data.title;
    document.getElementById('tutorialText').textContent = data.text;
    document.getElementById('tutorialCounter').textContent = `${step + 1} / ${TUTORIAL_STEPS.length}`;
    document.getElementById('tutorialNext').textContent =
        step === TUTORIAL_STEPS.length - 1 ? "Let's Play! 🏀" : 'Next →';

    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
    const target = document.querySelector(data.target);
    if (target) target.classList.add('tutorial-highlight');

    overlay.classList.add('show');
}

function nextTutorialStep() {
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
        skipTutorial();
    } else {
        showTutorialStep(tutorialStep + 1);
    }
}

function skipTutorial() {
    localStorage.setItem('kccTutorial', 'done');
    const overlay = document.getElementById('tutorialOverlay');
    overlay.classList.remove('show');
    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
}

// === ANIMATIONS ===
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

    if (!document.querySelector('#confettiStyle')) {
        const style = document.createElement('style');
        style.id = 'confettiStyle';
        style.textContent = `@keyframes confettiFall { to { top: 100%; transform: translateY(100%) rotate(720deg); } }`;
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

    if (!document.querySelector('#particleStyle')) {
        const style = document.createElement('style');
        style.id = 'particleStyle';
        style.textContent = `
            @keyframes float {
                0%, 100% { transform: translateY(0) translateX(0); }
                25% { transform: translateY(-20px) translateX(10px); }
                50% { transform: translateY(-10px) translateX(-10px); }
                75% { transform: translateY(-30px) translateX(5px); }
            }
        `;
        document.head.appendChild(style);
    }
}

function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const currentValue = parseInt(element.textContent) || 0;
    const difference = targetValue - currentValue;
    const duration = 500;
    const steps = 20;
    const stepValue = difference / steps;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
        currentStep++;
        element.textContent = Math.round(currentValue + (stepValue * currentStep));
        if (currentStep >= steps) {
            element.textContent = targetValue;
            clearInterval(interval);
        }
    }, stepDuration);
}

function formatSalary(amount) {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    return amount.toLocaleString();
}

// === EVENT LISTENERS ===
document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset the game?')) {
        clearStorage();
        initializeGame();
    }
});

document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('successModal').classList.remove('show');
});

document.getElementById('successModal').addEventListener('click', (e) => {
    if (e.target.id === 'successModal') {
        document.getElementById('successModal').classList.remove('show');
    }
});

document.getElementById('simulateAgainBtn').addEventListener('click', () => {
    const results = simulateSeason();
    updateModalContent(results);
    createConfetti();
});
