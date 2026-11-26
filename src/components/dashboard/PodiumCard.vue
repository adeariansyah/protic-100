<script setup lang="ts">
import { Award, Medal, Trophy } from 'lucide-vue-next'
import type { Team } from '../../types'
import BrutalCard from '../brutal/BrutalCard.vue'
import BrutalBadge from '../brutal/BrutalBadge.vue'

defineProps<{
  podium: {
    first: Team | null
    second: Team | null
    third: Team | null
  }
}>()
</script>

<template>
  <BrutalCard bg="bg-[#FFD100]" shadow="lg" class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <BrutalBadge color="black" class="bg-black text-white">Turnamen Selesai</BrutalBadge>
        <h2 class="text-2xl font-extrabold uppercase mt-1 flex items-center gap-2">
          <Trophy class="w-6 h-6" />
          Podium Juara PROTIC 100
        </h2>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
      <!-- Juara 2 -->
      <div class="order-2 md:order-1 bg-white border-[3px] border-black rounded-md p-4 brutal-shadow text-center">
        <div class="text-xs font-extrabold uppercase text-neutral-600 inline-flex items-center gap-1">
          <Medal class="w-4 h-4" />
          Juara 2
        </div>
        <div class="text-xl font-extrabold mt-1 truncate">
          {{ podium.second?.name ?? '-' }}
        </div>
      </div>

      <!-- Juara 1 -->
      <div class="order-1 md:order-2 bg-[#00E5A0] border-[3px] border-black rounded-md p-6 brutal-shadow-lg text-center">
        <div class="text-sm font-extrabold uppercase inline-flex items-center gap-1.5">
          <Trophy class="w-5 h-5" />
          Juara 1 (Champion)
        </div>
        <div class="text-2xl font-extrabold mt-1 truncate">
          {{ podium.first?.name ?? '-' }}
        </div>
      </div>

      <!-- Juara 3 -->
      <div class="order-3 bg-[#A855F7] text-white border-[3px] border-black rounded-md p-4 brutal-shadow text-center">
        <div class="text-xs font-extrabold uppercase inline-flex items-center gap-1">
          <Award class="w-4 h-4" />
          Juara 3
        </div>
        <div class="text-xl font-extrabold mt-1 truncate">
          {{ podium.third?.name ?? '-' }}
        </div>
      </div>
    </div>
  </BrutalCard>
</template>

