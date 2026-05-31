# AIRLUXO — Cancellation & Refund Policy (DRAFT)

> ⚠️ **Legal disclaimer.** This is a working draft for product/operations, **not legal advice**.
> Cancellation terms, fee levels, and consumer-protection wording must be reviewed and approved by
> qualified Swiss and EU legal counsel before being published or used in contracts. Tier thresholds
> and percentages below are sensible **defaults** and are intended to be configurable.

_Last updated: 2026-05-30 · Governing law: Switzerland · Applies to bookings made via airluxo.app and AIRLUXO partner channels._

---

## 1. Scope & definitions
- **Guest** — the person renting a vehicle. **Host / Partner** — the rental company that lists the vehicle. **AIRLUXO** — the marketplace operator and payment facilitator.
- This policy governs how a booking may be cancelled and how refunds are calculated and processed.
- It is presented to the Guest **before** they confirm and pay, and forms part of the rental agreement.

## 2. Right of withdrawal (consumer law note)
- **EU:** Under the Consumer Rights Directive (2011/83/EU, Art. 16(l)), the 14‑day right of withdrawal **does not apply** to vehicle‑rental services provided for a **specific date or period**. Cancellations are therefore governed by this policy, which is disclosed before booking.
- **Switzerland:** There is no general statutory cooling‑off right for online vehicle rental. Terms are governed by freedom of contract under the Swiss Code of Obligations and must remain **transparent and not unfairly one‑sided** (Unfair Competition Act, Art. 8). Cancellation fees must be a **reasonable, proportionate** estimate of loss — not a punitive penalty.
- Mandatory consumer protections of the Guest's country of residence are unaffected.

## 3. Guest‑initiated cancellation tiers (default)
Measured from the scheduled **pick‑up** time. Percentages apply to the **rental subtotal** (daily/slot rate + add‑ons), i.e. the amount before the AIRLUXO guest service fee.

| When the Guest cancels | Refund of rental subtotal |
|---|---|
| **≥ 7 days** before pick‑up | **100%** (free cancellation) |
| **48 h – 7 days** before | **50%** |
| **< 48 h** before, or **no‑show** | **0%** |

- The **AIRLUXO service fee (12%)** is **non‑refundable** once a booking is confirmed, except where AIRLUXO or the Host cancels (see §5) or where mandatory law requires otherwise.
- A **free‑cancellation window** is offered for confirmed bookings as shown at checkout (default: until 48 h before pick‑up the Guest is told whether free cancellation still applies).
- These tiers are **defaults**; a Host may offer **more generous** terms, never harsher than what is lawful and disclosed.

## 4. How a cancellation is processed (implemented flow)
**All cancellations and refunds are executed by the Host through the AIRLUXO partner dashboard.** Guests cannot self‑refund in‑app; a Guest requests a cancellation (via their confirmation email / contacting the Host or AIRLUXO support), and the Host actions it in the dashboard. This keeps a single, auditable source of truth and correct money movement.

Payment lifecycle (as built on Stripe Connect):
1. **At booking** — the Guest's card is **authorised** (a hold), not charged. Status: *Pending* · payment *Authorized*.
2. **Host confirms** — the card is **captured** (charged). Funds settle to the Host minus AIRLUXO's commission. Status: *Confirmed* · payment *Paid*.
3. **Cancellation before capture** (still *Authorized*) — the hold is **released**; the Guest is **never charged**. Payment *Released*. No fee applies.
4. **Cancellation after capture** (*Paid*) — the Host issues a **refund** from the dashboard. The refund amount follows the tier in §3 (or a Host‑chosen amount, never less favourable than the disclosed tier). Payment becomes *Refunded* (full) or *Part. refund* (partial).

## 5. Host / AIRLUXO‑initiated cancellation
- If the **Host cancels** a confirmed booking (vehicle unavailable, maintenance, etc.), the Guest receives a **100% refund including the AIRLUXO service fee**. Repeated host cancellations may affect the Host's standing on the platform.
- If **AIRLUXO** must cancel (safety, fraud, legal), the Guest is fully refunded.

## 6. Cancellation / restocking fee & how it is split
- Where a fee is retained (per §3 or a Host's published terms), AIRLUXO processes a **partial refund**: `refund = paid total − retained fee`.
- The retained fee is split **proportionally** between Host and AIRLUXO in the same ratio as the original sale (Host net vs. AIRLUXO commission). Implemented via a Stripe refund with `reverse_transfer` + `refund_application_fee`.
- Fees must reflect a genuine, proportionate estimate of loss (mitigation expected, e.g. if the car is re‑rented).

## 7. Refund method & timing
- Refunds are returned to the **Guest's original payment method** via Stripe.
- AIRLUXO initiates refunds **without undue delay** after the Host actions the cancellation. Funds typically appear within **5–10 business days**, depending on the card issuer.
- If a Host payout has already settled, the refunded amount is recovered from the Host's Stripe balance.

## 8. Modifications, no‑show, force majeure
- **Modifications** (dates/times) are treated as a new availability check; if unavailable, normal cancellation tiers apply to the original booking.
- **No‑show** (Guest fails to collect within the agreed window) is treated as a `< 48 h` cancellation: 0% refund, subject to the Host's duty to mitigate.
- **Force majeure / exceptional circumstances** (natural disaster, official travel ban, etc.): AIRLUXO may, at its discretion and consistent with applicable law, grant a fuller refund.

## 9. Disputes & contact
- Cancellation or refund questions: **support@airluxo.app** (placeholder).
- Nothing in this policy limits the Guest's mandatory statutory rights.

---

### Implementation reference (for the team)
- Statuses: `Pending → Confirmed → On trip → Completed`, plus `Declined` / `Cancelled`.
- Payment states: `none · authorized · captured · canceled · failed · refunded · partially_refunded` (+ `refunded_amount`).
- Money moves require a **double‑confirmation** modal in the partner dashboard (capture, release, refund).
- Refund options in the dashboard: **Full / Keep a cancellation fee (partial) / No refund**, with a live breakdown.
- Edge functions: `stripe-create-payment` (authorise + availability check), `stripe-capture` (capture / release / refund), `stripe-webhook` (syncs refund/cancel states).
