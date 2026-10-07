export function earnedContributorScore(votePoints, referralPoints) {
  const votes = Number.isFinite(Number(votePoints)) ? Number(votePoints) : 0;
  const referrals = Number.isFinite(Number(referralPoints)) ? Number(referralPoints) : 0;
  return votes + referrals;
}

export function deterministicLeaderboardOrder(entries) {
  return [...entries].sort((a, b) =>
    b.score - a.score || String(a.user_id).localeCompare(String(b.user_id))
  );
}
