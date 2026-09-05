import { api } from '$lib/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  return { screen: await api.holdingsScreen(fetch) };
};
