export type TeamCount = 4 | 6 | 8
export type EventStatus = 'draft' | 'active' | 'completed'
export type MatchStatus = 'pending' | 'in_progress' | 'completed'
export type QuestionType = 'main' | 'backup'
export type BracketSlot = 'A' | 'B'

export interface EventData {
  id: string
  name: string
  team_count: TeamCount
  timer_seconds: number
  status: EventStatus
  created_at: string
}

export interface Team {
  id: string
  event_id: string
  name: string
  seed_order: number
}

export interface Match {
  id: string
  event_id: string
  match_number: number
  round_name: string
  team_a_id: string | null
  team_b_id: string | null
  score_a: number
  score_b: number
  winner_team_id: string | null
  loser_team_id: string | null
  next_win_match_number: number | null
  next_win_slot: BracketSlot | null
  next_lose_match_number: number | null
  next_lose_slot: BracketSlot | null
  status: MatchStatus
}

export interface AnswerOption {
  text: string
  points: number
}

export interface Question {
  id: string
  event_id: string
  type: QuestionType
  match_number: number | null
  question_order: number | null
  question_text: string
  answers_json: string
  is_used: number
}

export interface ParsedQuestionInput {
  type: QuestionType
  match_number: number | null
  question_order: number | null
  question_text: string
  answers: AnswerOption[]
}

export interface TournamentBundle {
  event: EventData
  teams: Team[]
  matches: Match[]
  questions: Question[]
}

