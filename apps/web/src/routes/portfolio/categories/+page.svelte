<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { fmt, type Category } from '@snowline/core';
  import TopNav from '$lib/components/TopNav.svelte';
  import TwoLineCell from '$lib/components/TwoLineCell.svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  const editor = $derived(data.editor);
  const cats = $derived(editor.categories);
  const byValue = $derived([...cats].sort((a, b) => b.value - a.value));
  let selected = $state('');
  let allHoldings = $state(false);
  let rename = $state('');
  let newOpen = $state(false);
  let busy = $state(false);
  let deleting = $state<Category | null>(null);
  let destination = $state('');
  let dialog: HTMLDialogElement;
  const current = $derived(cats.find((c) => c.name === selected) ?? cats[0]);
  const rows = $derived(editor.holdings.filter((h) => allHoldings || h.categoryName === current?.name).sort((a, b) => b.p.value - a.p.value));
  const sumOff = $derived(Math.abs(editor.targetTotal - 100) > 0.005);
  const colors = ['var(--accent)', 'var(--accent-2)', 'var(--accent-3)', 'var(--accent-4)', 'var(--grey-series)', 'var(--t3)', 'var(--track)'];
  const color = (name: string) => colors[Math.min(Math.max(0, byValue.findIndex((c) => c.name === name)), colors.length - 1)];
  const pp = (v: number) => `${v >= 0 ? '▲' : '▼'}${fmt.num(Math.abs(v))}pp`;
  const driftTone = (v: number) => Math.abs(v) <= 1 ? 'pos' : Math.abs(v) <= 5 ? 'plain' : 'neg';
  const barWidth = (c: Category) => Math.min(100, c.allocN / Math.max(1, c.allocN, c.targetN) * 100);
  const tickPosition = (c: Category) => Math.min(99, c.targetN / Math.max(1, c.allocN, c.targetN) * 100);
  const searchItems = $derived(editor.holdings.map(({ p }) => ({ ...p, value: fmt.money(p.value), href: `/portfolio/holdings#${p.ticker}` })));

  $effect(() => { rename = current?.name ?? ''; });
  $effect(() => {
    if (form?.success && form.selected) { selected = form.selected; allHoldings = false; }
  });

  const save: SubmitFunction = ({ cancel }) => {
    if (busy) { cancel(); return; }
    busy = true;
    return async ({ result, update }) => {
      try {
        await update({ reset: false });
        if (result.type === 'success') {
          newOpen = false;
          dialog?.close();
          deleting = null;
        }
      } finally { busy = false; }
    };
  };

  function select(name: string) { selected = name; allHoldings = false; }
  function confirmDelete(category: Category) {
    deleting = category;
    destination = cats.find((c) => c.name !== category.name)?.name ?? '';
    dialog.showModal();
  }
</script>

<svelte:head><title>Categories · Snowline</title><meta name="description" content="Organize your holdings and set category target weights." /></svelte:head>

<TopNav active="Portfolio" subActive="Categories" portfolioName={editor.constants.portfolioName} holdingsCount={editor.totals.holdings} {searchItems} />

<main data-r="main" class="categories-page" aria-busy={busy}>
  <header class="page-heading">
    <div>
      <div class="heading-line"><h1>Categories</h1><span class="help" title="Categories are yours, not GICS sectors. Their assignments, target weights and order are shared by every screen.">?</span><span class="muted portfolio-name">{editor.constants.portfolioName}</span></div>
      <p class="muted head-note">{cats.length} categories · {editor.totals.holdings} holdings · targets sum to {fmt.pct(editor.targetTotal)} · changes are shared across your portfolio</p>
    </div>
    <div class="heading-actions">
      <details class="popover" bind:open={newOpen}>
        <summary class="primary">＋ New category</summary>
        <form method="POST" action="?/edit" use:enhance={save} class="menu new-category">
          <input type="hidden" name="kind" value="create" />
          <label for="new-name">New category</label>
          <input id="new-name" name="name" placeholder="e.g. Speculative" required />
          <div class="inline"><label for="new-target">Target weight</label><div class="percent"><input id="new-target" name="target" type="number" value="5" min="0" step="0.01" required /><span>%</span></div></div>
          <button class="primary" disabled={busy}>Create category</button>
        </form>
      </details>
      <details class="popover">
        <summary class="more" aria-label="More category actions">•••</summary>
        <div class="menu more-menu">
          <form method="POST" action="?/edit" use:enhance={save}><input type="hidden" name="kind" value="normalise" /><button disabled={busy || editor.targetTotal === 0}>Scale targets to 100%</button></form>
          <form method="POST" action="?/edit" use:enhance={save}><input type="hidden" name="kind" value="reset" /><button disabled={busy}>Reset to the seeded categories</button></form>
          <a href="/">Open the dashboard allocation</a>
        </div>
      </details>
    </div>
  </header>

  {#if form?.error}<p class="notice error" role="alert">{form.error}</p>{/if}
  <div class="save-status" aria-live="polite">{busy ? 'Saving…' : form?.success ? form.message : ''}</div>

  <section class="card allocation" aria-label="Current allocation">
    <div class="inline wrap"><span class="section-label">Current allocation</span><div class="inline wrap allocation-actions">
      <span class:off={sumOff} class="sum-label">{sumOff ? `Targets sum to ${fmt.pct(editor.targetTotal)} · ${fmt.num(Math.abs(editor.targetTotal - 100))}pp ${editor.targetTotal > 100 ? 'over' : 'under'}` : 'Targets sum to 100%'}</span>
      {#if sumOff}<form method="POST" action="?/edit" use:enhance={save}><input type="hidden" name="kind" value="normalise" /><button class="scale" disabled={busy || editor.targetTotal === 0}>Scale targets to 100%</button></form>{/if}
    </div></div>
    <div class="allocation-bar">{#each byValue.filter((c) => c.value > 0) as c (c.name)}<button style:width={`${c.allocN}%`} style:background={color(c.name)} title={`${c.name}: ${fmt.pct(c.allocN)}`} aria-label={`Select ${c.name}`} onclick={() => select(c.name)}></button>{/each}</div>
    <div class="legend">{#each byValue.filter((c) => c.value > 0) as c (c.name)}<button onclick={() => select(c.name)}><span class="dot" style:background={color(c.name)}></span>{c.name}<span class="muted">{fmt.pct(c.allocN, 1)}</span></button>{/each}</div>
  </section>

  <div class="two-panels">
    <section class="card category-table" aria-label="Category targets">
      <div class="table-scroll"><table>
        <thead><tr><th>Category</th><th class="numeric">Value</th><th>Current</th><th class="numeric">Target</th><th class="numeric">Drift</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>{#each cats as c, i (c.name)}
          <tr class:selected={current?.name === c.name}>
            <th scope="row"><button class="category-select" onclick={() => select(c.name)} aria-pressed={current?.name === c.name}><span class="dot" style:background={color(c.name)}></span><span class="category-label"><TwoLineCell primary={c.name} secondary={c.count ? `${c.count} holding${c.count === 1 ? '' : 's'} · ${c.tickers.slice(0, 2).join(', ')}${c.count > 2 ? ` +${c.count - 2}` : ''}` : 'no holdings'} align="left" /></span></button></th>
            <td><TwoLineCell primary={fmt.money(c.value)} secondary={`${fmt.money(c.invested)} invested`} align="right" /></td>
            <td><div class="weights"><span>{fmt.pct(c.allocN)}</span><span class="muted">of {fmt.pct(c.targetN)}</span></div><div class="weight-track"><span style:width={`${barWidth(c)}%`} style:background={color(c.name)}></span><i style:left={`${tickPosition(c)}%`}></i></div></td>
            <td><form method="POST" action="?/edit" use:enhance={save} class="target-form"><input type="hidden" name="kind" value="target" /><input type="hidden" name="name" value={c.name} /><div class="percent"><input aria-label={`${c.name} target weight`} name="target" type="number" min="0" max="100" step="0.01" value={c.targetN} required onchange={(event) => event.currentTarget.form?.requestSubmit()} /><span>%</span></div><button class="save-target" disabled={busy} aria-label={`Save ${c.name} target`} title="Save target">✓</button></form></td>
            <td><TwoLineCell primary={pp(c.driftN)} secondary={`${c.deltaValue >= 0 ? 'buy' : 'sell'} ${fmt.money(Math.abs(c.deltaValue))}`} tone={driftTone(c.driftN)} align="right" /></td>
            <td><div class="row-actions"><form method="POST" action="?/edit" use:enhance={save}><input type="hidden" name="kind" value="move" /><input type="hidden" name="name" value={c.name} /><button name="delta" value="-1" disabled={busy || i === 0} aria-label={`Move ${c.name} up`} title="Move up">↑</button><button name="delta" value="1" disabled={busy || i === cats.length - 1} aria-label={`Move ${c.name} down`} title="Move down">↓</button></form><button onclick={() => confirmDelete(c)} disabled={busy || cats.length < 2} aria-label={`Delete ${c.name}`} title="Delete category">×</button></div></td>
          </tr>
        {/each}</tbody>
        <tfoot><tr><th><TwoLineCell primary="Total" secondary={`${editor.totals.holdings} holdings · ${cats.length} buckets`} align="left" /></th><td><TwoLineCell primary={fmt.money(editor.totals.value)} secondary={`${fmt.money(editor.totals.invested)} invested`} align="right" /></td><td>100.00%</td><td class="numeric">{fmt.pct(editor.targetTotal)}</td><td class="numeric">{sumOff ? `${fmt.num(Math.abs(editor.targetTotal - 100))}pp ${editor.targetTotal > 100 ? 'over' : 'under'}` : 'balanced'}</td><td></td></tr></tfoot>
      </table></div>
    </section>

    {#if current}<section class="card holding-panel" aria-label="Category holdings">
      <div class="panel-head"><div class="view-switch"><button class:active={!allHoldings} onclick={() => allHoldings = false}>{current.name}</button><button class:active={allHoldings} onclick={() => allHoldings = true}>All holdings</button></div>
        {#if !allHoldings}
          <form method="POST" action="?/edit" use:enhance={save} class="rename-form"><input type="hidden" name="kind" value="rename" /><input type="hidden" name="name" value={current.name} /><input name="to" aria-label="Category name" bind:value={rename} required /><button disabled={busy || rename.trim() === current.name}>Rename</button></form>
          <div class="panel-value"><strong>{fmt.money(current.value)}</strong><span>{fmt.pct(current.allocN)} of the portfolio</span><span class="muted">target {fmt.pct(current.targetN)} · {pp(current.driftN)}</span></div>
          <p class="muted">{current.count === 0 ? `Empty bucket. Its ${fmt.pct(current.targetN)} target still counts towards the plan.` : `${current.count} holding${current.count === 1 ? '' : 's'} · ${fmt.money(current.income)} of income a year at ${fmt.pct(current.yieldPct)} · ${fmt.money(Math.abs(current.deltaValue))} ${current.deltaValue >= 0 ? 'under' : 'over'} target`}</p>
        {:else}<div><strong>All holdings</strong><p class="muted">{editor.totals.holdings} holdings across {cats.length} categories. A holding belongs to exactly one.</p></div>{/if}
      </div>
      {#each rows as h (h.p.ticker)}<div class="holding-row"><a href={`/portfolio/holdings#${h.p.ticker}`} class="holding-name"><span class="mono-badge">{h.p.mono}</span><span class="holding-text"><TwoLineCell primary={h.p.ticker} secondary={h.p.name} align="left" /></span></a><div class="holding-value"><TwoLineCell primary={fmt.money(h.p.value)} secondary={allHoldings ? h.categoryName : `${fmt.pct(h.shareOfCategory, 1)} of category`} align="right" /></div><form method="POST" action="?/edit" use:enhance={save} class="move-holding"><input type="hidden" name="kind" value="assign" /><input type="hidden" name="ticker" value={h.p.ticker} /><select name="name" aria-label={`Category for ${h.p.ticker}`} value={h.categoryName} disabled={busy} onchange={(event) => event.currentTarget.form?.requestSubmit()}>{#each cats as c (c.name)}<option value={c.name}>{c.name}</option>{/each}</select><button class="save-target" disabled={busy} aria-label={`Save category for ${h.p.ticker}`}>✓</button></form></div>{/each}
      {#if rows.length === 0}<div class="empty"><strong>No holdings in {current.name}</strong><p class="muted">Move one in from another category, or give this bucket a 0% target.</p></div>{/if}
      {#if !allHoldings}<div class="panel-footer"><span class="muted">Deleting moves its holdings, never drops them</span><button onclick={() => confirmDelete(current)} disabled={busy || cats.length < 2}>Delete category</button></div>{/if}
    </section>{/if}
  </div>
  <p class="footnote muted">One model behind every category figure in the app: {cats.length} buckets holding {editor.totals.holdings} positions, targets summing to {fmt.pct(editor.targetTotal)}. Seeded from each holding’s GICS sector and the original target plan, then owned here.</p>
</main>

<dialog bind:this={dialog} onclose={() => deleting = null} aria-labelledby="delete-title">
  {#if deleting}<form method="POST" action="?/edit" use:enhance={save} class="delete-form"><input type="hidden" name="kind" value="delete" /><input type="hidden" name="name" value={deleting.name} /><h2 id="delete-title">Delete “{deleting.name}”?</h2><p>Its {deleting.count} holdings and {fmt.pct(deleting.targetN)} target will move to the category you pick below. Nothing is sold and no holding is lost.</p><label for="delete-destination">Move its holdings to</label><select id="delete-destination" name="moveTo" bind:value={destination} required>{#each cats.filter((c) => c.name !== deleting?.name) as c (c.name)}<option value={c.name}>{c.name} · {fmt.pct(c.targetN)} target</option>{/each}</select>{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}<div class="dialog-actions"><button type="button" onclick={() => dialog.close()} disabled={busy}>Cancel</button><button class="primary" disabled={busy || !destination}>Delete category</button></div></form>{/if}
</dialog>

<style>
  .categories-page { --track: #e4e1df; max-width:1392px; margin:0 auto; padding:24px 24px 88px; display:flex; flex-direction:column; gap:18px; }
  :global(html[data-theme='dark']) .categories-page { --track:#3a3431; }
  h1 { margin:0; font-size:32px; font-weight:600; letter-spacing:-.028em; line-height:1.1; }
  p { margin:0; } .muted { color:var(--t3); } .page-heading,.heading-line,.heading-actions,.inline,.row-actions,.target-form,.rename-form,.holding-row,.holding-name,.move-holding,.panel-footer,.dialog-actions { display:flex; align-items:center; gap:8px; }
  .page-heading { justify-content:space-between; align-items:flex-start; gap:18px; flex-wrap:wrap; } .heading-line { gap:8px; } .portfolio-name { font-size:13px; padding-top:6px; } .help { width:16px; height:16px; display:grid; place-items:center; border:1px solid var(--line); border-radius:50%; font-size:10px; color:var(--t3); cursor:help; } .head-note { font-size:12px; margin-top:5px; }
  button,input,select,summary { font:inherit; } button,summary { cursor:pointer; } button { height:32px; padding:0 12px; border:1px solid var(--line); border-radius:7px; background:transparent; color:var(--t2); font-size:12px; white-space:nowrap; } button:hover,summary:hover { background:var(--hover); } button:disabled { opacity:.4; cursor:default; } input,select { min-width:0; height:34px; padding:0 11px; border:1px solid var(--line); border-radius:7px; background:var(--canvas); color:var(--t1); font-size:13px; } input:focus-visible,select:focus-visible,button:focus-visible,summary:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
  .primary { display:inline-flex; align-items:center; justify-content:center; height:32px; padding:0 14px; border:0; border-radius:999px; background:var(--accent); color:var(--on-accent); font-size:12.5px; font-weight:500; } .primary:hover { background:var(--accent); opacity:.9; }
  .popover { position:relative; } summary { list-style:none; } summary::-webkit-details-marker { display:none; } .more { display:grid; place-items:center; width:32px; height:32px; border:1px solid var(--line); border-radius:7px; color:var(--t2); } .menu { position:absolute; right:0; top:38px; z-index:50; background:var(--card); border:1px solid var(--line); border-radius:8px; box-shadow:var(--shadow); animation:menuIn .12s ease-out; } .new-category { width:268px; padding:14px; display:flex; flex-direction:column; gap:11px; } label { font-size:12px; color:var(--t2); } .inline { justify-content:space-between; } .wrap { flex-wrap:wrap; } .more-menu { min-width:238px; padding:6px; } .more-menu button,.more-menu a { width:100%; display:block; height:auto; padding:8px 10px; border:0; text-align:left; color:var(--t1); font-size:12.5px; } .more-menu a:hover { background:var(--hover); text-decoration:none; }
  .percent { display:flex; align-items:center; width:80px; border:1px solid var(--line); border-radius:7px; background:var(--card); overflow:hidden; } .percent input { width:100%; padding:0 2px 0 7px; border:0; height:30px; background:transparent; text-align:right; appearance:textfield; } .percent input::-webkit-inner-spin-button { appearance:none; } .percent span { padding:0 7px 0 2px; color:var(--t3); font-size:12px; } .save-target { padding:0 3px; width:20px; border:0; color:var(--accent); } .save-status { font-size:12px; color:var(--accent); } .save-status:empty { display:none; } .notice { padding:10px 14px; border:1px solid var(--line); border-radius:8px; font-size:12px; } .error { color:var(--neg); }
  .allocation { padding:18px 20px; display:flex; flex-direction:column; gap:13px; } .section-label { font-size:12px; font-weight:500; color:var(--t2); } .allocation-actions { gap:10px; } .sum-label { font-size:12px; font-weight:500; padding:4px 11px; border-radius:999px; background:var(--accent-soft); color:var(--accent); } .sum-label.off { background:var(--tag-bg); color:var(--tag-fg); } .scale { height:26px; border-radius:999px; color:var(--t1); } .allocation-bar { height:14px; display:flex; gap:2px; border-radius:3px; overflow:hidden; } .allocation-bar button { height:14px; min-width:0; padding:0; border:0; border-radius:0; } .legend { display:flex; flex-wrap:wrap; gap:14px; } .legend button { display:flex; align-items:center; gap:6px; height:auto; padding:0; border:0; font-size:11.5px; } .dot { width:9px; height:9px; border-radius:2px; flex:none; display:inline-block; }
  .two-panels { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(340px,1fr); gap:18px; align-items:start; } .category-table { overflow:hidden; } .table-scroll { max-width:100%; overflow-x:auto; overscroll-behavior-x:contain; } table { width:100%; min-width:810px; border-collapse:collapse; table-layout:auto; } th,td { border-bottom:1px solid var(--line); padding:11px 13px; text-align:left; } thead th { font-size:12px; font-weight:500; color:var(--t2); padding:10px 13px; } th:first-child { min-width:170px; } td:nth-child(3) { min-width:160px; } .numeric { text-align:right; } tr.selected { background:var(--accent-soft); } tbody tr:hover { background:var(--hover); } .category-select { display:flex; align-items:center; gap:9px; height:auto; padding:0; border:0; text-align:left; width:100%; white-space:normal; } .category-label { min-width:0; } .weights { display:flex; justify-content:space-between; gap:8px; font-size:13px; white-space:nowrap; } .weights .muted { font-size:12px; } .weight-track { position:relative; height:5px; border-radius:3px; background:var(--track); margin-top:5px; } .weight-track span { position:absolute; inset:0 auto 0 0; border-radius:3px; } .weight-track i { position:absolute; top:-3px; bottom:-3px; width:2px; border-radius:1px; background:var(--t2); } .target-form { gap:0; } .row-actions { gap:1px; } .row-actions form { display:flex; } .row-actions button { width:24px; height:26px; padding:0; border:0; color:var(--t3); } tfoot { border-top:1px solid var(--t3); font-size:13px; font-weight:600; } tfoot th,tfoot td { border:0; padding:12px 13px; }
  .holding-panel { position:sticky; top:74px; overflow:hidden; } .panel-head { padding:18px 20px; display:flex; flex-direction:column; gap:12px; border-bottom:1px solid var(--line); } .view-switch { display:flex; padding:2px; gap:2px; border:1px solid var(--line); border-radius:8px; } .view-switch button { flex:1; min-width:0; height:28px; border:0; overflow:hidden; text-overflow:ellipsis; } .view-switch .active { background:var(--accent-soft); color:var(--accent); font-weight:600; } .rename-form input { flex:1; font-size:14px; font-weight:600; } .panel-value { display:flex; align-items:baseline; gap:9px; flex-wrap:wrap; font-size:13px; color:var(--t2); } .panel-value strong { font-size:24px; font-weight:600; letter-spacing:-.02em; color:var(--t1); } .panel-value .muted { font-size:12px; } .panel-head p { font-size:11.5px; line-height:1.5; } .holding-row { gap:12px; padding:10px 20px; border-bottom:1px solid var(--line); flex-wrap:wrap; } .holding-name { flex:1; min-width:100px; color:var(--t1); } .mono-badge { width:28px; height:28px; } .holding-text { min-width:0; max-width:170px; overflow:hidden; } .holding-text :global(.secondary) { overflow:hidden; text-overflow:ellipsis; } .holding-value { margin-left:auto; } .move-holding { gap:0; } .move-holding select { width:114px; height:30px; font-size:11.5px; padding:0 5px; } .panel-footer { padding:13px 20px; justify-content:space-between; flex-wrap:wrap; } .panel-footer .muted { font-size:11.5px; } .empty { padding:34px 20px; text-align:center; font-size:13px; border-bottom:1px solid var(--line); } .empty p { margin-top:7px; font-size:12px; } .footnote { max-width:900px; font-size:11px; line-height:1.55; }
  dialog { width:440px; max-width:calc(100% - 32px); padding:0; border:1px solid var(--line); border-radius:10px; background:var(--card); color:var(--t1); box-shadow:var(--shadow); } dialog::backdrop { background:rgba(12,12,12,.42); } .delete-form { padding:20px 22px; display:flex; flex-direction:column; gap:12px; } h2 { font-size:17px; font-weight:600; letter-spacing:-.015em; margin:0; } .delete-form p { font-size:12.5px; color:var(--t2); line-height:1.55; } .dialog-actions { justify-content:flex-end; margin-top:4px; } .sr-only { display:inline-block; width:1px; height:1px; padding:0; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
  @media(max-width:1320px) { .two-panels { grid-template-columns:minmax(0,1fr); } .holding-panel { position:static; } }
  @media(max-width:960px) { table { min-width:900px; } }
  @media(max-width:480px) { .new-category { position:fixed; top:130px; left:16px; right:16px; width:auto; } .panel-head,.holding-row,.panel-footer { padding-left:14px; padding-right:14px; } .holding-name { min-width:120px; } .move-holding { margin-left:auto; } }
</style>
