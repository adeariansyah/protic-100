<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  HelpCircle,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Shuffle,
  Tv,
  Undo2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-vue-next'
import { useGameEngineStore } from '../stores/gameEngineStore'
import { useTournamentStore } from '../stores/tournamentStore'
import { useSoundEffects } from '../composables/useSoundEffects'
import { useOfflineQueue } from '../composables/useOfflineQueue'
import BrutalCard from '../components/brutal/BrutalCard.vue'
import BrutalButton from '../components/brutal/BrutalButton.vue'
import BrutalBadge from '../components/brutal/BrutalBadge.vue'
import ShortcutHelpModal from '../components/operator/ShortcutHelpModal.vue'

const route = useRoute()
const router = useRouter()
const engine = useGameEngineStore()
const tournament = useTournamentStore()
const sound = useSoundEffects()
const offlineQueue = useOfflineQueue()

const showShortcutModal = ref(false)
const statusMessage = ref<string | null>(null)
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

function updateOnlineStatus() {
  isOnline.value = navigator.onLine
}

function handleKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    engine.undo()
    return
  }

  if (e.key >= '1' && e.key <= '5') {
    e.preventDefault()
    engine.toggleAnswer(Number(e.key) - 1)
    return
  }

  switch (e.key.toLowerCase()) {
    case 'x':
      e.preventDefault()
      engine.addStrike()
      break
    case ' ':
      e.preventDefault()
      engine.toggleTimer()
      break
    case 'r':
      e.preventDefault()
      engine.resetTimer()
      break
    case 's':
      e.preventDefault()
      engine.switchTurn()
      break
    case '?':
      e.preventDefault()
      showShortcutModal.value = !showShortcutModal.value
      break
  }
}

onMounted(() => {
  const matchId = String(route.params.matchId)
  const ok = engine.initMatch(matchId)
  if (!ok) {
    router.replace('/dashboard')
    return
  }
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onUnmounted(() => {
  engine.cleanup()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})

function handleLoadBackup() {
  const ok = engine.loadBackupQuestion()
  if (!ok) {
    statusMessage.value = 'Pool soal cadangan (backup) sudah habis!'
  } else {
    statusMessage.value = 'Soal cadangan acak berhasil dimuat.'
  }
}

async function handleCompleteMatch() {
  const res = await engine.completeMatch()
  if (!res.ok) {
    statusMessage.value = res.error ?? 'Gagal menyelesaikan pertandingan'
    return
  }
  statusMessage.value = res.syncedNow
    ? 'Pertandingan selesai & tersinkron ke Cloudflare D1! Banner pemenang tampil 5 detik.'
    : 'Pertandingan selesai (Offline). Disimpan ke antrean sync otomatis.'
  setTimeout(() => {
    router.push('/dashboard')
  }, 1500)
}
</script>

<template>
  <div class="min-h-screen pb-20">
    <!-- Top Bar -->
    <header class="bg-[#FFD100] border-b-4 border-black px-4 md:px-6 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <BrutalButton variant="white" size="sm" @click="router.push('/dashboard')">
            <ArrowLeft class="w-4 h-4" />
            Dashboard
          </BrutalButton>
          <div v-if="engine.match">
            <div class="text-xs font-extrabold uppercase text-neutral-700">
              {{ engine.match.round_name }}
            </div>
            <div class="text-lg font-extrabold uppercase leading-tight">
              Match #{{ engine.match.match_number }}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <BrutalBadge :color="isOnline ? 'green' : 'red'">
            <Wifi v-if="isOnline" class="w-3.5 h-3.5" />
            <WifiOff v-else class="w-3.5 h-3.5" />
            {{ isOnline ? 'Online' : 'Offline Mode' }}
          </BrutalBadge>

          <BrutalBadge v-if="offlineQueue.pendingCount.value > 0" color="purple">
            Queue: {{ offlineQueue.pendingCount.value }}
          </BrutalBadge>

          <BrutalButton variant="white" size="sm" @click="sound.toggleMute()">
            <VolumeX v-if="sound.isMuted.value" class="w-4 h-4" />
            <Volume2 v-else class="w-4 h-4" />
            {{ sound.isMuted.value ? 'Muted' : 'Audio On' }}
          </BrutalButton>

          <BrutalButton variant="blue" size="sm" @click="sound.testSound()">
            Test Sound
          </BrutalButton>

          <!-- Kontrol Tayangan Proyektor -->
          <BrutalButton
            v-if="!engine.isLiveOnCurrentMatch || engine.match?.status === 'pending'"
            variant="purple"
            size="sm"
            @click="engine.startMatchLive()"
          >
            <Play class="w-4 h-4" />
            Start Pertandingan
          </BrutalButton>

          <button
            type="button"
            :class="[
              'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-extrabold border-[3px] border-black rounded-md brutal-shadow transition-all cursor-pointer select-none',
              'active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000000]',
              engine.isLiveOnCurrentMatch
                ? 'bg-black text-white hover:bg-neutral-800'
                : 'bg-white text-black hover:bg-neutral-100',
            ]"
            @click="engine.toggleGoLive()"
          >
            <Radio
              :class="[
                'w-4 h-4',
                engine.isLiveOnCurrentMatch ? 'text-[#00E5A0] animate-pulse' : 'text-neutral-500',
              ]"
            />
            <span>Go Live</span>
            <span
              :class="[
                'px-2 py-0.5 text-[11px] font-extrabold uppercase border-2 border-black rounded-sm',
                engine.isLiveOnCurrentMatch
                  ? 'bg-[#00E5A0] text-black'
                  : 'bg-neutral-200 text-neutral-700',
              ]"
            >
              {{ engine.isLiveOnCurrentMatch ? 'ON AIR' : 'STANDBY' }}
            </span>
          </button>

          <BrutalButton variant="green" size="sm" @click="handleCompleteMatch">
            <CheckCircle2 class="w-4 h-4" />
            Selesaikan Pertandingan
          </BrutalButton>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 md:px-6 pt-5 space-y-5">
      <!-- Info Status Tayangan Proyektor -->
      <div
        v-if="!engine.isLiveOnCurrentMatch"
        class="p-3 bg-white border-[3px] border-black rounded-md brutal-shadow-sm flex items-center justify-between flex-wrap gap-2"
      >
        <div class="flex items-center gap-2 text-xs sm:text-sm font-bold">
          <Tv class="w-4 h-4 shrink-0" />
          <span>
            Mode Pratinjau Operator: Perubahan di halaman ini <strong>tidak dikirim ke proyektor</strong> sampai Anda menekan <strong>Start Pertandingan</strong> atau mengaktifkan <strong>Go Live</strong>.
          </span>
        </div>
      </div>

      <div
        v-if="statusMessage"
        class="p-3 bg-[#00E5A0] border-[3px] border-black rounded-md brutal-shadow font-extrabold text-sm flex items-center justify-between"
      >
        <span>{{ statusMessage }}</span>
        <button class="font-extrabold cursor-pointer" @click="statusMessage = null">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Score & Turn Control -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
        <!-- Tim A -->
        <BrutalCard
          :bg="engine.activeTurn === 'A' ? 'bg-[#FFD100]' : 'bg-white'"
          padding="p-4"
          class="md:col-span-4 flex flex-col justify-between space-y-3 cursor-pointer"
          @click="engine.setTurn('A')"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xl font-extrabold uppercase truncate">
              {{ engine.teamA?.name ?? 'Tim A' }}
            </span>
            <BrutalBadge v-if="engine.activeTurn === 'A'" color="black">
              <Flag class="w-3.5 h-3.5" />
              Aktif
            </BrutalBadge>
          </div>
          <div class="font-mono-num text-4xl font-extrabold bg-black text-white px-4 py-2 rounded-sm text-right">
            {{ engine.scoreA }}
          </div>
        </BrutalCard>

        <!-- Center Controls: Timer, Strike, Switch -->
        <BrutalCard padding="p-4" class="md:col-span-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="font-mono-num text-3xl font-extrabold">
              0:{{ engine.timerRemaining.toString().padStart(2, '0') }}
            </div>
            <div class="flex items-center gap-1.5">
              <BrutalButton
                :variant="engine.timerRunning ? 'red' : 'green'"
                size="sm"
                @click="engine.toggleTimer()"
              >
                <Pause v-if="engine.timerRunning" class="w-4 h-4" />
                <Play v-else class="w-4 h-4" />
                {{ engine.timerRunning ? 'Pause' : 'Start' }}
              </BrutalButton>
              <BrutalButton variant="white" size="sm" @click="engine.resetTimer()">
                <RotateCcw class="w-4 h-4" />
              </BrutalButton>
            </div>
          </div>

          <div class="flex items-center justify-between gap-2 pt-1 border-t-2 border-black">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-extrabold uppercase">Strike:</span>
              <span class="font-mono-num text-lg font-extrabold text-[#FF5E5B]">
                {{ engine.strikes }}/3
              </span>
            </div>
            <div class="flex items-center gap-2">
              <BrutalButton variant="red" size="sm" @click="engine.addStrike()">
                <X class="w-4 h-4" />
                Strike (X)
              </BrutalButton>
              <BrutalButton variant="purple" size="sm" @click="engine.switchTurn()">
                <ArrowLeftRight class="w-4 h-4" />
                Pass (S)
              </BrutalButton>
            </div>
          </div>
        </BrutalCard>

        <!-- Tim B -->
        <BrutalCard
          :bg="engine.activeTurn === 'B' ? 'bg-[#FFD100]' : 'bg-white'"
          padding="p-4"
          class="md:col-span-4 flex flex-col justify-between space-y-3 cursor-pointer"
          @click="engine.setTurn('B')"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xl font-extrabold uppercase truncate">
              {{ engine.teamB?.name ?? 'Tim B' }}
            </span>
            <BrutalBadge v-if="engine.activeTurn === 'B'" color="black">
              <Flag class="w-3.5 h-3.5" />
              Aktif
            </BrutalBadge>
          </div>
          <div class="font-mono-num text-4xl font-extrabold bg-black text-white px-4 py-2 rounded-sm text-right">
            {{ engine.scoreB }}
          </div>
        </BrutalCard>
      </div>

      <!-- Question Navigation & Tie-Breaker -->
      <BrutalCard padding="p-4" class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-2 flex-wrap">
          <BrutalButton
            v-for="(q, idx) in engine.loadedQuestions"
            :key="q.id"
            :variant="engine.currentQuestionIndex === idx ? 'black' : 'white'"
            size="sm"
            @click="engine.goToQuestion(idx)"
          >
            {{ q.label }}
          </BrutalButton>

          <BrutalButton
            v-if="engine.isTiedAfterMain"
            variant="purple"
            size="sm"
            :disabled="tournament.unusedBackupCount === 0"
            @click="handleLoadBackup"
          >
            <Shuffle class="w-4 h-4" />
            Load Soal Cadangan (Tie-Breaker • {{ tournament.unusedBackupCount }} sisa)
          </BrutalButton>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <BrutalButton
            :variant="engine.revealZeroPointsMode ? 'yellow' : 'white'"
            size="sm"
            @click="engine.revealZeroPointsMode = !engine.revealZeroPointsMode"
          >
            <Eye class="w-4 h-4" />
            Mode Buka Sisa (0 Poin): {{ engine.revealZeroPointsMode ? 'ON' : 'OFF' }}
          </BrutalButton>

          <BrutalButton
            variant="white"
            size="sm"
            :disabled="!engine.canUndo"
            @click="engine.undo()"
          >
            <Undo2 class="w-4 h-4" />
            Undo (Ctrl+Z)
          </BrutalButton>
        </div>
      </BrutalCard>

      <!-- Active Question & 5 Answer Cards -->
      <BrutalCard v-if="engine.currentQuestion" shadow="lg" class="space-y-4">
        <div class="p-4 bg-[#FFF9DB] border-[3px] border-black rounded-md">
          <div class="text-xs font-extrabold uppercase text-neutral-600 mb-1">
            {{ engine.currentQuestion.label }}
          </div>
          <h2 class="text-xl md:text-2xl font-extrabold">
            {{ engine.currentQuestion.questionText }}
          </h2>
        </div>

        <div class="space-y-2.5">
          <div
            v-for="(ans, idx) in engine.currentQuestion.answers"
            :key="idx"
            class="flex items-stretch gap-2.5"
          >
            <button
              type="button"
              :class="[
                'flex-1 flex items-center justify-between px-4 py-3 border-[3px] border-black rounded-md brutal-shadow-sm text-left transition-all cursor-pointer',
                engine.currentQuestion.revealed[idx]
                  ? 'bg-[#00E5A0] text-black'
                  : 'bg-white hover:bg-[#FFF9DB]',
              ]"
              @click="engine.revealAnswer(idx)"
            >
              <div class="flex items-center gap-3">
                <span
                  class="font-mono-num w-8 h-8 flex items-center justify-center bg-black text-white font-extrabold rounded-sm"
                >
                  {{ idx + 1 }}
                </span>
                <span class="text-base md:text-lg font-extrabold uppercase">
                  {{ ans.text }}
                </span>
              </div>
              <span class="font-mono-num text-xl font-extrabold px-3 py-1 bg-[#FFD100] border-2 border-black rounded-sm">
                {{ ans.points }}
              </span>
            </button>

            <BrutalButton
              v-if="engine.currentQuestion.revealed[idx]"
              variant="red"
              size="sm"
              title="Tutup Kembali (Hide Card)"
              @click="engine.hideAnswer(idx)"
            >
              <EyeOff class="w-4 h-4" />
              Tutup
            </BrutalButton>
          </div>
        </div>
      </BrutalCard>
    </main>

    <!-- Floating ? Shortcut Help Button -->
    <button
      type="button"
      class="fixed bottom-5 right-5 z-40 w-12 h-12 bg-[#FFD100] border-[3px] border-black rounded-md brutal-shadow flex items-center justify-center hover:bg-[#ffe047] transition-transform active:translate-x-[2px] active:translate-y-[2px] cursor-pointer"
      title="Keyboard Shortcuts (?)"
      @click="showShortcutModal = true"
    >
      <HelpCircle class="w-6 h-6" />
    </button>

    <ShortcutHelpModal :open="showShortcutModal" @close="showShortcutModal = false" />
  </div>
</template>
