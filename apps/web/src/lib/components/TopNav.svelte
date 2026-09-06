<!--
  TopNav — port of the bundle's TopNav.dc.html.
  Sticky 56px header: brand, section pills with dropdowns, insights, add,
  holdings search, portfolio pill, and the account menu that owns the theme.
-->
<script lang="ts">
  import {
    ANALYTICS_ROWS,
    ICONS,
    PORTFOLIO_ROWS,
    TAB_ROWS,
    TOOLS_ROWS,
    type InsightItem,
    type NavRow,
    type SearchItem,
    type Section
  } from '$lib/nav';

  let {
    active = 'Dashboard' as Section,
    subActive = '',
    portfolioName = '',
    holdingsCount = 0,
    searchItems = [] as SearchItem[],
    insights = [] as InsightItem[],
    accountSub = ''
  } = $props();

  let menu = $state<string | null>(null);
  let searchOpen = $state(false);
  let query = $state('');
  let theme = $state<'light' | 'dark'>('light');

  $effect(() => {
    const stored = document.documentElement.getAttribute('data-theme');
    theme = stored === 'dark' ? 'dark' : 'light';
  });

  function setTheme(next: 'light' | 'dark') {
    theme = next;
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('snowline.theme', next);
    } catch {
      /* private mode — the choice just does not persist */
    }
  }

  const toggle = (key: string) => (e: MouseEvent) => {
    e.stopPropagation();
    menu = menu === key ? null : key;
  };

  const pillBg = (name: Section) => (active === name ? 'var(--accent-soft)' : 'transparent');
  const pillFg = (name: Section) => (active === name ? 'var(--accent)' : 'var(--t2)');

  const results = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchItems
      .filter((p) => `${p.ticker} ${p.name} ${p.sector}`.toLowerCase().includes(q))
      .slice(0, 6);
  });

  const menus: Array<{ key: string; label: Section; rows: NavRow[]; width: number }> = [
    { key: 'analytics', label: 'Analytics', rows: ANALYTICS_ROWS, width: 250 },
    { key: 'portfolio', label: 'Portfolio', rows: PORTFOLIO_ROWS, width: 250 },
    { key: 'tools', label: 'Tools', rows: TOOLS_ROWS, width: 262 }
  ];

  const addRows: NavRow[] = [
    { group: 'Transaction' },
    { label: 'Buy / Sell', d: ICONS.plus, href: '/portfolio/transactions' },
    { label: 'Dividend', d: ICONS.coins, href: '/portfolio/dividend-calendar' },
    { sep: true },
    { group: 'Portfolio' },
    { label: 'Import CSV', d: ICONS.upload, href: '/portfolio/transactions' },
    { label: 'New category', d: ICONS.tag, href: '/portfolio/categories' }
  ];
</script>

<svelte:window
  onclick={() => {
    menu = null;
    if (!query) searchOpen = false;
  }}
/>

<header
  style="position:sticky;top:0;z-index:60;height:56px;background:var(--card);border-bottom:1px solid var(--line)"
>
  <div
    data-r="navwrap"
    style="height:56px;max-width:1392px;margin:0 auto;padding:0 24px;display:flex;align-items:center;gap:6px"
  >
    <a
      href="/"
      style="display:flex;align-items:center;gap:9px;text-decoration:none;margin-right:10px;flex:none"
    >
      <span
        style="width:26px;height:26px;border-radius:6px;background:var(--accent);color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;letter-spacing:-0.02em"
        >S</span
      >
      <span style="font-size:15px;font-weight:600;color:var(--t1);letter-spacing:-0.015em"
        >Snowline</span
      >
    </a>

    <button
      data-r="navm"
      onclick={toggle('mobile')}
      aria-label="Menu"
      class="icon-btn"
      style="display:none;width:32px;height:32px"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg
      >
    </button>

    <nav data-r="navd" style="display:flex;align-items:center;gap:2px">
      <a
        href="/"
        style="display:flex;align-items:center;height:32px;padding:0 12px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;background:{pillBg(
          'Dashboard'
        )};color:{pillFg('Dashboard')}">Dashboard</a
      >

      {#each menus as m (m.key)}
        <div style="position:relative">
          <button
            onclick={toggle(m.key)}
            style="display:flex;align-items:center;gap:5px;height:32px;padding:0 11px;border:none;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;background:{pillBg(
              m.label
            )};color:{pillFg(m.label)}"
          >
            {m.label}
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg
            >
          </button>
          {#if menu === m.key}
            <div
              role="menu"
              tabindex="-1"
              onclick={(e) => e.stopPropagation()}
              onkeydown={() => {}}
              style="position:absolute;top:38px;left:0;z-index:70;width:{m.width}px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;animation:menuIn .12s ease-out"
            >
              {#each m.rows as r, i (r.label ?? `sep-${i}`)}
                {#if r.sep}
                  <div style="height:1px;background:var(--line);margin:6px 4px"></div>
                {:else}
                  <a
                    href={r.href}
                    style="display:flex;align-items:center;justify-content:space-between;gap:11px;height:44px;padding:0 10px;border-radius:6px;text-decoration:none;color:var(--t1);font-size:13px;background:{r.label ===
                    subActive
                      ? 'var(--accent-soft)'
                      : 'transparent'}"
                  >
                    <span style="display:flex;align-items:center;gap:11px">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--t3)"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"><path d={r.d} /></svg
                      >
                      <span>{r.label}</span>
                    </span>
                    <span
                      style="font-size:12px;color:var(--accent);opacity:{r.label === subActive
                        ? 1
                        : 0}">✓</span
                    >
                  </a>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </nav>

    <div style="flex:1"></div>

    <div style="display:flex;align-items:center;gap:6px">
      <!-- insights -->
      <div style="position:relative">
        <button onclick={toggle('insights')} title="Insights" class="icon-btn" style="width:32px;height:32px">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"><path d="M3 12h4l3-7 4 14 3-7h4" /></svg
          >
        </button>
        {#if menu === 'insights'}
          <div
            role="menu"
            tabindex="-1"
            onclick={(e) => e.stopPropagation()}
            onkeydown={() => {}}
            style="position:absolute;top:38px;right:0;z-index:70;width:300px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:14px;animation:menuIn .12s ease-out;display:flex;flex-direction:column;gap:12px"
          >
            <span style="font-size:12px;font-weight:500;color:var(--t2)"
              >{insights.length} insights · {holdingsCount} holdings</span
            >
            {#each insights as i (i.title)}
              <div
                style="display:flex;flex-direction:column;gap:3px;border-left:2px solid var(--amber);padding-left:10px"
              >
                <span style="font-size:13px;font-weight:500;color:var(--t1)">{i.title}</span>
                <span style="font-size:11px;color:var(--t3);line-height:1.45">{i.short}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- add -->
      <div style="position:relative">
        <button
          onclick={toggle('add')}
          style="display:flex;align-items:center;gap:6px;height:32px;padding:0 14px;border:none;border-radius:999px;background:var(--accent);color:var(--on-accent);font-size:13px;font-weight:500;cursor:pointer"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg
          >
          Add
        </button>
        {#if menu === 'add'}
          <div
            role="menu"
            tabindex="-1"
            onclick={(e) => e.stopPropagation()}
            onkeydown={() => {}}
            style="position:absolute;top:38px;right:0;z-index:70;width:262px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;animation:menuIn .12s ease-out"
          >
            {#each addRows as r, i (r.label ?? r.group ?? `sep-${i}`)}
              {#if r.group}
                <div
                  style="padding:8px 10px 4px;font-size:11px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--t3)"
                >
                  {r.group}
                </div>
              {:else if r.sep}
                <div style="height:1px;background:var(--line);margin:6px 4px"></div>
              {:else}
                <a
                  href={r.href}
                  style="display:flex;align-items:center;gap:11px;height:44px;padding:0 10px;border-radius:6px;text-decoration:none;color:var(--t1);font-size:13px"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--t3)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"><path d={r.d} /></svg
                  >
                  <span>{r.label}</span>
                </a>
              {/if}
            {/each}
          </div>
        {/if}
      </div>

      <!-- search -->
      <div style="position:relative">
        {#if searchOpen}
          <!-- svelte-ignore a11y_autofocus -->
          <input
            bind:value={query}
            onclick={(e) => e.stopPropagation()}
            placeholder="Search holdings…"
            autofocus
            style="height:32px;width:210px;padding:0 11px;border:1px solid var(--accent);border-radius:6px;background:var(--canvas);color:var(--t1);font-size:13px;outline:none"
          />
        {/if}
        {#if searchOpen && query.trim() && results.length}
          <div
            role="menu"
            tabindex="-1"
            onclick={(e) => e.stopPropagation()}
            onkeydown={() => {}}
            style="position:absolute;top:38px;right:0;z-index:70;width:284px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;animation:menuIn .12s ease-out"
          >
            {#each results as r (r.ticker)}
              <a
                href={r.href}
                style="display:flex;align-items:center;gap:10px;height:44px;padding:0 10px;border-radius:6px;text-decoration:none"
              >
                <span class="mono-badge" style="width:26px;height:26px;font-size:9.5px">{r.mono}</span
                >
                <span style="display:flex;flex-direction:column;gap:1px;min-width:0;flex:1">
                  <span style="font-size:13px;font-weight:500;color:var(--t1)">{r.ticker}</span>
                  <span
                    style="font-size:11px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                    >{r.name}</span
                  >
                </span>
                <span style="font-size:12px;color:var(--t2);white-space:nowrap">{r.value}</span>
              </a>
            {/each}
          </div>
        {:else if searchOpen && query.trim()}
          <div
            style="position:absolute;top:38px;right:0;z-index:70;width:284px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:13px;font-size:12px;color:var(--t3);animation:menuIn .12s ease-out"
          >
            No holding matches “{query.trim()}”.
          </div>
        {/if}
      </div>
      <button
        onclick={(e) => {
          e.stopPropagation();
          searchOpen = !searchOpen;
          if (!searchOpen) query = '';
        }}
        title="Search holdings"
        style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:none;border-radius:6px;background:transparent;color:var(--t2);cursor:pointer"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M16.6 16.6L21 21" /></svg
        >
      </button>

      <div style="width:1px;height:22px;background:var(--line);margin:0 3px"></div>

      <span
        class="portfolio-pill"
        style="display:flex;align-items:center;gap:7px;height:32px;padding:0 10px;border:1px solid var(--line);border-radius:6px;color:var(--t1);font-size:13px;font-weight:500;white-space:nowrap"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.6"
          ><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2" /></svg
        >
        {portfolioName}
      </span>

      <!-- account -->
      <div style="position:relative">
        <button
          onclick={toggle('avatar')}
          style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:1px solid var(--line);background:var(--hover);color:var(--t2);font-size:11px;font-weight:600;cursor:pointer;letter-spacing:.02em"
          >AK</button
        >
        {#if menu === 'avatar'}
          <div
            role="menu"
            tabindex="-1"
            onclick={(e) => e.stopPropagation()}
            onkeydown={() => {}}
            style="position:absolute;top:38px;right:0;z-index:70;width:250px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:6px;animation:menuIn .12s ease-out"
          >
            <div style="padding:8px 10px 10px;display:flex;flex-direction:column;gap:1px">
              <span style="font-size:13px;font-weight:500;color:var(--t1)">Anna Keller</span>
              <span style="font-size:11px;color:var(--t3)">{accountSub}</span>
            </div>
            <div style="height:1px;background:var(--line);margin:2px 4px 8px"></div>
            <div style="padding:0 10px 10px;display:flex;flex-direction:column;gap:7px">
              <span
                style="font-size:11px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--t3)"
                >Theme</span
              >
              <div style="display:flex;padding:2px;border:1px solid var(--line);border-radius:7px;gap:2px">
                {#each ['light', 'dark'] as const as t (t)}
                  <button
                    onclick={() => setTheme(t)}
                    style="flex:1;height:28px;border:none;border-radius:5px;font-size:12px;font-weight:500;cursor:pointer;text-transform:capitalize;background:{theme ===
                    t
                      ? 'var(--accent-soft)'
                      : 'transparent'};color:{theme === t ? 'var(--accent)' : 'var(--t2)'}"
                    >{t}</button
                  >
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if menu === 'mobile'}
    <div
      role="menu"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={() => {}}
      style="position:absolute;top:56px;left:0;right:0;z-index:70;background:var(--card);border-bottom:1px solid var(--line);box-shadow:var(--shadow);padding:8px 16px 14px;display:flex;flex-direction:column;gap:2px"
    >
      {#each [...ANALYTICS_ROWS, ...PORTFOLIO_ROWS, ...TOOLS_ROWS].filter((r) => r.label) as r (r.href)}
        <a
          href={r.href}
          style="display:flex;align-items:center;gap:11px;height:44px;padding:0 6px;border-radius:6px;text-decoration:none;color:var(--t1);font-size:14px"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"><path d={r.d} /></svg
          >
          <span>{r.label}</span>
        </a>
      {/each}
    </div>
  {/if}
</header>

<!-- mobile tab bar -->
<div
  data-r="tabbar"
  style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:60;height:60px;background:var(--card);border-top:1px solid var(--line);align-items:stretch;padding:0 4px"
>
  {#each TAB_ROWS as t (t.label)}
    <a
      href={t.href}
      style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-decoration:none;color:{active ===
      t.section
        ? 'var(--accent)'
        : 'var(--t3)'}"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"><path d={t.d} /></svg
      >
      <span style="font-size:10px;font-weight:500">{t.label}</span>
    </a>
  {/each}
</div>

<style>
  @media (max-width: 960px) { [data-r="navm"] { display:flex!important; } }
  @media (max-width: 620px) { .portfolio-pill, button[title="Insights"] { display:none!important; } }
</style>
