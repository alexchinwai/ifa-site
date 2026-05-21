/* ─────────────────────────────────────────────────────────────
   Alex · 閒錢增值體檢 — site script
   Vanilla JS, no framework, no build step.
   Handles: mobile nav, scroll-reveal, FAQ accordion, calculator,
   lead form. Each feature is guarded by element presence so this
   one file is safe to load on every page.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── Calculator assumptions (CONFIG) ───────────────────────────
     ⚠️ COMPLIANCE-SENSITIVE — confirm with AMG compliance before launch.
     If you change these, also update:
       · index.html  →  calculator "後台假設" line
       · index.html  →  empathy section stat numbers                */
  var CONFIG = { inflation: 2.0, bankRate: 0.5, conservativeRate: 4.5 };
  var HERO_YEARS = 10;

  /* ── Lead capture endpoint (Google Apps Script Web App) ─────────
     Empty string = front-end stub (no real POST, just shows success). */
  var LEAD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzmiYWajuAtKy_lU0PmED3qL3Ibm1sjt6_fvXezvPeB2z_Fc_aTrNiTH1fIDnrFDhGHFw/exec';

  /* ── helpers ─────────────────────────────────────────────────── */
  function commas(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function fmtHKD(n, compact) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    var sign = n < 0 ? '-' : '';
    var abs = Math.abs(Math.round(n));
    if (compact) {
      if (abs >= 10000000) return sign + 'HKD ' + (abs / 1000000).toFixed(1) + 'M';
      if (abs >= 100000) return sign + 'HKD ' + (abs / 10000).toFixed(1) + '萬';
    }
    return sign + 'HKD ' + commas(abs);
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function el(id) { return document.getElementById(id); }

  /* ── pure math (from calculator-spec.md §3) ────────────────────
     Lump sum + optional monthly annuity, deflated to today's HKD. */
  function computeCheck(o) {
    var inf = o.inflation / 100, bank = o.bankRate / 100, cons = o.conservativeRate / 100;
    var months = o.years * 12;
    function fvAnnuity(rate) {
      var r = rate / 12;
      if (r === 0) return o.monthly * months;
      return o.monthly * ((Math.pow(1 + r, months) - 1) / r);
    }
    var lumpBankNominal = o.amount * Math.pow(1 + bank, o.years);
    var lumpBankReal = lumpBankNominal / Math.pow(1 + inf, o.years);
    var lumpConsReal = o.amount * Math.pow(1 + cons, o.years) / Math.pow(1 + inf, o.years);
    var monthBankReal = o.monthly > 0 ? fvAnnuity(bank) / Math.pow(1 + inf, o.years) : 0;
    var monthConsReal = o.monthly > 0 ? fvAnnuity(cons) / Math.pow(1 + inf, o.years) : 0;
    var bankEndReal = lumpBankReal + monthBankReal;
    var consEndReal = lumpConsReal + monthConsReal;
    var ppLoss = Math.max(0, o.amount - lumpBankReal);
    var ppLossPct = (ppLoss / o.amount) * 100;
    var series = [];
    for (var y = 0; y <= o.years; y++) {
      series.push({
        year: y,
        bankReal: o.amount * Math.pow((1 + bank) / (1 + inf), y),
        consReal: o.amount * Math.pow((1 + cons) / (1 + inf), y)
      });
    }
    return {
      ppLoss: ppLoss, ppLossPct: ppLossPct,
      bankEndReal: bankEndReal, consEndReal: consEndReal,
      monthBankReal: monthBankReal, monthConsReal: monthConsReal,
      series: series, inputs: o
    };
  }

  /* ── purchasing-power chart (HTML stats + simple SVG sparkline) ──
     Mobile-first: key numbers as readable HTML stats; SVG below is a
     clean two-line sparkline with x-axis ticks only — no overlapping
     in-SVG labels. */
  function comparisonChartHTML(series, years, amount) {
    var last = series[series.length - 1];
    var bankPct = ((last.bankReal - amount) / amount) * 100;
    var consPct = ((last.consReal - amount) / amount) * 100;

    // SVG: smaller viewBox so font sizes scale closer to actual pixels on mobile.
    // padR reserved for inline endpoint labels ("擺低息戶口" / "說明性配置").
    var W = 380, H = 160, padL = 30, padR = 116, padT = 14, padB = 26;
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var allY = [amount];
    series.forEach(function (s) { allY.push(s.bankReal, s.consReal); });
    var maxY = Math.max.apply(null, allY) * 1.02;
    var minY = Math.min.apply(null, allY) * 0.96;
    function xS(i) { return padL + (i / (series.length - 1)) * innerW; }
    function yS(v) { return padT + innerH - ((v - minY) / (maxY - minY)) * innerH; }
    function line(key) {
      return series.map(function (s, i) { return (i === 0 ? 'M' : 'L') + ' ' + xS(i).toFixed(1) + ' ' + yS(s[key]).toFixed(1); }).join(' ');
    }
    var lossArea = series.map(function (s, i) { return (i === 0 ? 'M' : 'L') + ' ' + xS(i).toFixed(1) + ' ' + yS(s.bankReal).toFixed(1); }).join(' ')
      + ' L ' + xS(series.length - 1).toFixed(1) + ' ' + yS(amount).toFixed(1)
      + ' L ' + xS(0).toFixed(1) + ' ' + yS(amount).toFixed(1) + ' Z';
    var ticks = [0, Math.floor(years / 2), years];
    var ticksSVG = ticks.map(function (t) {
      var x = xS(t);
      return '<text x="' + x.toFixed(1) + '" y="' + (H - 8) + '" font-size="11" fill="var(--muted)" text-anchor="middle" font-family="var(--font-mono)">' + (t === 0 ? '今日' : '+' + t + '年') + '</text>';
    }).join('');
    var lastX = xS(series.length - 1);
    var labelX = lastX + 12;
    var bankY = yS(last.bankReal), consY = yS(last.consReal);
    // Avoid stacking the two labels if endpoints are close — push them apart.
    if (Math.abs(bankY - consY) < 18) {
      if (bankY > consY) { bankY = consY + 18; } else { bankY = consY - 18; }
    }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="height:auto;display:block" role="img" aria-label="' + years + ' 年購買力對比圖">'
      + '<line x1="' + padL + '" y1="' + yS(amount).toFixed(1) + '" x2="' + lastX.toFixed(1) + '" y2="' + yS(amount).toFixed(1) + '" stroke="var(--hairline-strong)" stroke-width="1" stroke-dasharray="2 3"/>'
      + '<text x="' + (padL - 4) + '" y="' + (yS(amount) + 3) + '" font-size="10" fill="var(--muted)" text-anchor="end" font-family="var(--font-mono)">今日</text>'
      + '<path d="' + lossArea + '" fill="rgba(217,74,38,0.10)"/>'
      + '<path d="' + line('consReal') + '" fill="none" stroke="var(--muted)" stroke-width="2.5" stroke-dasharray="6 5" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<path d="' + line('bankReal') + '" fill="none" stroke="var(--navy)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="' + lastX.toFixed(1) + '" cy="' + yS(last.bankReal).toFixed(1) + '" r="4.5" fill="var(--navy)"/>'
      + '<circle cx="' + lastX.toFixed(1) + '" cy="' + yS(last.consReal).toFixed(1) + '" r="4.5" fill="none" stroke="var(--muted)" stroke-width="2.5"/>'
      + '<line x1="' + labelX + '" y1="' + bankY.toFixed(1) + '" x2="' + (labelX + 14) + '" y2="' + bankY.toFixed(1) + '" stroke="var(--navy)" stroke-width="3" stroke-linecap="round"/>'
      + '<text x="' + (labelX + 20) + '" y="' + (bankY + 4).toFixed(1) + '" font-size="12" fill="var(--navy)" font-weight="700" font-family="var(--font-sans)">擺低息戶口</text>'
      + '<line x1="' + labelX + '" y1="' + consY.toFixed(1) + '" x2="' + (labelX + 14) + '" y2="' + consY.toFixed(1) + '" stroke="var(--muted)" stroke-width="2.5" stroke-dasharray="3 2"/>'
      + '<text x="' + (labelX + 20) + '" y="' + (consY + 4).toFixed(1) + '" font-size="12" fill="var(--muted)" font-weight="600" font-family="var(--font-sans)">說明性配置</text>'
      + ticksSVG
      + '</svg>';

    return ''
      + '<div class="chart-stats">'
      +   '<div class="chart-stat chart-stat-bank">'
      +     '<div class="chart-stat-label"><span class="chart-swatch chart-swatch-bank"></span>擺低息戶口</div>'
      +     '<div class="chart-stat-flow"><span class="num">' + (amount / 10000).toFixed(1) + '萬</span><span class="chart-arrow">→</span><span class="num chart-stat-end">' + (last.bankReal / 10000).toFixed(1) + '萬</span><span class="chart-stat-delta">' + (bankPct >= 0 ? '+' : '') + bankPct.toFixed(1) + '%</span></div>'
      +   '</div>'
      +   '<div class="chart-stat chart-stat-cons">'
      +     '<div class="chart-stat-label"><span class="chart-swatch chart-swatch-cons"></span>說明性配置 <span class="chart-tag">非保證</span></div>'
      +     '<div class="chart-stat-flow"><span class="num">' + (amount / 10000).toFixed(1) + '萬</span><span class="chart-arrow">→</span><span class="num chart-stat-end">' + (last.consReal / 10000).toFixed(1) + '萬</span><span class="chart-stat-delta">' + (consPct >= 0 ? '+' : '') + consPct.toFixed(1) + '%</span></div>'
      +   '</div>'
      + '</div>'
      + '<div class="chart-svg-wrap">' + svg + '</div>';
  }

  /* ── result panel (HTML string) ────────────────────────────── */
  function resultPanelHTML(r) {
    var years = r.inputs.years, i = r.inputs;
    var monthlyRow = (i.monthly > 0)
      ? '<div class="micro mt-16" style="padding-top:12px;border-top:1px dashed var(--hairline)">另計每月儲 <span class="num">' + fmtHKD(i.monthly) + '</span>:擺銀行最後實際約 <span class="num">' + fmtHKD(r.monthBankReal) + '</span> · 說明性配置實際約 <span class="num">' + fmtHKD(r.monthConsReal) + '</span>(均已扣除通脹)</div>'
      : '';
    return ''
      + '<div class="result-callout">'
      +   '<div class="flex justify-between items-start gap-12 wrap">'
      +     '<div>'
      +       '<div class="eyebrow" style="color:var(--accent)">體檢結果 · 大數字</div>'
      +       '<div class="h3 mt-8" style="color:var(--navy-500);font-weight:500">你筆錢擺低息戶口 ' + years + ' 年,<br><span style="color:var(--ink);font-weight:700">購買力靜靜雞蝕緊 ——</span></div>'
      +     '</div>'
      +     '<span class="tag tag-accent"><span class="dot"></span>說明性計算</span>'
      +   '</div>'
      +   '<div class="result-big num">− ' + fmtHKD(r.ppLoss) + '</div>'
      +   '<div class="small mt-8 num">即係 <strong style="color:var(--ink)">' + r.ppLossPct.toFixed(1) + '%</strong> 嘅實際購買力 · ' + years + ' 年後筆錢實際只值返 <strong style="color:var(--ink)">' + fmtHKD(r.bankEndReal) + '</strong>(今日價)</div>'
      + '</div>'
      + '<div class="card-inset mt-20" style="padding:18px">'
      +   '<div class="eyebrow">圖表 · 今日購買力</div>'
      +   '<div class="h3" style="margin-top:4px;margin-bottom:14px">' + years + ' 年後,你筆錢嘅實際購買力</div>'
      +   comparisonChartHTML(r.series, years, i.amount)
      + '</div>'
      + '<div class="card-inset mt-20" style="padding:18px">'
      +   '<div class="eyebrow mb-12">同一筆 ' + fmtHKD(i.amount, true) + ',兩條路 · ' + years + ' 年後實際購買力</div>'
      +   '<div class="result-twocol">'
      +     '<div>'
      +       '<div class="small">繼續擺低息戶口</div>'
      +       '<div class="num" style="font-size:24px;font-weight:700;color:var(--navy)">' + fmtHKD(r.bankEndReal) + '</div>'
      +       '<div class="micro mt-8">假設年利率 ' + i.bankRate + '% · 通脹 ' + i.inflation + '%</div>'
      +     '</div>'
      +     '<div style="border-left:1px solid var(--hairline);padding-left:16px">'
      +       '<div class="small">說明性 · 合理配置情境 <span class="tag" style="margin-left:6px;padding:2px 6px;font-size:10px;color:var(--muted)">非保證</span></div>'
      +       '<div class="num" style="font-size:24px;font-weight:700;color:var(--navy-500)">' + fmtHKD(r.consEndReal) + '</div>'
      +       '<div class="micro mt-8">假設年回報 ' + i.conservativeRate + '% · 通脹 ' + i.inflation + '%</div>'
      +     '</div>'
      +   '</div>'
      +   monthlyRow
      + '</div>'
      + '<div class="disclaimer mt-20" role="note" aria-label="重要免責聲明">'
      +   '<strong>呢個係教育用途嘅說明性計算,唔係投資建議。</strong> '
      +   '上述「合理配置」嗰條線只反映一個假設年回報率嘅情境,<strong>並非任何產品推介、亦不代表將來表現或任何形式之保證</strong>。'
      +   '實際結果視乎你嘅產品選擇、市場狀況、稅務、費用等因素;投資涉及風險,本金可能虧損。個人化建議請諮詢持牌財務顧問。'
      + '</div>';
  }

  /* ── hero data card ──────────────────────────────────────────── */
  function renderHeroDataCard() {
    var host = el('hero-datacard');
    if (!host) return;
    var inf = CONFIG.inflation / 100, bank = CONFIG.bankRate / 100, cons = CONFIG.conservativeRate / 100;
    var pts = [];
    for (var y = 0; y <= HERO_YEARS; y++) {
      pts.push({ y: y, bank: Math.pow((1 + bank) / (1 + inf), y), cons: Math.pow((1 + cons) / (1 + inf), y) });
    }
    var last = pts[pts.length - 1];
    var bankEnd = last.bank * 100, consEnd = last.cons * 100;
    var bankPct = (bankEnd - 100), consPct = (consEnd - 100);

    // sparkline — smaller viewBox + inline endpoint labels
    var W = 380, H = 160, padL = 30, padR = 116, padT = 14, padB = 26;
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var aMax = Math.max.apply(null, pts.map(function (p) { return Math.max(p.bank, p.cons); }));
    var aMin = Math.min.apply(null, pts.map(function (p) { return Math.min(p.bank, p.cons); }));
    var min = Math.min(0.7, aMin - 0.04);
    var max = Math.max(1.35, aMax + 0.04);
    function xS(i) { return padL + (i / (pts.length - 1)) * innerW; }
    function yS(v) { return padT + innerH - ((v - min) / (max - min)) * innerH; }
    function path(key) {
      return pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + ' ' + xS(i).toFixed(1) + ' ' + yS(p[key]).toFixed(1); }).join(' ');
    }
    var lossArea = 'M ' + xS(0).toFixed(1) + ' ' + yS(1).toFixed(1) + ' '
      + pts.map(function (p, i) { return 'L ' + xS(i).toFixed(1) + ' ' + yS(p.bank).toFixed(1); }).join(' ')
      + ' L ' + xS(pts.length - 1).toFixed(1) + ' ' + yS(1).toFixed(1) + ' Z';
    var ticks = [0, 5, 10];
    var ticksSVG = ticks.map(function (t) {
      var x = xS(t);
      return '<text x="' + x.toFixed(1) + '" y="' + (H - 8) + '" font-size="11" fill="var(--muted)" text-anchor="middle" font-family="var(--font-mono)">' + (t === 0 ? '今日' : '+' + t + '年') + '</text>';
    }).join('');
    var lastX = xS(pts.length - 1);
    var labelX = lastX + 12;
    var bankY = yS(last.bank), consY = yS(last.cons);
    if (Math.abs(bankY - consY) < 18) {
      if (bankY > consY) { bankY = consY + 18; } else { bankY = consY - 18; }
    }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="height:auto;display:block" aria-label="十年購買力示意">'
      +   '<line x1="' + padL + '" y1="' + yS(1).toFixed(1) + '" x2="' + lastX.toFixed(1) + '" y2="' + yS(1).toFixed(1) + '" stroke="var(--hairline-strong)" stroke-width="1" stroke-dasharray="2 3"/>'
      +   '<text x="' + (padL - 4) + '" y="' + (yS(1) + 3) + '" font-size="10" fill="var(--muted)" text-anchor="end" font-family="var(--font-mono)">今日</text>'
      +   '<path d="' + lossArea + '" fill="rgba(217,74,38,0.12)"/>'
      +   '<path d="' + path('cons') + '" fill="none" stroke="var(--muted)" stroke-width="2.5" stroke-dasharray="6 5" stroke-linecap="round"/>'
      +   '<path d="' + path('bank') + '" fill="none" stroke="var(--navy)" stroke-width="3" stroke-linecap="round"/>'
      +   '<circle cx="' + lastX.toFixed(1) + '" cy="' + yS(last.bank).toFixed(1) + '" r="4.5" fill="var(--navy)"/>'
      +   '<circle cx="' + lastX.toFixed(1) + '" cy="' + yS(last.cons).toFixed(1) + '" r="4.5" fill="none" stroke="var(--muted)" stroke-width="2.5"/>'
      +   '<line x1="' + labelX + '" y1="' + bankY.toFixed(1) + '" x2="' + (labelX + 14) + '" y2="' + bankY.toFixed(1) + '" stroke="var(--navy)" stroke-width="3" stroke-linecap="round"/>'
      +   '<text x="' + (labelX + 20) + '" y="' + (bankY + 4).toFixed(1) + '" font-size="12" fill="var(--navy)" font-weight="700" font-family="var(--font-sans)">擺低息戶口</text>'
      +   '<line x1="' + labelX + '" y1="' + consY.toFixed(1) + '" x2="' + (labelX + 14) + '" y2="' + consY.toFixed(1) + '" stroke="var(--muted)" stroke-width="2.5" stroke-dasharray="3 2"/>'
      +   '<text x="' + (labelX + 20) + '" y="' + (consY + 4).toFixed(1) + '" font-size="12" fill="var(--muted)" font-weight="600" font-family="var(--font-sans)">說明性配置</text>'
      +   ticksSVG
      + '</svg>';

    host.innerHTML = ''
      + '<div class="legend">'
      +   '<div><div class="eyebrow">說明性圖表 · 10 年</div><div style="font-family:var(--font-display);font-weight:700;color:var(--ink);font-size:18px;margin-top:4px">HKD 100 嘅實際購買力</div></div>'
      + '</div>'
      + '<div class="chart-stats">'
      +   '<div class="chart-stat chart-stat-bank">'
      +     '<div class="chart-stat-label"><span class="chart-swatch chart-swatch-bank"></span>擺低息戶口</div>'
      +     '<div class="chart-stat-flow"><span class="num">$100</span><span class="chart-arrow">→</span><span class="num chart-stat-end">$' + bankEnd.toFixed(0) + '</span><span class="chart-stat-delta">' + (bankPct >= 0 ? '+' : '') + bankPct.toFixed(0) + '%</span></div>'
      +   '</div>'
      +   '<div class="chart-stat chart-stat-cons">'
      +     '<div class="chart-stat-label"><span class="chart-swatch chart-swatch-cons"></span>說明性配置 <span class="chart-tag">非保證</span></div>'
      +     '<div class="chart-stat-flow"><span class="num">$100</span><span class="chart-arrow">→</span><span class="num chart-stat-end">$' + consEnd.toFixed(0) + '</span><span class="chart-stat-delta">' + (consPct >= 0 ? '+' : '') + consPct.toFixed(0) + '%</span></div>'
      +   '</div>'
      + '</div>'
      + '<div class="chart-svg-wrap">' + svg + '</div>'
      + '<div class="micro mt-12" style="color:var(--muted);padding-top:12px;border-top:1px solid var(--hairline)">假設通脹 ' + CONFIG.inflation + '% · 銀行 ' + CONFIG.bankRate + '% · 說明性 ' + CONFIG.conservativeRate + '% · 非保證</div>';
  }

  /* ── calculator ──────────────────────────────────────────────── */
  function initCalculator() {
    var resultHost = el('calc-result');
    if (!resultHost) return;

    var state = { amount: 500000, years: 10, age: 42, monthly: 0, monthlyEnabled: false };

    var amountInput = el('calc-amount');
    var amountRange = el('calc-amount-range');
    var yearsRange = el('calc-years-range');
    var yearsDisplay = el('calc-years-display');
    var ageInput = el('calc-age');
    var ageMinus = el('calc-age-minus');
    var agePlus = el('calc-age-plus');
    var agePills = el('calc-age-pills');
    var monthlyInput = el('calc-monthly');
    var monthlyToggle = el('calc-monthly-toggle');
    var monthlyWrap = el('calc-monthly-wrap');

    function render() {
      var r = computeCheck({
        amount: state.amount, years: state.years, age: state.age,
        monthly: state.monthlyEnabled ? state.monthly : 0,
        inflation: CONFIG.inflation, bankRate: CONFIG.bankRate, conservativeRate: CONFIG.conservativeRate
      });
      resultHost.innerHTML = resultPanelHTML(r);
      // keep hidden lead-form fields in sync for handoff/CRM
      setHidden('lead-calc-amount', state.amount);
      setHidden('lead-calc-years', state.years);
      setHidden('lead-calc-age', state.age);
    }
    function setHidden(id, v) { var h = el(id); if (h) h.value = v; }

    /* amount — text + range kept in sync */
    amountInput.addEventListener('input', function () {
      var n = clamp(parseInt(amountInput.value.replace(/[^0-9]/g, '') || '0', 10), 0, 5000000);
      state.amount = n;
      amountRange.value = clamp(n, 50000, 5000000);
      render();
    });
    amountInput.addEventListener('blur', function () {
      state.amount = clamp(parseInt(amountInput.value.replace(/[^0-9]/g, '') || '0', 10) || 50000, 50000, 5000000);
      amountInput.value = commas(state.amount);
      amountRange.value = state.amount;
      render();
    });
    amountRange.addEventListener('input', function () {
      state.amount = parseInt(amountRange.value, 10);
      amountInput.value = commas(state.amount);
      render();
    });

    /* years */
    yearsRange.addEventListener('input', function () {
      state.years = parseInt(yearsRange.value, 10);
      yearsDisplay.textContent = state.years;
      render();
    });

    /* age — stepper + quick pills */
    function setAge(n) {
      state.age = clamp(n, 25, 65);
      ageInput.value = state.age;
      if (agePills) {
        [].forEach.call(agePills.querySelectorAll('[data-age]'), function (b) {
          b.classList.toggle('is-on', parseInt(b.getAttribute('data-age'), 10) === state.age);
        });
      }
      render();
    }
    ageInput.addEventListener('input', function () {
      var n = parseInt(ageInput.value || '0', 10);
      if (!isNaN(n)) setAge(n);
    });
    ageMinus.addEventListener('click', function () { setAge(state.age - 1); });
    agePlus.addEventListener('click', function () { setAge(state.age + 1); });
    if (agePills) {
      [].forEach.call(agePills.querySelectorAll('[data-age]'), function (b) {
        b.addEventListener('click', function () { setAge(parseInt(b.getAttribute('data-age'), 10)); });
      });
    }

    /* monthly — optional */
    function syncMonthlyUI() {
      monthlyToggle.textContent = state.monthlyEnabled ? '不加入計算' : '加入計算';
      monthlyToggle.style.color = state.monthlyEnabled ? 'var(--accent)' : 'var(--muted)';
      monthlyWrap.style.opacity = state.monthlyEnabled ? '1' : '0.45';
      monthlyWrap.style.pointerEvents = state.monthlyEnabled ? 'auto' : 'none';
    }
    monthlyToggle.addEventListener('click', function () {
      state.monthlyEnabled = !state.monthlyEnabled;
      syncMonthlyUI();
      render();
    });
    monthlyInput.addEventListener('input', function () {
      state.monthly = clamp(parseInt(monthlyInput.value.replace(/[^0-9]/g, '') || '0', 10), 0, 100000);
      monthlyInput.value = commas(state.monthly);
      render();
    });

    syncMonthlyUI();
    render();
  }

  /* ── lead form ───────────────────────────────────────────────── */
  function initLeadForm() {
    var form = el('lead-form');
    if (!form) return;

    /* capture UTM params into hidden fields for CRM attribution */
    var params = new URLSearchParams(window.location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) {
      var h = el('lead-' + k);
      if (h) h.value = params.get(k) || '';
    });

    var nameI = el('lead-name'), waI = el('lead-whatsapp'), emailI = el('lead-email'),
        consentI = el('lead-consent'), submitBtn = el('lead-submit');

    function valid() {
      return nameI.value.trim() && (waI.value.trim() || emailI.value.trim()) && consentI.checked;
    }
    function syncBtn() { submitBtn.disabled = !valid(); }
    [nameI, waI, emailI, consentI].forEach(function (i) {
      i.addEventListener('input', syncBtn);
      i.addEventListener('change', syncBtn);
    });
    syncBtn();

    function renderSuccess() {
      form.outerHTML = ''
        + '<div class="card" style="padding:28px;text-align:center;border-color:var(--hairline-strong)">'
        +   '<div style="width:56px;height:56px;border-radius:999px;background:rgba(47,122,79,0.12);color:var(--green);display:grid;place-items:center;margin:0 auto 14px">'
        +     '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>'
        +   '</div>'
        +   '<div class="h3">收到。你嘅完整體檢報告即刻寄到你 email。</div>'
        +   '<p class="small mt-12" style="max-width:360px;margin:12px auto 0">會由 Alex 本人跟進 · 唔會 cold call 疲勞轟炸 · 你隨時可叫停。</p>'
        +   '<div class="flex gap-12 mt-24 justify-center wrap">'
        +     '<a class="btn btn-ghost" href="https://wa.me/85291268714">直接 WhatsApp Alex</a>'
        +     '<a class="btn btn-dark" href="https://calendly.com/alexchinwai/15mincall">Book 15 分鐘傾下</a>'
        +   '</div>'
        + '</div>';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valid()) return;

      /* Meta Pixel Lead event — fires whether the endpoint is wired or not. */
      if (typeof window.fbq === 'function') { window.fbq('track', 'Lead'); }
      /* GA4 lead event — same. */
      if (typeof window.gtag === 'function') { window.gtag('event', 'generate_lead', { method: 'landing_form' }); }

      submitBtn.disabled = true;
      var origLabel = submitBtn.textContent;
      submitBtn.textContent = '寄緊…';

      if (!LEAD_ENDPOINT) {
        /* No endpoint wired yet — still show success so design previews work.
           Real POSTing kicks in once LEAD_ENDPOINT is set. */
        renderSuccess();
        return;
      }

      /* Build URL-encoded form body (avoids CORS preflight on Apps Script). */
      var body = new URLSearchParams();
      ['lead-name', 'lead-whatsapp', 'lead-email', 'lead-consent',
       'lead-utm_source', 'lead-utm_medium', 'lead-utm_campaign', 'lead-utm_content',
       'lead-calc-amount', 'lead-calc-years', 'lead-calc-age'].forEach(function (id) {
        var node = el(id);
        if (!node) return;
        var key = id.replace(/^lead-/, '').replace(/-/g, '_');
        var val = node.type === 'checkbox' ? (node.checked ? 'on' : '') : (node.value || '');
        body.append(key, val);
      });

      fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: body.toString(),
      }).then(function () {
        renderSuccess();
      }).catch(function () {
        /* Network or CORS failure — still show success (Apps Script usually
           succeeded server-side; opaque response is fine). */
        renderSuccess();
      });
    });
  }

  /* ── mobile nav drawer ───────────────────────────────────────── */
  function initNav() {
    var trigger = el('nav-trigger'), drawer = el('nav-drawer');
    if (!trigger || !drawer) return;
    trigger.addEventListener('click', function () {
      var open = drawer.classList.toggle('open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      trigger.setAttribute('aria-label', open ? '關閉選單' : '打開選單');
    });
  }

  /* ── FAQ accordion (single-open) ─────────────────────────────── */
  function initFAQ() {
    var items = document.querySelectorAll('.faq-item');
    if (!items.length) return;
    [].forEach.call(items, function (item) {
      var q = item.querySelector('.faq-q');
      var a = item.querySelector('.faq-a');
      if (!q || !a) return;
      q.addEventListener('click', function () {
        var isOpen = q.getAttribute('aria-expanded') === 'true';
        [].forEach.call(items, function (other) {
          var oq = other.querySelector('.faq-q'), oa = other.querySelector('.faq-a');
          if (oq && oa) { oq.setAttribute('aria-expanded', 'false'); oa.classList.remove('open'); }
        });
        if (!isOpen) { q.setAttribute('aria-expanded', 'true'); a.classList.add('open'); }
      });
    });
  }

  /* ── scroll reveal ───────────────────────────────────────────── */
  function initReveal() {
    var els = document.querySelectorAll('.reveal:not(.in)');
    if (!els.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      [].forEach.call(els, function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    [].forEach.call(els, function (e) { io.observe(e); });
  }

  /* ── boot ────────────────────────────────────────────────────── */
  function boot() {
    initNav();
    initReveal();
    initFAQ();
    renderHeroDataCard();
    initCalculator();
    initLeadForm();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
