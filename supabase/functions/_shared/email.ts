// AIRLUXO — shared email layout
// The single source of truth for transactional email styling, so every function
// (welcome, booking-confirm, booking-notify, booking-invoice, …) renders the same
// brand shell. Change the brand here once. Marketing campaigns are built in
// Resend → Broadcasts, not here.
//
// Email-client realities baked in: inline styles only, table-based rows, a
// system-font stack (Clash Display / Satoshi don't load in Outlook/Gmail), and a
// hidden preheader. Brand palette mirrors src/index.css / DESIGN.md.

export const BRAND = {
  ink: "#0b0b0c",
  gold: "#b89150",
  stone: "#76746d",
  ash: "#a8a59b",
  mist: "#e7e4db",
  paper: "#ffffff",
  cloud: "#faf9f6",
};

const FONT = "'Helvetica Neue',Arial,sans-serif";

export const chf = (n: unknown) => `CHF ${Number(n ?? 0).toLocaleString("de-CH")}`;

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

// A primary call-to-action button (bulletproof-ish: padded anchor, no images).
export function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:${BRAND.ink};color:${BRAND.cloud};text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px">${esc(label)}</a>`;
}

// A label/value detail table. Pass [label, value, opts?] tuples; opts.strong bolds
// the value, opts.muted greys the row (use for sub-lines), opts.total draws a top
// rule + larger value (use for the final amount).
type Row = [string, string, { strong?: boolean; muted?: boolean; total?: boolean }?];
export function rows(items: Row[]): string {
  const cells = items
    .map(([label, value, o = {}]) => {
      const border = o.total ? `border-top:2px solid ${BRAND.ink};` : `border-bottom:1px solid ${BRAND.mist};`;
      const labelColor = o.muted ? BRAND.ash : BRAND.stone;
      const valColor = o.muted ? BRAND.stone : BRAND.ink;
      const valWeight = o.strong || o.total ? "700" : "500";
      const valSize = o.total ? "16px" : "14px";
      const pad = o.total ? "12px 0 0" : "9px 0";
      return `<tr>
        <td style="${border}padding:${pad};font-size:14px;color:${labelColor}">${esc(label)}</td>
        <td style="${border}padding:${pad};font-size:${valSize};font-weight:${valWeight};color:${valColor};text-align:right;white-space:nowrap">${esc(value)}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" style="border-collapse:collapse;margin:6px 0">${cells}</table>`;
}

// Wrap body content in the branded shell. `heading` is the H1; `bodyHtml` is
// pre-built inner HTML; `footnote` shows small print above the footer.
export function emailShell(opts: {
  preheader?: string;
  heading: string;
  bodyHtml: string;
  footnote?: string;
}): string {
  const { preheader = "", heading, bodyHtml, footnote = "" } = opts;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.cloud}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
  <table role="presentation" width="100%" style="border-collapse:collapse;background:${BRAND.cloud};padding:0">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" style="max-width:560px;border-collapse:collapse;background:${BRAND.paper};border:1px solid ${BRAND.mist};border-radius:18px;overflow:hidden">
        <tr><td style="padding:28px 32px 0">
          <div style="font-family:${FONT};font-weight:600;letter-spacing:0.06em;font-size:20px;color:${BRAND.ink}">AIR<span style="color:${BRAND.gold}">LUXO</span></div>
        </td></tr>
        <tr><td style="padding:18px 32px 32px;font-family:${FONT};color:${BRAND.ink}">
          <h1 style="font-size:22px;font-weight:700;line-height:1.25;margin:0 0 12px">${esc(heading)}</h1>
          ${bodyHtml}
          ${footnote ? `<p style="font-size:12px;color:${BRAND.ash};line-height:1.6;margin:22px 0 0">${footnote}</p>` : ""}
        </td></tr>
        <tr><td style="padding:18px 32px 26px;border-top:1px solid ${BRAND.mist};font-family:${FONT}">
          <p style="font-size:12px;color:${BRAND.ash};margin:0;line-height:1.6">AIRLUXO · Switzerland's marketplace for extraordinary cars · Geneva</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
