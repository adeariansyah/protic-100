<script setup lang="ts">
import { ref } from 'vue'
import type { ParsedQuestionInput, TeamCount } from '../../types'
import {
  downloadTextFile,
  generateCsvTemplate,
  generateJsonTemplate,
  parseCsvQuestions,
  parseJsonQuestions,
} from '../../utils/fileParser'
import { getRequiredMainQuestionsCount } from '../../utils/bracketGenerator'
import BrutalModal from '../brutal/BrutalModal.vue'
import BrutalButton from '../brutal/BrutalButton.vue'
import BrutalBadge from '../brutal/BrutalBadge.vue'

const props = defineProps<{
  open: boolean
  teamCount: TeamCount
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  import: [questions: ParsedQuestionInput[]]
}>()

const parsedQuestions = ref<ParsedQuestionInput[]>([])
const parseErrors = ref<string[]>([])
const fileName = ref<string>('')

function handleDownloadJson() {
  const content = generateJsonTemplate(props.teamCount)
  downloadTextFile('template-protic100.json', content, 'application/json')
}

function handleDownloadCsv() {
  const content = generateCsvTemplate(props.teamCount)
  downloadTextFile('template-protic100.csv', content, 'text/csv;charset=utf-8')
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  fileName.value = file.name
  const content = await file.text()
  const lower = file.name.toLowerCase()

  const result = lower.endsWith('.csv')
    ? parseCsvQuestions(content, props.teamCount)
    : parseJsonQuestions(content, props.teamCount)

  parsedQuestions.value = result.questions
  parseErrors.value = result.errors
}

function handleConfirmImport() {
  if (parseErrors.value.length > 0 || parsedQuestions.value.length === 0) return
  emit('import', parsedQuestions.value)
}
</script>

<template>
  <BrutalModal :open="open" title="Import Bank Soal (.JSON / .CSV)" @close="emit('close')">
    <div class="space-y-4">
      <div class="p-3.5 bg-[#FFF9DB] border-2 border-black rounded-sm space-y-2">
        <p class="text-sm font-bold">
          Aturan Validasi ({{ teamCount }} Tim):
        </p>
        <ul class="text-xs font-semibold list-disc list-inside space-y-1 text-neutral-800">
          <li>
            Wajib memiliki tepat <strong>{{ getRequiredMainQuestionsCount(teamCount) }} soal utama</strong> (<code>type: main</code>) untuk semua match.
          </li>
          <li>Tambahkan soal cadangan (<code>type: backup</code>) untuk antisipasi skor seri (tie-breaker).</li>
          <li>Setiap soal wajib memiliki tepat <strong>5 jawaban</strong>, bobot kelipatan 5, dan <strong>total = 100 poin</strong>.</li>
        </ul>
      </div>

      <div class="flex flex-wrap gap-2">
        <BrutalButton variant="blue" size="sm" @click="handleDownloadJson">
          ⬇ Download Template JSON
        </BrutalButton>
        <BrutalButton variant="purple" size="sm" @click="handleDownloadCsv">
          ⬇ Download Template CSV
        </BrutalButton>
      </div>

      <div class="border-[3px] border-dashed border-black rounded-md p-5 bg-white text-center space-y-2">
        <label class="block cursor-pointer">
          <span class="inline-block px-4 py-2 bg-[#FFD100] border-2 border-black rounded-sm font-extrabold text-sm brutal-shadow-sm hover:bg-[#ffe047]">
            Pilih File .JSON atau .CSV
          </span>
          <input
            type="file"
            accept=".json,.csv"
            class="hidden"
            @change="handleFileChange"
          />
        </label>
        <p v-if="fileName" class="text-xs font-bold text-neutral-700">
          File dipilih: <span class="underline">{{ fileName }}</span>
        </p>
      </div>

      <!-- Error List -->
      <div
        v-if="parseErrors.length > 0"
        class="p-3.5 bg-[#FF5E5B] text-white border-[3px] border-black rounded-sm space-y-1.5 max-h-48 overflow-y-auto"
      >
        <div class="font-extrabold text-sm uppercase">
          Ditemukan {{ parseErrors.length }} Kesalahan Validasi:
        </div>
        <ul class="text-xs font-semibold list-disc list-inside space-y-0.5">
          <li v-for="(err, idx) in parseErrors" :key="idx">{{ err }}</li>
        </ul>
      </div>

      <!-- Success Preview -->
      <div
        v-else-if="parsedQuestions.length > 0"
        class="p-3.5 bg-[#00E5A0] border-[3px] border-black rounded-sm flex items-center justify-between flex-wrap gap-2"
      >
        <div class="text-sm font-extrabold">
          ✓ Validasi Lolos! Siap diimpor ke database D1.
        </div>
        <div class="flex gap-2">
          <BrutalBadge color="white">
            Main: {{ parsedQuestions.filter((q) => q.type === 'main').length }}
          </BrutalBadge>
          <BrutalBadge color="yellow">
            Backup: {{ parsedQuestions.filter((q) => q.type === 'backup').length }}
          </BrutalBadge>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <BrutalButton variant="white" @click="emit('close')">Tutup</BrutalButton>
        <BrutalButton
          variant="green"
          :disabled="saving || parseErrors.length > 0 || parsedQuestions.length === 0"
          @click="handleConfirmImport"
        >
          {{ saving ? 'Mengimpor...' : 'Import Soal Sekarang' }}
        </BrutalButton>
      </div>
    </div>
  </BrutalModal>
</template>

