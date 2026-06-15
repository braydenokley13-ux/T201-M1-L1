/* =====================================================================
   BOW SPORTS CAPITAL — CAP CRASH (Track 201, Grades 7–8)
   sim-engine.js — pure simulation math

   This file holds ONLY pure functions (no DOM, no globals beyond the
   exported API). That keeps the strategy math easy to reason about,
   easy to test (see tests/metrics.test.js), and reusable if this
   mission is ever folded into Highway World later.

   The four student-facing metrics:
     • Cap Space  — money left under the $120M cap ("every dollar has a job")
     • Wins       — projected wins out of 82 (how strong the team is)
     • Chemistry  — how well the roster fits together (0–100)
     • Clout      — how excited fans, media & sponsors are (0–100)
   ===================================================================== */

(function (root) {
  'use strict';

  var SALARY_CAP = 120000000;   // $120M hard budget for the cap math
  var MIN_ROSTER = 10;          // league rule: smallest legal roster
  var MAX_ROSTER = 13;          // league rule: largest legal roster
  var VET_MIN_SALARY = 2000000; // a veteran-minimum contract costs $2M
  var MAX_VET_MIN = 3;          // you may use the vet minimum on 3 players
  var FLEX_TARGET = 20000000;   // $20M of room = full "flexibility" credit

  // Marquee free agents — signing one of these is a splashy, headline move
  // that excites fans and sponsors (extra Clout).
  var MARQUEE_IDS = [101, 102, 103, 104, 105, 106, 124];

  function clamp(n, lo, hi) {
    if (typeof n !== 'number' || isNaN(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  }

  function round(n) { return Math.round(n); }

  // What a single contract actually costs against the budget once the
  // student applies a cap exception.
  function effectiveSalary(player) {
    if (!player || typeof player.salary !== 'number') return 0;
    if (player.useMLE) return player.salary * 0.5;   // Mid-Level Exception: 50% off
    if (player.useVetMin) return VET_MIN_SALARY;     // Veteran Minimum: flat $2M
    return player.salary;
  }

  /* ---------------------------------------------------------------
     computeMetrics(signedPlayers)
     Takes the list of players the student has SIGNED and returns every
     number the dashboard and report need. Always returns a safe object,
     even for an empty/garbage roster, so the UI can never crash.
     --------------------------------------------------------------- */
  function computeMetrics(signedPlayers) {
    var signed = Array.isArray(signedPlayers) ? signedPlayers.filter(Boolean) : [];

    var payrollTotal = 0;        // every dollar, including Bird-rights players
    var payrollVsCap = 0;        // dollars that actually count toward the cap
    var talent = 0;              // sum of Quality Points
    var stars = 0;
    var marquee = 0;
    var count = 0;
    var pos = { G: 0, F: 0, C: 0 };
    var vetMinCount = 0;
    var mleCount = 0;

    signed.forEach(function (p) {
      if (!p) return;
      count++;
      var eff = effectiveSalary(p);
      payrollTotal += eff;
      // Bird Rights: re-signing your own player doesn't count against the cap.
      if (!p.birdEligible) payrollVsCap += eff;
      talent += (typeof p.qpts === 'number' ? p.qpts : 0);
      if (p.isStar) stars++;
      if (MARQUEE_IDS.indexOf(p.id) !== -1) marquee++;
      if (p.positionGroup && pos.hasOwnProperty(p.positionGroup)) pos[p.positionGroup]++;
      if (p.useVetMin) vetMinCount++;
      if (p.useMLE) mleCount++;
    });

    var capSpace = SALARY_CAP - payrollVsCap;
    var balanced = pos.G >= 2 && pos.F >= 2 && pos.C >= 1;
    var roleCount = Math.max(0, count - stars);

    // ----- Chemistry (0–100): does this roster fit together? -----
    var chemistry = 55;
    if (balanced) chemistry += 15;                 // a complete lineup gels
    if (stars <= 2) chemistry += 5;                // a clear pecking order helps
    else chemistry -= (stars - 2) * 9;             // too many alphas fight for the ball
    chemistry += clamp(roleCount, 0, 8) * 2.5;     // role players are the glue (+20 max)
    if (count > 0 && count < 8) chemistry -= (8 - count) * 5; // too thin = no depth
    if (count > MAX_ROSTER) chemistry -= (count - MAX_ROSTER) * 4;
    if (count === 0) chemistry = 0;
    chemistry = round(clamp(chemistry, 0, 100));

    // ----- Projected Wins (out of 82): talent + a little chemistry synergy -----
    var wins = 22 + talent * 0.30;
    wins += (chemistry - 60) * 0.10;               // a tight team overachieves a bit
    if (count === 0) wins = 0;
    wins = count === 0 ? 0 : round(clamp(wins, 15, 73));

    // ----- Clout (0–100): star power + marquee signings + winning -----
    var clout = 24 + stars * 13 + marquee * 4 + (clamp(talent, 0, 160) / 160) * 16;
    if (count === 0) clout = 0;
    clout = round(clamp(clout, 0, 100));

    return {
      payrollTotal: payrollTotal,
      payrollVsCap: payrollVsCap,
      capSpace: capSpace,
      overCap: capSpace < 0,
      projectedWins: wins,
      chemistry: chemistry,
      clout: clout,
      talent: talent,
      stars: stars,
      marquee: marquee,
      count: count,
      positions: pos,
      balanced: balanced,
      vetMinCount: vetMinCount,
      mleCount: mleCount
    };
  }

  /* ---------------------------------------------------------------
     rosterChecklist(metrics) — the league rules + strategy guidance.
     `legal` items must be true to finalize (real NBA-style limits).
     `guide` items are strategy hints, never blockers (no "wrong" answer).
     --------------------------------------------------------------- */
  function rosterChecklist(m) {
    return {
      rosterSize: { ok: m.count >= MIN_ROSTER && m.count <= MAX_ROSTER, legal: true },
      underCap:   { ok: !m.overCap, legal: true },
      lineup:     { ok: m.balanced, legal: true },
      twoStars:   { ok: m.stars >= 2, legal: false },
      vetMinOk:   { ok: m.vetMinCount <= MAX_VET_MIN, legal: true },
      mleOk:      { ok: m.mleCount <= 1, legal: true }
    };
  }

  function isLegalRoster(m) {
    var c = rosterChecklist(m);
    return Object.keys(c).every(function (k) {
      return !c[k].legal || c[k].ok;
    });
  }

  /* ---------------------------------------------------------------
     PRESSURE MOMENT — the Trade Deadline twist.
     Each option is a real short-term vs long-term tradeoff. None is
     "correct"; each reshapes the four metrics in a different direction.
     --------------------------------------------------------------- */
  var PRESSURE_OPTIONS = {
    'all-in': {
      id: 'all-in',
      label: 'Go All-In',
      tagline: 'Win now',
      blurb: 'Trade future flexibility for an immediate talent boost. Great if you are chasing a title this season — but it ties up money and the new pieces need time to gel.',
      effects: { wins: 4, clout: 8, chemistry: -6, capSpace: -8000000 }
    },
    'stand-pat': {
      id: 'stand-pat',
      label: 'Trust Your Team',
      tagline: 'Stay the course',
      blurb: 'Keep the roster you built. No splashy headline, but your players keep building chemistry together and your budget stays exactly where you planned it.',
      effects: { wins: 0, clout: 0, chemistry: 4, capSpace: 0 }
    },
    'future': {
      id: 'future',
      label: 'Build for the Future',
      tagline: 'Long-term flexibility',
      blurb: 'Move a veteran for cap relief and future picks. You give up some wins right now, but you free up money and keep your options open for next season.',
      effects: { wins: -5, clout: -3, chemistry: 2, capSpace: 10000000 }
    }
  };

  // Returns a NEW metrics object with the chosen pressure effects applied.
  // Never mutates the input.
  function applyPressure(metrics, choiceId) {
    var out = {};
    for (var k in metrics) { if (metrics.hasOwnProperty(k)) out[k] = metrics[k]; }
    var opt = PRESSURE_OPTIONS[choiceId];
    if (!opt) return out;
    var e = opt.effects;
    out.projectedWins = round(clamp(out.projectedWins + (e.wins || 0), 0, 82));
    out.clout = round(clamp(out.clout + (e.clout || 0), 0, 100));
    out.chemistry = round(clamp(out.chemistry + (e.chemistry || 0), 0, 100));
    out.capSpace = out.capSpace + (e.capSpace || 0);
    out.overCap = out.capSpace < 0;
    return out;
  }

  /* ---------------------------------------------------------------
     gradeStrategy(metrics) — the overall Front-Office score.
     A weighted blend: no single roster can max all four, so there is
     never one perfect answer — strong, balanced teams score best.
     --------------------------------------------------------------- */
  function gradeStrategy(m) {
    var winsScore = clamp((m.projectedWins - 20) / (70 - 20) * 100, 0, 100);
    var flexScore = clamp((m.capSpace / FLEX_TARGET) * 100, 0, 100);
    var chem = clamp(m.chemistry, 0, 100);
    var clout = clamp(m.clout, 0, 100);

    var overall = 0.40 * winsScore + 0.25 * chem + 0.15 * clout + 0.20 * flexScore;
    overall = round(clamp(overall, 0, 100));

    // Thresholds are tuned to the real talent ceiling of a legal roster:
    // most strong plans land Championship/Contender, and Dynasty is a rare
    // pinnacle only the most optimized builds reach.
    var tier;
    if (overall >= 80)      tier = TIERS.dynasty;
    else if (overall >= 70) tier = TIERS.champion;
    else if (overall >= 60) tier = TIERS.contender;
    else if (overall >= 50) tier = TIERS.playoff;
    else if (overall >= 40) tier = TIERS.scrappy;
    else                    tier = TIERS.rebuild;

    return {
      score: overall,
      winsScore: round(winsScore),
      flexScore: round(flexScore),
      tier: tier.name,
      grade: tier.grade,
      claimCode: tier.claimCode,
      record: tier.record,
      playoff: tier.playoff,
      blurb: tier.blurb
    };
  }

  var TIERS = {
    dynasty:   { name: 'Dynasty Front Office', grade: 'A+', claimCode: 'DYNASTY-201', record: '64-18',
                 playoff: 'NBA Champions — a dominant, well-built season.',
                 blurb: 'Elite talent, real chemistry, and money still on the books. This is how a front office builds something that lasts.' },
    champion:  { name: 'Championship Front Office', grade: 'A', claimCode: 'CHAMPS-201', record: '58-24',
                 playoff: 'NBA Champions — a hard-fought title run.',
                 blurb: 'A title-caliber roster. You balanced star power with smart spending and it paid off.' },
    contender: { name: 'Contender', grade: 'B', claimCode: 'CONTEND-201', record: '52-30',
                 playoff: 'Conference Finals — one round from the title.',
                 blurb: 'A strong, competitive team. A move or two more and you are right in the title mix.' },
    playoff:   { name: 'Playoff Team', grade: 'C', claimCode: 'PLAYOFFS-201', record: '46-36',
                 playoff: 'Made the playoffs — lost in the first round.',
                 blurb: 'A solid foundation. Your strategy got you in the door — now build on it.' },
    scrappy:   { name: 'Scrappy Rebuild', grade: 'D', claimCode: 'REBUILD-201', record: '38-44',
                 playoff: 'Missed the playoffs — but stayed flexible.',
                 blurb: 'Not a finished product, but you kept your options open. Every front office starts somewhere.' },
    rebuild:   { name: 'Rebuilding Year', grade: 'R', claimCode: 'RELOAD-201', record: '29-53',
                 playoff: 'A long season — time to regroup.',
                 blurb: 'The pieces did not fit together yet. Look at the tradeoffs and try a different plan.' }
  };

  /* ---------------------------------------------------------------
     simulateSeason(metrics, gradeObj, [rng]) — adds a luck swing so the
     same strong plan can produce slightly different seasons (process vs.
     outcome). rng is injectable for deterministic tests.
     --------------------------------------------------------------- */
  function simulateSeason(metrics, gradeObj, rng) {
    var r = (typeof rng === 'function') ? rng() : Math.random();
    var luck = round((r * 16) - 8); // -8..+8 win swing
    var luckLabel = luck > 4 ? '🍀 Lucky season' : (luck < -4 ? '😤 Tough breaks' : '⚖️ Average luck');
    var simWins = clamp((metrics.projectedWins || 0) + luck, 0, 82);
    return {
      luck: luck,
      luckLabel: luckLabel,
      simulatedWins: round(simWins),
      record: gradeObj.record,
      playoff: gradeObj.playoff
    };
  }

  /* ---------------------------------------------------------------
     buildResult(...) — the portable completion object. Local + simple,
     but shaped so a future Highway World mission could read it directly.
     --------------------------------------------------------------- */
  function buildResult(opts) {
    opts = opts || {};
    var m = opts.metrics || {};
    var g = opts.grade || {};
    return {
      simulationId: 'bsc-cap-crash-201',
      missionTitle: 'Cap Crash — Rebuild the Roster',
      track: '201',
      gradeBand: '7-8',
      studentName: opts.studentName || 'GM',
      role: opts.role || null,
      pressureChoice: opts.pressureChoice || null,
      strategyType: opts.strategyType || null,
      metrics: {
        capSpace: m.capSpace,
        projectedWins: m.projectedWins,
        chemistry: m.chemistry,
        clout: m.clout
      },
      score: g.score,
      tier: g.tier,
      grade: g.grade,
      claimCode: g.claimCode,
      memo: opts.memo || '',
      completedAt: opts.completedAt || new Date().toISOString()
    };
  }

  // Classify the build into a plain-language strategy type for the memo/report.
  function classifyStrategy(m) {
    if (!m || m.count === 0) return 'Empty Roster';
    if (m.stars >= 4) return 'Superstar Stack';
    if (m.capSpace >= 30000000 && m.projectedWins < 50) return 'Budget & Flexibility';
    if (m.chemistry >= 75 && m.stars <= 3) return 'Balanced Builder';
    if (m.clout >= 75) return 'Big-Market Splash';
    if (m.projectedWins >= 55) return 'Win-Now';
    return 'Balanced Builder';
  }

  var api = {
    SALARY_CAP: SALARY_CAP,
    MIN_ROSTER: MIN_ROSTER,
    MAX_ROSTER: MAX_ROSTER,
    VET_MIN_SALARY: VET_MIN_SALARY,
    MAX_VET_MIN: MAX_VET_MIN,
    MARQUEE_IDS: MARQUEE_IDS,
    PRESSURE_OPTIONS: PRESSURE_OPTIONS,
    TIERS: TIERS,
    clamp: clamp,
    effectiveSalary: effectiveSalary,
    computeMetrics: computeMetrics,
    rosterChecklist: rosterChecklist,
    isLegalRoster: isLegalRoster,
    applyPressure: applyPressure,
    gradeStrategy: gradeStrategy,
    simulateSeason: simulateSeason,
    buildResult: buildResult,
    classifyStrategy: classifyStrategy
  };

  // Expose for the browser (window.CapCrashEngine) and Node (module.exports).
  root.CapCrashEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
