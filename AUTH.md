# Authentication

AIRLUXO has **two kinds of accounts**, both on the same Supabase `auth.users`:

| Who | How they sign in | Profile row | Entry point |
|-----|------------------|-------------|-------------|
| **Customers** (drivers) | **Google** OAuth · **Email magic link** (passwordless) | `public.customers` | Account menu (top-right) → "Log in or sign up" |
| **Partners** (rental companies) | Email + password | `public.partners` | "List your cars" → partner portal |

A signup is routed to the right table by the `handle_new_user` trigger: if the signup carries a `company_name` (the partner form always sets it) → `partners`; otherwise (Google / email magic-link, or explicit `role=customer`) → `customers`. A given email can only be one or the other — Supabase links a later Google/email login to an existing account with the same verified email.

> **Booking does not require login.** Guests complete a booking unauthenticated, and the confirmation screen offers one-tap account creation (Google or an email sign-in link, prefilled with the booking email) via `PostBookingAccount` in `CarDetail`. The new account auto-links to the booking by email (the `bookings` customer SELECT policy matches `guest_email`). The white-label **embed** has no auth context (null-safe `useAuth()`), so it simply stays anonymous with no account prompt.

---

## The two customer login methods

Both run through `src/lib/auth.jsx` (`AuthProvider`) and the modal `src/components/AuthModal.jsx`:

- **Google** — `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`. Redirects to Google and back; `detectSessionInUrl` (in `src/lib/supabase.js`) picks up the session on return.
- **Email magic link** — `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin, data: { role: 'customer' } } })`. Sends a sign-in link; the same address signs up new users and logs in returning ones. The `role: 'customer'` marker guarantees the trigger routes it to `customers`.

On first sign-in the trigger creates the `customers` row; `AuthProvider` also upserts one as a fallback (`ensureCustomer`) for any public session without a profile.

## Supabase Auth configuration (dashboard)

Required for the above to work (project `shoeopxxjawmusgnjxfh`):

1. **Authentication → Providers → Google** — enable, paste the Google Cloud **OAuth client ID + secret**.
   - Google Cloud OAuth client (Web application):
     - **Authorized JavaScript origins:** `https://airluxo.ch`, `https://staging.airluxo.ch`, `http://localhost:5173`
     - **Authorized redirect URI:** `https://shoeopxxjawmusgnjxfh.supabase.co/auth/v1/callback`
2. **Authentication → URL Configuration** — Site URL `https://airluxo.ch`; Redirect URLs `https://airluxo.ch/**`, `https://staging.airluxo.ch/**`, `http://localhost:5173/**` (the `/**` also covers the partner `/?reset=1` flow).
3. **Authentication → Emails → SMTP Settings** — Enable Custom SMTP (Resend) so magic-link emails deliver reliably:
   `smtp.resend.com:465`, user `resend`, password = a Resend API key, sender `AirLuxo News <noreply@send.airluxo.ch>`. (The built-in mailer works for dev but is rate-limited.)

## Data model

- **`public.customers`** — `id` (= `auth.users.id`), `full_name`, `email`, `phone`, `avatar_url`, `licence` (jsonb, verified licence on file), `licence_verified`, `marketing_opt_in` (newsletter), `address` (jsonb, saved address). RLS: own-row only.
- **`public.favourites`** — `(user_id, listing_id)` saved cars. RLS: own-row only.
- **`bookings.user_id`** — links a booking to its customer. A customer SELECT policy returns rows where `auth.uid() = user_id` **OR** the JWT email matches `guest_email` (auto-links bookings made before the account existed). Bookings remain insertable anonymously (the embed); the main site stamps `user_id`. The FK is `ON DELETE SET NULL` so account deletion keeps the booking for the partner but unlinks the person.

## Edge functions
- **`delete-account`** (verify_jwt on) — GDPR "delete my account & data". Identifies the caller from their JWT, then service-role-deletes the auth user → cascades `customers` + `favourites`, nulls `bookings.user_id`.
- **`newsletter-subscribe`** (verify_jwt off) — subscribe/unsubscribe a contact in the Resend Audience; pass `{ subscribed: false }` to opt out. Used by the profile newsletter toggle and the footer signup.

## Customer profile (`CustomerAccount.jsx`)
Tabs: **My trips · Saved · Licence · Account**. Licence tab reuses `LicenceCapture.jsx` (the booking KYC flow) to add/replace a licence on file. Account tab: personal info + avatar upload (`uploadListingPhoto`) + saved address (Swiss geo autocomplete), email preferences (newsletter toggle → `setNewsletter`), and privacy (cookie settings via `openConsentSettings`, privacy link, delete account).

## Frontend touch-points

- `src/lib/auth.jsx` — `AuthProvider`; exposes `customer`, `isCustomer`, `isPartner`, `openAuth/closeAuth`, `signInWithGoogle`, `sendEmailLink`, `ensureCustomer`.
- `src/components/AuthModal.jsx` — combined log-in/sign-up (Google + email). Mounted once in `App.jsx` Shell. A phone-OTP tab slot is left for a future increment (see BACKLOG).
- `src/components/AccountMenu.jsx` — top-right menu in `Nav` (logged-out vs logged-in).
- `src/components/CustomerAccount.jsx` — profile route (`account`): Trips / Saved / Licence / Account.
- `src/components/CarDetail.jsx` — booking gate + profile prefill + `user_id` stamping + licence-on-file save.
- `src/lib/favourites.js` + `src/components/CarCard.jsx` — wishlist hearts.

## Notes

Account creation (Google / email link) redirects away and back. Because booking no longer depends on login, there's no redirect-resume concern for the booking flow — the booking is already saved before the account prompt, and it auto-links by email when the guest finishes signing up.

## Deferred

**Phone OTP** sign-in — needs an SMS provider (Twilio/MessageBird native, or a custom OTP edge function for OneSignal). See BACKLOG.
