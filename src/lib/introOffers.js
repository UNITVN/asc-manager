// Helpers for subscription introductory offers (App Store Connect).

export const OFFER_MODES = [
  { value: "FREE_TRIAL", label: "Free trial" },
  { value: "PAY_AS_YOU_GO", label: "Pay as you go" },
  { value: "PAY_UP_FRONT", label: "Pay up front" },
];

export const OFFER_DURATIONS = [
  { value: "THREE_DAYS", label: "3 days" },
  { value: "ONE_WEEK", label: "1 week" },
  { value: "TWO_WEEKS", label: "2 weeks" },
  { value: "ONE_MONTH", label: "1 month" },
  { value: "TWO_MONTHS", label: "2 months" },
  { value: "THREE_MONTHS", label: "3 months" },
  { value: "SIX_MONTHS", label: "6 months" },
  { value: "ONE_YEAR", label: "1 year" },
];

export const PLAN_TYPES = ["MONTHLY", "UPFRONT"];

const labelOf = (list, value) => list.find((x) => x.value === value)?.label || value;

export function describeOffer(offer, currency) {
  if (!offer) return "";
  const mode = labelOf(OFFER_MODES, offer.offerMode);
  const duration = labelOf(OFFER_DURATIONS, offer.duration);
  const price = offer.customerPrice ? `${currency} ${offer.customerPrice}` : null;
  const periods = offer.numberOfPeriods > 1 ? `${offer.numberOfPeriods} × ${duration}` : duration;

  // Pay as you go charges the price every period, so the price multiplies the periods.
  if (offer.offerMode === "PAY_AS_YOU_GO" && price) return `${mode} · ${price} × ${periods}`;
  return [mode, price, periods].filter(Boolean).join(" · ");
}

const isPaid = (mode) => mode === "PAY_AS_YOU_GO" || mode === "PAY_UP_FRONT";

export function isDraftComplete(draft) {
  if (!draft?.offerMode || !draft.duration) return false;
  if (!Number.isInteger(draft.numberOfPeriods) || draft.numberOfPeriods < 1) return false;
  return !isPaid(draft.offerMode) || !!draft.pricePointId;
}

export function draftMatchesOffer(draft, offer) {
  if (!offer) return false;
  if (draft.offerMode !== offer.offerMode) return false;
  if (draft.duration !== offer.duration) return false;
  if (draft.numberOfPeriods !== offer.numberOfPeriods) return false;
  if ((draft.planType || null) !== (offer.planType || null)) return false;
  return !isPaid(draft.offerMode) || (draft.pricePointId || null) === (offer.pricePointId || null);
}

// drafts: territory -> draft; offersByTerritory: territory -> existing offer
export function buildChanges(drafts, offersByTerritory) {
  const changes = [];
  for (const [territory, draft] of drafts) {
    const existing = offersByTerritory.get(territory);

    if (!isDraftComplete(draft) || draftMatchesOffer(draft, existing)) continue;

    const change = {
      territory,
      offerMode: draft.offerMode,
      duration: draft.duration,
      numberOfPeriods: draft.numberOfPeriods,
    };
    if (existing) {
      change.existingOfferId = existing.id;
      // Lets the server put the old offer back if Apple rejects the replacement.
      change.previous = {
        offerMode: existing.offerMode,
        duration: existing.duration,
        numberOfPeriods: existing.numberOfPeriods,
      };
      if (existing.planType) change.previous.planType = existing.planType;
      if (existing.pricePointId) change.previous.pricePointId = existing.pricePointId;
    }
    if (draft.planType) change.planType = draft.planType;
    if (isPaid(draft.offerMode)) change.pricePointId = draft.pricePointId;
    changes.push(change);
  }
  return changes;
}
