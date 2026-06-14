export async function fetchApps({ fresh = false } = {}) {
  const url = fresh ? "/api/apps?fresh=true" : "/api/apps";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch apps: ${res.status}`);
  const data = await res.json();
  return data.map((app) => ({ ...app, iconUrl: app.iconUrl || null }));
}

export async function fetchAccounts() {
  const res = await fetch("/api/accounts");
  if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.status}`);
  return res.json();
}

export async function createAccount({ name, issuerId, keyId, privateKey, color }) {
  const res = await fetch("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, issuerId, keyId, privateKey, color }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create account: ${res.status}`);
  }
  return res.json();
}

export async function deleteAccount(id) {
  const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete account: ${res.status}`);
}

export async function fetchVersions(appId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/versions?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch versions: ${res.status}`);
  return res.json();
}

export async function createVersion(appId, accountId, versionString, platform) {
  const res = await fetch(`/api/apps/${appId}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, versionString, platform }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create version: ${res.status}`);
  }
  return res.json();
}

export async function submitForReview(appId, versionId, accountId, platform) {
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, platform }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to submit for review: ${res.status}`);
  }
  return res.json();
}

export async function fetchVersionDetail(appId, versionId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch version detail: ${res.status}`);
  return res.json();
}

export async function fetchVersionBuilds(appId, accountId, versionString) {
  const params = new URLSearchParams({ accountId });
  if (versionString) params.set("versionString", versionString);
  const res = await fetch(`/api/apps/${appId}/builds?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch builds: ${res.status}`);
  return res.json();
}

export async function fetchAttachedBuild(appId, versionId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}/build?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch attached build: ${res.status}`);
  return res.json();
}

export async function attachBuild(appId, versionId, buildId, accountId) {
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}/build`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, buildId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to attach build: ${res.status}`);
  }
  return res.json();
}

// ── Build Encryption Compliance ──────────────────────────────────────────────

export async function fetchBuildEncryptionDeclaration(appId, buildId, accountId) {
  const res = await fetch(`/api/apps/${appId}/builds/${buildId}/encryptionDeclaration?accountId=${accountId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch encryption declaration: ${res.status}`);
  }
  return res.json();
}

export async function updateBuildEncryptionDeclaration(appId, buildId, data) {
  const res = await fetch(`/api/apps/${appId}/builds/${buildId}/encryptionDeclaration`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update encryption declaration: ${res.status}`);
  }
  return res.json();
}

// ── Version Settings (release type, phased release, rating reset) ────────────

export async function updateVersionRelease(appId, versionId, { accountId, releaseType, earliestReleaseDate, resetRatingSummary }) {
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, releaseType, earliestReleaseDate, resetRatingSummary }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update version release: ${res.status}`);
  }
  return res.json();
}

export async function createPhasedRelease(appId, versionId, { accountId, phasedReleaseState }) {
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}/phased-release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, phasedReleaseState }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create phased release: ${res.status}`);
  }
  return res.json();
}

export async function updatePhasedRelease(appId, versionId, phasedReleaseId, { accountId, phasedReleaseState }) {
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}/phased-release/${phasedReleaseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, phasedReleaseState }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update phased release: ${res.status}`);
  }
  return res.json();
}

export async function deletePhasedRelease(appId, versionId, phasedReleaseId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}/phased-release/${phasedReleaseId}?${params}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete phased release: ${res.status}`);
  }
  return res.json();
}

export async function fetchAppLookup(bundleId) {
  const params = new URLSearchParams({ bundleId });
  const res = await fetch(`/api/apps/lookup?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch app lookup: ${res.status}`);
  return res.json();
}

// ── Version Localizations ───────────────────────────────────────────────────

export async function fetchVersionLocalizations(appId, versionId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}/localizations?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch version localizations: ${res.status}`);
  return res.json();
}

export async function createVersionLocalization(appId, versionId, { accountId, locale, ...fields }) {
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}/localizations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, locale, ...fields }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create version localization: ${res.status}`);
  }
  return res.json();
}

export async function updateVersionLocalization(appId, versionId, locId, { accountId, ...fields }) {
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}/localizations/${locId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, ...fields }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update version localization: ${res.status}`);
  }
  return res.json();
}

export async function deleteVersionLocalization(appId, versionId, locId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}/localizations/${locId}?${params}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete version localization: ${res.status}`);
  }
  return res.json();
}

// ── Review Submissions ──────────────────────────────────────────────────────

export async function fetchReviewSubmissions(appId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/review-submissions?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch review submissions: ${res.status}`);
  return res.json();
}

export async function fetchReviewSubmissionDetail(appId, submissionId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/review-submissions/${submissionId}?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch review submission detail: ${res.status}`);
  return res.json();
}

// ── In-App Purchases ─────────────────────────────────────────────────────────

export async function fetchIAPs(appId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/iap?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch IAPs: ${res.status}`);
  return res.json();
}

export async function createIAP(appId, { accountId, name, productId, type }) {
  const res = await fetch(`/api/apps/${appId}/iap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, name, productId, type }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create IAP: ${res.status}`);
  }
  return res.json();
}

export async function updateIAP(appId, iapId, { accountId, name, familySharable, reviewNote }) {
  const res = await fetch(`/api/apps/${appId}/iap/${iapId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, name, familySharable, reviewNote }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update IAP: ${res.status}`);
  }
  return res.json();
}

export async function deleteIAP(appId, iapId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/iap/${iapId}?${params}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete IAP: ${res.status}`);
  }
  return res.json();
}

// ── IAP Localizations ────────────────────────────────────────────────────────

export async function fetchIAPLocalizations(appId, iapId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/iap/${iapId}/localizations?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch IAP localizations: ${res.status}`);
  return res.json();
}

export async function createIAPLocalization(appId, iapId, { accountId, locale, name, description }) {
  const res = await fetch(`/api/apps/${appId}/iap/${iapId}/localizations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, locale, name, description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create IAP localization: ${res.status}`);
  }
  return res.json();
}

export async function updateIAPLocalization(appId, iapId, locId, { accountId, name, description }) {
  const res = await fetch(`/api/apps/${appId}/iap/${iapId}/localizations/${locId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, name, description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update IAP localization: ${res.status}`);
  }
  return res.json();
}

export async function deleteIAPLocalization(appId, iapId, locId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/iap/${iapId}/localizations/${locId}?${params}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete IAP localization: ${res.status}`);
  }
  return res.json();
}

// ── Subscription Groups ──────────────────────────────────────────────────────

export async function fetchSubscriptionGroups(appId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/subscription-groups?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch subscription groups: ${res.status}`);
  return res.json();
}

export async function createSubscriptionGroup(appId, { accountId, referenceName }) {
  const res = await fetch(`/api/apps/${appId}/subscription-groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, referenceName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create subscription group: ${res.status}`);
  }
  return res.json();
}

export async function updateSubscriptionGroup(appId, groupId, { accountId, referenceName }) {
  const res = await fetch(`/api/apps/${appId}/subscription-groups/${groupId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, referenceName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update subscription group: ${res.status}`);
  }
  return res.json();
}

export async function deleteSubscriptionGroup(appId, groupId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/subscription-groups/${groupId}?${params}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete subscription group: ${res.status}`);
  }
  return res.json();
}

// ── Subscriptions ────────────────────────────────────────────────────────────

export async function fetchSubscriptions(appId, groupId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/subscription-groups/${groupId}/subscriptions?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch subscriptions: ${res.status}`);
  return res.json();
}

export async function createSubscription(appId, groupId, { accountId, name, productId, subscriptionPeriod }) {
  const res = await fetch(`/api/apps/${appId}/subscription-groups/${groupId}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, name, productId, subscriptionPeriod }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create subscription: ${res.status}`);
  }
  return res.json();
}

export async function updateSubscription(appId, groupId, subId, { accountId, name, subscriptionPeriod, familySharable, reviewNote }) {
  const res = await fetch(`/api/apps/${appId}/subscription-groups/${groupId}/subscriptions/${subId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, name, subscriptionPeriod, familySharable, reviewNote }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update subscription: ${res.status}`);
  }
  return res.json();
}

export async function deleteSubscription(appId, groupId, subId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/subscription-groups/${groupId}/subscriptions/${subId}?${params}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete subscription: ${res.status}`);
  }
  return res.json();
}

// ── Subscription Localizations ───────────────────────────────────────────────

export async function fetchSubscriptionLocalizations(appId, groupId, subId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/subscription-groups/${groupId}/subscriptions/${subId}/localizations?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch subscription localizations: ${res.status}`);
  return res.json();
}

export async function createSubscriptionLocalization(appId, groupId, subId, { accountId, locale, name, description }) {
  const res = await fetch(`/api/apps/${appId}/subscription-groups/${groupId}/subscriptions/${subId}/localizations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, locale, name, description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create subscription localization: ${res.status}`);
  }
  return res.json();
}

export async function updateSubscriptionLocalization(appId, groupId, subId, locId, { accountId, name, description }) {
  const res = await fetch(`/api/apps/${appId}/subscription-groups/${groupId}/subscriptions/${subId}/localizations/${locId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, name, description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update subscription localization: ${res.status}`);
  }
  return res.json();
}

export async function deleteSubscriptionLocalization(appId, groupId, subId, locId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/subscription-groups/${groupId}/subscriptions/${subId}/localizations/${locId}?${params}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete subscription localization: ${res.status}`);
  }
  return res.json();
}

// ── Pricing ─────────────────────────────────────────────────────────────────

export async function fetchIAPPrices(appId, iapId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/iap/${iapId}/prices?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch IAP prices: ${res.status}`);
  return res.json();
}

export async function setIAPPrices(appId, iapId, { accountId, baseTerritory, manualPrices }) {
  const res = await fetch(`/api/apps/${appId}/iap/${iapId}/prices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, baseTerritory, manualPrices }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to set IAP prices: ${res.status}`);
  }
  return res.json();
}

export async function fetchSubscriptionPrices(appId, groupId, subId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/subscription-groups/${groupId}/subscriptions/${subId}/prices?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch subscription prices: ${res.status}`);
  return res.json();
}

export async function fetchIAPPricePoints(appId, iapId, territory, accountId) {
  const params = new URLSearchParams({ territory, accountId });
  const res = await fetch(`/api/apps/${appId}/iap/${iapId}/price-points?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch IAP price points: ${res.status}`);
  return res.json();
}

export async function fetchSubscriptionPricePoints(appId, groupId, subId, territory, accountId) {
  const params = new URLSearchParams({ territory, accountId });
  const res = await fetch(`/api/apps/${appId}/subscription-groups/${groupId}/subscriptions/${subId}/price-points?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch subscription price points: ${res.status}`);
  return res.json();
}

export async function setSubscriptionPrices(appId, groupId, subId, { accountId, prices }) {
  const res = await fetch(`/api/apps/${appId}/subscription-groups/${groupId}/subscriptions/${subId}/prices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, prices }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to set subscription prices: ${res.status}`);
  }
  return res.json();
}

// ── Screenshots ─────────────────────────────────────────────────────────────

export async function fetchScreenshotSets(appId, versionId, locId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}/localizations/${locId}/screenshot-sets?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch screenshot sets: ${res.status}`);
  return res.json();
}

export async function createScreenshotSet(appId, versionId, locId, { accountId, displayType }) {
  const res = await fetch(`/api/apps/${appId}/versions/${versionId}/localizations/${locId}/screenshot-sets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, displayType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create screenshot set: ${res.status}`);
  }
  return res.json();
}

export async function deleteScreenshotSet(setId, accountId, locId) {
  const params = new URLSearchParams({ accountId, locId });
  const res = await fetch(`/api/apps/screenshot-sets/${setId}?${params}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete screenshot set: ${res.status}`);
  }
  return res.json();
}

export async function uploadScreenshot(setId, accountId, locId, file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("accountId", accountId);
  formData.append("locId", locId);

  const res = await fetch(`/api/apps/screenshot-sets/${setId}/screenshots/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to upload screenshot: ${res.status}`);
  }
  return res.json();
}

export async function deleteScreenshot(screenshotId, accountId, locId) {
  const params = new URLSearchParams({ accountId, locId });
  const res = await fetch(`/api/apps/screenshots/${screenshotId}?${params}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete screenshot: ${res.status}`);
  }
  return res.json();
}

export async function reorderScreenshots(setId, accountId, locId, screenshotIds) {
  const res = await fetch(`/api/apps/screenshot-sets/${setId}/screenshots/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, locId, screenshotIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to reorder screenshots: ${res.status}`);
  }
  return res.json();
}

// ── Xcode Cloud ─────────────────────────────────────────────────────────────

export async function fetchBuildActions(appId, buildId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/xcode-cloud/builds/${buildId}/actions?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch build actions: ${res.status}`);
  return res.json();
}

export async function fetchActionLogs(appId, buildId, actionId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/xcode-cloud/builds/${buildId}/actions/${actionId}/logs?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch action logs: ${res.status}`);
  return res.json();
}

export async function fetchLogFile(appId, buildId, actionId, accountId, filePath) {
  const params = new URLSearchParams({ accountId, path: filePath });
  const res = await fetch(`/api/apps/${appId}/xcode-cloud/builds/${buildId}/actions/${actionId}/logs/file?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch log file: ${res.status}`);
  return res.json();
}

export async function fetchActionIssues(appId, buildId, actionId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/xcode-cloud/builds/${buildId}/actions/${actionId}/issues?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch action issues: ${res.status}`);
  return res.json();
}

export async function fetchCiBuildRuns(appId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/xcode-cloud/builds?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch CI builds: ${res.status}`);
  return res.json();
}

export async function fetchCiWorkflows(appId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/xcode-cloud/workflows?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch CI workflows: ${res.status}`);
  return res.json();
}

export async function fetchCiWorkflowDetail(appId, workflowId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/xcode-cloud/workflows/${workflowId}?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch workflow detail: ${res.status}`);
  return res.json();
}

export async function updateCiWorkflow(appId, workflowId, payload) {
  const res = await fetch(`/api/apps/${appId}/xcode-cloud/workflows/${workflowId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update workflow: ${res.status}`);
  }
  return res.json();
}

export async function fetchCiXcodeVersions(appId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`/api/apps/${appId}/xcode-cloud/xcode-versions?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch Xcode versions: ${res.status}`);
  return res.json();
}

export async function fetchCurrentUser() {
  const res = await fetch("/api/auth/me");
  if (!res.ok) throw new Error(`Failed to fetch current user: ${res.status}`);
  return res.json();
}

export async function fetchAppSales(appId, accountId, { days = 30 } = {}) {
  const params = new URLSearchParams({ accountId, days: String(days) });
  const res = await fetch(`/api/apps/${appId}/sales?${params}`);
  if (res.status === 409) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error || "Vendor number not configured");
    error.code = err.code || "VENDOR_NUMBER_NOT_CONFIGURED";
    error.status = 409;
    throw error;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error || `Failed to fetch sales: ${res.status}`);
    error.code = err.code;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function fetchVendorNumber(accountId) {
  const res = await fetch(`/api/accounts/${accountId}/vendor-number`);
  if (!res.ok) throw new Error(`Failed to fetch vendor number: ${res.status}`);
  return res.json();
}

export async function setVendorNumber(accountId, vendorNumber) {
  const res = await fetch(`/api/accounts/${accountId}/vendor-number`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vendorNumber }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to set vendor number: ${res.status}`);
  }
  return res.json();
}

