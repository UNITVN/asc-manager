import { ascFetch } from "./asc-client.js";

/** Pre-release workflow states where version status is still meaningful. */
export const SKIP_SALE_CHECK_STATES = new Set([
  "PREPARE_FOR_SUBMISSION",
  "WAITING_FOR_REVIEW",
  "IN_REVIEW",
  "READY_FOR_REVIEW",
  "REJECTED",
  "DEVELOPER_REJECTED",
  "METADATA_REJECTED",
  "INVALID_BINARY",
  "WAITING_FOR_EXPORT_COMPLIANCE",
]);

/**
 * Skip states that should still become Removed when the app was published before
 * but is no longer on sale (e.g. new draft version after Apple removal).
 */
export const OFF_SALE_OVERRIDE_SKIP_STATES = new Set([
  "PREPARE_FOR_SUBMISSION",
]);

/** Whether the apps list should verify territory availability for this version state. */
export function shouldCheckSaleStatus(status) {
  return status && !SKIP_SALE_CHECK_STATES.has(status) && status !== "REMOVED_FROM_SALE";
}

/** Whether the apps list should fetch availability for this version state. */
export function needsSaleStatusLookup(status) {
  return shouldCheckSaleStatus(status) || OFF_SALE_OVERRIDE_SKIP_STATES.has(status);
}

/** ASC caps territoryAvailabilities page size at 50. */
const TERRITORY_PAGE_LIMIT = 50;

const SELLING_CONTENT_STATUSES = new Set([
  "AVAILABLE",
  "PROCESSING_TO_AVAILABLE",
  "AVAILABLE_FOR_PREORDER_ON_DATE",
  "PROCESSING_TO_PRE_ORDER",
  "AVAILABLE_FOR_SALE_UNRELEASED_APP",
  "PREORDER_ON_UNRELEASED_APP",
  "AVAILABLE_FOR_PREORDER",
]);

const NOT_SELLING_CONTENT_STATUSES = new Set([
  "PROCESSING_TO_NOT_AVAILABLE",
]);

function isNotFoundError(err) {
  const message = err?.message || "";
  return message.includes("404") || message.includes("NOT_FOUND");
}

/**
 * Whether a territory availability record means the app is selling there.
 * @param {{ available?: boolean, contentStatuses?: string[] }} attrs
 */
export function territoryIsSelling(attrs) {
  const statuses = attrs?.contentStatuses || [];
  if (statuses.some((s) => s === "CANNOT_SELL" || s.startsWith("CANNOT_SELL_"))) {
    return false;
  }
  if (statuses.some((s) => NOT_SELLING_CONTENT_STATUSES.has(s))) {
    return false;
  }
  if (statuses.some((s) => SELLING_CONTENT_STATUSES.has(s))) {
    return true;
  }
  return attrs?.available === true;
}

async function fetchAllTerritoryAvailabilities(account, availabilityId) {
  const territories = [];
  let nextPath = `/v2/appAvailabilities/${availabilityId}/territoryAvailabilities?limit=${TERRITORY_PAGE_LIMIT}&fields[territoryAvailabilities]=available,contentStatuses`;

  while (nextPath) {
    const data = await ascFetch(account, nextPath);
    if (Array.isArray(data?.data)) {
      territories.push(...data.data);
    }
    const nextUrl = data?.links?.next;
    if (!nextUrl) break;
    nextPath = nextUrl.replace("https://api.appstoreconnect.apple.com", "");
  }

  return territories;
}

/**
 * @returns {Promise<{ onSale: boolean, hasAvailability: boolean }>}
 */
export async function getAppSaleStatus(account, appId) {
  try {
    const availabilityData = await ascFetch(
      account,
      `/v1/apps/${appId}/appAvailabilityV2`
    );

    const availability = availabilityData?.data;
    if (!availability?.id) {
      return { onSale: false, hasAvailability: false };
    }

    const territoryRecords = await fetchAllTerritoryAvailabilities(account, availability.id);
    if (territoryRecords.length === 0) {
      return { onSale: false, hasAvailability: true };
    }

    return {
      onSale: territoryRecords.some((record) => territoryIsSelling(record.attributes)),
      hasAvailability: true,
    };
  } catch (err) {
    if (isNotFoundError(err)) {
      return { onSale: false, hasAvailability: false };
    }
    throw err;
  }
}

/**
 * Map version workflow state + territory availability to the apps-list badge.
 * @param {string} versionStatus
 * @param {{ onSale: boolean, hasAvailability: boolean }} sale
 */
export function resolveAppListStatus(versionStatus, sale) {
  if (versionStatus === "REMOVED_FROM_SALE" || sale.onSale) {
    return versionStatus;
  }
  if (shouldCheckSaleStatus(versionStatus)) {
    return "REMOVED_FROM_SALE";
  }
  if (OFF_SALE_OVERRIDE_SKIP_STATES.has(versionStatus) && sale.hasAvailability) {
    return "REMOVED_FROM_SALE";
  }
  return versionStatus;
}

/**
 * Whether an app is currently on sale in at least one territory.
 * @returns {Promise<boolean>}
 */
export async function isAppCurrentlyOnSale(account, appId) {
  const sale = await getAppSaleStatus(account, appId);
  return sale.onSale;
}
