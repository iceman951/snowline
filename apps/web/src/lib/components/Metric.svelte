<!--
  Metric — port of the bundle's Metric.dc.html.
  A label with an optional help bubble, a primary figure with an optional
  delta, and a secondary line with an optional grey note.
-->
<script lang="ts">
  type Tone = 'plain' | 'pos' | 'neg';

  let {
    label = '',
    primary = '—',
    primaryTone = 'plain' as Tone,
    primaryDelta = '',
    deltaTone = undefined as Tone | undefined,
    secondary = '',
    secondaryTone = 'plain' as Tone,
    secondaryNote = '',
    tip = '',
    help = true,
    dotted = false,
    masked = false,
    size = 'kpi' as 'kpi' | 'mini'
  } = $props();

  let showTip = $state(false);

  const colorFor = (t: Tone | undefined) =>
    t === 'pos' ? 'var(--accent)' : t === 'neg' ? 'var(--neg)' : 'var(--t1)';

  const mini = $derived(size === 'mini');
  const showHelp = $derived(help !== false && !!tip);
  const deltaColor = $derived(
    (deltaTone ?? primaryTone ?? 'pos') === 'neg' ? 'var(--neg)' : 'var(--accent)'
  );
  const secondaryColor = $derived(
    secondaryTone === 'pos' ? 'var(--accent)' : secondaryTone === 'neg' ? 'var(--neg)' : 'var(--t2)'
  );
  const blur = $derived(masked ? 'blur(8px)' : 'none');
</script>

<div style="display:flex;flex-direction:column;gap:8px;min-width:0">
  <div style="display:flex;align-items:center;gap:5px;min-height:16px;position:relative">
    <span
      style="font-size:12px;font-weight:500;color:var(--t2);line-height:1.4;border-bottom:{dotted
        ? '1px dotted var(--t3)'
        : '1px solid transparent'}">{label}</span
    >
    {#if showHelp}
      <span
        role="note"
        onmouseenter={() => (showTip = true)}
        onmouseleave={() => (showTip = false)}
        style="width:13px;height:13px;flex:none;border:1px solid var(--line);border-radius:50%;font-size:9px;font-weight:500;color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:help"
        >?</span
      >
    {/if}
    {#if showTip && tip}
      <span
        style="position:absolute;top:20px;left:0;z-index:30;width:220px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:9px 11px;font-size:11px;line-height:1.5;color:var(--t2);pointer-events:none"
        >{tip}</span
      >
    {/if}
  </div>

  <div
    style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;filter:{blur};transition:filter .18s ease"
  >
    <span
      style="font-size:{mini
        ? '15px'
        : '24px'};font-weight:600;letter-spacing:-0.02em;line-height:1.05;color:{colorFor(
        primaryTone
      )}">{primary}</span
    >
    {#if primaryDelta}
      <span
        style="font-size:{mini
          ? '12px'
          : '13px'};font-weight:500;color:{deltaColor};line-height:1.2">{primaryDelta}</span
      >
    {/if}
  </div>

  <div
    style="display:flex;align-items:baseline;gap:5px;flex-wrap:wrap;filter:{blur};transition:filter .18s ease;min-height:17px"
  >
    <span style="font-size:12px;line-height:1.4;color:{secondaryColor}">{secondary}</span>
    {#if secondaryNote}
      <span style="font-size:12px;line-height:1.4;color:var(--t3)">{secondaryNote}</span>
    {/if}
  </div>
</div>
