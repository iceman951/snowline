<script lang="ts">
  import { onMount } from "svelte";
  import Model from "$lib/presenters/NumberLineGauge";

  import { fmt } from "@snowline/core";
  let props: any = $props();
  const model = new Model({ fmt }, () => props);
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  onMount(() => { model.componentDidMount?.(); return () => model.componentWillUnmount?.(); });
</script>

<div style="display:flex;flex-direction:column;gap:11px;min-width:0">
  {#if view.hasHead}
    <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-height:22px">
      {#if view.statement}
        <span style="font-size:13px;color:var(--t1);line-height:1.4">{view.statement}</span>
      {/if}
      {#if view.verdict}
        <span style="display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:5px;background:{view.verdictBg};color:{view.verdictFg};font-size:11px;font-weight:500;white-space:nowrap">
          <span style="width:5px;height:5px;border-radius:1px;background:currentColor;opacity:.75"></span>{view.verdict}
        </span>
      {/if}
    </div>
  {/if}

  <div style="position:relative;height:50px">
    <span style="position:absolute;left:0;right:0;top:38px;height:3px;border-radius:2px;background:var(--track, var(--line))"></span>
    <span style="position:absolute;left:0;top:38px;width:{view.fillWidth};height:3px;border-radius:2px;background:var(--accent-4)"></span>
    {#each view.ticks as t}
      <span style="position:absolute;left:{t.x};top:38px;width:1px;height:{t.h};background:var(--tick, var(--line))"></span>
    {/each}
    {#each view.markers as m}
      <span style="position:absolute;left:{m.x};top:{m.labelTop};transform:translateX(-50%);display:flex;align-items:baseline;gap:5px;z-index:{m.z};pointer-events:none">
        <span style="font-size:11px;color:{m.labelColor};white-space:nowrap;line-height:1.3">{m.label}</span>
        <span style="font-size:12px;font-weight:600;color:{m.color};white-space:nowrap;line-height:1.3">{m.value}</span>
      </span>
      <span style="position:absolute;left:{m.x};top:{m.dotTop};width:{m.size};height:{m.size};background:{m.fill};border:2px solid {m.color};border-radius:{m.radius};transform:translateX(-50%) rotate({m.rotate});box-shadow:0 0 0 3px var(--card);z-index:{m.z}"></span>
    {/each}
  </div>

  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px">
    <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t3);min-width:0">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" style="flex:none"><path d="M9 2L4 6l5 4"></path></svg>
      <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{view.minLabel}</span>
    </span>
    <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t3);min-width:0">
      <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{view.maxLabel}</span>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" style="flex:none"><path d="M3 2l5 4-5 4"></path></svg>
    </span>
  </div>

  {#if view.note}
    <span style="font-size:11px;line-height:1.5;color:var(--t3);border-top:1px solid var(--line);padding-top:9px">{view.note}</span>
  {/if}
</div>

<style>


</style>
