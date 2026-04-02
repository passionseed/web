export type HackathonMatchingParticipant = {
  id: string;
  name: string;
  rankedParticipantIds?: string[];
  rankings?: string[];
  problemPreferences: string[];
  teamRolePreference: string | null;
  track?: string;
  experienceLevel?: number;
};

export type HackathonMatchedTeam = {
  id: string;
  memberIds: string[];
  score: number;
};

export type HackathonMatchingInput = {
  participants: HackathonMatchingParticipant[];
  minTeamSize?: number;
  maxTeamSize?: number;
};

const MIN_TEAM_SIZE = 3;
const MAX_TEAM_SIZE = 5;
const MUTUAL_BASE_SCORE = 200;
const ONE_SIDED_BASE_SCORE = 20;

function plannedTeamSizes(count: number): number[] {
  if (count === 0) return [];

  const teamCount = Math.ceil(count / MAX_TEAM_SIZE);
  const baseSize = Math.floor(count / teamCount);
  const remainder = count % teamCount;

  return Array.from({ length: teamCount }, (_, index) =>
    baseSize + (index < remainder ? 1 : 0)
  ).sort((a, b) => b - a);
}

function rankWeight(rankIndex: number): number {
  return Math.max(1, 10 - rankIndex);
}

function sharedCount(a: string[], b: string[]): number {
  const lookup = new Set(a);
  return b.filter((value) => lookup.has(value)).length;
}

function pairScore(
  a: HackathonMatchingParticipant,
  b: HackathonMatchingParticipant
): number {
  const aRankings = a.rankedParticipantIds ?? a.rankings ?? [];
  const bRankings = b.rankedParticipantIds ?? b.rankings ?? [];
  const aRank = aRankings.indexOf(b.id);
  const bRank = bRankings.indexOf(a.id);
  const aRanksB = aRank >= 0;
  const bRanksA = bRank >= 0;

  let score = 0;

  if (aRanksB && bRanksA) {
    score += MUTUAL_BASE_SCORE + rankWeight(aRank) + rankWeight(bRank);
  } else if (aRanksB) {
    score += ONE_SIDED_BASE_SCORE + rankWeight(aRank);
  } else if (bRanksA) {
    score += ONE_SIDED_BASE_SCORE + rankWeight(bRank);
  }

  score += sharedCount(a.problemPreferences, b.problemPreferences) * 6;

  if (
    a.teamRolePreference &&
    b.teamRolePreference &&
    a.teamRolePreference !== b.teamRolePreference
  ) {
    score += 2;
  }

  return score;
}

function buildPairScores(participants: HackathonMatchingParticipant[]) {
  const scoreMap = new Map<string, number>();

  for (let index = 0; index < participants.length; index += 1) {
    for (let inner = index + 1; inner < participants.length; inner += 1) {
      const a = participants[index];
      const b = participants[inner];
      const score = pairScore(a, b);
      scoreMap.set(`${a.id}:${b.id}`, score);
      scoreMap.set(`${b.id}:${a.id}`, score);
    }
  }

  return scoreMap;
}

function getScore(
  scoreMap: Map<string, number>,
  aId: string,
  bId: string
): number {
  return scoreMap.get(`${aId}:${bId}`) ?? 0;
}

function teamScore(scoreMap: Map<string, number>, memberIds: string[]): number {
  let score = 0;

  for (let index = 0; index < memberIds.length; index += 1) {
    for (let inner = index + 1; inner < memberIds.length; inner += 1) {
      score += getScore(scoreMap, memberIds[index], memberIds[inner]);
    }
  }

  return score;
}

function candidateGain(
  scoreMap: Map<string, number>,
  teamMemberIds: string[],
  candidateId: string
): number {
  return teamMemberIds.reduce(
    (sum, memberId) => sum + getScore(scoreMap, memberId, candidateId),
    0
  );
}

export function buildHackathonTeams(
  participants: HackathonMatchingParticipant[]
): HackathonMatchedTeam[] {
  if (participants.length === 0) return [];

  const participantMap = new Map(participants.map((participant) => [participant.id, participant]));
  const scoreMap = buildPairScores(participants);
  const targetSizes = plannedTeamSizes(participants.length);
  const targetTeamCount = targetSizes.length;
  const teamSeeds: string[][] = [];
  const seeded = new Set<string>();

  const mutualPairs = participants
    .flatMap((participant, index) =>
      participants.slice(index + 1).map((other) => ({
        aId: participant.id,
        bId: other.id,
        score: getScore(scoreMap, participant.id, other.id),
        isMutual:
          (participant.rankedParticipantIds ?? participant.rankings ?? []).includes(
            other.id
          ) &&
          (other.rankedParticipantIds ?? other.rankings ?? []).includes(
            participant.id
          ),
      }))
    )
    .filter((pair) => pair.isMutual)
    .sort((left, right) => right.score - left.score);

  for (const pair of mutualPairs) {
    if (teamSeeds.length >= targetTeamCount) break;
    if (seeded.has(pair.aId) || seeded.has(pair.bId)) continue;

    teamSeeds.push([pair.aId, pair.bId]);
    seeded.add(pair.aId);
    seeded.add(pair.bId);
  }

  const remainingIds = participants
    .map((participant) => participant.id)
    .filter((id) => !seeded.has(id));

  while (teamSeeds.length < targetTeamCount && remainingIds.length > 0) {
    const nextId = remainingIds
      .slice()
      .sort((left, right) => {
        const leftAffinity = remainingIds.reduce(
          (sum, candidateId) =>
            candidateId === left ? sum : sum + getScore(scoreMap, left, candidateId),
          0
        );
        const rightAffinity = remainingIds.reduce(
          (sum, candidateId) =>
            candidateId === right ? sum : sum + getScore(scoreMap, right, candidateId),
          0
        );
        return rightAffinity - leftAffinity;
      })[0];

    teamSeeds.push([nextId]);
    remainingIds.splice(remainingIds.indexOf(nextId), 1);
  }

  if (teamSeeds.length === 0) {
    teamSeeds.push([participants[0].id]);
    remainingIds.splice(remainingIds.indexOf(participants[0].id), 1);
  }

  while (remainingIds.length > 0) {
    let bestTeamIndex = 0;
    let bestCandidateIndex = 0;
    let bestGain = Number.NEGATIVE_INFINITY;

    for (let teamIndex = 0; teamIndex < teamSeeds.length; teamIndex += 1) {
      if (teamSeeds[teamIndex].length >= targetSizes[teamIndex]) continue;

      for (let candidateIndex = 0; candidateIndex < remainingIds.length; candidateIndex += 1) {
        const candidateId = remainingIds[candidateIndex];
        const gain = candidateGain(scoreMap, teamSeeds[teamIndex], candidateId);
        const normalizedGain = gain - teamSeeds[teamIndex].length * 0.01;

        if (normalizedGain > bestGain) {
          bestGain = normalizedGain;
          bestTeamIndex = teamIndex;
          bestCandidateIndex = candidateIndex;
        }
      }
    }

    teamSeeds[bestTeamIndex].push(remainingIds[bestCandidateIndex]);
    remainingIds.splice(bestCandidateIndex, 1);
  }

  const improvedTeams = teamSeeds.map((memberIds) => [...memberIds]);

  for (let teamIndex = 0; teamIndex < improvedTeams.length; teamIndex += 1) {
    for (let otherIndex = teamIndex + 1; otherIndex < improvedTeams.length; otherIndex += 1) {
      let improved = true;

      while (improved) {
        improved = false;

        for (const memberId of improvedTeams[teamIndex]) {
          for (const otherMemberId of improvedTeams[otherIndex]) {
            const currentScore =
              teamScore(scoreMap, improvedTeams[teamIndex]) +
              teamScore(scoreMap, improvedTeams[otherIndex]);

            const swappedFirst = improvedTeams[teamIndex].map((id) =>
              id === memberId ? otherMemberId : id
            );
            const swappedSecond = improvedTeams[otherIndex].map((id) =>
              id === otherMemberId ? memberId : id
            );

            const swappedScore =
              teamScore(scoreMap, swappedFirst) +
              teamScore(scoreMap, swappedSecond);

            if (swappedScore > currentScore) {
              improvedTeams[teamIndex] = swappedFirst;
              improvedTeams[otherIndex] = swappedSecond;
              improved = true;
              break;
            }
          }

          if (improved) break;
        }
      }
    }
  }

  return improvedTeams.map((memberIds, index) => ({
    id: `team-${index + 1}`,
    memberIds,
    score: teamScore(scoreMap, memberIds),
  }));
}

export function isValidTeamSize(memberCount: number): boolean {
  return memberCount >= MIN_TEAM_SIZE && memberCount <= MAX_TEAM_SIZE;
}

export function canCreateValidTeams(participantCount: number): boolean {
  if (participantCount === 0) return true;
  return plannedTeamSizes(participantCount).every(isValidTeamSize);
}

export function generateHackathonTeams(input: HackathonMatchingInput) {
  return {
    teams: buildHackathonTeams(input.participants),
  };
}

export function scoreParticipantPair(
  a: HackathonMatchingParticipant,
  b: HackathonMatchingParticipant
): number {
  return pairScore(a, b);
}

export function getParticipantById(
  participants: HackathonMatchingParticipant[],
  participantId: string
): HackathonMatchingParticipant | null {
  return participantMapOrNull(participants).get(participantId) ?? null;
}

function participantMapOrNull(
  participants: HackathonMatchingParticipant[]
): Map<string, HackathonMatchingParticipant> {
  return new Map(participants.map((participant) => [participant.id, participant]));
}
