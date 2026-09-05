<!--
  My goal — a read of the same projection the My goal screen runs. Nothing
  here is hardcoded to one target, mode or horizon: the ring, the verdict and
  both chart lines all come off the projection the API returns.

  The value axis is logarithmic, because a 25-year compounding path is
  unreadable on a linear scale.
-->
<script lang="ts">
  import { fmt, type Projection } from '@snowline/core';

  let { projection: pr }: { projection: Projection } = $props();

  const VB = { w: 624, h: 148, left: 40, right: 612, top: 14, base: 140 };

  /** Log scale bounds, padded so the extremes are not on the frame. */
  const scale = $derived.by(() => {
    const all = [...pr.P, ...pr.S, pr.goal, pr.current];
    const lo = Math.log10(Math.max(1, Math.min(...all))) - 0.1;
    const hi = Math.log10(Math.max(...all)) + 0.06;
    return { lo, hi, span: hi - lo };
  });

  const gy = (v: number) =>
    VB.base - ((Math.log10(Math.max(1, v)) - scale.lo) / scale.span) * 126;
  const gx = (n: number) => VB.left + (n / pr.span) * 572;

  /** Decade gridlines, falling back to 2× / 5× steps when the range is short. */
  const grid = $derived.by(() => {
    const decades: number[] = [];
    for (let e = Math.ceil(scale.lo); e <= Math.floor(scale.hi); e++) decades.push(Math.pow(10, e));
    if (decades.length < 3) {
      for (let e = Math.floor(scale.lo); e <= Math.ceil(scale.hi); e++) {
        [2, 5].forEach((m) => {
          const v = m * Math.pow(10, e);
          if (Math.log10(v) > scale.lo && Math.log10(v) < scale.hi) decades.push(v);
        });
      }
      decades.sort((a, b) => a - b);
    }
    // Drop any line that would collide with the goal line.
    return decades
      .filter((v) => Math.abs(gy(v) - gy(pr.goal)) > 9)
      .map((v) => ({
        y: gy(v).toFixed(1),
        top: ((gy(v) / VB.h) * 100).toFixed(2) + '%',
        label: fmt.compact(v)
      }));
  });

  const portPoints = $derived(pr.P.map((v, n) => `${gx(n).toFixed(1)},${gy(v).toFixed(1)}`).join(' '));
  const safePoints = $derived(pr.S.map((v, n) => `${gx(n).toFixed(1)},${gy(v).toFixed(1)}`).join(' '));

  /** Where each line first crosses the target. */
  const marks = $derived.by(() =>
    [
      { n: pr.crossP, color: 'var(--accent)', label: String(pr.crossPYear) },
      { n: pr.crossS, color: 'var(--t2)', label: String(pr.crossSYear) }
    ]
      .filter((k): k is { n: number; color: string; label: string } => k.n !== null)
      .map((k) => ({
        x: (gx(k.n) - 3.5).toFixed(1),
        y: (gy(pr.goal) - 3.5).toFixed(1),
        lpos: ((gx(k.n) / VB.w) * 100).toFixed(2) + '%',
        ltop: (((gy(pr.goal) + 8) / VB.h) * 100).toFixed(2) + '%',
        color: k.color,
        label: k.label
      }))
  );

  const xLabels = $derived(
    [0, 1, 2, 3, 4]
      .map((i) => Math.round((pr.span * i) / 4))
      .map((n) => ({
        lpos: ((gx(n) / VB.w) * 100).toFixed(2) + '%',
        label: String(pr.startYear + n)
      }))
  );

  const R = 38;
  const ring = $derived(`${((pr.progressPct / 100) * 2 * Math.PI * R).toFixed(2)} ${(2 * Math.PI * R).toFixed(2)}`);

  const verdictColor = $derived(pr.achievable ? 'var(--t1)' : 'var(--amber)');
  const verdictBorder = $derived(pr.achievable ? 'var(--accent)' : 'var(--amber)');
  const verdictSub = $derived(
    pr.achievable
      ? `By ${pr.crossPYear}${
          pr.crossPYear! < pr.byYear
            ? ` · ${pr.byYear - pr.crossPYear!} years ahead of your ${pr.byYear} target`
            : ' · exactly on your target year'
        }`
      : `Short by ${fmt.money(pr.shortfall)} at ${pr.byYear}`
  );
</script>

<div class="card">
  <div class="card-head">
    <span class="card-title">My goal</span>
    <a href="/portfolio/goal" style="font-size:12px;font-weight:500">More →</a>
  </div>

  <div style="padding:18px 20px 20px;display:flex;flex-direction:column;gap:16px">
    <div style="display:flex;align-items:center;gap:18px">
      <div style="position:relative;width:88px;height:88px;flex:none">
        <svg width="88" height="88" viewBox="0 0 88 88" style="display:block">
          <circle cx="44" cy="44" r={R} fill="none" stroke="var(--line)" stroke-width="7" />
          <circle
            cx="44"
            cy="44"
            r={R}
            fill="none"
            stroke="var(--accent)"
            stroke-width="7"
            stroke-dasharray={ring}
            transform="rotate(-90 44 44)"
          />
        </svg>
        <span
          style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;color:var(--t1)"
          >{fmt.num(pr.progressPct, 0)}%</span
        >
      </div>

      <div style="display:flex;flex-direction:column;gap:5px;min-width:0">
        <div style="display:flex;align-items:baseline;gap:7px">
          <span style="font-size:24px;font-weight:600;letter-spacing:-0.02em;color:var(--t1)"
            >{fmt.k(pr.current)}</span
          >
          <span style="font-size:14px;color:var(--t3)">/ {fmt.k(pr.target)}</span>
          <span style="font-size:12px;color:var(--t2)">{pr.modeLabel}</span>
        </div>
        <div
          style="display:flex;flex-direction:column;gap:2px;border-left:2px solid {verdictBorder};padding-left:11px;margin-top:3px"
        >
          <span style="font-size:13px;font-weight:500;color:{verdictColor}"
            >{pr.achievable
              ? `Achievable in ${pr.yearsToGoal} years`
              : `Not achievable by ${pr.byYear}`}</span
          >
          <span style="font-size:12px;color:var(--t2)">{verdictSub}</span>
        </div>
      </div>
    </div>

    <div>
      <div style="position:relative">
        <svg viewBox="0 0 624 148" style="width:100%;height:auto;display:block">
          {#each grid as g (g.y)}
            <line
              x1="40"
              y1={g.y}
              x2="612"
              y2={g.y}
              stroke="var(--line)"
              stroke-width="1"
              stroke-dasharray="3 4"
            />
          {/each}
          <line
            x1="40"
            y1={gy(pr.goal).toFixed(1)}
            x2="612"
            y2={gy(pr.goal).toFixed(1)}
            stroke="var(--t3)"
            stroke-width="1.2"
            stroke-dasharray="5 4"
          />
          <polyline
            points={safePoints}
            fill="none"
            stroke="var(--grey-series)"
            stroke-width="1.6"
            stroke-dasharray="4 3"
            stroke-linejoin="round"
          />
          <polyline
            points={portPoints}
            fill="none"
            stroke="var(--accent)"
            stroke-width="2"
            stroke-linejoin="round"
          />
          {#each marks as m (m.label)}
            <rect x={m.x} y={m.y} width="7" height="7" fill="var(--card)" stroke={m.color} stroke-width="2" />
          {/each}
          <text x="608" y="26" text-anchor="end" font-size="10" font-weight="500" fill="var(--accent)"
            >Portfolio</text
          >
          <text
            x="608"
            y={(gy(pr.S[pr.span]) - 7).toFixed(1)}
            text-anchor="end"
            font-size="10"
            fill="var(--t3)">{pr.altLabel}</text
          >
        </svg>

        {#each grid as g (g.y)}
          <span
            style="position:absolute;left:0;top:{g.top};width:5.2%;transform:translateY(-50%);text-align:right;font-size:10px;color:var(--t3);pointer-events:none"
            >{g.label}</span
          >
        {/each}
        {#each marks as m (m.label)}
          <span
            style="position:absolute;left:{m.lpos};top:{m.ltop};transform:translateX(-50%);font-size:10px;font-weight:500;color:{m.color};pointer-events:none"
            >{m.label}</span
          >
        {/each}
        <span
          style="position:absolute;left:7%;top:{(((gy(pr.goal) - 13) / VB.h) * 100).toFixed(
            2
          )}%;font-size:10px;font-weight:500;color:var(--t2);pointer-events:none"
          >Goal {fmt.k(pr.target)}</span
        >
      </div>

      <div style="position:relative;height:14px;margin-top:3px">
        {#each xLabels as x (x.label)}
          <span
            style="position:absolute;left:{x.lpos};top:0;transform:translateX(-50%);font-size:10px;color:var(--t3)"
            >{x.label}</span
          >
        {/each}
      </div>
    </div>
  </div>
</div>
