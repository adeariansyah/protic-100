<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertTriangle,
  LogOut,
  Monitor,
  Plus,
  Upload,
  Users,
} from 'lucide-vue-next'
import { useAuthStore } from '../stores/authStore'
import { useTournamentStore } from '../stores/tournamentStore'
import type { ParsedQuestionInput, Team, TeamCount } from '../types'
import {
  computePodium,
  getRequiredMainQuestionsCount,
} from '../utils/bracketGenerator'
import BrutalCard from '../components/brutal/BrutalCard.vue'
import BrutalButton from '../components/brutal/BrutalButton.vue'
import BrutalBadge from '../components/brutal/BrutalBadge.vue'
import BrutalModal from '../components/brutal/BrutalModal.vue'
import BracketTree from '../components/dashboard/BracketTree.vue'
import PodiumCard from '../components/dashboard/PodiumCard.vue'
import TeamSetupModal from '../components/dashboard/TeamSetupModal.vue'
import QuestionImportModal from '../components/dashboard/QuestionImportModal.vue'

const router = useRouter()
const auth = useAuthStore()
const tournament = useTournamentStore()

const showCreateEventModal = ref(false)
const showTeamSetupModal = ref(false)
const showImportModal = ref(false)

const newEventName = ref('')
const newEventTeamCount = ref<TeamCount>(8)
const newEventTimer = ref(20)

const podium = computed(() => {
  if (!tournament.activeEvent) return null
  return computePodium(
    tournament.matches,
    tournament.teams,
    tournament.activeEvent.team_count
  )
})

const requiredMainCount = computed(() =>
  tournament.activeEvent
    ? getRequiredMainQuestionsCount(tournament.activeEvent.team_count)
    : 0
)

const hasRequiredQuestions = computed(
  () =>
    requiredMainCount.value > 0 &&
    tournament.mainQuestionsCount >= requiredMainCount.value
)

onMounted(async () => {
  await tournament.fetchEvents()
})

async function handleEventSelect(e: Event) {
  const target = e.target as HTMLSelectElement
  if (target.value) {
    await tournament.selectEvent(target.value)
  }
}

async function handleCreateEvent() {
  const created = await tournament.createEvent({
    name: newEventName.value,
    team_count: newEventTeamCount.value,
    timer_seconds: newEventTimer.value,
  })
  if (created) {
    showCreateEventModal.value = false
    newEventName.value = ''
    newEventTeamCount.value = 8
    newEventTimer.value = 20
  }
}

async function handleSaveTeams(updatedTeams: Team[]) {
  const ok = await tournament.updateTeams(updatedTeams)
  if (ok) {
    showTeamSetupModal.value = false
  }
}

async function handleImportQuestions(questions: ParsedQuestionInput[]) {
  const ok = await tournament.importQuestions(questions)
  if (ok) {
    showImportModal.value = false
  }
}

function handleOpenPresenter() {
  window.open('/presenter', '_blank')
}

function handleStartMatch(matchId: string) {
  router.push(`/operator/${matchId}`)
}

async function handleResetMatch(matchId: string) {
  if (confirm('Reset skor dan status match ini ke pending?')) {
    await tournament.resetMatch(matchId)
  }
}

async function handleLogout() {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="min-h-screen pb-16">
    <!-- Top Header -->
    <header class="bg-[#FFD100] border-b-4 border-black px-4 md:px-8 py-4">
      <div class="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
            PROTIC <span class="bg-[#00E5A0] px-2 border-2 border-black">100</span>
          </h1>
          <BrutalBadge color="white">Operator Dashboard</BrutalBadge>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          <BrutalButton variant="blue" size="sm" @click="handleOpenPresenter">
            <Monitor class="w-4 h-4" />
            Buka Presenter View
          </BrutalButton>
          <BrutalButton variant="white" size="sm" @click="handleLogout">
            <LogOut class="w-4 h-4" />
            Keluar ({{ auth.username ?? 'admin' }})
          </BrutalButton>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 md:px-8 pt-6 space-y-6">
      <!-- Error Banner -->
      <div
        v-if="tournament.error"
        class="p-4 bg-[#FF5E5B] text-white font-bold border-[3px] border-black rounded-md brutal-shadow"
      >
        {{ tournament.error }}
      </div>

      <!-- Event Control Bar -->
      <BrutalCard class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex-1 space-y-1">
          <label class="block text-xs font-extrabold uppercase text-neutral-600">
            Event Turnamen Aktif (Tersimpan Offline)
          </label>
          <div class="flex items-center gap-3 flex-wrap">
            <select
              :value="tournament.activeEvent?.id ?? ''"
              class="min-w-[260px] px-3.5 py-2 bg-[#FFFDF7] border-[3px] border-black rounded-md font-bold focus:outline-none"
              @change="handleEventSelect"
            >
              <option v-if="tournament.events.length === 0" value="">
                Belum ada event — Buat event baru
              </option>
              <option v-for="ev in tournament.events" :key="ev.id" :value="ev.id">
                {{ ev.name }} ({{ ev.team_count }} Tim • {{ ev.timer_seconds }}s)
              </option>
            </select>

            <BrutalButton variant="green" size="sm" @click="showCreateEventModal = true">
              <Plus class="w-4 h-4" />
              Buat Event Baru
            </BrutalButton>
          </div>
        </div>

        <div v-if="tournament.activeEvent" class="flex items-center gap-2.5 flex-wrap">
          <BrutalButton variant="purple" size="sm" @click="showTeamSetupModal = true">
            <Users class="w-4 h-4" />
            Setup Tim & Bagan
          </BrutalButton>
          <BrutalButton variant="yellow" size="sm" @click="showImportModal = true">
            <Upload class="w-4 h-4" />
            Import Soal (.JSON / .CSV)
          </BrutalButton>
        </div>
      </BrutalCard>

      <!-- Empty State -->
      <BrutalCard v-if="!tournament.activeEvent && !tournament.loading" class="text-center py-12 space-y-4">
        <h2 class="text-2xl font-extrabold uppercase">Belum Ada Event Aktif</h2>
        <p class="text-sm font-semibold text-neutral-700 max-w-md mx-auto">
          Buat event baru untuk memulai turnamen PROTIC 100 (mendukung format 4, 6, atau 8 tim).
        </p>
        <BrutalButton variant="green" size="lg" @click="showCreateEventModal = true">
          + Buat Event Pertama
        </BrutalButton>
      </BrutalCard>

      <!-- Active Event Content -->
      <template v-if="tournament.activeEvent">
        <!-- Status Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <BrutalCard padding="p-4" bg="bg-white">
            <div class="text-xs font-extrabold uppercase text-neutral-600">Format Peserta</div>
            <div class="font-mono-num text-2xl font-extrabold mt-1">
              {{ tournament.activeEvent.team_count }} Tim
            </div>
          </BrutalCard>

          <BrutalCard padding="p-4" bg="bg-white">
            <div class="text-xs font-extrabold uppercase text-neutral-600">Timer Tebakan</div>
            <div class="font-mono-num text-2xl font-extrabold mt-1">
              {{ tournament.activeEvent.timer_seconds }} Detik
            </div>
          </BrutalCard>

          <BrutalCard
            padding="p-4"
            :bg="hasRequiredQuestions ? 'bg-[#00E5A0]' : 'bg-[#FFF9DB]'"
          >
            <div class="text-xs font-extrabold uppercase text-neutral-800">Soal Utama</div>
            <div class="font-mono-num text-2xl font-extrabold mt-1">
              {{ tournament.mainQuestionsCount }} / {{ requiredMainCount }}
            </div>
          </BrutalCard>

          <BrutalCard padding="p-4" bg="bg-white">
            <div class="text-xs font-extrabold uppercase text-neutral-600">Soal Cadangan</div>
            <div class="font-mono-num text-2xl font-extrabold mt-1">
              {{ tournament.unusedBackupCount }} <span class="text-sm font-bold">Siap</span>
            </div>
          </BrutalCard>
        </div>

        <div
          v-if="!hasRequiredQuestions"
          class="p-4 bg-[#FFD100] border-[3px] border-black rounded-md brutal-shadow flex items-center justify-between flex-wrap gap-3"
        >
          <p class="text-sm font-extrabold inline-flex items-center gap-2">
            <AlertTriangle class="w-5 h-5 shrink-0" />
            Soal utama belum lengkap ({{ tournament.mainQuestionsCount }}/{{ requiredMainCount }}). Silakan import soal terlebih dahulu sebelum membuka Operator Console.
          </p>
          <BrutalButton variant="black" size="sm" @click="showImportModal = true">
            Import Soal Sekarang
          </BrutalButton>
        </div>

        <!-- Podium Juara -->
        <PodiumCard v-if="podium" :podium="podium" />

        <!-- Bagan Pertandingan -->
        <div class="space-y-3">
          <h2 class="text-xl font-extrabold uppercase">Bagan & Daftar Pertandingan</h2>
          <BracketTree
            :matches="tournament.matches"
            :teams="tournament.teams"
            :has-required-questions="hasRequiredQuestions"
            @start-match="handleStartMatch"
            @reset-match="handleResetMatch"
          />
        </div>
      </template>
    </main>

    <!-- Modal Buat Event Baru -->
    <BrutalModal
      :open="showCreateEventModal"
      title="Buat Event Turnamen Baru"
      max-width="max-w-lg"
      @close="showCreateEventModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleCreateEvent">
        <div class="space-y-1.5">
          <label class="block text-sm font-extrabold uppercase">Nama Event</label>
          <input
            v-model="newEventName"
            type="text"
            required
            placeholder="Contoh: PROTIC 100 — Makrab 2026"
            class="w-full px-3.5 py-2.5 bg-white border-[3px] border-black rounded-md font-bold focus:outline-none focus:bg-[#FFF9DB]"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="block text-sm font-extrabold uppercase">Format Tim</label>
            <select
              v-model.number="newEventTeamCount"
              class="w-full px-3.5 py-2.5 bg-white border-[3px] border-black rounded-md font-bold focus:outline-none"
            >
              <option :value="4">4 Tim (4 Match / 8 Soal)</option>
              <option :value="6">6 Tim (6 Match / 12 Soal + 2 Bye)</option>
              <option :value="8">8 Tim (8 Match / 16 Soal)</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="block text-sm font-extrabold uppercase">Timer (Detik)</label>
            <input
              v-model.number="newEventTimer"
              type="number"
              min="5"
              max="120"
              required
              class="w-full px-3.5 py-2.5 bg-white border-[3px] border-black rounded-md font-mono-num font-bold focus:outline-none"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <BrutalButton variant="white" @click="showCreateEventModal = false">Batal</BrutalButton>
          <BrutalButton type="submit" variant="green" :disabled="tournament.loading">
            {{ tournament.loading ? 'Membuat...' : 'Buat Event' }}
          </BrutalButton>
        </div>
      </form>
    </BrutalModal>

    <!-- Modal Setup Tim & Bagan -->
    <TeamSetupModal
      v-if="tournament.activeEvent"
      :open="showTeamSetupModal"
      :teams="tournament.teams"
      :team-count="tournament.activeEvent.team_count"
      :saving="tournament.loading"
      @close="showTeamSetupModal = false"
      @save="handleSaveTeams"
    />

    <!-- Modal Import Soal -->
    <QuestionImportModal
      v-if="tournament.activeEvent"
      :open="showImportModal"
      :team-count="tournament.activeEvent.team_count"
      :saving="tournament.loading"
      @close="showImportModal = false"
      @import="handleImportQuestions"
    />
  </div>
</template>

