import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useOfflineQueue } from '../composables/useOfflineQueue'
import type {
  EventData,
  Match,
  ParsedQuestionInput,
  Question,
  Team,
  TeamCount,
  TournamentBundle,
} from '../types'

const BUNDLE_STORAGE_KEY = 'protic100_active_bundle'
const ACTIVE_EVENT_ID_KEY = 'protic100_active_event_id'

export const useTournamentStore = defineStore('tournament', () => {
  const events = ref<EventData[]>([])
  const activeEvent = ref<EventData | null>(null)
  const teams = ref<Team[]>([])
  const matches = ref<Match[]>([])
  const questions = ref<Question[]>([])

  const loading = ref(false)
  const error = ref<string | null>(null)

  const mainQuestionsCount = computed(
    () => questions.value.filter((q) => q.type === 'main').length
  )
  const backupQuestionsCount = computed(
    () => questions.value.filter((q) => q.type === 'backup').length
  )
  const unusedBackupCount = computed(
    () => questions.value.filter((q) => q.type === 'backup' && q.is_used === 0).length
  )

  function saveBundleLocally(bundle: TournamentBundle) {
    localStorage.setItem(BUNDLE_STORAGE_KEY, JSON.stringify(bundle))
    localStorage.setItem(ACTIVE_EVENT_ID_KEY, bundle.event.id)
  }

  function loadBundleFromLocal(): boolean {
    const raw = localStorage.getItem(BUNDLE_STORAGE_KEY)
    if (!raw) return false
    try {
      const parsed = JSON.parse(raw) as TournamentBundle
      activeEvent.value = parsed.event
      teams.value = parsed.teams
      matches.value = parsed.matches
      questions.value = parsed.questions
      return true
    } catch {
      return false
    }
  }

  async function fetchEvents(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/events', { credentials: 'include' })
      if (!res.ok) throw new Error('Gagal memuat daftar event')
      const data = (await res.json()) as { events: EventData[] }
      events.value = data.events

      const savedId = localStorage.getItem(ACTIVE_EVENT_ID_KEY)
      const target =
        events.value.find((e) => e.id === savedId) ?? events.value[0] ?? null
      if (target) {
        await selectEvent(target.id)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal memuat event'
      loadBundleFromLocal()
    } finally {
      loading.value = false
    }
  }

  async function selectEvent(eventId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/events/${eventId}/bundle`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Gagal mengunduh bundel event')
      const bundle = (await res.json()) as TournamentBundle
      activeEvent.value = bundle.event
      teams.value = bundle.teams
      matches.value = bundle.matches
      questions.value = bundle.questions

      // Terapkan ulang hasil match yang masih mengantre di sync_queue agar tidak tertimpa data lama dari D1
      try {
        const rawQueue = localStorage.getItem('protic100_sync_queue')
        if (rawQueue) {
          const queued = JSON.parse(rawQueue) as Array<{
            matchId: string
            score_a: number
            score_b: number
            winner_team_id: string
            loser_team_id: string
            used_backup_question_ids?: string[]
          }>
          for (const item of queued) {
            completeMatchLocally(
              item.matchId,
              item.score_a,
              item.score_b,
              item.winner_team_id,
              item.loser_team_id
            )
            if (Array.isArray(item.used_backup_question_ids)) {
              for (const qId of item.used_backup_question_ids) {
                markBackupUsedLocally(qId)
              }
            }
          }
        }
      } catch {
        // Ignore malformed queue
      }

      saveBundleLocally({
        event: activeEvent.value,
        teams: teams.value,
        matches: matches.value,
        questions: questions.value,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal memuat bundel'
      loadBundleFromLocal()
    } finally {
      loading.value = false
    }
  }

  async function createEvent(payload: {
    name: string
    team_count: TeamCount
    timer_seconds: number
  }): Promise<EventData | null> {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as { event?: EventData; error?: string }
      if (!res.ok || !data.event) {
        error.value = data.error ?? 'Gagal membuat event baru'
        return null
      }
      events.value = [data.event, ...events.value]
      await selectEvent(data.event.id)
      return data.event
    } catch {
      error.value = 'Tidak dapat terhubung ke server'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateTeams(updatedTeams: Team[]): Promise<boolean> {
    if (!activeEvent.value) return false
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/events/${activeEvent.value.id}/teams`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teams: updatedTeams.map((t) => ({
            id: t.id,
            name: t.name,
            seed_order: t.seed_order,
          })),
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        error.value = data.error ?? 'Gagal menyimpan susunan tim'
        return false
      }
      await selectEvent(activeEvent.value.id)
      return true
    } catch {
      error.value = 'Gagal menghubungi server'
      return false
    } finally {
      loading.value = false
    }
  }

  async function importQuestions(
    parsedQuestions: ParsedQuestionInput[]
  ): Promise<boolean> {
    if (!activeEvent.value) return false
    loading.value = true
    error.value = null
    try {
      const res = await fetch(
        `/api/events/${activeEvent.value.id}/questions/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ questions: parsedQuestions }),
        }
      )
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        error.value = data.error ?? 'Gagal mengimpor soal'
        return false
      }
      await selectEvent(activeEvent.value.id)
      return true
    } catch {
      error.value = 'Gagal menghubungi server'
      return false
    } finally {
      loading.value = false
    }
  }

  async function resetMatch(matchId: string): Promise<boolean> {
    if (!activeEvent.value) return false
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/matches/${matchId}/reset`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        error.value = data.error ?? 'Gagal mereset match'
        return false
      }
      await selectEvent(activeEvent.value.id)
      return true
    } catch {
      error.value = 'Gagal menghubungi server'
      return false
    } finally {
      loading.value = false
    }
  }

  function setMatchInProgressLocally(matchId: string) {
    const target = matches.value.find((m) => m.id === matchId)
    if (target && target.status === 'pending') {
      target.status = 'in_progress'
      if (activeEvent.value) {
        saveBundleLocally({
          event: activeEvent.value,
          teams: teams.value,
          matches: matches.value,
          questions: questions.value,
        })
      }
    }
  }

  function markBackupUsedLocally(questionId: string) {
    const q = questions.value.find((item) => item.id === questionId)
    if (q) {
      q.is_used = 1
    }
    if (activeEvent.value) {
      saveBundleLocally({
        event: activeEvent.value,
        teams: teams.value,
        matches: matches.value,
        questions: questions.value,
      })
    }
  }

  function completeMatchLocally(
    matchId: string,
    scoreA: number,
    scoreB: number,
    winnerId: string,
    loserId: string,
    usedBackupQuestionIds: string[] = []
  ) {
    const target = matches.value.find((m) => m.id === matchId)
    if (!target) return
    target.score_a = scoreA
    target.score_b = scoreB
    target.winner_team_id = winnerId
    target.loser_team_id = loserId
    target.status = 'completed'

    for (const qId of usedBackupQuestionIds) {
      const q = questions.value.find((item) => item.id === qId)
      if (q) {
        q.is_used = 1
      }
    }

    if (target.next_win_match_number && target.next_win_slot) {
      const nextWin = matches.value.find(
        (m) => m.match_number === target.next_win_match_number
      )
      if (nextWin) {
        if (target.next_win_slot === 'A') nextWin.team_a_id = winnerId
        else nextWin.team_b_id = winnerId
      }
    }

    if (target.next_lose_match_number && target.next_lose_slot) {
      const nextLose = matches.value.find(
        (m) => m.match_number === target.next_lose_match_number
      )
      if (nextLose) {
        if (target.next_lose_slot === 'A') nextLose.team_a_id = loserId
        else nextLose.team_b_id = loserId
      }
    }

    if (activeEvent.value) {
      saveBundleLocally({
        event: activeEvent.value,
        teams: teams.value,
        matches: matches.value,
        questions: questions.value,
      })
    }
  }

  async function completeMatch(
    matchId: string,
    payload: {
      score_a: number
      score_b: number
      winner_team_id: string
      loser_team_id: string
      used_backup_question_ids: string[]
    }
  ): Promise<{ syncedNow: boolean }> {
    const plainPayload = {
      score_a: Number(payload.score_a),
      score_b: Number(payload.score_b),
      winner_team_id: String(payload.winner_team_id),
      loser_team_id: String(payload.loser_team_id),
      used_backup_question_ids: [...payload.used_backup_question_ids],
    }

    completeMatchLocally(
      matchId,
      plainPayload.score_a,
      plainPayload.score_b,
      plainPayload.winner_team_id,
      plainPayload.loser_team_id,
      plainPayload.used_backup_question_ids
    )

    const offlineQueue = useOfflineQueue()
    return await offlineQueue.submitMatchCompletion({
      matchId,
      ...plainPayload,
    })
  }

  return {
    events,
    activeEvent,
    teams,
    matches,
    questions,
    loading,
    error,
    mainQuestionsCount,
    backupQuestionsCount,
    unusedBackupCount,
    fetchEvents,
    selectEvent,
    createEvent,
    updateTeams,
    importQuestions,
    resetMatch,
    loadBundleFromLocal,
    setMatchInProgressLocally,
    markBackupUsedLocally,
    completeMatchLocally,
    completeMatch,
  }
})

