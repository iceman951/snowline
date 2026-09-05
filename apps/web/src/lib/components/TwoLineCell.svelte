<!-- TwoLineCell — port of the bundle's TwoLineCell.dc.html. -->
<script lang="ts">
  type Tone = 'plain' | 'pos' | 'neg';

  let {
    primary = '—',
    secondary = '',
    tone = 'plain' as Tone,
    secondaryTone = 'plain' as Tone,
    align = 'left' as 'left' | 'right'
  } = $props();

  const primaryColor = $derived(
    tone === 'pos' ? 'var(--accent)' : tone === 'neg' ? 'var(--neg)' : 'var(--t1)'
  );
  const secondaryColor = $derived(
    secondaryTone === 'pos' ? 'var(--accent)' : secondaryTone === 'neg' ? 'var(--neg)' : 'var(--t2)'
  );
</script>

<div
  style="display:flex;flex-direction:column;gap:2px;min-width:0;max-width:100%;align-items:{align ===
  'right'
    ? 'flex-end'
    : 'flex-start'}"
>
  <span
    style="font-size:13px;font-weight:500;line-height:1.35;color:{primaryColor};white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis"
    >{primary}</span
  >
  <span
    style="font-size:12px;line-height:1.35;color:{secondaryColor};white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis"
    >{secondary}</span
  >
</div>
