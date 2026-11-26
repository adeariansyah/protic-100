<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  strikes: number
}>()
</script>

<template>
  <div class="flex items-center justify-center gap-4">
    <div
      v-for="idx in 3"
      :key="idx"
      :class="[
        'w-16 h-16 md:w-20 md:h-20 border-4 border-black rounded-md brutal-shadow flex items-center justify-center transition-all duration-200',
        idx <= strikes
          ? 'bg-[#FF5E5B] text-white scale-105'
          : 'bg-white text-neutral-300',
      ]"
    >
      <X class="w-10 h-10 md:w-12 md:h-12 stroke-[3.5]" />
    </div>
  </div>
</template>

