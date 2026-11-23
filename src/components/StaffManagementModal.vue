<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import api from '../api'
import {
  Users, UserPlus, Shield, Key, Lock, CheckCircle2,
  XCircle, AlertTriangle, Edit3, RefreshCw, Eye, EyeOff,
  Search, Filter, X, Wine, BookOpen, Layers, Check,
  RotateCcw, Copy, MapPin, ChevronDown, Crown, Package
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const users = ref([])
const loading = ref(true)
const searchQuery = ref('')
const filterUnit = ref('all')
const filterRole = ref('all')
const filterBranch = ref('all')

// Modals / Drawers state
const showCreateDrawer = ref(false)
const showRoleModal = ref(false)
const showPinModal = ref(false)
const showResetTokenModal = ref(false)
const activeStaff = ref(null)

// Owner-Assisted Reset Token Data
const resetTokenData = ref({
  username: '',
  fullName: '',
  token: '',
  expiresAt: '',
  copied: false,
  generating: false
})

// Create Form Data
const createForm = ref({
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  role: 'bartender',
  business_unit: 'bar',
  branch: null,
  password: '',
  pin: ''
})
const showCreatePassword = ref(false)
const createSubmitting = ref(false)

// Edit Role Form
const editRoleForm = ref({
  role: '',
  business_unit: '',
  branch: null
})
const editRoleSubmitting = ref(false)

// PIN Form
const pinForm = ref({
  pin: '',
  confirmPin: ''
})
const pinSubmitting = ref(false)

const isSw = computed(() => store.locale === 'sw')

// Custom dropdown open state in drawer: 'role' | 'unit' | 'branch' | null
const openDropdown = ref(null)
const toggleDropdown = (name) => {
  openDropdown.value = openDropdown.value === name ? null : name
}
const closeDropdowns = () => {
  openDropdown.value = null
}

// Role configurations & metadata
const roleOptions = [
  { value: 'owner', label: 'Business Owner', labelSw: 'Mmiliki wa Biashara', desc: 'Full access across all units & branches', descSw: 'Mamlaka kamili kwenye biashara na matawi yote', unit: null, badgeClass: 'role-owner' },
  { value: 'stationery_manager', label: 'Stationery Manager', labelSw: 'Meneja wa Steshenari', desc: 'Catalog, stock, reports & approvals', descSw: 'Bidhaa, stoo, ripoti na idhini', unit: 'stationery', badgeClass: 'role-stat-mgr' },
  { value: 'stationery_cashier', label: 'Stationery Cashier', labelSw: 'Keshia wa Steshenari', desc: 'POS counter sales, receipts & shifts', descSw: 'Mauzo ya POS, risiti na zamu', unit: 'stationery', badgeClass: 'role-stat-cashier' },
  { value: 'stock_clerk', label: 'Stock Clerk', labelSw: 'Karani wa Stoo', desc: 'Inventory receiving & stocktake counts', descSw: 'Kupokea mizigo na kuhesabu stoo', unit: 'stationery', badgeClass: 'role-clerk' },
  { value: 'bar_manager', label: 'Bar Manager', labelSw: 'Meneja wa Baa', desc: 'Drinks catalog, bar reports & overrides', descSw: 'Vinywaji, ripoti za baa na idhini', unit: 'bar', badgeClass: 'role-bar-mgr' },
  { value: 'bartender', label: 'Bartender / Cashier', labelSw: 'Mhudumu wa Baa / Keshia', desc: 'Bar POS orders, tabs & shift checkout', descSw: 'Oda za baa, bili na malipo', unit: 'bar', badgeClass: 'role-bartender' },
]

const unitOptions = [
  { value: 'stationery', label: 'Stationery & Retail', labelSw: 'Steshenari na Rejareja', desc: 'Books, office supplies & wholesale', descSw: 'Vitabu, vifaa vya ofisi na jumla' },
  { value: 'bar', label: 'Bar & Lounge', labelSw: 'Baa na Vinywaji', desc: 'Beverages, counter & lounge tabs', descSw: 'Vinywaji, kaunta na bili za meza' },
]

// Prioritized role options based on selected business unit
const prioritizedRoleOptions = computed(() => {
  const unit = createForm.value.business_unit
  if (!unit) return roleOptions
  const matching = roleOptions.filter(r => r.unit === unit)
  const others = roleOptions.filter(r => r.unit !== unit)
  return [...matching, ...others]
})

const selectedRoleObj = computed(() => {
  return roleOptions.find(r => r.value === createForm.value.role) || roleOptions[0]
})

const selectedUnitObj = computed(() => {
  return unitOptions.find(u => u.value === createForm.value.business_unit) || unitOptions[0]
})

// Branches filtered for the selected business unit in the drawer
const drawerBranches = computed(() => {
  const unit = createForm.value.business_unit
  const list = store.branches || []
  if (!unit) return list
  const scoped = list.filter(b => (b.business_unit_id || b.business_unit) === unit)
  return scoped.length > 0 ? scoped : list
})

const selectedBranchObj = computed(() => {
  return drawerBranches.value.find(b => String(b.id) === String(createForm.value.branch)) || null
})

const selectDrawerRole = (roleVal) => {
  createForm.value.role = roleVal
  onRoleChange()
  openDropdown.value = null
}

const selectDrawerUnit = (unitVal) => {
  createForm.value.business_unit = unitVal
  // Keep role aligned with selected unit (unless owner)
  const currentRole = roleOptions.find(r => r.value === createForm.value.role)
  if (currentRole && currentRole.unit && currentRole.unit !== unitVal) {
    createForm.value.role = unitVal === 'stationery' ? 'stationery_cashier' : 'bartender'
  }
  // Pick active branch for this unit if available
  const unitBranches = (store.branches || []).filter(
    b => (b.business_unit_id || b.business_unit) === unitVal && b.is_active !== false
  )
  const currentValid = unitBranches.some(b => String(b.id) === String(createForm.value.branch))
  if (!currentValid) {
    createForm.value.branch = unitBranches[0]?.id || null
  }
  openDropdown.value = null
}

const selectDrawerBranch = (branchId) => {
  createForm.value.branch = branchId
  openDropdown.value = null
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await api.get('/core/users/')
    users.value = res.data.results || res.data
  } catch (err) {
    store.showToast(err.response?.data?.detail || 'Failed to load staff list.', 'error')
  } finally {
    loading.value = false
  }
}

// Summary statistics
const stats = computed(() => {
  const total = users.value.length
  const active = users.value.filter(u => u.is_active).length
  const bar = users.value.filter(u => u.business_unit === 'bar').length
  const stationery = users.value.filter(u => u.business_unit === 'stationery').length
  return { total, active, bar, stationery }
})

// Filtered staff list
const filteredUsers = computed(() => {
  return users.value.filter(user => {
    // Search
    const q = searchQuery.value.toLowerCase().trim()
    const matchesSearch = !q || 
      user.username.toLowerCase().includes(q) ||
      (user.first_name && user.first_name.toLowerCase().includes(q)) ||
      (user.last_name && user.last_name.toLowerCase().includes(q)) ||
      (user.email && user.email.toLowerCase().includes(q))

    // Unit filter
    const matchesUnit = filterUnit.value === 'all' || 
      (filterUnit.value === 'global' ? !user.business_unit : user.business_unit === filterUnit.value)

    // Role filter
    const matchesRole = filterRole.value === 'all' || user.role === filterRole.value

    // Branch filter
    const matchesBranch = filterBranch.value === 'all' || 
      String(user.branch) === String(filterBranch.value)

    return matchesSearch && matchesUnit && matchesRole && matchesBranch
  })
})

const getRoleBadgeClass = (role) => {
  const opt = roleOptions.find(r => r.value === role)
  return opt ? opt.badgeClass : 'role-default'
}

// Auto-align unit & branch when selecting role in creation
const onRoleChange = () => {
  const roleMeta = roleOptions.find(r => r.value === createForm.value.role)
  if (!roleMeta || roleMeta.value === 'owner') {
    createForm.value.branch = null
    return
  }
  if (roleMeta.unit) {
    createForm.value.business_unit = roleMeta.unit
    const unitBranches = (store.branches || []).filter(
      b => (b.business_unit_id || b.business_unit) === roleMeta.unit && b.is_active !== false
    )
    const currentValid = unitBranches.some(b => String(b.id) === String(createForm.value.branch))
    if (!currentValid) {
      const activeMatch = unitBranches.find(b => String(b.id) === String(store.activeBranchId))
      createForm.value.branch = activeMatch?.id || unitBranches[0]?.id || null
    }
  }
}

// Open creation form — defaults intelligently to the active business unit & branch!
const openCreateDrawer = () => {
  const defaultUnit = store.activeUnit === 'bar' ? 'bar' : 'stationery'
  const defaultRole = defaultUnit === 'stationery' ? 'stationery_cashier' : 'bartender'
  const unitBranches = (store.branches || []).filter(
    b => (b.business_unit_id || b.business_unit) === defaultUnit && b.is_active !== false
  )
  const activeMatch = unitBranches.find(b => String(b.id) === String(store.activeBranchId))
  const defaultBranch = activeMatch?.id || unitBranches[0]?.id || null

  createForm.value = {
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    role: defaultRole,
    business_unit: defaultUnit,
    branch: defaultBranch,
    password: '',
    pin: ''
  }
  openDropdown.value = null
  showCreateDrawer.value = true
}

// Submit Create Staff
const handleCreateStaff = async () => {
  if (!createForm.value.username.trim()) {
    store.showToast('Username is required.', 'warning')
    return
  }
  // Strong password validation
  const pwd = createForm.value.password || ''
  const missing = []
  if (pwd.length < 8) missing.push('at least 8 characters')
  if (!/[A-Z]/.test(pwd)) missing.push('one uppercase letter (A-Z)')
  if (!/[a-z]/.test(pwd)) missing.push('one lowercase letter (a-z)')
  if (!/[0-9]/.test(pwd)) missing.push('one number (0-9)')
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) missing.push('one special character (!@#$%^&*)')

  if (missing.length > 0) {
    store.showToast(`Weak password. Missing: ${missing.join(', ')}.`, 'error')
    return
  }

  if (createForm.value.pin) {
    if (!/^\d{4,6}$/.test(createForm.value.pin)) {
      store.showToast('PIN must be 4 to 6 numeric digits.', 'warning')
      return
    }
  }

  if (createForm.value.business_unit === 'bar' && createForm.value.role === 'bartender' && store.branches.length > 0) {
    if (!createForm.value.branch) {
      store.showToast('Bartenders must be permanently assigned to a branch location (no roaming).', 'warning')
      return
    }
  }

  createSubmitting.value = true
  try {
    const payload = {
      username: createForm.value.username.trim(),
      first_name: createForm.value.first_name.trim(),
      last_name: createForm.value.last_name.trim(),
      email: createForm.value.email.trim(),
      role: createForm.value.role,
      business_unit: createForm.value.role === 'owner' ? null : (createForm.value.business_unit || null),
      branch: createForm.value.role === 'owner' ? null : (createForm.value.branch || null),
      password: createForm.value.password,
      pin: createForm.value.pin || undefined
    }

    const res = await api.post('/core/users/', payload)
    store.showToast(`Staff member @${res.data.username} registered successfully!`, 'success')
    showCreateDrawer.value = false
    await fetchUsers()
  } catch (err) {
    const errData = err.response?.data
    let msg = 'Failed to create staff member.'
    if (typeof errData === 'object') {
      const firstKey = Object.keys(errData)[0]
      msg = `${firstKey}: ${Array.isArray(errData[firstKey]) ? errData[firstKey][0] : errData[firstKey]}`
    }
    store.showToast(msg, 'error')
  } finally {
    createSubmitting.value = false
  }
}

// Open Role edit
const openRoleModal = (staff) => {
  activeStaff.value = staff
  editRoleForm.value = {
    role: staff.role,
    business_unit: staff.business_unit || '',
    branch: staff.branch || null
  }
  showRoleModal.value = true
}

// Submit Role & Unit change
const handleUpdateRole = async () => {
  if (!activeStaff.value) return

  if (editRoleForm.value.business_unit === 'bar' && editRoleForm.value.role === 'bartender' && store.branches.length > 0) {
    if (!editRoleForm.value.branch) {
      store.showToast('Bartenders must be permanently assigned to a single branch location.', 'warning')
      return
    }
  }

  editRoleSubmitting.value = true
  try {
    const payload = {
      role: editRoleForm.value.role,
      business_unit: editRoleForm.value.business_unit || null,
      branch: editRoleForm.value.business_unit === 'bar' ? editRoleForm.value.branch : null
    }
    const res = await api.patch(`/core/users/${activeStaff.value.id}/`, payload)
    store.showToast(`Role & branch assignment updated for @${res.data.username}.`, 'success')
    showRoleModal.value = false
    await fetchUsers()
  } catch (err) {
    store.showToast(err.response?.data?.detail || 'Failed to update role.', 'error')
  } finally {
    editRoleSubmitting.value = false
  }
}

// Open PIN modal
const openPinModal = (staff) => {
  activeStaff.value = staff
  pinForm.value = {
    pin: '',
    confirmPin: ''
  }
  showPinModal.value = true
}

// Submit PIN assignment
const handleSetPin = async () => {
  if (!activeStaff.value) return
  if (!/^\d{4,6}$/.test(pinForm.value.pin)) {
    store.showToast('PIN must be 4 to 6 numeric digits.', 'warning')
    return
  }
  if (pinForm.value.pin !== pinForm.value.confirmPin) {
    store.showToast('PIN confirmation does not match.', 'warning')
    return
  }

  pinSubmitting.value = true
  try {
    const res = await api.post(`/core/users/${activeStaff.value.id}/set_pin/`, { pin: pinForm.value.pin })
    store.showToast(res.data.message || 'PIN updated successfully.', 'success')
    showPinModal.value = false
    await fetchUsers()
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to set PIN.', 'error')
  } finally {
    pinSubmitting.value = false
  }
}

// Toggle active / suspend status
const handleToggleActive = async (staff) => {
  if (staff.role === 'owner') {
    store.showToast('Owner account cannot be suspended.', 'warning')
    return
  }

  const actionText = staff.is_active ? 'suspend' : 'activate'
  const isSw = store.locale === 'sw'
  const confirmed = await store.confirm({
    title: isSw ? 'Badilisha Hali ya Akaunti?' : `${actionText === 'deactivate' ? 'Deactivate' : 'Reactivate'} Staff Account?`,
    message: isSw
      ? 'Je, una uhakika unataka kubadilisha hali ya akaunti ya mfanyakazi huyu?'
      : `Are you sure you want to ${actionText} this staff member's account?`,
    itemLabel: staff.first_name || staff.username,
    confirmText: isSw ? 'Thibitisha' : (actionText === 'deactivate' ? 'Deactivate' : 'Reactivate'),
    cancelText: isSw ? 'Ghairi' : 'Cancel',
    variant: actionText === 'deactivate' ? 'danger' : 'primary'
  })
  if (!confirmed) {
    return
  }

  try {
    const res = await api.post(`/core/users/${staff.id}/toggle_active/`)
    store.showToast(res.data.message, res.data.is_active ? 'success' : 'warning')
    await fetchUsers()
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to update account status.', 'error')
  }
}

// Generate Temporary Reset Token (Owner-Assisted Forgot Password)
const handleGenerateResetToken = async (staff) => {
  if (staff.role === 'owner') {
    store.showToast('Reset tokens are for employee recovery.', 'warning')
    return
  }

  resetTokenData.value = {
    username: staff.username,
    fullName: staff.first_name ? `${staff.first_name} ${staff.last_name || ''}`.trim() : staff.username,
    token: '',
    expiresAt: '',
    copied: false,
    generating: true
  }
  showResetTokenModal.value = true

  try {
    const res = await api.post(`/core/users/${staff.id}/generate_reset_token/`)
    resetTokenData.value.token = res.data.token
    resetTokenData.value.expiresAt = res.data.expires_at
    store.showToast(`Reset Token generated for @${staff.username}`, 'success')
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to generate reset token.', 'error')
    showResetTokenModal.value = false
  } finally {
    resetTokenData.value.generating = false
  }
}

const copyResetToken = async () => {
  try {
    await navigator.clipboard.writeText(resetTokenData.value.token)
    resetTokenData.value.copied = true
    store.showToast('Reset Token copied to clipboard!', 'info')
    setTimeout(() => {
      resetTokenData.value.copied = false
    }, 3000)
  } catch (err) {
    store.showToast(`Token: ${resetTokenData.value.token}`, 'info')
  }
}

onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    store.fetchBranches()
  ])
})
</script>

<template>
  <div class="modal-overlay" :data-theme="store.theme" @click.self="$emit('close')">
    <div class="modal-card">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-left">
          <div class="header-icon-box">
            <Shield :size="24" class="header-icon" />
          </div>
          <div>
            <div class="header-title-row">
              <h3 class="title">{{ t('staff.title') }}</h3>
              <span class="owner-badge">{{ t('staff.ownerBadge') }}</span>
            </div>
            <p class="subtitle">
              {{ t('staff.subtitle') }}
            </p>
          </div>
        </div>
        <button class="btn-close" @click="$emit('close')" :title="t('common.backToPos')">
          <X :size="16" />
          <span>{{ t('common.backToPos') }}</span>
        </button>
      </div>

      <!-- Unauthorized Guard (Defense in depth) -->
      <div v-if="!store.isOwner" class="denied-box">
        <AlertTriangle :size="32" class="denied-icon" />
        <h4>Access Restricted: Business Owner Privilege Required</h4>
        <p>Only the Business Owner has permission to manage staff accounts and assign roles.</p>
        <button class="btn-primary" @click="$emit('close')">{{ t('common.backToPos') }}</button>
      </div>

      <div v-else class="modal-content">
        <!-- Top Stats Row -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">{{ t('staff.total') }}</span>
              <span class="stat-value">{{ stats.total }}</span>
            </div>
            <div class="stat-icon-wrap purple"><Users :size="22" /></div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">{{ t('staff.active') }}</span>
              <span class="stat-value active-val">{{ stats.active }}</span>
            </div>
            <div class="stat-icon-wrap green"><CheckCircle2 :size="22" /></div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">{{ t('staff.barStaff') }}</span>
              <span class="stat-value">{{ stats.bar }}</span>
            </div>
            <div class="stat-icon-wrap amber"><Wine :size="22" /></div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">{{ t('staff.statStaff') }}</span>
              <span class="stat-value">{{ stats.stationery }}</span>
            </div>
            <div class="stat-icon-wrap cyan"><BookOpen :size="22" /></div>
          </div>
        </div>

        <!-- Controls Toolbar -->
        <div class="toolbar" @click="closeDropdowns">
          <div class="search-box">
            <Search :size="16" class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              :placeholder="t('staff.searchPlaceholder')"
              class="search-input"
            />
            <button v-if="searchQuery" type="button" class="clear-btn" @click="searchQuery = ''">
              <X :size="14" />
            </button>
          </div>

          <div class="filters">
            <!-- Unit Filter Dropdown -->
            <div class="filter-dropdown-wrap" @click.stop>
              <button
                type="button"
                class="filter-trigger"
                :class="{ open: openDropdown === 'filter_unit', active: filterUnit !== 'all' }"
                @click="toggleDropdown('filter_unit')"
              >
                <Filter :size="14" class="f-icon" />
                <span>
                  {{ filterUnit === 'all'
                    ? t('staff.allUnits')
                    : filterUnit === 'bar'
                      ? (isSw ? 'Baa na Vinywaji' : 'Bar & Lounge')
                      : filterUnit === 'stationery'
                        ? (isSw ? 'Steshenari' : 'Stationery & Retail')
                        : (isSw ? 'Biashara Zote / Mmiliki' : 'Global / Owner') }}
                </span>
                <ChevronDown :size="14" class="trigger-chevron" :class="{ rotated: openDropdown === 'filter_unit' }" />
              </button>
              <transition name="dd-pop">
                <div v-if="openDropdown === 'filter_unit'" class="custom-select-menu filter-menu">
                  <button type="button" class="custom-option" :class="{ selected: filterUnit === 'all' }" @click="filterUnit = 'all'; closeDropdowns()">
                    <span class="opt-title">{{ t('staff.allUnits') }}</span>
                    <Check v-if="filterUnit === 'all'" :size="14" class="opt-check" />
                  </button>
                  <button type="button" class="custom-option" :class="{ selected: filterUnit === 'stationery' }" @click="filterUnit = 'stationery'; closeDropdowns()">
                    <BookOpen :size="14" class="sel-icon accent" />
                    <span class="opt-title">{{ isSw ? 'Steshenari na Rejareja' : 'Stationery & Retail' }}</span>
                    <Check v-if="filterUnit === 'stationery'" :size="14" class="opt-check" />
                  </button>
                  <button type="button" class="custom-option" :class="{ selected: filterUnit === 'bar' }" @click="filterUnit = 'bar'; closeDropdowns()">
                    <Wine :size="14" class="sel-icon amber" />
                    <span class="opt-title">{{ isSw ? 'Baa na Vinywaji' : 'Bar & Lounge' }}</span>
                    <Check v-if="filterUnit === 'bar'" :size="14" class="opt-check" />
                  </button>
                  <button type="button" class="custom-option" :class="{ selected: filterUnit === 'global' }" @click="filterUnit = 'global'; closeDropdowns()">
                    <Layers :size="14" class="sel-icon accent" />
                    <span class="opt-title">{{ isSw ? 'Biashara Zote / Mmiliki' : 'Global / Owner' }}</span>
                    <Check v-if="filterUnit === 'global'" :size="14" class="opt-check" />
                  </button>
                </div>
              </transition>
            </div>

            <!-- Role Filter Dropdown -->
            <div class="filter-dropdown-wrap" @click.stop>
              <button
                type="button"
                class="filter-trigger"
                :class="{ open: openDropdown === 'filter_role', active: filterRole !== 'all' }"
                @click="toggleDropdown('filter_role')"
              >
                <span>
                  {{ filterRole === 'all'
                    ? t('staff.allRoles')
                    : (isSw ? (roleOptions.find(r => r.value === filterRole)?.labelSw || filterRole) : (roleOptions.find(r => r.value === filterRole)?.label || filterRole)) }}
                </span>
                <ChevronDown :size="14" class="trigger-chevron" :class="{ rotated: openDropdown === 'filter_role' }" />
              </button>
              <transition name="dd-pop">
                <div v-if="openDropdown === 'filter_role'" class="custom-select-menu filter-menu">
                  <button type="button" class="custom-option" :class="{ selected: filterRole === 'all' }" @click="filterRole = 'all'; closeDropdowns()">
                    <span class="opt-title">{{ t('staff.allRoles') }}</span>
                    <Check v-if="filterRole === 'all'" :size="14" class="opt-check" />
                  </button>
                  <button
                    v-for="role in roleOptions"
                    :key="role.value"
                    type="button"
                    class="custom-option"
                    :class="{ selected: filterRole === role.value }"
                    @click="filterRole = role.value; closeDropdowns()"
                  >
                    <span class="opt-title">{{ isSw ? role.labelSw : role.label }}</span>
                    <Check v-if="filterRole === role.value" :size="14" class="opt-check" />
                  </button>
                </div>
              </transition>
            </div>

            <!-- Branch Filter Dropdown -->
            <div class="filter-dropdown-wrap" v-if="store.branches.length" @click.stop>
              <button
                type="button"
                class="filter-trigger"
                :class="{ open: openDropdown === 'filter_branch', active: filterBranch !== 'all' }"
                @click="toggleDropdown('filter_branch')"
              >
                <MapPin :size="14" class="f-icon" />
                <span>
                  {{ filterBranch === 'all'
                    ? t('staff.allBranches')
                    : (store.branches.find(b => String(b.id) === String(filterBranch))?.name || t('staff.allBranches')) }}
                </span>
                <ChevronDown :size="14" class="trigger-chevron" :class="{ rotated: openDropdown === 'filter_branch' }" />
              </button>
              <transition name="dd-pop">
                <div v-if="openDropdown === 'filter_branch'" class="custom-select-menu filter-menu filter-menu-right">
                  <button type="button" class="custom-option" :class="{ selected: filterBranch === 'all' }" @click="filterBranch = 'all'; closeDropdowns()">
                    <span class="opt-title">{{ t('staff.allBranches') }}</span>
                    <Check v-if="filterBranch === 'all'" :size="14" class="opt-check" />
                  </button>
                  <button
                    v-for="b in store.branches"
                    :key="b.id"
                    type="button"
                    class="custom-option"
                    :class="{ selected: String(filterBranch) === String(b.id) }"
                    @click="filterBranch = String(b.id); closeDropdowns()"
                  >
                    <span class="opt-title">{{ b.name }}</span>
                    <Check v-if="String(filterBranch) === String(b.id)" :size="14" class="opt-check" />
                  </button>
                </div>
              </transition>
            </div>

            <button type="button" class="btn-refresh" @click="fetchUsers" :title="t('common.refresh')">
              <RefreshCw :size="16" :class="{ 'spin-anim': loading }" />
            </button>

            <button type="button" class="btn-add-staff" @click="openCreateDrawer">
              <UserPlus :size="16" />
              <span>{{ t('staff.registerNew') }}</span>
            </button>
          </div>
        </div>

        <!-- Staff List Table (Desktop / Tablet) -->
        <div class="table-container staff-table-desktop">
          <div class="staff-table-scroll">
            <table class="staff-table">
              <thead>
                <tr>
                  <th>{{ t('staff.colMember') }}</th>
                  <th>{{ t('staff.colRole') }}</th>
                  <th>{{ t('staff.colUnit') }}</th>
                  <th>{{ t('staff.colBranch') }}</th>
                  <th>{{ t('staff.colPin') }}</th>
                  <th>{{ t('staff.colStatus') }}</th>
                  <th class="text-right">{{ t('staff.colActions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading && users.length === 0">
                  <td colspan="7" class="loading-td">
                    <RefreshCw :size="20" class="spin-anim" />
                    <span>{{ isSw ? 'Inapakia orodha ya wafanyakazi...' : 'Loading staff records from secure ledger...' }}</span>
                  </td>
                </tr>
                <tr v-else-if="filteredUsers.length === 0">
                  <td colspan="7" class="empty-td">
                    <Users :size="32" class="empty-icon" />
                    <p>{{ isSw ? 'Hakuna mfanyakazi aliyepatikana kwa vichujio hivi.' : 'No staff records found matching your filters.' }}</p>
                  </td>
                </tr>
                <tr v-for="user in filteredUsers" :key="user.id" :class="{ 'row-inactive': !user.is_active }">
                  <td>
                    <div class="user-cell">
                      <div class="user-avatar" :class="user.role === 'owner' ? 'avatar-owner' : 'avatar-staff'">
                        <span>{{ (user.first_name?.[0] || user.username?.[0] || 'U').toUpperCase() }}</span>
                      </div>
                      <div class="user-name-col">
                        <div class="user-fullname">
                          <span>{{ user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username }}</span>
                          <span v-if="user.role === 'owner'" class="crown-tag">{{ isSw ? 'Mmiliki' : 'Owner' }}</span>
                        </div>
                        <div class="user-subtext">@{{ user.username }} &bull; {{ user.email || (isSw ? 'Hakuna barua pepe' : 'No email') }}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span class="role-pill" :class="getRoleBadgeClass(user.role)">
                      {{ user.role_display }}
                    </span>
                  </td>

                  <td>
                    <div class="unit-cell">
                      <Wine v-if="user.business_unit === 'bar'" :size="14" class="text-amber" />
                      <BookOpen v-else-if="user.business_unit === 'stationery'" :size="14" class="text-cyan" />
                      <Layers v-else :size="14" class="text-purple" />
                      <span>{{ user.business_unit_name || (isSw ? 'Biashara Zote' : 'Global (Cross-Unit)') }}</span>
                    </div>
                  </td>

                  <td>
                    <div v-if="user.branch_name" class="branch-cell">
                      <MapPin :size="13" class="text-emerald" />
                      <span class="branch-name">{{ user.branch_name }}</span>
                      <span v-if="user.branch_code" class="branch-code">({{ user.branch_code }})</span>
                    </div>
                    <span v-else-if="user.role === 'owner'" class="branch-all">{{ isSw ? 'Matawi Yote' : 'All Locations' }}</span>
                    <span v-else class="branch-unassigned">{{ isSw ? 'Hajapangiwa' : 'Unassigned' }}</span>
                  </td>

                  <td>
                    <span v-if="user.has_pin" class="badge-pin-yes">
                      <CheckCircle2 :size="14" />
                      <span>{{ isSw ? 'PIN Ipo' : 'PIN Active' }}</span>
                    </span>
                    <span v-else class="badge-pin-no">
                      <Lock :size="14" />
                      <span>{{ isSw ? 'Haijawekwa' : 'Not Set' }}</span>
                    </span>
                  </td>

                  <td>
                    <span class="status-pill" :class="user.is_active ? 'status-active' : 'status-suspended'">
                      {{ user.is_active ? (isSw ? 'Hai' : 'Active') : (isSw ? 'Imesimamishwa' : 'Suspended') }}
                    </span>
                  </td>

                  <td class="text-right">
                    <div class="actions-group">
                      <button class="btn-action edit" @click="openRoleModal(user)" :title="isSw ? 'Badilisha Jukumu' : 'Reassign Role or Business Unit'">
                        <Edit3 :size="14" />
                        <span>{{ isSw ? 'Jukumu' : 'Role' }}</span>
                      </button>

                      <button class="btn-action pin" @click="openPinModal(user)" :title="isSw ? 'Weka PIN' : 'Set or Reset Authorization PIN'">
                        <Key :size="14" />
                        <span>PIN</span>
                      </button>

                      <button v-if="user.role !== 'owner'" class="btn-action token" @click="handleGenerateResetToken(user)" :title="isSw ? 'Tengeneza Tokeni' : 'Generate Reset Token'">
                        <RotateCcw :size="14" />
                        <span>{{ isSw ? 'Tokeni' : 'Token' }}</span>
                      </button>

                      <button
                        v-if="user.role !== 'owner'"
                        class="btn-action"
                        :class="user.is_active ? 'suspend' : 'activate'"
                        @click="handleToggleActive(user)"
                      >
                        <XCircle v-if="user.is_active" :size="14" />
                        <CheckCircle2 v-else :size="14" />
                        <span>{{ user.is_active ? (isSw ? 'Simamisha' : 'Suspend') : (isSw ? 'Washa' : 'Activate') }}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Mobile Staff Cards (<= 768px) -->
        <div class="staff-mobile-cards">
          <div v-if="filteredUsers.length === 0 && !loading" class="mobile-empty-card">
            <Users :size="28" />
            <p>{{ isSw ? 'Hakuna mfanyakazi aliyepatikana.' : 'No staff records found.' }}</p>
          </div>
          <div v-for="user in filteredUsers" :key="'m-' + user.id" class="staff-m-card" :class="{ 'row-inactive': !user.is_active }">
            <div class="staff-m-head">
              <div class="user-cell">
                <div class="user-avatar" :class="user.role === 'owner' ? 'avatar-owner' : 'avatar-staff'">
                  <span>{{ (user.first_name?.[0] || user.username?.[0] || 'U').toUpperCase() }}</span>
                </div>
                <div class="user-name-col">
                  <div class="user-fullname">{{ user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username }}</div>
                  <div class="user-subtext">@{{ user.username }}</div>
                </div>
              </div>
              <span class="status-pill" :class="user.is_active ? 'status-active' : 'status-suspended'">
                {{ user.is_active ? (isSw ? 'Hai' : 'Active') : (isSw ? 'Imesimamishwa' : 'Suspended') }}
              </span>
            </div>
            <div class="staff-m-meta">
              <span class="role-pill" :class="getRoleBadgeClass(user.role)">{{ user.role_display }}</span>
              <span class="m-meta-chip">{{ user.business_unit_name || (isSw ? 'Biashara Zote' : 'Global') }}</span>
              <span class="m-meta-chip">{{ user.branch_name || (user.role === 'owner' ? (isSw ? 'Matawi Yote' : 'All Locations') : (isSw ? 'Hajapangiwa' : 'Unassigned')) }}</span>
            </div>
            <div class="staff-m-actions">
              <button class="btn-action edit" @click="openRoleModal(user)"><Edit3 :size="13" /><span>{{ isSw ? 'Jukumu' : 'Role' }}</span></button>
              <button class="btn-action pin" @click="openPinModal(user)"><Key :size="13" /><span>PIN</span></button>
              <button v-if="user.role !== 'owner'" class="btn-action token" @click="handleGenerateResetToken(user)"><RotateCcw :size="13" /><span>{{ isSw ? 'Tokeni' : 'Token' }}</span></button>
              <button v-if="user.role !== 'owner'" class="btn-action" :class="user.is_active ? 'suspend' : 'activate'" @click="handleToggleActive(user)">
                <span>{{ user.is_active ? (isSw ? 'Simamisha' : 'Suspend') : (isSw ? 'Washa' : 'Activate') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Slide-over Drawer: Register New Staff -->
      <transition name="drawer-slide">
        <div v-if="showCreateDrawer" class="drawer-overlay" @click.self="showCreateDrawer = false">
          <div class="drawer-card" @click="closeDropdowns">
            <div class="drawer-header">
              <div class="drawer-title-group">
                <div class="drawer-icon-badge">
                  <UserPlus :size="18" />
                </div>
                <div>
                  <h4 class="drawer-title">{{ isSw ? 'Sajili Akaunti Mpya ya Mfanyakazi' : 'Register New Staff Account' }}</h4>
                  <p class="drawer-sub">{{ isSw ? 'Mamlaka ya Mmiliki: Panga jukumu, taarifa za kuingia na tawi.' : 'Business Owner Authorization: Assign role, credentials, and branch.' }}</p>
                </div>
              </div>
              <button type="button" class="btn-close-drawer" @click="showCreateDrawer = false"><X :size="18" /></button>
            </div>

            <form class="drawer-body" @submit.prevent="handleCreateStaff">
              <!-- Name Fields -->
              <div class="form-row">
                <div class="form-group">
                  <label>{{ isSw ? 'Jina la Kwanza' : 'First Name' }}</label>
                  <input v-model="createForm.first_name" type="text" placeholder="e.g. John" class="form-input" />
                </div>
                <div class="form-group">
                  <label>{{ isSw ? 'Jina la Mwisho' : 'Last Name' }}</label>
                  <input v-model="createForm.last_name" type="text" placeholder="e.g. Banda" class="form-input" />
                </div>
              </div>

              <!-- Username & Email -->
              <div class="form-row">
                <div class="form-group">
                  <label>{{ isSw ? 'Jina la Mtumiaji' : 'Username' }} <span class="req">*</span></label>
                  <input v-model="createForm.username" type="text" required placeholder="e.g. jbanda" class="form-input" />
                </div>
                <div class="form-group">
                  <label>{{ isSw ? 'Barua Pepe' : 'Email Address' }}</label>
                  <input v-model="createForm.email" type="email" placeholder="e.g. john@fringe.local" class="form-input" />
                </div>
              </div>

              <!-- Custom Attractive Dropdowns: Business Unit & Role -->
              <div class="form-row">
                <!-- Assigned Business Unit -->
                <div class="form-group" @click.stop>
                  <label>{{ isSw ? 'Kitengo cha Biashara' : 'Assigned Business Unit' }} <span class="req">*</span></label>
                  <div class="custom-select-wrap">
                    <button
                      type="button"
                      class="custom-select-trigger"
                      :class="{ open: openDropdown === 'unit' }"
                      @click="toggleDropdown('unit')"
                    >
                      <span class="trigger-left">
                        <BookOpen v-if="createForm.business_unit === 'stationery'" :size="15" class="sel-icon accent" />
                        <Wine v-else :size="15" class="sel-icon amber" />
                        <span class="trigger-text">{{ isSw ? selectedUnitObj.labelSw : selectedUnitObj.label }}</span>
                      </span>
                      <ChevronDown :size="15" class="trigger-chevron" :class="{ rotated: openDropdown === 'unit' }" />
                    </button>

                    <transition name="dd-pop">
                      <div v-if="openDropdown === 'unit'" class="custom-select-menu">
                        <button
                          v-for="u in unitOptions"
                          :key="u.value"
                          type="button"
                          class="custom-option"
                          :class="{ selected: createForm.business_unit === u.value }"
                          @click="selectDrawerUnit(u.value)"
                        >
                          <div class="opt-icon-box" :class="u.value === 'stationery' ? 'opt-stat' : 'opt-bar'">
                            <BookOpen v-if="u.value === 'stationery'" :size="15" />
                            <Wine v-else :size="15" />
                          </div>
                          <div class="opt-text-col">
                            <span class="opt-title">{{ isSw ? u.labelSw : u.label }}</span>
                            <span class="opt-desc">{{ isSw ? u.descSw : u.desc }}</span>
                          </div>
                          <Check v-if="createForm.business_unit === u.value" :size="15" class="opt-check" />
                        </button>
                      </div>
                    </transition>
                  </div>
                </div>

                <!-- Assigned Role -->
                <div class="form-group" @click.stop>
                  <label>{{ isSw ? 'Jukumu la Mfanyakazi' : 'Assigned Role' }} <span class="req">*</span></label>
                  <div class="custom-select-wrap">
                    <button
                      type="button"
                      class="custom-select-trigger"
                      :class="{ open: openDropdown === 'role' }"
                      @click="toggleDropdown('role')"
                    >
                      <span class="trigger-left">
                        <Shield :size="15" class="sel-icon accent" />
                        <span class="trigger-text">{{ isSw ? selectedRoleObj.labelSw : selectedRoleObj.label }}</span>
                      </span>
                      <ChevronDown :size="15" class="trigger-chevron" :class="{ rotated: openDropdown === 'role' }" />
                    </button>

                    <transition name="dd-pop">
                      <div v-if="openDropdown === 'role'" class="custom-select-menu">
                        <button
                          v-for="r in prioritizedRoleOptions"
                          :key="r.value"
                          type="button"
                          class="custom-option"
                          :class="{ selected: createForm.role === r.value }"
                          @click="selectDrawerRole(r.value)"
                        >
                          <div class="opt-icon-box" :class="r.unit === 'stationery' ? 'opt-stat' : (r.unit === 'bar' ? 'opt-bar' : 'opt-owner')">
                            <BookOpen v-if="r.unit === 'stationery'" :size="14" />
                            <Wine v-else-if="r.unit === 'bar'" :size="14" />
                            <Shield v-else :size="14" />
                          </div>
                          <div class="opt-text-col">
                            <span class="opt-title">{{ isSw ? r.labelSw : r.label }}</span>
                            <span class="opt-desc">{{ isSw ? r.descSw : r.desc }}</span>
                          </div>
                          <Check v-if="createForm.role === r.value" :size="15" class="opt-check" />
                        </button>
                      </div>
                    </transition>
                  </div>
                </div>
              </div>

              <!-- Permanent Branch Assignment -->
              <div class="form-group" v-if="createForm.role !== 'owner'" @click.stop>
                <label>
                  {{ isSw ? 'Tawi Analofanyia Kazi' : 'Assigned Branch Location' }}
                  <span class="req" v-if="createForm.role === 'bartender' || createForm.role === 'stationery_cashier'">*</span>
                </label>
                <div class="custom-select-wrap">
                  <button
                    type="button"
                    class="custom-select-trigger"
                    :class="{ open: openDropdown === 'branch' }"
                    @click="toggleDropdown('branch')"
                  >
                    <span class="trigger-left">
                      <MapPin :size="15" class="sel-icon emerald" />
                      <span class="trigger-text">
                        {{ selectedBranchObj ? `${selectedBranchObj.name} (${selectedBranchObj.code})` : (isSw ? 'Chagua Tawi...' : 'Select Branch Location...') }}
                      </span>
                    </span>
                    <ChevronDown :size="15" class="trigger-chevron" :class="{ rotated: openDropdown === 'branch' }" />
                  </button>

                  <transition name="dd-pop">
                    <div v-if="openDropdown === 'branch'" class="custom-select-menu">
                      <button
                        v-for="b in drawerBranches"
                        :key="b.id"
                        type="button"
                        class="custom-option"
                        :class="{ selected: String(createForm.branch) === String(b.id) }"
                        @click="selectDrawerBranch(b.id)"
                      >
                        <div class="opt-icon-box opt-branch">
                          <MapPin :size="14" />
                        </div>
                        <div class="opt-text-col">
                          <span class="opt-title">{{ b.name }}</span>
                          <span class="opt-desc">{{ b.code }}{{ b.is_active === false ? ' · Inactive' : '' }}</span>
                        </div>
                        <Check v-if="String(createForm.branch) === String(b.id)" :size="15" class="opt-check" />
                      </button>
                    </div>
                  </transition>
                </div>
                <span class="field-hint">
                  {{ isSw
                    ? 'Wafanyakazi hufanya kazi kwenye tawi walilopangiwa. Mmiliki anaweza kubadilisha muda wowote.'
                    : 'Frontline staff operate from their assigned branch. Owner can reassign at any time.' }}
                </span>
              </div>

              <!-- Password -->
              <div class="form-group">
                <label>Login Password <span class="req">*</span> <span class="optional">(Min 8 chars, Upper, Lower, Number & Symbol)</span></label>
                <div class="input-with-action">
                  <input 
                    v-model="createForm.password" 
                    :type="showCreatePassword ? 'text' : 'password'" 
                    required 
                    minlength="6"
                    placeholder="Enter strong password..." 
                    class="form-input"
                  />
                  <button type="button" class="btn-toggle-eye" @click="showCreatePassword = !showCreatePassword">
                    <EyeOff v-if="showCreatePassword" :size="16" />
                    <Eye v-else :size="16" />
                  </button>
                </div>
              </div>

              <!-- Authorization PIN -->
              <div class="form-group">
                <label>4 to 6 Digit Numeric Authorization PIN <span class="optional">(Optional)</span></label>
                <input 
                  v-model="createForm.pin" 
                  type="password" 
                  maxlength="6" 
                  placeholder="e.g. 1234" 
                  class="form-input" 
                />
                <span class="field-hint">Used for fast in-person overrides (voids, discounts, credit approval).</span>
              </div>

              <!-- Drawer Footer Actions -->
              <div class="drawer-footer">
                <button type="button" class="btn-cancel" @click="showCreateDrawer = false">Cancel</button>
                <button type="submit" class="btn-submit" :disabled="createSubmitting">
                  <RefreshCw v-if="createSubmitting" :size="16" class="spin-anim" />
                  <UserPlus v-else :size="16" />
                  <span>{{ createSubmitting ? 'Registering...' : 'Create Staff Member' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </transition>

      <!-- Sub-Modal: Reassign Role & Business Unit -->
      <transition name="fade">
        <div v-if="showRoleModal" class="submodal-overlay" @click.self="showRoleModal = false">
          <div class="submodal-card">
            <div class="submodal-header">
              <div class="submodal-title-group">
                <Edit3 :size="18" class="text-purple" />
                <h4>Reassign Role & Unit</h4>
              </div>
              <button class="btn-close" @click="showRoleModal = false"><X :size="16" /></button>
            </div>
            <div class="submodal-body">
              <p class="target-user-info">
                Reassigning staff permissions for <strong>@{{ activeStaff?.username }}</strong>:
              </p>

              <div class="form-group">
                <label>New Role</label>
                <select v-model="editRoleForm.role" class="form-select">
                  <option v-for="r in roleOptions" :key="r.value" :value="r.value">
                    {{ r.label }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Assigned Business Unit</label>
                <select v-model="editRoleForm.business_unit" class="form-select">
                  <option value="">⚡ Global / None (Multi-unit)</option>
                  <option value="bar">🍷 Bar & Lounge</option>
                  <option value="stationery">📚 Stationery & Retail</option>
                </select>
              </div>

              <!-- Permanent Branch Assignment (Bar & Lounge) -->
              <div class="form-group" v-if="editRoleForm.business_unit === 'bar'">
                <label>
                  Permanent Branch Location <span class="req" v-if="editRoleForm.role === 'bartender'">*</span>
                </label>
                <select v-model="editRoleForm.branch" class="form-select" :required="editRoleForm.role === 'bartender'">
                  <option :value="null">-- Select Branch Location --</option>
                  <option v-for="b in store.branches" :key="b.id" :value="b.id">
                    📍 {{ b.name }} ({{ b.code }}) {{ b.is_active ? '' : '[Inactive]' }}
                  </option>
                </select>
                <span class="field-hint">Business Owner dynamically reassigns staff between branches at any time.</span>
              </div>
            </div>
            <div class="submodal-footer">
              <button class="btn-cancel" @click="showRoleModal = false">Cancel</button>
              <button class="btn-submit" :disabled="editRoleSubmitting" @click="handleUpdateRole">
                <RefreshCw v-if="editRoleSubmitting" :size="16" class="spin-anim" />
                <Check v-else :size="16" />
                <span>Save Role Assignment</span>
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- Sub-Modal: Set / Reset Authorization PIN -->
      <transition name="fade">
        <div v-if="showPinModal" class="submodal-overlay" @click.self="showPinModal = false">
          <div class="submodal-card">
            <div class="submodal-header">
              <div class="submodal-title-group">
                <Key :size="18" class="text-amber" />
                <h4>Set Authorization PIN</h4>
              </div>
              <button class="btn-close" @click="showPinModal = false"><X :size="16" /></button>
            </div>
            <div class="submodal-body">
              <p class="target-user-info">
                Assigning 4 to 6 digit security PIN for <strong>@{{ activeStaff?.username }}</strong>:
              </p>

              <div class="form-group">
                <label>New 4-6 Digit PIN</label>
                <input 
                  v-model="pinForm.pin" 
                  type="password" 
                  maxlength="6" 
                  placeholder="e.g. 5678" 
                  class="form-input text-center text-lg" 
                />
              </div>

              <div class="form-group">
                <label>Confirm PIN</label>
                <input 
                  v-model="pinForm.confirmPin" 
                  type="password" 
                  maxlength="6" 
                  placeholder="Re-enter PIN..." 
                  class="form-input text-center text-lg" 
                />
              </div>
            </div>
            <div class="submodal-footer">
              <button class="btn-cancel" @click="showPinModal = false">Cancel</button>
              <button class="btn-submit" :disabled="pinSubmitting" @click="handleSetPin">
                <RefreshCw v-if="pinSubmitting" :size="16" class="spin-anim" />
                <Key v-else :size="16" />
                <span>Update PIN</span>
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- Sub-Modal: Owner-Assisted Password Reset Token Dialog -->
      <transition name="fade">
        <div v-if="showResetTokenModal" class="submodal-overlay" @click.self="showResetTokenModal = false">
          <div class="submodal-card token-modal-card">
            <div class="submodal-header">
              <div class="submodal-title-group">
                <RotateCcw :size="18" class="text-amber" />
                <h4>Employee Password Reset Token</h4>
              </div>
              <button class="btn-close" @click="showResetTokenModal = false"><X :size="16" /></button>
            </div>
            <div class="submodal-body">
              <div v-if="resetTokenData.generating" class="token-loading-box">
                <RefreshCw :size="24" class="spin-anim text-amber" />
                <p>Generating secure single-use token for @{{ resetTokenData.username }}...</p>
              </div>
              <div v-else>
                <p class="target-user-info">
                  Owner-issued password reset token for <strong>@{{ resetTokenData.username }}</strong> ({{ resetTokenData.fullName }}):
                </p>

                <!-- Token Display Box -->
                <div class="token-code-card">
                  <div class="token-code-display">
                    <span class="token-label">RESET TOKEN:</span>
                    <span class="token-code-text">{{ resetTokenData.token }}</span>
                  </div>
                  <button class="btn-copy-token" @click="copyResetToken" :title="resetTokenData.copied ? 'Copied!' : 'Copy Token'">
                    <Check v-if="resetTokenData.copied" :size="16" class="text-emerald" />
                    <Copy v-else :size="16" />
                    <span>{{ resetTokenData.copied ? 'Copied!' : 'Copy Token' }}</span>
                  </button>
                </div>

                <div class="token-instructions">
                  <h6>Next Steps for Employee:</h6>
                  <ol>
                    <li>Give this token to <strong>@{{ resetTokenData.username }}</strong>.</li>
                    <li>On the Sign In page, the employee clicks <strong>Forgot Password?</strong>.</li>
                    <li>They choose the <strong>Owner Reset Token</strong> option.</li>
                    <li>They enter this token along with their new password to regain access.</li>
                  </ol>
                  <div class="token-warning">
                    <AlertTriangle :size="14" class="text-amber" />
                    <span>Valid for 24 hours. Token is single-use and invalidated immediately upon password change.</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="submodal-footer">
              <button class="btn-cancel" @click="showResetTokenModal = false">Done / Close</button>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 15, 29, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
  overflow-y: auto;
}

.modal-card {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  width: 100%;
  max-width: 1100px;
  height: 92vh;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  position: relative;
}

.modal-header {
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(17, 24, 39, 0.95);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(126, 34, 206, 0.4));
  border: 1px solid rgba(168, 85, 247, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c084fc;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #f9fafb;
}

.owner-badge {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.5);
  color: #d8b4fe;
}

.subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  color: #9ca3af;
}

.btn-close {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f3f4f6;
}

.modal-content {
  padding: 20px 24px 56px;
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 18px;
  flex: 1;
  min-height: 0;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  flex-shrink: 0;
}

.stat-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.75rem;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f9fafb;
  margin-top: 0.2rem;
}
.stat-value.active-val {
  color: #34d399;
}

.stat-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-icon-wrap.purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.stat-icon-wrap.green { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.stat-icon-wrap.amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.stat-icon-wrap.cyan { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 240px;
  display: flex;
  align-items: center;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.04);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.search-box:focus-within {
  border-color: #4f46e5 !important;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #64748b;
  pointer-events: none;
}

.search-input {
  width: 100%;
  background: transparent;
  border: none;
  border-radius: 10px;
  padding: 9px 34px 9px 38px;
  color: #f3f4f6;
  font-size: 0.86rem;
  outline: none;
}

.clear-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-dropdown-wrap {
  position: relative;
}

.filter-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 0.83rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.24);
  color: #e2e8f0;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.filter-trigger:hover {
  border-color: #6366f1;
}

.filter-trigger.open,
.filter-trigger.active {
  border-color: #4f46e5;
  background: rgba(79, 70, 229, 0.14);
  color: #a5b4fc;
}

.modal-overlay[data-theme="light"] .filter-trigger {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #1e293b;
}

.modal-overlay[data-theme="light"] .filter-trigger:hover {
  background: #ffffff;
  border-color: #4f46e5;
}

.modal-overlay[data-theme="light"] .filter-trigger.open,
.modal-overlay[data-theme="light"] .filter-trigger.active {
  background: #eef2ff;
  border-color: #4f46e5;
  color: #4f46e5;
}

.f-icon {
  color: #64748b;
  flex-shrink: 0;
}

.filter-trigger.active .f-icon,
.filter-trigger.open .f-icon {
  color: currentColor;
}

.filter-menu {
  --dr-menu-bg: #0f172a;
  --dr-menu-hover: rgba(255, 255, 255, 0.06);
  --dr-border-strong: rgba(148, 163, 184, 0.28);
  --dr-text: #f8fafc;
  --dr-accent: #6366f1;
  --dr-accent-soft: rgba(99, 102, 241, 0.16);
  min-width: 200px;
}

.modal-overlay[data-theme="light"] .filter-menu {
  --dr-menu-bg: #ffffff;
  --dr-menu-hover: #f8fafc;
  --dr-border-strong: #cbd5e1;
  --dr-text: #0f172a;
  --dr-accent: #4f46e5;
  --dr-accent-soft: #eef2ff;
}

.filter-menu-right {
  left: auto;
  right: 0;
}

.btn-refresh {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.55rem;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-refresh:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f3f4f6;
}

.btn-add-staff {
  background: linear-gradient(135deg, #9333ea, #7e22ce);
  border: 1px solid rgba(168, 85, 247, 0.5);
  color: #fff;
  border-radius: 8px;
  padding: 0.55rem 1.1rem;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
}
.btn-add-staff:hover {
  background: linear-gradient(135deg, #a855f7, #9333ea);
  transform: translateY(-1px);
}

/* Staff Table */
.table-container {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  background: rgba(0, 0, 0, 0.2);
  overscroll-behavior: contain;
  scroll-behavior: smooth;
}

.staff-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.staff-table th {
  position: sticky;
  top: 0;
  z-index: 5;
  background: #111827;
  padding: 0.85rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.staff-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 0.85rem;
  color: #e5e7eb;
}

.row-inactive {
  opacity: 0.55;
  background: rgba(239, 68, 68, 0.02);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
}
.avatar-owner {
  background: linear-gradient(135deg, #a855f7, #6b21a8);
  color: #ffffff;
  border: 2px solid #d8b4fe;
}
.avatar-staff {
  background: #374151;
  color: #d1d5db;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.user-fullname {
  font-weight: 600;
  color: #f9fafb;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.crown-tag {
  font-size: 0.7rem;
  background: rgba(234, 179, 8, 0.15);
  color: #facc15;
  border: 1px solid rgba(234, 179, 8, 0.3);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.user-subtext {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* Role Badges */
.role-pill {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}
.role-owner { background: rgba(168, 85, 247, 0.2); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.4); }
.role-bar-mgr { background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.4); }
.role-bartender { background: rgba(217, 119, 6, 0.15); color: #fbbf24; border: 1px solid rgba(217, 119, 6, 0.3); }
.role-stat-mgr { background: rgba(6, 182, 212, 0.2); color: #67e8f9; border: 1px solid rgba(6, 182, 212, 0.4); }
.role-stat-cashier { background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.3); }
.role-clerk { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); }
.role-default { background: #374151; color: #d1d5db; }

/* Unit Cell */
.unit-cell {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
}
.text-amber { color: #f59e0b; }
.text-cyan { color: #06b6d4; }
.text-purple { color: #c084fc; }

/* Branch Cell */
.branch-cell {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
}
.branch-name {
  font-weight: 600;
  color: #f1f5f9;
}
.branch-code {
  font-family: monospace;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}
.branch-all {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}
.branch-na {
  font-size: 0.72rem;
  color: #64748b;
}
.branch-unassigned {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
}

/* PIN Badges */
.badge-pin-yes {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #34d399;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-pin-no {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #6b7280;
  font-size: 0.75rem;
}

/* Status Pill */
.status-pill {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 600;
}
.status-active { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.status-suspended { background: rgba(239, 68, 68, 0.15); color: #f87171; }

/* Actions Group */
.actions-group {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-action {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  color: #d1d5db;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.15s;
}
.btn-action:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.btn-action.edit:hover { border-color: #a855f7; color: #d8b4fe; }
.btn-action.pin:hover { border-color: #f59e0b; color: #fbbf24; }
.btn-action.token:hover { border-color: #f59e0b; color: #fbbf24; background: rgba(245, 158, 11, 0.1); }
.btn-action.suspend:hover { border-color: #ef4444; color: #f87171; background: rgba(239, 68, 68, 0.1); }
.btn-action.activate:hover { border-color: #10b981; color: #34d399; background: rgba(16, 185, 129, 0.1); }

/* Light Mode High-Contrast Table Cells, Badges & Action Buttons */
.modal-overlay[data-theme="light"] .user-fullname {
  color: #0f172a;
}

.modal-overlay[data-theme="light"] .user-subtext {
  color: #475569;
}

.modal-overlay[data-theme="light"] .crown-tag {
  background: #fef3c7;
  color: #b45309;
  border-color: #fcd34d;
  font-weight: 700;
}

.modal-overlay[data-theme="light"] .role-owner {
  background: #f3e8ff;
  color: #6b21a8;
  border-color: #d8b4fe;
}

.modal-overlay[data-theme="light"] .role-bar-mgr {
  background: #fef3c7;
  color: #92400e;
  border-color: #fcd34d;
}

.modal-overlay[data-theme="light"] .role-bartender {
  background: #ffedd5;
  color: #9a3412;
  border-color: #fdba74;
}

.modal-overlay[data-theme="light"] .role-stat-mgr {
  background: #e0f2fe;
  color: #075985;
  border-color: #7dd3fc;
}

.modal-overlay[data-theme="light"] .role-stat-cashier {
  background: #e0f2fe;
  color: #0369a1;
  border-color: #bae6fd;
}

.modal-overlay[data-theme="light"] .role-clerk {
  background: #eef2ff;
  color: #3730a3;
  border-color: #c7d2fe;
}

.modal-overlay[data-theme="light"] .branch-name {
  color: #0f172a;
  font-weight: 600;
}

.modal-overlay[data-theme="light"] .branch-code {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.modal-overlay[data-theme="light"] .branch-all {
  background: #f3e8ff;
  color: #6b21a8;
}

.modal-overlay[data-theme="light"] .branch-unassigned {
  background: #fef2f2;
  color: #b91c1c;
}

.modal-overlay[data-theme="light"] .badge-pin-yes {
  color: #047857;
}

.modal-overlay[data-theme="light"] .badge-pin-no {
  color: #475569;
}

.modal-overlay[data-theme="light"] .status-active {
  background: #ecfdf5;
  color: #047857;
}

.modal-overlay[data-theme="light"] .status-suspended {
  background: #fef2f2;
  color: #b91c1c;
}

.modal-overlay[data-theme="light"] .btn-action {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #1e293b;
  font-weight: 600;
}

.modal-overlay[data-theme="light"] .btn-action:hover {
  background: #eef2ff;
  border-color: #4f46e5;
  color: #4f46e5;
}

.modal-overlay[data-theme="light"] .btn-action.pin:hover,
.modal-overlay[data-theme="light"] .btn-action.token:hover {
  background: #fffbeb;
  border-color: #d97706;
  color: #b45309;
}

.modal-overlay[data-theme="light"] .btn-action.suspend:hover {
  background: #fef2f2;
  border-color: #dc2626;
  color: #b91c1c;
}

.modal-overlay[data-theme="light"] .btn-action.activate:hover {
  background: #ecfdf5;
  border-color: #059669;
  color: #047857;
}

.loading-td, .empty-td {
  padding: 3rem !important;
  text-align: center;
  color: #9ca3af;
}
.loading-td {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}
.empty-icon {
  margin: 0 auto 0.5rem;
  opacity: 0.3;
}

/* Slide Drawer */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
  z-index: 2100;
}

.drawer-card {
  --dr-bg: #111827;
  --dr-surface: #1e293b;
  --dr-border: rgba(148, 163, 184, 0.18);
  --dr-border-strong: rgba(148, 163, 184, 0.3);
  --dr-text: #f8fafc;
  --dr-text-sec: #cbd5e1;
  --dr-text-muted: #94a3b8;
  --dr-accent: #6366f1;
  --dr-accent-soft: rgba(99, 102, 241, 0.16);
  --dr-menu-bg: #0f172a;
  --dr-menu-hover: rgba(255, 255, 255, 0.06);

  width: 500px;
  max-width: 100vw;
  height: 100%;
  background: var(--dr-bg);
  border-left: 1px solid var(--dr-border);
  display: flex;
  flex-direction: column;
  box-shadow: -12px 0 36px rgba(0, 0, 0, 0.45);
  box-sizing: border-box;
}

.modal-overlay[data-theme="light"] .drawer-card {
  --dr-bg: #ffffff;
  --dr-surface: #f8fafc;
  --dr-border: #e2e8f0;
  --dr-border-strong: #cbd5e1;
  --dr-text: #0f172a;
  --dr-text-sec: #334155;
  --dr-text-muted: #64748b;
  --dr-accent: #4f46e5;
  --dr-accent-soft: #eef2ff;
  --dr-menu-bg: #ffffff;
  --dr-menu-hover: #f8fafc;
  box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14);
}

.drawer-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--dr-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.drawer-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.drawer-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--dr-accent-soft);
  color: var(--dr-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.drawer-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--dr-text);
}

.drawer-sub {
  margin: 3px 0 0;
  font-size: 0.78rem;
  color: var(--dr-text-muted);
}

.btn-close-drawer {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--dr-border);
  background: var(--dr-surface);
  color: var(--dr-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.btn-close-drawer:hover {
  color: var(--dr-text);
  border-color: var(--dr-border-strong);
}

.drawer-body {
  padding: 22px 24px 28px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  box-sizing: border-box;
}

.form-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.form-group label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--dr-text-sec);
}

.req { color: #ef4444; }
.optional { font-size: 0.72rem; color: var(--dr-text-muted); font-weight: 500; }

.form-input, .form-select {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  background: var(--dr-surface);
  border: 1px solid var(--dr-border-strong);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--dr-text);
  font-size: 0.86rem;
  outline: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.form-input:focus, .form-select:focus {
  border-color: var(--dr-accent);
  box-shadow: 0 0 0 3px var(--dr-accent-soft);
}

/* Custom Attractive Dropdowns inside Drawer */
.custom-select-wrap {
  position: relative;
  width: 100%;
}

.custom-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--dr-surface);
  border: 1px solid var(--dr-border-strong);
  color: var(--dr-text);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: all 0.16s ease;
}

.custom-select-trigger:hover {
  border-color: var(--dr-accent);
}

.custom-select-trigger.open {
  border-color: var(--dr-accent);
  box-shadow: 0 0 0 3px var(--dr-accent-soft);
}

.trigger-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.trigger-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sel-icon { flex-shrink: 0; }
.sel-icon.accent { color: var(--dr-accent); }
.sel-icon.amber { color: #d97706; }
.sel-icon.emerald { color: #059669; }

.trigger-chevron {
  flex-shrink: 0;
  color: var(--dr-text-muted);
  transition: transform 0.18s ease;
}

.trigger-chevron.rotated {
  transform: rotate(180deg);
  color: var(--dr-accent);
}

.custom-select-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  min-width: 220px;
  max-height: 280px;
  overflow-y: auto;
  z-index: 60;
  background: var(--dr-menu-bg);
  border: 1px solid var(--dr-border-strong);
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.22);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.custom-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--dr-text);
  cursor: pointer;
  text-align: left;
  transition: all 0.14s ease;
}

.custom-option:hover {
  background: var(--dr-menu-hover);
}

.custom-option.selected {
  background: var(--dr-accent-soft);
  border-color: rgba(79, 70, 229, 0.28);
}

.opt-icon-box {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.opt-icon-box.opt-stat { background: rgba(79, 70, 229, 0.14); color: #4f46e5; }
.opt-icon-box.opt-bar { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.opt-icon-box.opt-owner { background: rgba(139, 92, 246, 0.15); color: #7c3aed; }
.opt-icon-box.opt-branch { background: rgba(16, 185, 129, 0.14); color: #059669; }

.opt-text-col {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.opt-title {
  font-size: 0.83rem;
  font-weight: 700;
  color: var(--dr-text);
}

.opt-desc {
  font-size: 0.71rem;
  color: var(--dr-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.opt-check {
  color: var(--dr-accent);
  flex-shrink: 0;
}

.dd-pop-enter-active,
.dd-pop-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.dd-pop-enter-from,
.dd-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

/* Responsive Table & Mobile Staff Cards */
.staff-table-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.staff-table {
  min-width: 820px;
}

.staff-mobile-cards {
  display: none;
  flex-direction: column;
  gap: 12px;
}

.staff-m-card {
  background: var(--bg-card, #111827);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-overlay[data-theme="light"] .staff-m-card {
  background: #ffffff;
  border-color: #e2e8f0;
}

.staff-m-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.staff-m-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.m-meta-chip {
  font-size: 0.74rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  color: #64748b;
}

.staff-m-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.mobile-empty-card {
  text-align: center;
  padding: 36px 20px;
  border-radius: 14px;
  border: 1px dashed rgba(148, 163, 184, 0.3);
  color: #64748b;
}

@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .modal-content {
    padding: 14px 14px 48px;
  }
  .staff-table-desktop {
    display: none;
  }
  .staff-mobile-cards {
    display: flex;
  }
  .filters {
    width: 100%;
    flex-wrap: wrap;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}

.input-with-action {
  position: relative;
  display: flex;
  align-items: center;
}
.input-with-action .form-input {
  width: 100%;
  padding-right: 2.5rem;
}
.btn-toggle-eye {
  position: absolute;
  right: 0.75rem;
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
}

.field-hint {
  font-size: 0.72rem;
  color: #6b7280;
  margin-top: 0.15rem;
}

.drawer-footer {
  margin-top: auto;
  padding-top: 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #9ca3af;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-cancel:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

.btn-submit {
  background: #4f46e5;
  border: 1px solid #4f46e5;
  color: #fff;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 0.85rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 0.16s ease;
}
.btn-submit:hover:not(:disabled) {
  background: #4338ca;
}
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Sub-modals */
.submodal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.submodal-card {
  width: 100%;
  max-width: 420px;
  background: #182234;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.submodal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.submodal-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.submodal-title-group h4 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #f9fafb;
}

.target-user-info {
  margin: 0 0 0.85rem;
  font-size: 0.85rem;
  color: #9ca3af;
}
.target-user-info strong {
  color: #c084fc;
}

.submodal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.text-center { text-align: center; }
.text-lg { font-size: 1.2rem !important; letter-spacing: 0.25em; }

/* Transitions */
.spin-anim {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.drawer-slide-enter-active, .drawer-slide-leave-active {
  transition: opacity 0.25s ease;
}
.drawer-slide-enter-from, .drawer-slide-leave-to {
  opacity: 0;
}
.drawer-slide-enter-active .drawer-card, .drawer-slide-leave-active .drawer-card {
  transition: transform 0.25s ease;
}
.drawer-slide-enter-from .drawer-card, .drawer-slide-leave-to .drawer-card {
  transform: translateX(100%);
}

.token-modal-card {
  max-width: 500px;
}

.token-code-card {
  margin: 16px 0;
  padding: 16px 20px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px dashed rgba(245, 158, 11, 0.4);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.token-code-display {
  display: flex;
  flex-direction: column;
}

.token-label {
  font-size: 0.7rem;
  color: #fbbf24;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.token-code-text {
  font-size: 1.4rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 2px;
  font-family: monospace;
}

.btn-copy-token {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fbbf24;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy-token:hover {
  background: rgba(245, 158, 11, 0.3);
  color: #ffffff;
}

.token-instructions {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 14px 16px;
  margin-top: 12px;
}

.token-instructions h6 {
  font-size: 0.8rem;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 8px;
}

.token-instructions ol {
  padding-left: 20px;
  font-size: 0.78rem;
  color: #94a3b8;
  line-height: 1.6;
}

.token-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.72rem;
  color: #fbbf24;
}

.token-loading-box {
  padding: 30px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #cbd5e1;
}

/* Responsive Viewports */
@media (max-width: 900px) {
  .modal-card {
    max-height: 96vh;
    border-radius: 12px;
  }
  .modal-header {
    padding: 1rem 1.25rem;
  }
  .modal-content {
    padding: 1.25rem;
    gap: 1rem;
  }
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  .filters {
    flex-wrap: wrap;
    justify-content: space-between;
  }
  .table-container {
    max-height: 48vh;
  }
  .drawer-panel {
    max-width: 100%;
    width: 100%;
  }
}

@media (max-width: 600px) {
  .modal-overlay {
    padding: 8px;
  }
  .modal-content {
    padding: 0.85rem;
  }
  .stats-row {
    grid-template-columns: 1fr;
  }
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-item, .select-filter, .btn-add-staff {
    width: 100%;
  }
  .table-container {
    max-height: 42vh;
  }
}

/* Light Mode Overrides */
:root[data-theme="light"] .modal-card {
  background: #ffffff;
  border-color: #e2e8f0;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
}

:root[data-theme="light"] .modal-header {
  background: #f8fafc;
  border-bottom-color: #e2e8f0;
}

:root[data-theme="light"] .title {
  color: #0f172a;
}

:root[data-theme="light"] .stat-card {
  background: #f8fafc;
  border-color: #e2e8f0;
}

:root[data-theme="light"] .stat-value {
  color: #0f172a;
}

:root[data-theme="light"] .table-container {
  background: #f8fafc;
  border-color: #e2e8f0;
}

:root[data-theme="light"] .staff-table th {
  background: #f1f5f9;
  color: #475569;
  border-bottom-color: #e2e8f0;
}

:root[data-theme="light"] .staff-table td {
  border-bottom-color: #f1f5f9;
}

:root[data-theme="light"] .user-fullname {
  color: #0f172a;
}

:root[data-theme="light"] .drawer-panel {
  background: #ffffff;
}

:root[data-theme="light"] .drawer-header {
  background: #f8fafc;
  border-bottom-color: #e2e8f0;
}

:root[data-theme="light"] .drawer-title {
  color: #0f172a;
}

:root[data-theme="light"] .form-input,
:root[data-theme="light"] .form-select {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}

:root[data-theme="light"] .submodal-card {
  background: #ffffff;
  border-color: #e2e8f0;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

:root[data-theme="light"] .submodal-title-group h4 {
  color: #0f172a;
}
</style>
