import { reactive, computed } from 'vue'
import api from './api'

// Initialize state from storage
const storedUser = localStorage.getItem('fringe_user')
const initialUser = storedUser ? JSON.parse(storedUser) : null
const initialUnit = localStorage.getItem('fringe_active_unit') || (initialUser?.business_unit || 'bar')

export const store = reactive({
  user: initialUser,
  token: localStorage.getItem('fringe_token') || null,
  activeUnit: initialUnit,
  activeShift: null,
  cart: [],
  selectedTab: null,
  isAgeVerified: false,
  activeModal: null, // 'login', 'age_check', 'manager_pin', 'payment', 'tabs', 'shift', 'reports', 'audit'
  pinModalConfig: {
    action: 'GENERIC_OVERRIDE',
    title: 'Manager Authorization Required',
    subtitle: 'Enter a valid Manager or Owner PIN to proceed.',
    context: {},
    onSuccess: null,
  },
  toast: {
    show: false,
    message: '',
    type: 'info', // 'success', 'error', 'warning', 'info'
  },

  // Computed Properties
  isAuthenticated: computed(() => Boolean(store.token && store.user)),
  isOwner: computed(() => store.user?.role === 'owner'),
  isBarManager: computed(() => ['owner', 'bar_manager'].includes(store.user?.role)),
  isStationeryManager: computed(() => ['owner', 'stationery_manager'].includes(store.user?.role)),
  
  cartItemCount: computed(() => {
    return store.cart.reduce((sum, item) => sum + item.quantity, 0)
  }),

  cartSubtotal: computed(() => {
    return store.cart.reduce((sum, item) => sum + (parseFloat(item.product.selling_price) * item.quantity), 0)
  }),

  cartHasAlcohol: computed(() => {
    return store.cart.some(item => item.product.is_alcoholic)
  }),

  // Actions
  showToast(message, type = 'info') {
    store.toast.message = message
    store.toast.type = type
    store.toast.show = true
    setTimeout(() => {
      store.toast.show = false
    }, 4000)
  },

  async login(username, password) {
    try {
      const response = await api.post('/auth/login/', { username, password })
      const { token, user, active_unit } = response.data

      store.token = token
      store.user = user
      store.activeUnit = user.role === 'owner' ? (localStorage.getItem('fringe_active_unit') || 'bar') : user.business_unit

      localStorage.setItem('fringe_token', token)
      localStorage.setItem('fringe_user', JSON.stringify(user))
      localStorage.setItem('fringe_active_unit', store.activeUnit)

      store.activeModal = null
      store.showToast(`Welcome back, ${user.first_name || user.username}!`, 'success')
      await store.fetchActiveShift()
      return true
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please check credentials.'
      store.showToast(msg, 'error')
      throw err
    }
  },

  async logout() {
    try {
      if (store.token) {
        await api.post('/auth/logout/')
      }
    } catch (e) {
      // Continue cleanup on error
    } finally {
      store.token = null
      store.user = null
      store.activeShift = null
      store.cart = []
      store.isAgeVerified = false
      localStorage.removeItem('fringe_token')
      localStorage.removeItem('fringe_user')
      store.activeModal = 'login'
      store.showToast('Logged out successfully.', 'info')
    }
  },

  switchBusinessUnit(unitId) {
    if (!store.isOwner) return
    store.activeUnit = unitId
    localStorage.setItem('fringe_active_unit', unitId)
    store.clearCart()
    store.fetchActiveShift()
    store.showToast(`Switched view to ${unitId.toUpperCase()}`, 'info')
  },

  async fetchActiveShift() {
    if (!store.isAuthenticated) return
    try {
      const response = await api.get('/pos/shifts/current/')
      store.activeShift = response.data.active_shift
    } catch (e) {
      store.activeShift = null
    }
  },

  addToCart(product, quantity = 1) {
    const existing = store.cart.find(item => item.product.id === product.id)
    if (existing) {
      existing.quantity += quantity
      existing.subtotal = parseFloat(existing.product.selling_price) * existing.quantity
    } else {
      store.cart.push({
        product,
        quantity,
        subtotal: parseFloat(product.selling_price) * quantity,
        is_alcoholic: Boolean(product.is_alcoholic),
      })
    }

    // If an alcoholic drink is added, require fresh verification on checkout
    if (product.is_alcoholic) {
      store.isAgeVerified = false
    }
  },

  updateCartQuantity(productId, delta) {
    const item = store.cart.find(i => i.product.id === productId)
    if (!item) return
    const newQty = item.quantity + delta
    if (newQty <= 0) {
      store.removeFromCart(productId)
    } else {
      item.quantity = newQty
      item.subtotal = parseFloat(item.product.selling_price) * newQty
    }
  },

  removeFromCart(productId) {
    store.cart = store.cart.filter(item => item.product.id !== productId)
    if (!store.cartHasAlcohol) {
      store.isAgeVerified = false
    }
  },

  clearCart() {
    store.cart = []
    store.selectedTab = null
    store.isAgeVerified = false
  },

  openPinModal({ action, title, subtitle, context, onSuccess }) {
    store.pinModalConfig = {
      action,
      title: title || 'Manager Approval Required',
      subtitle: subtitle || 'Enter a valid Manager or Owner PIN to authorize.',
      context: context || {},
      onSuccess,
    }
    store.activeModal = 'manager_pin'
  },

  closeModal() {
    store.activeModal = null
  }
})

// Listen to custom logout event
window.addEventListener('fringe-logout', () => {
  store.logout()
})

export default store
