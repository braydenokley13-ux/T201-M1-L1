// Knicks Cap Crash v2 - Post-Game Reflection Questions
window.CapCrash = window.CapCrash || {};

CapCrash.Reflection = {
    currentQuestions: [],
    answers: {},

    // Question bank - questions are selected dynamically based on game state
    tradeoffQuestions: [
        {
            id: 'cut_expensive',
            generate: function(gameState, config) {
                // Find the most expensive player that was cut
                var cutPlayers = gameState.players.filter(function(p) {
                    return p.status === 'Cut' && p.salary > 10000000;
                }).sort(function(a, b) { return b.salary - a.salary; });

                if (cutPlayers.length === 0) return null;
                var player = cutPlayers[0];
                return {
                    question: 'You cut ' + player.name + ', which saved $' + formatSalary(player.salary) + '. What would have happened to your roster if you kept them instead?',
                    id: 'cut_expensive'
                };
            }
        },
        {
            id: 'best_value',
            generate: function(gameState) {
                // Find the player with best Q-Pts per dollar
                var signed = gameState.players.filter(function(p) {
                    return p.status === 'Sign';
                });
                if (signed.length === 0) return null;

                var bestValue = signed.reduce(function(best, p) {
                    var effectiveSalary = p.useMLE ? p.salary * 0.5 : (p.useVetMin ? 2000000 : p.salary);
                    var ratio = p.qpts / effectiveSalary;
                    return ratio > best.ratio ? { player: p, ratio: ratio } : best;
                }, { player: signed[0], ratio: 0 });

                return {
                    question: 'Which player on your roster gave you the best value (most Q-Points for the money)? Explain why ' + bestValue.player.name + ' was a smart pick.',
                    id: 'best_value'
                };
            }
        },
        {
            id: 'mle_choice',
            generate: function(gameState) {
                if (!gameState.mleUsed) return null;
                var mlePlayer = gameState.players.find(function(p) { return p.useMLE; });
                if (!mlePlayer) return null;
                return {
                    question: 'You used the Mid-Level Exception on ' + mlePlayer.name + ', saving $' + formatSalary(mlePlayer.salary * 0.5) + '. Why was this a smart choice? Could you have used it on someone else instead?',
                    id: 'mle_choice'
                };
            }
        },
        {
            id: 'vet_min_choice',
            generate: function(gameState) {
                var vetMinPlayers = gameState.players.filter(function(p) { return p.useVetMin; });
                if (vetMinPlayers.length === 0) return null;
                var names = vetMinPlayers.map(function(p) { return p.name; }).join(', ');
                return {
                    question: 'You signed ' + names + ' on Vet Min deals. How did these affordable players help you build a better overall team?',
                    id: 'vet_min_choice'
                };
            }
        }
    ],

    whatIfQuestions: [
        {
            id: 'lower_cap',
            generate: function(gameState, config) {
                var lowerCap = config.salaryCap - 20000000;
                return {
                    question: 'If the salary cap dropped to $' + formatSalary(lowerCap) + ', which player would you cut first and why?',
                    id: 'lower_cap'
                };
            }
        },
        {
            id: 'star_injury',
            generate: function(gameState) {
                var signedStars = gameState.players.filter(function(p) {
                    return p.status === 'Sign' && p.isStar;
                });
                if (signedStars.length === 0) return null;
                var star = signedStars[Math.floor(Math.random() * signedStars.length)];
                return {
                    question: 'If ' + star.name + ' got injured for the season, how would that change your team? Would you need to make trades?',
                    id: 'star_injury'
                };
            }
        },
        {
            id: 'new_exception',
            generate: function() {
                return {
                    question: 'If you could create one new rule or exception for the salary cap, what would it be and why?',
                    id: 'new_exception'
                };
            }
        },
        {
            id: 'no_exceptions',
            generate: function(gameState, config) {
                return {
                    question: 'What would happen if there were NO cap exceptions at all? Could you still build a winning team under the $' + formatSalary(config.salaryCap) + ' cap? Why or why not?',
                    id: 'no_exceptions'
                };
            }
        }
    ],

    conceptQuestions: [
        {
            id: 'explain_bird_rights',
            generate: function() {
                return {
                    question: 'Explain in your own words what Bird Rights are and why they help a team.',
                    id: 'explain_bird_rights'
                };
            }
        },
        {
            id: 'mle_vs_vetmin',
            generate: function() {
                return {
                    question: 'What is the difference between the Mid-Level Exception and the Veteran Minimum? When would you use each one?',
                    id: 'mle_vs_vetmin'
                };
            }
        },
        {
            id: 'why_salary_cap',
            generate: function() {
                return {
                    question: 'Why does the NBA have a salary cap? What would happen if rich teams could spend unlimited money?',
                    id: 'why_salary_cap'
                };
            }
        }
    ],

    // Select questions based on game state and difficulty
    selectQuestions: function(gameState, config) {
        var questions = [];

        // Always include 1 trade-off question
        var tradeoff = this.pickRandomValid(this.tradeoffQuestions, gameState, config);
        if (tradeoff) questions.push(tradeoff);

        // Always include 1 what-if question
        var whatIf = this.pickRandomValid(this.whatIfQuestions, gameState, config);
        if (whatIf) questions.push(whatIf);

        // Include 1 concept question on Rookie/Pro only
        if (config.key !== 'legend') {
            var concept = this.pickRandomValid(this.conceptQuestions, gameState, config);
            if (concept) questions.push(concept);
        }

        this.currentQuestions = questions;
        return questions;
    },

    pickRandomValid: function(pool, gameState, config) {
        var shuffled = pool.slice().sort(function() { return 0.5 - Math.random(); });
        for (var i = 0; i < shuffled.length; i++) {
            var result = shuffled[i].generate(gameState, config);
            if (result) return result;
        }
        return null;
    },

    // Render the reflection step in the modal
    renderReflectionStep: function(gameState, config) {
        var questions = this.selectQuestions(gameState, config);
        this.answers = {};

        var html = '<div class="reflection-container">';
        html += '<h3 class="reflection-title">\u{1F4DD} Reflect on Your Strategy</h3>';

        if (!config.reflectionRequired) {
            html += '<p class="reflection-skip-note">Reflection is optional on Rookie mode. <button class="reflection-skip-btn" onclick="CapCrash.Reflection.skip()">Skip to Claim Code \u2192</button></p>';
        }

        questions.forEach(function(q, i) {
            html += '<div class="reflection-question">';
            html += '<label class="reflection-label">' + (i + 1) + '. ' + q.question + '</label>';
            html += '<textarea class="reflection-input" id="reflection-' + q.id + '" placeholder="Type your answer here (1-2 sentences)..." rows="3" data-question-id="' + q.id + '"></textarea>';
            html += '</div>';
        });

        html += '<button class="modal-btn reflection-submit-btn" onclick="CapCrash.Reflection.submit()">';
        html += config.reflectionRequired ? '\u{1F3C6} Submit & See Claim Code' : '\u{1F3C6} Submit Answers';
        html += '</button>';
        html += '</div>';

        return html;
    },

    submit: function() {
        var self = this;
        var allAnswered = true;

        this.currentQuestions.forEach(function(q) {
            var textarea = document.getElementById('reflection-' + q.id);
            if (textarea) {
                self.answers[q.id] = {
                    question: q.question,
                    answer: textarea.value.trim()
                };
                if (!textarea.value.trim()) allAnswered = false;
            }
        });

        // On required difficulties, check that at least some text was entered
        var config = CapCrash.getSelectedDifficulty();
        if (config.reflectionRequired && !allAnswered) {
            // Highlight empty fields
            this.currentQuestions.forEach(function(q) {
                var textarea = document.getElementById('reflection-' + q.id);
                if (textarea && !textarea.value.trim()) {
                    textarea.classList.add('reflection-input-error');
                    textarea.placeholder = 'Please answer this question to see your claim code...';
                }
            });
            return;
        }

        // Save answers and show claim code
        this.showClaimCodeStep();
    },

    skip: function() {
        this.answers = {};
        this.showClaimCodeStep();
    },

    showClaimCodeStep: function() {
        // This will be called from game.js to transition to the claim code display
        if (typeof window.showClaimCodeFinal === 'function') {
            window.showClaimCodeFinal(this.answers);
        }
    },

    // Generate a printable summary
    getPrintableSummary: function(seasonResults, config) {
        var html = '<div class="print-summary">';
        html += '<h2>Knicks Cap Crash - Game Summary</h2>';
        html += '<p><strong>Difficulty:</strong> ' + config.label + '</p>';
        html += '<p><strong>Tier:</strong> ' + seasonResults.tier + '</p>';
        html += '<p><strong>Claim Code:</strong> ' + seasonResults.claimCode + '</p>';
        html += '<p><strong>Date:</strong> ' + new Date().toLocaleDateString() + '</p>';

        if (Object.keys(this.answers).length > 0) {
            html += '<h3>Reflection Answers</h3>';
            for (var key in this.answers) {
                var a = this.answers[key];
                html += '<div class="print-question">';
                html += '<p><strong>Q:</strong> ' + a.question + '</p>';
                html += '<p><strong>A:</strong> ' + (a.answer || '(skipped)') + '</p>';
                html += '</div>';
            }
        }

        html += '</div>';
        return html;
    }
};
