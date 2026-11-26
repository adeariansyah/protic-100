<script setup lang="ts">
import BrutalModal from '../brutal/BrutalModal.vue'
import BrutalButton from '../brutal/BrutalButton.vue'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const shortcuts = [
  { keys: '1 – 5', desc: 'Reveal / Tutup kembali kartu jawaban nomor 1 sampai 5' },
  { keys: 'X', desc: 'Tambah +1 Strike pada tim aktif' },
  { keys: 'Space', desc: 'Start / Pause countdown timer (20 detik)' },
  { keys: 'R', desc: 'Reset timer kembali ke durasi awal' },
  { keys: 'S', desc: 'Switch Team / Lempar Giliran (reset strike ke 0/3 & timer)' },
  { keys: 'Ctrl + Z', desc: 'Undo aksi terakhir (rollback skor, kartu, strike, atau giliran)' },
]
</script>

<template>
  <BrutalModal :open="open" title="Keyboard Shortcuts Operator" max-width="max-w-lg" @close="emit('close')">
    <div class="space-y-3">
      <div
        v-for="item in shortcuts"
        :key="item.keys"
        class="flex items-center justify-between gap-4 p-3 bg-white border-2 border-black rounded-sm"
      >
        <span class="text-sm font-semibold text-neutral-800">{{ item.desc }}</span>
        <kbd
          class="font-mono-num px-2.5 py-1 bg-[#FFD100] border-2 border-black rounded-sm text-xs font-extrabold shrink-0"
        >
          {{ item.keys }}
        </kbd>
      </div>

      <div class="flex justify-end pt-2">
        <BrutalButton variant="black" size="sm" @click="emit('close')">
          Mengerti
        </BrutalButton>
      </div>
    </div>
  </BrutalModal>
</template>

