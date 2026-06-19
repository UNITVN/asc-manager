import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../../server/lib/account-store.js", () => ({
  getAccounts: vi.fn(() => [
    { id: "acc-1", name: "Test Account" },
  ]),
}));

vi.mock("../../server/lib/asc-client.js", () => ({
  ascFetch: vi.fn(),
}));

vi.mock("../../server/lib/cache.js", () => {
  const store = new Map();
  return {
    apiCache: {
      get: vi.fn((key) => store.get(key)),
      set: vi.fn((key, val) => store.set(key, val)),
      delete: vi.fn((key) => store.delete(key)),
      deleteByPrefix: vi.fn((prefix) => {
        for (const key of store.keys()) {
          if (key.startsWith(prefix)) store.delete(key);
        }
      }),
      _store: store,
    },
  };
});

import appsRouter from "../../server/routes/apps.js";
import { ascFetch } from "../../server/lib/asc-client.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/apps", appsRouter);
  return app;
}

const APP_ID = "app-1";
const VERSION_ID = "ver-1";
const SUBMISSION_ID = "sub-1";
const REJECT_URL = `/api/apps/${APP_ID}/versions/${VERSION_ID}/reject`;
const REJECT_BODY = { accountId: "acc-1" };

function mockVersionState(appStoreState) {
  return {
    data: {
      id: VERSION_ID,
      attributes: { appStoreState },
    },
  };
}

function mockVersionWithSubmission({ canReject = true, includeSubmission = true } = {}) {
  const data = {
    id: VERSION_ID,
    type: "appStoreVersions",
    attributes: { appStoreState: "PENDING_DEVELOPER_RELEASE" },
    relationships: {},
  };

  if (includeSubmission) {
    data.relationships.appStoreVersionSubmission = {
      data: { id: SUBMISSION_ID, type: "appStoreVersionSubmissions" },
    };
  }

  const result = { data };
  if (includeSubmission) {
    result.included = [
      {
        id: SUBMISSION_ID,
        type: "appStoreVersionSubmissions",
        attributes: { canReject },
      },
    ];
  }
  return result;
}

describe("POST /api/apps/:appId/versions/:versionId/reject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a PENDING_DEVELOPER_RELEASE version", async () => {
    ascFetch
      .mockResolvedValueOnce(mockVersionState("PENDING_DEVELOPER_RELEASE"))
      .mockResolvedValueOnce(mockVersionWithSubmission())
      .mockResolvedValueOnce({});

    const res = await request(createApp())
      .post(REJECT_URL)
      .send(REJECT_BODY);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, versionId: VERSION_ID });

    expect(ascFetch).toHaveBeenCalledTimes(3);
    expect(ascFetch).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ id: "acc-1" }),
      `/v1/appStoreVersionSubmissions/${SUBMISSION_ID}`,
      { method: "DELETE" }
    );
  });

  it("returns 400 when accountId is missing", async () => {
    const res = await request(createApp())
      .post(REJECT_URL)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("accountId is required");
    expect(ascFetch).not.toHaveBeenCalled();
  });

  it("returns 409 when version is not PENDING_DEVELOPER_RELEASE", async () => {
    ascFetch.mockResolvedValueOnce(mockVersionState("READY_FOR_SALE"));

    const res = await request(createApp())
      .post(REJECT_URL)
      .send(REJECT_BODY);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Version cannot be rejected from state: READY_FOR_SALE");
    expect(ascFetch).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when no submission is linked", async () => {
    ascFetch
      .mockResolvedValueOnce(mockVersionState("PENDING_DEVELOPER_RELEASE"))
      .mockResolvedValueOnce(mockVersionWithSubmission({ includeSubmission: false }));

    const res = await request(createApp())
      .post(REJECT_URL)
      .send(REJECT_BODY);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("No app store version submission found for this version");
    expect(ascFetch).toHaveBeenCalledTimes(2);
  });

  it("returns 409 when canReject is false", async () => {
    ascFetch
      .mockResolvedValueOnce(mockVersionState("PENDING_DEVELOPER_RELEASE"))
      .mockResolvedValueOnce(mockVersionWithSubmission({ canReject: false }));

    const res = await request(createApp())
      .post(REJECT_URL)
      .send(REJECT_BODY);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("This version cannot be rejected");
    expect(ascFetch).toHaveBeenCalledTimes(2);
  });

  it("returns 502 when ASC API fails", async () => {
    ascFetch
      .mockResolvedValueOnce(mockVersionState("PENDING_DEVELOPER_RELEASE"))
      .mockResolvedValueOnce(mockVersionWithSubmission())
      .mockRejectedValueOnce(new Error("ASC API error"));

    const res = await request(createApp())
      .post(REJECT_URL)
      .send(REJECT_BODY);

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("ASC API error");
  });
});