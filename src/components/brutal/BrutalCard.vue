<script setup lang="ts">
withDefaults(
  defineProps<{
    bg?: string
    padding?: string
    shadow?: 'sm' | 'md' | 'lg'
  }>(),
  {
    bg: 'bg-white',
    padding: 'p-5',
    shadow: 'md',
  }
)
</script>

<template>
  <div
    :class="[
      bg,
      padding,
      'border-[3px] border-black rounded-md',
      shadow === 'sm'
        ? 'brutal-shadow-sm'
        : shadow === 'lg'
          ? 'brutal-shadow-lg'
          : 'brutal-shadow',
    ]"
  >
    <slot />
  </div>
</template>

