import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, rmSync } from "fs";
import { mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

let dataDir;

async function loadStore() {
  vi.resetModules();
  process.env.ASC_DATA_DIR = dataDir;
  return import("../../server/lib/account-store.js");
}

function seedAccounts(accounts) {
  writeFileSync(join(dataDir, "accounts.json"), JSON.stringify(accounts, null, 2), "utf8");
}

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "asc-accounts-"));
});

afterEach(() => {
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
  delete process.env.ASC_DATA_DIR;
});

describe("account-store updateAccount", () => {
  const baseAccount = {
    id: "acc-1",
    name: "Test Co",
    issuerId: "issuer-old",
    keyId: "KEYOLD1234",
    privateKey: "-----BEGIN PRIVATE KEY-----\nold\n-----END PRIVATE KEY-----",
    color: "#3b82f6",
    vendorNumber: "81234567",
  };

  it("updates fields and preserves privateKey when omitted", async () => {
    seedAccounts([{ ...baseAccount }]);
    const store = await loadStore();

    const result = store.updateAccount("acc-1", {
      name: "Updated Co",
      issuerId: "issuer-new",
      keyId: "KEYNEW1234",
      color: "#22c55e",
    });

    expect(result.error).toBeUndefined();
    expect(result.name).toBe("Updated Co");
    expect(result.issuerId).toBe("issuer-new");
    expect(result.keyId).toBe("KEYNEW1234");
    expect(result.color).toBe("#22c55e");
    expect(result.privateKey).toBeUndefined();

    const raw = store.getAccountById("acc-1");
    expect(raw.privateKey).toBe(baseAccount.privateKey);
  });

  it("updates privateKey when provided", async () => {
    seedAccounts([{ ...baseAccount }]);
    const store = await loadStore();

    const newKey = "-----BEGIN PRIVATE KEY-----\nnew\n-----END PRIVATE KEY-----";
    store.updateAccount("acc-1", { privateKey: newKey });

    const raw = store.getAccountById("acc-1");
    expect(raw.privateKey).toBe(newKey);
  });

  it("clears vendorNumber when empty string passed", async () => {
    seedAccounts([{ ...baseAccount }]);
    const store = await loadStore();

    const result = store.updateAccount("acc-1", { vendorNumber: "" });
    expect(result.vendorNumber).toBeUndefined();

    const raw = store.getAccountById("acc-1");
    expect(raw.vendorNumber).toBeUndefined();
  });

  it("returns null when account not found", async () => {
    seedAccounts([]);
    const store = await loadStore();
    expect(store.updateAccount("missing", { name: "Nope" })).toBeNull();
  });

  it("returns error when name is empty", async () => {
    seedAccounts([{ ...baseAccount }]);
    const store = await loadStore();
    const result = store.updateAccount("acc-1", { name: "   " });
    expect(result.error).toBe("name cannot be empty");
  });

  it("sanitizeAccount strips privateKey", async () => {
    seedAccounts([{ ...baseAccount }]);
    const store = await loadStore();
    const account = store.getAccountById("acc-1");
    const safe = store.sanitizeAccount(account);
    expect(safe.privateKey).toBeUndefined();
    expect(safe.issuerId).toBe("issuer-old");
  });
});
