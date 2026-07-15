let lastPendingCount: number | null = null;

export async function updateBadge(pendingCount: number) {
  if (pendingCount === lastPendingCount) {
    return;
  }

  const badgeNavigator = navigator;

  if (
    typeof badgeNavigator.setAppBadge !== "function" ||
    typeof badgeNavigator.clearAppBadge !== "function"
  ) {
    return;
  }

  lastPendingCount = pendingCount;

  try {
    if (pendingCount > 0) {
      await badgeNavigator.setAppBadge(pendingCount);
    } else {
      await badgeNavigator.clearAppBadge();
    }
  } catch {
    return;
  }
}
