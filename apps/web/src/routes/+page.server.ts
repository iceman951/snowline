import { api } from '$lib/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  return { dashboard: await api.dashboard(fetch) };
};
