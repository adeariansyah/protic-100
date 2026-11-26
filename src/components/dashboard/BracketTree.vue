<script setup lang="ts">
import { computed } from 'vue'
import type { Match, Team } from '../../types'
import BrutalCard from '../brutal/BrutalCard.vue'
import BrutalButton from '../brutal/BrutalButton.vue'
import BrutalBadge from '../brutal/BrutalBadge.vue'

const props = defineProps<{
  matches: Match[]
  teams: Team[]
  hasRequiredQuestions: boolean
}>()

const emit = defineEmits<{
  startMatch: [matchId: string]
  resetMatch: [matchId: string]
}>()

const teamMap = computed(() => {
  const map = new Map<string, Team>()
  for (const t of props.teams) {
    map.set(t.id, t)
  }
  return map
})

const groupedRounds = computed(() => {
  const order = ['Penyisihan', 'Semifinal', 'Perebutan Juara 3', 'Final']
  const groups = new Map<string, Match[]>()
  for (const round of order) {
    groups.set(round, [])
  }
  for (const m of props.matches) {
    const arr = groups.get(m.round_name) ?? []
    arr.push(m)
    groups.set(m.round_name, arr)
  }
  return Array.from(groups.entries()).filter(([, list]) => list.length > 0)
})

function getTeamName(teamId: string | null): string {
  if (!teamId) return 'Menunggu Hasil...'
  return teamMap.value.get(teamId)?.name ?? 'Tim Tidak Dikenal'
}

function statusBadgeColor(status: Match['status']): 'white' | 'yellow' | 'green' {
  if (status === 'completed') return 'green'
  if (status === 'in_progress') return 'yellow'
  return 'white'
}
</script>

<template>
  <div class="space-y-6">
    <div v-for="[roundName, roundMatches] in groupedRounds" :key="roundName" class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="px-3 py-1 bg-black text-white text-xs font-extrabold uppercase tracking-wider rounded-sm">
          {{ roundName }}
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BrutalCard
          v-for="match in roundMatches"
          :key="match.id"
          :bg="match.status === 'completed' ? 'bg-[#F0FDF4]' : 'bg-white'"
          padding="p-4"
          class="space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="font-mono-num text-sm font-extrabold uppercase">
              Match #{{ match.match_number }}
            </span>
            <BrutalBadge :color="statusBadgeColor(match.status)">
              {{
                match.status === 'completed'
                  ? 'Selesai'
                  : match.status === 'in_progress'
                    ? 'Berlangsung'
                    : 'Pending'
              }}
            </BrutalBadge>
          </div>

          <!-- Tim A vs Tim B -->
          <div class="space-y-2">
            <div
              :class="[
                'flex items-center justify-between px-3 py-2 border-2 border-black rounded-sm',
                match.winner_team_id && match.winner_team_id === match.team_a_id
                  ? 'bg-[#00E5A0] font-extrabold'
                  : 'bg-[#FFFDF7] font-bold',
              ]"
            >
              <span class="truncate">{{ getTeamName(match.team_a_id) }}</span>
              <span class="font-mono-num text-lg font-extrabold ml-3">{{ match.score_a }}</span>
            </div>

            <div
              :class="[
                'flex items-center justify-between px-3 py-2 border-2 border-black rounded-sm',
                match.winner_team_id && match.winner_team_id === match.team_b_id
                  ? 'bg-[#00E5A0] font-extrabold'
                  : 'bg-[#FFFDF7] font-bold',
              ]"
            >
              <span class="truncate">{{ getTeamName(match.team_b_id) }}</span>
              <span class="font-mono-num text-lg font-extrabold ml-3">{{ match.score_b }}</span>
            </div>
          </div>

          <div class="flex items-center justify-between gap-2 pt-1">
            <BrutalButton
              variant="yellow"
              size="sm"
              class="flex-1"
              :disabled="!match.team_a_id || !match.team_b_id || !hasRequiredQuestions"
              @click="emit('startMatch', match.id)"
            >
              {{ match.status === 'completed' ? 'Lihat / Ulang Console' : 'Buka Operator Console →' }}
            </BrutalButton>

            <BrutalButton
              v-if="match.status !== 'pending'"
              variant="red"
              size="sm"
              @click="emit('resetMatch', match.id)"
            >
              Reset
            </BrutalButton>
          </div>
        </BrutalCard>
      </div>
    </div>
  </div>
</template>

