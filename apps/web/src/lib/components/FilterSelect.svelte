<!--
  Toolbar filter dropdown. A native select cannot be themed, so this is a
  listbox that keeps the app's own popup styling and keyboard behaviour.
-->
<script module lang="ts">
  export type FilterOption = { value: string; label: string };

  let count = 0;
</script>

<script lang="ts">
  import { tick } from 'svelte';

  let {
    label,
    value,
    options,
    display,
    width = 250,
    disabled = false,
    onselect
  }: {
    label: string;
    value: string;
    options: FilterOption[];
    /** Overrides the button text — used when the value is a custom range. */
    display?: string;
    width?: number;
    disabled?: boolean;
    onselect: (value: string) => void;
  } = $props();

  const uid = `filter-select-${count++}`;

  let open = $state(false);
  let active = $state(0);
  let root = $state<HTMLDivElement>();
  let button = $state<HTMLButtonElement>();
  let panel = $state<HTMLDivElement>();

  const selectedIndex = $derived(Math.max(0, options.findIndex((o) => o.value === value)));
  const current = $derived(display ?? options[selectedIndex]?.label ?? '');

  async function toggle() {
    open = !open;
    if (open) {
      active = selectedIndex;
      await tick();
      panel?.focus();
    }
  }

  function close(refocus = false) {
    open = false;
    if (refocus) button?.focus();
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    close(true);
    if (option.value !== value) onselect(option.value);
  }

  function onkeydown(event: KeyboardEvent) {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
      return;
    }
    if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(active); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); active = (active + 1) % options.length; }
    else if (event.key === 'ArrowUp') { event.preventDefault(); active = (active - 1 + options.length) % options.length; }
    else if (event.key === 'Home') { event.preventDefault(); active = 0; }
    else if (event.key === 'End') { event.preventDefault(); active = options.length - 1; }
    else if (event.key === 'Tab') close();
  }
</script>

<svelte:window onclick={(event) => { if (!root?.contains(event.target as Node)) close(); }} />

<div bind:this={root} class="filter-select" style:width="{width}px">
  <button
    type="button"
    bind:this={button}
    {disabled}
    class="filter-select-button"
    class:open
    aria-label={label}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls="{uid}-list"
    onclick={toggle}
    {onkeydown}
  >
    <span class="filter-select-value">{current}</span>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
      stroke-linecap="round" aria-hidden="true" style:transform="rotate({open ? 180 : 0}deg)"><path d="M6 9l6 6 6-6" /></svg>
  </button>

  {#if open}
    <div
      bind:this={panel}
      id="{uid}-list"
      class="filter-select-list"
      role="listbox"
      tabindex="-1"
      aria-label={label}
      aria-activedescendant="{uid}-option-{active}"
      {onkeydown}
    >
      {#each options as option, i (option.value)}
        <button
          type="button"
          id="{uid}-option-{i}"
          role="option"
          tabindex={-1}
          aria-selected={option.value === value}
          class="filter-select-option"
          class:selected={option.value === value}
          class:active={i === active}
          onmouseenter={() => (active = i)}
          onclick={() => choose(i)}
        >{option.label}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .filter-select { position: relative; max-width: 100%; }
  .filter-select-button {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    width: 100%; height: 42px; padding: 0 12px; font: inherit; font-size: 13px;
    color: var(--t1); background: var(--card); border: 1px solid var(--line);
    border-radius: 5px; cursor: pointer; text-align: left;
  }
  .filter-select-button:disabled { cursor: default; opacity: .6; }
  .filter-select-button.open { border-color: var(--accent-tint); }
  .filter-select-button svg { flex: none; color: var(--t3); transition: transform .15s; }
  .filter-select-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .filter-select-list {
    position: absolute; top: calc(100% + 4px); left: 0; z-index: 45;
    width: 100%; max-height: 320px; overflow-y: auto; padding: 6px 0;
    background: var(--card); border: 1px solid var(--line); border-radius: 6px;
    box-shadow: var(--shadow); outline: none;
  }
  .filter-select-option {
    display: flex; align-items: center; width: 100%; min-height: 33px; padding: 6px 16px;
    border: 0; background: transparent; font: inherit; font-size: 13px; text-align: left;
    color: var(--t1); cursor: pointer; white-space: nowrap;
  }
  .filter-select-option.selected { color: var(--t3); }
  .filter-select-option.active { background: var(--accent); color: var(--on-accent); }
  .filter-select-button:focus-visible, .filter-select-list:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  @media (max-width: 600px) {
    .filter-select { flex: 1 1 140px; width: auto !important; min-width: 0; }
  }
</style>
