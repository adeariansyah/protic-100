import type { BracketSlot, Match, Team, TeamCount } from '../types'

export interface MatchBlueprint {
  match_number: number
  round_name: string
  seed_a: number | null
  seed_b: number | null
  next_win_match_number: number | null
  next_win_slot: BracketSlot | null
  next_lose_match_number: number | null
  next_lose_slot: BracketSlot | null
}

/**
 * Menghasilkan kerangka bagan turnamen untuk 4, 6 (2 slot Bye), atau 8 tim.
 * Semua format menyertakan Perebutan Juara 3 dan Final.
 */
export function getBracketBlueprint(teamCount: TeamCount): MatchBlueprint[] {
  if (teamCount === 4) {
    return [
      {
        match_number: 1,
        round_name: 'Semifinal',
        seed_a: 1,
        seed_b: 2,
        next_win_match_number: 4,
        next_win_slot: 'A',
        next_lose_match_number: 3,
        next_lose_slot: 'A',
      },
      {
        match_number: 2,
        round_name: 'Semifinal',
        seed_a: 3,
        seed_b: 4,
        next_win_match_number: 4,
        next_win_slot: 'B',
        next_lose_match_number: 3,
        next_lose_slot: 'B',
      },
      {
        match_number: 3,
        round_name: 'Perebutan Juara 3',
        seed_a: null,
        seed_b: null,
        next_win_match_number: null,
        next_win_slot: null,
        next_lose_match_number: null,
        next_lose_slot: null,
      },
      {
        match_number: 4,
        round_name: 'Final',
        seed_a: null,
        seed_b: null,
        next_win_match_number: null,
        next_win_slot: null,
        next_lose_match_number: null,
        next_lose_slot: null,
      },
    ]
  }

  if (teamCount === 6) {
    // Seed 1 & 2 mendapat slot Bye langsung ke Semifinal (M3 & M4)
    return [
      {
        match_number: 1,
        round_name: 'Penyisihan',
        seed_a: 3,
        seed_b: 4,
        next_win_match_number: 3,
        next_win_slot: 'B',
        next_lose_match_number: null,
        next_lose_slot: null,
      },
      {
        match_number: 2,
        round_name: 'Penyisihan',
        seed_a: 5,
        seed_b: 6,
        next_win_match_number: 4,
        next_win_slot: 'B',
        next_lose_match_number: null,
        next_lose_slot: null,
      },
      {
        match_number: 3,
        round_name: 'Semifinal',
        seed_a: 1, // Tim Bye 1
        seed_b: null, // Menang M1
        next_win_match_number: 6,
        next_win_slot: 'A',
        next_lose_match_number: 5,
        next_lose_slot: 'A',
      },
      {
        match_number: 4,
        round_name: 'Semifinal',
        seed_a: 2, // Tim Bye 2
        seed_b: null, // Menang M2
        next_win_match_number: 6,
        next_win_slot: 'B',
        next_lose_match_number: 5,
        next_lose_slot: 'B',
      },
      {
        match_number: 5,
        round_name: 'Perebutan Juara 3',
        seed_a: null,
        seed_b: null,
        next_win_match_number: null,
        next_win_slot: null,
        next_lose_match_number: null,
        next_lose_slot: null,
      },
      {
        match_number: 6,
        round_name: 'Final',
        seed_a: null,
        seed_b: null,
        next_win_match_number: null,
        next_win_slot: null,
        next_lose_match_number: null,
        next_lose_slot: null,
      },
    ]
  }

  // 8 Tim
  return [
    {
      match_number: 1,
      round_name: 'Penyisihan',
      seed_a: 1,
      seed_b: 2,
      next_win_match_number: 5,
      next_win_slot: 'A',
      next_lose_match_number: null,
      next_lose_slot: null,
    },
    {
      match_number: 2,
      round_name: 'Penyisihan',
      seed_a: 3,
      seed_b: 4,
      next_win_match_number: 5,
      next_win_slot: 'B',
      next_lose_match_number: null,
      next_lose_slot: null,
    },
    {
      match_number: 3,
      round_name: 'Penyisihan',
      seed_a: 5,
      seed_b: 6,
      next_win_match_number: 6,
      next_win_slot: 'A',
      next_lose_match_number: null,
      next_lose_slot: null,
    },
    {
      match_number: 4,
      round_name: 'Penyisihan',
      seed_a: 7,
      seed_b: 8,
      next_win_match_number: 6,
      next_win_slot: 'B',
      next_lose_match_number: null,
      next_lose_slot: null,
    },
    {
      match_number: 5,
      round_name: 'Semifinal',
      seed_a: null,
      seed_b: null,
      next_win_match_number: 8,
      next_win_slot: 'A',
      next_lose_match_number: 7,
      next_lose_slot: 'A',
    },
    {
      match_number: 6,
      round_name: 'Semifinal',
      seed_a: null,
      seed_b: null,
      next_win_match_number: 8,
      next_win_slot: 'B',
      next_lose_match_number: 7,
      next_lose_slot: 'B',
    },
    {
      match_number: 7,
      round_name: 'Perebutan Juara 3',
      seed_a: null,
      seed_b: null,
      next_win_match_number: null,
      next_win_slot: null,
      next_lose_match_number: null,
      next_lose_slot: null,
    },
    {
      match_number: 8,
      round_name: 'Final',
      seed_a: null,
      seed_b: null,
      next_win_match_number: null,
      next_win_slot: null,
      next_lose_match_number: null,
      next_lose_slot: null,
    },
  ]
}

export function getRequiredMainQuestionsCount(teamCount: TeamCount): number {
  return teamCount * 2
}

/**
 * Fisher-Yates shuffle untuk mengacak urutan tim secara adil.
 */
export function shuffleTeams(teams: Team[]): Team[] {
  const copy = [...teams]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = copy[i]!
    copy[i] = copy[j]!
    copy[j] = temp
  }
  return copy.map((team, idx) => ({
    ...team,
    seed_order: idx + 1,
  }))
}

/**
 * Menghitung pemenang podium Juara 1, 2, dan 3 dari daftar match.
 */
export function computePodium(
  matches: Match[],
  teams: Team[],
  teamCount: TeamCount
): { first: Team | null; second: Team | null; third: Team | null } | null {
  const finalMatchNumber = teamCount === 4 ? 4 : teamCount === 6 ? 6 : 8
  const thirdMatchNumber = finalMatchNumber - 1

  const finalMatch = matches.find((m) => m.match_number === finalMatchNumber)
  const thirdMatch = matches.find((m) => m.match_number === thirdMatchNumber)

  if (finalMatch?.status !== 'completed' || thirdMatch?.status !== 'completed') {
    return null
  }

  const findTeam = (id: string | null) =>
    id ? teams.find((t) => t.id === id) ?? null : null

  return {
    first: findTeam(finalMatch.winner_team_id),
    second: findTeam(finalMatch.loser_team_id),
    third: findTeam(thirdMatch.winner_team_id),
  }
}

