import { api } from '$lib/api';
import { fail } from '@sveltejs/kit';
import type { TransactionInput } from '@snowline/core';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  return { screen: await api.transactionsScreen(fetch) };
};

export const actions = {
  create: async ({ request, fetch }) => {
    const form = await request.formData();
    const text = (key: string) => String(form.get(key) ?? '').trim();
    const number = (key: string) => Number(text(key) || 0);
    const input: TransactionInput = {
      kind: text('kind') as TransactionInput['kind'], operation: text('operation') as TransactionInput['operation'],
      ticker: text('ticker'), customName: text('customName') || undefined, date: text('date'),
      currency: text('currency'), shares: number('shares'), price: number('price'), amount: number('amount'),
      fee: number('fee'), tax: number('tax'), note: text('note'), updateCash: form.has('updateCash')
    };
    try {
      const transaction = await api.createTransaction(fetch, input);
      return { success: true, transaction };
    } catch (error) {
      return fail(400, { error: error instanceof Error ? error.message : 'Could not save transaction. Please try again.' });
    }
  }
} satisfies Actions;
