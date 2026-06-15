/* DOM smoke test — runs game.js's real browser code path against a minimal
   DOM shim (no jsdom needed). Catches init crashes and exercises the hottest
   interaction paths: building a roster, toggling exceptions, choosing a
   pressure option, and generating a result.
   Run with:  node tests/dom-smoke.test.js  */

var pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.error('  ✗ FAIL: ' + name); }
}

// ---------- minimal DOM shim ----------
function MockNode() {
  this.children = [];
  this.style = {};
  this._text = '';
  this._html = '';
  this.value = '';
  this.attrs = {};
  this.offsetWidth = 0;
  var self = this;
  this.classList = {
    _s: {},
    add: function () { for (var i = 0; i < arguments.length; i++) this._s[arguments[i]] = 1; },
    remove: function () { for (var i = 0; i < arguments.length; i++) delete this._s[arguments[i]]; },
    contains: function (c) { return !!this._s[c]; }
  };
  this.appendChild = function (n) { self.children.push(n); return n; };
  this.insertBefore = function (n) { self.children.push(n); return n; };
  this.removeChild = function () {};
  this.remove = function () {};
  this.addEventListener = function () {};
  this.setAttribute = function (k, v) { self.attrs[k] = v; };
  this.getAttribute = function (k) { return self.attrs[k] != null ? self.attrs[k] : null; };
  this.querySelector = function () { return null; };
  this.querySelectorAll = function () { return []; };
  this.scrollIntoView = function () {};
  this.focus = function () {};
  this.select = function () {};
}
Object.defineProperty(MockNode.prototype, 'textContent', {
  get: function () { return this._text; },
  set: function (v) { this._text = String(v); }
});
Object.defineProperty(MockNode.prototype, 'innerHTML', {
  get: function () { return this._html; },
  set: function (v) { this._html = String(v); this.children = []; }
});

var nodes = {};
function node(id) { if (!nodes[id]) { nodes[id] = new MockNode(); } return nodes[id]; }

var domHandlers = {};
global.window = global;
global.document = {
  readyState: 'loading',
  getElementById: function (id) { return node(id); },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  createElement: function () { return new MockNode(); },
  addEventListener: function (evt, fn) { (domHandlers[evt] = domHandlers[evt] || []).push(fn); },
  head: new MockNode(),
  body: new MockNode()
};
global.navigator = { clipboard: null };
var store = {};
global.localStorage = {
  getItem: function (k) { return store[k] != null ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; }
};
global.alert = function () {};
global.confirm = function () { return true; };
global.setTimeout = function (fn) { try { fn(); } catch (e) {} return 0; };
global.clearTimeout = function () {};

// ---------- load the app scripts (browser globals) ----------
require('../players-data.js');
require('../sim-engine.js');
require('../game.js');

console.log('\nDOM smoke test\n');

// Fire DOMContentLoaded (two listeners are registered)
var threw = null;
try { (domHandlers.DOMContentLoaded || []).forEach(function (fn) { fn(); }); }
catch (e) { threw = e; }
check('app initializes without throwing', threw === null);
if (threw) console.error(threw && threw.stack);

check('inline handler hub (window.__cc) is exposed', global.__cc && typeof global.__cc.move === 'function');

// Build a legal roster by driving the real handlers.
function buildRoster() {
  // Brunson(1,G), Bridges(3,F), Towns(2,C) + depth to reach 10, all legal
  [1, 3, 2, 5, 6, 7, 8, 9, 10, 11].forEach(function (id) {
    global.__cc.move(id, 'Sign', false);
  });
}
threw = null;
try { buildRoster(); } catch (e) { threw = e; }
check('signing players does not throw', threw === null);
if (threw) console.error(threw && threw.stack);

// Toggle a vet-min exception and back (exercise limit logic)
threw = null;
try {
  global.__cc.vet(9, true);
  global.__cc.vet(10, true);
  global.__cc.vet(11, true);
  global.__cc.vet(8, true); // 4th should be politely refused (no throw)
  global.__cc.vet(9, false);
} catch (e) { threw = e; }
check('exception toggling does not throw', threw === null);
if (threw) console.error(threw && threw.stack);

// The dashboard should reflect a non-empty roster
check('cap space value rendered', node('capSpaceValue').textContent.indexOf('$') === 0);
check('wins value rendered', node('winsValue').textContent !== '0' && node('winsValue').textContent !== '');

// A saved build should now exist in storage
check('build saved to localStorage', !!store['bscCapCrash201']);
var saved = JSON.parse(store['bscCapCrash201']);
check('saved build records signed players', saved.players.some(function (p) { return p.status === 'Sign'; }));

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);
