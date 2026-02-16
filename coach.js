// Knicks Cap Crash v2 - Coach's Corner (Educational Scaffolding)
window.CapCrash = window.CapCrash || {};

CapCrash.GLOSSARY = {
    'salary-cap': {
        term: 'Salary Cap',
        definition: 'The maximum amount of money a team can spend on player salaries. Think of it like a budget for your team — you can\'t go over it unless you have a special exception.',
        example: 'If the cap is $120M, all your signed players\' salaries must add up to $120M or less.'
    },
    'q-points': {
        term: 'Quality Points (Q-Pts)',
        definition: 'A number that shows how good a player is. Higher Q-Points = better player. Stars have the most Q-Points.',
        example: 'Jalen Brunson has 18 Q-Points because he\'s one of the best players on the team.'
    },
    'bird-rights': {
        term: 'Bird Rights',
        definition: 'A special rule that lets you re-sign your OWN players even if you\'re over the salary cap. Think of it like a loyalty discount — because these players already played for the Knicks, you get special permission to keep them.',
        example: 'If you sign Jalen Brunson using Bird Rights, his $25M salary won\'t count against your cap.'
    },
    'mle': {
        term: 'Mid-Level Exception (MLE)',
        definition: 'A special deal you can use on ONE player to cut their salary in half. It\'s like having a 50%-off coupon, but you can only use it once!',
        example: 'Using MLE on a $15M player makes their cap hit only $7.5M.'
    },
    'vet-min': {
        term: 'Veteran Minimum (Vet Min)',
        definition: 'A deal where experienced players agree to play for just $2M. Only works for players with low Q-Points (under 5). You can use it on up to 3 players.',
        example: 'Signing a veteran for $2M instead of $3M might not seem like much, but small savings add up!'
    },
    'trade': {
        term: 'Trade',
        definition: 'Sending a player away from your team. When you trade a Knicks player, they leave and you don\'t have to pay their salary anymore.',
        example: 'Trading an expensive player frees up cap space to sign someone else.'
    }
};

CapCrash.Coach = {
    tips: [],
    currentTipIndex: 0,
    moveCount: 0,
    isVisible: false,
    lastAction: null,

    init: function(config) {
        this.config = config;
        this.moveCount = 0;
        this.tips = [];
        this.currentTipIndex = 0;
        this.lastAction = null;

        if (config.hintsMode === 'none') {
            this.hide();
            return;
        }

        this.render();
    },

    render: function() {
        // Remove existing coach if any
        var existing = document.getElementById('coachPanel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'coachPanel';
        panel.className = 'coach-panel';
        panel.innerHTML =
            '<div class="coach-header">' +
                '<span class="coach-avatar">\u{1F3C0}</span>' +
                '<span class="coach-title">Coach\'s Corner</span>' +
                '<button class="coach-close" onclick="CapCrash.Coach.toggle()">\u00D7</button>' +
            '</div>' +
            '<div class="coach-body" id="coachBody">' +
                '<p class="coach-tip" id="coachTip">Welcome, GM! Start building your roster by signing players below.</p>' +
            '</div>' +
            '<div class="coach-nav" id="coachNav" style="display:none;">' +
                '<button onclick="CapCrash.Coach.prevTip()">\u2190</button>' +
                '<span id="coachTipCount">1/1</span>' +
                '<button onclick="CapCrash.Coach.nextTip()">\u2192</button>' +
            '</div>';

        document.body.appendChild(panel);

        // Add hint button to sidebar if on-request mode
        if (this.config.hintsMode === 'on-request') {
            var sidebar = document.querySelector('.rules-sidebar');
            if (sidebar && !document.getElementById('hintBtn')) {
                var hintBtn = document.createElement('button');
                hintBtn.id = 'hintBtn';
                hintBtn.className = 'hint-btn';
                hintBtn.textContent = '\u{1F4A1} Need a Hint?';
                hintBtn.onclick = function() { CapCrash.Coach.showHint(); };
                sidebar.insertBefore(hintBtn, document.getElementById('resetBtn'));
            }
        }

        this.isVisible = true;
    },

    toggle: function() {
        var panel = document.getElementById('coachPanel');
        if (!panel) return;
        this.isVisible = !this.isVisible;
        panel.classList.toggle('collapsed', !this.isVisible);
    },

    hide: function() {
        var panel = document.getElementById('coachPanel');
        if (panel) panel.style.display = 'none';
    },

    show: function() {
        var panel = document.getElementById('coachPanel');
        if (panel) panel.style.display = '';
    },

    recordMove: function() {
        this.moveCount++;
    },

    // Called after every game state update
    evaluate: function(gameState) {
        if (this.config.hintsMode === 'none') return;

        this.tips = [];
        var config = this.config;

        // Generate contextual tips based on game state
        if (gameState.playerCount === 0 && this.moveCount === 0) {
            this.tips.push('Start by looking at the Knicks players. They have Bird Rights, which means their salary doesn\'t count against the cap!');
        }

        if (this.moveCount >= 2 && gameState.starsKept === 0) {
            this.tips.push('Don\'t forget to sign your stars! You need at least ' + config.starsRequired + ' of the 3 Knicks stars (Brunson, Towns, Bridges).');
        }

        if (gameState.playerCount >= 3 && gameState.totalQPts < 30) {
            this.tips.push('Your Quality Points are low. Look for high Q-Point players — stars like Brunson (18 Q-Pts) and Towns (18 Q-Pts) are great picks!');
        }

        if (gameState.payrollWithoutBirdRights > config.salaryCap * 0.9 && gameState.payrollWithoutBirdRights <= config.salaryCap) {
            this.tips.push('You\'re getting close to the salary cap! Consider using the MLE (50% off) or Vet Min ($2M deals) to save money.');
        }

        if (gameState.payrollWithoutBirdRights > config.salaryCap) {
            this.tips.push('You\'re OVER the salary cap! You need to cut some expensive players or use cap exceptions. Remember, Bird Rights players don\'t count against the cap.');
        }

        if (gameState.playerCount > 0 && gameState.playerCount < config.rosterMin && this.moveCount >= 5) {
            this.tips.push('You need at least ' + config.rosterMin + ' players on your roster. Keep signing!');
        }

        if (gameState.playerCount > config.rosterMax) {
            this.tips.push('Too many players! Your roster can have at most ' + config.rosterMax + ' players. Cut or trade someone to get under the limit.');
        }

        if (!gameState.mleUsed && gameState.payrollWithoutBirdRights > config.salaryCap * 0.7 && this.moveCount >= 3) {
            this.tips.push('Tip: You haven\'t used your MLE yet! Check the "Use MLE (50% Off!)" box on an eligible player to cut their salary in half.');
        }

        if (gameState.vetMinCount === 0 && this.moveCount >= 5 && gameState.playerCount < config.rosterMin) {
            this.tips.push('Need more players cheaply? Use Vet Min deals to sign up to ' + config.vetMinSlots + ' players for just $2M each!');
        }

        if (gameState.totalQPts >= config.qpMinimum && gameState.playerCount >= config.rosterMin && gameState.playerCount <= config.rosterMax && gameState.starsKept >= config.starsRequired) {
            this.tips.push('Looking good, GM! Check if all 4 rules are passing — you might be ready to complete the season!');
        }

        // Default tip if nothing specific
        if (this.tips.length === 0) {
            this.tips.push('Keep building! Balance quality and cost to create a winning roster.');
        }

        // In auto mode, show tips automatically
        if (this.config.hintsMode === 'auto' && this.moveCount > 0 && this.moveCount % this.config.hintDelay === 0) {
            this.showTip();
        }
    },

    showHint: function() {
        // For on-request mode
        this.showTip();
        var panel = document.getElementById('coachPanel');
        if (panel) {
            panel.classList.add('highlight-pulse');
            setTimeout(function() { panel.classList.remove('highlight-pulse'); }, 1000);
        }
    },

    showTip: function() {
        if (this.tips.length === 0) return;
        this.currentTipIndex = 0;
        this.updateTipDisplay();
        this.show();
        this.isVisible = true;
        var panel = document.getElementById('coachPanel');
        if (panel) panel.classList.remove('collapsed');
    },

    updateTipDisplay: function() {
        var tipEl = document.getElementById('coachTip');
        var navEl = document.getElementById('coachNav');
        var countEl = document.getElementById('coachTipCount');

        if (!tipEl) return;

        tipEl.textContent = this.tips[this.currentTipIndex] || '';

        if (this.tips.length > 1 && navEl) {
            navEl.style.display = 'flex';
            if (countEl) countEl.textContent = (this.currentTipIndex + 1) + '/' + this.tips.length;
        } else if (navEl) {
            navEl.style.display = 'none';
        }
    },

    nextTip: function() {
        if (this.currentTipIndex < this.tips.length - 1) {
            this.currentTipIndex++;
            this.updateTipDisplay();
        }
    },

    prevTip: function() {
        if (this.currentTipIndex > 0) {
            this.currentTipIndex--;
            this.updateTipDisplay();
        }
    },

    // Generate MLE tooltip for a specific player
    getMLETooltip: function(player) {
        var discount = this.config.mleDiscount;
        var savings = player.salary * discount;
        var newSalary = player.salary - savings;
        return 'Using MLE on ' + player.name + ' cuts the salary from $' + formatSalary(player.salary) + ' to $' + formatSalary(newSalary) + '. You save $' + formatSalary(savings) + '!';
    },

    // Generate Vet Min tooltip for a specific player
    getVetMinTooltip: function(player) {
        var savings = player.salary - this.config.vetMinCost;
        if (savings <= 0) {
            return player.name + '\'s salary is already at the Vet Min level ($2M). No extra savings here.';
        }
        return 'Vet Min sets ' + player.name + '\'s salary to just $' + formatSalary(this.config.vetMinCost) + ', saving you $' + formatSalary(savings) + '!';
    },

    // Generate Bird Rights tooltip for a specific player
    getBirdRightsTooltip: function(player) {
        if (this.config.birdRightsFee > 0) {
            return player.name + ' has Bird Rights, so their salary doesn\'t count against the cap. But on Legend mode, there\'s a $' + formatSalary(this.config.birdRightsFee) + ' processing fee!';
        }
        return player.name + ' has Bird Rights because they played for the Knicks. Their $' + formatSalary(player.salary) + ' salary does NOT count against the salary cap!';
    },

    // Show glossary popup
    showGlossary: function(termKey) {
        var term = CapCrash.GLOSSARY[termKey];
        if (!term) return;

        // Remove existing popup
        var existing = document.getElementById('glossaryPopup');
        if (existing) existing.remove();

        var popup = document.createElement('div');
        popup.id = 'glossaryPopup';
        popup.className = 'glossary-popup';
        popup.innerHTML =
            '<div class="glossary-content">' +
                '<div class="glossary-header">' +
                    '<h3>' + term.term + '</h3>' +
                    '<button class="glossary-close" onclick="CapCrash.Coach.closeGlossary()">\u00D7</button>' +
                '</div>' +
                '<p class="glossary-definition">' + term.definition + '</p>' +
                '<p class="glossary-example"><strong>Example:</strong> ' + term.example + '</p>' +
            '</div>';

        document.body.appendChild(popup);

        // Close on outside click
        popup.addEventListener('click', function(e) {
            if (e.target === popup) CapCrash.Coach.closeGlossary();
        });
    },

    closeGlossary: function() {
        var popup = document.getElementById('glossaryPopup');
        if (popup) popup.remove();
    },

    // Show tooltip near an element
    showTooltip: function(element, text) {
        this.hideTooltip();

        var tooltip = document.createElement('div');
        tooltip.id = 'coachTooltip';
        tooltip.className = 'coach-tooltip';
        tooltip.textContent = text;

        document.body.appendChild(tooltip);

        // Position near the element
        var rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.bottom + 8) + 'px';

        // Ensure tooltip stays on screen
        var tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth - 10) {
            tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
        }
    },

    hideTooltip: function() {
        var tooltip = document.getElementById('coachTooltip');
        if (tooltip) tooltip.remove();
    }
};
