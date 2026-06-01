# Promo & referral codes

A single code does two things: gives the **guest a discount** and **attributes the booking to a referrer** (hotel / affiliate) with a **commission** we owe them. Each code decides **who funds the discount**.

> v1 has **no admin UI** — you create/manage codes directly in the Supabase **Table editor** (`promo_codes`) or via SQL. A founder dashboard will own this later (see BACKLOG).

## Create a code
Supabase → Table editor → `public.promo_codes` → Insert, or SQL:

```sql
insert into public.promo_codes
  (code, discount_type, discount_value, funded_by,
   affiliate_name, affiliate_email, commission_type, commission_value, commission_base,
   active, max_uses, expires_at, notes)
values
  ('BEAURIVAGE10', 'percent', 10, 'platform',
   'Hôtel Beau-Rivage', 'concierge@beau-rivage.ch', 'percent', 5, 'subtotal',
   true, null, null, 'Concierge referral');
```

| Field | Meaning |
|---|---|
| `code` | What the guest types. Stored/compared **UPPERCASE**, case-insensitive on entry. |
| `discount_type` / `discount_value` | `percent` (e.g. 10 = 10% of subtotal) or `fixed` (CHF off, capped at subtotal). |
| `funded_by` | `platform` → discount comes out of **AIRLUXO's** service-fee/commission (marketing cost; partner still paid in full). `partner` → comes out of the **partner payout**. Clamped so neither goes negative. |
| `commission_type` / `commission_value` / `commission_base` | What we owe the referrer: `none` / `percent` / `fixed`, computed on `subtotal` or `total`. **Recorded only** — paid out of band, doesn't touch the Stripe charge. |
| `active` | Master on/off. |
| `max_uses` | `null` = unlimited; otherwise capped (counts non-cancelled bookings using the code). |
| `starts_at` / `expires_at` | Optional validity window. |
| `affiliate_name` / `affiliate_email` | The referrer; `affiliate_name` is shown to the guest as the discount label. |

## How it applies (authoritative)
1. Guest enters the code in the booking flow → `validate_promo(code, subtotal)` RPC previews the discount.
2. At payment, **`stripe-create-payment` re-validates and recomputes everything server-side** — the client total is never trusted. Discount is clamped so the app fee (platform-funded) or partner payout (partner-funded) can't go below 0.
3. The booking stores `promo_code`, `discount_amount`, `affiliate_commission`.

## Reporting (commission owed)
Query the `promo_redemptions` view (Supabase SQL editor / service role — not exposed to the app):

```sql
select affiliate_name, count(*) bookings,
       sum(discount_amount) total_discount,
       sum(affiliate_commission) commission_owed
from public.promo_redemptions
where status not in ('Cancelled','Declined')
group by affiliate_name order by commission_owed desc;
```

## Notes
- Sample code **`BEAURIVAGE10`** is seeded (10% platform-funded, 5% commission to "Hôtel Beau-Rivage").
- The white-label **embed** uses the same booking flow; codes work there too (anonymous checkout still applies the discount via the server).
- Pairs with the marketing channels in MARKETING.md (hotel concierge, Airbnb hosts, offline venue placements) — give each a unique code → attributable bookings.
