import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AnswerOption, Match, Question, Team } from '../types'
import { useTournamentStore } from './tournamentStore'
import { useSoundEffects } from '../composables/useSoundEffects'
import {
  loadPresenterControlState,
  mapAnswersForPresenter,
  savePresenterControlState,
  useBroadcastSync,
  type LiveBroadcastPayload,
  type PresenterMode,
  type QuizBoardState,
  type WinnerBannerData,
} from '../composables/useBroadcastSync'
import { useOfflineQueue } from '../composables/useOfflineQueue'

const MATCH_PROGRESS_KEY = 'protic100_match_progress'

export interface LiveQuestionState {
  id: string
  type: 'main' | 'backup'
  label: string
  questionText: string
  answers: AnswerOption[]
  revealed: boolean[]
  awardedTo: Array<'A' | 'B' | 'NONE' | null>
}

interface GameSnapshot {
  scoreA: number
  scoreB: number
  activeTurn: 'A' | 'B'
  strikes: number
  currentQuestionIndex: number
  loadedQuestions: LiveQuestionState[]
  revealZeroPointsMode: boolean
}

export const useGameEngineStore = defineStore('gameEngine', () => {
  const tournament = useTournamentStore()
  const sound = useSoundEffects()
  const broadcast = useBroadcastSync()
  const offlineQueue = useOfflineQueue()

  const initialControl = loadPresenterControlState()
  const presenterMode = ref<PresenterMode>(initialControl.presenterMode)
  const liveMatchId = ref<string | null>(initialControl.liveMatchId)
  const winnerBannerData = ref<WinnerBannerData | null>(
    initialControl.winnerBannerData
  )

  const match = ref<Match | null>(null)
  const teamA = ref<Team | null>(null)
  const teamB = ref<Team | null>(null)

  const scoreA = ref(0)
  const scoreB = ref(0)
  const activeTurn = ref<'A' | 'B'>('A')
  const strikes = ref(0)
  const timerSeconds = ref(20)
  const timerRemaining = ref(20)
  const timerRunning = ref(false)

  const currentQuestionIndex = ref(0)
  const loadedQuestions = ref<LiveQuestionState[]>([])
  const revealZeroPointsMode = ref(false)
  const usedBackupQuestionIds = ref<string[]>([])
  const strikeOverlayTick = ref(0)
  const q2TurnSwapped = ref(false)

  const history = ref<GameSnapshot[]>([])
  let timerInterval: number | null = null
  let autoSwitchTimeout: number | null = null
  let winnerResetTimeout: number | null = null

  const currentQuestion = computed(
    () => loadedQuestions.value[currentQuestionIndex.value] ?? null
  )

  const isLiveOnCurrentMatch = computed(
    () =>
      presenterMode.value === 'quiz' &&
      match.value !== null &&
      match.value.id === liveMatchId.value
  )

  const isTiedAfterMain = computed(() => {
    return (
      loadedQuestions.value.length >= 2 &&
      currentQuestionIndex.value >= 1 &&
      scoreA.value === scoreB.value
    )
  })

  const canUndo = computed(() => history.value.length > 0)

  function parseAnswers(q: Question): AnswerOption[] {
    try {
      const parsed = JSON.parse(q.answers_json)
      return Array.isArray(parsed) ? (parsed as AnswerOption[]) : []
    } catch {
      return []
    }
  }

  function cloneQuestions(qs: LiveQuestionState[]): LiveQuestionState[] {
    return qs.map((q) => ({
      ...q,
      answers: q.answers.map((a) => ({ ...a })),
      revealed: [...q.revealed],
      awardedTo: [...q.awardedTo],
    }))
  }

  function pushSnapshot() {
    history.value.push({
      scoreA: scoreA.value,
      scoreB: scoreB.value,
      activeTurn: activeTurn.value,
      strikes: strikes.value,
      currentQuestionIndex: currentQuestionIndex.value,
      loadedQuestions: cloneQuestions(loadedQuestions.value),
      revealZeroPointsMode: revealZeroPointsMode.value,
    })
    if (history.value.length > 50) {
      history.value.shift()
    }
  }

  function buildQuizBoardState(): QuizBoardState | null {
    if (!match.value) return null
    const q = currentQuestion.value
    return {
      matchId: match.value.id,
      roundName: match.value.round_name,
      matchNumber: match.value.match_number,
      teamAName: teamA.value?.name ?? 'Tim A',
      teamBName: teamB.value?.name ?? 'Tim B',
      scoreA: scoreA.value,
      scoreB: scoreB.value,
      activeTurn: activeTurn.value,
      strikes: strikes.value,
      timerRemaining: timerRemaining.value,
      timerSeconds: timerSeconds.value,
      questionLabel: q?.label ?? '',
      questionText: q?.questionText ?? '',
      answers: q ? mapAnswersForPresenter(q.answers, q.revealed) : [],
      strikeOverlayTick: strikeOverlayTick.value,
    }
  }

  function persistLocalMatchProgress() {
    if (!match.value) return
    try {
      localStorage.setItem(
        MATCH_PROGRESS_KEY,
        JSON.stringify({
          matchId: match.value.id,
          scoreA: scoreA.value,
          scoreB: scoreB.value,
          activeTurn: activeTurn.value,
          strikes: strikes.value,
          currentQuestionIndex: currentQuestionIndex.value,
          loadedQuestions: loadedQuestions.value,
          revealZeroPointsMode: revealZeroPointsMode.value,
          usedBackupQuestionIds: usedBackupQuestionIds.value,
          q2TurnSwapped: q2TurnSwapped.value,
        })
      )
    } catch {
      // Ignore quota errors
    }
  }

  /**
   * Sinkronisasi state papan kuis ke BroadcastChannel.
   * HANYA mengirim jika presenterMode === 'quiz' DAN match.id === liveMatchId.
   */
  function syncQuizBoardIfLive() {
    persistLocalMatchProgress()
    if (presenterMode.value !== 'quiz' || !match.value || match.value.id !== liveMatchId.value) {
      return
    }
    const payload: LiveBroadcastPayload = {
      presenterMode: 'quiz',
      liveMatchId: liveMatchId.value,
      winnerBannerData: null,
      quizState: buildQuizBoardState(),
      updatedAt: Date.now(),
    }
    broadcast.publishState(payload)
  }

  function publishControlTransition(quizState: QuizBoardState | null = null) {
    savePresenterControlState({
      presenterMode: presenterMode.value,
      liveMatchId: liveMatchId.value,
      winnerBannerData: winnerBannerData.value,
    })
    const payload: LiveBroadcastPayload = {
      presenterMode: presenterMode.value,
      liveMatchId: liveMatchId.value,
      winnerBannerData: winnerBannerData.value,
      quizState,
      updatedAt: Date.now(),
    }
    broadcast.publishState(payload)
  }

  function stopTimerInterval() {
    if (timerInterval !== null) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    timerRunning.value = false
  }

  function clearAutoSwitchTimeout() {
    if (autoSwitchTimeout !== null) {
      clearTimeout(autoSwitchTimeout)
      autoSwitchTimeout = null
    }
  }

  function clearWinnerResetTimeout() {
    if (winnerResetTimeout !== null) {
      clearTimeout(winnerResetTimeout)
      winnerResetTimeout = null
    }
  }

  function initMatch(matchId: string): boolean {
    stopTimerInterval()
    clearAutoSwitchTimeout()

    // Muat ulang kontrol presenter terkini tanpa mengubah presenterMode atau liveMatchId
    const control = loadPresenterControlState()
    presenterMode.value = control.presenterMode
    liveMatchId.value = control.liveMatchId
    winnerBannerData.value = control.winnerBannerData

    if (!tournament.activeEvent) {
      tournament.loadBundleFromLocal()
    }

    const foundMatch = tournament.matches.find((m) => m.id === matchId) ?? null
    if (!foundMatch) return false

    match.value = foundMatch
    teamA.value =
      tournament.teams.find((t) => t.id === foundMatch.team_a_id) ?? null
    teamB.value =
      tournament.teams.find((t) => t.id === foundMatch.team_b_id) ?? null
    timerSeconds.value = tournament.activeEvent?.timer_seconds ?? 20

    // Cek pemulihan state dari localStorage jika match yang sama sedang berjalan
    const savedRaw = localStorage.getItem(MATCH_PROGRESS_KEY)
    if (savedRaw) {
      try {
        const saved = JSON.parse(savedRaw) as {
          matchId: string
          scoreA: number
          scoreB: number
          activeTurn: 'A' | 'B'
          strikes: number
          currentQuestionIndex: number
          loadedQuestions: LiveQuestionState[]
          revealZeroPointsMode: boolean
          usedBackupQuestionIds: string[]
          q2TurnSwapped: boolean
        }
        if (saved.matchId === matchId && saved.loadedQuestions.length > 0) {
          scoreA.value = saved.scoreA
          scoreB.value = saved.scoreB
          activeTurn.value = saved.activeTurn
          strikes.value = saved.strikes
          currentQuestionIndex.value = saved.currentQuestionIndex
          loadedQuestions.value = saved.loadedQuestions
          revealZeroPointsMode.value = saved.revealZeroPointsMode
          usedBackupQuestionIds.value = saved.usedBackupQuestionIds
          q2TurnSwapped.value = saved.q2TurnSwapped
          timerRemaining.value = timerSeconds.value
          history.value = []
          return true
        }
      } catch {
        // Fallback to fresh init
      }
    }

    const mainQs = tournament.questions
      .filter(
        (q) => q.type === 'main' && q.match_number === foundMatch.match_number
      )
      .sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0))

    loadedQuestions.value = mainQs.map((q) => {
      const answers = parseAnswers(q)
      return {
        id: q.id,
        type: 'main',
        label: `Soal ${q.question_order ?? 1}`,
        questionText: q.question_text,
        answers,
        revealed: answers.map(() => false),
        awardedTo: answers.map(() => null),
      }
    })

    scoreA.value = foundMatch.status === 'completed' ? foundMatch.score_a : 0
    scoreB.value = foundMatch.status === 'completed' ? foundMatch.score_b : 0
    activeTurn.value = 'A'
    strikes.value = 0
    timerRemaining.value = timerSeconds.value
    currentQuestionIndex.value = 0
    revealZeroPointsMode.value = false
    usedBackupQuestionIds.value = []
    q2TurnSwapped.value = false
    strikeOverlayTick.value = 0
    history.value = []

    return true
  }

  /**
   * Tombol "Start Pertandingan":
   * Mengubah status match -> 'in_progress', set liveMatchId & presenterMode='quiz',
   * langsung mem-broadcast state papan kuis, dan otomatis menjalankan countdown timer.
   */
  function startMatchLive() {
    if (!match.value) return
    clearWinnerResetTimeout()
    if (match.value.status === 'pending') {
      match.value.status = 'in_progress'
      tournament.setMatchInProgressLocally(match.value.id)
    }
    strikeOverlayTick.value = 0
    liveMatchId.value = match.value.id
    presenterMode.value = 'quiz'
    winnerBannerData.value = null
    persistLocalMatchProgress()
    publishControlTransition(buildQuizBoardState())
    startTimer()
  }

  /**
   * Tombol Saklar "Go Live" (Toggle):
   * Hanya mengatur tayangan proyektor (ON AIR / STANDBY) tanpa menjalankan timer.
   */
  function toggleGoLive() {
    if (!match.value) return
    clearWinnerResetTimeout()
    if (presenterMode.value === 'quiz' && liveMatchId.value === match.value.id) {
      presenterMode.value = 'standby'
      liveMatchId.value = null
      winnerBannerData.value = null
      publishControlTransition(null)
    } else {
      strikeOverlayTick.value = 0
      liveMatchId.value = match.value.id
      presenterMode.value = 'quiz'
      winnerBannerData.value = null
      persistLocalMatchProgress()
      publishControlTransition(buildQuizBoardState())
    }
  }

  function revealAnswer(index: number) {
    const q = currentQuestion.value
    if (!q || index < 0 || index >= q.answers.length) return
    if (q.revealed[index]) return

    pushSnapshot()
    q.revealed[index] = true
    const pts = q.answers[index]?.points ?? 0

    if (revealZeroPointsMode.value) {
      q.awardedTo[index] = 'NONE'
    } else if (activeTurn.value === 'A') {
      scoreA.value += pts
      q.awardedTo[index] = 'A'
    } else {
      scoreB.value += pts
      q.awardedTo[index] = 'B'
    }

    // Otomatis pause dan reset timer saat jawaban benar di-reveal
    stopTimerInterval()
    timerRemaining.value = timerSeconds.value

    sound.playReveal()
    syncQuizBoardIfLive()
  }

  function hideAnswer(index: number) {
    const q = currentQuestion.value
    if (!q || index < 0 || index >= q.answers.length) return
    if (!q.revealed[index]) return

    pushSnapshot()
    const pts = q.answers[index]?.points ?? 0
    const awarded = q.awardedTo[index]

    if (awarded === 'A') {
      scoreA.value = Math.max(0, scoreA.value - pts)
    } else if (awarded === 'B') {
      scoreB.value = Math.max(0, scoreB.value - pts)
    }

    q.revealed[index] = false
    q.awardedTo[index] = null
    syncQuizBoardIfLive()
  }

  function toggleAnswer(index: number) {
    const q = currentQuestion.value
    if (!q) return
    if (q.revealed[index]) {
      hideAnswer(index)
    } else {
      revealAnswer(index)
    }
  }

  function switchTurn() {
    clearAutoSwitchTimeout()
    pushSnapshot()
    activeTurn.value = activeTurn.value === 'A' ? 'B' : 'A'
    strikes.value = 0
    stopTimerInterval()
    timerRemaining.value = timerSeconds.value
    syncQuizBoardIfLive()
  }

  function setTurn(team: 'A' | 'B') {
    if (activeTurn.value === team) return
    pushSnapshot()
    activeTurn.value = team
    syncQuizBoardIfLive()
  }

  function addStrike() {
    if (strikes.value >= 3) return
    pushSnapshot()
    strikes.value = Math.min(3, strikes.value + 1)
    strikeOverlayTick.value += 1
    sound.playStrike()
    syncQuizBoardIfLive()

    // Jika mencapai 3/3 strikes, otomatis lempar giliran ke lawan setelah animasi X singkat
    if (strikes.value === 3) {
      stopTimerInterval()
      clearAutoSwitchTimeout()
      autoSwitchTimeout = window.setTimeout(() => {
        activeTurn.value = activeTurn.value === 'A' ? 'B' : 'A'
        strikes.value = 0
        timerRemaining.value = timerSeconds.value
        syncQuizBoardIfLive()
      }, 1300)
    }
  }

  function startTimer() {
    if (timerRunning.value) return
    if (timerRemaining.value <= 0) {
      timerRemaining.value = timerSeconds.value
    }
    timerRunning.value = true
    timerInterval = window.setInterval(() => {
      if (timerRemaining.value > 1) {
        timerRemaining.value -= 1
        if (timerRemaining.value <= 5) {
          sound.playTick()
        }
        syncQuizBoardIfLive()
      } else {
        timerRemaining.value = 0
        stopTimerInterval()
        addStrike() // Auto-strike saat 00:00
      }
    }, 1000)
    syncQuizBoardIfLive()
  }

  function pauseTimer() {
    stopTimerInterval()
    syncQuizBoardIfLive()
  }

  function toggleTimer() {
    if (timerRunning.value) {
      pauseTimer()
    } else {
      startTimer()
    }
  }

  function resetTimer() {
    stopTimerInterval()
    timerRemaining.value = timerSeconds.value
    syncQuizBoardIfLive()
  }

  function goToQuestion(index: number) {
    if (index < 0 || index >= loadedQuestions.value.length) return
    clearAutoSwitchTimeout()
    stopTimerInterval()
    pushSnapshot()
    currentQuestionIndex.value = index
    strikes.value = 0
    timerRemaining.value = timerSeconds.value
    revealZeroPointsMode.value = false

    // Soal 2 otomatis bertukar giliran awal ke lawan
    if (index === 1 && !q2TurnSwapped.value) {
      activeTurn.value = activeTurn.value === 'A' ? 'B' : 'A'
      q2TurnSwapped.value = true
    }

    syncQuizBoardIfLive()
  }

  function loadBackupQuestion(): boolean {
    const unused = tournament.questions.filter(
      (q) => q.type === 'backup' && q.is_used === 0
    )
    if (unused.length === 0) return false

    const randomIdx = Math.floor(Math.random() * unused.length)
    const picked = unused[randomIdx]!
    picked.is_used = 1
    usedBackupQuestionIds.value.push(picked.id)

    tournament.markBackupUsedLocally(picked.id)

    const answers = parseAnswers(picked)
    const tieNum =
      loadedQuestions.value.filter((q) => q.type === 'backup').length + 1

    clearAutoSwitchTimeout()
    stopTimerInterval()
    pushSnapshot()

    loadedQuestions.value.push({
      id: picked.id,
      type: 'backup',
      label: `Tie-Breaker #${tieNum}`,
      questionText: picked.question_text,
      answers,
      revealed: answers.map(() => false),
      awardedTo: answers.map(() => null),
    })

    currentQuestionIndex.value = loadedQuestions.value.length - 1
    strikes.value = 0
    timerRemaining.value = timerSeconds.value
    revealZeroPointsMode.value = false
    syncQuizBoardIfLive()
    return true
  }

  function undo() {
    const snap = history.value.pop()
    if (!snap) return
    clearAutoSwitchTimeout()
    scoreA.value = snap.scoreA
    scoreB.value = snap.scoreB
    activeTurn.value = snap.activeTurn
    strikes.value = snap.strikes
    currentQuestionIndex.value = snap.currentQuestionIndex
    loadedQuestions.value = snap.loadedQuestions
    revealZeroPointsMode.value = snap.revealZeroPointsMode
    syncQuizBoardIfLive()
  }

  async function completeMatch(): Promise<{
    ok: boolean
    syncedNow: boolean
    error?: string
  }> {
    if (!match.value || !teamA.value || !teamB.value) {
      return { ok: false, syncedNow: false, error: 'Data match tidak lengkap' }
    }
    if (scoreA.value === scoreB.value) {
      return {
        ok: false,
        syncedNow: false,
        error: 'Skor masih seri! Muat Soal Cadangan (Tie-Breaker) terlebih dahulu.',
      }
    }

    stopTimerInterval()
    clearAutoSwitchTimeout()
    clearWinnerResetTimeout()

    const aWins = scoreA.value > scoreB.value
    const winnerId = aWins ? teamA.value.id : teamB.value.id
    const loserId = aWins ? teamB.value.id : teamA.value.id
    const winnerTeamName = aWins ? teamA.value.name : teamB.value.name

    sound.playWin()

    winnerBannerData.value = {
      matchName: `${match.value.round_name} — Match #${match.value.match_number}`,
      winnerName: winnerTeamName,
      scoreA: scoreA.value,
      scoreB: scoreB.value,
      teamAName: teamA.value.name,
      teamBName: teamB.value.name,
    }
    presenterMode.value = 'winner'
    publishControlTransition(null)

    // Setelah 5 detik (5000 ms), otomatis kembali ke mode 'standby'
    winnerResetTimeout = window.setTimeout(() => {
      presenterMode.value = 'standby'
      liveMatchId.value = null
      winnerBannerData.value = null
      publishControlTransition(null)
    }, 5000)

    tournament.completeMatchLocally(
      match.value.id,
      scoreA.value,
      scoreB.value,
      winnerId,
      loserId
    )

    const { syncedNow } = await offlineQueue.submitMatchCompletion({
      matchId: match.value.id,
      score_a: scoreA.value,
      score_b: scoreB.value,
      winner_team_id: winnerId,
      loser_team_id: loserId,
      used_backup_question_ids: usedBackupQuestionIds.value,
    })

    localStorage.removeItem(MATCH_PROGRESS_KEY)
    return { ok: true, syncedNow }
  }

  function cleanup() {
    stopTimerInterval()
    clearAutoSwitchTimeout()
    // Jangan clear winnerResetTimeout agar transisi winner -> standby tetap jalan walau operator kembali ke dashboard
  }

  return {
    presenterMode,
    liveMatchId,
    winnerBannerData,
    isLiveOnCurrentMatch,
    match,
    teamA,
    teamB,
    scoreA,
    scoreB,
    activeTurn,
    strikes,
    timerSeconds,
    timerRemaining,
    timerRunning,
    currentQuestionIndex,
    loadedQuestions,
    currentQuestion,
    revealZeroPointsMode,
    usedBackupQuestionIds,
    strikeOverlayTick,
    isTiedAfterMain,
    canUndo,
    initMatch,
    startMatchLive,
    toggleGoLive,
    revealAnswer,
    hideAnswer,
    toggleAnswer,
    switchTurn,
    setTurn,
    addStrike,
    startTimer,
    pauseTimer,
    toggleTimer,
    resetTimer,
    goToQuestion,
    loadBackupQuestion,
    undo,
    completeMatch,
    cleanup,
  }
})
