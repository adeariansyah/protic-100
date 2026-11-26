<script setup lang="ts">
withDefaults(
  defineProps<{
    color?: 'yellow' | 'green' | 'red' | 'blue' | 'purple' | 'white' | 'black'
  }>(),
  {
    color: 'yellow',
  }
)

const colorMap: Record<string, string> = {
  yellow: 'bg-[#FFD100] text-black',
  green: 'bg-[#00E5A0] text-black',
  red: 'bg-[#FF5E5B] text-white',
  blue: 'bg-[#3B82F6] text-white',
  purple: 'bg-[#A855F7] text-white',
  white: 'bg-white text-black',
  black: 'bg-black text-white',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide border-2 border-black rounded-sm brutal-shadow-sm',
      colorMap[color],
    ]"
  >
    <slot />
  </span>
</template>
