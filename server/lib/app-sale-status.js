import { ascFetch } from "./asc-client.js";

/** Version states that may still show as live while the app is off sale. */
export const LIVE_VERSION_STATES = new Set(["READY_FOR_SALE", "READY_FOR_DISTRIBUTION"]);

const SELLING_CONTENT_STATUSES = new Set([
  "AVAILABLE",
  "PROCESSING_TO_AVAILABLE",
  "AVAILABLE_FOR_PREORDER_ON_DATE",
  "PROCESSING_TO_PRE_ORDER",
  "AVAILABLE_FOR_SALE_UNRELEASED_APP",
  "PREORDER_ON_UNRELEASED_APP",
  "AVAILABLE_FOR_PREORDER",
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
  if (statuses.some((s) => SELLING_CONTENT_STATUSES.has(s))) {
    return true;
  }
  return attrs?.available === true;
}

function territoryAvailabilitiesFromIncluded(included) {
  if (!Array.isArray(included)) return [];
  return included.filter((item) => item.type === "territoryAvailabilities");
}

async function fetchAllTerritoryAvailabilities(account, availabilityId) {
  const territories = [];
  let nextPath = `/v2/appAvailabilities/${availabilityId}/territoryAvailabilities?limit=200&fields[territoryAvailabilities]=available,contentStatuses`;

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
      `/v1/apps/${appId}/appAvailabilityV2?include=territoryAvailabilities&fields[territoryAvailabilities]=available,contentStatuses&limit[territoryAvailabilities]=200`
    );

    const availability = availabilityData?.data;
    if (!availability?.id) {
      return false;
    }

    let territoryRecords = territoryAvailabilitiesFromIncluded(availabilityData.included);
    if (territoryRecords.length === 0) {
      territoryRecords = await fetchAllTerritoryAvailabilities(account, availability.id);
    }

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
