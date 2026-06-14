import { Router } from "express";
import {
  getAccounts,
  getAccountById,
  sanitizeAccount,
  addAccount,
  updateAccount,
  deleteAccount,
} from "../lib/account-store.js";

const router = Router();

router.get("/", (_req, res) => {
  const accounts = getAccounts();
  res.json(
    accounts.map((a) => ({
      id: a.id,
      name: a.name,
      color: a.color,
    }))
  );
});

router.get("/:id", (req, res) => {
  const account = getAccountById(req.params.id);
  if (!account) {
    return res.status(404).json({ error: "Account not found" });
  }
  res.json(sanitizeAccount(account));
});

router.post("/", (req, res) => {
  const { name, issuerId, keyId, privateKey, color } = req.body;
  if (!name || !issuerId || !keyId || !privateKey) {
    return res.status(400).json({ error: "Missing required fields: name, issuerId, keyId, privateKey" });
  }
  const account = addAccount({ name, issuerId, keyId, privateKey, color });
  res.status(201).json({ id: account.id, name: account.name, color: account.color });
});

router.patch("/:id", (req, res) => {
  const { name, issuerId, keyId, privateKey, color, vendorNumber } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (issuerId !== undefined) updates.issuerId = issuerId;
  if (keyId !== undefined) updates.keyId = keyId;
  if (privateKey !== undefined) updates.privateKey = privateKey;
  if (color !== undefined) updates.color = color;
  if (vendorNumber !== undefined) updates.vendorNumber = vendorNumber;

  if (vendorNumber !== undefined) {
    const trimmed = String(vendorNumber).trim();
    if (trimmed && !/^\d+$/.test(trimmed)) {
      return res.status(400).json({ error: "vendorNumber must be numeric" });
    }
  }

  const result = updateAccount(req.params.id, updates);
  if (!result) {
    return res.status(404).json({ error: "Account not found" });
  }
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result);
});

router.delete("/:id", (req, res) => {
  const deleted = deleteAccount(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: "Account not found" });
  }
  res.status(204).end();
});

export default router;
