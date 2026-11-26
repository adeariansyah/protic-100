<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import BrutalCard from '../components/brutal/BrutalCard.vue'
import BrutalButton from '../components/brutal/BrutalButton.vue'
import BrutalBadge from '../components/brutal/BrutalBadge.vue'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')

async function handleSubmit() {
  const ok = await auth.login(username.value, password.value)
  if (ok) {
    await router.push('/dashboard')
  }
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md space-y-6">
      <div class="text-center space-y-2">
        <BrutalBadge color="yellow">UKM PROTIC • PNC 2026</BrutalBadge>
        <h1 class="text-5xl font-extrabold tracking-tight uppercase">
          PROTIC <span class="bg-[#00E5A0] px-2 border-[3px] border-black brutal-shadow-sm">100</span>
        </h1>
        <p class="text-sm font-semibold text-neutral-700">
          Operator Gate — Masuk untuk mengelola turnamen & papan kuis
        </p>
      </div>

      <BrutalCard shadow="lg" padding="p-6">
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div
            v-if="auth.error"
            class="p-3 bg-[#FF5E5B] text-white font-bold text-sm border-[3px] border-black rounded-sm brutal-shadow-sm"
          >
            {{ auth.error }}
          </div>

          <div class="space-y-1.5">
            <label for="username" class="block text-sm font-extrabold uppercase">
              Username Operator
            </label>
            <input
              id="username"
              v-model="username"
              type="text"
              required
              autocomplete="username"
              placeholder="admin"
              class="w-full px-3.5 py-2.5 bg-white border-[3px] border-black rounded-md font-semibold focus:outline-none focus:bg-[#FFF9DB]"
            />
          </div>

          <div class="space-y-1.5">
            <label for="password" class="block text-sm font-extrabold uppercase">
              Password
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full px-3.5 py-2.5 bg-white border-[3px] border-black rounded-md font-semibold focus:outline-none focus:bg-[#FFF9DB]"
            />
          </div>

          <BrutalButton
            type="submit"
            variant="yellow"
            size="lg"
            class="w-full"
            :disabled="auth.loading"
          >
            {{ auth.loading ? 'Memverifikasi...' : 'Masuk ke Dashboard →' }}
          </BrutalButton>
        </form>
      </BrutalCard>
    </div>
  </main>
</template>

