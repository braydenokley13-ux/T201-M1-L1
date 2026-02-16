// Knicks Cap Crash v2 - Game Engine
// Depends on: players-data.js, config.js, storage.js, coach.js, tutorial.js, reflection.js, achievements.js

// Game State
var gameState = {
    players: [],
    difficulty: 'pro',
    config: null,
    totalPayroll: 0,
    payrollWithoutBirdRights: 0,
    totalQPts: 0,
    playerCount: 0,
    starsKept: 0,
    mleUsed: false,
    mlePlayerId: null,
    vetMinCount: 0,
    hasWon: false,
    history: [],        // Undo stack
    undoCount: 0,       // Track undo usage for achievements
    moveCount: 0,       // Track moves for coach
    startTime: null,    // Track for speed achievement
    challenges: [],     // Active bonus challenges
    modalStep: 'results', // 'results' | 'reflection' | 'claimcode'
    seasonResults: null
};

// Make gameState accessible for tutorial polling
window.gameState = gameState;

// Debounce timer for auto-save
var saveTimer = null;

// Initialize game on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
    createParticles();
});

function initializeGame() {
    // Load difficulty config
    var config = CapCrash.getSelectedDifficulty();
    gameState.difficulty = config.key;
    gameState.config = config;
    gameState.hasWon = false;
    gameState.history = [];
    gameState.undoCount = 0;
    gameState.moveCount = 0;
    gameState.startTime = Date.now();
    gameState.modalStep = 'results';
    gameState.seasonResults = null;

    // Select random challenges
    gameState.challenges = CapCrash.getRandomChallenges(2);

    // Update header to show difficulty
    updateDifficultyDisplay();

    // Check for saved game
    var savedGame = CapCrash.Storage.loadGameState();
    if (savedGame && savedGame.difficulty === config.key) {
        if (confirm('You have an unfinished game on ' + config.label + ' mode. Resume where you left off?')) {
            restoreGameState(savedGame);
            renderPlayers();
            updateGameState();
            initCoachAndTutorial(config);
            return;
        }
    }

    // Fresh game - everyone starts CUT
    gameState.players = playersData.map(function(player) {
        return Object.assign({}, player, {
            status: 'Cut',
            useMLE: false,
            useVetMin: false
        });
    });

    CapCrash.Storage.recordGamePlayed();
    CapCrash.Storage.clearCurrentGame();

    renderPlayers();
    updateGameState();
    renderChallenges();
    initCoachAndTutorial(config);
}

function initCoachAndTutorial(config) {
    // Initialize coach
    CapCrash.Coach.init(config);

    // Start tutorial if first time
    if (CapCrash.Tutorial.shouldAutoStart()) {
        setTimeout(function() {
            CapCrash.Tutorial.start();
        }, 500);
    }
}

function restoreGameState(saved) {
    gameState.players = playersData.map(function(player) {
        var savedPlayer = saved.players.find(function(sp) { return sp.id === player.id; });
        return Object.assign({}, player, {
            status: savedPlayer ? savedPlayer.status : 'Cut',
            useMLE: savedPlayer ? savedPlayer.useMLE : false,
            useVetMin: savedPlayer ? savedPlayer.useVetMin : false
        });
    });
    if (saved.challenges) {
        gameState.challenges = saved.challenges;
    }
}

function updateDifficultyDisplay() {
    var config = gameState.config;

    // Update subtitle
    var subtitle = document.querySelector('.game-subtitle');
    if (subtitle) {
        subtitle.textContent = config.icon + ' ' + config.label + ' Mode — Stay under the $' + formatSalary(config.salaryCap) + ' salary cap!';
    }

    // Update difficulty badge
    var badge = document.getElementById('difficultyBadge');
    if (badge) {
        badge.textContent = config.icon + ' ' + config.label;
        badge.className = 'difficulty-badge difficulty-' + config.key;
    }

    // Update rule sidebar text dynamically
    var ruleRosterText = document.querySelector('#ruleRoster .rule-text');
    if (ruleRosterText) ruleRosterText.textContent = 'Roster Size (' + config.rosterMin + '-' + config.rosterMax + ')';

    var ruleCapText = document.querySelector('#ruleCap .rule-text');
    if (ruleCapText) ruleCapText.textContent = 'Stay Under Budget ($' + formatSalary(config.salaryCap) + ')';

    var ruleStarsText = document.querySelector('#ruleStars .rule-text');
    if (ruleStarsText) ruleStarsText.textContent = 'Sign ' + config.starsRequired + '+ Stars';

    var ruleQPtsText = document.querySelector('#ruleQPts .rule-text');
    if (ruleQPtsText) ruleQPtsText.textContent = 'Quality Points \u2265 ' + config.qpMinimum;

    // Show/hide position diversity rule for Legend
    var rulePositions = document.getElementById('rulePositions');
    if (rulePositions) {
        rulePositions.style.display = config.requirePositionDiversity ? 'flex' : 'none';
    }

    // Update Q-Points subtext
    var qptsSubtext = document.querySelector('.stat-subtext');
    if (qptsSubtext) qptsSubtext.textContent = 'Need ' + config.qpMinimum + '+';

    // Update cap space initial value
    var capSpaceEl = document.getElementById('capSpace');
    if (capSpaceEl) capSpaceEl.textContent = '$' + formatSalary(config.salaryCap);

    // Update Q-Points progress label
    var qptsPercentage = document.getElementById('qptsPercentage');
    if (qptsPercentage) qptsPercentage.textContent = '0/' + config.qpMinimum;
}

function renderPlayers() {
    var rosterGrid = document.getElementById('rosterGrid');
    rosterGrid.innerHTML = '';

    var knicks = gameState.players.filter(function(p) { return p.isKnick; });
    var freeAgents = gameState.players.filter(function(p) { return !p.isKnick; });

    // Knicks section
    var knicksSection = document.createElement('div');
    knicksSection.className = 'player-section';
    knicksSection.innerHTML = '<h2 class="section-title">\u{1F3C0} YOUR KNICKS PLAYERS <span class="section-subtitle">(Bird Rights Eligible)</span></h2>';
    rosterGrid.appendChild(knicksSection);

    knicks.forEach(function(player, index) {
        var card = createPlayerCard(player, index);
        rosterGrid.appendChild(card);
    });

    // Free Agents section
    var faSection = document.createElement('div');
    faSection.className = 'player-section';
    faSection.innerHTML = '<h2 class="section-title">\u2B50 FREE AGENTS <span class="section-subtitle">(Open Market)</span></h2>';
    rosterGrid.appendChild(faSection);

    freeAgents.forEach(function(player, index) {
        var card = createPlayerCard(player, knicks.length + index);
        rosterGrid.appendChild(card);
    });
}

function createPlayerCard(player, index) {
    var config = gameState.config;
    var card = document.createElement('div');
    var statusClass = player.status === 'Cut' ? 'cut' : player.status === 'Trade' ? 'traded' : 'signed-active';
    card.className = 'player-card ' + (player.isStar ? 'star' : '') + ' ' + statusClass + ' ' + (!player.isKnick ? 'free-agent' : '');
    card.id = 'player-' + player.id;

    // Calculate effective salary
    var displaySalary = player.salary;
    var salaryNote = '';

    if (player.status === 'Sign') {
        if (player.useMLE) {
            displaySalary = player.salary * config.mleDiscount;
            salaryNote = ' <span class="salary-note">(MLE: ' + Math.round(config.mleDiscount * 100) + '% off)</span>';
        } else if (player.useVetMin) {
            displaySalary = config.vetMinCost;
            salaryNote = ' <span class="salary-note">(Vet Min)</span>';
        }
    }

    // Salary color class
    var salaryColorClass = '';
    if (player.salary >= 30000000) salaryColorClass = 'salary-high';
    else if (player.salary >= 10000000) salaryColorClass = 'salary-mid';
    else salaryColorClass = 'salary-low';

    // Q-Points dots (visual indicator, 5 dots max)
    var qptsDots = renderQPtsDots(player.qpts);

    card.innerHTML =
        '<div class="player-header">' +
            '<div class="player-number">' + player.number + '</div>' +
            (player.isStar ? '<div class="star-badge">\u2B50</div>' : '') +
            (player.status === 'Cut' ? '<div class="status-badge cut-badge">AVAILABLE</div>' :
              player.status === 'Trade' ? '<div class="status-badge trade-badge">TRADED</div>' :
              '<div class="status-badge signed-badge">SIGNED</div>') +
        '</div>' +
        '<div class="player-info">' +
            '<div class="player-name">' + player.name + '</div>' +
            '<div class="player-position">' + player.position + '</div>' +
        '</div>' +
        '<div class="player-stats">' +
            '<div class="stat-item">' +
                '<div class="stat-item-label">Salary</div>' +
                '<div class="stat-item-value ' + salaryColorClass + '">$' + formatSalary(displaySalary) + salaryNote + '</div>' +
            '</div>' +
            '<div class="stat-item">' +
                '<div class="stat-item-label">Q-Points</div>' +
                '<div class="stat-item-value qpts-value">' + player.qpts + ' ' + qptsDots + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="player-controls">' +
            '<div class="control-group">' +
                '<select class="move-select" data-player-id="' + player.id + '" onchange="handleMoveChange(' + player.id + ', this.value)">' +
                    '<option value="Cut"' + (player.status === 'Cut' ? ' selected' : '') + '>\u2717 CUT</option>' +
                    '<option value="Sign"' + (player.status === 'Sign' ? ' selected' : '') + '>\u2713 SIGN</option>' +
                    (player.isKnick ? '<option value="Trade"' + (player.status === 'Trade' ? ' selected' : '') + '>\u2194 TRADE</option>' : '') +
                '</select>' +
            '</div>' +
            '<div class="player-badges">' +
                renderBirdRightsBadge(player) +
                renderMLECheckbox(player, config) +
                renderVetMinCheckbox(player, config) +
            '</div>' +
        '</div>';

    return card;
}

function renderQPtsDots(qpts) {
    var filled = Math.min(5, Math.round(qpts / 4)); // 20 max = 5 dots
    var dots = '';
    for (var i = 0; i < 5; i++) {
        dots += '<span class="qpts-dot ' + (i < filled ? 'filled' : '') + '">\u25CF</span>';
    }
    return '<span class="qpts-dots">' + dots + '</span>';
}

function renderBirdRightsBadge(player) {
    if (!player.birdEligible || player.status !== 'Sign') return '';
    var config = gameState.config;
    var feeNote = config.birdRightsFee > 0 ? ' ($' + formatSalary(config.birdRightsFee) + ' fee)' : '';
    return '<div class="info-badge bird-badge" title="' + CapCrash.Coach.getBirdRightsTooltip(player) + '" ' +
        'onmouseenter="CapCrash.Coach.showTooltip(this, CapCrash.Coach.getBirdRightsTooltip(gameState.players.find(function(p){return p.id===' + player.id + '})))" ' +
        'onmouseleave="CapCrash.Coach.hideTooltip()"' +
        '>\u{1F985} Bird Rights' + feeNote + '</div>';
}

function renderMLECheckbox(player, config) {
    if (!player.mleEligible || player.status !== 'Sign') return '';
    var discountPercent = Math.round(config.mleDiscount * 100);
    var isDisabled = gameState.mleUsed && !player.useMLE;
    return '<div class="checkbox-group mle-group" ' +
        'onmouseenter="CapCrash.Coach.showTooltip(this, CapCrash.Coach.getMLETooltip(gameState.players.find(function(p){return p.id===' + player.id + '})))" ' +
        'onmouseleave="CapCrash.Coach.hideTooltip()">' +
        '<input type="checkbox" id="mle-' + player.id + '" class="exception-checkbox" ' +
            'data-player-id="' + player.id + '" ' +
            (player.useMLE ? 'checked ' : '') +
            (isDisabled ? 'disabled ' : '') +
            'onchange="handleMLEChange(' + player.id + ', this.checked)" />' +
        '<label for="mle-' + player.id + '" class="checkbox-label ' + (isDisabled ? 'disabled' : '') + '">' +
            '\u{1F4B0} Use MLE (' + discountPercent + '% Off!)' +
        '</label>' +
    '</div>';
}

function renderVetMinCheckbox(player, config) {
    if (!player.vetMinEligible || player.status !== 'Sign') return '';
    var isDisabled = gameState.vetMinCount >= config.vetMinSlots && !player.useVetMin;
    return '<div class="checkbox-group vet-group" ' +
        'onmouseenter="CapCrash.Coach.showTooltip(this, CapCrash.Coach.getVetMinTooltip(gameState.players.find(function(p){return p.id===' + player.id + '})))" ' +
        'onmouseleave="CapCrash.Coach.hideTooltip()">' +
        '<input type="checkbox" id="vet-' + player.id + '" class="exception-checkbox" ' +
            'data-player-id="' + player.id + '" ' +
            (player.useVetMin ? 'checked ' : '') +
            (isDisabled ? 'disabled ' : '') +
            'onchange="handleVetMinChange(' + player.id + ', this.checked)" />' +
        '<label for="vet-' + player.id + '" class="checkbox-label ' + (isDisabled ? 'disabled' : '') + '">' +
            '\u{1F4C9} Vet Min ($' + formatSalary(config.vetMinCost) + ')' +
        '</label>' +
    '</div>';
}

// --- Undo System ---
function pushHistory() {
    gameState.history.push(
        gameState.players.map(function(p) {
            return { id: p.id, status: p.status, useMLE: p.useMLE, useVetMin: p.useVetMin };
        })
    );
    // Limit history to 20
    if (gameState.history.length > 20) gameState.history.shift();
}

function undo() {
    if (gameState.history.length === 0) return;
    var previous = gameState.history.pop();
    gameState.undoCount++;

    previous.forEach(function(snapshot) {
        var player = gameState.players.find(function(p) { return p.id === snapshot.id; });
        if (player) {
            player.status = snapshot.status;
            player.useMLE = snapshot.useMLE;
            player.useVetMin = snapshot.useVetMin;
        }
    });

    renderPlayers();
    updateGameState();
    debouncedSave();
    updateUndoButton();
}

function updateUndoButton() {
    var btn = document.getElementById('undoBtn');
    if (btn) {
        btn.disabled = gameState.history.length === 0;
        btn.textContent = '\u21A9 Undo' + (gameState.history.length > 0 ? ' (' + gameState.history.length + ')' : '');
    }
}

// --- Event Handlers ---
function handleMoveChange(playerId, status) {
    var playerIndex = gameState.players.findIndex(function(p) { return p.id === playerId; });
    if (playerIndex === -1) return;

    pushHistory();
    gameState.moveCount++;

    gameState.players[playerIndex].status = status;

    if (status === 'Cut' || status === 'Trade') {
        gameState.players[playerIndex].useMLE = false;
        gameState.players[playerIndex].useVetMin = false;
    }

    renderPlayers();
    updateGameState();
    debouncedSave();
    updateUndoButton();

    // Coach evaluation
    CapCrash.Coach.recordMove();
    CapCrash.Coach.evaluate(gameState);
}

function handleMLEChange(playerId, checked) {
    var playerIndex = gameState.players.findIndex(function(p) { return p.id === playerId; });
    if (playerIndex === -1) return;

    if (checked && gameState.mleUsed && gameState.mlePlayerId !== playerId) {
        alert('MLE is already in use! You can only use it on ONE player.');
        renderPlayers();
        return;
    }

    pushHistory();

    if (checked && gameState.players[playerIndex].useVetMin) {
        gameState.players[playerIndex].useVetMin = false;
    }

    gameState.players[playerIndex].useMLE = checked;

    renderPlayers();
    updateGameState();
    debouncedSave();
    updateUndoButton();
}

function handleVetMinChange(playerId, checked) {
    var playerIndex = gameState.players.findIndex(function(p) { return p.id === playerId; });
    if (playerIndex === -1) return;

    var config = gameState.config;
    if (checked && gameState.vetMinCount >= config.vetMinSlots) {
        alert('You can only use Veteran Minimum on ' + config.vetMinSlots + ' players!');
        renderPlayers();
        return;
    }

    pushHistory();

    if (checked && gameState.players[playerIndex].useMLE) {
        gameState.players[playerIndex].useMLE = false;
    }

    gameState.players[playerIndex].useVetMin = checked;

    renderPlayers();
    updateGameState();
    debouncedSave();
    updateUndoButton();
}

// --- Auto-save ---
function debouncedSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function() {
        CapCrash.Storage.saveGameState(gameState);
    }, 500);
}

// --- State Update ---
function updateGameState() {
    calculateTotals();
    updateScoreboard();
    updateProgressBars();
    validateRules();
    updateChallenges();
}

function calculateTotals() {
    var config = gameState.config;
    var totalPayroll = 0;
    var payrollWithoutBirdRights = 0;
    var totalQPts = 0;
    var playerCount = 0;
    var starsKept = 0;
    var mleUsed = false;
    var mlePlayerId = null;
    var vetMinCount = 0;

    gameState.players.forEach(function(player) {
        if (player.status === 'Sign') {
            playerCount++;

            var effectiveSalary = player.salary;

            if (player.useMLE) {
                effectiveSalary = player.salary * config.mleDiscount;
                mleUsed = true;
                mlePlayerId = player.id;
            } else if (player.useVetMin) {
                effectiveSalary = config.vetMinCost;
                vetMinCount++;
            }

            totalPayroll += effectiveSalary;

            // Bird Rights: salary doesn't count against cap (but fee might)
            if (!player.birdEligible) {
                payrollWithoutBirdRights += effectiveSalary;
            } else {
                // Legend mode Bird Rights fee
                payrollWithoutBirdRights += config.birdRightsFee;
            }

            totalQPts += player.qpts;

            if (player.isStar && player.isKnick) {
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
    var config = gameState.config;

    document.getElementById('totalPayroll').textContent = '$' + formatSalary(gameState.totalPayroll);

    var capSpace = config.salaryCap - gameState.totalPayroll;
    document.getElementById('capSpace').textContent = capSpace >= 0
        ? '$' + formatSalary(capSpace)
        : '-$' + formatSalary(Math.abs(capSpace));

    animateNumber('totalQPts', gameState.totalQPts);
    document.getElementById('playerCount').textContent = gameState.playerCount;
}

function updateProgressBars() {
    var config = gameState.config;

    // Cap usage
    var capPercentage = Math.min((gameState.totalPayroll / config.salaryCap) * 100, 150);
    var capFill = document.getElementById('capProgress');
    capFill.style.width = capPercentage + '%';

    if (gameState.totalPayroll > config.salaryCap) {
        capFill.style.background = 'linear-gradient(90deg, #F44336, #EF5350)';
    } else if (capPercentage > 90) {
        capFill.style.background = 'linear-gradient(90deg, #FF9800, #FFB74D)';
    } else {
        capFill.style.background = 'linear-gradient(90deg, #006BB6, #4a9fd8)';
    }

    document.getElementById('capPercentage').textContent = Math.round(capPercentage) + '%';

    // Quality points
    var qptsPercentage = Math.min((gameState.totalQPts / config.qpMinimum) * 100, 100);
    var qptsFill = document.getElementById('qptsProgress');
    qptsFill.style.width = qptsPercentage + '%';
    document.getElementById('qptsPercentage').textContent = gameState.totalQPts + '/' + config.qpMinimum;
}

function validateRules() {
    var config = gameState.config;

    var underCapWithBirdRights = gameState.payrollWithoutBirdRights <= config.salaryCap;

    var rules = {
        rosterSize: gameState.playerCount >= config.rosterMin && gameState.playerCount <= config.rosterMax,
        underCap: underCapWithBirdRights,
        starsKept: gameState.starsKept >= config.starsRequired,
        qualityPoints: gameState.totalQPts >= config.qpMinimum
    };

    // Legend mode: position diversity
    if (config.requirePositionDiversity) {
        var positions = new Set();
        gameState.players.forEach(function(p) {
            if (p.status === 'Sign') positions.add(p.position);
        });
        rules.positionDiversity = positions.size >= config.minPositions;
    }

    updateRuleUI('ruleRoster', rules.rosterSize);
    updateRuleUI('ruleCap', rules.underCap);
    updateRuleUI('ruleStars', rules.starsKept);
    updateRuleUI('ruleQPts', rules.qualityPoints);

    if (config.requirePositionDiversity) {
        updateRuleUI('rulePositions', rules.positionDiversity);
    }

    var allRulesPass = Object.values(rules).every(function(rule) { return rule === true; });
    updateStatusBanner(allRulesPass);

    if (allRulesPass && !gameState.hasWon) {
        gameState.hasWon = true;
        setTimeout(function() { showSuccessModal(); }, 500);
    } else if (!allRulesPass) {
        gameState.hasWon = false;
    }
}

function updateRuleUI(ruleId, passed) {
    var ruleElement = document.getElementById(ruleId);
    if (!ruleElement) return;

    var icon = ruleElement.querySelector('.rule-icon');

    ruleElement.classList.remove('pass', 'fail');

    if (passed) {
        ruleElement.classList.add('pass');
        icon.textContent = '\u2713';
    } else {
        ruleElement.classList.add('fail');
        icon.textContent = '\u2717';
    }
}

function updateStatusBanner(success) {
    var banner = document.getElementById('statusBanner');
    var icon = document.getElementById('statusIcon');
    var text = document.getElementById('statusText');

    banner.classList.remove('success', 'fail');

    if (success) {
        banner.classList.add('success');
        icon.textContent = '\u{1F389}';
        text.textContent = 'Perfect! You rebuilt the championship roster!';
    } else {
        banner.classList.add('fail');
        icon.textContent = '\u26A0\uFE0F';
        text.textContent = 'Keep building! Check the rules on the right.';
    }
}

// --- Challenge Objectives ---
function renderChallenges() {
    var container = document.getElementById('challengeList');
    if (!container) return;

    if (gameState.challenges.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = '<h4>\u{1F3AF} Bonus Challenges</h4>';

    gameState.challenges.forEach(function(challenge) {
        var div = document.createElement('div');
        div.className = 'challenge-item';
        div.id = 'challenge-' + challenge.id;
        div.innerHTML =
            '<span class="challenge-icon">\u2610</span>' +
            '<span class="challenge-text">' + challenge.name + ': ' + challenge.description + '</span>';
        container.appendChild(div);
    });
}

function updateChallenges() {
    var config = gameState.config;
    gameState.challenges.forEach(function(challenge) {
        var el = document.getElementById('challenge-' + challenge.id);
        if (!el) return;
        var passed = challenge.check(gameState, config);
        var icon = el.querySelector('.challenge-icon');
        if (passed) {
            el.classList.add('challenge-complete');
            icon.textContent = '\u2611';
        } else {
            el.classList.remove('challenge-complete');
            icon.textContent = '\u2610';
        }
    });
}

// --- Success Modal ---
function showSuccessModal() {
    var config = gameState.config;
    var modal = document.getElementById('successModal');

    var seasonResults = simulateSeason();
    gameState.seasonResults = seasonResults;

    // Update modal with season results
    document.getElementById('seasonRecord').textContent = seasonResults.record;
    document.getElementById('playoffResult').textContent = seasonResults.playoff;
    document.getElementById('tierName').textContent = seasonResults.tier;
    document.getElementById('tierDescription').textContent = seasonResults.description;

    // Update stats
    document.getElementById('finalQPts').textContent = gameState.totalQPts + ' pts';
    var capEfficiency = ((config.salaryCap - gameState.totalPayroll) / config.salaryCap * 100).toFixed(1);
    document.getElementById('capEfficiency').textContent = capEfficiency + '% saved';

    // Show difficulty in modal
    var diffEl = document.getElementById('modalDifficulty');
    if (diffEl) diffEl.textContent = config.icon + ' ' + config.label + ' Mode';

    // Check bonus challenges
    var completedChallenges = gameState.challenges.filter(function(c) { return c.check(gameState, config); });
    var challengeEl = document.getElementById('modalChallenges');
    if (challengeEl) {
        if (completedChallenges.length > 0) {
            challengeEl.innerHTML = '<div class="modal-challenges-label">\u{1F31F} Bonus Challenges Completed:</div>' +
                completedChallenges.map(function(c) {
                    return '<span class="modal-challenge-badge">' + c.name + '</span>';
                }).join(' ');
            challengeEl.style.display = 'block';
        } else {
            challengeEl.style.display = 'none';
        }
    }

    // Tier class for styling
    var modalContent = document.querySelector('.modal-content');
    modalContent.className = 'modal-content tier-' + seasonResults.tier.toLowerCase().replace(/\s+/g, '-');

    // Show modal step 1: results
    gameState.modalStep = 'results';
    document.getElementById('modalStepResults').style.display = 'block';
    document.getElementById('modalStepReflection').style.display = 'none';
    document.getElementById('modalStepClaimCode').style.display = 'none';

    modal.classList.add('show');
    createConfetti(seasonResults.tier);

    // Check achievements
    var newAchievements = CapCrash.Achievements.checkAll(gameState, config, seasonResults);

    // Record win
    CapCrash.Storage.recordWin(config.key, seasonResults.tier, seasonResults.claimCode, gameState.totalQPts, parseFloat(capEfficiency));
    CapCrash.Storage.clearCurrentGame();

    // Show achievement notifications after a delay
    if (newAchievements.length > 0) {
        setTimeout(function() {
            CapCrash.Achievements.showNotifications(newAchievements);
        }, 1000);
    }
}

function goToReflection() {
    document.getElementById('modalStepResults').style.display = 'none';
    document.getElementById('modalStepReflection').style.display = 'block';
    document.getElementById('modalStepClaimCode').style.display = 'none';
    gameState.modalStep = 'reflection';

    // Render reflection questions
    var container = document.getElementById('modalStepReflection');
    container.innerHTML = CapCrash.Reflection.renderReflectionStep(gameState, gameState.config);
}

// Called by reflection.js when answers are submitted
window.showClaimCodeFinal = function(answers) {
    var config = gameState.config;
    var seasonResults = gameState.seasonResults;

    document.getElementById('modalStepResults').style.display = 'none';
    document.getElementById('modalStepReflection').style.display = 'none';
    document.getElementById('modalStepClaimCode').style.display = 'block';
    gameState.modalStep = 'claimcode';

    // Show claim code
    document.getElementById('finalClaimCode').textContent = seasonResults.claimCode;

    // Save reflection answers if any
    if (answers && Object.keys(answers).length > 0) {
        CapCrash.Storage.saveReflectionAnswers(config.key, seasonResults.tier, seasonResults.claimCode, answers);
    }

    // Show reflection summary if answers exist
    var summaryEl = document.getElementById('reflectionSummary');
    if (summaryEl && answers && Object.keys(answers).length > 0) {
        var html = '<h4>Your Reflection Answers</h4>';
        for (var key in answers) {
            html += '<div class="reflection-answer-summary">';
            html += '<p class="reflection-q"><strong>Q:</strong> ' + answers[key].question + '</p>';
            html += '<p class="reflection-a"><strong>A:</strong> ' + (answers[key].answer || '(skipped)') + '</p>';
            html += '</div>';
        }
        summaryEl.innerHTML = html;
        summaryEl.style.display = 'block';
    }
};

function simulateSeason() {
    var config = gameState.config;
    var qpts = gameState.totalQPts;
    var capUsed = gameState.totalPayroll;
    var capEfficiency = ((config.salaryCap - capUsed) / config.salaryCap) * 100;
    var stars = gameState.starsKept;
    var thresholds = config.seasonTierThresholds;

    var hasLeBron = gameState.players.find(function(p) { return p.id === 101 && p.status === 'Sign'; });
    var hasCurry = gameState.players.find(function(p) { return p.id === 102 && p.status === 'Sign'; });
    var hasEliteFA = hasLeBron || hasCurry;

    var tier, record, playoff, claimCode, description;

    if (qpts >= thresholds.dynasty && capEfficiency > 15) {
        tier = 'Dynasty';
        record = '67-15';
        playoff = '\u{1F3C6} NBA CHAMPIONS! Finals MVP performance!';
        claimCode = config.claimCodePrefix + '-DYNASTY2026';
        description = 'Dominant season! Elite roster with incredible cap management!';
    } else if (qpts >= thresholds.championship || (qpts >= thresholds.contender && capEfficiency > 20)) {
        tier = 'Championship';
        record = '62-20';
        playoff = '\u{1F3C6} NBA CHAMPIONS! Hard-fought Finals victory!';
        claimCode = config.claimCodePrefix + '-CHAMPS2026';
        description = 'Championship season! Outstanding roster construction!';
    } else if (qpts >= thresholds.superteam && stars >= 3) {
        tier = 'Superteam';
        record = '58-24';
        playoff = '\u{1F948} NBA Finals! Lost in 7 games but great run!';
        claimCode = config.claimCodePrefix + '-FINALS2026';
        description = 'Superstar-loaded roster! Made it to the Finals!';
    } else if (qpts >= thresholds.contender) {
        tier = 'Contender';
        record = '56-26';
        playoff = '\u{1F949} Conference Finals! Lost in 6 games.';
        claimCode = config.claimCodePrefix + '-CONTEND2026';
        description = 'Strong contender! Great balance of talent and value!';
    } else if (qpts >= thresholds.playoff) {
        tier = 'Playoff Team';
        record = '51-31';
        playoff = '\u{1F3C0} Second Round! Lost in 5 games.';
        claimCode = config.claimCodePrefix + '-PLAYOFFS2026';
        description = 'Solid playoff team! Good foundation to build on.';
    } else {
        tier = 'Scrappy Team';
        record = '46-36';
        playoff = '\u{1F3AF} First Round! Lost in 6 games but made it!';
        claimCode = config.claimCodePrefix + '-SCRAPPY2026';
        description = 'Made the playoffs with smart cap management!';
    }

    // Bonus for elite FA signings
    if (hasEliteFA && tier === 'Championship') {
        tier = 'All-Star Dynasty';
        claimCode = config.claimCodePrefix + '-ALLSTAR2026';
        description = 'Legendary roster with hall of fame talent!';
    }

    return { tier: tier, record: record, playoff: playoff, claimCode: claimCode, description: description };
}

// --- Confetti ---
function createConfetti(tier) {
    var container = document.getElementById('confetti');
    container.innerHTML = '';

    var colors = ['#F58426', '#006BB6', '#BEC0C2', '#FFD700'];
    var count = 50;

    // More confetti for higher tiers
    if (tier === 'Dynasty' || tier === 'All-Star Dynasty') {
        count = 100;
        colors.push('#FF6B6B', '#4ECDC4', '#45B7D1');
    } else if (tier === 'Championship') {
        count = 80;
        colors.push('#FFD700');
    }

    for (var i = 0; i < count; i++) {
        var confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.position = 'absolute';
        confetti.style.width = (Math.random() * 8 + 6) + 'px';
        confetti.style.height = (Math.random() * 8 + 6) + 'px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.opacity = Math.random() * 0.5 + 0.5;
        confetti.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.animation = 'confettiFall ' + (2 + Math.random() * 3) + 's linear infinite';
        confetti.style.animationDelay = Math.random() * 2 + 's';

        container.appendChild(confetti);
    }

    // Add confetti keyframe if not already present
    if (!document.querySelector('#confettiStyle')) {
        var style = document.createElement('style');
        style.id = 'confettiStyle';
        style.textContent = '@keyframes confettiFall { to { top: 100%; transform: translateY(100%) rotate(720deg); } }';
        document.head.appendChild(style);
    }
}

// --- Particles ---
function createParticles() {
    var container = document.getElementById('particles');
    if (!container) return;

    for (var i = 0; i < 30; i++) {
        var particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.backgroundColor = i % 2 === 0 ? '#F58426' : '#006BB6';
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animation = 'float ' + (5 + Math.random() * 10) + 's ease-in-out infinite';
        particle.style.animationDelay = Math.random() * 5 + 's';
        particle.style.opacity = '0.6';
        container.appendChild(particle);
    }

    if (!document.querySelector('#particleStyle')) {
        var style = document.createElement('style');
        style.id = 'particleStyle';
        style.textContent = '@keyframes float { 0%, 100% { transform: translateY(0) translateX(0); } 25% { transform: translateY(-20px) translateX(10px); } 50% { transform: translateY(-10px) translateX(-10px); } 75% { transform: translateY(-30px) translateX(5px); } }';
        document.head.appendChild(style);
    }
}

// --- Utility ---
function animateNumber(elementId, targetValue) {
    var element = document.getElementById(elementId);
    var currentValue = parseInt(element.textContent) || 0;
    var difference = targetValue - currentValue;
    var duration = 500;
    var steps = 20;
    var stepValue = difference / steps;
    var stepDuration = duration / steps;
    var currentStep = 0;

    var interval = setInterval(function() {
        currentStep++;
        var newValue = Math.round(currentValue + (stepValue * currentStep));
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

// --- Print Summary ---
function printSummary() {
    var printContent = CapCrash.Reflection.getPrintableSummary(gameState.seasonResults, gameState.config);
    var printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Cap Crash Summary</title><style>body{font-family:sans-serif;padding:20px;} .print-question{margin:15px 0;padding:10px;border:1px solid #ddd;border-radius:8px;} h2{color:#006BB6;} h3{color:#F58426;margin-top:20px;}</style></head><body>' + printContent + '</body></html>');
    printWindow.document.close();
    printWindow.print();
}

// --- Event Listeners ---
document.getElementById('resetBtn').addEventListener('click', function() {
    if (confirm('Are you sure you want to reset the game? Your progress will be lost.')) {
        CapCrash.Storage.clearCurrentGame();
        initializeGame();
    }
});

document.getElementById('undoBtn').addEventListener('click', function() {
    undo();
});

document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('successModal').classList.remove('show');
});

document.getElementById('successModal').addEventListener('click', function(e) {
    if (e.target.id === 'successModal') {
        document.getElementById('successModal').classList.remove('show');
    }
});

// "Next: Reflect" button in results step
document.getElementById('goToReflectionBtn').addEventListener('click', function() {
    goToReflection();
});

// "Build Another Roster" in claim code step
document.getElementById('buildAnotherBtn').addEventListener('click', function() {
    document.getElementById('successModal').classList.remove('show');
    CapCrash.Storage.clearCurrentGame();
    initializeGame();
});

// Print button
var printBtn = document.getElementById('printSummaryBtn');
if (printBtn) {
    printBtn.addEventListener('click', printSummary);
}

// Replay tutorial button
var replayBtn = document.getElementById('replayTutorialBtn');
if (replayBtn) {
    replayBtn.addEventListener('click', function() {
        CapCrash.Tutorial.start();
    });
}
