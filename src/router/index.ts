import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'Login', component: () => import('@/views/AuthView.vue'), props: { initialMode: 'login' }, meta: { hideHeader: true } },
    { path: '/signup', name: 'Signup', component: () => import('@/views/AuthView.vue'), props: { initialMode: 'signup' }, meta: { hideHeader: true } },
    { path: '/onboarding', name: 'Onboarding', component: () => import('@/views/OnboardingView.vue'), meta: { requiresAuth: true } },
    { path: '/dashboard', name: 'Dashboard', component: () => import('@/views/HomeView.vue'), meta: { requiresAuth: true } },
    { path: '/assessment', name: 'Assessment', component: () => import('@/views/AssessmentView.vue'), meta: { requiresAuth: true } },
    { path: '/results/:id', name: 'Results', component: () => import('@/views/ResultsView.vue'), meta: { requiresAuth: true } },
    { path: '/recommendations/:id?', name: 'Recommendations', component: () => import('@/views/RecommendationsView.vue'), meta: { requiresAuth: true } },
    { path: '/exercises', name: 'Exercises', component: () => import('@/views/ExercisesView.vue'), meta: { requiresAuth: true } },
    { path: '/exercise/:id/session', name: 'ExerciseSession', component: () => import('@/views/ExerciseSessionView.vue'), meta: { requiresAuth: true } },
    { path: '/exercise/:id', name: 'ExerciseDetail', component: () => import('@/views/ExerciseSessionView.vue'), meta: { requiresAuth: true } },
    { path: '/history', name: 'History', component: () => import('@/views/HistoryView.vue'), meta: { requiresAuth: true } },
    { path: '/profile', name: 'PatientInformation', component: () => import('@/views/ProfileView.vue'), meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/login' }
  ]
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if ((to.path === '/login' || to.path === '/signup') && auth.isAuthenticated) {
    return { path: auth.profile?.onboardingComplete ? '/dashboard' : '/onboarding' }
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login' }
  }
  if (to.meta.requiresAuth && auth.profile && !auth.profile.onboardingComplete && to.path !== '/onboarding') return { path: '/onboarding' }
  if (to.path === '/onboarding' && auth.profile?.onboardingComplete) return { path: '/dashboard' }
})

export default router
