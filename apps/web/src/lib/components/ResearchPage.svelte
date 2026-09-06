<script lang="ts">
  import { enhance } from '$app/forms';
  import { untrack, type Component } from 'svelte';
  import { createScreenEngine } from '$lib/screen-engine';
  import type { ResearchSnapshot } from '$lib/api';
  import type { ResearchPreferences } from '@snowline/core';

  let { snapshot, screen: Screen }: { snapshot: ResearchSnapshot; screen: Component<{ engine: any }> } = $props();
  let form: HTMLFormElement;
  let patch = $state<Partial<ResearchPreferences>>({});
  let revision = $state(0);
  let saved = $state(0);
  let saving = $state(false);
  let message = $state('');
  const engine = $derived(createScreenEngine(snapshot, (next) => {
    patch = { ...patch, ...next };
    revision += 1;
    message = '';
  }));

  // Serialize saves so a slow response cannot overwrite a more recent edit.
  $effect(() => {
    if (form && revision > saved && !saving && !message) untrack(() => form.requestSubmit());
  });
</script>

<Screen {engine} />
<form bind:this={form} method="POST" action="?/preferences" hidden use:enhance={() => {
  saving = true;
  const submitted = revision;
  return ({ result }) => {
    saving = false;
    if (result.type === 'success') saved = submitted;
    else message = 'Your changes could not be saved. Please retry.';
  };
}}>
  <input name="patch" type="hidden" value={JSON.stringify(patch)} />
</form>
{#if message}
  <div class="save-error" role="alert">
    {message}
    <button onclick={() => message = ''}>Retry</button>
  </div>
{/if}
<style>
  .save-error { position:fixed;bottom:76px;right:20px;z-index:100;max-width:calc(100vw - 40px);padding:12px 16px;border:1px solid var(--amber);border-radius:8px;background:var(--card);color:var(--t1);box-shadow:var(--shadow);font-size:12px; }
  button { margin-left:12px;border:1px solid var(--line);border-radius:6px;background:var(--hover);color:var(--t1);padding:5px 9px;cursor:pointer; }
</style>
