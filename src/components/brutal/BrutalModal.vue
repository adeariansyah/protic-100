<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  maxWidth?: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="emit('close')"
    >
      <div
        :class="[
          'w-full bg-[#FFFDF7] border-4 border-black rounded-md brutal-shadow-lg max-h-[90vh] flex flex-col overflow-hidden',
          maxWidth ?? 'max-w-2xl',
        ]"
      >
        <div
          class="flex items-center justify-between px-5 py-3.5 bg-[#FFD100] border-b-[3px] border-black"
        >
          <h3 class="text-lg font-extrabold tracking-tight uppercase">
            {{ title }}
          </h3>
          <button
            type="button"
            class="w-8 h-8 flex items-center justify-center bg-white border-2 border-black rounded-sm font-extrabold hover:bg-[#FF5E5B] hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup modal"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>
        <div class="p-5 overflow-y-auto">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

