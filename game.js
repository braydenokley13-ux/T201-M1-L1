/* =====================================================================
   BOW SPORTS CAPITAL — CAP CRASH (Track 201, Grades 7–8)
   game.js — UI, student flow, and state.

   Flow (a phase state machine):
     role  →  build  →  (pressure moment)  →  finalize  →  report
              →  boardroom memo  →  completion summary  →  play again

   All simulation math lives in sim-engine.js (CapCrashEngine).
   Every DOM access is guarded so a student can never crash the app.
   ===================================================================== */

(function () {
  'use strict';

  var E = window.CapCrashEngine;
  var STORAGE_KEY = 'bscCapCrash201';

  // ---------- tiny safe DOM helpers ----------
  function $(id) { return document.getElementById(id); }
  function on(id, evt, fn) { var el = $(id); if (el) el.addEventListener(evt, fn); }
  function setText(id, t) { var el = $(id); if (el) el.textContent = t; }
  function show(id) { var el = $(id); if (el) el.classList.add('show'); }
  function hide(id) { var el = $(id); if (el) el.classList.remove('show'); }

  // ---------- safe storage ----------
  function safeGet() { try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; } }
  function safeSet(v) { try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* private mode / quota */ } }
  function safeRemove() { try { localStorage.removeItem(STORAGE_KEY); } catch (e) { } }

  function formatSalary(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '0';
    if (Math.abs(amount) >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    return amount.toLocaleString();
  }
  function fmtMoney(amount) {
    var sign = amount < 0 ? '-' : '';
    return sign + '$' + (Math.abs(amount) / 1000000).toFixed(1) + 'M';
  }

  // ---------- toast (replaces blocking alerts) ----------
  var toastTimer = null;
  function toast(msg, type) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, 2800);
  }

  // ===================================================================
  // STATE
  // ===================================================================
  var state = {
    phase: 'role',            // 'role' | 'build' | 'finalize'
    studentName: '',
    role: null,
    players: [],              // working copies of all players
    tradeReturns: [],         // players acquired via trade
    pendingTradePlayerId: null,
    pressureChoice: null,
    memo: '',
    // cached results from the most recent report (for memo/summary/replay)
    lastDisplay: null,
    lastGrade: null,
    lastSeason: null,
    strategyType: null
  };

  function freshPlayers() {
    if (!Array.isArray(window.playersData)) return [];
    return window.playersData.map(function (p) {
      return Object.assign({}, p, { status: 'Cut', useMLE: false, useVetMin: false });
    });
  }

  function getSignedPlayers() {
    var a = state.players.filter(function (p) { return p.status === 'Sign'; });
    var b = state.tradeReturns.filter(function (p) { return p.status === 'Sign'; });
    return a.concat(b);
  }

  // ===================================================================
  // INIT
  // ===================================================================
  document.addEventListener('DOMContentLoaded', function () {
    if (!E || !Array.isArray(window.playersData)) {
      // Fail gracefully rather than throwing.
      var grid = $('rosterGrid');
      if (grid) grid.innerHTML = '<p style="color:#fff;padding:20px;">Something went wrong loading the simulation. Please refresh the page.</p>';
      return;
    }

    state.players = freshPlayers();
    loadFromStorage();
    createParticles();
    bindEvents();
    renderRoleScreen();
    renderPlayers();
    renderPressureOptions();
    renderMemoChips();
    updateDashboard();
    routePhase();
    initTutorial();
  });

  // Decide which screen the student should see based on restored state.
  function routePhase() {
    if (!state.studentName || !state.role) {
      state.phase = 'role';
      show('roleScreen');
    } else {
      hide('roleScreen');
      if (state.phase === 'role') state.phase = 'build';
    }
    updateActionBar();
  }

  // ===================================================================
  // ROLE SETUP
  // ===================================================================
  function renderRoleScreen() {
    var input = $('gmNameInput');
    if (input && state.studentName) input.value = state.studentName;
    if (state.role) {
      var opts = document.querySelectorAll('.role-option');
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].getAttribute('data-role') === state.role) opts[i].classList.add('selected');
      }
    }
  }

  function bindRoleEvents() {
    var opts = document.querySelectorAll('.role-option');
    for (var i = 0; i < opts.length; i++) {
      opts[i].addEventListener('click', function () {
        for (var j = 0; j < opts.length; j++) opts[j].classList.remove('selected');
        this.classList.add('selected');
        state.role = this.getAttribute('data-role');
      });
    }

    on('startBuildBtn', 'click', function () {
      var input = $('gmNameInput');
      var name = input ? input.value.trim() : '';
      if (!name) name = 'GM'; // sensible default — never block the student
      state.studentName = name.slice(0, 24);
      if (!state.role) state.role = 'Balanced Architect'; // default style
      state.phase = 'build';
      hide('roleScreen');
      saveToStorage();
      updateDashboard();
      toast('Welcome, ' + state.studentName + '! Build your roster.', 'good');
      initTutorial();
    });
  }

  // ===================================================================
  // ROSTER RENDERING (the core interactive mechanic)
  // ===================================================================
  function renderPlayers() {
    var grid = $('rosterGrid');
    if (!grid) return;
    grid.innerHTML = '';

    var knicks = state.players.filter(function (p) { return p.isKnick; });
    var freeAgents = state.players.filter(function (p) { return !p.isKnick; });
    var tradeReturnIds = state.tradeReturns.map(function (p) { return p.id; });

    grid.appendChild(sectionHeader('🏀 YOUR PLAYERS', 'Re-sign or cut the players already on your books.'));
    knicks.forEach(function (p, i) { grid.appendChild(createPlayerCard(p, i, false)); });

    if (state.tradeReturns.length > 0) {
      grid.appendChild(sectionHeader('↔ ACQUIRED VIA TRADE', 'Players you traded for. Their contract is already active.'));
      state.tradeReturns.forEach(function (p, i) { grid.appendChild(createPlayerCard(p, knicks.length + i, true)); });
    }

    grid.appendChild(sectionHeader('⭐ FREE AGENTS', 'Open-market players you can sign to fill out the roster.'));
    var availableFAs = freeAgents.filter(function (p) { return tradeReturnIds.indexOf(p.id) === -1; });
    availableFAs.forEach(function (p, i) {
      grid.appendChild(createPlayerCard(p, knicks.length + state.tradeReturns.length + i, false));
    });
  }

  function sectionHeader(title, sub) {
    var s = document.createElement('div');
    s.className = 'player-section';
    s.innerHTML = '<h2 class="section-title">' + title + '</h2><p class="section-sub">' + sub + '</p>';
    return s;
  }

  function createPlayerCard(player, index, isTradeReturn) {
    var card = document.createElement('div');
    var statusClass = player.status === 'Cut' ? 'cut' : (player.status === 'Trade' ? 'traded' : '');
    var isFA = !player.isKnick && !isTradeReturn;
    card.className = 'player-card ' + (player.isStar ? 'star ' : '') + statusClass + (isFA ? ' free-agent' : '') + (isTradeReturn ? ' trade-return' : '');
    card.id = 'player-' + player.id;

    var displaySalary = player.salary;
    var salaryNote = '';
    if (player.status === 'Sign') {
      if (player.useMLE) { displaySalary = player.salary * 0.5; salaryNote = ' <span class="salary-note">(MLE: 50% off)</span>'; }
      else if (player.useVetMin) { displaySalary = E.VET_MIN_SALARY; salaryNote = ' <span class="salary-note">(Vet Min)</span>'; }
    }

    var showTradeOption = player.isKnick && !isTradeReturn;

    var statusBadge = (function () {
      if (player.status === 'Trade') return '<div class="status-badge trade-badge">TRADED</div>';
      if (isTradeReturn && player.status === 'Sign') return '<div class="status-badge trade-contract-badge">TRADE CONTRACT</div>';
      if (isTradeReturn && player.status === 'Cut') return '<div class="status-badge waived-badge">WAIVED</div>';
      if (player.status === 'Sign') return '<div class="status-badge signed-badge">SIGNED</div>';
      return '<div class="status-badge cut-badge">AVAILABLE</div>';
    })();

    var dropdownOptions = isTradeReturn
      ? '<option value="Sign" ' + (player.status === 'Sign' ? 'selected' : '') + '>✓ ON ROSTER</option>' +
        '<option value="Cut" ' + (player.status === 'Cut' ? 'selected' : '') + '>✗ WAIVE</option>'
      : '<option value="Cut" ' + (player.status === 'Cut' ? 'selected' : '') + '>✗ CUT</option>' +
        '<option value="Sign" ' + (player.status === 'Sign' ? 'selected' : '') + '>✓ SIGN</option>' +
        (showTradeOption ? '<option value="Trade" ' + (player.status === 'Trade' ? 'selected' : '') + '>↔ TRADE</option>' : '');

    card.innerHTML =
      '<div class="player-header">' +
        '<div class="player-number">' + player.number + '</div>' +
        (player.isStar ? '<div class="star-badge">⭐</div>' : '') +
        statusBadge +
      '</div>' +
      '<div class="player-info">' +
        '<div class="player-name">' + escapeHTML(player.name) + '</div>' +
        '<div class="player-position">' + escapeHTML(player.position) + '</div>' +
      '</div>' +
      '<div class="player-stats">' +
        '<div class="stat-item"><div class="stat-item-label">Salary</div><div class="stat-item-value">$' + formatSalary(displaySalary) + salaryNote + '</div></div>' +
        '<div class="stat-item"><div class="stat-item-label">Talent</div><div class="stat-item-value qpts-value">' + player.qpts + '</div></div>' +
      '</div>' +
      '<div class="player-controls">' +
        '<div class="control-group">' +
          '<select class="move-select" data-player-id="' + player.id + '" onchange="window.__cc.move(' + player.id + ', this.value, ' + (isTradeReturn ? 'true' : 'false') + ')">' +
            dropdownOptions +
          '</select>' +
        '</div>' +
        '<div class="player-badges">' +
          (player.birdEligible && player.status === 'Sign' ? '<div class="info-badge bird-badge" title="Bird Rights: re-sign without counting against the cap">🦅 Bird Rights</div>' : '') +
          (player.mleEligible && player.status === 'Sign' ?
            '<div class="checkbox-group mle-group">' +
              '<input type="checkbox" id="mle-' + player.id + '" class="exception-checkbox" ' + (player.useMLE ? 'checked' : '') + ' onchange="window.__cc.mle(' + player.id + ', this.checked)" />' +
              '<label for="mle-' + player.id + '" class="checkbox-label">💰 Use MLE (50% off)</label>' +
            '</div>' : '') +
          (player.vetMinEligible && player.status === 'Sign' ?
            '<div class="checkbox-group vet-group">' +
              '<input type="checkbox" id="vet-' + player.id + '" class="exception-checkbox" ' + (player.useVetMin ? 'checked' : '') + ' onchange="window.__cc.vet(' + player.id + ', this.checked)" />' +
              '<label for="vet-' + player.id + '" class="checkbox-label">📉 Vet Min ($2M)</label>' +
            '</div>' : '') +
        '</div>' +
      '</div>';

    return card;
  }

  function escapeHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ===================================================================
  // ROSTER HANDLERS (exposed on window.__cc for inline events)
  // ===================================================================
  function findAnywhere(id) {
    return state.players.find(function (p) { return p.id === id; }) ||
           state.tradeReturns.find(function (p) { return p.id === id; });
  }

  function handleMove(playerId, status, isTradeReturn) {
    if (status === 'Trade' && !isTradeReturn) {
      var pl = state.players.find(function (p) { return p.id === playerId; });
      if (pl && pl.isKnick) { state.pendingTradePlayerId = playerId; showTradeModal(playerId); return; }
    }

    var target = isTradeReturn
      ? state.tradeReturns.find(function (p) { return p.id === playerId; })
      : state.players.find(function (p) { return p.id === playerId; });
    if (!target) return;

    target.status = status;
    if (status === 'Cut' || status === 'Trade') { target.useMLE = false; target.useVetMin = false; }

    renderPlayers();
    updateDashboard();
    saveToStorage();
  }

  function handleMLE(playerId, checked) {
    var player = findAnywhere(playerId);
    if (!player) return;
    var base = E.computeMetrics(getSignedPlayers());
    if (checked && base.mleCount >= 1 && !player.useMLE) {
      toast('You can only use the MLE on ONE player.', 'warn');
      renderPlayers();
      return;
    }
    if (checked) player.useVetMin = false;
    player.useMLE = checked;
    renderPlayers();
    updateDashboard();
    saveToStorage();
  }

  function handleVetMin(playerId, checked) {
    var player = findAnywhere(playerId);
    if (!player) return;
    var base = E.computeMetrics(getSignedPlayers());
    if (checked && base.vetMinCount >= E.MAX_VET_MIN && !player.useVetMin) {
      toast('Veteran Minimum can be used on up to ' + E.MAX_VET_MIN + ' players.', 'warn');
      renderPlayers();
      return;
    }
    if (checked) player.useMLE = false;
    player.useVetMin = checked;
    renderPlayers();
    updateDashboard();
    saveToStorage();
  }

  // ===================================================================
  // TRADES
  // ===================================================================
  function showTradeModal(playerId) {
    var traded = state.players.find(function (p) { return p.id === playerId; });
    if (!traded) return;

    var maxReturn = traded.salary * 1.25;
    var returnIds = state.tradeReturns.map(function (p) { return p.id; });
    var availableFAs = state.players.filter(function (p) {
      return !p.isKnick && p.status !== 'Sign' && returnIds.indexOf(p.id) === -1;
    });
    var eligible = availableFAs.filter(function (p) { return p.salary <= maxReturn; });
    var ineligible = availableFAs.filter(function (p) { return p.salary > maxReturn; });

    setText('tradeModalPlayerName', traded.name);
    setText('tradeModalSalary', '$' + formatSalary(traded.salary));
    setText('tradeModalMaxReturn', '$' + formatSalary(maxReturn));

    var eligibleList = $('tradeEligibleList');
    var ineligibleList = $('tradeIneligibleList');

    if (eligibleList) {
      eligibleList.innerHTML = eligible.length === 0
        ? '<div class="trade-empty">No matching trade targets right now.</div>'
        : eligible.map(function (p) {
            var capDelta = p.salary - traded.salary;
            var qDelta = p.qpts - traded.qpts;
            var capLabel = capDelta === 0 ? '<span class="trade-delta neutral">= same cap</span>'
              : capDelta > 0 ? '<span class="trade-delta worse">+$' + formatSalary(capDelta) + ' cap</span>'
              : '<span class="trade-delta better">-$' + formatSalary(Math.abs(capDelta)) + ' cap saved</span>';
            var qLabel = qDelta === 0 ? '<span class="trade-delta neutral">= same talent</span>'
              : qDelta > 0 ? '<span class="trade-delta better">+' + qDelta + ' talent</span>'
              : '<span class="trade-delta worse">' + qDelta + ' talent</span>';
            return '<div class="trade-player-row" onclick="window.__cc.confirmTrade(' + traded.id + ',' + p.id + ')">' +
              '<div class="trade-player-info"><span class="trade-player-name">' + escapeHTML(p.name) + '</span>' +
              '<span class="trade-player-pos">' + escapeHTML(p.position) + '</span>' +
              '<div class="trade-deltas">' + capLabel + ' ' + qLabel + '</div></div>' +
              '<div class="trade-player-stats"><span class="trade-player-salary">$' + formatSalary(p.salary) + '</span>' +
              '<span class="trade-player-qpts">' + p.qpts + ' talent</span></div>' +
              '<button class="trade-select-btn">SELECT</button></div>';
          }).join('');
    }

    if (ineligibleList) {
      ineligibleList.innerHTML = ineligible.length === 0 ? '' :
        '<div class="trade-ineligible-header">⛔ Salary too high (over $' + formatSalary(maxReturn) + ')</div>' +
        ineligible.map(function (p) {
          return '<div class="trade-player-row ineligible"><div class="trade-player-info">' +
            '<span class="trade-player-name">' + escapeHTML(p.name) + '</span>' +
            '<span class="trade-player-pos">' + escapeHTML(p.position) + '</span></div>' +
            '<div class="trade-player-stats"><span class="trade-player-salary">$' + formatSalary(p.salary) + '</span>' +
            '<span class="trade-player-qpts">' + p.qpts + ' talent</span></div>' +
            '<span class="trade-blocked-label">BLOCKED</span></div>';
        }).join('');
    }

    show('tradeModal');
  }

  function confirmTrade(tradedPlayerId, returnPlayerId) {
    var traded = state.players.find(function (p) { return p.id === tradedPlayerId; });
    if (traded) { traded.status = 'Trade'; traded.useMLE = false; traded.useVetMin = false; }

    var returnPlayer = state.players.find(function (p) { return p.id === returnPlayerId; });
    if (returnPlayer && !state.tradeReturns.some(function (p) { return p.id === returnPlayerId; })) {
      state.tradeReturns.push(Object.assign({}, returnPlayer, { status: 'Sign', useMLE: false, useVetMin: false }));
    }

    state.pendingTradePlayerId = null;
    hide('tradeModal');
    renderPlayers();
    updateDashboard();
    saveToStorage();
  }

  function cancelTrade() {
    if (state.pendingTradePlayerId) {
      var player = state.players.find(function (p) { return p.id === state.pendingTradePlayerId; });
      if (player) {
        var sel = document.querySelector('select[data-player-id="' + state.pendingTradePlayerId + '"]');
        if (sel) sel.value = player.status;
      }
      state.pendingTradePlayerId = null;
    }
    hide('tradeModal');
  }

  // ===================================================================
  // DASHBOARD UPDATE (live metric feedback)
  // ===================================================================
  function updateDashboard() {
    var signed = getSignedPlayers();
    var base = E.computeMetrics(signed);
    var display = state.pressureChoice ? E.applyPressure(base, state.pressureChoice) : base;

    // --- four metric cards ---
    var cashEl = $('capSpaceValue');
    if (cashEl) cashEl.textContent = fmtMoney(display.capSpace);
    setMetricLevel('metricCash', display.capSpace >= 5000000 ? 'good' : (display.capSpace >= 0 ? 'mid' : 'bad'));

    setText('winsValue', display.projectedWins);
    setMetricLevel('metricWins', display.projectedWins >= 50 ? 'good' : (display.projectedWins >= 40 ? 'mid' : 'bad'));

    var chemEl = $('chemValue');
    if (chemEl) chemEl.innerHTML = display.chemistry + '<span class="metric-unit">/100</span>';
    setMetricLevel('metricChem', display.chemistry >= 70 ? 'good' : (display.chemistry >= 50 ? 'mid' : 'bad'));

    var cloutEl = $('cloutValue');
    if (cloutEl) cloutEl.innerHTML = display.clout + '<span class="metric-unit">/100</span>';
    setMetricLevel('metricClout', display.clout >= 65 ? 'good' : (display.clout >= 45 ? 'mid' : 'bad'));

    // --- budget + roster bars (actual signings) ---
    var capPct = E.clamp((base.payrollVsCap / E.SALARY_CAP) * 100, 0, 150);
    var capFill = $('capProgress');
    if (capFill) {
      capFill.style.width = Math.min(capPct, 100) + '%';
      if (base.overCap) capFill.style.background = 'linear-gradient(90deg,#F44336,#EF5350)';
      else if (capPct > 90) capFill.style.background = 'linear-gradient(90deg,#FF9800,#FFB74D)';
      else capFill.style.background = 'linear-gradient(90deg,#006BB6,#4a9fd8)';
    }
    setText('capPercentage', fmtMoney(base.payrollVsCap) + ' of $120M used');

    var rosterPct = E.clamp((base.count / E.MAX_ROSTER) * 100, 0, 100);
    var rosterFill = $('rosterProgress');
    if (rosterFill) rosterFill.style.width = rosterPct + '%';
    setText('rosterCountLabel', base.count + (base.count === 1 ? ' player signed' : ' players signed'));

    updateCapBreakdown(signed);
    updateChecklist(base);
    updateActionBar(base);

    // pressure banner under the metrics, if a deadline move was made
    renderPressureBanner();
  }

  function setMetricLevel(id, level) {
    var el = $(id);
    if (!el) return;
    el.classList.remove('lvl-good', 'lvl-mid', 'lvl-bad');
    el.classList.add('lvl-' + level);
  }

  function updateCapBreakdown(signed) {
    var bar = $('capBreakdown');
    if (!bar) return;
    bar.innerHTML = '';
    if (signed.length === 0) {
      bar.innerHTML = '<div class="breakdown-empty">Sign players to see your salary breakdown</div>';
      return;
    }
    signed.forEach(function (p) {
      var eff = E.effectiveSalary(p);
      var widthPct = Math.max((eff / E.SALARY_CAP) * 100, 1.5);
      var segClass = p.isStar ? 'seg-star' : (p.useVetMin ? 'seg-vetmin' : 'seg-rotation');
      var seg = document.createElement('div');
      seg.className = 'breakdown-segment ' + segClass;
      seg.style.width = widthPct + '%';
      seg.title = p.name + ': $' + formatSalary(eff);
      bar.appendChild(seg);
    });
  }

  function updateChecklist(base) {
    var c = E.rosterChecklist(base);
    updateRuleUI('ruleRoster', c.rosterSize.ok);
    updateRuleUI('ruleCap', c.underCap.ok);
    updateRuleUI('rulePosition', c.lineup.ok);
    updateRuleUI('guideStars', c.twoStars.ok, true);
  }

  function updateRuleUI(id, passed, isGuide) {
    var el = $(id);
    if (!el) return;
    var icon = el.querySelector('.rule-icon');
    el.classList.remove('pass', 'fail');
    el.classList.add(passed ? 'pass' : 'fail');
    if (icon) icon.textContent = passed ? '✓' : (isGuide ? '💡' : '✗');
  }

  function renderPressureBanner() {
    var bar = $('actionBar');
    if (!bar) return;
    var existing = $('pressureBanner');
    if (!state.pressureChoice) { if (existing) existing.remove(); return; }
    var opt = E.PRESSURE_OPTIONS[state.pressureChoice];
    if (!opt) return;
    var e = opt.effects;
    var parts = [];
    if (e.wins) parts.push((e.wins > 0 ? '+' : '') + e.wins + ' Wins');
    if (e.chemistry) parts.push((e.chemistry > 0 ? '+' : '') + e.chemistry + ' Chemistry');
    if (e.clout) parts.push((e.clout > 0 ? '+' : '') + e.clout + ' Clout');
    if (e.capSpace) parts.push((e.capSpace > 0 ? '+' : '') + fmtMoney(e.capSpace) + ' Cap');
    var html = '<span class="pb-tag">⚡ Deadline move:</span> <strong>' + escapeHTML(opt.label) + '</strong> &nbsp;<span class="pb-effects">' + parts.join(' · ') + '</span>';
    if (existing) { existing.innerHTML = html; }
    else {
      var div = document.createElement('div');
      div.id = 'pressureBanner';
      div.className = 'pressure-banner';
      div.innerHTML = html;
      bar.parentNode.insertBefore(div, bar);
    }
  }

  // ===================================================================
  // ACTION BAR (always points to the next step)
  // ===================================================================
  function updateActionBar(base) {
    base = base || E.computeMetrics(getSignedPlayers());
    var btn = $('primaryActionBtn');
    var icon = $('actionIcon');
    var txt = $('actionText');
    if (!btn) return;
    var legal = E.isLegalRoster(base);

    if (state.phase !== 'finalize') { // 'role' or 'build'
      btn.textContent = 'Lock Roster & Go to Trade Deadline →';
      if (legal) {
        if (icon) icon.textContent = '✅';
        if (txt) txt.textContent = 'Your roster is legal! Lock it in and face the trade deadline.';
        btn.classList.remove('disabled-look');
      } else {
        if (icon) icon.textContent = '🛠️';
        if (txt) txt.textContent = nextStepHint(base);
        btn.classList.add('disabled-look');
      }
    } else { // finalize
      btn.textContent = 'Submit Final Strategy →';
      if (legal) {
        if (icon) icon.textContent = '🚀';
        if (txt) txt.textContent = 'Make any last tweaks, then submit your strategy for review.';
        btn.classList.remove('disabled-look');
      } else {
        if (icon) icon.textContent = '⚠️';
        if (txt) txt.textContent = nextStepHint(base);
        btn.classList.add('disabled-look');
      }
    }
  }

  function nextStepHint(base) {
    var c = E.rosterChecklist(base);
    if (!c.rosterSize.ok) {
      if (base.count < E.MIN_ROSTER) return 'Sign more players — you need at least ' + E.MIN_ROSTER + ' (you have ' + base.count + ').';
      return 'Too many players — trim to ' + E.MAX_ROSTER + ' or fewer (you have ' + base.count + ').';
    }
    if (!c.underCap.ok) return 'You are over the $120M cap by ' + fmtMoney(Math.abs(base.capSpace)) + '. Cut salary or use an exception.';
    if (!c.lineup.ok) return 'Balance your lineup: you need at least 2 Guards, 2 Forwards, and 1 Center.';
    return 'Meet the roster checklist on the right to continue.';
  }

  function onPrimaryAction() {
    var base = E.computeMetrics(getSignedPlayers());
    if (!E.isLegalRoster(base)) {
      toast(nextStepHint(base), 'warn');
      shakeChecklist();
      return;
    }
    if (state.phase === 'build') {
      openPressure(base);
    } else {
      openReport();
    }
  }

  function shakeChecklist() {
    ['ruleRoster', 'ruleCap', 'rulePosition'].forEach(function (id) {
      var el = $(id);
      if (el && el.classList.contains('fail')) {
        el.classList.remove('shake-now');
        void el.offsetWidth; // restart animation
        el.classList.add('shake-now');
      }
    });
  }

  // ===================================================================
  // PRESSURE MOMENT
  // ===================================================================
  function renderPressureOptions() {
    var wrap = $('pressureOptions');
    if (!wrap) return;
    var order = ['all-in', 'stand-pat', 'future'];
    wrap.innerHTML = order.map(function (key) {
      var o = E.PRESSURE_OPTIONS[key];
      var e = o.effects;
      var chips = [];
      if (e.wins) chips.push(deltaChip((e.wins > 0 ? '+' : '') + e.wins + ' Wins', e.wins > 0));
      if (e.chemistry) chips.push(deltaChip((e.chemistry > 0 ? '+' : '') + e.chemistry + ' Chemistry', e.chemistry > 0));
      if (e.clout) chips.push(deltaChip((e.clout > 0 ? '+' : '') + e.clout + ' Clout', e.clout > 0));
      if (e.capSpace) chips.push(deltaChip((e.capSpace > 0 ? '+' : '') + fmtMoney(e.capSpace) + ' Cap', e.capSpace > 0));
      return '<button class="pressure-option" data-choice="' + o.id + '">' +
        '<div class="po-head"><span class="po-label">' + escapeHTML(o.label) + '</span>' +
        '<span class="po-tagline">' + escapeHTML(o.tagline) + '</span></div>' +
        '<p class="po-blurb">' + escapeHTML(o.blurb) + '</p>' +
        '<div class="po-effects">' + chips.join('') + '</div></button>';
    }).join('');

    var btns = wrap.querySelectorAll('.pressure-option');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () { choosePressure(this.getAttribute('data-choice')); });
    }
  }

  function deltaChip(text, good) {
    return '<span class="trade-delta ' + (good ? 'better' : 'worse') + '">' + text + '</span>';
  }

  function openPressure(base) {
    // Tailor the headline to the build so the moment feels responsive.
    var lead = 'It\'s the trade deadline and a rival team just called. The whole league is watching. ' +
               'There\'s no perfect choice — each path is a real tradeoff.';
    if (base.stars >= 4) lead = 'Your superstar lineup has every contender calling. ' + lead;
    else if (base.capSpace >= 30000000) lead = 'You\'ve kept plenty of cap room, and rivals know it. ' + lead;
    else if (base.projectedWins >= 55) lead = 'Your team is winning and looks ready for a deep run. ' + lead;
    setText('pressureLead', lead);
    show('pressureScreen');
  }

  function choosePressure(choiceId) {
    if (!E.PRESSURE_OPTIONS[choiceId]) return;
    state.pressureChoice = choiceId;
    state.phase = 'finalize';
    hide('pressureScreen');
    updateDashboard();
    saveToStorage();
    var opt = E.PRESSURE_OPTIONS[choiceId];
    toast('Deadline move: ' + opt.label + '. Now submit your strategy.', 'good');
  }

  // ===================================================================
  // PERFORMANCE REPORT
  // ===================================================================
  function openReport() {
    var base = E.computeMetrics(getSignedPlayers());
    if (!E.isLegalRoster(base)) { toast(nextStepHint(base), 'warn'); shakeChecklist(); return; }

    var display = state.pressureChoice ? E.applyPressure(base, state.pressureChoice) : base;
    var grade = E.gradeStrategy(display);
    var season = E.simulateSeason(display, grade);

    state.lastDisplay = display;
    state.lastGrade = grade;
    state.lastSeason = season;
    state.strategyType = E.classifyStrategy(display);

    setText('reportHeadline', '📊 Performance Report — ' + state.studentName);
    var stratLine = $('reportStrategyLine');
    if (stratLine) stratLine.innerHTML = 'Your strategy: <strong>' + escapeHTML(state.strategyType) + '</strong>';

    setText('gradeLetter', grade.grade);
    setText('gradeScore', grade.score);
    setText('reportTier', grade.tier);
    var ring = $('gradeRing');
    if (ring) {
      var deg = E.clamp(grade.score, 0, 100) * 3.6;
      ring.style.background = 'conic-gradient(' + ringColor(grade.score) + ' 0deg ' + deg + 'deg, rgba(255,255,255,0.12) ' + deg + 'deg 360deg)';
    }

    setText('rmCash', fmtMoney(display.capSpace));
    setText('rmWins', display.projectedWins);
    setText('rmChem', display.chemistry);
    setText('rmClout', display.clout);

    setText('seasonRecord', season.record + (season.luck !== 0 ? '  (~' + season.simulatedWins + ' wins)' : ''));
    setText('playoffResult', grade.playoff);
    setText('tierDescription', grade.blurb);
    setText('claimCode', grade.claimCode);
    setText('luckRating', season.luckLabel);

    var pl = $('pressureResultLine');
    if (pl) pl.textContent = state.pressureChoice ? E.PRESSURE_OPTIONS[state.pressureChoice].label : 'Did not visit deadline';

    var content = document.querySelector('.report-content');
    if (content) content.className = 'modal-content report-content tier-' + grade.tier.toLowerCase().replace(/\s+/g, '-');

    show('reportModal');
    if (grade.score >= 65) createConfetti();
    saveToStorage();
  }

  function ringColor(score) {
    if (score >= 75) return '#FFD700';
    if (score >= 55) return '#4CAF50';
    if (score >= 45) return '#FF9800';
    return '#EF5350';
  }

  function replaySeason() {
    if (!state.lastDisplay || !state.lastGrade) return;
    var season = E.simulateSeason(state.lastDisplay, state.lastGrade);
    state.lastSeason = season;
    setText('seasonRecord', season.record + (season.luck !== 0 ? '  (~' + season.simulatedWins + ' wins)' : ''));
    setText('luckRating', season.luckLabel);
    createConfetti();
  }

  // ===================================================================
  // BOARDROOM MEMO
  // ===================================================================
  var MEMO_STARTERS = [
    'My strategy was to win now by…',
    'I stayed flexible by…',
    'I focused on chemistry because…',
    'I spent big on stars because…',
    'I saved cap space so that…'
  ];

  function renderMemoChips() {
    var wrap = $('memoChips');
    if (!wrap) return;
    wrap.innerHTML = MEMO_STARTERS.map(function (s) {
      return '<button class="memo-chip" type="button">' + escapeHTML(s) + '</button>';
    }).join('');
    var chips = wrap.querySelectorAll('.memo-chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', function () {
        var ta = $('memoText');
        if (!ta) return;
        var starter = this.textContent;
        ta.value = ta.value.trim() ? (ta.value.replace(/\s+$/, '') + ' ' + starter + ' ') : (starter + ' ');
        ta.focus();
        updateMemoCount();
      });
    }
  }

  function updateMemoCount() {
    var ta = $('memoText');
    if (!ta) return;
    if (ta.value.length > 600) ta.value = ta.value.slice(0, 600);
    setText('memoCount', ta.value.length);
  }

  function openMemo() {
    hide('reportModal');
    var ta = $('memoText');
    if (ta && state.memo) ta.value = state.memo;
    updateMemoCount();
    show('memoModal');
  }

  function finishMemo() {
    var ta = $('memoText');
    var memo = ta ? ta.value.trim() : '';
    if (memo.length < 3) {
      toast('Add a sentence defending your strategy — a great GM always can.', 'warn');
      if (ta) ta.focus();
      return;
    }
    state.memo = memo;
    saveToStorage();
    buildAndShowSummary();
  }

  // ===================================================================
  // COMPLETION SUMMARY (+ portable result for future Highway World)
  // ===================================================================
  function buildAndShowSummary() {
    var result = E.buildResult({
      studentName: state.studentName,
      role: state.role,
      pressureChoice: state.pressureChoice,
      strategyType: state.strategyType,
      metrics: state.lastDisplay,
      grade: state.lastGrade,
      memo: state.memo
    });
    window.BSC_RESULT = result; // lightweight, local hook for later platforms
    try { safeSet(JSON.stringify(Object.assign(serializeState(), { result: result }))); } catch (e) {}

    var g = state.lastGrade || {};
    var m = state.lastDisplay || {};
    setText('summaryName', 'Great work, ' + state.studentName + '!');

    var card = $('summaryCard');
    if (card) {
      card.innerHTML =
        '<div class="summary-grade"><span class="summary-grade-letter">' + (g.grade || '—') + '</span>' +
        '<span class="summary-tier">' + escapeHTML(g.tier || '') + '</span></div>' +
        '<div class="summary-row"><span>Front-office style</span><strong>' + escapeHTML(state.role || '—') + '</strong></div>' +
        '<div class="summary-row"><span>Strategy</span><strong>' + escapeHTML(state.strategyType || '—') + '</strong></div>' +
        '<div class="summary-row"><span>Trade deadline</span><strong>' + escapeHTML(state.pressureChoice ? E.PRESSURE_OPTIONS[state.pressureChoice].label : '—') + '</strong></div>' +
        '<div class="summary-metrics">' +
          '<span>💰 ' + fmtMoney(m.capSpace || 0) + '</span>' +
          '<span>🏆 ' + (m.projectedWins || 0) + ' W</span>' +
          '<span>🤝 ' + (m.chemistry || 0) + '</span>' +
          '<span>🔥 ' + (m.clout || 0) + '</span>' +
        '</div>' +
        '<div class="summary-memo"><span class="summary-memo-label">📝 Boardroom Memo</span>' +
        '<p>' + escapeHTML(state.memo) + '</p></div>' +
        '<div class="summary-code">🎫 Claim Code: <strong>' + escapeHTML(g.claimCode || '—') + '</strong></div>';
    }

    hide('memoModal');
    show('summaryModal');
    createConfetti();
  }

  function summaryText() {
    var g = state.lastGrade || {};
    var m = state.lastDisplay || {};
    return [
      'BOW SPORTS CAPITAL — CAP CRASH (Track 201)',
      'GM: ' + state.studentName + '   Style: ' + (state.role || '-'),
      'Grade: ' + (g.grade || '-') + ' (' + (g.score || 0) + '/100) — ' + (g.tier || '-'),
      'Strategy: ' + (state.strategyType || '-'),
      'Trade deadline: ' + (state.pressureChoice ? E.PRESSURE_OPTIONS[state.pressureChoice].label : '-'),
      'Metrics — Cap Space: ' + fmtMoney(m.capSpace || 0) + ' | Wins: ' + (m.projectedWins || 0) +
        ' | Chemistry: ' + (m.chemistry || 0) + ' | Clout: ' + (m.clout || 0),
      'Claim Code: ' + (g.claimCode || '-'),
      'Boardroom Memo: ' + state.memo
    ].join('\n');
  }

  function copySummary() {
    var text = summaryText();
    var done = function () { toast('Summary copied to clipboard!', 'good'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { legacyCopy(text, done); });
    } else { legacyCopy(text, done); }
  }

  function legacyCopy(text, done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta); done();
    } catch (e) { toast('Could not copy automatically — select the summary text manually.', 'warn'); }
  }

  function playAgain() {
    safeRemove();
    window.location.reload();
  }

  // ===================================================================
  // STORAGE (serialize / restore)
  // ===================================================================
  function serializeState() {
    return {
      phase: state.phase,
      studentName: state.studentName,
      role: state.role,
      pressureChoice: state.pressureChoice,
      memo: state.memo,
      players: state.players.map(function (p) {
        return { id: p.id, status: p.status, useMLE: p.useMLE, useVetMin: p.useVetMin };
      }),
      tradeReturns: state.tradeReturns.map(function (p) {
        return { id: p.id, status: p.status, useMLE: p.useMLE, useVetMin: p.useVetMin };
      })
    };
  }

  function saveToStorage() { safeSet(JSON.stringify(serializeState())); }

  function loadFromStorage() {
    var raw = safeGet();
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { safeRemove(); return; }
    if (!data || typeof data !== 'object') return;

    if (typeof data.studentName === 'string') state.studentName = data.studentName;
    if (typeof data.role === 'string') state.role = data.role;
    if (typeof data.memo === 'string') state.memo = data.memo;
    if (data.pressureChoice && E.PRESSURE_OPTIONS[data.pressureChoice]) state.pressureChoice = data.pressureChoice;
    if (data.phase === 'finalize' || data.phase === 'build') state.phase = data.phase;

    if (Array.isArray(data.players)) {
      data.players.forEach(function (saved) {
        var p = state.players.find(function (x) { return x.id === saved.id; });
        if (p) { p.status = saved.status || 'Cut'; p.useMLE = !!saved.useMLE; p.useVetMin = !!saved.useVetMin; }
      });
    }
    if (Array.isArray(data.tradeReturns)) {
      data.tradeReturns.forEach(function (saved) {
        var orig = state.players.find(function (x) { return x.id === saved.id; });
        if (orig && !state.tradeReturns.some(function (x) { return x.id === saved.id; })) {
          state.tradeReturns.push(Object.assign({}, orig, {
            status: saved.status || 'Sign', useMLE: !!saved.useMLE, useVetMin: !!saved.useVetMin
          }));
        }
      });
    }
    // A pressure choice only makes sense once we've reached finalize.
    if (state.pressureChoice && state.phase === 'build') state.phase = 'finalize';
  }

  // ===================================================================
  // EVENT BINDING
  // ===================================================================
  function bindEvents() {
    bindRoleEvents();
    on('primaryActionBtn', 'click', onPrimaryAction);
    on('cancelTradeBtn', 'click', cancelTrade);

    on('resetBtn', 'click', function () {
      if (window.confirm('Start over with a fresh roster? This clears your current build.')) playAgain();
    });
    on('howToBtn', 'click', function () { startTutorial(); });

    on('simulateAgainBtn', 'click', replaySeason);
    on('toMemoBtn', 'click', openMemo);
    on('backToReportBtn', 'click', function () { hide('memoModal'); show('reportModal'); });
    on('finishMemoBtn', 'click', finishMemo);
    on('memoText', 'input', updateMemoCount);
    on('copySummaryBtn', 'click', copySummary);
    on('playAgainBtn', 'click', playAgain);

    // close modals by clicking the dark backdrop (not the report — it must stay until acted on)
    ['tradeModal'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('click', function (e) { if (e.target.id === id) cancelTrade(); });
    });

    // expose inline-handler functions
    window.__cc = { move: handleMove, mle: handleMLE, vet: handleVetMin, confirmTrade: confirmTrade };
  }

  // ===================================================================
  // TUTORIAL ("How to Play")
  // ===================================================================
  var tutorialStep = 0;
  var TUTORIAL_STEPS = [
    { target: '#metricsBoard', title: 'Your Four Metrics', text: 'Watch these as you build. Cap Space is your money, Wins is your strength, Chemistry is how well players fit, and Clout is fan excitement. No roster can max all four!' },
    { target: '#player-1', title: 'Sign, Cut & Trade', text: 'Use each player\'s dropdown to SIGN, CUT, or TRADE them. Stars (⭐) cost more but add talent. Watch your metrics change live.' },
    { target: '.info-box', title: 'Cap Exceptions', text: '🦅 Bird Rights re-sign your own players for free against the cap. 💰 MLE gives 50% off one player. 📉 Vet Min is $2M for up to 3 role players.' },
    { target: '#rulesList', title: 'Roster Checklist', text: 'Meet these league rules to lock your roster: 10–13 players, under the $120M cap, and a balanced lineup.' },
    { target: '#actionBar', title: 'Next Step', text: 'This bar always tells you what to do next — lock your roster, face the trade deadline, then submit your strategy. Let\'s go!' }
  ];

  function initTutorial() {
    var seen;
    try { seen = localStorage.getItem('ccTutorial201'); } catch (e) { seen = null; }
    if (seen === 'done') return;
    if (state.phase === 'role') return; // wait until they're in the front office
    setTimeout(function () { startTutorial(); }, 700);
  }

  function startTutorial() {
    if (state.phase === 'role') return;
    showTutorialStep(0);
  }

  function showTutorialStep(step) {
    tutorialStep = step;
    var data = TUTORIAL_STEPS[step];
    var overlay = $('tutorialOverlay');
    if (!overlay || !data) return;
    setText('tutorialTitle', data.title);
    setText('tutorialText', data.text);
    setText('tutorialCounter', (step + 1) + ' / ' + TUTORIAL_STEPS.length);
    var nextBtn = $('tutorialNext');
    if (nextBtn) nextBtn.textContent = (step === TUTORIAL_STEPS.length - 1) ? "Let's Build! 🏀" : 'Next →';

    var prev = document.querySelectorAll('.tutorial-highlight');
    for (var i = 0; i < prev.length; i++) prev[i].classList.remove('tutorial-highlight');
    var target = document.querySelector(data.target);
    if (target) {
      target.classList.add('tutorial-highlight');
      try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    }
    overlay.classList.add('show');
  }

  function nextTutorialStep() {
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) skipTutorial();
    else showTutorialStep(tutorialStep + 1);
  }

  function skipTutorial() {
    try { localStorage.setItem('ccTutorial201', 'done'); } catch (e) {}
    var overlay = $('tutorialOverlay');
    if (overlay) overlay.classList.remove('show');
    var hl = document.querySelectorAll('.tutorial-highlight');
    for (var i = 0; i < hl.length; i++) hl[i].classList.remove('tutorial-highlight');
  }

  // bind tutorial buttons after DOM ready (they're static)
  document.addEventListener('DOMContentLoaded', function () {
    on('tutorialNext', 'click', nextTutorialStep);
    on('tutorialSkipBtn', 'click', skipTutorial);
  });

  // ===================================================================
  // VISUAL FLOURISHES
  // ===================================================================
  function createConfetti() {
    var container = $('confetti');
    if (!container) return;
    container.innerHTML = '';
    var colors = ['#F58426', '#006BB6', '#BEC0C2', '#FFD700'];
    for (var i = 0; i < 50; i++) {
      var c = document.createElement('div');
      c.style.position = 'absolute';
      c.style.width = '10px'; c.style.height = '10px';
      c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      c.style.left = Math.random() * 100 + '%';
      c.style.top = '-10px';
      c.style.opacity = Math.random();
      c.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      c.style.animation = 'confettiFall ' + (2 + Math.random() * 3) + 's linear infinite';
      c.style.animationDelay = Math.random() * 2 + 's';
      container.appendChild(c);
    }
    if (!document.querySelector('#confettiStyle')) {
      var style = document.createElement('style');
      style.id = 'confettiStyle';
      style.textContent = '@keyframes confettiFall { to { top: 100%; transform: translateY(100%) rotate(720deg); } }';
      document.head.appendChild(style);
    }
  }

  function createParticles() {
    var container = $('particles');
    if (!container) return;
    for (var i = 0; i < 24; i++) {
      var p = document.createElement('div');
      p.style.position = 'absolute';
      p.style.width = '4px'; p.style.height = '4px';
      p.style.backgroundColor = i % 2 === 0 ? '#F58426' : '#006BB6';
      p.style.borderRadius = '50%';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      p.style.animation = 'float ' + (5 + Math.random() * 10) + 's ease-in-out infinite';
      p.style.animationDelay = Math.random() * 5 + 's';
      p.style.opacity = '0.6';
      container.appendChild(p);
    }
    if (!document.querySelector('#particleStyle')) {
      var style = document.createElement('style');
      style.id = 'particleStyle';
      style.textContent = '@keyframes float {0%,100%{transform:translateY(0) translateX(0);}25%{transform:translateY(-20px) translateX(10px);}50%{transform:translateY(-10px) translateX(-10px);}75%{transform:translateY(-30px) translateX(5px);}}';
      document.head.appendChild(style);
    }
  }

})();
