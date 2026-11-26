import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import OperatorView from '../views/OperatorView.vue'
import PresenterView from '../views/PresenterView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/operator/:matchId',
      name: 'operator',
      component: OperatorView,
    },
    {
      path: '/presenter',
      name: 'presenter',
      component: PresenterView,
    },
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const isAuthed = await auth.checkSession()

  if (!to.meta.public && !isAuthed) {
    return { name: 'login' }
  }
  if (to.name === 'login' && isAuthed) {
    return { name: 'dashboard' }
  }
  return true
})

export default router

