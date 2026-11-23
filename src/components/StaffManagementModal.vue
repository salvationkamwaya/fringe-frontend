<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import api from '../api'
import {
  Users, UserPlus, Shield, Key, Lock, CheckCircle2,
  XCircle, AlertTriangle, Edit3, RefreshCw, Eye, EyeOff,
  Search, Filter, X, Wine, BookOpen, Layers, Check,
  RotateCcw, Copy, MapPin
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

// Role configurations & metadata
const roleOptions = [
  { value: 'owner', label: 'Business Owner', unit: null, badgeClass: 'role-owner' },
  { value: 'bar_manager', label: 'Bar Manager', unit: 'bar', badgeClass: 'role-bar-mgr' },
  { value: 'bartender', label: 'Bartender / Cashier', unit: 'bar', badgeClass: 'role-bartender' },
  { value: 'stationery_manager', label: 'Stationery Manager', unit: 'stationery', badgeClass: 'role-stat-mgr' },
  { value: 'stationery_cashier', label: 'Stationery Cashier', unit: 'stationery', badgeClass: 'role-stat-cashier' },
  { value: 'stock_clerk', label: 'Stock Clerk', unit: 'stationery', badgeClass: 'role-clerk' },
]

const unitOptions = [
  { value: 'bar', label: '🍷 Bar & Lounge' },
  { value: 'stationery', label: '📚 Stationery & Retail' },
]

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

// Auto-align unit when selecting role in creation
const onRoleChange = () => {
  if (createForm.value.role === 'bar_manager' || createForm.value.role === 'bartender') {
    createForm.value.business_unit = 'bar'
    if (!createForm.value.branch && store.branches.length > 0) {
      createForm.value.branch = (store.activeBranchId && store.activeBranchId !== 'all')
        ? parseInt(store.activeBranchId, 10)
        : store.branches[0].id
    }
  } else if (createForm.value.role === 'stationery_manager' || createForm.value.role === 'stationery_cashier') {
    createForm.value.business_unit = 'stationery'
    createForm.value.branch = null
  } else {
    createForm.value.branch = null
  }
}

// Open creation form
const openCreateDrawer = () => {
  const defaultBranch = (store.activeBranchId && store.activeBranchId !== 'all')
    ? parseInt(store.activeBranchId, 10)
    : (store.branches[0]?.id || null)

  createForm.value = {
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'bartender',
    business_unit: 'bar',
    branch: defaultBranch,
    password: '',
    pin: ''
  }
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
      business_unit: createForm.value.business_unit || null,
      branch: createForm.value.business_unit === 'bar' ? createForm.value.branch : null,
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
  <div class="modal-overlay" @click.self="$emit('close')">
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
        <div class="toolbar">
          <div class="search-box">
            <Search :size="16" class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              :placeholder="t('staff.searchPlaceholder')"
              class="search-input"
            />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
              <X :size="14" />
            </button>
          </div>

          <div class="filters">
            <div class="filter-item">
              <Filter :size="14" />
              <select v-model="filterUnit" class="select-filter">
                <option value="all">{{ t('staff.allUnits') }}</option>
                <option value="bar">🍷 Bar & Lounge</option>
                <option value="stationery">📚 Stationery Shop</option>
                <option value="global">⚡ Global / Owner</option>
              </select>
            </div>

            <div class="filter-item">
              <select v-model="filterRole" class="select-filter">
                <option value="all">{{ t('staff.allRoles') }}</option>
                <option v-for="role in roleOptions" :key="role.value" :value="role.value">
                  {{ role.label }}
                </option>
              </select>
            </div>

            <div class="filter-item" v-if="store.branches.length">
              <select v-model="filterBranch" class="select-filter">
                <option value="all">{{ t('staff.allBranches') }}</option>
                <option v-for="b in store.branches" :key="b.id" :value="String(b.id)">
                  {{ b.name }}
                </option>
              </select>
            </div>

            <button class="btn-refresh" @click="fetchUsers" :title="t('common.refresh')">
              <RefreshCw :size="16" :class="{ 'spin-anim': loading }" />
            </button>

            <button class="btn-add-staff" @click="openCreateDrawer">
              <UserPlus :size="16" />
              <span>{{ t('staff.registerNew') }}</span>
            </button>
          </div>
        </div>

        <!-- Staff List Table -->
        <div class="table-container">
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
                  <span>Loading staff records from secure ledger...</span>
                </td>
              </tr>
              <tr v-else-if="filteredUsers.length === 0">
                <td colspan="7" class="empty-td">
                  <Users :size="32" class="empty-icon" />
                  <p>No staff records found matching your filters.</p>
                </td>
              </tr>
              <tr v-for="user in filteredUsers" :key="user.id" :class="{ 'row-inactive': !user.is_active }">
                <!-- Staff Name & Username -->
                <td>
                  <div class="user-cell">
                    <div class="user-avatar" :class="user.role === 'owner' ? 'avatar-owner' : 'avatar-staff'">
                      <span>{{ (user.first_name?.[0] || user.username?.[0] || 'U').toUpperCase() }}</span>
                    </div>
                    <div class="user-name-col">
                      <div class="user-fullname">
                        {{ user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username }}
                        <span v-if="user.role === 'owner'" class="crown-tag">👑 Business Owner</span>
                      </div>
                      <div class="user-subtext">@{{ user.username }} &bull; {{ user.email || 'No email' }}</div>
                    </div>
                  </div>
                </td>

                <!-- Role Badge -->
                <td>
                  <span class="role-pill" :class="getRoleBadgeClass(user.role)">
                    {{ user.role_display }}
                  </span>
                </td>

                <!-- Business Unit -->
                <td>
                  <div class="unit-cell">
                    <Wine v-if="user.business_unit === 'bar'" :size="14" class="text-amber" />
                    <BookOpen v-else-if="user.business_unit === 'stationery'" :size="14" class="text-cyan" />
                    <Layers v-else :size="14" class="text-purple" />
                    <span>{{ user.business_unit_name || 'Global (Cross-Unit)' }}</span>
                  </div>
                </td>

                <!-- Assigned Branch -->
                <td>
                  <div v-if="user.branch_name" class="branch-cell">
                    <MapPin :size="13" class="text-emerald" />
                    <span class="branch-name">{{ user.branch_name }}</span>
                    <span v-if="user.branch_code" class="branch-code">({{ user.branch_code }})</span>
                  </div>
                  <span v-else-if="user.role === 'owner'" class="branch-all">All Locations</span>
                  <span v-else-if="user.business_unit === 'stationery'" class="branch-na">N/A</span>
                  <span v-else class="branch-unassigned">Unassigned</span>
                </td>

                <!-- PIN Status -->
                <td>
                  <span v-if="user.has_pin" class="badge-pin-yes">
                    <CheckCircle2 :size="14" />
                    <span>PIN Active</span>
                  </span>
                  <span v-else class="badge-pin-no">
                    <Lock :size="14" />
                    <span>Not Set</span>
                  </span>
                </td>

                <!-- Status -->
                <td>
                  <span class="status-pill" :class="user.is_active ? 'status-active' : 'status-suspended'">
                    {{ user.is_active ? 'Active' : 'Suspended' }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="text-right">
                  <div class="actions-group">
                    <!-- Edit Role & Unit -->
                    <button 
                      class="btn-action edit" 
                      @click="openRoleModal(user)"
                      title="Reassign Role or Business Unit"
                    >
                      <Edit3 :size="14" />
                      <span>Role</span>
                    </button>

                    <!-- Set/Change PIN -->
                    <button 
                      class="btn-action pin" 
                      @click="openPinModal(user)"
                      title="Set or Reset Authorization PIN"
                    >
                      <Key :size="14" />
                      <span>PIN</span>
                    </button>

                    <!-- Owner-Assisted Reset Token -->
                    <button 
                      v-if="user.role !== 'owner'"
                      class="btn-action token" 
                      @click="handleGenerateResetToken(user)"
                      title="Generate temporary Owner Reset Token for employee password recovery"
                    >
                      <RotateCcw :size="14" />
                      <span>Token</span>
                    </button>

                    <!-- Toggle Status -->
                    <button 
                      v-if="user.role !== 'owner'"
                      class="btn-action" 
                      :class="user.is_active ? 'suspend' : 'activate'"
                      @click="handleToggleActive(user)"
                      :title="user.is_active ? 'Suspend Account' : 'Reactivate Account'"
                    >
                      <XCircle v-if="user.is_active" :size="14" />
                      <CheckCircle2 v-else :size="14" />
                      <span>{{ user.is_active ? 'Suspend' : 'Activate' }}</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Slide-over Drawer: Register New Staff -->
      <transition name="drawer-slide">
        <div v-if="showCreateDrawer" class="drawer-overlay" @click.self="showCreateDrawer = false">
          <div class="drawer-card">
            <div class="drawer-header">
              <div class="drawer-title-group">
                <UserPlus :size="20" class="drawer-icon" />
                <div>
                  <h4 class="drawer-title">Register New Staff Account</h4>
                  <p class="drawer-sub">Business Owner Authorization: Assign role, credentials, and business unit.</p>
                </div>
              </div>
              <button class="btn-close" @click="showCreateDrawer = false"><X :size="18" /></button>
            </div>

            <form class="drawer-body" @submit.prevent="handleCreateStaff">
              <!-- Name Fields -->
              <div class="form-row">
                <div class="form-group">
                  <label>First Name</label>
                  <input v-model="createForm.first_name" type="text" placeholder="e.g. John" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Last Name</label>
                  <input v-model="createForm.last_name" type="text" placeholder="e.g. Banda" class="form-input" />
                </div>
              </div>

              <!-- Username & Email -->
              <div class="form-row">
                <div class="form-group">
                  <label>Username <span class="req">*</span></label>
                  <input v-model="createForm.username" type="text" required placeholder="e.g. jbanda" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Email Address</label>
                  <input v-model="createForm.email" type="email" placeholder="e.g. john@fringe.local" class="form-input" />
                </div>
              </div>

              <!-- Role & Business Unit -->
              <div class="form-row">
                <div class="form-group">
                  <label>Assigned Role <span class="req">*</span></label>
                  <select v-model="createForm.role" class="form-select" @change="onRoleChange">
                    <option v-for="r in roleOptions" :key="r.value" :value="r.value">
                      {{ r.label }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Assigned Business Unit <span class="req">*</span></label>
                  <select v-model="createForm.business_unit" class="form-select">
                    <option value="bar">🍷 Bar & Lounge</option>
                    <option value="stationery">📚 Stationery & Retail</option>
                  </select>
                </div>
              </div>

              <!-- Permanent Branch Assignment (Bar & Lounge) -->
              <div class="form-group" v-if="createForm.business_unit === 'bar'">
                <label>
                  Permanent Branch Location <span class="req" v-if="createForm.role === 'bartender'">*</span>
                </label>
                <select v-model="createForm.branch" class="form-select" :required="createForm.role === 'bartender'">
                  <option :value="null">-- Select Branch Location --</option>
                  <option v-for="b in store.branches" :key="b.id" :value="b.id">
                    📍 {{ b.name }} ({{ b.code }}) {{ b.is_active ? '' : '[Inactive]' }}
                  </option>
                </select>
                <span class="field-hint">Frontline staff operate permanently from a single branch (no roaming). Owner can dynamically reassign when needed.</span>
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
  padding: 1.25rem 1.75rem 1.5rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  flex-shrink: 0;
}

.stat-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  gap: 1rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 260px;
}
.search-icon {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
}
.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.6rem 2.2rem 0.6rem 2.4rem;
  color: #f3f4f6;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus {
  border-color: #a855f7;
}
.clear-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
}

.filters {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  color: #9ca3af;
}

.select-filter {
  background: transparent;
  border: none;
  color: #f3f4f6;
  font-size: 0.82rem;
  outline: none;
  cursor: pointer;
}
.select-filter option {
  background: #1f2937;
  color: #f9fafb;
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
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
  z-index: 50;
}

.drawer-card {
  width: 480px;
  height: 100%;
  background: #131c2e;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
}

.drawer-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-title-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.drawer-icon {
  color: #c084fc;
}

.drawer-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #f9fafb;
}

.drawer-sub {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  color: #9ca3af;
}

.drawer-body {
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  flex: 1;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #d1d5db;
}

.req { color: #f87171; }
.optional { font-size: 0.72rem; color: #9ca3af; font-weight: normal; }

.form-input, .form-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  color: #f9fafb;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus, .form-select:focus {
  border-color: #a855f7;
}
.form-select option {
  background: #1f2937;
  color: #fff;
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
  background: linear-gradient(135deg, #9333ea, #7e22ce);
  border: 1px solid rgba(168, 85, 247, 0.5);
  color: #fff;
  border-radius: 8px;
  padding: 0.6rem 1.3rem;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
}
.btn-submit:hover:not(:disabled) {
  background: linear-gradient(135deg, #a855f7, #9333ea);
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
