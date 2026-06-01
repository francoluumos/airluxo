# Testing checklist

Everything built this session, to test in one pass. **Test on `https://staging.airluxo.ch`** (shared Supabase backend — use throwaway emails). After you've run through it, I can verify the DB side via MCP (rows created, links, amounts).

## Setup / prerequisites
- [ ] Google OAuth, Resend SMTP, and the redirect allowlist are configured in Supabase Auth (done during setup).
- [ ] Use a **fresh, non-partner email** for customer tests — e.g. a `+alias` like `you+test1@gmail.com` (a partner email like `franco@luumos.io` logs you in as the *partner*, not a customer).
- [ ] Stripe is in **test mode** — use card `4242 4242 4242 4242`, any future expiry/CVC. No real money moves.
- [ ] For payment/commission tests, use a **Stripe-connected partner's car** (e.g. an **Autolux** listing) so the payment path runs (others fall back to no-payment booking).

---

## 1. Customer login (Google + email)
- [ ] Top-right account menu → **Log in or sign up** opens the modal.
- [ ] **Continue with Google** → complete → land back signed in (avatar/initial shows in the menu).
- [ ] **Email magic link** → enter email → "Check your email" → open link → signed in.
- [ ] Signed-out avatar shows a **person icon** (not a car seat); signed-in shows your initial or Google photo.

## 2. Customer profile (account menu → My trips / Saved / Account)
- [ ] **My trips** lists your bookings (upcoming/past) — empty state if none yet.
- [ ] **Licence** tab → add a licence (scan/upload or phone QR hand-off) → **Save** → shows "Verified licence on file". Reload → it persists.
- [ ] **Account → Personal info**: edit name/phone, **Change photo** (upload), **Saved address** (Swiss autocomplete) → Save changes → reload persists.
- [ ] **Account → Email preferences**: toggle Newsletter on/off (syncs Resend).
- [ ] **Account → Privacy & cookies**: "Manage cookies" reopens the consent banner; Privacy Policy link works.
- [ ] **Delete account** → confirm → you're signed out and the profile is gone. ⚠️ Use a throwaway account — this really deletes.
- [ ] Form styling matches the partner dashboard (uniform fields/buttons).

## 3. Saved cars (wishlist)
- [ ] Heart on a car card (marketplace) — symmetric heart, no shadow. Tap while logged out → opens login.
- [ ] Logged in: tap heart → it fills; appears under **Saved** tab.
- [ ] Un-heart (card or Saved tab) → removed.

## 4. Book-then-account (no login required)
- [ ] **Logged out**, open a car → Reserve → goes straight to details (no login wall).
- [ ] Complete: details (email/phone) → licence → payment (test card) → **Reservation requested**.
- [ ] Confirmation shows **"Create your account"** (Google / email link, prefilled with the booking email).
- [ ] Use the email link → sign in → the booking appears under **My trips** (auto-linked by email).
- [ ] Already-logged-in customer: email/phone (and licence if on file) are **prefilled**; no account prompt after booking.

## 5. Promo / referral codes
Sample code seeded: **`BEAURIVAGE10`** (10% off, platform-funded, 5% commission).
- [ ] In booking, enter `BEAURIVAGE10` → **Apply** → discount line appears, total drops 10%.
- [ ] Bad code → friendly "isn't valid" message.
- [ ] Change dates/add-ons after applying → discount stays correct.
- [ ] Complete booking → (I'll verify) `bookings.promo_code / discount_amount / affiliate_commission` saved; `promo_redemptions` view shows it.
- [ ] No code → total unchanged (regression).

## 6. Partner subscription tiers (commission + car limits)
*(Plan is set manually — to test a paid tier, set `partners.plan` to `pro`/`max` in Supabase for a test partner, then revert.)*
- [ ] Partner dashboard → **Plans** tab shows current plan, commission %, and car usage (X / limit).
- [ ] **Earnings** tab commission % matches the plan (Free 15 / Pro 9 / Max 3).
- [ ] **Car limit**: as a Free partner with 3 cars, "List a car" routes to Plans (can't add a 4th). Existing cars stay live.
- [ ] (Optional) CSV import over the limit → friendly "reached your plan's car limit" error.

## 7. Mobile
- [ ] On a phone, focus an input in the booking/auth modals → **page no longer zooms/blows up** (16px inputs fix).

## 8. Damage-protection add-on (zero-excess · Stage A)
*Partner-keeps pass-through: the protection fee carries **no** AIRLUXO service fee and **no** host commission — the partner receives 100% of it.*
- [ ] **Partner setup**: dashboard → edit (or add) a **Stripe-connected** car → enable **"Offer damage protection (zero excess)"** → set a *protection fee* (e.g. 250) and *security deposit it waives* (e.g. 5000) → Save. Reload → values persist.
- [ ] **Guest sees it**: open that car → **Add-ons** shows "Damage protection" with the fee and copy *"Reduces your excess to CHF 0 — no CHF 5'000 security deposit…"*.
- [ ] **Toggle math**: tick it → a **"Damage protection · zero excess"** line appears and the total rises by exactly the fee. Untick → it disappears. (Service-fee line does **not** change — protection isn't service-fee'd.)
- [ ] **Pay** with test card → **Reservation requested**.
- [ ] (I'll verify via MCP) booking row has `protection = true`, `protection_fee` = the fee, `deposit_amount` = the waived deposit; the Stripe app fee equals `service + commission` only (partner payout includes the **full** protection fee).
- [ ] Car **without** protection enabled → no protection row in Add-ons (regression).

## 9. Regression (make sure nothing broke)
- [ ] Existing booking + Stripe payment (no code, logged in or out) still works end-to-end.
- [ ] White-label **embed** (`?embed=<partnerId>`) still books **anonymously** with no account prompt.
- [ ] Partner login + dashboard unaffected.

---

## What I can verify via MCP after your run
Tell me the test emails/codes you used and I'll confirm: `customers` rows created (Google vs email), licence persisted, favourites rows, booking → account email-link, `promo_redemptions` (discount + commission), and the per-plan commission split on a booking.
