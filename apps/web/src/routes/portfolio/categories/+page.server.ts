import { fail } from '@sveltejs/kit';
import { api } from '$lib/api';
import type { CategoryEdit } from '@snowline/core';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => ({ editor: await api.categoryEditor(fetch) });

export const actions = {
  edit: async ({ request, fetch }) => {
    const form = await request.formData();
    const text = (key: string) => String(form.get(key) ?? '').trim();
    const kind = text('kind');
    const name = text('name');
    const value = text('target');
    let edit: CategoryEdit;
    if (kind === 'create' || kind === 'target') {
      if (!name) return fail(400, { error: 'Give the category a name.' });
      if (!value || !Number.isFinite(Number(value)) || Number(value) < 0) {
        return fail(400, { error: 'Enter a non-negative target weight.' });
      }
      edit = { kind, name, target: Number(value) };
    } else if (kind === 'rename') {
      if (!text('to')) return fail(400, { error: 'A category needs a name.' });
      edit = { kind, name, to: text('to') };
    } else if (kind === 'assign') {
      edit = { kind, name, ticker: text('ticker') };
    } else if (kind === 'delete') {
      edit = { kind, name, moveTo: text('moveTo') };
    } else if (kind === 'move') {
      const delta = Number(text('delta'));
      if (delta !== -1 && delta !== 1) return fail(400, { error: 'Choose up or down.' });
      edit = { kind, name, delta };
    } else if (kind === 'normalise' || kind === 'reset') {
      edit = { kind };
    } else {
      return fail(400, { error: 'Unknown category action.' });
    }
    try {
      const { model } = await api.categoryEditor(fetch);
      // The design screen rejects case-insensitive duplicates before editing.
      if (edit.kind === 'create' || edit.kind === 'rename') {
        const proposed = edit.kind === 'create' ? edit.name : edit.to;
        if (model.order.some((n) => n.toLowerCase() === proposed.toLowerCase() && !(edit.kind === 'rename' && n === edit.name))) {
          return fail(400, { error: `“${proposed}” already exists.` });
        }
      }
      if (edit.kind === 'delete' && model.order.length < 2) {
        return fail(400, { error: 'Keep at least one category for your holdings.' });
      }
      const result = await api.editCategories(fetch, edit);
      const selected = edit.kind === 'rename' ? edit.to : edit.kind === 'create' ? edit.name
        : edit.kind === 'delete' ? edit.moveTo : edit.kind === 'reset' ? result.order[0] : undefined;
      return { success: true, selected, message: 'Category changes saved.' };
    } catch {
      return fail(503, { error: 'Could not save your change. Please try again.' });
    }
  }
} satisfies Actions;
