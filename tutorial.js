// Knicks Cap Crash v2 - Guided Tutorial / Onboarding
window.CapCrash = window.CapCrash || {};

CapCrash.Tutorial = {
    steps: [
        {
            title: 'Welcome, GM!',
            text: 'You\'re the new General Manager of the New York Knicks. Let\'s learn how to build a championship roster!',
            highlight: '.scoreboard',
            position: 'below'
        },
        {
            title: 'Your Dashboard',
            text: 'This scoreboard tracks your Total Payroll (how much you\'re spending), Cap Space (budget remaining), Quality Points (team strength), and Player Count.',
            highlight: '.scoreboard',
            position: 'below'
        },
        {
            title: 'Sign Your First Player',
            text: 'Let\'s sign Jalen Brunson! Find his card below and change the dropdown from "CUT" to "SIGN". He\'s a star player with 18 Q-Points!',
            highlight: '#player-1',
            position: 'above',
            interactive: true,
            waitFor: function() {
                // Wait for Brunson (id 1) to be signed
                if (!window.gameState) return false;
                var player = window.gameState.players.find(function(p) { return p.id === 1; });
                return player && player.status === 'Sign';
            }
        },
        {
            title: 'See the Impact!',
            text: 'Great job! Notice your Q-Points went up and your payroll changed. Brunson has Bird Rights, so his salary doesn\'t count against the cap — that\'s a huge advantage!',
            highlight: '.scoreboard',
            position: 'below'
        },
        {
            title: 'Check the Rules',
            text: 'The sidebar shows 4 rules you need to pass. Green checkmark = you\'re good. Red X = keep working. You need ALL 4 rules to pass to win!',
            highlight: '.rules-sidebar',
            position: 'left'
        },
        {
            title: 'Watch the Progress Bars',
            text: 'These bars show how close you are to the salary cap limit and the Quality Points goal. Blue/orange = safe. Red = over the limit!',
            highlight: '.progress-container',
            position: 'below'
        },
        {
            title: 'Cap Exceptions',
            text: 'When you sign certain players, you\'ll see checkboxes for MLE (50% off one player) and Vet Min ($2M deals). These are powerful tools to save money!',
            highlight: '.info-box',
            position: 'left'
        },
        {
            title: 'Go Build Your Team!',
            text: 'You\'ve got the basics! Sign players, manage your budget, and try to meet all 4 rules. Good luck, GM!',
            highlight: null,
            position: 'center'
        }
    ],

    currentStep: 0,
    isActive: false,
    overlay: null,
    bubble: null,
    pollInterval: null,

    shouldAutoStart: function() {
        return !CapCrash.Storage.isTutorialComplete();
    },

    start: function() {
        this.isActive = true;
        this.currentStep = 0;
        this.createOverlay();
        this.showStep(0);
    },

    createOverlay: function() {
        // Remove existing
        var existing = document.getElementById('tutorialOverlay');
        if (existing) existing.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorialOverlay';
        this.overlay.className = 'tutorial-overlay';

        this.bubble = document.createElement('div');
        this.bubble.id = 'tutorialBubble';
        this.bubble.className = 'tutorial-bubble';

        document.body.appendChild(this.overlay);
        document.body.appendChild(this.bubble);
    },

    showStep: function(index) {
        var step = this.steps[index];
        if (!step) { this.end(); return; }

        this.currentStep = index;

        // Update bubble content
        var isLast = index === this.steps.length - 1;
        var isFirst = index === 0;
        var buttonText = step.interactive ? 'Waiting for your move...' : (isLast ? 'Let\'s Go!' : 'Next');
        var buttonDisabled = step.interactive ? 'disabled' : '';

        this.bubble.innerHTML =
            '<div class="tutorial-step-indicator">' +
                '<span>Step ' + (index + 1) + ' of ' + this.steps.length + '</span>' +
                '<div class="tutorial-dots">' + this.renderDots(index) + '</div>' +
            '</div>' +
            '<h3 class="tutorial-title">' + step.title + '</h3>' +
            '<p class="tutorial-text">' + step.text + '</p>' +
            '<div class="tutorial-buttons">' +
                (isFirst ? '' : '<button class="tutorial-btn tutorial-btn-secondary" onclick="CapCrash.Tutorial.prevStep()">Back</button>') +
                '<button class="tutorial-btn tutorial-btn-primary" id="tutorialNextBtn" onclick="CapCrash.Tutorial.nextStep()" ' + buttonDisabled + '>' + buttonText + '</button>' +
                '<button class="tutorial-btn tutorial-btn-skip" onclick="CapCrash.Tutorial.end()">Skip Tutorial</button>' +
            '</div>';

        // Position bubble and spotlight
        if (step.highlight) {
            var target = document.querySelector(step.highlight);
            if (target) {
                this.spotlight(target, step.position);
                // Scroll target into view
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                this.clearSpotlight();
                this.centerBubble();
            }
        } else {
            this.clearSpotlight();
            this.centerBubble();
        }

        // If interactive step, poll for completion
        if (step.interactive && step.waitFor) {
            this.startPolling(step.waitFor);
        } else {
            this.stopPolling();
        }
    },

    renderDots: function(activeIndex) {
        var html = '';
        for (var i = 0; i < this.steps.length; i++) {
            var cls = i === activeIndex ? 'tutorial-dot active' : (i < activeIndex ? 'tutorial-dot completed' : 'tutorial-dot');
            html += '<span class="' + cls + '"></span>';
        }
        return html;
    },

    spotlight: function(target, position) {
        var rect = target.getBoundingClientRect();
        var scrollY = window.scrollY || window.pageYOffset;
        var scrollX = window.scrollX || window.pageXOffset;

        // Create spotlight cutout using box-shadow on the overlay
        this.overlay.style.display = 'block';
        this.overlay.style.position = 'fixed';

        // Position a spotlight element over the target
        var spotlightEl = document.getElementById('tutorialSpotlight');
        if (!spotlightEl) {
            spotlightEl = document.createElement('div');
            spotlightEl.id = 'tutorialSpotlight';
            spotlightEl.className = 'tutorial-spotlight';
            document.body.appendChild(spotlightEl);
        }

        spotlightEl.style.top = rect.top - 10 + 'px';
        spotlightEl.style.left = rect.left - 10 + 'px';
        spotlightEl.style.width = (rect.width + 20) + 'px';
        spotlightEl.style.height = (rect.height + 20) + 'px';
        spotlightEl.style.display = 'block';

        // Position bubble
        this.bubble.style.display = 'block';
        var bubbleWidth = 380;
        var bubbleHeight = this.bubble.offsetHeight || 250;

        switch (position) {
            case 'below':
                this.bubble.style.top = (rect.bottom + 20) + 'px';
                this.bubble.style.left = Math.max(10, rect.left + rect.width / 2 - bubbleWidth / 2) + 'px';
                break;
            case 'above':
                this.bubble.style.top = Math.max(10, rect.top - bubbleHeight - 20) + 'px';
                this.bubble.style.left = Math.max(10, rect.left + rect.width / 2 - bubbleWidth / 2) + 'px';
                break;
            case 'left':
                this.bubble.style.top = rect.top + 'px';
                this.bubble.style.left = Math.max(10, rect.left - bubbleWidth - 20) + 'px';
                break;
            default:
                this.centerBubble();
        }

        // Keep bubble on screen
        var bubbleRect = this.bubble.getBoundingClientRect();
        if (bubbleRect.right > window.innerWidth - 10) {
            this.bubble.style.left = (window.innerWidth - bubbleWidth - 20) + 'px';
        }
        if (bubbleRect.bottom > window.innerHeight - 10) {
            this.bubble.style.top = (window.innerHeight - bubbleHeight - 20) + 'px';
        }
    },

    clearSpotlight: function() {
        this.overlay.style.display = 'block';
        var spotlightEl = document.getElementById('tutorialSpotlight');
        if (spotlightEl) spotlightEl.style.display = 'none';
    },

    centerBubble: function() {
        this.bubble.style.display = 'block';
        this.bubble.style.top = '50%';
        this.bubble.style.left = '50%';
        this.bubble.style.transform = 'translate(-50%, -50%)';
    },

    nextStep: function() {
        if (this.currentStep < this.steps.length - 1) {
            this.bubble.style.transform = '';
            this.showStep(this.currentStep + 1);
        } else {
            this.end();
        }
    },

    prevStep: function() {
        if (this.currentStep > 0) {
            this.bubble.style.transform = '';
            this.showStep(this.currentStep - 1);
        }
    },

    startPolling: function(condition) {
        this.stopPolling();
        var self = this;
        this.pollInterval = setInterval(function() {
            if (condition()) {
                self.stopPolling();
                // Enable the next button
                var btn = document.getElementById('tutorialNextBtn');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Next';
                }
                // Auto-advance after a short delay
                setTimeout(function() { self.nextStep(); }, 800);
            }
        }, 300);
    },

    stopPolling: function() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    },

    end: function() {
        this.isActive = false;
        this.stopPolling();

        // Remove overlay elements
        if (this.overlay) this.overlay.remove();
        if (this.bubble) this.bubble.remove();
        var spotlightEl = document.getElementById('tutorialSpotlight');
        if (spotlightEl) spotlightEl.remove();

        this.overlay = null;
        this.bubble = null;

        // Mark complete in storage
        CapCrash.Storage.markTutorialComplete();
    }
};
