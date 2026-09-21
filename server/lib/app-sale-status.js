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

/** Whether the apps list should verify territory availability for this version state. */
export function shouldCheckSaleStatus(status) {
  return status && !SKIP_SALE_CHECK_STATES.has(status) && status !== "REMOVED_FROM_SALE";
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
 * Whether an app is currently on sale in at least one territory.
 * @returns {Promise<boolean|null>} true/false when known; null on API error
 */
export async function isAppCurrentlyOnSale(account, appId) {
  try {
    const availabilityData = await ascFetch(
      account,
      `/v1/apps/${appId}/appAvailabilityV2`
    );

    const availability = availabilityData?.data;
    if (!availability?.id) {
      return false;
    }

    const territoryRecords = await fetchAllTerritoryAvailabilities(account, availability.id);
    if (territoryRecords.length === 0) {
      return false;
    }

    return territoryRecords.some((record) => territoryIsSelling(record.attributes));
  } catch (err) {
    if (isNotFoundError(err)) {
      return false;
    }
    throw err;
  }
}
