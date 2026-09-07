<script lang="ts">
  import '../app.css';
  import MarketStatus from '$lib/components/MarketStatus.svelte';

  let { children } = $props();
</script>

<div style="min-height:100vh;background:var(--canvas);color:var(--t1);font-size:14px;line-height:1.45">
  <MarketStatus />
  {@render children()}
</div>
