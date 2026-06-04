import { supabase } from './supabase.js';

// Registry of lifecycle marketing flows. `flow` maps to marketing_sends.flow;
// `jobname` maps to the pg_cron job. Add a row here when a new flow ships.
export const MARKETING_FLOWS = [
  {
    flow: 'birthday',
    jobname: 'marketing-birthday-daily',
    label: 'Birthday',
    desc: 'A birthday note + complimentary-upgrade gesture, sent on the customer’s birthday.',
    cadence: 'Daily · 09:00 CET',
  },
];

// Founder Marketing → Flows: cron status + per-flow send stats + recent sends.
export async function marketingOverview() {
  const { data, error } = await supabase.rpc('admin_marketing_overview');
  if (error) throw error;
  return data ?? { jobs: [], stats: [], recent: [] };
}

// Pause / resume a flow (toggles its cron job).
export async function setFlowActive(jobname, active) {
  const { data, error } = await supabase.rpc('admin_set_flow_active', { p_jobname: jobname, p_active: active });
  if (error) throw error;
  return data;
}
