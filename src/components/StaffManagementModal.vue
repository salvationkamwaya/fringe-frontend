<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import {
  Users, UserPlus, Shield, Key, Lock, CheckCircle2,
  XCircle, AlertTriangle, Edit3, RefreshCw, Eye, EyeOff,
  Search, Filter, X, Wine, BookOpen, Layers, Check
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const users = ref([])
const loading = ref(true)
const searchQuery = ref('')
const filterUnit = ref('all')
const filterRole = ref('all')

// Modals / Drawers state
const showCreateDrawer = ref(false)
const showRoleModal = ref(false)
const showPinModal = ref(false)
const activeStaff = ref(null)

// Create Form Data
const createForm = ref({
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  role: 'bartender',
  business_unit: 'bar',
  password: '',
  pin: ''
})
const showCreatePassword = ref(false)
const createSubmitting = ref(false)

// Edit Role Form
const editRoleForm = ref({
  role: '',
  business_unit: ''
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
  { value: 'owner', label: 'Owner (Dr. Mitu)', unit: null, badgeClass: 'role-owner' },
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

    return matchesSearch && matchesUnit && matchesRole
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
  } else if (createForm.value.role === 'stationery_manager' || createForm.value.role === 'stationery_cashier') {
    createForm.value.business_unit = 'stationery'
  }
}

// Open creation form
const openCreateDrawer = () => {
  createForm.value = {
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'bartender',
    business_unit: 'bar',
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
  if (!createForm.value.password || createForm.value.password.length < 6) {
    store.showToast('Password must be at least 6 characters.', 'warning')
    return
  }
  if (createForm.value.pin) {
    if (!/^\d{4,6}$/.test(createForm.value.pin)) {
      store.showToast('PIN must be 4 to 6 numeric digits.', 'warning')
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
    business_unit: staff.business_unit || ''
  }
  showRoleModal.value = true
}

// Submit Role & Unit change
const handleUpdateRole = async () => {
  if (!activeStaff.value) return
  editRoleSubmitting.value = true
  try {
    const payload = {
      role: editRoleForm.value.role,
      business_unit: editRoleForm.value.business_unit || null
    }
    const res = await api.patch(`/core/users/${activeStaff.value.id}/`, payload)
    store.showToast(`Role updated for @${res.data.username} to ${res.data.role_display}.`, 'success')
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
  if (!confirm(`Are you sure you want to ${actionText} the account for ${staff.first_name || staff.username}?`)) {
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

onMounted(() => {
  fetchUsers()
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
              <h3 class="title">Staff & Role Administration</h3>
              <span class="owner-badge">EXCLUSIVE TO OWNER</span>
            </div>
            <p class="subtitle">
              Strict RBAC: Create staff, assign roles, configure authorization PINs, and enforce tenant isolation.
            </p>
          </div>
        </div>
        <button class="btn-close" @click="$emit('close')" title="Close Window">
          <X :size="20" />
        </button>
      </div>

      <!-- Unauthorized Guard (Defense in depth) -->
      <div v-if="!store.isOwner" class="denied-box">
        <AlertTriangle :size="32" class="denied-icon" />
        <h4>Access Restricted: Business Owner Privilege Required</h4>
        <p>Only Dr. Mitu (Business Owner) has permission to manage staff accounts and assign roles.</p>
        <button class="btn-primary" @click="$emit('close')">Return to POS</button>
      </div>

      <div v-else class="modal-content">
        <!-- Top Stats Row -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">Total Staff</span>
              <span class="stat-value">{{ stats.total }}</span>
            </div>
            <div class="stat-icon-wrap purple"><Users :size="22" /></div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">Active Accounts</span>
              <span class="stat-value active-val">{{ stats.active }}</span>
            </div>
            <div class="stat-icon-wrap green"><CheckCircle2 :size="22" /></div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">Bar & Lounge Staff</span>
              <span class="stat-value">{{ stats.bar }}</span>
            </div>
            <div class="stat-icon-wrap amber"><Wine :size="22" /></div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">Stationery Staff</span>
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
              placeholder="Search by name, username, or email..."
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
                <option value="all">All Units</option>
                <option value="bar">🍷 Bar & Lounge</option>
                <option value="stationery">📚 Stationery Shop</option>
                <option value="global">⚡ Global / Owner</option>
              </select>
            </div>

            <div class="filter-item">
              <select v-model="filterRole" class="select-filter">
                <option value="all">All Roles</option>
                <option v-for="role in roleOptions" :key="role.value" :value="role.value">
                  {{ role.label }}
                </option>
              </select>
            </div>

            <button class="btn-refresh" @click="fetchUsers" title="Refresh List">
              <RefreshCw :size="16" :class="{ 'spin-anim': loading }" />
            </button>

            <button class="btn-add-staff" @click="openCreateDrawer">
              <UserPlus :size="16" />
              <span>Register New Staff</span>
            </button>
          </div>
        </div>

        <!-- Staff List Table -->
        <div class="table-container">
          <table class="staff-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Assigned Role</th>
                <th>Business Unit</th>
                <th>Auth PIN</th>
                <th>Account Status</th>
                <th class="text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading && users.length === 0">
                <td colspan="6" class="loading-td">
                  <RefreshCw :size="20" class="spin-anim" />
                  <span>Loading staff records from secure ledger...</span>
                </td>
              </tr>
              <tr v-else-if="filteredUsers.length === 0">
                <td colspan="6" class="empty-td">
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
                        <span v-if="user.role === 'owner'" class="crown-tag">👑 Owner</span>
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
                  <p class="drawer-sub">Owner Authorization: Assign role, credentials, and business unit.</p>
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

              <!-- Password -->
              <div class="form-group">
                <label>Login Password <span class="req">*</span> (Min 6 chars)</label>
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
}

.modal-card {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  width: 100%;
  max-width: 1100px;
  max-height: 90vh;
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
  padding: 1.5rem 1.75rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
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
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
}

.staff-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.staff-table th {
  background: rgba(255, 255, 255, 0.03);
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
</style>
