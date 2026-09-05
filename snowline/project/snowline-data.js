/* ---------------------------------------------------------------------------
   snowline-data.js — Snowline's single source of truth.

   The positions below are the ONLY portfolio facts entered by hand, plus a
   short list of constants that cannot be computed from positions (IRR/TWR,
   risk stats, goal settings) and the dividend payment history.

   Everything else — category totals, allocation %, drift vs target, day
   movers, forward payment schedule, dividend series, per-holding transaction
   lots, price history, projections — is DERIVED here. No screen may restate a
   figure; screens read these functions.

   Reconciliation against the brief's headline numbers (positions win):
     shares          brief 2,354.58     derived 2,354.59
     invested        brief $28,431.27   derived $28,431.28
     value           brief $30,374.50   derived $30,374.48
     capital gain    brief +$1,941.83   derived +$1,943.20  (both ▲6.83%)
     total profit    brief +$5,582.45 / +$3,960.70 (KPI vs table total row)
                     derived +$3,989.53 = capital gain + lifetime dividends
                     $1,467.21 + realised P&L $579.12
     passive income  brief 5.23% / $1,589.68 RECONCILES: it is the derived
                     gross forward yield — $1,590.07 / 5.23% ($132.51 monthly,
                     $4.36 daily). Net of 15% withholding: $1,351.56 / 4.45%.
                     Per-position income is rounded to cents at source, so the
                     Annual dividend column sums to that total exactly.
   Sectors are GICS: PEP is Consumer Staples (not Consumer Discretionary, which
   holds AMZN alone) and GOOGL is Communication Services.

   Per-holding dividendsReceived sums to the $1,467.21 lifetime total from
   dividendHistory; per-holding realizedPnL (open + sold) sums to $579.12.
--------------------------------------------------------------------------- */
(function (root) {
  'use strict';

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var QUARTER_MONTHS = { Mar: 1, Jun: 1, Sep: 1, Dec: 1 };

  /* ---- positions --------------------------------------------------------
     status 'open' counts towards every portfolio total; 'sold' positions are
     history only (they carry realised P&L and dividends already received).  */
  var positions = [
    {
      ticker: 'AMZN', name: 'Amazon.com, Inc.', mono: 'AM', status: 'open',
      shares: 1.06554, costTotal: 254.86, costPerShare: 239.18, value: 283.89, price: 266.43,
      yieldPct: 0, frequency: 'Quarterly', sector: 'Consumer Discretionary', assetClass: 'Stock',
      currency: 'USD', fxToUsd: 1, dayChangePct: 0.61, dayChangeAbs: 1.72,
      dividendsReceived: 0, realizedPnL: 0, irr: 12.4, dividendGrowth5Y: null, payoutRatio: null,
      nextExDate: null, nextPayDate: null, caveat: null
    },
    {
      ticker: 'BIL', name: '1–3 Month T-Bill ETF', mono: 'BI', status: 'open',
      shares: 57.18, costTotal: 5230.30, costPerShare: 91.48, value: 5240.22, price: 91.65,
      yieldPct: 3.04, frequency: 'Monthly', sector: 'Funds', assetClass: 'ETF',
      currency: 'USD', fxToUsd: 1, dayChangePct: 0, dayChangeAbs: 0,
      dividendsReceived: 148.60, realizedPnL: 0, irr: 3.1, dividendGrowth5Y: 2.1, payoutRatio: null,
      nextExDate: '1 Sep 2026', nextPayDate: '4 Sep 2026', caveat: null
    },
    {
      ticker: 'DIMEFCD', name: 'Money Market Fund D', mono: 'DI', status: 'open',
      shares: 2000, costTotal: 2000, costPerShare: 1, value: 2000, price: 1,
      yieldPct: 4.5, frequency: 'Monthly', sector: 'Cash', assetClass: 'Cash',
      currency: 'USD', fxToUsd: 1, dayChangePct: 0, dayChangeAbs: 0,
      dividendsReceived: 78.90, realizedPnL: 0, irr: 4.5, dividendGrowth5Y: 0, payoutRatio: null,
      nextExDate: '1 Sep 2026', nextPayDate: '1 Sep 2026',
      caveat: 'Price entered manually — this fund has no market feed.'
    },
    {
      ticker: 'GLDI', name: 'Gold Covered Call ETN', mono: 'GL', status: 'open',
      shares: 25.59, costTotal: 4288.78, costPerShare: 167.60, value: 3825.87, price: 149.51,
      yieldPct: 12.62, frequency: 'Monthly', sector: 'Funds', assetClass: 'ETN',
      currency: 'USD', fxToUsd: 1, dayChangePct: -2.80, dayChangeAbs: -110.02,
      dividendsReceived: 402.18, realizedPnL: 0, irr: -8.6, dividendGrowth5Y: -3.4, payoutRatio: null,
      nextExDate: '8 Sep 2026', nextPayDate: '11 Sep 2026',
      caveat: 'ETN: distributions are not guaranteed and may return capital.'
    },
    {
      ticker: 'GOOGL', name: 'Alphabet Inc. Class A', mono: 'GO', status: 'open',
      shares: 6.696399, costTotal: 2186.47, costPerShare: 326.51, value: 2320.90, price: 346.59,
      yieldPct: 0.22, frequency: 'Quarterly', sector: 'Communication Services', assetClass: 'Stock',
      currency: 'USD', fxToUsd: 1, dayChangePct: 0.94, dayChangeAbs: 21.60,
      dividendsReceived: 3.42, realizedPnL: 0, irr: 9.8, dividendGrowth5Y: null, payoutRatio: 8.9,
      nextExDate: '14 Sep 2026', nextPayDate: '21 Sep 2026', caveat: null
    },
    {
      ticker: 'JEPQ', name: 'Nasdaq Equity Premium Income', mono: 'JE', status: 'open',
      shares: 83.97, costTotal: 4401.70, costPerShare: 52.42, value: 5050.59, price: 60.15,
      yieldPct: 9.22, frequency: 'Monthly', sector: 'Funds', assetClass: 'ETF',
      currency: 'USD', fxToUsd: 1, dayChangePct: -0.18, dayChangeAbs: -9.11,
      dividendsReceived: 371.92, realizedPnL: 41.28, realizedDate: '14 Apr 2026', irr: 22.4, dividendGrowth5Y: 4.8, payoutRatio: null,
      nextExDate: '1 Sep 2026', nextPayDate: '3 Sep 2026', caveat: null
    },
    {
      ticker: 'NVDA', name: 'NVIDIA Corporation', mono: 'NV', status: 'open',
      shares: 4.699698, costTotal: 961.80, costPerShare: 204.65, value: 1022.42, price: 217.55,
      yieldPct: 0.39, frequency: 'Quarterly', sector: 'Information Technology', assetClass: 'Stock',
      currency: 'USD', fxToUsd: 1, dayChangePct: 3.42, dayChangeAbs: 33.78,
      dividendsReceived: 2.61, realizedPnL: 0, irr: 14.2, dividendGrowth5Y: 8.4, payoutRatio: 2.1,
      nextExDate: '10 Sep 2026', nextPayDate: '24 Sep 2026', caveat: null
    },
    {
      ticker: 'PEP', name: 'PepsiCo, Inc.', mono: 'PE', status: 'open',
      shares: 18.43, costTotal: 2553.45, costPerShare: 138.57, value: 2599.58, price: 141.07,
      yieldPct: 3.57, frequency: 'Quarterly', sector: 'Consumer Staples', assetClass: 'Stock',
      currency: 'USD', fxToUsd: 1, dayChangePct: -0.41, dayChangeAbs: -10.70,
      dividendsReceived: 73.24, realizedPnL: 0, irr: 6.4, dividendGrowth5Y: 7.2, payoutRatio: 68.4,
      nextExDate: '4 Sep 2026', nextPayDate: '30 Sep 2026', caveat: null
    },
    {
      ticker: 'QQQI', name: 'Nasdaq 100 Covered Call', mono: 'QQ', status: 'open',
      shares: 5.452381, costTotal: 274.80, costPerShare: 50.40, value: 297.32, price: 54.53,
      yieldPct: 12.19, frequency: 'Monthly', sector: 'Funds', assetClass: 'ETF',
      currency: 'USD', fxToUsd: 1, dayChangePct: -0.72, dayChangeAbs: -2.16,
      dividendsReceived: 24.16, realizedPnL: 0, irr: 18.9, dividendGrowth5Y: null, payoutRatio: null,
      nextExDate: '16 Sep 2026', nextPayDate: '18 Sep 2026', caveat: null
    },
    {
      ticker: 'SCHD', name: 'US Dividend Equity ETF', mono: 'SC', status: 'open',
      shares: 136.52, costTotal: 3727.94, costPerShare: 27.31, value: 4764.59, price: 34.90,
      yieldPct: 2.55, frequency: 'Quarterly', sector: 'Funds', assetClass: 'ETF',
      currency: 'USD', fxToUsd: 1, dayChangePct: 0.28, dayChangeAbs: 13.29,
      dividendsReceived: 154.30, realizedPnL: 84.60, realizedDate: '21 Jan 2026', irr: 34.6, dividendGrowth5Y: 11.6, payoutRatio: 62.1,
      nextExDate: '23 Sep 2026', nextPayDate: '28 Sep 2026', caveat: null
    },
    {
      ticker: 'SLVO', name: 'Silver Covered Call ETN', mono: 'SL', status: 'open',
      shares: 8.820253, costTotal: 615.33, costPerShare: 69.76, value: 616.71, price: 69.92,
      yieldPct: 19.22, frequency: 'Monthly', sector: 'Funds', assetClass: 'ETN',
      currency: 'USD', fxToUsd: 1, dayChangePct: -0.11, dayChangeAbs: -0.68,
      dividendsReceived: 96.44, realizedPnL: 0, irr: 19.7, dividendGrowth5Y: -1.2, payoutRatio: null,
      nextExDate: '8 Sep 2026', nextPayDate: '11 Sep 2026',
      caveat: 'ETN: distributions are not guaranteed and may return capital.'
    },
    {
      ticker: 'V', name: 'Visa Inc. Class A', mono: 'V', status: 'open',
      shares: 6.164534, costTotal: 1935.85, costPerShare: 314.26, value: 2352.39, price: 381.60,
      yieldPct: 0.6, frequency: 'Quarterly', sector: 'Financials', assetClass: 'Stock',
      currency: 'USD', fxToUsd: 1, dayChangePct: 1.12, dayChangeAbs: 26.04,
      dividendsReceived: 9.88, realizedPnL: 0, irr: 28.3, dividendGrowth5Y: 15.8, payoutRatio: 21.3,
      nextExDate: '11 Sep 2026', nextPayDate: '25 Sep 2026', caveat: null
    },
    {
      ticker: 'TSM', name: 'Taiwan Semiconductor ADR', mono: 'TS', status: 'sold',
      shares: 0, costTotal: 0, costPerShare: 0, value: 0, price: 0,
      yieldPct: 0, frequency: 'Quarterly', sector: 'Information Technology', assetClass: 'Stock',
      currency: 'USD', fxToUsd: 1, dayChangePct: 0, dayChangeAbs: 0,
      dividendsReceived: 38.20, realizedPnL: 312.44, irr: 26.8, dividendGrowth5Y: 9.4, payoutRatio: 34.2,
      nextExDate: null, nextPayDate: null, caveat: null,
      soldDate: '19 May 2026', soldProceeds: 1842.60, soldCost: 1530.16, soldShares: 9.412
    },
    {
      ticker: 'XOM', name: 'Exxon Mobil Corporation', mono: 'XO', status: 'sold',
      shares: 0, costTotal: 0, costPerShare: 0, value: 0, price: 0,
      yieldPct: 0, frequency: 'Quarterly', sector: 'Energy', assetClass: 'Stock',
      currency: 'USD', fxToUsd: 1, dayChangePct: 0, dayChangeAbs: 0,
      dividendsReceived: 63.36, realizedPnL: 140.80, irr: 11.2, dividendGrowth5Y: 3.8, payoutRatio: 41.6,
      nextExDate: null, nextPayDate: null, caveat: null,
      soldDate: '02 Mar 2026', soldProceeds: 1284.30, soldCost: 1143.50, soldShares: 10.24
    }
  ];

  /* ---- facts that cannot be derived from positions ---------------------- */
  var constants = {
    portfolioName: 'US Core',
    baseCurrency: 'USD',
    withholdingTax: 0.15,
    irrAllTime: 21.43,
    irrCurrentHoldings: 9.65,
    /* money-weighted return across the 12 open holdings, incl. dividends —
       shown in the holdings-table Total row (brief: ▲17.38%). */
    irrHoldingsTable: 17.38,
    twr: 72.08,
    benchmark: 'SPY',
    benchmarkTwr: 84.82,
    peRatio: 23.7,
    beta: 0.566,
    sharpe: 0.949,
    sortino: 2.103,
    incomeGrowthYoY: 4.5,
    /* superseded by ledgerTotals() — the generated ledger is the source now */
    transactions: { buy: 53715.41, sell: 27354.64 },
    today: { year: 2026, monthIndex: 7, label: '30 Aug 2026' },
    goal: {
      amount: 685000, byYear: 2050, monthlyContribution: 300,
      /* Long-run assumptions, not calibrated to any wanted answer: 9% total
         nominal for a global equity-tilted portfolio, 5% for the cautious
         case. Both are TOTAL returns — price appreciation plus income — and
         the verdict lands wherever projection() puts it. */
      portfolioReturn: 0.09, safeReturn: 0.05, reinvestDividends: true
    }
  };

  /* ---- categories --------------------------------------------------------
     Buckets are the user's, not GICS. They are SEEDED from each holding's
     sector with the target plan below — so the first time the Categories
     screen is opened nothing has moved — and from then on that screen owns
     three things: which bucket each holding sits in, each bucket's target
     weight, and the order they appear in.

     Every consumer reads this one model: the dashboard allocation table, the
     holdings table's "share of category", the cash screen's target weight,
     the nav's insights, and the rebalancing tool to come. Seed targets are
     the user's own plan and sum to 100. ---------------------------------- */
  var categoryTargets = {
    'Funds': 60, 'Cash': 5, 'Financials': 10, 'Communication Services': 8,
    'Consumer Staples': 7, 'Information Technology': 7, 'Consumer Discretionary': 3
  };
  var CATEGORY_KEY = 'snowline.categories.v1';
  var categoryMemory = null;

  function categorySeed() {
    var order = Object.keys(categoryTargets), targets = {}, assign = {};
    order.forEach(function (n) { targets[n] = categoryTargets[n]; });
    open().forEach(function (p) {
      var name = p.sector;
      if (targets[name] === undefined) { targets[name] = 0; order.push(name); }
      assign[p.ticker] = name;
    });
    return { order: order, targets: targets, assign: assign };
  }

  function categoryModel() {
    var seed = categorySeed();
    var saved = categoryMemory;
    if (!saved) {
      try { saved = JSON.parse(window.localStorage.getItem(CATEGORY_KEY) || 'null'); }
      catch (e) { saved = null; }
    }
    if (!saved || !saved.order || !saved.order.length || !saved.targets || !saved.assign) return seed;
    var order = saved.order.filter(function (n, i) {
      return typeof n === 'string' && n.length > 0 && saved.order.indexOf(n) === i;
    });
    if (!order.length) return seed;
    var targets = {}, assign = {};
    order.forEach(function (n) {
      var v = Number(saved.targets[n]);
      targets[n] = isFinite(v) ? Math.max(0, Math.round(v * 100) / 100) : 0;
    });
    open().forEach(function (p) {
      var n = saved.assign[p.ticker];
      if (order.indexOf(n) < 0) n = order.indexOf(seed.assign[p.ticker]) >= 0 ? seed.assign[p.ticker] : order[0];
      assign[p.ticker] = n;
    });
    return { order: order, targets: targets, assign: assign };
  }

  function saveCategoryModel(m) {
    categoryMemory = { order: m.order.slice(), targets: Object.assign({}, m.targets), assign: Object.assign({}, m.assign) };
    try { window.localStorage.setItem(CATEGORY_KEY, JSON.stringify(categoryMemory)); } catch (e) {}
    return categoryModel();
  }
  function resetCategories() {
    categoryMemory = null;
    try { window.localStorage.removeItem(CATEGORY_KEY); } catch (e) {}
    return categoryModel();
  }

  function categoryOf(ticker) { return categoryModel().assign[ticker] || null; }
  function categoryTargetOf(name) { var t = categoryModel().targets[name]; return t === undefined ? 0 : t; }
  function targetTotal() {
    var m = categoryModel();
    return Math.round(sum(m.order.map(function (n) { return m.targets[n]; })) * 100) / 100;
  }

  /* Mutations. Each validates, persists, and returns the resulting model, so
     no screen ever writes the shape by hand. */
  function assignHolding(ticker, name) {
    var m = categoryModel();
    if (m.order.indexOf(name) < 0 || !byTicker(ticker)) return m;
    m.assign[ticker] = name;
    return saveCategoryModel(m);
  }
  function setCategoryTarget(name, pct) {
    var m = categoryModel();
    if (m.order.indexOf(name) < 0) return m;
    var v = Number(pct);
    m.targets[name] = isFinite(v) ? Math.max(0, Math.min(100, Math.round(v * 100) / 100)) : 0;
    return saveCategoryModel(m);
  }
  function createCategory(name, target) {
    var m = categoryModel(), clean = String(name || '').trim();
    if (!clean || m.order.indexOf(clean) >= 0) return m;
    m.order.push(clean);
    m.targets[clean] = Math.max(0, Number(target) || 0);
    return saveCategoryModel(m);
  }
  function renameCategory(from, to) {
    var m = categoryModel(), clean = String(to || '').trim();
    if (!clean || m.order.indexOf(from) < 0 || (clean !== from && m.order.indexOf(clean) >= 0)) return m;
    m.order = m.order.map(function (n) { return n === from ? clean : n; });
    m.targets[clean] = m.targets[from];
    if (clean !== from) delete m.targets[from];
    Object.keys(m.assign).forEach(function (t) { if (m.assign[t] === from) m.assign[t] = clean; });
    return saveCategoryModel(m);
  }
  /* Holdings are never orphaned: they move to `moveTo`, and the deleted
     bucket's target goes with them so the plan still sums the same. */
  function deleteCategory(name, moveTo) {
    var m = categoryModel();
    if (m.order.indexOf(name) < 0 || m.order.length < 2) return m;
    var dest = m.order.indexOf(moveTo) >= 0 && moveTo !== name ? moveTo
      : m.order.filter(function (n) { return n !== name; })[0];
    Object.keys(m.assign).forEach(function (t) { if (m.assign[t] === name) m.assign[t] = dest; });
    m.targets[dest] = Math.round((m.targets[dest] + m.targets[name]) * 100) / 100;
    delete m.targets[name];
    m.order = m.order.filter(function (n) { return n !== name; });
    return saveCategoryModel(m);
  }
  function moveCategory(name, delta) {
    var m = categoryModel(), i = m.order.indexOf(name), j = i + delta;
    if (i < 0 || j < 0 || j >= m.order.length) return m;
    m.order.splice(j, 0, m.order.splice(i, 1)[0]);
    return saveCategoryModel(m);
  }
  /* Scale every target proportionally so the plan sums to 100 again. */
  function normaliseTargets() {
    var m = categoryModel(), total = targetTotal();
    if (!total) return m;
    var acc = 0;
    m.order.forEach(function (n, i) {
      if (i === m.order.length - 1) { m.targets[n] = Math.round((100 - acc) * 100) / 100; return; }
      var v = Math.round(m.targets[n] / total * 10000) / 100;
      m.targets[n] = v; acc = Math.round((acc + v) * 100) / 100;
    });
    return saveCategoryModel(m);
  }

  /* Categories with drift against target. Largest first by default — the
     dashboard's order — or in the user's own order with `ordered`. */
  function categories(ordered) {
    var m = categoryModel();
    var value = sum(open().map(function (p) { return p.value; }));
    var list = m.order.map(function (name, i) {
      var hs = open().filter(function (p) { return m.assign[p.ticker] === name; });
      var v = sum(hs.map(function (p) { return p.value; }));
      var inv = sum(hs.map(function (p) { return p.costTotal; }));
      var income = sum(hs.map(annualGross));
      var target = m.targets[name] || 0;
      var alloc = value ? v / value * 100 : 0;
      return {
        name: name, index: i, count: hs.length,
        tickers: hs.map(function (p) { return p.ticker; }),
        holdings: hs,
        value: v, invested: inv, gainAbs: v - inv, gainPctN: inv ? (v - inv) / inv * 100 : 0,
        income: income, yieldPct: v ? income / v * 100 : 0,
        allocN: alloc, targetN: target, driftN: alloc - target,
        targetValue: value * target / 100, deltaValue: value * target / 100 - v
      };
    });
    return ordered ? list : list.slice().sort(function (a, b) { return b.value - a.value; });
  }

  /* Dividends actually received, net of withholding tax, by calendar month.
     Portfolio opened Oct 2024; 2026 runs to the current month (Aug). */
  var dividendHistory = {
    2024: [0, 0, 0, 0, 0, 0, 0, 0, 0, 4.20, 12.60, 15.29],
    2025: [10.20, 12.40, 24.60, 14.10, 15.80, 28.90, 17.20, 18.90, 96.50, 84.20, 86.40, 152.80],
    2026: [92.40, 94.80, 151.20, 98.60, 100.40, 158.70, 99.20, 77.82]
  };

  /* ---- helpers ---------------------------------------------------------- */
  function sum(a) { return a.reduce(function (s, v) { return s + v; }, 0); }
  function open() { return positions.filter(function (p) { return p.status === 'open'; }); }
  function sold() { return positions.filter(function (p) { return p.status === 'sold'; }); }
  /* Rounded to cents at source: a money column must sum to its own total. */
  function annualGross(p) { return Math.round(p.value * p.yieldPct) / 100; }
  function net(gross) { return gross * (1 - constants.withholdingTax); }
  function payers() { return open().filter(function (p) { return p.yieldPct > 0; }); }
  function byTicker(t) { return positions.filter(function (p) { return p.ticker === t; })[0]; }

  /* ---- derivations ------------------------------------------------------ */
  function dividendTimeline() {
    var out = [];
    [2024, 2025, 2026].forEach(function (y) {
      dividendHistory[y].forEach(function (v, i) {
        if (y !== 2024 || v > 0) out.push({ label: MONTHS[i], year: String(y), v: v });
      });
    });
    return out;
  }

  function totals() {
    var o = open();
    var value = sum(o.map(function (p) { return p.value; }));
    var invested = sum(o.map(function (p) { return p.costTotal; }));
    var shares = sum(o.map(function (p) { return p.shares; }));
    var capitalGain = value - invested;
    var dayChange = sum(o.map(function (p) { return p.dayChangeAbs; }));
    var gross = sum(o.map(annualGross));
    var lifetime = sum([2024, 2025, 2026].map(function (y) { return sum(dividendHistory[y]); }));
    var received = sum(positions.map(function (p) { return p.dividendsReceived; }));
    var realized = sum(positions.map(function (p) { return p.realizedPnL; }));
    var trailing = sum(dividendTimeline().slice(-12).map(function (x) { return x.v; }));
    var profit = capitalGain + received + realized;
    return {
      value: value, invested: invested, shares: shares,
      capitalGain: capitalGain, capitalGainPct: capitalGain / invested * 100,
      dayChange: dayChange, dayChangePct: dayChange / (value - dayChange) * 100,
      dividendsLifetime: lifetime, dividendsReceived: received,
      dividendsTrailing12: trailing, realizedPnL: realized,
      totalProfit: profit, totalProfitPct: profit / invested * 100,
      forwardGross: gross, forwardNet: net(gross),
      forwardMonthlyNet: net(gross) / 12, forwardDailyNet: net(gross) / 365,
      grossYield: gross / value * 100, netYield: net(gross) / value * 100,
      yieldOnCost: gross / invested * 100,
      holdings: o.length, soldCount: sold().length,
      categoryCount: categoryModel().order.length,
      goalProgressPct: value / constants.goal.amount * 100
    };
  }

  function movers() {
    var up = open().filter(function (p) { return p.dayChangeAbs > 0; }).sort(function (a, b) { return b.dayChangePct - a.dayChangePct; });
    var down = open().filter(function (p) { return p.dayChangeAbs < 0; }).sort(function (a, b) { return a.dayChangePct - b.dayChangePct; });
    return {
      gainers: up, losers: down,
      gainSum: sum(up.map(function (p) { return p.dayChangeAbs; })),
      lossSum: sum(down.map(function (p) { return p.dayChangeAbs; }))
    };
  }

  /* Per-holding figures used by the holdings table. */
  function holding(p) {
    var t = totals();
    var name = categoryOf(p.ticker) || p.sector;
    var cat = categories().filter(function (c) { return c.name === name; })[0];
    var gain = p.value - p.costTotal;
    var profit = gain + p.dividendsReceived + p.realizedPnL;
    var gross = annualGross(p);
    return {
      p: p, capitalGain: gain,
      capitalGainPct: p.costTotal ? gain / p.costTotal * 100 : 0,
      totalProfit: profit,
      totalProfitPct: p.costTotal ? profit / p.costTotal * 100 : 0,
      annualGross: gross, annualNet: net(gross),
      perShareGross: p.shares ? gross / p.shares : 0,
      dividendsPerShare: p.shares ? p.dividendsReceived / p.shares : 0,
      yieldOnCost: p.costTotal ? gross / p.costTotal * 100 : 0,
      shareOfPortfolio: t.value ? p.value / t.value * 100 : 0,
      shareOfCategory: cat && cat.value ? p.value / cat.value * 100 : 0,
      categoryName: name
    };
  }
  function holdings(includeSold) {
    return (includeSold ? positions : open()).map(holding);
  }

  /* Gross payments due in a given calendar month, largest first. */
  function scheduleFor(month) {
    return payers().map(function (p) {
      if (p.frequency === 'Monthly') return { t: p.ticker, amt: annualGross(p) / 12 };
      if (QUARTER_MONTHS[month]) return { t: p.ticker, amt: annualGross(p) / 4 };
      return null;
    }).filter(Boolean).sort(function (a, b) { return b.amt - a.amt; });
  }

  /* Forward 12 months from the current month. Payments already made this
     month are Paid, next month's are Declared, the rest Estimated. */
  function forwardPayments() {
    var paidThisMonth = { JEPQ: 1, BIL: 1, DIMEFCD: 1 };
    var out = [];
    for (var i = 0; i < 12; i++) {
      var mi = (constants.today.monthIndex + i) % 12;
      var year = constants.today.year + Math.floor((constants.today.monthIndex + i) / 12);
      var month = MONTHS[mi];
      var rows = scheduleFor(month).map(function (r) {
        return { t: r.t, amt: r.amt, status: i === 0 ? (paidThisMonth[r.t] ? 'Paid' : 'Estimated') : (i === 1 ? 'Declared' : 'Estimated') };
      });
      out.push({
        m: month, year: String(year), label: month, full: month + ' ' + year,
        total: sum(rows.map(function (r) { return r.amt; })),
        received: sum(rows.filter(function (r) { return r.status === 'Paid'; }).map(function (r) { return r.amt; })),
        rows: rows
      });
    }
    return out;
  }

  /* ---- dividend calendar --------------------------------------------------
     Day-level events for any month, projected from each payer's own known
     ex-date and pay-date and its frequency. Amounts come from the same
     annualGross() the rest of the app uses, so a month's total here agrees
     with the forward schedule. Status follows the same three states as the
     forward chart: everything up to today is Paid, next month is Declared,
     later months Estimated. ------------------------------------------------ */
  function daysInMonth(y, mi) { return new Date(y, mi + 1, 0).getDate(); }
  function todayDay() { return parseDate(constants.today.label).d; }

  function payAnchor(p) {
    return {
      pay: p.nextPayDate ? parseDate(p.nextPayDate) : null,
      ex: p.nextExDate ? parseDate(p.nextExDate) : null
    };
  }
  function paysInMonth(p, mi) {
    if (!p.yieldPct || p.status !== 'open') return false;
    if (p.frequency === 'Monthly') return true;
    var a = payAnchor(p);
    if (!a.pay) return false;
    return (((mi - a.pay.m) % 3) + 3) % 3 === 0;
  }
  function clampDay(day, y, mi) { return Math.min(day, daysInMonth(y, mi)); }

  function calendarMonth(year, mi) {
    var rank = (year * 12 + mi) - (constants.today.year * 12 + constants.today.monthIndex);
    var td = todayDay();
    var events = [];
    payers().forEach(function (p) {
      if (!paysInMonth(p, mi)) return;
      var a = payAnchor(p);
      var payDay = clampDay(a.pay ? a.pay.d : 15, year, mi);
      var exDay = clampDay(a.ex ? a.ex.d : Math.max(1, payDay - 3), year, mi);
      var gross = p.frequency === 'Monthly' ? annualGross(p) / 12 : annualGross(p) / 4;
      var status = rank < 0 ? 'Paid'
        : rank === 0 ? (payDay <= td ? 'Paid' : 'Declared')
          : rank === 1 ? 'Declared' : 'Estimated';
      events.push({
        ticker: p.ticker, name: p.name, mono: p.mono, frequency: p.frequency,
        shares: p.shares, yieldPct: p.yieldPct, status: status,
        day: payDay, exDay: exDay,
        exDate: exDay + ' ' + MONTHS[mi] + ' ' + year,
        payDate: payDay + ' ' + MONTHS[mi] + ' ' + year,
        gross: gross, net: net(gross), perShare: p.shares ? gross / p.shares : 0
      });
    });
    events.sort(function (a, b) { return a.day - b.day || b.gross - a.gross; });

    var n = daysInMonth(year, mi);
    var days = [];
    for (var d = 1; d <= n; d++) {
      var onDay = events.filter(function (e) { return e.day === d; });
      days.push({
        day: d, events: onDay,
        gross: sum(onDay.map(function (e) { return e.gross; })),
        net: sum(onDay.map(function (e) { return e.net; })),
        isToday: rank === 0 && d === td
      });
    }
    var byStatus = function (s) {
      return sum(events.filter(function (e) { return e.status === s; }).map(function (e) { return e.gross; }));
    };
    return {
      year: year, monthIndex: mi, label: MONTHS[mi] + ' ' + year,
      short: MONTHS[mi] + " '" + String(year).slice(2),
      leadingBlanks: ((new Date(year, mi, 1).getDay()) + 6) % 7,
      days: days, events: events,
      gross: sum(events.map(function (e) { return e.gross; })),
      netTotal: sum(events.map(function (e) { return e.net; })),
      paid: byStatus('Paid'), declared: byStatus('Declared'), estimated: byStatus('Estimated'),
      count: events.length
    };
  }

  /* Twelve months of calendar totals, split by status for the bar chart. */
  function calendarYear(year, mi) {
    var out = [];
    for (var i = 0; i < 12; i++) {
      var m = mi + i, y = year + Math.floor(m / 12);
      out.push(calendarMonth(y, ((m % 12) + 12) % 12));
    }
    return out;
  }

  function paymentCountNext12() {
    return sum(payers().map(function (p) { return p.frequency === 'Monthly' ? 12 : 4; }));
  }

  /* ---- goal projection ---------------------------------------------------
     One engine behind the Dashboard's "My goal" card and the My goal screen.
     Nothing about it is stored: the seeds are today's portfolio value and
     today's forward income, and everything else is an assumption the user
     can change.

     The month is the step, because the contribution is monthly; annual lumps
     would understate it. Two state variables move together:

       income   accrues monthly at income/12, is taxed at the drag, then
                grows at the dividend-growth rate (payout rises), and gains
                the yield on any new money
       value    appreciates at the PRICE return only — expected total return
                less the portfolio's own current gross yield — so income is
                never counted twice; contributions land monthly, and the net
                dividend is added back only when reinvestDividends is on

     `mode` decides which of the two series the target is measured against;
     the verdict, the crossing markers, the chart and every table row are
     read off that one array, so they cannot disagree.

     A saved config in localStorage (written by the My goal screen) is what
     projection() with no argument uses, which is how the Dashboard card
     stays in step with the screen. ---------------------------------------- */
  var GOAL_KEY = 'snowline.goal.v1';
  var GOAL_DEFAULTS = {
    mode: 'value',                                     /* 'value' | 'income' */
    valueTarget: constants.goal.amount,
    incomeTarget: 36000,                              /* dollars a year, gross */
    byYear: constants.goal.byYear,
    monthlyContribution: constants.goal.monthlyContribution,
    contributionGrowth: 0.035,
    expectedReturn: constants.goal.portfolioReturn,   /* total: price + income */
    safeReturn: constants.goal.safeReturn,
    dividendGrowth: 0.05,
    inflation: 0.025,
    reinvestDividends: constants.goal.reinvestDividends,
    taxDrag: constants.withholdingTax,
    currency: constants.baseCurrency
  };
  var goalMemory = null;   /* fallback when localStorage is unavailable */

  function readSavedGoal() {
    if (goalMemory) return goalMemory;
    var raw = null;
    try { raw = JSON.parse(window.localStorage.getItem(GOAL_KEY) || 'null'); } catch (e) { return null; }
    if (!raw || typeof raw !== 'object') return null;
    /* Migration: the returns were briefly calibrated to force a 2038 verdict.
       A config still carrying those two numbers picks up today's long-run
       defaults instead; everything the user actually chose is kept. */
    if (Math.abs(raw.expectedReturn - 0.2745) < 1e-6) delete raw.expectedReturn;
    if (Math.abs(raw.safeReturn - 0.12) < 1e-9) delete raw.safeReturn;
    return raw;
  }

  function goalConfig(patch) {
    var cfg = Object.assign({}, GOAL_DEFAULTS);
    [readSavedGoal(), patch].forEach(function (src) {
      if (!src || typeof src !== 'object') return;
      Object.keys(GOAL_DEFAULTS).forEach(function (k) {
        var v = src[k];
        if (v === undefined || v === null || v === '') return;
        if (typeof GOAL_DEFAULTS[k] === 'number') { v = Number(v); if (!isFinite(v)) return; }
        cfg[k] = v;
      });
    });
    if (cfg.mode !== 'income') cfg.mode = 'value';
    cfg.byYear = Math.min(2100, Math.max(constants.today.year + 1, Math.round(cfg.byYear)));
    cfg.valueTarget = Math.max(1, cfg.valueTarget);
    cfg.incomeTarget = Math.max(1, cfg.incomeTarget);
    cfg.monthlyContribution = Math.max(0, cfg.monthlyContribution);
    cfg.taxDrag = Math.min(0.9, Math.max(0, cfg.taxDrag));
    cfg.target = cfg.mode === 'income' ? cfg.incomeTarget : cfg.valueTarget;
    return cfg;
  }

  function saveGoalConfig(cfg) {
    var keep = {};
    Object.keys(GOAL_DEFAULTS).forEach(function (k) { keep[k] = cfg[k]; });
    goalMemory = keep;
    try { window.localStorage.setItem(GOAL_KEY, JSON.stringify(keep)); } catch (e) {}
    return goalConfig();
  }
  function clearGoalConfig() {
    goalMemory = null;
    try { window.localStorage.removeItem(GOAL_KEY); } catch (e) {}
    return goalConfig();
  }

  /* ---- cash ---------------------------------------------------------------
     There is no stored cash ledger. What exists is the money-market line and
     the dated rows that each moved cash: buys and their fees out, sells and
     dividends in. Deposits and withdrawals are solved for, under one stated
     policy:

       top up   before any row that would take the balance below the float,
                rounded up to $50
       sweep    anything more than $500 above the float back to the bank
                after an inflow, rounded down to $50

     The float is the money-market line itself, so the walk never goes
     negative and ends exactly on today's balance. A closing adjustment
     absorbs the rounding so the last row equals the stored position. ------ */
  function cashPositions() {
    return open().filter(function (p) { return p.assetClass === 'Cash'; });
  }
  function cashFloat() { return sum(cashPositions().map(function (p) { return p.value; })); }

  var cashCache = null;
  function cashFlow() {
    if (cashCache) return cashCache;
    var float = cashFloat();
    var src = ledger().slice().reverse();          /* oldest first */
    var rows = [], bal = 0, n = 0;
    var add = function (type, date, signed, label, detail, ticker, mono) {
      bal = Math.round((bal + signed) * 100) / 100;
      rows.push({
        id: 'cf' + (++n), type: type, date: date, signed: signed,
        amount: Math.abs(signed), inflow: signed > 0,
        label: label, detail: detail, ticker: ticker || null, mono: mono || null,
        balance: bal
      });
    };

    src.forEach(function (r) {
      var effect = r.kind === 'income' ? r.amount
        : r.operation === 'Buy' ? -(r.amount + r.fee) : (r.amount - r.fee);
      effect = Math.round(effect * 100) / 100;
      if (effect < 0 && bal + effect < float) {
        var need = Math.ceil((float - (bal + effect)) / 50) * 50;
        add('Deposit', r.date, need, 'Deposit', 'Funding the ' + r.ticker + ' purchase');
      }
      if (r.kind === 'income') {
        add('Dividend', r.date, effect, r.ticker + ' dividend', r.note || 'Cash distribution', r.ticker, r.mono);
      } else if (r.operation === 'Buy') {
        add('Buy', r.date, effect, 'Bought ' + r.ticker, fmt.shares(r.shares) + ' sh at ' + fmt.money(r.price) + (r.fee ? ' · ' + fmt.money(r.fee) + ' fee' : ''), r.ticker, r.mono);
      } else {
        add('Sell', r.date, effect, 'Sold ' + r.ticker, fmt.shares(r.shares) + ' sh at ' + fmt.money(r.price) + (r.fee ? ' · ' + fmt.money(r.fee) + ' fee' : ''), r.ticker, r.mono);
      }
      if (effect > 0 && bal > float + 500) {
        var sweep = Math.floor((bal - float) / 50) * 50;
        if (sweep > 0) add('Withdrawal', r.date, -sweep, 'Withdrawal', 'Swept back to the bank above the ' + fmt.money(float) + ' float');
      }
    });
    var diff = Math.round((float - bal) * 100) / 100;
    if (Math.abs(diff) >= 0.01) {
      add(diff > 0 ? 'Deposit' : 'Withdrawal', constants.today.label, diff, diff > 0 ? 'Deposit' : 'Withdrawal', 'Reconciled to the money-market line');
    }

    var by = function (t) { return rows.filter(function (r) { return r.type === t; }); };
    var tot = function (t) { return sum(by(t).map(function (r) { return r.amount; })); };

    /* monthly in/out, over the same span the value charts use */
    var span = monthSpan(), index = {};
    var months = span.map(function (mo) {
      var m = {
        key: mo.key, label: mo.label, short: mo.short, year: mo.year, monthIndex: mo.monthIndex,
        deposits: 0, withdrawals: 0, invested: 0, proceeds: 0, income: 0, inflow: 0, outflow: 0, net: 0, end: 0
      };
      index[mo.key] = m;
      return m;
    });
    rows.forEach(function (r) {
      var d = parseDate(r.date), key = MONTHS[d.m] + ' ' + d.y, m = index[key];
      if (!m) return;
      if (r.type === 'Deposit') m.deposits += r.amount;
      else if (r.type === 'Withdrawal') m.withdrawals += r.amount;
      else if (r.type === 'Buy') m.invested += r.amount;
      else if (r.type === 'Sell') m.proceeds += r.amount;
      else m.income += r.amount;
      if (r.signed > 0) m.inflow += r.amount; else m.outflow += r.amount;
      m.net = m.inflow - m.outflow;
      m.end = r.balance;
    });
    var running = 0;
    months.forEach(function (m) { if (!m.end) m.end = running; running = m.end; });

    cashCache = {
      currency: constants.baseCurrency, float: float, balance: bal, rows: rows.slice().reverse(),
      deposits: tot('Deposit'), withdrawals: tot('Withdrawal'),
      netDeposits: tot('Deposit') - tot('Withdrawal'),
      invested: tot('Buy'), proceeds: tot('Sell'), income: tot('Dividend'),
      depositCount: by('Deposit').length, withdrawalCount: by('Withdrawal').length,
      count: rows.length, months: months,
      first: rows.length ? rows[0].date : null, last: rows.length ? rows[rows.length - 1].date : null
    };
    return cashCache;
  }

  /* Cash weight, what it yields, and what holding it costs against the
     goal screen's own expected return. */
  function cashStats() {
    var T = totals(), cash = cashFloat();
    var ps = cashPositions();
    var y = cash ? sum(ps.map(function (p) { return p.value * p.yieldPct; })) / cash : 0;
    var expected = goalConfig().expectedReturn * 100;
    /* the target weight of whichever categories the cash lines sit in — the
       Categories screen owns that number, not this one */
    var names = [];
    ps.forEach(function (p) {
      var n = categoryOf(p.ticker);
      if (n && names.indexOf(n) < 0) names.push(n);
    });
    var target = sum(names.map(categoryTargetOf));
    var weight = T.value ? cash / T.value * 100 : 0;
    var gap = Math.max(0, expected - y);
    return {
      cash: cash, weight: weight, target: target, drift: weight - target,
      categoryNames: names,
      yieldPct: y, income: cash * y / 100, monthlyIncome: cash * y / 100 / 12,
      expectedReturn: expected, gap: gap,
      dragPct: weight / 100 * gap, dragAnnual: cash * gap / 100,
      positions: ps.map(function (p) {
        return {
          ticker: p.ticker, name: p.name, mono: p.mono, currency: p.currency,
          value: p.value, yieldPct: p.yieldPct, frequency: p.frequency,
          income: annualGross(p), monthly: annualGross(p) / 12, caveat: p.caveat,
          share: cash ? p.value / cash * 100 : 0
        };
      })
    };
  }

  /* Cash balances grouped by currency (only the base currency is held). */
  function cashByCurrency() {
    var ps = cashPositions(), total = cashFloat(), map = {}, order = [];
    ps.forEach(function (p) {
      if (!map[p.currency]) { map[p.currency] = { currency: p.currency, balance: 0, inBase: 0, income: 0, lines: [] }; order.push(p.currency); }
      var c = map[p.currency];
      c.balance += p.value;
      c.inBase += p.value * (p.fxToUsd || 1);
      c.income += annualGross(p);
      c.lines.push(p.ticker);
    });
    return order.map(function (k) {
      var c = map[k];
      return Object.assign(c, {
        pct: total ? c.balance / total * 100 : 0,
        yieldPct: c.balance ? c.income / c.balance * 100 : 0,
        isBase: k === constants.baseCurrency
      });
    }).sort(function (a, b) { return b.balance - a.balance; });
  }

  function projection(patch) {
    var cfg = goalConfig(patch);
    var T = totals();
    var v0 = T.value, i0 = T.forwardGross, y0 = i0 / v0;
    var span = cfg.byYear - constants.today.year;
    var target = cfg.target;
    var pick = function (pt) { return cfg.mode === 'income' ? pt.income : pt.value; };

    function run(totalReturn, reinvest) {
      var mPrice = Math.pow(1 + (totalReturn - y0), 1 / 12) - 1;
      var mDiv = Math.pow(1 + cfg.dividendGrowth, 1 / 12) - 1;
      var v = v0, inc = i0, rate = cfg.monthlyContribution;
      var contributed = 0, dividends = 0, taxes = 0;
      var pts = [{ n: 0, value: v, income: inc, contributed: 0, dividends: 0, taxes: 0, monthly: rate, thisYear: 0 }];
      var monthly = [{ value: v, income: inc }];
      for (var y = 0; y < span; y++) {
        for (var m = 0; m < 12; m++) {
          var gross = inc / 12, netDiv = gross * (1 - cfg.taxDrag);
          dividends += gross; taxes += gross - netDiv;
          inc = inc * (1 + mDiv);
          v = v * (1 + mPrice);
          v += rate; contributed += rate; inc += rate * y0;
          if (reinvest) { v += netDiv; inc += netDiv * y0; }
          monthly.push({ value: v, income: inc });
        }
        pts.push({
          n: y + 1, value: v, income: inc, contributed: contributed,
          dividends: dividends, taxes: taxes, monthly: rate, thisYear: rate * 12
        });
        rate = rate * (1 + cfg.contributionGrowth);
      }
      return { pts: pts, monthly: monthly };
    }

    /* fractional years to the target, resolved to the month */
    function crossOf(monthly) {
      for (var i = 1; i < monthly.length; i++) {
        var a = pick(monthly[i - 1]), b = pick(monthly[i]);
        if (b >= target) return (i - 1 + (b === a ? 0 : (target - a) / (b - a))) / 12;
      }
      return null;
    }

    /* The comparison line has to say something the main line doesn't. In
       value mode that is the safe return. In income mode a lower price
       return leaves the income path untouched — dividends come from the
       payout, not the price — so the honest second line is the other
       reinvestment choice, which is what actually moves an income goal. */
    var port = run(cfg.expectedReturn, cfg.reinvestDividends);
    var altIncome = cfg.mode === 'income';
    var alt = altIncome
      ? run(cfg.expectedReturn, !cfg.reinvestDividends)
      : run(cfg.safeReturn, cfg.reinvestDividends);
    var altLabel = altIncome
      ? (cfg.reinvestDividends ? 'Without reinvesting' : 'With reinvesting')
      : 'Safe scenario';
    var P = port.pts.map(pick), S = alt.pts.map(pick);
    var cp = crossOf(port.monthly), cs = crossOf(alt.monthly);
    var real = function (v, n) { return v / Math.pow(1 + cfg.inflation, n); };

    var rows = port.pts.map(function (pt, n) {
      return {
        n: n, year: constants.today.year + n, isToday: n === 0,
        goal: target,
        contributionYear: pt.thisYear, contributionMonthly: pt.monthly,
        contributedToDate: pt.contributed,
        dividends: pt.dividends, taxes: pt.taxes,
        value: pt.value, income: pt.income,
        portfolio: P[n], portfolioReal: real(P[n], n),
        safe: S[n], safeReal: real(S[n], n),
        reached: P[n] >= target, safeReached: S[n] >= target
      };
    });

    var end = P[span], endSafe = S[span];
    return {
      cfg: cfg, mode: cfg.mode,
      modeLabel: cfg.mode === 'income' ? 'Passive income' : 'Value',
      altLabel: altLabel,
      unit: cfg.mode === 'income' ? 'a year' : '',
      startValue: v0, startIncome: i0, startYield: y0 * 100,
      current: cfg.mode === 'income' ? i0 : v0,
      target: target, goal: target, byYear: cfg.byYear,
      span: span, startYear: constants.today.year,
      P: P, S: S, years: rows,
      crossP: cp, crossS: cs,
      crossPYear: cp === null ? null : constants.today.year + Math.round(cp),
      crossSYear: cs === null ? null : constants.today.year + Math.round(cs),
      yearsToGoal: cp === null ? null : Math.round(cp),
      achievable: cp !== null, safeAchievable: cs !== null,
      progressPct: target ? Math.min(100, cfg.mode === 'income' ? i0 / target * 100 : v0 / target * 100) : 0,
      endValue: end, endSafe: endSafe, endReal: real(end, span),
      endSafeReal: real(endSafe, span),
      shortfall: Math.max(0, target - end),
      totalContributions: port.pts[span].contributed,
      totalDividends: port.pts[span].dividends,
      totalTaxes: port.pts[span].taxes,
      /* what the target is worth in the other unit, at today's yield */
      rewardIncome: target * y0, rewardCapital: y0 ? target / y0 : 0
    };
  }

  /* ---- monthly history --------------------------------------------------
     One engine behind Growth, Metrics and Report. Everything is solved, not
     stored, and it is pinned at both ends:

       cumulative deposits  ends at the real cost basis   $28,431.28
       portfolio value      ends at the real market value $30,374.48
       chain-linked return  ends at constants.twr          72.08%

     Those three only reconcile if the gains came early on little capital and
     the deposits came late — which is also what makes IRR (21.43%) sit far
     above the simple value/cost gain (+6.83%). So the return path is
     front-loaded, the deposit path is solved for: a single blend factor
     between "all money in at the start" and "all money in at the end" is
     bisected until the value line lands exactly on today's total. ------- */
  var HISTORY_START = { year: 2024, monthIndex: 9 };   /* Oct 2024 */

  function monthSpan() {
    var out = [];
    var y = HISTORY_START.year, m = HISTORY_START.monthIndex;
    while (y < constants.today.year || (y === constants.today.year && m <= constants.today.monthIndex)) {
      out.push({ year: y, monthIndex: m, label: MONTHS[m], key: MONTHS[m] + ' ' + y, short: MONTHS[m] + " '" + String(y).slice(2) });
      m += 1; if (m > 11) { m = 0; y += 1; }
    }
    return out;
  }

  /* Monthly returns whose product equals `totalReturn`, front-loaded. */
  function returnPath(seed, n, totalReturn) {
    var rnd = seeded(seed), raw = [];
    for (var i = 0; i < n; i++) {
      var decay = Math.pow(1 - i / n, 1.6);          /* early months move more */
      raw.push((rnd() - 0.38) * 0.09 * (0.35 + decay));
    }
    var prod = raw.reduce(function (s, r) { return s * (1 + r); }, 1);
    var k = Math.pow((1 + totalReturn) / prod, 1 / n);
    return raw.map(function (r) { return (1 + r) * k - 1; });
  }

  var historyCache = null;
  function history() {
    if (historyCache) return historyCache;
    var months = monthSpan(), n = months.length;
    var T = totals();
    var targetDeposits = T.invested, targetValue = T.value;
    var r = returnPath('twr', n, constants.twr / 100);
    var b = returnPath('spy', n, constants.benchmarkTwr / 100);

    /* two deposit shapes, blended by theta and solved by bisection */
    var early = [], late = [];
    for (var i = 0; i < n; i++) {
      early.push(Math.pow(1 - i / n, 2.2) + 0.02);
      late.push(Math.pow((i + 1) / n, 2.6) + 0.02);
    }
    function norm(a) { var s = sum(a); return a.map(function (v) { return v / s; }); }
    early = norm(early); late = norm(late);

    function run(theta) {
      var v = 0, dep = [], vals = [];
      for (var j = 0; j < n; j++) {
        var d = targetDeposits * (theta * early[j] + (1 - theta) * late[j]);
        dep.push(d);
        v = (v + d) * (1 + r[j]);
        vals.push(v);
      }
      return { deposits: dep, values: vals, end: v };
    }
    var lo = 0, hi = 1, mid = 0.5, res = run(mid);
    for (var it = 0; it < 60; it++) {
      mid = (lo + hi) / 2; res = run(mid);
      if (res.end > targetValue) hi = mid; else lo = mid;
    }
    /* absorb the last cent so the line ends exactly on today's value */
    res.values[n - 1] = targetValue;

    /* realised P&L lands in the month the lot actually closed */
    var realizedByMonth = {};
    positions.forEach(function (p) {
      var when = p.soldDate || p.realizedDate;
      if (!p.realizedPnL || !when) return;
      var parts = when.split(' ');
      var k = parts[1] + ' ' + parts[2];
      realizedByMonth[k] = (realizedByMonth[k] || 0) + p.realizedPnL;
    });

    var cumDep = 0, bIndex = 1, tIndex = 1, cumRealized = 0;
    historyCache = months.map(function (mo, j) {
      cumDep += res.deposits[j];
      tIndex *= (1 + r[j]);
      bIndex *= (1 + b[j]);
      var divNet = (dividendHistory[mo.year] && dividendHistory[mo.year][mo.monthIndex]) || 0;
      var divGross = divNet / (1 - constants.withholdingTax);
      var begin = j === 0 ? 0 : res.values[j - 1];
      var realized = realizedByMonth[mo.key] || 0;
      cumRealized += realized;
      return {
        key: mo.key, label: mo.label, short: mo.short, year: mo.year, monthIndex: mo.monthIndex,
        value: res.values[j], invested: cumDep,
        deposits: res.deposits[j], withdrawals: 0,
        begin: begin, end: res.values[j],
        change: res.values[j] - begin - res.deposits[j],
        monthReturn: r[j] * 100,
        benchmarkReturn: b[j] * 100,
        twrIndex: tIndex, benchmarkIndex: bIndex,
        dividends: divNet, taxes: divGross - divNet,
        fees: res.deposits[j] > 0 ? Math.round(Math.min(4.95, res.deposits[j] * 0.0009) * 100) / 100 : 0,
        realized: realized, realizedToDate: cumRealized,
        capitalGain: res.values[j] - cumDep,
        totalProfit: res.values[j] - cumDep + sum(monthsDividendsTo(months, j)) + cumRealized
      };
    });
    return historyCache;
  }
  function monthsDividendsTo(months, j) {
    var out = [];
    for (var i = 0; i <= j; i++) {
      var mo = months[i];
      out.push((dividendHistory[mo.year] && dividendHistory[mo.year][mo.monthIndex]) || 0);
    }
    return out;
  }

  /* The same deposit schedule run at the benchmark's monthly returns — the
     "what if the money had gone into SPY instead" line on the report chart.
     Ends at the benchmark's own TWR, so it reconciles with constants. */
  function benchmarkValuePath() {
    var v = 0;
    return history().map(function (m) {
      v = (v + m.deposits) * (1 + m.benchmarkReturn / 100);
      return { key: m.key, short: m.short, year: m.year, monthIndex: m.monthIndex, value: v };
    });
  }

  var RANGE_MONTHS = { '7d': 1, '1m': 1, '3m': 3, '6m': 6, 'YTD': null, '1y': 12, '5y': 60, 'all': null };
  function historyRange(range) {
    var h = history();
    if (range === 'all' || !range) return h;
    if (range === 'YTD') return h.filter(function (m) { return m.year === constants.today.year; });
    var n = RANGE_MONTHS[range] || h.length;
    return h.slice(Math.max(0, h.length - n));
  }

  /* Monthly percentage returns, for the dynamics bar chart. */
  function monthlyReturns(period) {
    var h = history();
    if (period && period !== 'all') {
      if (period === '12m') h = h.slice(-12);
      else h = h.filter(function (m) { return String(m.year) === String(period); });
    }
    return h.map(function (m) {
      return { key: m.key, label: m.label, year: m.year, pct: m.monthReturn, value: m.value, change: m.change };
    });
  }

  /* Per-holding performance, for the horizontal bar chart. */
  function holdingsPerformance() {
    return open().map(function (p) {
      var h = holding(p);
      var profit = p.value - p.costTotal + p.dividendsReceived + p.realizedPnL;
      var fees = Math.round(p.costTotal * 0.0009 * 100) / 100;
      return {
        ticker: p.ticker, name: p.name, mono: p.mono,
        totalProfit: profit,
        totalProfitPct: p.costTotal ? profit / p.costTotal * 100 : 0,
        capitalGain: p.value - p.costTotal,
        capitalGainPct: h.capitalGainPct,
        dividends: p.dividendsReceived,
        taxes: p.dividendsReceived / (1 - constants.withholdingTax) - p.dividendsReceived,
        fees: fees, value: p.value, invested: p.costTotal
      };
    }).sort(function (a, b) { return b.totalProfitPct - a.totalProfitPct; });
  }

  /* ---- deterministic detail data (seeded per ticker) -------------------- */
  function seeded(s) {
    var x = 7;
    for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) % 2147483647;
    return function () { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  }

  /* Price history ending exactly at the position's current price. */
  function priceSeries(ticker, n) {
    var p = byTicker(ticker);
    var count = n || 60;
    if (!p) return [];
    var rnd = seeded('px' + ticker);
    var v = p.costPerShare || p.price || 1;
    var out = [];
    for (var i = 0; i < count; i++) { v = v * (1 + (rnd() - 0.47) * 0.045); out.push(v); }
    var last = out[count - 1] || 1;
    var k = (p.price || 1) / last;
    return out.map(function (x, i) { return x * (1 + (k - 1) * (i / (count - 1))); });
  }

  /* ---- transaction ledger ------------------------------------------------
     The ledger is the single generator of trade lots: transactionsFor() below
     is now a view of it, so the holdings drawer and the Transactions screen
     cannot drift apart.

     Invariants (checked by ledgerReconciliation()):
       buy rows per ticker  sum to the position's shares and costTotal
       sell rows            sum to soldShares / soldProceeds
       income rows          sum to each position's dividendsReceived, and so
                            to the $1,467.21 lifetime total

     One caveat: income rows are laid out per position, stepping back from
     today at the holding's own payment frequency. They reconcile per holding
     and in total, but an individual month will not match dividendHistory's
     month total, which is what the value/report charts are built from.
     Fees are charged on trades and do not enter the cost basis. --------- */
  /* ---- corporate actions -------------------------------------------------
     Events that changed a position without being a trade. Two of them move
     real numbers, and the ledger is adjusted so it still reconciles:

       splits      a lot bought BEFORE the event is shown on its pre-split
                   basis — shares divided by the ratio, price multiplied by
                   it — so the lot's cash total is untouched. The stored
                   position is the post-split figure, and
                   ledgerReconciliation() re-applies the ratio before
                   comparing, so the proof still closes.
       return of   reduces cost basis without touching shares. The stored
       capital     costTotal is the CURRENT, post-ROC basis, so lots are
                   generated against the original purchase cost
                   (costTotal + the ROC) and reconciliation subtracts it.

     The rest are numerically neutral by construction: a ticker change, a
     1:1 fund reorganisation, an announced spin-off with no distribution
     yet, and a special dividend paid in cash whose amount already sits
     inside the holding's recorded dividends. Nothing here invents a figure
     that would break a holding's share count or cost basis. -------------- */
  var corporateActions = [
    {
      id: 'ca1', date: '06 Jun 2025', type: 'Split', ticker: 'NVDA',
      headline: '4-for-1 forward stock split',
      detail: 'Each share held became four. The cost basis per share fell to a quarter of its previous level; the total basis is unchanged.',
      ratio: 4, ratioLabel: '4:1', basisAdjust: 0, status: 'Completed', cash: 0
    },
    {
      id: 'ca2', date: '18 Sep 2025', type: 'Reverse split', ticker: 'GLDI',
      headline: '1-for-4 reverse split',
      detail: 'The issuer consolidated four notes into one to lift the quoted price. Share count fell to a quarter, basis per share rose four-fold, total basis unchanged.',
      ratio: 0.25, ratioLabel: '1:4', basisAdjust: 0, status: 'Completed', cash: 0
    },
    {
      id: 'ca3', date: '12 Dec 2025', type: 'Special dividend', ticker: 'PEP',
      headline: 'Special cash dividend of $0.62 a share',
      detail: 'Paid in cash alongside the regular quarterly distribution. No effect on shares or cost basis; the amount is inside the dividends already recorded for this holding.',
      ratio: 1, basisAdjust: 0, status: 'Completed', cash: 11.43
    },
    {
      id: 'ca4', date: '31 Dec 2025', type: 'Return of capital', ticker: 'GLDI',
      headline: 'Year-end return of capital, $5.57 a share',
      detail: 'The issuer classified part of the year’s distributions as a return of capital. It is not taxed as income — it reduces the cost basis instead, so the eventual capital gain is larger.',
      ratio: 1, basisAdjust: 142.60, status: 'Completed', cash: 0
    },
    {
      id: 'ca5', date: '31 Dec 2025', type: 'Return of capital', ticker: 'SLVO',
      headline: 'Year-end return of capital, $10.02 a share',
      detail: 'Same treatment as the gold note: basis reduced, nothing taxed as income this year.',
      ratio: 1, basisAdjust: 88.40, status: 'Completed', cash: 0
    },
    {
      id: 'ca6', date: '04 Feb 2026', type: 'Ticker change', ticker: 'SLVO',
      headline: 'Ticker changed from CSLS to SLVO',
      detail: 'Listing symbol only. Shares, cost basis and the distribution schedule all carried over unchanged.',
      ratio: 1, basisAdjust: 0, status: 'Completed', cash: 0, fromTicker: 'CSLS'
    },
    {
      id: 'ca7', date: '09 Mar 2026', type: 'Merger', ticker: 'QQQI',
      headline: 'Fund reorganisation, shares exchanged 1-for-1',
      detail: 'The fund was reorganised into a new trust. Holdings were exchanged one for one and the original cost basis carried over, so nothing changed on the position.',
      ratio: 1, ratioLabel: '1:1', basisAdjust: 0, status: 'Completed', cash: 0
    },
    {
      id: 'ca8', date: '20 Aug 2026', type: 'Spin-off', ticker: 'GOOGL',
      headline: 'Announced separation of a business unit',
      detail: 'A distribution ratio and the basis allocation between the parent and the new entity have not been published. Nothing is applied to the position until the distribution date.',
      ratio: 1, basisAdjust: 0, status: 'Announced', cash: 0
    }
  ];

  function corporateActionsFor(ticker) {
    return corporateActions.filter(function (e) { return e.ticker === ticker; });
  }
  /* Cumulative share ratio applied to `ticker` strictly AFTER `date`. A lot
     bought before a 4:1 split is divided by 4 to show its pre-split basis. */
  function splitFactorAfter(ticker, date) {
    var f = 1, s = serial(date);
    corporateActions.forEach(function (e) {
      if (e.ticker !== ticker || e.status !== 'Completed' || e.ratio === 1) return;
      if (serial(e.date) > s) f *= e.ratio;
    });
    return f;
  }
  /* Total basis reduction booked against a ticker (return of capital). */
  function basisAdjustFor(ticker) {
    return Math.round(sum(corporateActions.filter(function (e) {
      return e.ticker === ticker && e.status === 'Completed';
    }).map(function (e) { return e.basisAdjust || 0; })) * 100) / 100;
  }

  /* Each event with the before/after figures the log displays. Shares are
     read back through the split chain; basis before is the basis after plus
     everything booked from this event onwards. */
  function corporateActionLog() {
    return corporateActions.slice().sort(function (a, b) { return serial(b.date) - serial(a.date); })
      .map(function (e) {
        var p = byTicker(e.ticker);
        var held = p.status === 'sold' ? p.soldShares : p.shares;
        var pending = e.status !== 'Completed';
        /* shares as they stood immediately after this event, then before it */
        var after = pending ? held : held / splitFactorAfter(e.ticker, e.date);
        var before = pending ? held : after / e.ratio;
        /* basis as it stood after this event: today's basis plus every later
           reduction added back */
        var laterCuts = sum(corporateActions.filter(function (x) {
          return x.ticker === e.ticker && x.status === 'Completed' && serial(x.date) > serial(e.date);
        }).map(function (x) { return x.basisAdjust || 0; }));
        var basisAfter = pending ? p.costTotal : p.costTotal + laterCuts;
        var basisBefore = basisAfter + (pending ? 0 : (e.basisAdjust || 0));
        return {
          id: e.id, date: e.date, serial: serial(e.date), type: e.type, status: e.status,
          ticker: e.ticker, displayTicker: e.fromTicker ? e.fromTicker + ' → ' + e.ticker : e.ticker,
          name: p.name, mono: p.mono, assetClass: p.assetClass,
          headline: e.headline, detail: e.detail,
          ratio: e.ratio, ratioLabel: e.ratioLabel || null,
          sharesBefore: before, sharesAfter: after, sharesChanged: e.ratio !== 1,
          basisBefore: basisBefore, basisAfter: basisAfter,
          basisChanged: (e.basisAdjust || 0) > 0, basisAdjust: e.basisAdjust || 0,
          perShareBefore: before ? basisBefore / before : 0,
          perShareAfter: after ? basisAfter / after : 0,
          cash: e.cash || 0, pending: pending
        };
      });
  }

  function corporateActionStats() {
    var log = corporateActionLog();
    var types = {};
    log.forEach(function (e) { types[e.type] = (types[e.type] || 0) + 1; });
    return {
      count: log.length,
      completed: log.filter(function (e) { return !e.pending; }).length,
      pending: log.filter(function (e) { return e.pending; }).length,
      tickers: log.map(function (e) { return e.ticker; }).filter(function (t, i, a) { return a.indexOf(t) === i; }),
      types: Object.keys(types).map(function (t) { return { type: t, count: types[t] }; }),
      basisReduced: sum(log.map(function (e) { return e.basisAdjust; })),
      cash: sum(log.map(function (e) { return e.cash; })),
      latest: log.filter(function (e) { return !e.pending; })[0] || null,
      next: log.filter(function (e) { return e.pending; }).slice(-1)[0] || null
    };
  }

  var BUY_DATES = ['12 Nov 2024', '18 Feb 2025', '07 Jul 2025', '21 Jan 2026', '14 Apr 2026'];

  function parseDate(s) {
    var p = s.split(' ');
    return { d: +p[0], m: MONTHS.indexOf(p[1]), y: +p[2] };
  }
  function serial(s) { var p = parseDate(s); return p.y * 10000 + p.m * 100 + p.d; }
  function tradeFee(total) { return Math.round(Math.min(4.95, total * 0.0009) * 100) / 100; }

  /* How far a single lot's price may sit from the position's average cost.
     A money-market fund is pinned at par and a T-bill ETF barely moves, so
     those get a band near zero; equities and ETNs get a real one. */
  function priceBand(p) {
    if (p.assetClass === 'Cash') return 0;
    if (p.ticker === 'BIL') return 0.015;
    if (p.assetClass === 'ETN') return 0.12;
    if (p.assetClass === 'ETF') return 0.08;
    return 0.14;
  }
  function priceDecimals(p) { return p.costPerShare < 5 ? 4 : 2; }
  function roundTo(v, d) { var f = Math.pow(10, d); return Math.round(v * f) / f; }

  /* Lots reconcile exactly: shares sum to the position's share count and the
     amounts to its cost basis. Prices are drawn inside the instrument's band
     and the closing lot is solved for — if that solution would fall outside
     the band, the earlier deviations are damped until it fits. */
  function lotsFor(p) {
    if (p.status === 'sold') {
      return [
        { date: BUY_DATES[1], type: 'Buy', shares: p.soldShares, price: roundTo(p.soldCost / p.soldShares, priceDecimals(p)), total: p.soldCost },
        { date: p.soldDate, type: 'Sell', shares: p.soldShares, price: roundTo(p.soldProceeds / p.soldShares, priceDecimals(p)), total: p.soldProceeds }
      ];
    }
    var rnd = seeded('tx' + p.ticker);
    var n = p.shares > 50 ? 3 : 2;
    var band = priceBand(p), dec = priceDecimals(p);
    /* lots are written against the ORIGINAL purchase cost — any return of
       capital reduced the stored basis after the fact */
    var cut = basisAdjustFor(p.ticker);
    var costTotal = roundTo(p.costTotal + cut, 2);
    var costPerShare = costTotal / p.shares;

    var shares = [], used = 0, i;
    for (i = 0; i < n - 1; i++) {
      var sh = roundTo(p.shares * (0.28 + rnd() * 0.22), 6);
      shares.push(sh); used += sh;
    }
    shares.push(roundTo(p.shares - used, 6));

    var dev = [];
    for (i = 0; i < n - 1; i++) dev.push((rnd() * 2 - 1) * band);

    function closingDeviation(scale) {
      var cost = 0;
      for (var j = 0; j < n - 1; j++) cost += shares[j] * costPerShare * (1 + dev[j] * scale);
      return (costTotal - cost) / (shares[n - 1] * costPerShare) - 1;
    }
    var scale = 1, guard = 0;
    while (Math.abs(closingDeviation(scale)) > band && scale > 0.002 && guard++ < 40) scale *= 0.7;

    var out = [], costLeft = costTotal;
    for (i = 0; i < n - 1; i++) {
      var price = roundTo(costPerShare * (1 + dev[i] * scale), dec);
      var total = roundTo(shares[i] * price, 2);
      out.push({ date: BUY_DATES[i], type: 'Buy', shares: shares[i], price: price, total: total });
      costLeft = roundTo(costLeft - total, 2);
    }
    out.push({
      date: BUY_DATES[n - 1], type: 'Buy', shares: shares[n - 1],
      price: roundTo(costLeft / shares[n - 1], dec), total: costLeft
    });
    /* Restate every lot bought before a split onto its pre-split basis: the
       share count divides by the ratio, the price multiplies by it, and the
       cash total the trade actually cost is untouched. */
    return out.map(function (l) {
      var f = splitFactorAfter(p.ticker, l.date);
      if (f === 1) return l;
      return {
        date: l.date, type: l.type, shares: roundTo(l.shares / f, 6),
        price: roundTo(l.price * f, dec), total: l.total, presplit: true
      };
    });
  }

  /* Income rows for one position, summing exactly to dividendsReceived. */
  function incomeRowsFor(p) {
    if (!p.dividendsReceived) return [];
    var lots = lotsFor(p);
    var first = parseDate(lots[0].date);
    var last = p.status === 'sold' ? parseDate(p.soldDate)
      : { y: constants.today.year, m: constants.today.monthIndex, d: 28 };
    var step = p.frequency === 'Monthly' ? 1 : 3;
    var day = p.frequency === 'Monthly' ? 4 : 22;
    var slots = [], y = first.y, m = first.m + step;
    while (m > 11) { m -= 12; y += 1; }
    while (y * 12 + m <= last.y * 12 + last.m) {
      if (!(y === last.y && m === last.m && day > last.d)) slots.push({ y: y, m: m });
      m += step;
      while (m > 11) { m -= 12; y += 1; }
    }
    if (!slots.length) slots.push({ y: last.y, m: last.m });
    var each = Math.round(p.dividendsReceived / slots.length * 100) / 100;
    var running = 0;
    return slots.map(function (s, i) {
      var netAmt = i === slots.length - 1
        ? Math.round((p.dividendsReceived - running) * 100) / 100
        : each;
      running += netAmt;
      var grossAmt = Math.round(netAmt / (1 - constants.withholdingTax) * 100) / 100;
      return {
        date: day + ' ' + MONTHS[s.m] + ' ' + s.y, type: 'Dividends',
        shares: p.shares, price: p.shares ? netAmt / p.shares : 0,
        total: netAmt, gross: grossAmt, tax: Math.round((grossAmt - netAmt) * 100) / 100
      };
    });
  }

  var ledgerCache = null;
  function ledger() {
    if (ledgerCache) return ledgerCache;
    var rows = [];
    positions.forEach(function (p) {
      lotsFor(p).forEach(function (l) {
        rows.push({
          kind: 'trade', operation: l.type, ticker: p.ticker, name: p.name, mono: p.mono,
          currency: p.currency, date: l.date, shares: l.shares, price: l.price,
          amount: l.total, fee: tradeFee(l.total), tax: 0,
          signed: l.type === 'Buy' ? -l.total : l.total,
          note: l.type === 'Sell' ? 'Position closed' : ''
        });
      });
      incomeRowsFor(p).forEach(function (d) {
        rows.push({
          kind: 'income', operation: 'Dividends', ticker: p.ticker, name: p.name, mono: p.mono,
          currency: p.currency, date: d.date, shares: d.shares, price: d.price,
          amount: d.total, fee: 0, tax: d.tax, signed: d.total,
          note: p.frequency + ' distribution'
        });
      });
    });
    rows.sort(function (a, b) {
      var s = serial(b.date) - serial(a.date);
      return s !== 0 ? s : a.ticker.localeCompare(b.ticker);
    });
    ledgerCache = rows.map(function (r, i) { return Object.assign({ id: 'tx' + (rows.length - i) }, r); });
    return ledgerCache;
  }

  /* Cross-listings for the ticker combobox. Only the US line is a real
     position; the others are the same company on other exchanges, which the
     portfolio does not hold. */
  var EXCHANGES = [
    { code: 'US', suffix: '', cur: '$', label: 'NASDAQ / NYSE' },
    { code: 'AR', suffix: '.BA', cur: 'ARS', label: 'Buenos Aires' },
    { code: 'CA', suffix: '.NE', cur: 'CA$', label: 'Cboe Canada' },
    { code: 'MX', suffix: '.MX', cur: 'Mex$', label: 'Bolsa Mexicana' }
  ];
  function exchangesFor(ticker) {
    var p = byTicker(ticker);
    if (!p) return [];
    return EXCHANGES.map(function (e) {
      return {
        ticker: p.ticker, exchange: e.code, exchangeName: e.label,
        display: p.ticker + ' (' + e.code + ')', name: p.name, mono: p.mono,
        currency: e.cur,
        heldShares: e.code === 'US' && p.status === 'open' ? p.shares : 0
      };
    });
  }

  function ledgerTotals(rows) {
    var r = rows || ledger();
    var pick = function (f) { return sum(r.filter(f).map(function (x) { return x.amount; })); };
    return {
      buy: pick(function (x) { return x.operation === 'Buy'; }),
      sell: pick(function (x) { return x.operation === 'Sell'; }),
      income: pick(function (x) { return x.kind === 'income'; }),
      fee: sum(r.map(function (x) { return x.fee; })),
      tax: sum(r.map(function (x) { return x.tax; })),
      count: r.length
    };
  }

  /* Proof that the generated rows still add up to the stored positions.
     Buy shares are re-adjusted through each ticker's split chain and any
     return of capital is subtracted from the original purchase cost, so a
     corporate action can never silently break the reconciliation. */
  function ledgerReconciliation() {
    var out = [];
    positions.forEach(function (p) {
      var mine = ledger().filter(function (r) { return r.ticker === p.ticker; });
      var buys = mine.filter(function (r) { return r.operation === 'Buy'; });
      var inc = mine.filter(function (r) { return r.kind === 'income'; });
      var adjShares = sum(buys.map(function (r) { return r.shares * splitFactorAfter(p.ticker, r.date); }));
      var cut = p.status === 'sold' ? 0 : basisAdjustFor(p.ticker);
      out.push({
        ticker: p.ticker,
        sharesDelta: Math.round((adjShares - (p.status === 'sold' ? p.soldShares : p.shares)) * 1e5) / 1e5,
        costDelta: Math.round((sum(buys.map(function (r) { return r.amount; })) - cut - (p.status === 'sold' ? p.soldCost : p.costTotal)) * 100) / 100,
        incomeDelta: Math.round((sum(inc.map(function (r) { return r.amount; })) - p.dividendsReceived) * 100) / 100,
        splitAdjusted: splitFactorAfter(p.ticker, BUY_DATES[0]) !== 1,
        basisAdjust: cut
      });
    });
    return out;
  }

  /* Buy lots that sum exactly to the position's shares and cost. */
  function transactionsFor(ticker) {
    return ledger().filter(function (r) { return r.ticker === ticker && r.kind === 'trade'; })
      .slice().reverse()
      .map(function (r) { return { date: r.date, type: r.operation, shares: r.shares, price: r.price, total: r.amount }; });
  }

  /* Most recent payments for a holding, newest first. */
  function dividendsFor(ticker, count) {
    var p = byTicker(ticker);
    var n = count || 6;
    if (!p || !p.yieldPct || !p.shares) return [];
    var gross = p.frequency === 'Monthly' ? annualGross(p) / 12 : annualGross(p) / 4;
    var stepMonths = p.frequency === 'Monthly' ? 1 : 3;
    var out = [];
    for (var i = 1; i <= n; i++) {
      var back = i * stepMonths;
      var mi = constants.today.monthIndex - back;
      var year = constants.today.year + Math.floor(mi / 12);
      mi = ((mi % 12) + 12) % 12;
      out.push({
        payDate: (p.frequency === 'Monthly' ? 4 : 22) + ' ' + MONTHS[mi] + ' ' + year,
        perShare: gross / p.shares, gross: gross, net: net(gross),
        status: 'Paid'
      });
    }
    return out;
  }

  /* ---- market universe ---------------------------------------------------
     The two market-wide tools (screener, payout calendar) need names the
     portfolio does not hold. This is an illustrative universe of well-known
     payers, held to three internal rules so no row contradicts another:

       yield          is never entered — it is dividend per share ÷ price, so
                      the screener's yield column and the calendar's per-share
                      amount can never disagree.
       streak         is 0 for anything that has cut or that pays a variable
                      distribution (ETNs, covered-call funds, mortgage REITs),
                      and negative five-year growth always implies streak 0.
       payout ratio   is null only for option-income structures, which is the
                      one case dividendRating() treats as "no payout ratio".

     The twelve holdings are NOT re-entered here: they are read from
     positions, so their price, yield, payout ratio, growth and rating are the
     same numbers the rest of the app shows. Only market facts the portfolio
     model has no opinion on (growth streak, size) are added. The money-market
     line is excluded — it is not a market security. TSM and XOM are past
     holdings and carry their stored payout ratio and growth.

     Columns: ticker, name, mono, sector, class, price, annual dividend per
     share, payout ratio, 5Y dividend CAGR, growth streak in years, size in
     $bn, frequency, ex-day, pay-day, quarterly cycle (0 = Jan/Apr/Jul/Oct).
     ---------------------------------------------------------------------- */
  var UNIVERSE = [
    ['JNJ', 'Johnson & Johnson', 'JN', 'Health Care', 'Stock', 168.42, 5.08, 49.8, 5.6, 62, 405, 'Quarterly', 26, 10, 2],
    ['ABBV', 'AbbVie Inc.', 'AB', 'Health Care', 'Stock', 214.60, 6.88, 58.4, 8.9, 54, 379, 'Quarterly', 15, 28, 1],
    ['PFE', 'Pfizer Inc.', 'PF', 'Health Care', 'Stock', 27.18, 1.72, 88.6, 2.4, 15, 154, 'Quarterly', 25, 5, 2],
    ['MRK', 'Merck & Co., Inc.', 'MR', 'Health Care', 'Stock', 92.35, 3.24, 46.2, 7.1, 15, 232, 'Quarterly', 15, 8, 2],
    ['UNH', 'UnitedHealth Group', 'UN', 'Health Care', 'Stock', 342.10, 8.84, 34.8, 14.2, 16, 311, 'Quarterly', 16, 24, 2],
    ['AMGN', 'Amgen Inc.', 'AM', 'Health Care', 'Stock', 291.40, 9.52, 52.6, 9.4, 15, 157, 'Quarterly', 17, 8, 2],
    ['KO', 'The Coca-Cola Company', 'KO', 'Consumer Staples', 'Stock', 71.28, 2.04, 68.4, 4.2, 64, 307, 'Quarterly', 15, 1, 2],
    ['PG', 'Procter & Gamble', 'PG', 'Consumer Staples', 'Stock', 158.90, 4.23, 61.2, 5.1, 70, 372, 'Quarterly', 21, 15, 1],
    ['PM', 'Philip Morris International', 'PM', 'Consumer Staples', 'Stock', 148.60, 5.44, 76.4, 4.8, 18, 231, 'Quarterly', 24, 10, 0],
    ['MO', 'Altria Group, Inc.', 'MO', 'Consumer Staples', 'Stock', 62.14, 4.24, 79.8, 4.4, 56, 105, 'Quarterly', 15, 10, 0],
    ['GIS', 'General Mills, Inc.', 'GI', 'Consumer Staples', 'Stock', 58.42, 2.40, 58.6, 6.2, 6, 32, 'Quarterly', 10, 1, 1],
    ['KMB', 'Kimberly-Clark', 'KM', 'Consumer Staples', 'Stock', 132.75, 5.04, 66.8, 3.4, 54, 44, 'Quarterly', 6, 2, 0],
    ['MCD', 'McDonald\u2019s Corporation', 'MC', 'Consumer Discretionary', 'Stock', 312.60, 7.36, 58.4, 8.2, 49, 224, 'Quarterly', 1, 17, 2],
    ['HD', 'The Home Depot, Inc.', 'HD', 'Consumer Discretionary', 'Stock', 398.75, 9.20, 56.2, 11.4, 14, 396, 'Quarterly', 5, 20, 2],
    ['TGT', 'Target Corporation', 'TG', 'Consumer Discretionary', 'Stock', 104.30, 4.56, 62.4, 8.6, 54, 47, 'Quarterly', 20, 10, 2],
    ['JPM', 'JPMorgan Chase & Co.', 'JP', 'Financials', 'Stock', 268.40, 6.00, 27.4, 12.8, 15, 745, 'Quarterly', 5, 31, 0],
    ['BAC', 'Bank of America', 'BA', 'Financials', 'Stock', 48.72, 1.12, 30.2, 9.6, 12, 368, 'Quarterly', 5, 27, 2],
    ['CB', 'Chubb Limited', 'CB', 'Financials', 'Stock', 288.30, 3.88, 18.4, 5.8, 32, 115, 'Quarterly', 20, 10, 0],
    ['MAIN', 'Main Street Capital', 'MA', 'Financials', 'Stock', 62.80, 3.06, 84.6, 4.2, 18, 5.4, 'Monthly', 20, 15, 0],
    ['ARCC', 'Ares Capital Corporation', 'AR', 'Financials', 'Stock', 22.15, 1.92, 91.8, 3.4, 12, 15, 'Quarterly', 15, 30, 2],
    ['T', 'AT&T Inc.', 'T', 'Communication Services', 'Stock', 28.94, 1.11, 44.6, -6.8, 0, 208, 'Quarterly', 10, 1, 0],
    ['VZ', 'Verizon Communications', 'VZ', 'Communication Services', 'Stock', 44.16, 2.71, 58.2, 2.0, 19, 186, 'Quarterly', 10, 1, 0],
    ['XOM', 'Exxon Mobil Corporation', 'XO', 'Energy', 'Stock', 118.40, 4.12, 41.6, 3.8, 42, 512, 'Quarterly', 12, 10, 2],
    ['CVX', 'Chevron Corporation', 'CV', 'Energy', 'Stock', 156.80, 6.84, 54.8, 6.4, 38, 288, 'Quarterly', 18, 10, 1],
    ['EPD', 'Enterprise Products Partners', 'EP', 'Energy', 'Stock', 33.42, 2.16, 78.4, 3.6, 27, 72, 'Quarterly', 30, 14, 0],
    ['KMI', 'Kinder Morgan, Inc.', 'KI', 'Energy', 'Stock', 28.65, 1.18, 92.4, 2.8, 8, 64, 'Quarterly', 30, 15, 0],
    ['MMM', '3M Company', 'MM', 'Industrials', 'Stock', 148.20, 2.92, 38.6, -12.4, 0, 80, 'Quarterly', 20, 12, 1],
    ['CAT', 'Caterpillar Inc.', 'CA', 'Industrials', 'Stock', 412.50, 6.12, 24.2, 8.4, 32, 196, 'Quarterly', 20, 28, 1],
    ['LMT', 'Lockheed Martin', 'LM', 'Industrials', 'Stock', 468.30, 13.60, 47.8, 7.4, 24, 110, 'Quarterly', 1, 26, 2],
    ['UPS', 'United Parcel Service', 'UP', 'Industrials', 'Stock', 96.40, 6.56, 88.2, 11.8, 17, 82, 'Quarterly', 18, 5, 1],
    ['NEE', 'NextEra Energy, Inc.', 'NE', 'Utilities', 'Stock', 78.35, 2.32, 58.4, 10.4, 31, 161, 'Quarterly', 27, 15, 2],
    ['DUK', 'Duke Energy Corporation', 'DU', 'Utilities', 'Stock', 118.90, 4.26, 66.2, 2.4, 20, 92, 'Quarterly', 15, 16, 2],
    ['SO', 'The Southern Company', 'SO', 'Utilities', 'Stock', 92.45, 2.96, 62.8, 3.0, 25, 101, 'Quarterly', 15, 6, 2],
    ['D', 'Dominion Energy, Inc.', 'DO', 'Utilities', 'Stock', 58.20, 2.67, 72.4, -5.2, 0, 49, 'Quarterly', 5, 20, 2],
    ['O', 'Realty Income Corporation', 'O', 'Real Estate', 'Stock', 62.40, 3.24, 76.4, 3.2, 31, 55, 'Monthly', 1, 15, 0],
    ['AGNC', 'AGNC Investment Corp.', 'AG', 'Real Estate', 'Stock', 9.42, 1.44, 96.4, -8.6, 0, 8, 'Monthly', 30, 10, 0],
    ['SPG', 'Simon Property Group', 'SP', 'Real Estate', 'Stock', 178.40, 8.60, 71.2, 6.8, 5, 67, 'Quarterly', 10, 30, 2],
    ['VICI', 'VICI Properties Inc.', 'VI', 'Real Estate', 'Stock', 32.60, 1.80, 74.6, 7.2, 7, 34, 'Quarterly', 20, 5, 0],
    ['WPC', 'W. P. Carey Inc.', 'WP', 'Real Estate', 'Stock', 62.80, 3.60, 76.8, -8.2, 0, 14, 'Quarterly', 30, 15, 0],
    ['MSFT', 'Microsoft Corporation', 'MS', 'Information Technology', 'Stock', 512.40, 3.72, 24.6, 10.2, 21, 3810, 'Quarterly', 20, 12, 1],
    ['AAPL', 'Apple Inc.', 'AA', 'Information Technology', 'Stock', 246.80, 1.08, 15.2, 5.4, 14, 3660, 'Quarterly', 10, 15, 1],
    ['TXN', 'Texas Instruments', 'TX', 'Information Technology', 'Stock', 198.40, 5.68, 68.4, 9.8, 22, 181, 'Quarterly', 30, 12, 0],
    ['AVGO', 'Broadcom Inc.', 'AV', 'Information Technology', 'Stock', 342.60, 2.36, 42.6, 15.4, 15, 1600, 'Quarterly', 20, 30, 2],
    ['IBM', 'International Business Machines', 'IB', 'Information Technology', 'Stock', 268.40, 6.72, 62.8, 1.2, 30, 249, 'Quarterly', 10, 24, 1],
    ['CSCO', 'Cisco Systems, Inc.', 'CS', 'Information Technology', 'Stock', 72.15, 1.68, 48.4, 3.2, 15, 287, 'Quarterly', 3, 22, 0],
    ['TSM', 'Taiwan Semiconductor ADR', 'TS', 'Information Technology', 'Stock', 268.90, 2.84, 34.2, 9.4, 12, 1390, 'Quarterly', 18, 11, 2],
    ['LIN', 'Linde plc', 'LI', 'Materials', 'Stock', 468.20, 6.36, 42.4, 9.6, 33, 222, 'Quarterly', 5, 18, 2],
    ['APD', 'Air Products and Chemicals', 'AP', 'Materials', 'Stock', 286.40, 7.32, 64.2, 8.4, 43, 64, 'Quarterly', 30, 12, 0]
  ];

  /* Market facts the portfolio model has no opinion on, for the names the
     portfolio does hold: growth streak in years, size in $bn. Funds carry
     assets under management instead of market cap; a variable distribution
     means no streak. */
  var HELD_META = {
    AMZN: [0, 2380], BIL: [0, 42], GLDI: [0, 0.12], GOOGL: [2, 2860], JEPQ: [0, 26],
    NVDA: [13, 4210], PEP: [53, 194], QQQI: [0, 2.4], SCHD: [12, 74], SLVO: [0, 0.08], V: [17, 742]
  };

  var universeCache = null;

  function marketUniverse() {
    if (universeCache) return universeCache;
    var rows = UNIVERSE.map(function (u) {
      var price = u[5], dps = u[6];
      var row = {
        ticker: u[0], name: u[1], mono: u[2], sector: u[3], assetClass: u[4],
        price: price, dps: dps,
        yieldPct: Math.round(dps / price * 10000) / 100,
        payoutRatio: u[7], dividendGrowth5Y: u[8], streak: u[9],
        capB: u[10], frequency: u[11], exDay: u[12], payDay: u[13], cycle: u[14],
        held: false, closed: false, shares: 0
      };
      var p = byTicker(u[0]);
      if (p && p.status === 'sold') { row.closed = true; row.soldDate = p.soldDate; }
      return row;
    });
    open().forEach(function (p) {
      if (p.assetClass === 'Cash') return;               /* not a market security */
      var meta = HELD_META[p.ticker] || [0, 0];
      var a = payAnchor(p);
      rows.push({
        ticker: p.ticker, name: p.name, mono: p.mono, sector: p.sector, assetClass: p.assetClass,
        price: p.price, dps: Math.round(p.price * p.yieldPct) / 100,
        yieldPct: p.yieldPct, payoutRatio: p.payoutRatio, dividendGrowth5Y: p.dividendGrowth5Y,
        streak: meta[0], capB: meta[1], frequency: p.frequency,
        exDay: a.ex ? a.ex.d : 15, payDay: a.pay ? a.pay.d : 18,
        cycle: a.pay ? ((a.pay.m % 3) + 3) % 3 : 0,
        held: true, closed: false, shares: p.shares, position: p
      });
    });
    rows.forEach(function (r) {
      r.rating = dividendRating(r.position || {
        yieldPct: r.yieldPct, payoutRatio: r.payoutRatio,
        dividendGrowth5Y: r.dividendGrowth5Y, assetClass: r.assetClass, frequency: r.frequency
      });
      r.perPayment = r.yieldPct ? (r.frequency === 'Monthly' ? r.dps / 12 : r.dps / 4) : 0;
      r.paymentsAYear = r.frequency === 'Monthly' ? 12 : 4;
      r.isFund = r.assetClass === 'ETF' || r.assetClass === 'ETN';
    });
    universeCache = rows.sort(function (a, b) { return b.yieldPct - a.yieldPct; });
    return universeCache;
  }

  function universeSectors() {
    var seen = {};
    marketUniverse().forEach(function (r) { seen[r.sector] = (seen[r.sector] || 0) + 1; });
    return Object.keys(seen).sort().map(function (s) { return { sector: s, count: seen[s] }; });
  }

  function universeStats() {
    var u = marketUniverse(), payers = u.filter(function (r) { return r.yieldPct > 0; });
    var ys = payers.map(function (r) { return r.yieldPct; }).sort(function (a, b) { return a - b; });
    return {
      count: u.length, payers: payers.length,
      held: u.filter(function (r) { return r.held; }).length,
      closed: u.filter(function (r) { return r.closed; }).length,
      monthly: u.filter(function (r) { return r.frequency === 'Monthly'; }).length,
      sectors: universeSectors().length,
      medianYield: ys.length ? ys[Math.floor(ys.length / 2)] : 0,
      avgScore: Math.round(sum(payers.map(function (r) { return r.rating.score || 0; })) / (payers.length || 1))
    };
  }

  /* Market-wide ex-dates for one month. Same shape and the same three
     statuses as calendarMonth(), so the payout calendar can reuse the
     portfolio calendar's grid and status treatment unchanged. */
  function marketCalendarMonth(year, mi) {
    var rank = (year * 12 + mi) - (constants.today.year * 12 + constants.today.monthIndex);
    var td = todayDay();
    var events = [];
    marketUniverse().forEach(function (r) {
      if (!r.yieldPct) return;
      if (r.frequency !== 'Monthly' && (((mi - r.cycle) % 3) + 3) % 3 !== 0) return;
      var exDay = clampDay(r.exDay, year, mi);
      /* a dividend always pays after it goes ex — when the issuer's usual pay
         day falls earlier in the month than its ex day, the payment lands in
         the following month */
      var payMi = mi, payYear = year;
      if (r.payDay <= r.exDay) {
        payMi = mi + 1;
        if (payMi > 11) { payMi = 0; payYear = year + 1; }
      }
      var payDay = clampDay(r.payDay, payYear, payMi);
      /* status follows the PAY date for Paid, but the ex-date month for the
         announced/estimated split — the same convention as calendarMonth():
         this month and next are Declared, anything beyond is Estimated */
      var payRank = (payYear * 12 + payMi) - (constants.today.year * 12 + constants.today.monthIndex);
      var status = payRank < 0 ? 'Paid'
        : (payRank === 0 && payDay <= td) ? 'Paid'
          : rank <= 1 ? 'Declared' : 'Estimated';
      events.push({
        ticker: r.ticker, name: r.name, mono: r.mono, sector: r.sector,
        frequency: r.frequency, yieldPct: r.yieldPct, held: r.held, closed: r.closed,
        rating: r.rating, price: r.price,
        day: exDay, exDay: exDay, payDay: payDay,
        exDate: exDay + ' ' + MONTHS[mi] + ' ' + year,
        payDate: payDay + ' ' + MONTHS[payMi] + ' ' + payYear,
        perShare: r.perPayment, status: status
      });
    });
    events.sort(function (a, b) { return a.day - b.day || b.yieldPct - a.yieldPct; });

    var n = daysInMonth(year, mi);
    var days = [];
    for (var d = 1; d <= n; d++) {
      var onDay = events.filter(function (e) { return e.day === d; });
      days.push({
        day: d, events: onDay, count: onDay.length,
        isToday: rank === 0 && d === td
      });
    }
    var byStatus = function (s) {
      return events.filter(function (e) { return e.status === s; }).length;
    };
    return {
      year: year, monthIndex: mi, label: MONTHS[mi] + ' ' + year,
      short: MONTHS[mi] + " '" + String(year).slice(2),
      leadingBlanks: ((new Date(year, mi, 1).getDay()) + 6) % 7,
      days: days, events: events, count: events.length,
      heldCount: events.filter(function (e) { return e.held; }).length,
      avgYield: events.length ? sum(events.map(function (e) { return e.yieldPct; })) / events.length : 0,
      paid: byStatus('Paid'), declared: byStatus('Declared'), estimated: byStatus('Estimated')
    };
  }

  function marketCalendarYear(year, mi) {
    var out = [];
    for (var i = 0; i < 12; i++) {
      var m = mi + i, y = year + Math.floor(m / 12);
      out.push(marketCalendarMonth(y, ((m % 12) + 12) % 12));
    }
    return out;
  }

  /* ---- shared formatters (every screen formats identically) ------------- */
  var fmt = {
    num: function (n, d) { var k = d === undefined ? 2 : d; return n.toLocaleString('en-US', { minimumFractionDigits: k, maximumFractionDigits: k }); },
    shares: function (n) { return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 }); },
    money: function (n, cur) { var s = (cur === undefined ? '$' : cur); return (n < 0 ? '-' : '') + s + fmt.num(Math.abs(n)); },
    signed: function (n, cur) { var s = (cur === undefined ? '$' : cur); return (n < 0 ? '-' : '+') + s + fmt.num(Math.abs(n)); },
    pct: function (n, d) { return fmt.num(n, d === undefined ? 2 : d) + '%'; },
    caret: function (n, d) { return (n >= 0 ? '▲' : '▼') + fmt.num(Math.abs(n), d === undefined ? 2 : d) + '%'; },
    k: function (n) { return '$' + fmt.num(n / 1000) + 'k'; },
    tone: function (n) { return n > 0 ? 'pos' : n < 0 ? 'neg' : 'plain'; }
  };

  /* ---- geography (by listing, not by revenue) -------------------------- */
  var GEO = { TSM: ['Asia', 'Taiwan'] };
  positions.forEach(function (p) {
    var g = GEO[p.ticker] || ['North America', 'United States'];
    p.region = g[0]; p.country = g[1];
  });

  /* ---- fund look-through -----------------------------------------------
     Published top holdings by weight. The undisclosed remainder of each fund
     stays classified as 'Funds' so nothing is invented; money-market and
     commodity-linked products are not decomposed at all (no equity inside). */
  var fundComposition = {
    JEPQ: [
      { t: 'MSFT', n: 'Microsoft Corporation', s: 'Information Technology', w: 8.4 },
      { t: 'NVDA', n: 'NVIDIA Corporation', s: 'Information Technology', w: 7.9 },
      { t: 'AAPL', n: 'Apple Inc.', s: 'Information Technology', w: 7.1 },
      { t: 'AMZN', n: 'Amazon.com, Inc.', s: 'Consumer Discretionary', w: 4.8 },
      { t: 'META', n: 'Meta Platforms, Inc.', s: 'Communication Services', w: 3.6 },
      { t: 'AVGO', n: 'Broadcom Inc.', s: 'Information Technology', w: 3.1 },
      { t: 'GOOGL', n: 'Alphabet Inc.', s: 'Communication Services', w: 2.7 },
      { t: 'LLY', n: 'Eli Lilly and Company', s: 'Healthcare', w: 2.2 },
      { t: 'COST', n: 'Costco Wholesale', s: 'Consumer Staples', w: 1.9 },
      { t: 'NFLX', n: 'Netflix, Inc.', s: 'Communication Services', w: 1.6 }
    ],
    QQQI: [
      { t: 'MSFT', n: 'Microsoft Corporation', s: 'Information Technology', w: 8.8 },
      { t: 'NVDA', n: 'NVIDIA Corporation', s: 'Information Technology', w: 8.2 },
      { t: 'AAPL', n: 'Apple Inc.', s: 'Information Technology', w: 7.4 },
      { t: 'AMZN', n: 'Amazon.com, Inc.', s: 'Consumer Discretionary', w: 5.1 },
      { t: 'AVGO', n: 'Broadcom Inc.', s: 'Information Technology', w: 3.4 },
      { t: 'META', n: 'Meta Platforms, Inc.', s: 'Communication Services', w: 3.3 },
      { t: 'TSLA', n: 'Tesla, Inc.', s: 'Consumer Discretionary', w: 2.8 },
      { t: 'GOOGL', n: 'Alphabet Inc.', s: 'Communication Services', w: 2.5 },
      { t: 'COST', n: 'Costco Wholesale', s: 'Consumer Staples', w: 2.2 },
      { t: 'AMD', n: 'Advanced Micro Devices', s: 'Information Technology', w: 1.7 }
    ],
    SCHD: [
      { t: 'ABBV', n: 'AbbVie Inc.', s: 'Healthcare', w: 4.6 },
      { t: 'KO', n: 'The Coca-Cola Company', s: 'Consumer Staples', w: 4.3 },
      { t: 'VZ', n: 'Verizon Communications', s: 'Communication Services', w: 4.1 },
      { t: 'CVX', n: 'Chevron Corporation', s: 'Energy', w: 4.0 },
      { t: 'AMGN', n: 'Amgen Inc.', s: 'Healthcare', w: 3.9 },
      { t: 'PEP', n: 'PepsiCo, Inc.', s: 'Consumer Staples', w: 3.8 },
      { t: 'CSCO', n: 'Cisco Systems, Inc.', s: 'Information Technology', w: 3.7 },
      { t: 'HD', n: 'The Home Depot, Inc.', s: 'Consumer Discretionary', w: 3.6 },
      { t: 'BLK', n: 'BlackRock, Inc.', s: 'Financials', w: 3.4 },
      { t: 'LMT', n: 'Lockheed Martin', s: 'Industrials', w: 3.1 },
      { t: 'TXN', n: 'Texas Instruments', s: 'Information Technology', w: 2.9 },
      { t: 'UPS', n: 'United Parcel Service', s: 'Industrials', w: 2.6 },
      { t: 'BMY', n: 'Bristol-Myers Squibb', s: 'Healthcare', w: 2.4 },
      { t: 'PPG', n: 'PPG Industries, Inc.', s: 'Materials', w: 2.1 },
      { t: 'EIX', n: 'Edison International', s: 'Utilities', w: 1.8 },
      { t: 'O', n: 'Realty Income Corporation', s: 'Real Estate', w: 1.4 }
    ],
    BIL: [], GLDI: [], SLVO: [], DIMEFCD: []
  };

  /* Every position as an exposure line. With xray on, funds with published
     compositions are split into their underlying names. */
  function lookThrough(xray) {
    var out = [];
    open().forEach(function (p) {
      var comp = xray ? (fundComposition[p.ticker] || []) : [];
      var covered = 0;
      comp.forEach(function (c) {
        covered += c.w;
        out.push({
          label: c.t, subLabel: c.n, value: p.value * c.w / 100,
          sector: c.s, assetClass: 'Stock', currency: p.currency,
          region: 'North America', country: 'United States', via: p.ticker
        });
      });
      if (covered < 100) {
        out.push({
          label: p.ticker, subLabel: p.name, value: p.value * (100 - covered) / 100,
          sector: p.sector, assetClass: p.assetClass, currency: p.currency,
          region: p.region, country: p.country, via: null,
          partial: covered > 0 ? 100 - covered : 0
        });
      }
    });
    return out.sort(function (a, b) { return b.value - a.value; });
  }

  /* dim: 'holdings' | 'sector' | 'assetClass' | 'currency' | 'region' | 'country' */
  function breakdown(dim, xray) {
    var items = lookThrough(xray);
    var total = sum(items.map(function (i) { return i.value; }));
    var map = {}, order = [];
    items.forEach(function (i) {
      var key = dim === 'holdings' ? i.label : i[dim];
      if (!map[key]) {
        map[key] = { name: key, subLabel: dim === 'holdings' ? i.subLabel : '', value: 0, count: 0, via: [] };
        order.push(key);
      }
      map[key].value += i.value;
      map[key].count += 1;
      if (i.via && map[key].via.indexOf(i.via) < 0) map[key].via.push(i.via);
    });
    return order.map(function (k) { return map[k]; }).map(function (r) {
      return {
        name: r.name, subLabel: r.subLabel, value: r.value, count: r.count,
        via: r.via, pct: total ? r.value / total * 100 : 0
      };
    }).sort(function (a, b) { return b.value - a.value; });
  }

  /* Forward income by holding — what pays for the passive income figure. */
  function incomeBreakdown() {
    var rows = payers().map(function (p) {
      return { name: p.ticker, subLabel: p.name, value: annualGross(p), net: net(annualGross(p)), frequency: p.frequency };
    });
    var total = sum(rows.map(function (r) { return r.value; }));
    return rows.map(function (r) {
      return Object.assign({}, r, { pct: total ? r.value / total * 100 : 0 });
    }).sort(function (a, b) { return b.value - a.value; });
  }

  /* Dividend reliability, 0-100, derived — never a stored score.
     Payout headroom, five-year growth, structure (ETN distributions can
     return capital), payment frequency, and yield sustainability. */
  function dividendRating(p) {
    if (!p.yieldPct) return { score: null, label: 'Not available', warn: false, reasons: ['Pays no dividend'] };
    var s = 50, why = [];
    if (p.payoutRatio === null) { s -= 4; why.push('Option-income structure, no payout ratio'); }
    else if (p.payoutRatio < 40) { s += 18; why.push('Payout ratio under 40%'); }
    else if (p.payoutRatio < 60) { s += 12; why.push('Comfortable payout ratio'); }
    else if (p.payoutRatio < 75) { s += 6; why.push('Payout ratio above 60%'); }
    else { s -= 6; why.push('Payout ratio above 75%'); }

    if (p.dividendGrowth5Y === null) { why.push('Less than five years of payments'); }
    else if (p.dividendGrowth5Y > 8) { s += 18; why.push('Dividend growing over 8% a year'); }
    else if (p.dividendGrowth5Y >= 3) { s += 12; why.push('Steady dividend growth'); }
    else if (p.dividendGrowth5Y >= 0) { s += 5; why.push('Flat dividend'); }
    else { s -= 12; why.push('Dividend has been cut'); }

    if (p.assetClass === 'ETN') { s -= 16; why.push('ETN: distributions may return capital'); }
    if (p.frequency === 'Monthly') { s += 3; }
    if (p.yieldPct > 15) { s -= 14; why.push('Yield above 15% is rarely sustainable'); }
    else if (p.yieldPct > 10) { s -= 8; why.push('Double-digit yield carries payout risk'); }

    s = Math.max(5, Math.min(98, Math.round(s)));
    var label = s >= 75 ? 'Reliable' : s >= 60 ? 'Safe' : s >= 40 ? 'OK' : 'At risk';
    return { score: s, label: label, warn: s < 45 || p.assetClass === 'ETN', reasons: why };
  }

  /* ---- risk statistics --------------------------------------------------
     Sharpe, Sortino, beta and volatility all come out of the two monthly
     return paths in history() — portfolio and benchmark — through one
     formula, so both series are measured identically. The raw ratios are
     then scaled by a single factor per statistic, fixed so that the
     all-time window reproduces the published portfolio figures exactly
     (constants.sharpe, .sortino, .beta). The same factor carries to the
     benchmark and to shorter windows, so the SPY markers and every
     narrower window are derived rather than entered.

     The risk-free rate is the portfolio's own T-bill holding (BIL). --- */
  function riskFreeRate() {
    var bil = byTicker('BIL');
    return bil ? bil.yieldPct / 100 : 0.03;
  }

  function seriesStats(rets, rf) {
    var n = rets.length;
    if (n < 2) return { mean: 0, sd: 0, vol: 0, sharpe: 0, sortino: 0, total: 0 };
    var r = rets.map(function (v) { return v / 100; });
    var mean = sum(r) / n;
    var sd = Math.sqrt(sum(r.map(function (v) { return (v - mean) * (v - mean); })) / (n - 1));
    var mar = rf / 12;
    var dsd = Math.sqrt(sum(r.map(function (v) { return v < mar ? (v - mar) * (v - mar) : 0; })) / (n - 1));
    var excess = mean - mar;
    var chain = r.reduce(function (s, v) { return s * (1 + v); }, 1) - 1;
    return {
      mean: mean, sd: sd, vol: sd * Math.sqrt(12) * 100, total: chain * 100,
      sharpe: sd ? excess / sd * Math.sqrt(12) : 0,
      sortino: dsd ? excess / dsd * Math.sqrt(12) : 0,
      downMonths: r.filter(function (v) { return v < 0; }).length
    };
  }

  function betaOf(port, bench) {
    var n = Math.min(port.length, bench.length);
    if (n < 2) return 0;
    var p = port.slice(0, n).map(function (v) { return v / 100; });
    var b = bench.slice(0, n).map(function (v) { return v / 100; });
    var pm = sum(p) / n, bm = sum(b) / n, cov = 0, varb = 0;
    for (var i = 0; i < n; i++) {
      cov += (p[i] - pm) * (b[i] - bm);
      varb += (b[i] - bm) * (b[i] - bm);
    }
    return varb ? cov / varb : 0;
  }

  var calibCache = null;
  function riskCalibration() {
    if (calibCache) return calibCache;
    var h = history(), rf = riskFreeRate();
    var pr = h.map(function (m) { return m.monthReturn; });
    var br = h.map(function (m) { return m.benchmarkReturn; });
    var p = seriesStats(pr, rf);
    var raw = betaOf(pr, br);
    calibCache = {
      rf: rf,
      sharpe: p.sharpe ? constants.sharpe / p.sharpe : 1,
      sortino: p.sortino ? constants.sortino / p.sortino : 1,
      beta: raw ? constants.beta / raw : 1
    };
    return calibCache;
  }

  /* Risk statistics are measured over the full history: 23 monthly returns
     is already a thin sample, and shorter windows do not carry a meaningful
     beta or downside deviation (some contain no losing month at all). */
  function riskStats() {
    var h = history();
    var c = riskCalibration();
    var pr = h.map(function (m) { return m.monthReturn; });
    var br = h.map(function (m) { return m.benchmarkReturn; });
    var p = seriesStats(pr, c.rf), b = seriesStats(br, c.rf);
    var stocks = open().filter(function (x) { return x.assetClass === 'Stock'; });
    var stockValue = sum(stocks.map(function (x) { return x.value; }));
    var T = totals();
    return {
      months: h.length, from: h[0].key, to: h[h.length - 1].key,
      fromShort: h[0].short, toShort: h[h.length - 1].short,
      riskFree: c.rf * 100, riskFreeSource: byTicker('BIL') ? 'BIL' : null,
      marketBeta: 1,
      portfolio: {
        sharpe: p.sharpe * c.sharpe, sortino: p.sortino * c.sortino,
        beta: betaOf(pr, br) * c.beta, volatility: p.vol, twr: p.total,
        downMonths: p.downMonths
      },
      benchmark: {
        label: constants.benchmark,
        sharpe: b.sharpe * c.sharpe, sortino: b.sortino * c.sortino,
        beta: 1, volatility: b.vol, twr: b.total,
        downMonths: b.downMonths
      },
      pe: constants.peRatio,
      stocks: {
        count: stocks.length, value: stockValue,
        tickers: stocks.map(function (x) { return x.ticker; }),
        shareOfPortfolio: T.value ? stockValue / T.value * 100 : 0
      },
      lifetime: {
        twr: constants.twr, benchmarkTwr: constants.benchmarkTwr,
        gap: constants.benchmarkTwr - constants.twr,
        irr: constants.irrAllTime
      }
    };
  }

  /* Verdict tags for the gauge cards. Thresholds live here, not on screen. */
  function riskVerdict(kind, v) {
    if (kind === 'beta') {
      if (v < 0.85) return { label: 'lower than the market', tone: 'good' };
      if (v <= 1.15) return { label: 'in line with the market', tone: 'neutral' };
      return { label: 'higher than the market', tone: 'attention' };
    }
    if (kind === 'sharpe') {
      if (v < 1) return { label: 'requires attention', tone: 'attention' };
      if (v < 2) return { label: 'o.k.', tone: 'neutral' };
      return { label: 'good', tone: 'good' };
    }
    if (kind === 'sortino') {
      if (v < 1.5) return { label: 'requires attention', tone: 'attention' };
      if (v < 3) return { label: 'o.k.', tone: 'neutral' };
      return { label: 'good', tone: 'good' };
    }
    if (kind === 'twr') {
      if (v > 0) return { label: 'behind the benchmark', tone: 'attention' };
      return { label: 'ahead of the benchmark', tone: 'good' };
    }
    return { label: '', tone: 'neutral' };
  }

  /* ---- backtest engine (Portfolio Lab) -----------------------------------
     No new history is invented here, and the honesty of the numbers rests on
     three things being stated plainly:

       window     the app's own monthly span, monthSpan() — Oct 2024 onward.
                  There is no history before it, so no backtest can start
                  earlier than the portfolio itself.
       benchmark  the SPY monthly return path history() already carries, run
                  on the same deposit schedule, so it ends on the published
                  benchmark TWR.
       anchor     every ticker's path comes out of the same returnPath()
                  generator used by history(), pinned to ONE published annual
                  figure: a held name uses its own IRR; anything else uses
                  yield + 5-year dividend growth (a Gordon proxy).

     The month-to-month dispersion around that anchor is synthetic and seeded
     per ticker. It is what produces drawdown, volatility and Sharpe — so
     those are shape, not measurement, and (as on Analytics ▸ Metrics) they
     are only ever reported over the whole selected window. ------------- */
  var LAB_KEY = 'snowline.lab.v1';
  var LAB_DISPERSION = { Stock: 1, ETF: 0.72, ETN: 1.15, Cash: 0 };

  var labCache = null;
  /* The screener universe plus the manually priced cash line, so "load my
     portfolio" can seat all 12 holdings and not 11. */
  function labSecurities() {
    if (labCache) return labCache;
    var rows = marketUniverse().slice();
    open().forEach(function (p) {
      if (p.assetClass !== 'Cash') return;
      rows.push({
        ticker: p.ticker, name: p.name, mono: p.mono, sector: p.sector, assetClass: p.assetClass,
        price: p.price, dps: Math.round(p.price * p.yieldPct) / 100, yieldPct: p.yieldPct,
        payoutRatio: null, dividendGrowth5Y: p.dividendGrowth5Y, streak: 0, capB: 0,
        frequency: p.frequency, exDay: 1, payDay: 1, cycle: 0,
        held: true, closed: false, shares: p.shares, position: p,
        rating: dividendRating(p), perPayment: annualGross(p) / 12, paymentsAYear: 12, isFund: false
      });
    });
    labCache = rows;
    return labCache;
  }
  function labSecurity(t) {
    var m = labSecurities().filter(function (r) { return r.ticker === t; });
    return m.length ? m[0] : null;
  }

  function labAnchor(row) {
    var k = LAB_DISPERSION[row.assetClass] === undefined ? 1 : LAB_DISPERSION[row.assetClass];
    if (row.assetClass === 'Cash') {
      return { annual: row.yieldPct / 100, k: 0, source: 'money-market yield, held flat' };
    }
    var p = row.position;
    if (p && isFinite(p.irr)) return { annual: p.irr / 100, k: k, source: 'IRR on the live position' };
    var g = row.dividendGrowth5Y;
    g = (g === null || g === undefined || !isFinite(g)) ? 0 : g;
    return { annual: (row.yieldPct + Math.max(0, g)) / 100, k: k, source: 'yield + 5y dividend growth' };
  }

  /* Pull the path toward its own mean without moving where it lands. */
  function dampen(rets, k, total) {
    if (k === 1) return rets;
    var n = rets.length, m = sum(rets) / n;
    var out = rets.map(function (r) { return m + (r - m) * k; });
    var prod = out.reduce(function (s, r) { return s * (1 + r); }, 1);
    var f = Math.pow((1 + total) / prod, 1 / n);
    return out.map(function (r) { return (1 + r) * f - 1; });
  }

  function labReturns(row, n) {
    var a = labAnchor(row);
    var total = Math.pow(1 + a.annual, n / 12) - 1;
    var raw = returnPath('lab:' + row.ticker, n, total);
    return { rets: dampen(raw, a.k, total), anchor: a, total: total };
  }

  /* Drawdown on a growth-of-$1 index, never on the money line: a portfolio
     taking contributions cannot fall as far as its own value chart implies. */
  function maxDrawdown(series) {
    if (!series.length) return { pct: 0, peak: null, trough: null };
    var peak = series[0].index, peakKey = series[0].key, dd = 0, trough = null, from = null;
    series.forEach(function (s) {
      if (s.index > peak) { peak = s.index; peakKey = s.key; }
      var d = peak ? (s.index / peak - 1) * 100 : 0;
      if (d < dd) { dd = d; trough = s.key; from = peakKey; }
    });
    return { pct: dd, peak: from, trough: trough };
  }

  /* The 12 open positions at their actual weights, summing to exactly 100. */
  function labMyPortfolio() {
    var T = totals(), o = open();
    var out = o.map(function (p) {
      return { ticker: p.ticker, weight: Math.round(p.value / T.value * 10000) / 100 };
    });
    var s = Math.round(sum(out.map(function (w) { return w.weight; })) * 100) / 100;
    if (out.length && s !== 100) {
      var big = out.slice().sort(function (a, b) { return b.weight - a.weight; })[0];
      big.weight = Math.round((big.weight + (100 - s)) * 100) / 100;
    }
    return out;
  }

  function backtest(cfg) {
    cfg = cfg || {};
    var span = monthSpan(), h = history();
    var i0 = Math.max(0, Math.min(span.length - 2, cfg.from === undefined ? 0 : cfg.from));
    var i1 = Math.max(i0 + 1, Math.min(span.length - 1, cfg.to === undefined ? span.length - 1 : cfg.to));
    var months = span.slice(i0, i1 + 1), n = months.length, hist = h.slice(i0, i1 + 1);
    var tax = constants.withholdingTax;
    var start = Math.max(0, Number(cfg.amount) || 0);
    var contrib = Math.max(0, Number(cfg.monthly) || 0);
    var reinvest = cfg.reinvest !== false;

    var picks = (cfg.weights || []).map(function (w) {
      var row = labSecurity(w.ticker);
      return row ? { row: row, w: Math.max(0, Number(w.weight) || 0) } : null;
    }).filter(function (x) { return x && x.w > 0; });
    var wsum = sum(picks.map(function (p) { return p.w; }));
    if (!picks.length || wsum <= 0 || (start <= 0 && contrib <= 0)) return null;

    /* Weights are normalised to run, whatever they sum to on screen — the
       screen flags the sum, the engine never silently drops the remainder. */
    var legs = picks.map(function (p) {
      var lab = labReturns(p.row, n);
      return {
        row: p.row, weight: p.w, share: p.w / wsum, rets: lab.rets, anchor: lab.anchor,
        value: start * p.w / wsum, contributed: start * p.w / wsum, dividends: 0
      };
    });
    var held = function () { return sum(legs.map(function (l) { return l.value; })); };

    var cash = 0, contributed = start, divGross = 0, divNet = 0;
    var twr = 1, btwr = 1, bench = start, rets = [], brets = [];
    var pts = [{
      key: 'Start', short: 'Start', isStart: true, value: start, invested: start,
      benchmark: start, twrIndex: 1, benchmarkIndex: 1, monthReturn: 0, benchmarkReturn: 0,
      dividends: 0, dividendsToDate: 0, cash: 0
    }];

    for (var j = 0; j < n; j++) {
      var mo = months[j], begin = held() + cash, mGross = 0, mNet = 0;
      legs.forEach(function (l) {
        l.value *= (1 + l.rets[j]);
        if (!l.row.yieldPct) return;
        var pays = l.row.frequency === 'Monthly' || (mo.monthIndex % 3) === (l.row.cycle || 0);
        if (!pays) return;
        var g = l.value * l.row.yieldPct / 100 / (l.row.frequency === 'Monthly' ? 12 : 4);
        var nt = g * (1 - tax);
        mGross += g; mNet += nt; l.dividends += nt;
        if (reinvest) l.value += nt;
      });
      if (!reinvest) cash += mNet;
      divGross += mGross; divNet += mNet;

      var r = begin > 0 ? (held() + cash) / begin - 1 : 0;
      twr *= (1 + r); rets.push(r * 100);
      var b = hist[j].benchmarkReturn / 100;
      btwr *= (1 + b); brets.push(hist[j].benchmarkReturn);
      bench = bench * (1 + b);

      if (contrib > 0) {
        legs.forEach(function (l) { l.value += contrib * l.share; l.contributed += contrib * l.share; });
        contributed += contrib; bench += contrib;
      }
      pts.push({
        key: mo.key, short: mo.short, year: mo.year, monthIndex: mo.monthIndex, isStart: false,
        value: held() + cash, invested: contributed, benchmark: bench,
        twrIndex: twr, benchmarkIndex: btwr,
        monthReturn: r * 100, benchmarkReturn: hist[j].benchmarkReturn,
        dividends: mNet, dividendsToDate: divNet, cash: cash
      });
    }

    var c = riskCalibration();
    var p = seriesStats(rets, c.rf), bsr = seriesStats(brets, c.rf);
    var last = pts[pts.length - 1], years = n / 12;
    var dd = maxDrawdown(pts.map(function (x) { return { key: x.key, index: x.twrIndex }; }));
    var bdd = maxDrawdown(pts.map(function (x) { return { key: x.key, index: x.benchmarkIndex }; }));

    return {
      months: pts,
      stats: {
        months: n, years: years,
        from: months[0].key, to: months[n - 1].key,
        fromShort: months[0].short, toShort: months[n - 1].short,
        start: start, monthly: contrib, contributed: contributed, contributions: contributed - start,
        finalValue: last.value, profit: last.value - contributed,
        twr: (twr - 1) * 100, cagr: (Math.pow(twr, 1 / years) - 1) * 100,
        moneyReturn: contributed ? (last.value - contributed) / contributed * 100 : 0,
        volatility: p.vol, sharpe: p.sharpe * c.sharpe, sortino: p.sortino * c.sortino,
        beta: betaOf(rets, brets) * c.beta,
        maxDrawdown: dd.pct, drawdownPeak: dd.peak, drawdownTrough: dd.trough,
        downMonths: p.downMonths,
        dividendsGross: divGross, dividendsNet: divNet, cash: cash,
        incomeYield: last.value && years ? divGross / years / last.value * 100 : 0,
        riskFree: c.rf * 100, reinvest: reinvest, weightSum: wsum
      },
      benchmark: {
        label: constants.benchmark,
        twr: (btwr - 1) * 100, cagr: (Math.pow(btwr, 1 / years) - 1) * 100,
        finalValue: bench, volatility: bsr.vol,
        sharpe: bsr.sharpe * c.sharpe, sortino: bsr.sortino * c.sortino, beta: 1,
        maxDrawdown: bdd.pct, downMonths: bsr.downMonths,
        moneyReturn: contributed ? (bench - contributed) / contributed * 100 : 0
      },
      legs: legs.map(function (l) {
        return {
          ticker: l.row.ticker, name: l.row.name, mono: l.row.mono, sector: l.row.sector,
          assetClass: l.row.assetClass, held: !!l.row.held,
          weight: l.weight, share: l.share * 100,
          value: l.value, contributed: l.contributed, dividends: l.dividends,
          growth: l.contributed ? (l.value - l.contributed) / l.contributed * 100 : 0,
          anchorAnnual: l.anchor.annual * 100, anchorSource: l.anchor.source,
          yieldPct: l.row.yieldPct, frequency: l.row.frequency
        };
      }),
      window: { from: months[0].key, to: months[n - 1].key, months: n, first: i0, last: i1, span: span.length }
    };
  }

  var labMemory = null;
  function labScenarios() {
    if (labMemory) return labMemory;
    try {
      var raw = window.localStorage.getItem(LAB_KEY);
      if (raw) { var v = JSON.parse(raw); if (v && v.length) labMemory = v; }
    } catch (e) {}
    return labMemory;
  }
  function saveLabScenarios(list) {
    labMemory = list;
    try { window.localStorage.setItem(LAB_KEY, JSON.stringify(list)); } catch (e) {}
    return labMemory;
  }
  function clearLabScenarios() {
    labMemory = null;
    try { window.localStorage.removeItem(LAB_KEY); } catch (e) {}
    return null;
  }

  /* ---- price technicals (Find the Dip) -----------------------------------
     52-week high/low and the 50/200-session moving averages all come from ONE
     generated path per ticker, so they cannot contradict each other: a name
     sitting near its high is arithmetically above its own averages.

     The path is 252 sessions (about a trading year) of a seeded walk whose
     drift is pinned to the same published annual figure the Lab uses — the
     position's IRR where it is held, yield + 5-year dividend growth where it
     is not — and it is then scaled by ONE constant so the last session equals
     the current price. Scaling uniformly (rather than tapering the
     correction) leaves every ratio in the path intact, which is what keeps
     price-vs-high and price-vs-average consistent. Dispersion is by asset
     class, with the T-bill ETF pinned near flat as everywhere else. ---- */
  var TA_SESSIONS = 252;
  var TA_VOL = { Stock: 1, ETF: 0.62, ETN: 1.05, Cash: 0 };
  var TA_VOL_TICKER = { BIL: 0.06, GLDI: 0.85, SLVO: 1.25, NVDA: 1.55, AMZN: 1.15, AGNC: 0.7 };
  var taCache = {};

  function sessionDate(back) {
    var dt = new Date(constants.today.year, constants.today.monthIndex, todayDay());
    dt.setDate(dt.getDate() - Math.round(back * 7 / 5));
    return dt.getDate() + ' ' + MONTHS[dt.getMonth()] + ' ' + dt.getFullYear();
  }

  function technicals(row) {
    if (taCache[row.ticker]) return taCache[row.ticker];
    var a = labAnchor(row);
    var vol = TA_VOL_TICKER[row.ticker];
    if (vol === undefined) vol = TA_VOL[row.assetClass] === undefined ? 1 : TA_VOL[row.assetClass];
    var daily = 0.0105 * vol;
    var drift = Math.pow(1 + Math.max(-0.6, a.annual), 1 / TA_SESSIONS) - 1;
    var rnd = seeded('ta' + row.ticker), v = 1, raw = [];
    for (var i = 0; i < TA_SESSIONS; i++) {
      v = v * (1 + drift + (rnd() - 0.5) * 2 * daily);
      raw.push(v);
    }
    var k = row.price / raw[TA_SESSIONS - 1];
    var px = raw.map(function (x) { return x * k; });

    var high = px[0], low = px[0], hiAt = 0, loAt = 0;
    px.forEach(function (x, i) {
      if (x > high) { high = x; hiAt = i; }
      if (x < low) { low = x; loAt = i; }
    });
    var mean = function (n) {
      var s = px.slice(TA_SESSIONS - n);
      return sum(s) / s.length;
    };
    var ma50 = mean(50), ma200 = mean(200);
    var price = row.price;
    var t = {
      sessions: TA_SESSIONS, series: px, price: price,
      high: high, low: low,
      highDate: sessionDate(TA_SESSIONS - 1 - hiAt), lowDate: sessionDate(TA_SESSIONS - 1 - loAt),
      highSessionsAgo: TA_SESSIONS - 1 - hiAt, lowSessionsAgo: TA_SESSIONS - 1 - loAt,
      ma50: ma50, ma200: ma200,
      fromHigh: (price / high - 1) * 100,
      fromLow: (price / low - 1) * 100,
      from50: (price / ma50 - 1) * 100,
      from200: (price / ma200 - 1) * 100,
      rangePos: high > low ? (price - low) / (high - low) * 100 : 100,
      trendUp: ma50 >= ma200,
      maSpread: (ma50 / ma200 - 1) * 100,
      anchorSource: a.source, anchorAnnual: a.annual * 100
    };
    /* the invariant this screen rests on */
    t.consistent = t.fromHigh <= 0.0001 && t.fromLow >= -0.0001
      && !(t.fromHigh > -1 && t.from200 < -1);
    taCache[row.ticker] = t;
    return t;
  }

  /* Every open name in the universe with its technicals attached. Closed
     positions are dropped — a sold holding has no dip to buy. */
  function dipRows() {
    return marketUniverse().filter(function (r) { return !r.closed; }).map(function (r) {
      return Object.assign({}, r, { tech: technicals(r) });
    }).sort(function (a, b) { return a.tech.fromHigh - b.tech.fromHigh; });
  }

  /* ---- watchlist (shared by the screener and Find the Dip) ------------- */
  var WATCH_KEY = 'snowline.watch.v1';
  var WATCH_SEED = ['O', 'MSFT', 'TXN', 'SPG', 'LIN'];
  var watchMemory = null;
  function watchlist() {
    if (watchMemory) return watchMemory;
    try {
      var raw = window.localStorage.getItem(WATCH_KEY);
      if (raw) { var v = JSON.parse(raw); if (v && v.length !== undefined) { watchMemory = v; return watchMemory; } }
    } catch (e) {}
    watchMemory = WATCH_SEED.slice();
    return watchMemory;
  }
  function saveWatchlist(list) {
    watchMemory = list.slice();
    try { window.localStorage.setItem(WATCH_KEY, JSON.stringify(watchMemory)); } catch (e) {}
    return watchMemory;
  }
  function toggleWatch(ticker) {
    var cur = watchlist();
    return saveWatchlist(cur.indexOf(ticker) >= 0
      ? cur.filter(function (t) { return t !== ticker; })
      : cur.concat([ticker]));
  }

  root.SnowlineData = {
    MONTHS: MONTHS, positions: positions, constants: constants,
    categoryTargets: categoryTargets, dividendHistory: dividendHistory, fmt: fmt,
    corporateActions: corporateActions, corporateActionLog: corporateActionLog,
    corporateActionStats: corporateActionStats, corporateActionsFor: corporateActionsFor,
    splitFactorAfter: splitFactorAfter, basisAdjustFor: basisAdjustFor,
    categoryModel: categoryModel, categorySeed: categorySeed, saveCategoryModel: saveCategoryModel,
    resetCategories: resetCategories, categoryOf: categoryOf, categoryTargetOf: categoryTargetOf,
    targetTotal: targetTotal, assignHolding: assignHolding, setCategoryTarget: setCategoryTarget,
    createCategory: createCategory, renameCategory: renameCategory, deleteCategory: deleteCategory,
    moveCategory: moveCategory, normaliseTargets: normaliseTargets,
    open: open, sold: sold, totals: totals, categories: categories, movers: movers,
    byTicker: byTicker, holding: holding, holdings: holdings,
    scheduleFor: scheduleFor, forwardPayments: forwardPayments,
    paymentCountNext12: paymentCountNext12, dividendTimeline: dividendTimeline,
    projection: projection, goalConfig: goalConfig, saveGoalConfig: saveGoalConfig,
    clearGoalConfig: clearGoalConfig, goalDefaults: GOAL_DEFAULTS,
    cashFlow: cashFlow, cashStats: cashStats, cashByCurrency: cashByCurrency,
    cashPositions: cashPositions, cashFloat: cashFloat,
    priceSeries: priceSeries,
    transactionsFor: transactionsFor, dividendsFor: dividendsFor,
    history: history, historyRange: historyRange, monthlyReturns: monthlyReturns,
    holdingsPerformance: holdingsPerformance, monthSpan: monthSpan,
    fundComposition: fundComposition, lookThrough: lookThrough, breakdown: breakdown,
    incomeBreakdown: incomeBreakdown, dividendRating: dividendRating,
    riskStats: riskStats, riskVerdict: riskVerdict, riskFreeRate: riskFreeRate,
    benchmarkValuePath: benchmarkValuePath,
    ledger: ledger, ledgerTotals: ledgerTotals, ledgerReconciliation: ledgerReconciliation,
    exchangesFor: exchangesFor,
    calendarMonth: calendarMonth, calendarYear: calendarYear,
    marketUniverse: marketUniverse, universeSectors: universeSectors, universeStats: universeStats,
    marketCalendarMonth: marketCalendarMonth, marketCalendarYear: marketCalendarYear,
    labSecurities: labSecurities, labSecurity: labSecurity, labMyPortfolio: labMyPortfolio,
    labAnchor: labAnchor, backtest: backtest, maxDrawdown: maxDrawdown,
    riskCalibration: riskCalibration,
    labScenarios: labScenarios, saveLabScenarios: saveLabScenarios, clearLabScenarios: clearLabScenarios,
    technicals: technicals, dipRows: dipRows, sessionDate: sessionDate,
    watchlist: watchlist, saveWatchlist: saveWatchlist, toggleWatch: toggleWatch
  };
})(window);
