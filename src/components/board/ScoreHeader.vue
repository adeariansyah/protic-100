<script setup lang="ts">
import { computed } from 'vue'
import { Flag, Timer } from 'lucide-vue-next'

const props = defineProps<{
  teamAName: string
  teamBName: string
  scoreA: number
  scoreB: number
  activeTurn: 'A' | 'B'
  timerRemaining: number
}>()

const formattedTimer = computed(() => {
  const mins = Math.floor(props.timerRemaining / 60)
  const secs = props.timerRemaining % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})
</script>

<template>
  <div class="grid grid-cols-12 gap-4 items-stretch">
    <!-- Tim A -->
    <div
      :class="[
        'col-span-5 border-4 border-black rounded-md p-4 brutal-shadow-lg transition-colors flex flex-col justify-between',
        activeTurn === 'A' ? 'bg-[#FFD100]' : 'bg-white',
      ]"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="text-xl md:text-3xl font-extrabold uppercase tracking-tight truncate">
          {{ teamAName }}
        </span>
        <span
          v-if="activeTurn === 'A'"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black text-[#FFD100] text-xs font-extrabold uppercase rounded-sm shrink-0"
        >
          <Flag class="w-4 h-4" />
          Giliran
        </span>
      </div>
      <div class="mt-2 bg-black text-white px-4 py-2 rounded-sm flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-neutral-400">Skor</span>
        <span class="font-mono-num text-3xl md:text-5xl font-extrabold">{{ scoreA }}</span>
      </div>
    </div>

    <!-- Countdown Timer -->
    <div
      :class="[
        'col-span-2 border-4 border-black rounded-md p-3 brutal-shadow-lg flex flex-col items-center justify-center text-center transition-colors',
        timerRemaining <= 5 && timerRemaining > 0
          ? 'bg-[#FF5E5B] text-white animate-pulse'
          : timerRemaining === 0
            ? 'bg-[#FF5E5B] text-white'
            : 'bg-white text-black',
      ]"
    >
      <div class="flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider">
        <Timer class="w-4 h-4" />
        <span>Waktu</span>
      </div>
      <div class="font-mono-num text-3xl md:text-5xl font-extrabold mt-1">
        {{ formattedTimer }}
      </div>
    </div>

    <!-- Tim B -->
    <div
      :class="[
        'col-span-5 border-4 border-black rounded-md p-4 brutal-shadow-lg transition-colors flex flex-col justify-between',
        activeTurn === 'B' ? 'bg-[#FFD100]' : 'bg-white',
      ]"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="text-xl md:text-3xl font-extrabold uppercase tracking-tight truncate">
          {{ teamBName }}
        </span>
        <span
          v-if="activeTurn === 'B'"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black text-[#FFD100] text-xs font-extrabold uppercase rounded-sm shrink-0"
        >
          <Flag class="w-4 h-4" />
          Giliran
        </span>
      </div>
      <div class="mt-2 bg-black text-white px-4 py-2 rounded-sm flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-neutral-400">Skor</span>
        <span class="font-mono-num text-3xl md:text-5xl font-extrabold">{{ scoreB }}</span>
      </div>
    </div>
  </div>
</template>

