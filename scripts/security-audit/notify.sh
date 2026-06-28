#!/usr/bin/env bash
# Emails the founder a short summary + links for the weekly security audit, via Resend
# (the same provider the app's transactional email uses). No-ops cleanly if the API key
# is missing so the workflow never fails just because email isn't configured.
set -euo pipefail

if [ -z "${RESEND_API_KEY:-}" ]; then
  echo "RESEND_API_KEY not set — skipping email."
  exit 0
fi

FROM="${RESEND_FROM:-AirLuxo <noreply@send.airluxo.ch>}"
TO="${AUDIT_EMAIL_TO:-franco.steiner@dancingqueens.ch}"
PR_LINE=""
if [ -n "${PR_URL:-}" ]; then
  PR_LINE="<p>Draft fix PR: <a href=\"${PR_URL}\">${PR_URL}</a></p>"
fi

HTML="<p>The weekly AIRLUXO security audit for <strong>${RUN_DATE}</strong> has finished.</p>\
<p>Findings &amp; implementation plan: <a href=\"${ISSUE_URL}\">${ISSUE_URL}</a></p>\
${PR_LINE}\
<p>Review the issue, then merge the draft PR (or ask Claude to act on it) to confirm the fixes.</p>"

curl -sS -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer ${RESEND_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"from\":\"${FROM}\",\"to\":\"${TO}\",\"subject\":\"🔒 AIRLUXO security audit — ${RUN_DATE}\",\"html\":\"${HTML}\"}"

echo "Audit email sent to ${TO}."
