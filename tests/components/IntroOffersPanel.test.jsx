import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IntroOffersPanel from "../../src/components/IntroOffersPanel.jsx";
import { TERRITORIES } from "../../src/lib/territories.js";

vi.mock("../../src/api/introOffers.js", () => ({
  fetchIntroOffers: vi.fn(),
  applyIntroOffers: vi.fn(),
}));

vi.mock("../../src/api/index.js", () => ({
  fetchSubscriptionPricePoints: vi.fn(),
  fetchSubscriptionEqualizations: vi.fn(),
  fetchSubscriptionPrices: vi.fn(),
}));

import { fetchIntroOffers, applyIntroOffers } from "../../src/api/introOffers.js";
import {
  fetchSubscriptionPricePoints,
  fetchSubscriptionEqualizations,
  fetchSubscriptionPrices,
} from "../../src/api/index.js";

const PROPS = { productId: "sub-1", groupId: "grp-1", appId: "app-1", accountId: "acc-1" };

const USA_FREE = {
  id: "o1",
  territory: "USA",
  offerMode: "FREE_TRIAL",
  duration: "ONE_WEEK",
  numberOfPeriods: 1,
  planType: null,
  pricePointId: null,
  customerPrice: null,
};

async function openPanel(offers) {
  fetchIntroOffers.mockResolvedValue({ offers });
  const user = userEvent.setup();
  render(<IntroOffersPanel {...PROPS} />);
  await user.click(screen.getByRole("button", { name: /Introductory Offers/ }));
  await screen.findAllByLabelText("Offer mode for USA");
  return user;
}

describe("IntroOffersPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    applyIntroOffers.mockResolvedValue({ saved: 1, errors: [] });
    fetchSubscriptionPrices.mockResolvedValue({
      currentPrices: Object.fromEntries(TERRITORIES.map((t) => [t.code, {}])),
    });
  });

  it("loads offers only after expanding and shows the current offer", async () => {
    fetchIntroOffers.mockResolvedValue({ offers: [USA_FREE] });
    const user = userEvent.setup();
    render(<IntroOffersPanel {...PROPS} />);
    expect(fetchIntroOffers).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Introductory Offers/ }));

    expect(await screen.findByText("Free trial · 1 week")).toBeTruthy();
    expect(fetchIntroOffers).toHaveBeenCalledWith("app-1", "grp-1", "sub-1", "acc-1");
  });

  it("renders every territory without crashing when the subscription has no offers", async () => {
    await openPanel([]);
    expect(screen.getAllByLabelText("Offer mode for USA")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Apply/ })).toBeNull();
  });

  it("fills a free trial only for territories the subscription has a price in", async () => {
    fetchSubscriptionPrices.mockResolvedValue({ currentPrices: { USA: {}, VNM: {} } });
    const user = await openPanel([]);
    await user.selectOptions(screen.getByLabelText("Offer mode for all"), "FREE_TRIAL");
    await user.selectOptions(screen.getByLabelText("Duration for all"), "ONE_WEEK");
    await user.click(screen.getByRole("button", { name: "Fill all territories" }));
    expect(await screen.findByText("Filled 2 of 2 territories")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Apply/ }));

    await waitFor(() => expect(applyIntroOffers).toHaveBeenCalledTimes(1));
    const [, , , body] = applyIntroOffers.mock.calls[0];
    expect(body.accountId).toBe("acc-1");
    expect(body.changes.map((c) => c.territory).sort()).toEqual(["USA", "VNM"]);
    expect(body.changes.every((c) => c.offerMode === "FREE_TRIAL" && !("pricePointId" in c))).toBe(true);
  });

  it("says how many territories a paid fill skipped for lack of an equalized price", async () => {
    fetchSubscriptionPrices.mockResolvedValue({ currentPrices: { USA: {}, VNM: {}, FRA: {} } });
    fetchSubscriptionPricePoints.mockResolvedValue({ pricePoints: [{ id: "pp1", customerPrice: "4.99" }] });
    fetchSubscriptionEqualizations.mockResolvedValue({ equalizations: { VNM: { id: "pp-vn", customerPrice: "99000" } } });
    const user = await openPanel([]);
    await user.selectOptions(screen.getByLabelText("Offer mode for all"), "PAY_UP_FRONT");
    await user.click(screen.getByLabelText("USD price for all"));
    await user.selectOptions(await screen.findByLabelText("USD price for all"), "pp1");
    await user.click(screen.getByRole("button", { name: "Fill all territories" }));

    expect(await screen.findByText("Filled 2 of 3 territories")).toBeTruthy();
  });

  it("offers no way to delete an existing offer, only to change it", async () => {
    await openPanel([USA_FREE]);
    const optionValues = (label) =>
      [...screen.getByLabelText(label).querySelectorAll("option")].map((o) => o.value);

    expect(optionValues("Offer mode for USA")).toEqual(["FREE_TRIAL", "PAY_AS_YOU_GO", "PAY_UP_FRONT"]);
    expect(optionValues("Offer mode for VNM")).toEqual(["", "FREE_TRIAL", "PAY_AS_YOU_GO", "PAY_UP_FRONT"]);
  });

  it("does not send a paid mode that has no price yet and asks for one", async () => {
    const user = await openPanel([]);
    await user.selectOptions(screen.getByLabelText("Offer mode for USA"), "PAY_UP_FRONT");

    expect(screen.getByText("Pick a price")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Apply/ })).toBeNull();
    expect(applyIntroOffers).not.toHaveBeenCalled();
  });

  it("sends the chosen price point for a paid mode", async () => {
    fetchSubscriptionPricePoints.mockResolvedValue({ pricePoints: [{ id: "pp1", customerPrice: "4.99" }] });
    const user = await openPanel([]);
    await user.selectOptions(screen.getByLabelText("Offer mode for USA"), "PAY_UP_FRONT");
    await user.click(screen.getByLabelText("Price for USA"));
    await user.selectOptions(await screen.findByLabelText("Price for USA"), "pp1");
    await user.click(screen.getByRole("button", { name: /^Apply/ }));

    await waitFor(() => expect(applyIntroOffers).toHaveBeenCalled());
    expect(applyIntroOffers.mock.calls[0][3].changes).toEqual([
      {
        territory: "USA",
        offerMode: "PAY_UP_FRONT",
        duration: "ONE_WEEK",
        numberOfPeriods: 1,
        pricePointId: "pp1",
      },
    ]);
  });

  it("keeps a failed territory pending and clears the saved one", async () => {
    applyIntroOffers.mockResolvedValue({ saved: 1, errors: [{ territory: "USA", message: "nope" }] });
    const user = await openPanel([]);
    await user.selectOptions(screen.getByLabelText("Offer mode for USA"), "FREE_TRIAL");
    await user.selectOptions(screen.getByLabelText("Offer mode for VNM"), "FREE_TRIAL");
    expect(screen.getByText("2 pending")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Apply/ }));

    expect(await screen.findByText("USA: nope")).toBeTruthy();
    expect(screen.getByText("1 pending")).toBeTruthy();
  });

  it("keeps a draft that was never sent because it is incomplete", async () => {
    const user = await openPanel([]);
    await user.selectOptions(screen.getByLabelText("Offer mode for USA"), "PAY_UP_FRONT");
    await user.selectOptions(screen.getByLabelText("Offer mode for VNM"), "FREE_TRIAL");

    await user.click(screen.getByRole("button", { name: /^Apply/ }));

    await waitFor(() => expect(applyIntroOffers).toHaveBeenCalled());
    expect(applyIntroOffers.mock.calls[0][3].changes.map((c) => c.territory)).toEqual(["VNM"]);
    expect(await screen.findByText("1 incomplete")).toBeTruthy();
    expect(screen.queryByText(/pending/)).toBeNull();
    expect(screen.getByText("Pick a price")).toBeTruthy();
  });

  it("counts only sendable drafts as pending and incomplete ones separately", async () => {
    const user = await openPanel([]);
    await user.selectOptions(screen.getByLabelText("Offer mode for USA"), "PAY_UP_FRONT");
    await user.selectOptions(screen.getByLabelText("Offer mode for VNM"), "FREE_TRIAL");

    expect(screen.getByText("1 pending")).toBeTruthy();
    expect(screen.getByText("1 incomplete")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Apply 1 offer change" })).toBeTruthy();
  });

  it("names the real problem when the period count is invalid, not a missing price", async () => {
    const user = await openPanel([]);
    await user.selectOptions(screen.getByLabelText("Offer mode for USA"), "FREE_TRIAL");
    await user.clear(screen.getByLabelText("Periods for USA"));

    expect(screen.getByText("Enter a period count of 1 or more")).toBeTruthy();
    expect(screen.queryByText("Pick a price")).toBeNull();
  });

  it("still shows the save errors when reloading the offers afterwards fails", async () => {
    applyIntroOffers.mockResolvedValue({ saved: 0, errors: [{ territory: "USA", message: "nope" }] });
    const user = await openPanel([]);
    fetchIntroOffers.mockRejectedValue(new Error("reload failed"));
    await user.selectOptions(screen.getByLabelText("Offer mode for USA"), "FREE_TRIAL");
    await user.click(screen.getByRole("button", { name: /^Apply/ }));

    expect(await screen.findByText("reload failed")).toBeTruthy();
    expect(screen.getByText("USA: nope")).toBeTruthy();
  });

  it("refetches the offers when the request itself fails so retries use fresh offer ids", async () => {
    applyIntroOffers.mockRejectedValue(new Error("gateway timeout"));
    const user = await openPanel([USA_FREE]);
    await user.selectOptions(screen.getByLabelText("Duration for USA"), "ONE_MONTH");
    expect(fetchIntroOffers).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /^Apply/ }));

    await waitFor(() => expect(fetchIntroOffers).toHaveBeenCalledTimes(2));
  });

  it("mentions price only for paid modes, never for free trial", async () => {
    const user = await openPanel([]);
    expect(screen.queryByText(/USD price/)).toBeNull();

    await user.selectOptions(screen.getByLabelText("Offer mode for all"), "FREE_TRIAL");
    expect(screen.queryByText(/USD price/)).toBeNull();
    expect(screen.queryByLabelText("USD price for all")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Offer mode for USA"), "FREE_TRIAL");
    expect(screen.queryByLabelText("Price for USA")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Offer mode for all"), "PAY_UP_FRONT");
    expect(screen.getByText(/Pick a USD price/)).toBeTruthy();
    expect(screen.getByLabelText("USD price for all")).toBeTruthy();
  });
});
