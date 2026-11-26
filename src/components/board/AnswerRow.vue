<script setup lang="ts">
defineProps<{
  rank: number
  text: string
  points: number
  revealed: boolean
}>()
</script>

<template>
  <div class="grid grid-cols-12 gap-3 items-stretch">
    <!-- Kotak Panjang Kiri -->
    <div
      :class="[
        'col-span-10 border-4 border-black rounded-md px-5 py-3.5 brutal-shadow flex items-center transition-all duration-300',
        revealed
          ? 'bg-[#00E5A0] text-black scale-[1.01]'
          : 'bg-[#3B82F6] text-white',
      ]"
    >
      <div v-if="!revealed" class="w-full flex items-center justify-center">
        <span
          class="font-mono-num w-11 h-11 flex items-center justify-center bg-black text-[#FFD100] text-2xl font-extrabold rounded-sm border-2 border-white"
        >
          {{ rank }}
        </span>
      </div>
      <div v-else class="w-full flex items-center gap-4">
        <span
          class="font-mono-num w-9 h-9 flex items-center justify-center bg-black text-[#00E5A0] text-lg font-extrabold rounded-sm shrink-0"
        >
          {{ rank }}
        </span>
        <span class="text-xl md:text-2xl font-extrabold uppercase tracking-tight truncate">
          {{ text }}
        </span>
      </div>
    </div>

    <!-- Kotak Poin Kanan -->
    <div
      :class="[
        'col-span-2 border-4 border-black rounded-md brutal-shadow flex items-center justify-center transition-all duration-300',
        revealed ? 'bg-[#FFD100] text-black' : 'bg-neutral-900 text-neutral-700',
      ]"
    >
      <span class="font-mono-num text-2xl md:text-3xl font-extrabold">
        {{ revealed ? points : '' }}
      </span>
    </div>
  </div>
</template>

