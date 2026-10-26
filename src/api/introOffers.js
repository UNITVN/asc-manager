function offersUrl(appId, groupId, subId) {
  return `/api/apps/${appId}/subscription-groups/${groupId}/subscriptions/${subId}/introductory-offers`;
}

export async function fetchIntroOffers(appId, groupId, subId, accountId) {
  const params = new URLSearchParams({ accountId });
  const res = await fetch(`${offersUrl(appId, groupId, subId)}?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch introductory offers: ${res.status}`);
  return res.json();
}

export async function applyIntroOffers(appId, groupId, subId, { accountId, changes }) {
  const res = await fetch(offersUrl(appId, groupId, subId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, changes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to apply introductory offers: ${res.status}`);
  }
  return res.json();
}
