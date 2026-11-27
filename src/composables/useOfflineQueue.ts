import { ref } from 'vue'

const SYNC_QUEUE_KEY = 'protic100_sync_queue'

export interface CompleteMatchPayload {
  matchId: string
  score_a: number
  score_b: number
  winner_team_id: string
  loser_team_id: string
  used_backup_question_ids: string[]
}

const pendingCount = ref(readQueue().length)
const isSyncing = ref(false)
let listenersAttached = false

function readQueue(): CompleteMatchPayload[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as CompleteMatchPayload[]) : []
  } catch {
    return []
  }
}

function writeQueue(items: CompleteMatchPayload[]) {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items))
  pendingCount.value = items.length
}

async function sendToApi(item: CompleteMatchPayload): Promise<boolean> {
  try {
    const res = await fetch(`/api/matches/${item.matchId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        score_a: item.score_a,
        score_b: item.score_b,
        winner_team_id: item.winner_team_id,
        loser_team_id: item.loser_team_id,
        used_backup_question_ids: item.used_backup_question_ids,
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(
        `[useOfflineQueue] Gagal sinkron match ${item.matchId} (HTTP ${res.status}):`,
        errText
      )
      return false
    }
    return true
  } catch (err) {
    console.error(`[useOfflineQueue] Network error saat sinkron match ${item.matchId}:`, err)
    return false
  }
}

export function useOfflineQueue() {
  async function flushQueue(): Promise<{ synced: number; remaining: number }> {
    if (isSyncing.value) {
      return { synced: 0, remaining: pendingCount.value }
    }
    const queue = readQueue()
    if (queue.length === 0) {
      return { synced: 0, remaining: 0 }
    }

    isSyncing.value = true
    const remaining: CompleteMatchPayload[] = []
    let synced = 0

    for (const item of queue) {
      const ok = await sendToApi(item)
      if (ok) {
        synced++
      } else {
        remaining.push(item)
      }
    }

    writeQueue(remaining)
    isSyncing.value = false
    return { synced, remaining: remaining.length }
  }

  async function submitMatchCompletion(
    payload: CompleteMatchPayload
  ): Promise<{ syncedNow: boolean }> {
    const ok = await sendToApi(payload)
    if (ok) {
      return { syncedNow: true }
    }
    const queue = readQueue().filter((q) => q.matchId !== payload.matchId)
    queue.push(payload)
    writeQueue(queue)
    return { syncedNow: false }
  }

  if (typeof window !== 'undefined' && !listenersAttached) {
    listenersAttached = true
    window.addEventListener('online', () => {
      flushQueue()
    })
  }

  return {
    pendingCount,
    isSyncing,
    flushQueue,
    submitMatchCompletion,
  }
}

