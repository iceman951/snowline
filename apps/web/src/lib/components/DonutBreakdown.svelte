<script lang="ts">
  import { onMount } from "svelte";
  import Model from "$lib/presenters/DonutBreakdown";

  import { fmt } from "@snowline/core";
  let props: any = $props();
  const model = new Model({ fmt }, () => props);
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  onMount(() => { model.componentDidMount?.(); return () => model.componentWillUnmount?.(); });
</script>

<div style="background:var(--card);border:1px solid var(--line);border-radius:8px;display:flex;flex-direction:column">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 20px;border-bottom:1px solid var(--line);flex-wrap:wrap">
    <div style="display:flex;align-items:baseline;gap:10px;min-width:0">
      <span style="font-size:14px;font-weight:600;color:var(--t1)">{view.title}</span>
      <span style="font-size:12px;color:var(--t3)">{view.subtitle}</span>
    </div>
    <div style="display:flex;align-items:center;gap:14px">
      {#each view.toggles as t}
        <button onclick={t.onClick} style="display:flex;align-items:center;gap:7px;height:26px;padding:0 8px 0 6px;border:none;border-radius:6px;background:transparent;color:{t.color};font-size:12px;cursor:pointer" class="hover0">
          <span style="width:15px;height:15px;flex:none;border:1px solid {t.border};border-radius:4px;background:{t.bg};color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-size:10px">{t.mark}</span>
          {t.label}
        </button>
      {/each}
    </div>
  </div>

  <div data-r="split" style="display:grid;grid-template-columns:296px minmax(0,1fr);gap:24px;padding:20px">
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
      <div style="position:relative;width:100%;max-width:280px">
        <svg viewBox="0 0 280 280" style="width:100%;height:auto;display:block">
          <circle cx="140" cy="140" r="86" fill="none" stroke="var(--line)" stroke-width="22"></circle>
          {#each view.segs as s}
            <circle cx="140" cy="140" r="86" fill="none" stroke="{s.color}" stroke-width="{s.sw}" stroke-dasharray="{s.dash}" stroke-dashoffset="{s.offset}" opacity="{s.op}" transform="rotate(-90 140 140)" onmouseenter={s.onEnter} onmouseleave={s.onLeave} style="transition:opacity .15s ease,stroke-width .15s ease" role="button" tabindex="0" onfocus={s.onEnter} onclick={s.onEnter} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); s.onEnter(event); } }} onblur={s.onLeave}></circle>
          {/each}
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;pointer-events:none;padding:0 64px;text-align:center">
          <span style="font-size:18px;font-weight:600;letter-spacing:-0.02em;color:var(--t1)">{view.centerValue}</span>
          <span style="font-size:11px;color:var(--t2);line-height:1.3">{view.centerLabel}</span>
          <span style="font-size:11px;color:var(--t3)">{view.centerSub}</span>
        </div>
        {#each view.labels as l}
          <span style="position:absolute;left:{l.x};top:{l.y};transform:translate(-50%,-50%);font-size:10px;font-weight:500;color:{l.color};white-space:nowrap;pointer-events:none">{l.text}</span>
        {/each}
      </div>
    </div>

    <div style="display:flex;flex-direction:column;min-width:0">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 10px 8px 0;border-bottom:1px solid var(--line)">
        <span style="font-size:12px;font-weight:500;color:var(--t2)">{view.nameHeader}</span>
        <span style="font-size:12px;font-weight:500;color:var(--t2)">{view.valueHeader}</span>
      </div>
      <div data-r="list" style="max-height:{view.listHeight};overflow-y:auto;overflow-x:hidden;padding-right:10px">
        {#each view.rows as r}
          <div onmouseenter={r.onEnter} onmouseleave={r.onLeave} style="display:flex;flex-direction:column;gap:6px;padding:10px 8px 9px 0;border-bottom:1px solid var(--line);background:{r.bg};transition:background .12s ease" role="button" tabindex="0" onfocus={r.onEnter} onclick={r.onEnter} onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); r.onEnter(event); } }} onblur={r.onLeave}>
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;min-width:0">
              <span style="display:flex;align-items:baseline;gap:8px;min-width:0">
                <span style="width:3px;height:11px;flex:none;border-radius:1px;background:{r.color};transform:translateY(1px)"></span>
                <span style="font-size:13px;font-weight:500;color:var(--t1);white-space:nowrap">{r.name}</span>
                <span style="font-size:12px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">{r.subLabel}</span>
              </span>
              <span style="display:flex;align-items:baseline;gap:8px;flex:none">
                <span style="font-size:13px;font-weight:500;color:var(--t1);white-space:nowrap">{r.pct}</span>
                <span style="font-size:12px;color:var(--t3);white-space:nowrap">{r.value}</span>
              </span>
            </div>
            <div style="height:3px;background:var(--line);border-radius:1px;overflow:hidden">
              <div style="width:{r.barWidth};height:3px;background:{r.color}"></div>
            </div>
          </div>
        {/each}
      </div>
      {#if view.footer}
        <span style="font-size:11px;color:var(--t3);padding-top:10px">{view.footer}</span>
      {/if}
    </div>
  </div>
</div>

<style>
.hover0:hover{background:var(--hover)}

@media (max-width:1180px) { [data-r="split"] { grid-template-columns:minmax(0,1fr)!important; } }
</style>
