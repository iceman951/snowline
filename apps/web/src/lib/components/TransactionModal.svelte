<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { enhance } from '$app/forms';
  import { fmt, type LedgerRow } from '@snowline/core';
  import type { TransactionsScreenPayload } from '$lib/api';

  let { assets, cashBalance, initialKind = 'trade', onclose, onsaved }: {
    assets: TransactionsScreenPayload['assets'];
    cashBalance: number;
    initialKind?: LedgerRow['kind'];
    onclose: () => void;
    onsaved: (kind: LedgerRow['kind']) => void;
  } = $props();

  let dialog: HTMLDialogElement;
  let formElement: HTMLFormElement;
  let kind = $state<LedgerRow['kind']>('trade');
  let operation = $state('Buy');
  let ticker = $state('');
  let custom = $state(false);
  let customName = $state('');
  const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  let date = $state(today());
  let shares = $state<number | undefined>();
  let price = $state<number | undefined>();
  let amount = $state<number | undefined>();
  let perShare = $state<number | undefined>();
  let fee = $state<number | undefined>();
  let tax = $state<number | undefined>();
  let note = $state('');
  let updateCash = $state(false);
  let saving = $state(false);
  let error = $state('');
  let notice = $state('');
  const asset = $derived(assets.find(a => a.ticker === ticker.trim().toUpperCase()));
  const cashEffect = $derived(kind === 'trade'
    ? (operation === 'Buy' ? -1 : 1) * (shares ?? 0) * (price ?? 0) - (fee ?? 0)
    : kind === 'income' ? (amount ?? 0) - (fee ?? 0) - (tax ?? 0) : -(amount ?? 0));

  onMount(() => {
    switchKind(initialKind);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { document.body.style.overflow = overflow; dialog.close(); };
  });

  function switchKind(next: LedgerRow['kind']) {
    kind = next;
    operation = next === 'trade' ? 'Buy' : next === 'income' ? 'Dividends' : 'Fee';
    custom = false; customName = ''; amount = undefined; perShare = undefined;
    fee = undefined; tax = undefined; error = ''; notice = '';
  }

  function syncPerShare() {
    perShare = asset?.shares && amount !== undefined ? Number((amount / asset.shares).toFixed(8)) : undefined;
  }

  async function resetEntry() {
    ticker = ''; customName = ''; custom = false; shares = undefined; price = undefined;
    amount = undefined; perShare = undefined; fee = undefined; tax = undefined; note = '';
    await tick();
    formElement.querySelector<HTMLInputElement>('input[name="ticker"]')?.focus();
  }
</script>

<dialog bind:this={dialog} aria-labelledby="transaction-title" oncancel={(event) => { event.preventDefault(); if (!saving) onclose(); }}>
  <header>
    <h2 id="transaction-title">New transaction</h2>
    <button type="button" class="close" aria-label="Close transaction form" disabled={saving} onclick={onclose}>×</button>
  </header>
  <div class="tabs" role="tablist" aria-label="Transaction type">
    {#each [{ key: 'trade', label: 'Trades' }, { key: 'income', label: 'Incomes' }, { key: 'expense', label: 'Expenses' }] as entry, index}
      <button type="button" role="tab" id={`transaction-tab-${entry.key}`} aria-selected={kind === entry.key}
        aria-controls="transaction-panel" tabindex={kind === entry.key ? 0 : -1} disabled={saving}
        onclick={() => switchKind(entry.key as LedgerRow['kind'])}
        onkeydown={(event) => {
          const keys: LedgerRow['kind'][] = ['trade', 'income', 'expense'];
          if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
            switchKind(keys[next]);
            document.getElementById(`transaction-tab-${keys[next]}`)?.focus();
          }
        }}>{entry.label}</button>
    {/each}
  </div>

  <form method="POST" action="?/create" bind:this={formElement} use:enhance={({ cancel, submitter }) => {
    if (saving) { cancel(); return; }
    saving = true; error = ''; notice = '';
    const more = submitter?.getAttribute('value') === 'more';
    return async ({ result, update }) => {
      try {
        if (result.type === 'success') {
          await update({ reset: false });
          onsaved(kind);
          if (more) { await resetEntry(); notice = 'Transaction saved. Add another below.'; }
          else onclose();
        } else {
          error = result.type === 'failure' ? String(result.data?.error ?? 'Check the transaction details.') : 'Could not save transaction. Please try again.';
        }
      } finally { saving = false; }
    };
  }}>
    <div id="transaction-panel" role="tabpanel" aria-labelledby={`transaction-tab-${kind}`} tabindex="0">
    <fieldset disabled={saving}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="currency" value="USD" />
      {#if notice}<p class="notice" role="status">{notice}</p>{/if}
      {#if error}<p class="error" role="alert">{error}</p>{/if}

      {#if kind === 'expense'}
        <label class="expense-operation" for="transaction-operation">Operation <span class="required">*</span></label>
        <select id="transaction-operation" name="operation" bind:value={operation}><option>Fee</option><option>Tax</option></select>
      {/if}

      <div class="asset-heading" class:after-operation={kind === 'expense'}>
        <label for="transaction-ticker">Ticker/Company {#if kind !== 'expense'}<span class="required">*</span>{:else}<span class="muted">(optional)</span>{/if}</label>
        {#if kind === 'trade'}
          <button type="button" class="text-button" onclick={() => { custom = !custom; ticker = ''; customName = ''; operation = 'Buy'; }}>{custom ? 'Choose existing asset' : 'or add a custom asset'}</button>
        {/if}
      </div>
      <div class="ticker-input">
        <input id="transaction-ticker" name="ticker" list={custom ? undefined : 'transaction-assets'} bind:value={ticker}
          oninput={(event) => { ticker = event.currentTarget.value; syncPerShare(); }} required={kind !== 'expense'} maxlength="20" autocomplete="off"
          placeholder={custom ? 'Ticker, e.g. MYASSET' : 'Start entering the ticker or company name…'} />
        {#if ticker}<button type="button" class="clear" aria-label="Clear asset" onclick={() => { ticker = ''; perShare = undefined; }}>×</button>{/if}
      </div>
      <datalist id="transaction-assets">
        {#each assets as a (a.ticker)}<option value={a.ticker}>{a.name}</option>{/each}
      </datalist>
      {#if asset && !custom}<p class="asset-detail">{asset.name} · {fmt.shares(asset.shares)} shares</p>{/if}
      {#if custom}
        <label for="transaction-custom-name">Asset name <span class="required">*</span></label>
        <input id="transaction-custom-name" name="customName" bind:value={customName} required maxlength="120" placeholder="Company or asset name" />
      {/if}

      <div class:two-columns={kind !== 'expense'} class="field-row">
        {#if kind !== 'expense'}
          <div>
            <label for="transaction-operation">Operation <span class="required">*</span></label>
            <select id="transaction-operation" name="operation" bind:value={operation}>
              {#if kind === 'trade'}<option>Buy</option>{#if !custom}<option>Sell</option>{/if}{:else}<option>Dividends</option>{/if}
            </select>
          </div>
        {/if}
        <div>
          <label for="transaction-date">Date <span class="required">*</span></label>
          <input id="transaction-date" name="date" type="date" required bind:value={date} />
        </div>
      </div>

      {#if kind === 'trade'}
        <div class="field-row two-columns">
          <div>
            <label for="transaction-shares">Shares <span class="required">*</span></label>
            <input id="transaction-shares" name="shares" type="number" min="0.00000001" step="any" required bind:value={shares} placeholder="Shares" />
          </div>
          <div>
            <label for="transaction-price">Price <span class="required">*</span></label>
            <div class="money-input"><input id="transaction-price" name="price" type="number" min="0.00000001" step="any" required bind:value={price} placeholder="Price" /><span>USD</span></div>
          </div>
        </div>
      {:else if kind === 'income'}
        <div class="field-row income-columns">
          <div>
            <label for="transaction-amount">Total received <span class="required">*</span></label>
            <div class="money-input"><input id="transaction-amount" name="amount" type="number" min="0.01" step="0.01" required bind:value={amount} oninput={(event) => { amount = event.currentTarget.value === '' ? undefined : event.currentTarget.valueAsNumber; syncPerShare(); }} placeholder="Received in total" /><span>USD</span></div>
          </div>
          <div>
            <label for="transaction-per-share">Per share, $</label>
            <input id="transaction-per-share" type="number" min="0" step="any" bind:value={perShare} disabled={!asset?.shares} placeholder="Per share"
              oninput={(event) => { perShare = event.currentTarget.value === '' ? undefined : event.currentTarget.valueAsNumber; amount = perShare !== undefined && asset?.shares ? Math.round(perShare * asset.shares * 100) / 100 : undefined; }} />
          </div>
        </div>
        <p class="hint">Enter income before fees and withholding tax.</p>
      {:else}
        <label for="transaction-amount">{operation} <span class="required">*</span></label>
        <div class="money-input"><input id="transaction-amount" name="amount" type="number" min="0.01" step="0.01" required bind:value={amount} placeholder={operation} /><span>USD</span></div>
      {/if}

      {#if kind !== 'expense'}
        <label for="transaction-fee">Fee</label>
        <div class="money-input"><input id="transaction-fee" name="fee" type="number" min="0" step="0.01" bind:value={fee} placeholder="Fee" /><span>USD</span></div>
      {/if}
      {#if kind === 'income'}
        <label for="transaction-tax">Tax, $</label>
        <input id="transaction-tax" name="tax" type="number" min="0" step="0.01" bind:value={tax} placeholder="Tax" />
      {/if}

      <label for="transaction-note">Note</label>
      <textarea id="transaction-note" name="note" bind:value={note} maxlength="2000" rows="2"></textarea>
      <div class="cash-section">
        <label class="checkbox"><input type="checkbox" name="updateCash" bind:checked={updateCash} /> Update cash balance</label>
        <p>Current cash balance: <strong>{fmt.money(cashBalance)}</strong></p>
        {#if updateCash}<p>After transaction: <strong>{fmt.money(cashBalance + cashEffect)}</strong></p>{/if}
      </div>
    </fieldset>
    </div>
    <footer>
      <button type="button" class="cancel" disabled={saving} onclick={onclose}>Cancel</button>
      <button type="submit" class="save" name="intent" value="save" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      <button type="submit" class="save-more" name="intent" value="more" disabled={saving}>Save and add more</button>
    </footer>
  </form>
</dialog>

<style>
  dialog { width: min(500px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); margin: auto; padding: 0; border: 1px solid var(--line); border-radius: 12px; background: var(--card); color: var(--t1); box-shadow: 0 24px 80px #0005; overflow-y: auto; }
  dialog::backdrop { background: #0008; backdrop-filter: blur(3px); }
  header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--line); }
  h2 { margin: 0; font-size: 19px; letter-spacing: -.025em; font-weight: 600; }
  button, select, input, textarea { font: inherit; }
  button { cursor: pointer; }
  .close, .clear { background: none; border: 0; color: var(--t2); font-size: 25px; line-height: 1; padding: 4px 7px; }
  .tabs { display: flex; gap: 24px; padding: 0 24px; border-bottom: 1px solid var(--line); }
  .tabs button { border: 0; border-bottom: 2px solid transparent; padding: 16px 0 12px; background: none; color: var(--t2); font-weight: 600; font-size: 13px; }
  .tabs button[aria-selected='true'] { color: var(--t1); border-color: var(--accent); }
  fieldset { min-width: 0; margin: 0; padding: 22px 24px 0; border: 0; }
  label { display: block; margin: 22px 0 8px; font-size: 13px; font-weight: 500; }
  .expense-operation { margin-top: 0; }
  .required { color: var(--neg); }
  .muted { color: var(--t2); font-weight: 400; margin-left: 4px; }
  input:not([type='checkbox']), select, textarea { width: 100%; min-width: 0; min-height: 46px; border: 1px solid var(--line); border-radius: 6px; background: var(--hover); padding: 11px 12px; color: var(--t1); font-size: 13px; }
  input::placeholder { color: var(--t3); }
  input[type='date'] { color-scheme: light; }
  :global(html[data-theme='dark']) input { color-scheme: dark; }
  textarea { resize: vertical; max-height: 160px; }
  .asset-heading { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; margin-top: 22px; margin-bottom: 8px; }
  .asset-heading:first-of-type { margin-top: 0; }
  .asset-heading.after-operation { margin-top: 22px; }
  .asset-heading label { margin: 0; }
  .text-button { border: 0; padding: 0; color: var(--t2); background: none; font-size: 12px; text-decoration: underline; }
  .ticker-input { position: relative; }
  .ticker-input input { padding-right: 36px; }
  .clear { position: absolute; right: 6px; top: 9px; font-size: 20px; }
  .asset-detail, .hint { color: var(--t2); font-size: 11px; margin: 7px 0 0; }
  .field-row { display: grid; gap: 12px; }
  .two-columns { grid-template-columns: 1fr 1fr; }
  .income-columns { grid-template-columns: 1.3fr 1fr; }
  .money-input { display: flex; align-items: center; background: var(--hover); border: 1px solid var(--line); border-radius: 6px; }
  .money-input input { border: 0; background: transparent; }
  .money-input span { flex: none; padding-right: 12px; font-size: 12px; color: var(--t2); }
  .cash-section { margin-top: 22px; }
  .checkbox { display: flex; align-items: center; gap: 8px; margin: 0; }
  .checkbox input { width: 17px; height: 17px; margin: 0; accent-color: var(--accent); }
  .cash-section p { margin: 8px 0 0; font-size: 12px; color: var(--t2); }
  footer { display: flex; justify-content: flex-end; gap: 8px; margin: 22px 24px 0; padding: 20px 0; border-top: 1px solid var(--line); }
  footer button { min-height: 40px; padding: 10px 14px; border: 1px solid var(--line); border-radius: 6px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .cancel { background: var(--hover); color: var(--t2); }
  .save { background: var(--accent-soft); color: var(--accent); border-color: transparent; }
  .save-more { background: var(--accent); color: var(--on-accent); border-color: transparent; }
  :is(input, textarea, select, button):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  button:disabled, input:disabled { opacity: .55; cursor: not-allowed; }
  .notice, .error { padding: 10px 12px; margin: 0 0 18px; border-radius: 6px; font-size: 13px; }
  .notice { background: var(--accent-soft); color: var(--accent); }
  .error { background: var(--neg-soft); color: var(--neg); }
  @media (max-width: 420px) {
    dialog { width: calc(100vw - 16px); max-height: calc(100dvh - 16px); }
    header { padding: 18px 16px; } .tabs { padding: 0 16px; }
    fieldset { padding: 18px 16px 0; } footer { margin: 20px 16px 0; gap: 6px; }
    footer button { padding: 10px; } .asset-heading { flex-wrap: wrap; }
    .income-columns { grid-template-columns: 1fr; gap: 0; }
  }
</style>
