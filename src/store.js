import { reactive, computed } from 'vue'
import api from './api'

// Initialize state from storage
const storedUser = localStorage.getItem('fringe_user')
const initialUser = storedUser ? JSON.parse(storedUser) : null
const initialUnit = (initialUser && initialUser.role !== 'owner' && initialUser.business_unit)
  ? initialUser.business_unit
  : (localStorage.getItem('fringe_active_unit') || 'bar')
const initialBranch = (initialUser && initialUser.role !== 'owner' && initialUser.branch)
  ? initialUser.branch
  : (localStorage.getItem('fringe_active_branch') || 'all')

export const store = reactive({
  user: initialUser,
  token: localStorage.getItem('fringe_token') || null,
  activeUnit: initialUnit,
  activeBranchId: initialBranch,
  businessUnits: [],
  requiresBusinessSetup: false,
  requiresBranchSetup: false,
  branches: [],
  activeShift: null,
  cart: [],
  selectedTab: null,
  selectedCustomer: null,
  isAgeVerified: false,
  activeModal: null, // 'login', 'age_check', 'manager_pin', 'payment', 'tabs', 'shift', 'reports', 'audit', 'customers', 'suppliers', 'stationery_reports'
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
    title: '',
    type: 'info', // 'success', 'error', 'warning', 'info'
    timeoutId: null,
  },
  soundEnabled: localStorage.getItem('fringe_sound') !== 'false',
  orderNotes: '',
  theme: localStorage.getItem('fringe_theme') || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'), // 'dark' | 'light'
  locale: localStorage.getItem('fringe_locale') || 'en', // 'en' | 'sw'
  stationeryMode: 'RETAIL', // 'RETAIL' | 'WHOLESALE'
  heldSales: JSON.parse(localStorage.getItem('fringe_held_sales') || '[]'),
  idleTimeoutMinutes: parseInt(localStorage.getItem('fringe_idle_timeout') ?? '10', 10), // default 10 minutes
  isIdleWarningActive: false,
  idleCountdownSeconds: 30,

  // Computed Properties
  isAuthenticated: computed(() => Boolean(store.token && store.user)),
  isOwner: computed(() => store.user?.role === 'owner'),
  isStockClerk: computed(() => store.user?.role === 'stock_clerk'),
  isBarManager: computed(() => ['owner', 'bar_manager'].includes(store.user?.role)),
  isStationeryManager: computed(() => ['owner', 'stationery_manager'].includes(store.user?.role)),
  hasInventoryAccess: computed(() => {
    return ['owner', 'bar_manager', 'stationery_manager', 'stock_clerk'].includes(store.user?.role)
  }),
  isStationery: computed(() => store.activeUnit === 'stationery'),
  isBar: computed(() => store.activeUnit === 'bar'),
  currentBranch: computed(() => {
    return store.branches.find(b => String(b.id) === String(store.activeBranchId)) || null
  }),
  activeBranchName: computed(() => {
    if (store.currentBranch) return store.currentBranch.name
    if (store.activeBranchId === 'all') return 'All Branches'
    return store.user?.branch_name || 'Select Branch'
  }),
  activeBranchCode: computed(() => {
    return store.currentBranch?.code || store.user?.branch_code || ''
  }),
  isBranchLocked: computed(() => {
    return store.user?.role !== 'owner' && Boolean(store.user?.branch)
  }),
  canRecordSales: computed(() => {
    if (!store.user) return false
    if (store.activeUnit === 'bar') {
      return store.user.role === 'bartender'
    }
    if (store.activeUnit === 'stationery') {
      return store.user.role === 'stationery_cashier'
    }
    return false
  }),
  isFrontlineStaff: computed(() => {
    return ['bartender', 'stationery_cashier'].includes(store.user?.role)
  }),
  isManagement: computed(() => {
    return ['owner', 'bar_manager', 'stationery_manager'].includes(store.user?.role)
  }),
  
  cartItemCount: computed(() => {
    return store.cart.reduce((sum, item) => sum + item.quantity, 0)
  }),

  currentUnitHeldSales: computed(() => {
    return store.heldSales.filter(s => !s.business_unit || s.business_unit === store.activeUnit)
  }),

  cartSubtotal: computed(() => {
    return store.cart.reduce((sum, item) => sum + (parseFloat(item.unit_price) * item.quantity), 0)
  }),

  cartHasAlcohol: computed(() => {
    return store.cart.some(item => item.product.is_alcoholic)
  }),

  // Actions
  toggleTheme() {
    store.theme = store.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('fringe_theme', store.theme)
    document.documentElement.setAttribute('data-theme', store.theme)
    store.showToast(`Switched to ${store.theme === 'light' ? 'Light' : 'Dark'} appearance mode.`, 'info')
  },

  initTheme() {
    const saved = localStorage.getItem('fringe_theme')
    const systemPrefersLight = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches
    const resolved = saved || (systemPrefersLight ? 'light' : 'dark')
    store.theme = resolved
    document.documentElement.setAttribute('data-theme', resolved)
  },

  setLocale(lang) {
    store.locale = lang === 'sw' ? 'sw' : 'en'
    localStorage.setItem('fringe_locale', store.locale)
    store.showToast(
      store.locale === 'sw' ? 'Lugha imebadilishwa kuwa Kiswahili.' : 'Language switched to English.',
      'info'
    )
  },

  toggleLocale() {
    store.setLocale(store.locale === 'en' ? 'sw' : 'en')
  },

  playSound(type = 'beep') {
    if (!store.soundEnabled || typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      const now = ctx.currentTime
      if (type === 'beep') {
        // Soft audio tap (880Hz, 35ms)
        osc.frequency.setValueAtTime(880, now)
        gain.gain.setValueAtTime(0.06, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
        osc.start(now)
        osc.stop(now + 0.04)
      } else if (type === 'success') {
        // Cheerful dual register chime (523Hz -> 659Hz)
        osc.frequency.setValueAtTime(523.25, now)
        osc.frequency.setValueAtTime(659.25, now + 0.07)
        gain.gain.setValueAtTime(0.1, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
        osc.start(now)
        osc.stop(now + 0.2)
      } else if (type === 'warning' || type === 'error') {
        // Low security tone (260Hz)
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(260, now)
        gain.gain.setValueAtTime(0.08, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)
        osc.start(now)
        osc.stop(now + 0.14)
      }
    } catch (e) {
      // Audio autoplay policy or unavailable
    }
  },

  showToast(message, type = 'info', title = '') {
    if (store.toast.timeoutId) {
      clearTimeout(store.toast.timeoutId)
    }
    store.toast.message = message
    store.toast.type = type
    store.toast.title = title || (type === 'success' ? 'Success' : type === 'error' ? 'Notice' : type === 'warning' ? 'Warning' : 'Information')
    store.toast.show = true

    if (type === 'success') {
      store.playSound('success')
    } else if (type === 'error' || type === 'warning') {
      store.playSound('warning')
    }

    store.toast.timeoutId = setTimeout(() => {
      store.toast.show = false
    }, 4500)
  },

  dismissToast() {
    if (store.toast.timeoutId) {
      clearTimeout(store.toast.timeoutId)
    }
    store.toast.show = false
  },

  toggleSound() {
    store.soundEnabled = !store.soundEnabled
    localStorage.setItem('fringe_sound', store.soundEnabled ? 'true' : 'false')
    store.showToast(`Terminal sound feedback ${store.soundEnabled ? 'Enabled' : 'Muted'}`, 'info')
  },

  syncBusinessUnits(units = [], requiresSetup = null, requiresBranchSetup = null) {
    store.businessUnits = Array.isArray(units) ? units : []
    if (requiresSetup !== null && requiresSetup !== undefined) {
      store.requiresBusinessSetup = Boolean(requiresSetup)
    } else if (store.user?.role === 'owner') {
      const ids = new Set(store.businessUnits.map(u => u.id))
      store.requiresBusinessSetup = !(ids.has('bar') && ids.has('stationery'))
    } else {
      store.requiresBusinessSetup = false
    }

    if (requiresBranchSetup !== null && requiresBranchSetup !== undefined) {
      store.requiresBranchSetup = Boolean(requiresBranchSetup)
    } else if (store.user?.role === 'owner') {
      const branchUnits = new Set(
        (store.branches || []).filter(b => b.is_active !== false).map(b => b.business_unit_id || b.business_unit)
      )
      store.requiresBranchSetup = !(branchUnits.has('bar') && branchUnits.has('stationery'))
    } else {
      store.requiresBranchSetup = false
    }
  },

  async login(username, password) {
    try {
      const response = await api.post('/auth/login/', { username, password })
      const { token, user, available_units, requires_business_setup, requires_branch_setup, branches } = response.data

      store.token = token
      store.user = user
      store.activeUnit = user.role === 'owner' ? (localStorage.getItem('fringe_active_unit') || 'bar') : (user.business_unit || 'bar')
      if (branches) {
        store.branches = branches
      }
      store.syncBusinessUnits(available_units, requires_business_setup, requires_branch_setup)
      if (user.role === 'owner') {
        store.activeBranchId = localStorage.getItem('fringe_active_branch') || 'all'
      } else {
        store.activeBranchId = user.branch || null
      }

      localStorage.setItem('fringe_token', token)
      localStorage.setItem('fringe_user', JSON.stringify(user))
      localStorage.setItem('fringe_active_unit', store.activeUnit)
      localStorage.setItem('fringe_active_branch', store.activeBranchId || 'all')

      if (store.requiresBusinessSetup || store.requiresBranchSetup) {
        store.activeModal = 'business_setup'
        const msg = store.requiresBusinessSetup
          ? 'Welcome! Step 1: Name and save your Bar and Stationery businesses.'
          : 'Step 2: Create at least one branch for each business to continue.'
        store.showToast(msg, 'info')
        return true
      }

      store.activeModal = null
      store.showToast(`Welcome back, ${user.first_name || user.username}!`, 'success')
      await store.fetchBranches()
      await store.fetchActiveShift()
      return true
    } catch (err) {
      const msg = err.response?.data?.error || (err.request ? 'Unable to connect to backend server (127.0.0.1:8000).' : 'Login failed.')
      store.showToast(msg, 'error')
      throw err
    }
  },

  async logout(reason = 'manual') {
    try {
      if (store.token) {
        await api.post('/auth/logout/', { reason })
      }
    } catch (e) {
      // Continue cleanup on error
    } finally {
      store.token = null
      store.user = null
      store.activeShift = null
      store.cart = []
      store.isAgeVerified = false
      store.isIdleWarningActive = false
      store.heldSales = []
      store.businessUnits = []
      store.requiresBusinessSetup = false
      store.requiresBranchSetup = false
      store.branches = []
      store.activeBranchId = 'all'
      localStorage.removeItem('fringe_token')
      localStorage.removeItem('fringe_user')
      localStorage.removeItem('fringe_active_unit')
      localStorage.removeItem('fringe_active_branch')
      localStorage.removeItem('fringe_held_sales')
      store.activeModal = 'login'
      if (reason === 'idle_timeout') {
        store.showToast('Session locked automatically due to inactivity.', 'warning')
      } else {
        store.showToast('Logged out successfully.', 'info')
      }
    }
  },

  async fetchBranches() {
    if (!store.isAuthenticated) return
    try {
      const response = await api.get('/core/branches/')
      store.branches = response.data || []
      if (store.user?.role === 'owner') {
        const saved = localStorage.getItem('fringe_active_branch') || 'all'
        store.activeBranchId = saved
      } else {
        store.activeBranchId = store.user?.branch || null
      }
    } catch (e) {
      // Branches not available or user not authorized
    }
  },

  switchBranch(branchId) {
    if (store.user?.role !== 'owner') return
    store.activeBranchId = branchId
    localStorage.setItem('fringe_active_branch', branchId)
    store.clearCart()
    store.fetchActiveShift()
    window.dispatchEvent(new CustomEvent('fringe-branch-changed', { detail: { branchId } }))
    const bName = store.activeBranchName
    store.showToast(`Active Branch: ${bName}`, 'info')
  },

  setIdleTimeout(minutes) {
    store.idleTimeoutMinutes = parseInt(minutes, 10)
    localStorage.setItem('fringe_idle_timeout', minutes.toString())
    if (store.idleTimeoutMinutes === 0) {
      store.isIdleWarningActive = false
      store.showToast('Idle auto-logout disabled.', 'info')
    } else {
      store.showToast(`Idle auto-logout set to ${minutes} minutes.`, 'info')
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

  addToCart(product, quantity = 1, is_pack_sale = true, custom_price = null) {
    store.playSound('beep')
    let unitPrice = custom_price !== null && custom_price !== undefined 
      ? parseFloat(custom_price)
      : parseFloat(product.selling_price)

    if (custom_price === null && product.is_pack && !is_pack_sale && product.allow_split_sale) {
      unitPrice = parseFloat(product.split_unit_price || (unitPrice / product.pack_unit_ratio))
    }

    const existing = store.cart.find(
      item => item.product.id === product.id && item.is_pack_sale === is_pack_sale && Math.abs(item.unit_price - unitPrice) < 0.01
    )

    if (existing) {
      existing.quantity += quantity
      existing.subtotal = existing.unit_price * existing.quantity
    } else {
      store.cart.push({
        product,
        quantity,
        is_pack_sale,
        unit_price: unitPrice,
        subtotal: unitPrice * quantity,
        is_alcoholic: Boolean(product.is_alcoholic),
      })
    }

    // If an alcoholic drink is added, require fresh verification on checkout
    if (product.is_alcoholic) {
      store.isAgeVerified = false
    }
  },

  updateCartQuantity(target, delta, is_pack_sale = undefined) {
    let index = -1
    if (typeof target === 'number' && target < store.cart.length && target >= 0 && is_pack_sale === undefined) {
      index = target
    } else if (is_pack_sale !== undefined) {
      index = store.cart.findIndex(i => i.product.id === target && i.is_pack_sale === is_pack_sale)
    } else {
      index = store.cart.findIndex(i => i.product.id === target)
    }

    if (index === -1) return
    const item = store.cart[index]
    const newQty = item.quantity + delta
    if (newQty <= 0) {
      store.removeFromCart(index)
    } else {
      item.quantity = newQty
      item.subtotal = item.unit_price * newQty
    }
  },

  removeFromCart(target, is_pack_sale = undefined) {
    let index = -1
    if (typeof target === 'number' && target < store.cart.length && target >= 0 && is_pack_sale === undefined) {
      index = target
    } else if (is_pack_sale !== undefined) {
      index = store.cart.findIndex(i => i.product.id === target && i.is_pack_sale === is_pack_sale)
    } else {
      index = store.cart.findIndex(i => i.product.id === target)
    }

    if (index !== -1) {
      store.cart.splice(index, 1)
    }
    if (!store.cartHasAlcohol) {
      store.isAgeVerified = false
    }
  },

  clearCart() {
    store.cart = []
    store.selectedTab = null
    store.selectedCustomer = null
    store.isAgeVerified = false
    store.orderNotes = ''
  },

  holdCurrentSale(customNote = '') {
    if (store.cart.length === 0) return false
    const heldId = `HOLD-${Date.now().toString().slice(-6)}`
    const sale = {
      id: heldId,
      timestamp: new Date().toISOString(),
      business_unit: store.activeUnit,
      note: customNote || (store.selectedCustomer ? `Customer: ${store.selectedCustomer.name}` : `Walk-in Ticket #${heldId}`),
      customer: store.selectedCustomer ? { ...store.selectedCustomer } : null,
      items: JSON.parse(JSON.stringify(store.cart)),
      mode: store.stationeryMode,
      total: store.cartSubtotal,
      itemCount: store.cartItemCount,
    }
    store.heldSales.unshift(sale)
    localStorage.setItem('fringe_held_sales', JSON.stringify(store.heldSales))
    store.playSound('beep')
    store.showToast(`Sale held as [${heldId}]. Ready for next customer.`, 'info')
    store.clearCart()
    return true
  },

  resumeHeldSale(heldId) {
    const idx = store.heldSales.findIndex(s => s.id === heldId)
    if (idx === -1) return false
    const sale = store.heldSales[idx]

    // Restore
    store.cart = sale.items || []
    store.selectedCustomer = sale.customer || null
    if (sale.mode) store.stationeryMode = sale.mode

    // Remove from held
    store.heldSales.splice(idx, 1)
    localStorage.setItem('fringe_held_sales', JSON.stringify(store.heldSales))
    store.playSound('success')
    store.showToast(`Resumed held sale [${heldId}]`, 'success')
    return true
  },

  discardHeldSale(heldId) {
    const idx = store.heldSales.findIndex(s => s.id === heldId)
    if (idx !== -1) {
      store.heldSales.splice(idx, 1)
      localStorage.setItem('fringe_held_sales', JSON.stringify(store.heldSales))
      store.showToast(`Held sale [${heldId}] discarded.`, 'info')
    }
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
