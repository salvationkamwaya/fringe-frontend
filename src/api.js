import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Request Interceptor: Attach Token & Active Unit context
api.interceptors.request.use((config) => {
  // Do not attach Authorization header when performing a login attempt
  if (!config.url || !config.url.includes('/auth/login/')) {
    const token = localStorage.getItem('fringe_token')
    if (token) {
      config.headers.Authorization = `Token ${token}`
    }
  }

  const storedUser = localStorage.getItem('fringe_user')
  let activeUnit = localStorage.getItem('fringe_active_unit')
  let activeBranch = localStorage.getItem('fringe_active_branch')
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser)
      if (u.role !== 'owner' && u.business_unit) {
        activeUnit = u.business_unit
      }
      if (u.role !== 'owner') {
        activeBranch = u.branch || null
      }
    } catch (e) {
      // parse fallback
    }
  }
  if (activeUnit) {
    config.headers['X-Business-Unit'] = activeUnit
  }
  if (activeBranch) {
    config.headers['X-Branch-Id'] = activeBranch
  }

  return config
}, (error) => {
  return Promise.reject(error)
})

// Response Interceptor: Handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Do not trigger global logout on login or password reset endpoints
    const isPublicAuth = error.config?.url?.includes('/auth/login/') ||
                         error.config?.url?.includes('/auth/forgot-password/') ||
                         error.config?.url?.includes('/auth/reset-password-with-token/')

    if (error.response && error.response.status === 401 && !isPublicAuth) {
      localStorage.removeItem('fringe_token')
      localStorage.removeItem('fringe_user')
      // Dispatch custom event for app reactivity
      window.dispatchEvent(new CustomEvent('fringe-logout'))
    }
    return Promise.reject(error)
  }
)

export default api
