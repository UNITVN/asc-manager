import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../server/lib/asc-client.js", () => ({
  ascFetch: vi.fn(),
}));

import { ascFetch } from "../../server/lib/asc-client.js";
import {
  territoryIsSelling,
  isAppCurrentlyOnSale,
  getAppSaleStatus,
  shouldCheckSaleStatus,
  needsSaleStatusLookup,
  resolveAppListStatus,
} from "../../server/lib/app-sale-status.js";

const account = { id: "acc-1", name: "Test Account" };

describe("shouldCheckSaleStatus", () => {
  it("checks post-approval states like PENDING_DEVELOPER_RELEASE", () => {
    expect(shouldCheckSaleStatus("PENDING_DEVELOPER_RELEASE")).toBe(true);
    expect(shouldCheckSaleStatus("READY_FOR_SALE")).toBe(true);
    expect(shouldCheckSaleStatus("READY_FOR_DISTRIBUTION")).toBe(true);
  });

  it("skips pre-release workflow and already-removed states", () => {
    expect(shouldCheckSaleStatus("PREPARE_FOR_SUBMISSION")).toBe(false);
    expect(shouldCheckSaleStatus("IN_REVIEW")).toBe(false);
    expect(shouldCheckSaleStatus("REMOVED_FROM_SALE")).toBe(false);
  });
});

describe("needsSaleStatusLookup", () => {
  it("includes PREPARE_FOR_SUBMISSION for published apps removed from sale", () => {
    expect(needsSaleStatusLookup("PREPARE_FOR_SUBMISSION")).toBe(true);
    expect(needsSaleStatusLookup("IN_REVIEW")).toBe(false);
  });
});

describe("resolveAppListStatus", () => {
  it("keeps PREPARE_FOR_SUBMISSION for apps that were never published", () => {
    expect(
      resolveAppListStatus("PREPARE_FOR_SUBMISSION", { onSale: false, hasAvailability: false })
    ).toBe("PREPARE_FOR_SUBMISSION");
  });

  it("shows Removed for published apps off sale with a draft version", () => {
    expect(
      resolveAppListStatus("PREPARE_FOR_SUBMISSION", { onSale: false, hasAvailability: true })
    ).toBe("REMOVED_FROM_SALE");
  });

  it("overrides post-approval states when off sale", () => {
    expect(
      resolveAppListStatus("PENDING_DEVELOPER_RELEASE", { onSale: false, hasAvailability: true })
    ).toBe("REMOVED_FROM_SALE");
  });
});

describe("territoryIsSelling", () => {
  it("returns false when Apple blocks sale with CANNOT_SELL", () => {
    expect(
      territoryIsSelling({ available: true, contentStatuses: ["CANNOT_SELL"] })
    ).toBe(false);
  });

  it("returns false when developer removed territory from sale", () => {
    expect(territoryIsSelling({ available: false, contentStatuses: [] })).toBe(false);
  });

  it("returns true when territory is AVAILABLE", () => {
    expect(
      territoryIsSelling({ available: true, contentStatuses: ["AVAILABLE"] })
    ).toBe(true);
  });

  it("returns true when mixed territories include at least one selling region", () => {
    expect(
      territoryIsSelling({ available: true, contentStatuses: ["AVAILABLE"] })
    ).toBe(true);
    expect(
      territoryIsSelling({ available: true, contentStatuses: ["CANNOT_SELL"] })
    ).toBe(false);
  });

  it("falls back to available when contentStatuses are empty", () => {
    expect(territoryIsSelling({ available: true, contentStatuses: [] })).toBe(true);
    expect(territoryIsSelling({ available: false, contentStatuses: [] })).toBe(false);
  });
});

describe("getAppSaleStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports hasAvailability false when availability is missing", async () => {
    ascFetch.mockRejectedValueOnce(new Error("ASC API 404: NOT_FOUND"));

    expect(await getAppSaleStatus(account, "app-1")).toEqual({
      onSale: false,
      hasAvailability: false,
    });
  });

  it("reports hasAvailability true when territories exist but none sell", async () => {
    ascFetch
      .mockResolvedValueOnce({
        data: { id: "avail-1", type: "appAvailabilities" },
      })
      .mockResolvedValueOnce({
        data: [
          {
            type: "territoryAvailabilities",
            id: "ta-1",
            attributes: { available: true, contentStatuses: ["CANNOT_SELL"] },
          },
        ],
        links: {},
      });

    expect(await getAppSaleStatus(account, "app-1")).toEqual({
      onSale: false,
      hasAvailability: true,
    });
  });
});

describe("isAppCurrentlyOnSale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when all territories are Apple-blocked", async () => {
    ascFetch
      .mockResolvedValueOnce({
        data: { id: "avail-1", type: "appAvailabilities" },
      })
      .mockResolvedValueOnce({
        data: [
          {
            type: "territoryAvailabilities",
            id: "ta-1",
            attributes: { available: true, contentStatuses: ["CANNOT_SELL"] },
          },
          {
            type: "territoryAvailabilities",
            id: "ta-2",
            attributes: { available: true, contentStatuses: ["CANNOT_SELL"] },
          },
        ],
        links: {},
      });

    expect(await isAppCurrentlyOnSale(account, "app-1")).toBe(false);
    expect(ascFetch).toHaveBeenCalledTimes(2);
    expect(ascFetch.mock.calls[1][1]).toContain("limit=50");
  });

  it("returns false when all territories are developer-removed", async () => {
    ascFetch
      .mockResolvedValueOnce({
        data: { id: "avail-1", type: "appAvailabilities" },
      })
      .mockResolvedValueOnce({
        data: [
          {
            type: "territoryAvailabilities",
            id: "ta-1",
            attributes: { available: false, contentStatuses: [] },
          },
          {
            type: "territoryAvailabilities",
            id: "ta-2",
            attributes: { available: false, contentStatuses: [] },
          },
        ],
        links: {},
      });

    expect(await isAppCurrentlyOnSale(account, "app-1")).toBe(false);
  });

  it("returns true when at least one territory is selling", async () => {
    ascFetch
      .mockResolvedValueOnce({
        data: { id: "avail-1", type: "appAvailabilities" },
      })
      .mockResolvedValueOnce({
        data: [
          {
            type: "territoryAvailabilities",
            id: "ta-1",
            attributes: { available: true, contentStatuses: ["CANNOT_SELL"] },
          },
          {
            type: "territoryAvailabilities",
            id: "ta-2",
            attributes: { available: true, contentStatuses: ["AVAILABLE"] },
          },
        ],
        links: {},
      });

    expect(await isAppCurrentlyOnSale(account, "app-1")).toBe(true);
  });

  it("paginates territory availabilities across pages", async () => {
    ascFetch
      .mockResolvedValueOnce({
        data: { id: "avail-1", type: "appAvailabilities" },
      })
      .mockResolvedValueOnce({
        data: [
          {
            type: "territoryAvailabilities",
            id: "ta-1",
            attributes: { available: true, contentStatuses: ["CANNOT_SELL"] },
          },
        ],
        links: {
          next: "https://api.appstoreconnect.apple.com/v2/appAvailabilities/avail-1/territoryAvailabilities?cursor=page2",
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            type: "territoryAvailabilities",
            id: "ta-2",
            attributes: { available: true, contentStatuses: ["AVAILABLE"] },
          },
        ],
        links: {},
      });

    expect(await isAppCurrentlyOnSale(account, "app-1")).toBe(true);
    expect(ascFetch).toHaveBeenCalledTimes(3);
  });

  it("returns false when app availability is missing", async () => {
    ascFetch.mockRejectedValueOnce(new Error("ASC API 404: NOT_FOUND"));

    expect(await isAppCurrentlyOnSale(account, "app-1")).toBe(false);
  });

  it("fetches territory availabilities when not included in first response", async () => {
    ascFetch
      .mockResolvedValueOnce({
        data: { id: "avail-1", type: "appAvailabilities" },
      })
      .mockResolvedValueOnce({
        data: [
          {
            type: "territoryAvailabilities",
            id: "ta-1",
            attributes: { available: false, contentStatuses: [] },
          },
        ],
        links: {},
      });

    expect(await isAppCurrentlyOnSale(account, "app-1")).toBe(false);
    expect(ascFetch).toHaveBeenCalledTimes(2);
  });

  it("returns false when availability exists but has no territories", async () => {
    ascFetch
      .mockResolvedValueOnce({
        data: { id: "avail-1", type: "appAvailabilities" },
      })
      .mockResolvedValueOnce({
        data: [],
        links: {},
      });

    expect(await isAppCurrentlyOnSale(account, "app-1")).toBe(false);
  });

  it("returns false when territories are processing to not available", async () => {
    ascFetch
      .mockResolvedValueOnce({
        data: { id: "avail-1", type: "appAvailabilities" },
      })
      .mockResolvedValueOnce({
        data: [
          {
            type: "territoryAvailabilities",
            id: "ta-1",
            attributes: { available: true, contentStatuses: ["PROCESSING_TO_NOT_AVAILABLE"] },
          },
        ],
        links: {},
      });

    expect(await isAppCurrentlyOnSale(account, "app-1")).toBe(false);
  });
});
