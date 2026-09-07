<script lang="ts">
  import { onMount } from 'svelte';
  import { afterNavigate, invalidateAll } from '$app/navigation';
  type Entry = { ticker: string; asOf: string | null; fetchedAt: string | null; state: string };
  type Status = { source: string; refreshing?: boolean; error?: string | null; entries: Entry[] };
  let status = $state<Status | null>(null);
  let busy = $state(false);
  let message = $state('');
  let mounted = false;
  const stamp = (value: string | null) => value ? new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : '—';
  async function update() {
    try {
      const response = await fetch('/api/market/status');
      const value = await response.json();
      if (mounted) status = value;
    } catch { if (mounted) message = 'ไม่สามารถตรวจสอบสถานะราคาได้'; }
  }
  async function refresh() {
    busy = true;
    message = '';
    try {
      const response = await fetch('/api/market/refresh', { method: 'POST' });
      const value = await response.json();
      if (!response.ok) { message = value.error ?? 'อัปเดตราคาไม่ได้ กรุณาลองใหม่'; return; }
      status = value;
      message = value.error ?? 'อัปเดตราคาแล้ว';
      await invalidateAll();
      await update();
    } catch { message = 'อัปเดตราคาไม่ได้ กรุณาลองใหม่'; }
    finally { busy = false; }
  }
  onMount(() => { mounted = true; void update(); return () => { mounted = false; }; });
  afterNavigate(() => { if (mounted) void update(); });
</script>

{#if status && status.source !== 'seed'}
  <div class="market-status">
    <div class="summary">
      <span>Yahoo Finance · ราคาจากข้อมูลรายวัน · แคชวันละครั้ง</span>
      <button onclick={refresh} disabled={busy || status.refreshing}>{busy ? 'กำลังอัปเดต…' : 'อัปเดตราคา'}</button>
      <span role="status">{message || status.error || ''}</span>
    </div>
    {#if status.entries.length}
      <details>
        <summary>วันที่ราคาและสถานะแคช · {status.entries.filter(e => e.state === 'cached').length}/{status.entries.length} รายการอัปเดตวันนี้</summary>
        <div class="table-wrap"><table>
          <thead><tr><th>หุ้น</th><th>วันที่ราคา (ตลาดต้นทาง)</th><th>ดึงสำเร็จ (เวลาไทย)</th><th>สถานะ</th></tr></thead>
          <tbody>{#each status.entries as entry}
            <tr><td>{entry.ticker}</td><td>{entry.asOf?.slice(0, 10) ?? '—'}</td><td>{stamp(entry.fetchedAt)}</td>
              <td>{entry.state === 'cached' ? 'แคชวันนี้' : entry.state === 'stale' ? 'ใช้แคชเก่า' : 'ใช้ราคาเดิม'}</td></tr>
          {/each}</tbody>
        </table></div>
      </details>
    {/if}
  </div>
{/if}

<style>
  .market-status { padding: 8px 20px; font-size: 11px; color: var(--t2); background: var(--canvas); border-bottom: 1px solid var(--line); }
  .summary { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
  button { border: 1px solid var(--line); border-radius: 6px; background: var(--canvas); color: var(--t1); padding: 4px 10px; cursor: pointer; }
  button:disabled { opacity: .6; cursor: wait; }
  details { margin-top: 5px; } summary { cursor: pointer; }
  .table-wrap { max-height: 240px; overflow: auto; }
  table { border-collapse: collapse; text-align: left; } th, td { padding: 5px 12px 5px 0; }
</style>
