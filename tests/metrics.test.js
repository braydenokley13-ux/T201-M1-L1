/* Lightweight sanity tests for the Cap Crash simulation engine.
   No framework required — run with:  node tests/metrics.test.js
   Exits non-zero if any check fails. */

var E = require('../sim-engine.js');
var playersData = require('../players-data.js').playersData || require('../players-data.js');

var pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.error('  ✗ FAIL: ' + name); }
}
function approx(a, b, tol) { return Math.abs(a - b) <= (tol || 0.001); }

function byId(id) {
  var p = playersData.find(function (x) { return x.id === id; });
  if (!p) throw new Error('no player ' + id);
  return Object.assign({}, p, { status: 'Sign', useMLE: false, useVetMin: false });
}

console.log('\nCap Crash engine tests\n');

// --- empty roster never crashes and returns zeros ---
(function () {
  var m = E.computeMetrics([]);
  check('empty roster: count 0', m.count === 0);
  check('empty roster: wins 0', m.projectedWins === 0);
  check('empty roster: chemistry 0', m.chemistry === 0);
  check('empty roster: clout 0', m.clout === 0);
  check('empty roster: full cap space', m.capSpace === E.SALARY_CAP);
  check('empty roster: not legal', E.isLegalRoster(m) === false);
  check('garbage input is safe', E.computeMetrics(null).count === 0);
  check('garbage with nulls is safe', E.computeMetrics([null, undefined]).count === 0);
})();

// --- effective salary handles exceptions ---
(function () {
  var p = byId(7); // Miles McBride, $13M, mleEligible
  check('base salary', E.effectiveSalary(p) === 13000000);
  p.useMLE = true; check('MLE = 50% off', E.effectiveSalary(p) === 6500000);
  p.useMLE = false; p.useVetMin = true; check('Vet Min = $2M flat', E.effectiveSalary(p) === 2000000);
})();

// --- Bird Rights don't count against the cap ---
(function () {
  var brunson = byId(1);  // birdEligible
  var lebron = byId(101); // not bird eligible
  var m = E.computeMetrics([brunson, lebron]);
  check('payrollTotal counts everyone', m.payrollTotal === 25000000 + 48000000);
  check('payrollVsCap excludes Bird player', m.payrollVsCap === 48000000);
})();

// --- stacking stars lowers chemistry; balance raises it ---
(function () {
  var stars = [byId(1), byId(2), byId(3), byId(101), byId(102)]; // 5 stars, ball-dominant
  var balanced = [byId(1), byId(3), byId(2), byId(5), byId(8), byId(9), byId(10), byid6()];
  function byid6() { return byId(6); }
  var sMetrics = E.computeMetrics(stars);
  var bMetrics = E.computeMetrics(balanced);
  check('5 stars detected', sMetrics.stars === 5);
  check('star stack hurts chemistry (< 60)', sMetrics.chemistry < 60);
  check('balanced deeper roster has better chemistry', bMetrics.chemistry > sMetrics.chemistry);
})();

// --- no perfect answer: a max-talent roster cannot also max cap space ---
(function () {
  var loaded = [byId(101), byId(102), byId(103), byId(104)]; // 4 max-salary stars
  var m = E.computeMetrics(loaded);
  check('loaded roster is over the cap', m.overCap === true);
  check('loaded roster has high clout', m.clout >= 70);
  var grade = E.gradeStrategy(m);
  check('over-cap loaded roster is NOT legal', E.isLegalRoster(m) === false);
  check('grade score within 0..100', grade.score >= 0 && grade.score <= 100);
})();

// --- a sensible balanced legal roster grades reasonably and is legal ---
(function () {
  // Brunson(G), Bridges(F), Towns(C) stars + role players, 10 players, under cap
  var roster = [
    byId(1), byId(3), byId(2),          // 3 stars: 25 + 23.3 + 49.2 = 97.5M (Towns/Bridges non-bird, Brunson bird)
    byId(5), byId(6), byId(7),          // role guards/center (some bird)
    byId(8), byId(9), byId(10), byId(11) // depth
  ];
  var m = E.computeMetrics(roster);
  check('balanced roster size = 10', m.count === 10);
  check('balanced roster lineup is balanced', m.balanced === true);
  check('balanced roster under cap', m.overCap === false);
  check('balanced roster is legal', E.isLegalRoster(m) === true);
  var grade = E.gradeStrategy(m);
  check('balanced roster earns a real tier', !!grade.tier && grade.score > 0);
})();

// --- pressure moment applies the right direction and never mutates input ---
(function () {
  var roster = [byId(1), byId(3), byId(2), byId(5), byId(6)];
  var m = E.computeMetrics(roster);
  var winsBefore = m.projectedWins, chemBefore = m.chemistry, cashBefore = m.capSpace;

  var allIn = E.applyPressure(m, 'all-in');
  check('all-in raises wins', allIn.projectedWins >= winsBefore);
  check('all-in lowers chemistry', allIn.chemistry <= chemBefore);
  check('all-in lowers cap space', allIn.capSpace < cashBefore);
  check('applyPressure does not mutate original (wins)', m.projectedWins === winsBefore);
  check('applyPressure does not mutate original (cash)', m.capSpace === cashBefore);

  var future = E.applyPressure(m, 'future');
  check('future raises cap space', future.capSpace > cashBefore);
  check('future lowers wins', future.projectedWins <= winsBefore);

  var bad = E.applyPressure(m, 'not-a-choice');
  check('unknown pressure choice is a no-op', bad.projectedWins === winsBefore);
})();

// --- grading tiers are ordered and bounded ---
(function () {
  var low = E.gradeStrategy({ projectedWins: 20, capSpace: 0, chemistry: 20, clout: 10 });
  var high = E.gradeStrategy({ projectedWins: 70, capSpace: 20000000, chemistry: 90, clout: 90 });
  check('weak build scores low', low.score < 40);
  check('elite build scores high', high.score >= 80);
  check('elite tier is top tier', high.tier === E.TIERS.dynasty.name);
  // tiers must be strictly ordered as score rises
  var mid = E.gradeStrategy({ projectedWins: 50, capSpace: 15000000, chemistry: 70, clout: 60 });
  check('mid build between low and high', mid.score > low.score && mid.score < high.score);
})();

// --- season sim is deterministic with an injected RNG ---
(function () {
  var m = { projectedWins: 55 };
  var g = { record: '52-30', playoff: 'x' };
  var s1 = E.simulateSeason(m, g, function () { return 1; });   // luck +8
  var s0 = E.simulateSeason(m, g, function () { return 0; });   // luck -8
  check('max luck adds ~8 wins', s1.simulatedWins === 63);
  check('min luck subtracts ~8 wins', s0.simulatedWins === 47);
  check('luck label reacts to lucky', s1.luckLabel.indexOf('Lucky') !== -1);
})();

// --- buildResult shape is portable (future Highway World) ---
(function () {
  var m = E.computeMetrics([byId(1), byId(3), byId(2)]);
  var g = E.gradeStrategy(m);
  var r = E.buildResult({ studentName: 'Sam', role: 'Win-Now Builder', metrics: m, grade: g, memo: 'because.' });
  check('result has simulationId', r.simulationId === 'bsc-cap-crash-201');
  check('result has 4 metrics', r.metrics && typeof r.metrics.projectedWins === 'number' &&
        typeof r.metrics.capSpace === 'number' && typeof r.metrics.chemistry === 'number' &&
        typeof r.metrics.clout === 'number');
  check('result carries claim code', typeof r.claimCode === 'string' && r.claimCode.length > 0);
  check('result carries memo', r.memo === 'because.');
  check('result has ISO timestamp', /\d{4}-\d{2}-\d{2}T/.test(r.completedAt));
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);
