<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Monitor, Trophy, X } from 'lucide-vue-next'
import {
  useBroadcastSync,
  type LiveBroadcastPayload,
} from '../composables/useBroadcastSync'
import ScoreHeader from '../components/board/ScoreHeader.vue'
import AnswerRow from '../components/board/AnswerRow.vue'
import StrikeBar from '../components/board/StrikeBar.vue'

const broadcast = useBroadcastSync()
const state = ref<LiveBroadcastPayload>(broadcast.loadStoredState())
const showStrikeOverlay = ref(false)
let overlayTimer: number | null = null
let unsubscribe: (() => void) | null = null

const quiz = computed(() => state.value.quizState)

watch(
  () => state.value.quizState?.strikeOverlayTick,
  (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      showStrikeOverlay.value = true
      if (overlayTimer !== null) clearTimeout(overlayTimer)
      overlayTimer = window.setTimeout(() => {
        showStrikeOverlay.value = false
      }, 950)
    }
  }
)

onMounted(() => {
  unsubscribe = broadcast.subscribe((payload) => {
    state.value = payload
  })
})

onUnmounted(() => {
  unsubscribe?.()
  if (overlayTimer !== null) clearTimeout(overlayTimer)
})
</script>

<template>
  <div class="min-h-screen flex flex-col justify-between p-4 md:p-8 relative overflow-hidden">
    <!-- Strike Big X Overlay (hanya saat mode quiz) -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-50"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-75"
    >
      <div
        v-if="showStrikeOverlay && state.presenterMode === 'quiz'"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 pointer-events-none"
      >
        <div
          class="w-56 h-56 md:w-72 md:h-72 bg-[#FF5E5B] text-white border-[6px] border-black rounded-lg brutal-shadow-lg flex items-center justify-center"
        >
          <X class="w-40 h-40 md:w-52 md:h-52 stroke-[4]" />
        </div>
      </div>
    </Transition>

    <!-- Mode 1: STANDBY -->
    <div
      v-if="state.presenterMode === 'standby' || (state.presenterMode === 'quiz' && !quiz)"
      class="flex-1 flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-2xl bg-white border-4 border-black rounded-md p-10 md:p-14 brutal-shadow-lg text-center space-y-6"
      >
        <div
          class="inline-flex items-center justify-center w-20 h-20 bg-[#FFD100] border-4 border-black rounded-md brutal-shadow"
        >
          <Monitor class="w-11 h-11" />
        </div>
        <div class="space-y-3">
          <h1 class="text-5xl md:text-6xl font-extrabold uppercase tracking-tight">
            PROTIC
            <span class="bg-[#00E5A0] px-3 py-0.5 border-4 border-black brutal-shadow-sm">
              100
            </span>
          </h1>
          <p class="text-xl md:text-2xl font-extrabold text-neutral-800 italic pt-2">
            Menunggu Pertandingan Dimulai...
          </p>
        </div>
      </div>
    </div>

    <!-- Mode 3: WINNER -->
    <div
      v-else-if="state.presenterMode === 'winner' && state.winnerBannerData"
      class="flex-1 flex items-center justify-center p-4"
    >
      <div
        class="max-w-3xl w-full bg-[#FFD100] border-4 border-black rounded-md p-8 md:p-12 brutal-shadow-lg text-center space-y-6"
      >
        <div
          class="inline-flex items-center justify-center w-24 h-24 bg-[#00E5A0] border-4 border-black rounded-md brutal-shadow"
        >
          <Trophy class="w-14 h-14" />
        </div>

        <div class="space-y-2">
          <div
            class="inline-block px-4 py-1 bg-black text-[#FFD100] text-sm md:text-base font-extrabold uppercase tracking-widest rounded-sm"
          >
            {{ state.winnerBannerData.matchName }}
          </div>
          <div class="text-sm font-extrabold uppercase tracking-wider text-neutral-800 pt-1">
            Pemenang Pertandingan
          </div>
          <h2 class="text-4xl md:text-6xl font-extrabold uppercase tracking-tight">
            {{ state.winnerBannerData.winnerName }}
          </h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div class="bg-white border-[3px] border-black rounded-md p-4 brutal-shadow flex items-center justify-between gap-3">
            <span class="font-extrabold uppercase truncate text-lg">
              {{ state.winnerBannerData.teamAName }}
            </span>
            <span class="font-mono-num text-3xl font-extrabold bg-black text-white px-3 py-1 rounded-sm">
              {{ state.winnerBannerData.scoreA }}
            </span>
          </div>
          <div class="bg-white border-[3px] border-black rounded-md p-4 brutal-shadow flex items-center justify-between gap-3">
            <span class="font-extrabold uppercase truncate text-lg">
              {{ state.winnerBannerData.teamBName }}
            </span>
            <span class="font-mono-num text-3xl font-extrabold bg-black text-white px-3 py-1 rounded-sm">
              {{ state.winnerBannerData.scoreB }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Mode 2: QUIZ -->
    <template v-else-if="quiz">
      <div class="max-w-6xl w-full mx-auto space-y-5 flex-1 flex flex-col justify-between">
        <!-- Baris Atas: Header Skor & Timer -->
        <ScoreHeader
          :team-a-name="quiz.teamAName"
          :team-b-name="quiz.teamBName"
          :score-a="quiz.scoreA"
          :score-b="quiz.scoreB"
          :active-turn="quiz.activeTurn"
          :timer-remaining="quiz.timerRemaining"
        />

        <!-- Area Pertanyaan -->
        <div class="bg-white border-4 border-black rounded-md p-5 md:p-6 brutal-shadow-lg text-center space-y-2">
          <div class="flex items-center justify-center gap-2">
            <span class="px-2.5 py-0.5 bg-black text-[#FFD100] text-xs font-extrabold uppercase rounded-sm">
              {{ quiz.roundName }} • Match #{{ quiz.matchNumber }}
            </span>
            <span class="px-2.5 py-0.5 bg-[#A855F7] text-white text-xs font-extrabold uppercase rounded-sm border-2 border-black">
              {{ quiz.questionLabel }}
            </span>
          </div>
          <h2 class="text-2xl md:text-4xl font-extrabold leading-tight">
            {{ quiz.questionText }}
          </h2>
        </div>

        <!-- Area Papan Jawaban (5 Baris Horizontal) -->
        <div class="space-y-3">
          <AnswerRow
            v-for="ans in quiz.answers"
            :key="ans.rank"
            :rank="ans.rank"
            :text="ans.text"
            :points="ans.points"
            :revealed="ans.revealed"
          />
        </div>

        <!-- Indikator Strike (Bawah Tengah) -->
        <div class="pt-2">
          <StrikeBar :strikes="quiz.strikes" />
        </div>
      </div>
    </template>
  </div>
</template>
