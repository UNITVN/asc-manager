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
import { apiCache } from "../../server/lib/cache.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/apps", appsRouter);
  return app;
}

const APP_ID = "app-1";
const VERSION_ID = "ver-1";
const SUBMIT_URL = `/api/apps/${APP_ID}/versions/${VERSION_ID}/submit`;
const SUBMIT_BODY = { accountId: "acc-1", platform: "IOS" };

function mockVersionState(appStoreState) {
  return {
    data: {
      id: VERSION_ID,
      attributes: { appStoreState, platform: "IOS" },
    },
  };
}

function mockUnresolvedSubmission(submissionId = "sub-unresolved") {
  return {
    data: [
      {
        id: submissionId,
        type: "reviewSubmissions",
        attributes: { state: "UNRESOLVED_ISSUES" },
        relationships: {
          items: { data: [{ type: "reviewSubmissionItems", id: "item-1" }] },
        },
      },
    ],
    included: [
      {
        id: "item-1",
        type: "reviewSubmissionItems",
        attributes: { state: "REJECTED" },
        relationships: {
          appStoreVersion: { data: { type: "appStoreVersions", id: VERSION_ID } },
        },
      },
    ],
  };
}

function mockPlatformSubmissions(submissions = []) {
  return { data: submissions };
}

function mockAttachedBuild(usesNonExemptEncryption = false) {
  return {
    data: {
      id: "build-1",
      attributes: { usesNonExemptEncryption },
    },
  };
}

function mockCancelComplete(submissionId) {
  return { data: { id: submissionId, attributes: { state: "COMPLETE" } } };
}

function mockReadySubmission(submissionId = "sub-ready") {
  return { data: [{ id: submissionId, attributes: { state: "READY_FOR_REVIEW" } }] };
}

function mockEmptySubmissionItems() {
  return { data: [], included: [] };
}

describe("POST /:appId/versions/:versionId/submit", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    apiCache._store.clear();
    app = createApp();
  });

  it("returns 400 when accountId is missing", async () => {
    const res = await request(app)
      .post(SUBMIT_URL)
      .send({ platform: "IOS" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("accountId is required");
  });

  it("returns 400 when platform is missing", async () => {
    const res = await request(app)
      .post(SUBMIT_URL)
      .send({ accountId: "acc-1" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("platform is required");
  });

  it("returns 409 for unsupported app store state", async () => {
    ascFetch.mockResolvedValueOnce(mockVersionState("WAITING_FOR_REVIEW"));

    const res = await request(app)
      .post(SUBMIT_URL)
      .send(SUBMIT_BODY);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Version cannot be submitted from state: WAITING_FOR_REVIEW");
    expect(ascFetch).toHaveBeenCalledTimes(1);
  });

  it("resubmits REJECTED version by canceling unresolved submission then submitting fresh", async () => {
    ascFetch
      .mockResolvedValueOnce(mockVersionState("REJECTED"))
      .mockResolvedValueOnce(mockUnresolvedSubmission("sub-99"))
      .mockResolvedValueOnce(mockPlatformSubmissions([
        { id: "sub-99", attributes: { state: "UNRESOLVED_ISSUES" } },
      ]))
      .mockResolvedValueOnce({ data: { id: "sub-99", attributes: { state: "CANCELING" } } })
      .mockResolvedValueOnce(mockCancelComplete("sub-99"))
      .mockResolvedValueOnce(mockAttachedBuild(true))
      .mockResolvedValueOnce(mockReadySubmission("sub-new"))
      .mockResolvedValueOnce(mockEmptySubmissionItems())
      .mockResolvedValueOnce({ data: { id: "item-new" } })
      .mockResolvedValueOnce({ data: { id: "sub-new" } });

    const res = await request(app)
      .post(SUBMIT_URL)
      .send(SUBMIT_BODY);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, versionId: VERSION_ID, resubmitted: true });

    const cancelCall = ascFetch.mock.calls.find(
      (call) => call[2]?.body?.data?.attributes?.canceled === true
    );
    expect(cancelCall).toBeDefined();
    expect(cancelCall[1]).toBe("/v1/reviewSubmissions/sub-99");

    const finalSubmitCall = ascFetch.mock.calls.find(
      (call) => call[2]?.body?.data?.attributes?.submitted === true
    );
    expect(finalSubmitCall).toBeDefined();
    expect(finalSubmitCall[1]).toBe("/v1/reviewSubmissions/sub-new");
  });

  it("resubmits PREPARE_FOR_SUBMISSION version with unresolved submission", async () => {
    ascFetch
      .mockResolvedValueOnce(mockVersionState("PREPARE_FOR_SUBMISSION"))
      .mockResolvedValueOnce(mockUnresolvedSubmission("sub-99"))
      .mockResolvedValueOnce(mockPlatformSubmissions([
        { id: "sub-99", attributes: { state: "UNRESOLVED_ISSUES" } },
      ]))
      .mockResolvedValueOnce({ data: { id: "sub-99", attributes: { state: "CANCELING" } } })
      .mockResolvedValueOnce(mockCancelComplete("sub-99"))
      .mockResolvedValueOnce(mockAttachedBuild(true))
      .mockResolvedValueOnce(mockReadySubmission("sub-new"))
      .mockResolvedValueOnce(mockEmptySubmissionItems())
      .mockResolvedValueOnce({ data: { id: "item-new" } })
      .mockResolvedValueOnce({ data: { id: "sub-new" } });

    const res = await request(app)
      .post(SUBMIT_URL)
      .send(SUBMIT_BODY);

    expect(res.status).toBe(200);
    expect(res.body.resubmitted).toBe(true);
  });

  it("returns 404 when REJECTED version has no unresolved submission", async () => {
    ascFetch
      .mockResolvedValueOnce(mockVersionState("REJECTED"))
      .mockResolvedValueOnce({ data: [], included: [] });

    const res = await request(app)
      .post(SUBMIT_URL)
      .send(SUBMIT_BODY);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("No unresolved review submission found for this version");
    expect(ascFetch).toHaveBeenCalledTimes(2);
  });

  it("submits PREPARE_FOR_SUBMISSION version via create-and-submit flow", async () => {
    ascFetch
      .mockResolvedValueOnce(mockVersionState("PREPARE_FOR_SUBMISSION"))
      .mockResolvedValueOnce({ data: [], included: [] })
      .mockResolvedValueOnce(mockAttachedBuild(true))
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { id: "sub-new" } })
      .mockResolvedValueOnce(mockEmptySubmissionItems())
      .mockResolvedValueOnce({ data: { id: "item-new" } })
      .mockResolvedValueOnce({ data: { id: "sub-new" } });

    const res = await request(app)
      .post(SUBMIT_URL)
      .send(SUBMIT_BODY);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, versionId: VERSION_ID });
    expect(ascFetch.mock.calls.some((call) => call[1] === "/v1/reviewSubmissions")).toBe(true);
    expect(ascFetch.mock.calls.some((call) => call[1] === "/v1/reviewSubmissionItems")).toBe(true);
  });

  it("resubmits DEVELOPER_REJECTED version after clearing stuck submissions", async () => {
    ascFetch
      .mockResolvedValueOnce(mockVersionState("DEVELOPER_REJECTED"))
      .mockResolvedValueOnce({ data: [], included: [] })
      .mockResolvedValueOnce(mockPlatformSubmissions([]))
      .mockResolvedValueOnce(mockAttachedBuild(true))
      .mockResolvedValueOnce(mockReadySubmission("sub-existing"))
      .mockResolvedValueOnce(mockEmptySubmissionItems())
      .mockResolvedValueOnce({ data: { id: "item-existing" } })
      .mockResolvedValueOnce({ data: { id: "sub-existing" } });

    const res = await request(app)
      .post(SUBMIT_URL)
      .send(SUBMIT_BODY);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, versionId: VERSION_ID, resubmitted: true });
  });

  it("returns 502 when a review is already waiting or in progress", async () => {
    ascFetch
      .mockResolvedValueOnce(mockVersionState("PREPARE_FOR_SUBMISSION"))
      .mockResolvedValueOnce(mockUnresolvedSubmission("sub-99"))
      .mockResolvedValueOnce(mockPlatformSubmissions([
        { id: "sub-active", attributes: { state: "WAITING_FOR_REVIEW" } },
      ]));

    const res = await request(app)
      .post(SUBMIT_URL)
      .send(SUBMIT_BODY);

    expect(res.status).toBe(502);
    expect(res.body.error).toContain("Cannot submit while a review is waiting for review");
  });
});
