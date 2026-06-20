# AIRLUXO — Brainstorm

Raw product ideas, captured before they're shaped into plans. Promote anything
concrete into **BACKLOG.md** (roadmap) or a `docs/plans/*` plan once it's ready.

---

## Partner App — handover / return protocol + guest feedback

A mobile app (or mobile-web) for the **partner** (and, where noted, the **guest**) that
turns car handover and return into a structured, evidence-backed flow — so condition,
mileage, fuel and damages are logged with photo/video proof, and the guest leaves
feedback while the experience is fresh. Reduces disputes, speeds turnaround, and feeds
the dashboard. (Already teased as the "Mobile Übergabe-App" on the partner landing
roadmap — this is the functionality breakdown.)

### Return process (condition capture)
- **Exterior video scan** — record a guided walk-around video of the car's exterior
  (prompts to cover all sides), timestamped + attached to the booking as the canonical
  return-condition record.
- **Interior photos** — capture interior shots (seats, dash, boot) to document state on
  return.
- **Defect / damage logging** — mark scratches, dents, chips, etc.: tag each on the car
  (ideally pin to a body location), add a photo + note, and a severity. Builds a damage
  list tied to the booking.
- **Gauge photo → mileage + fuel** — photograph the instrument cluster to log the
  **odometer (km)** and **fuel level** at return (later: OCR/vision to auto-read the
  numbers from the photo). Compared against the pickup reading for distance + refuel.

### Guest feedback
- **Instant feedback page** — a page the guest reaches right after the trip (link/QR at
  return, or push) to rate the rental experience and leave comments while it's fresh.
  Feeds the partner dashboard (and could surface as trip ratings).

### Open questions / things to decide later
- **Pickup vs return parity** — the same capture flow likely runs at **pickup** too, so
  return diffs against a baseline (mileage, fuel, pre-existing damage). Confirm scope.
- **Who operates it** — partner-staff app vs guest self-service vs both; e-signature on
  the condition report (the landing roadmap also mentioned licence scan + e-signature).
- **Storage** — handover media is heavy; reuse the per-partner bucket folder convention
  (e.g. `brand-assets/<id>/cars/<listing>/…` or a dedicated handover bucket) and link to
  the booking. Consider retention limits.
- **Native app vs mobile web** — camera/video capture works in mobile web (getUserMedia);
  a native shell adds offline + smoother capture but is more to build/ship.
- **Dispute workflow** — how the damage list + media become a chargeable claim (deposit
  hold, guest acknowledgement, deductible).
