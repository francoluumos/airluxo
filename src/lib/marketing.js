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
  {
    flow: 'post_trip',
    jobname: 'marketing-post-trip-daily',
    label: 'Post-trip',
    desc: 'Sent 2 days after a trip completes — a thank-you, a nudge to share feedback, and the next booking.',
    cadence: 'Daily · 10:00 CET',
  },
  {
    flow: 'winback',
    jobname: 'marketing-winback-weekly',
    label: 'Win-back',
    desc: 'Past guests who haven’t booked in 6 months — “your next drive is waiting”.',
    cadence: 'Weekly · Tue',
  },
  {
    flow: 'wishlist',
    jobname: 'marketing-wishlist-weekly',
    label: 'Wishlist',
    desc: 'Customers with saved cars who haven’t booked recently — a nudge on their list.',
    cadence: 'Weekly · Thu',
  },
  {
    flow: 'new_models',
    jobname: 'marketing-new-models-weekly',
    label: 'New models',
    desc: 'A digest of cars added in the last week, to all subscribers. Sends only when there are new arrivals.',
    cadence: 'Weekly · Fri',
  },
  {
    flow: 'abandoned',
    jobname: 'marketing-abandoned-hourly',
    label: 'Abandoned booking',
    desc: 'One same-car reminder 1–48h after a guest leaves checkout (soft opt-in; suppressed if they convert or opt out).',
    cadence: 'Hourly check',
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

// Render a flow's email with sample data (admin-gated, no send). Returns { html, subject }.
export async function previewFlow(flow) {
  const { data, error } = await supabase.functions.invoke('marketing-run', { body: { flow, preview: true } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
