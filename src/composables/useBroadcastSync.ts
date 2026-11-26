import type { AnswerOption } from '../types'

export const LIVE_CHANNEL_NAME = 'protic100_live_channel'
export const LIVE_STATE_STORAGE_KEY = 'protic100_live_state'
export const PRESENTER_CONTROL_STORAGE_KEY = 'protic100_presenter_control'

export type PresenterMode = 'standby' | 'quiz' | 'winner'

export interface WinnerBannerData {
  matchName: string
  winnerName: string
  scoreA: number
  scoreB: number
  teamAName: string
  teamBName: string
}

export interface PresenterControlState {
  presenterMode: PresenterMode
  liveMatchId: string | null
  winnerBannerData: WinnerBannerData | null
}

export interface PresenterAnswerItem {
  rank: number
  text: string
  points: number
  revealed: boolean
}

export interface QuizBoardState {
  matchId: string
  roundName: string
  matchNumber: number
  teamAName: string
  teamBName: string
  scoreA: number
  scoreB: number
  activeTurn: 'A' | 'B'
  strikes: number
  timerRemaining: number
  timerSeconds: number
  questionLabel: string
  questionText: string
  answers: PresenterAnswerItem[]
  strikeOverlayTick: number
}

export interface LiveBroadcastPayload {
  presenterMode: PresenterMode
  liveMatchId: string | null
  winnerBannerData: WinnerBannerData | null
  quizState: QuizBoardState | null
  updatedAt: number
}

export function mapAnswersForPresenter(
  options: AnswerOption[],
  revealed: boolean[]
): PresenterAnswerItem[] {
  return options.map((opt, idx) => ({
    rank: idx + 1,
    text: opt.text,
    points: opt.points,
    revealed: Boolean(revealed[idx]),
  }))
}

export function loadPresenterControlState(): PresenterControlState {
  try {
    const raw = localStorage.getItem(PRESENTER_CONTROL_STORAGE_KEY)
    if (!raw) {
      return {
        presenterMode: 'standby',
        liveMatchId: null,
        winnerBannerData: null,
      }
    }
    const parsed = JSON.parse(raw) as Partial<PresenterControlState>
    return {
      presenterMode: parsed.presenterMode ?? 'standby',
      liveMatchId: parsed.liveMatchId ?? null,
      winnerBannerData: parsed.winnerBannerData ?? null,
    }
  } catch {
    return {
      presenterMode: 'standby',
      liveMatchId: null,
      winnerBannerData: null,
    }
  }
}

export function savePresenterControlState(control: PresenterControlState): void {
  try {
    localStorage.setItem(PRESENTER_CONTROL_STORAGE_KEY, JSON.stringify(control))
  } catch {
    // Ignore quota errors
  }
}

export function useBroadcastSync() {
  const channel =
    typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(LIVE_CHANNEL_NAME)
      : null

  function publishState(payload: LiveBroadcastPayload) {
    savePresenterControlState({
      presenterMode: payload.presenterMode,
      liveMatchId: payload.liveMatchId,
      winnerBannerData: payload.winnerBannerData,
    })
    try {
      localStorage.setItem(LIVE_STATE_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Ignore quota errors
    }
    channel?.postMessage({ type: 'STATE_UPDATE', payload })
  }

  function loadStoredState(): LiveBroadcastPayload {
    try {
      const raw = localStorage.getItem(LIVE_STATE_STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw) as LiveBroadcastPayload
      }
    } catch {
      // Fallback to control state
    }
    const control = loadPresenterControlState()
    return {
      presenterMode: control.presenterMode,
      liveMatchId: control.liveMatchId,
      winnerBannerData: control.winnerBannerData,
      quizState: null,
      updatedAt: Date.now(),
    }
  }

  function subscribe(onUpdate: (payload: LiveBroadcastPayload) => void): () => void {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; payload?: LiveBroadcastPayload }
      if (data?.type === 'STATE_UPDATE' && data.payload) {
        onUpdate(data.payload)
      }
    }
    channel?.addEventListener('message', handler)

    const storageHandler = (e: StorageEvent) => {
      if (e.key === LIVE_STATE_STORAGE_KEY && e.newValue) {
        try {
          onUpdate(JSON.parse(e.newValue) as LiveBroadcastPayload)
        } catch {
          // Ignore malformed JSON
        }
      }
    }
    window.addEventListener('storage', storageHandler)

    return () => {
      channel?.removeEventListener('message', handler)
      window.removeEventListener('storage', storageHandler)
      channel?.close()
    }
  }

  return {
    publishState,
    loadStoredState,
    subscribe,
  }
}
