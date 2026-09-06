<script lang="ts">
  import { onMount } from "svelte";
  import Model from "$lib/presenters/RangeTabs";

  import { fmt } from "@snowline/core";
  let props: any = $props();
  const model = new Model({ fmt }, () => props);
  const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
  onMount(() => { model.componentDidMount?.(); return () => model.componentWillUnmount?.(); });
</script>

<div style="display:flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--card)">
  {#each view.tabs as t}
    <button onclick={t.onClick} style="height:26px;padding:0 10px;border:none;border-radius:6px;background:{t.bg};color:{t.color};font-size:12px;font-weight:{t.weight};cursor:pointer;white-space:nowrap" class="hover0">{t.label}</button>
  {/each}
  <span style="width:1px;height:16px;background:var(--line);margin:0 2px"></span>
  <button onclick={view.onCustom} title="Custom dates" style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border:none;border-radius:6px;background:{view.customBg};color:{view.customColor};cursor:pointer" class="hover1">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 6h16v14H4V6Zm3-3v3m10-3v3M4 11h16"></path></svg>
  </button>
</div>

<style>
.hover0:hover{background:var(--hover)}
.hover1:hover{background:var(--hover)}

</style>
