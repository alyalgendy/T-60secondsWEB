export function hasEveryVote(
  votes: Readonly<Record<string, string>>,
  playerIds: readonly string[],
): boolean {
  return playerIds.every((playerId) => Boolean(votes[playerId]));
}

export function resolveSingleChoice(
  votes: Readonly<Record<string, string>>,
  playerIds: readonly string[],
  choices: readonly string[],
  leadId: string,
): string | null {
  const counts = new Map(choices.map((choice) => [choice, 0]));
  for (const playerId of playerIds) {
    const choice = votes[playerId];
    if (choice && counts.has(choice)) {
      counts.set(choice, (counts.get(choice) ?? 0) + 1);
    }
  }
  const maximum = Math.max(0, ...counts.values());
  if (maximum === 0) return null;
  const tied = choices.filter((choice) => counts.get(choice) === maximum);
  const leadChoice = votes[leadId];
  if (leadChoice && tied.includes(leadChoice)) return leadChoice;
  return tied[0] ?? null;
}

export function resolveObjectivePair(
  votes: Readonly<Record<string, string>>,
  playerIds: readonly string[],
  objectiveIds: readonly string[],
  leadId: string,
): string[] {
  const counts = new Map(objectiveIds.map((id) => [id, 0]));
  for (const playerId of playerIds) {
    const ballot = votes[playerId];
    if (!ballot) continue;
    for (const id of ballot.split('|')) {
      if (counts.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const leadChoices = new Set((votes[leadId] ?? '').split('|'));
  return [...objectiveIds]
    .sort((left, right) => {
      const difference = (counts.get(right) ?? 0) - (counts.get(left) ?? 0);
      if (difference !== 0) return difference;
      const leadDifference = Number(leadChoices.has(right)) - Number(leadChoices.has(left));
      if (leadDifference !== 0) return leadDifference;
      return objectiveIds.indexOf(left) - objectiveIds.indexOf(right);
    })
    .slice(0, 2)
    .sort(
      (left, right) => objectiveIds.indexOf(left) - objectiveIds.indexOf(right),
    );
}
