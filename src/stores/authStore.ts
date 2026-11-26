import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const authenticated = ref(false)
  const username = ref<string | null>(null)
  const checked = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function checkSession(): Promise<boolean> {
    if (checked.value && authenticated.value) return true
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const data = (await res.json()) as { authenticated: boolean; username?: string }
        authenticated.value = data.authenticated
        username.value = data.username ?? null
      } else {
        authenticated.value = false
        username.value = null
      }
    } catch {
      // Offline fallback: jika pernah login sebelumnya di localStorage
      const cached = localStorage.getItem('protic100_auth_user')
      if (cached) {
        authenticated.value = true
        username.value = cached
      } else {
        authenticated.value = false
        username.value = null
      }
    } finally {
      checked.value = true
    }
    return authenticated.value
  }

  async function login(user: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: user, password }),
      })
      const data = (await res.json()) as {
        authenticated?: boolean
        username?: string
        error?: string
      }
      if (!res.ok) {
        error.value = data.error ?? 'Login gagal'
        return false
      }
      authenticated.value = true
      username.value = data.username ?? user
      checked.value = true
      localStorage.setItem('protic100_auth_user', username.value)
      return true
    } catch {
      error.value = 'Tidak dapat terhubung ke server'
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } finally {
      authenticated.value = false
      username.value = null
      checked.value = true
      localStorage.removeItem('protic100_auth_user')
    }
  }

  return {
    authenticated,
    username,
    checked,
    loading,
    error,
    checkSession,
    login,
    logout,
  }
})

