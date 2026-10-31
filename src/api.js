import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Request Interceptor: Attach Token & Active Unit context
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fringe_token')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }

  const activeUnit = localStorage.getItem('fringe_active_unit')
  if (activeUnit) {
    config.headers['X-Business-Unit'] = activeUnit
  }

  return config
}, (error) => {
  return Promise.reject(error)
})

// Response Interceptor: Handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('fringe_token')
      localStorage.removeItem('fringe_user')
      // Dispatch custom event for app reactivity
      window.dispatchEvent(new CustomEvent('fringe-logout'))
    }
    return Promise.reject(error)
  }
)

export default api
