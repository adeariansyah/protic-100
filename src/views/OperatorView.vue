<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import BrutalCard from '../components/brutal/BrutalCard.vue'
import BrutalButton from '../components/brutal/BrutalButton.vue'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-6">
    <BrutalCard shadow="lg" class="max-w-lg text-center space-y-4">
      <h1 class="text-2xl font-extrabold uppercase">Operator Console (Hari 2)</h1>
      <p class="text-sm font-semibold text-neutral-700">
        Match ID: <code class="font-mono-num bg-neutral-200 px-2 py-0.5">{{ route.params.matchId }}</code>
      </p>
      <p class="text-sm">
        Halaman Operator Console & Live Game Engine akan diimplementasikan pada tahap Hari 2.
      </p>
      <BrutalButton variant="yellow" @click="router.push('/dashboard')">
        ← Kembali ke Dashboard
      </BrutalButton>
    </BrutalCard>
  </main>
</template>

