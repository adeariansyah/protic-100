<script setup lang="ts">
import { ref, watch } from 'vue'
import { Shuffle } from 'lucide-vue-next'
import type { Team, TeamCount } from '../../types'
import { shuffleTeams } from '../../utils/bracketGenerator'
import BrutalModal from '../brutal/BrutalModal.vue'
import BrutalButton from '../brutal/BrutalButton.vue'
import BrutalBadge from '../brutal/BrutalBadge.vue'

const props = defineProps<{
  open: boolean
  teams: Team[]
  teamCount: TeamCount
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [teams: Team[]]
}>()

const editableTeams = ref<Team[]>([])

watch(
  () => [props.open, props.teams],
  () => {
    if (props.open) {
      editableTeams.value = props.teams
        .map((t) => ({ ...t }))
        .sort((a, b) => a.seed_order - b.seed_order)
    }
  },
  { immediate: true }
)

function handleShuffle() {
  editableTeams.value = shuffleTeams(editableTeams.value)
}

function slotLabel(seed: number): string {
  if (props.teamCount === 4) {
    return seed <= 2 ? `Match 1 (${seed === 1 ? 'A' : 'B'})` : `Match 2 (${seed === 3 ? 'A' : 'B'})`
  }
  if (props.teamCount === 6) {
    if (seed === 1) return 'BYE → Semifinal 1 (M3)'
    if (seed === 2) return 'BYE → Semifinal 2 (M4)'
    if (seed <= 4) return `Penyisihan M1 (${seed === 3 ? 'A' : 'B'})`
    return `Penyisihan M2 (${seed === 5 ? 'A' : 'B'})`
  }
  const matchNum = Math.ceil(seed / 2)
  const slot = seed % 2 === 1 ? 'A' : 'B'
  return `Penyisihan M${matchNum} (${slot})`
}

function handleSave() {
  emit('save', editableTeams.value)
}
</script>

<template>
  <BrutalModal :open="open" title="Setup Tim & Bagan Turnamen" @close="emit('close')">
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2 bg-[#FFF9DB] p-3 border-2 border-black rounded-sm">
        <p class="text-xs sm:text-sm font-semibold">
          Edit nama tim atau klik <strong>Acak Bagan</strong> untuk mengundi posisi slot pertandingan awal.
        </p>
        <BrutalButton variant="purple" size="sm" @click="handleShuffle">
          <Shuffle class="w-4 h-4" />
          Acak Bagan (Shuffle)
        </BrutalButton>
      </div>

      <div class="space-y-2.5">
        <div
          v-for="team in editableTeams"
          :key="team.id"
          class="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 bg-white border-2 border-black rounded-sm"
        >
          <div class="flex items-center gap-2 sm:w-56 shrink-0">
            <span class="font-mono-num w-7 h-7 flex items-center justify-center bg-black text-white font-extrabold text-sm rounded-sm">
              {{ team.seed_order }}
            </span>
            <BrutalBadge :color="teamCount === 6 && team.seed_order <= 2 ? 'green' : 'blue'">
              {{ slotLabel(team.seed_order) }}
            </BrutalBadge>
          </div>
          <input
            v-model="team.name"
            type="text"
            class="flex-1 px-3 py-1.5 border-2 border-black rounded-sm font-bold focus:outline-none focus:bg-[#FFF9DB]"
            placeholder="Nama Tim..."
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <BrutalButton variant="white" @click="emit('close')">Batal</BrutalButton>
        <BrutalButton variant="green" :disabled="saving" @click="handleSave">
          {{ saving ? 'Menyimpan...' : 'Simpan Susunan Tim' }}
        </BrutalButton>
      </div>
    </div>
  </BrutalModal>
</template>

