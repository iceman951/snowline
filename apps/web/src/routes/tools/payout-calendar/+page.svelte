<script lang="ts">
  import Screen from "$lib/screens/PayoutCalendar.svelte";
  import ResearchPage from "$lib/components/ResearchPage.svelte";
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();
</script>
<svelte:head><title>Payout Calendar · Snowline</title></svelte:head>
<ResearchPage screen={Screen} snapshot={data.snapshot} />
