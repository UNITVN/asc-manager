import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = process.env.ASC_DATA_DIR || join(process.cwd(), "data");
const ACCOUNTS_FILE = join(DATA_DIR, "accounts.json");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAccounts() {
  ensureDataDir();
  if (!existsSync(ACCOUNTS_FILE)) {
    return [];
  }
  const raw = readFileSync(ACCOUNTS_FILE, "utf8");
  try {
    const accounts = JSON.parse(raw);
    if (!Array.isArray(accounts)) {
      console.warn("accounts.json does not contain an array, returning empty list");
      return [];
    }
    return accounts;
  } catch (err) {
    console.warn("Failed to parse accounts.json:", err.message);
    return [];
  }
}

function writeAccounts(accounts) {
  ensureDataDir();
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf8");
}

export function getAccounts() {
  return readAccounts();
}

export function getAccountById(id) {
  return readAccounts().find((a) => a.id === id) || null;
}

export function sanitizeAccount(account) {
  const { privateKey, ...safe } = account;
  return safe;
}

export function updateAccount(id, updates) {
  const accounts = readAccounts();
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const account = accounts[index];

  if (updates.name !== undefined) {
    const trimmed = String(updates.name).trim();
    if (!trimmed) return { error: "name cannot be empty" };
    account.name = trimmed;
  }
  if (updates.issuerId !== undefined) {
    const trimmed = String(updates.issuerId).trim();
    if (!trimmed) return { error: "issuerId cannot be empty" };
    account.issuerId = trimmed;
  }
  if (updates.keyId !== undefined) {
    const trimmed = String(updates.keyId).trim();
    if (!trimmed) return { error: "keyId cannot be empty" };
    account.keyId = trimmed;
  }
  if (updates.color !== undefined) {
    account.color = updates.color;
  }
  if (updates.privateKey !== undefined && String(updates.privateKey).trim()) {
    account.privateKey = updates.privateKey;
  }
  if (updates.vendorNumber !== undefined) {
    const trimmed = String(updates.vendorNumber).trim();
    if (trimmed) {
      account.vendorNumber = trimmed;
    } else {
      delete account.vendorNumber;
    }
  }

  accounts[index] = account;
  writeAccounts(accounts);
  return sanitizeAccount(account);
}

export function addAccount({ name, issuerId, keyId, privateKey, color }) {
  const accounts = readAccounts();
  const account = {
    id: Date.now().toString(),
    name,
    issuerId,
    keyId,
    privateKey,
    color,
  };
  accounts.push(account);
  writeAccounts(accounts);
  return account;
}

export function deleteAccount(id) {
  const accounts = readAccounts();
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) return false;
  accounts.splice(index, 1);
  writeAccounts(accounts);
  return true;
}
