import axios from 'axios'
import { toastEvents } from './toast-events'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401 + global error toast
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const { data } = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
        localStorage.setItem('access_token', data.access_token)
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`
        return api(originalRequest)
      } catch {
        localStorage.removeItem('access_token')
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    // Global error toast for non-401 errors
    if (error.response?.status !== 401) {
      const message = error.response?.data?.error || error.message || 'Đã xảy ra lỗi'
      const status = error.response?.status

      if (status === 429) {
        toastEvents.emit({ title: 'Quá nhiều yêu cầu', description: 'Vui lòng thử lại sau.', variant: 'warning' })
      } else if (status && status >= 500) {
        toastEvents.emit({ title: 'Lỗi hệ thống', description: 'Vui lòng thử lại sau.', variant: 'error' })
      } else if (status && status >= 400 && status !== 404) {
        toastEvents.emit({ title: 'Lỗi', description: message, variant: 'error' })
      }
    }

    return Promise.reject(error)
  }
)

export default api
