import { fail } from '@sveltejs/kit';
import { api } from './api';
import type { Actions } from '@sveltejs/kit';

/** Forms keep preference writes on the server, alongside all other app writes. */
export const researchActions: Actions = {
  preferences: async ({ request, fetch }) => {
    const form = await request.formData();
    const raw = form.get('patch');
    if (typeof raw !== 'string' || raw.length > 100_000) return fail(400, { message: 'Invalid settings.' });
    let patch;
    try { patch = JSON.parse(raw); } catch { return fail(400, { message: 'Invalid settings.' }); }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return fail(400, { message: 'Invalid settings.' });
    try {
      await api.saveResearchPreferences(fetch, patch);
      return { saved: true };
    } catch {
      return fail(400, { message: 'Your changes could not be saved. Please retry.' });
    }
  }
};
