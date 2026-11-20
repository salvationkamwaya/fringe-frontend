<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import api from '../api'
import {
  MapPin, Plus, Edit3, Power, RefreshCw, X, Search,
  CheckCircle2, XCircle, Users, Phone, Building2,
  ExternalLink, Layers, AlertTriangle, Move, RotateCcw
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const branches = ref([])
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('all') // 'all' | 'active' | 'inactive'

// Draggable modal window state
const modalOffset = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const initialOffset = ref({ x: 0, y: 0 })

const modalCardStyle = computed(() => {
  return {
    transform: `translate3d(${modalOffset.value.x}px, ${modalOffset.value.y}px, 0)`,
    transition: isDragging.value ? 'none' : 'transform 0.15s ease-out'
  }
})

const startDrag = (event) => {
  // Only drag on left mouse button
  if (event.button !== 0) return
  if (event.target.closest('button, input, select, textarea, a, .no-drag')) {
    return
  }
  isDragging.value = true
  dragStart.value = { x: event.clientX, y: event.clientY }
  initialOffset.value = { ...modalOffset.value }

  window.addEventListener('mousemove', onDrag, { passive: true })
  window.addEventListener('mouseup', stopDrag)
  document.body.style.userSelect = 'none'
}

const onDrag = (event) => {
  if (!isDragging.value) return
  const dx = event.clientX - dragStart.value.x
  const dy = event.clientY - dragStart.value.y
  modalOffset.value = {
    x: initialOffset.value.x + dx,
    y: initialOffset.value.y + dy
  }
}

const stopDrag = () => {
  if (!isDragging.value) return
  isDragging.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  document.body.style.userSelect = ''
}

const onTouchStart = (event) => {
  if (event.touches.length !== 1) return
  if (event.target.closest('button, input, select, textarea, a, .no-drag')) {
    return
  }
  const touch = event.touches[0]
  isDragging.value = true
  dragStart.value = { x: touch.clientX, y: touch.clientY }
  initialOffset.value = { ...modalOffset.value }

  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', stopTouchDrag)
}

const onTouchMove = (event) => {
  if (!isDragging.value || event.touches.length !== 1) return
  event.preventDefault()
  const touch = event.touches[0]
  const dx = touch.clientX - dragStart.value.x
  const dy = touch.clientY - dragStart.value.y
  modalOffset.value = {
    x: initialOffset.value.x + dx,
    y: initialOffset.value.y + dy
  }
}

const stopTouchDrag = () => {
  if (!isDragging.value) return
  isDragging.value = false
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', stopTouchDrag)
}

const resetPosition = () => {
  modalOffset.value = { x: 0, y: 0 }
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', stopTouchDrag)
  document.body.style.userSelect = ''
})

// Drawer / Form state
const showDrawer = ref(false)
const isEditing = ref(false)
const selectedBranchId = ref(null)
const submitting = ref(false)
const formError = ref('')

const branchForm = ref({
  name: '',
  code: '',
  address: '',
  phone: '',
  business_unit: 'bar',
  is_active: true
})

const fetchBranchesList = async () => {
  loading.value = true
  try {
    const res = await api.get('/core/branches/')
    branches.value = res.data || []
    // Also update global store
    store.branches = branches.value
  } catch (err) {
    store.showToast(err.response?.data?.detail || 'Failed to load branch records.', 'error')
  } finally {
    loading.value = false
  }
}

// Summary statistics
const stats = computed(() => {
  const total = branches.value.length
  const active = branches.value.filter(b => b.is_active).length
  const totalStaff = branches.value.reduce((sum, b) => sum + (b.staff_count || 0), 0)
  return { total, active, totalStaff }
})

// Filtered branches
const filteredBranches = computed(() => {
  return branches.value.filter(branch => {
    const q = searchQuery.value.toLowerCase().trim()
    const matchesSearch = !q ||
      branch.name.toLowerCase().includes(q) ||
      branch.code.toLowerCase().includes(q) ||
      (branch.address && branch.address.toLowerCase().includes(q)) ||
      (branch.phone && branch.phone.includes(q))

    const matchesStatus = statusFilter.value === 'all' ||
      (statusFilter.value === 'active' ? branch.is_active : !branch.is_active)

    return matchesSearch && matchesStatus
  })
})

const openCreateDrawer = () => {
  isEditing.value = false
  selectedBranchId.value = null
  branchForm.value = {
    name: '',
    code: '',
    address: '',
    phone: '',
    business_unit: 'bar',
    is_active: true
  }
  formError.value = ''
  showDrawer.value = true
}

const openEditDrawer = (branch) => {
  isEditing.value = true
  selectedBranchId.value = branch.id
  branchForm.value = {
    name: branch.name,
    code: branch.code,
    address: branch.address || '',
    phone: branch.phone || '',
    business_unit: branch.business_unit || 'bar',
    is_active: branch.is_active
  }
  formError.value = ''
  showDrawer.value = true
}

const handleSaveBranch = async () => {
  if (!branchForm.value.name.trim()) {
    formError.value = 'Branch name is required.'
    return
  }
  if (!branchForm.value.code.trim()) {
    formError.value = 'Unique branch code is required.'
    return
  }
  
  // Format code to uppercase alphanumeric
  const cleanCode = branchForm.value.code.trim().toUpperCase()
  if (!/^[A-Z0-9_-]{2,10}$/.test(cleanCode)) {
    formError.value = 'Branch code must be 2 to 10 alphanumeric characters (e.g. OYB, CCB).'
    return
  }

  submitting.value = true
  formError.value = ''

  try {
    const payload = {
      name: branchForm.value.name.trim(),
      code: cleanCode,
      address: branchForm.value.address.trim(),
      phone: branchForm.value.phone.trim(),
      business_unit: 'bar',
      is_active: branchForm.value.is_active
    }

    if (isEditing.value) {
      await api.patch(`/core/branches/${selectedBranchId.value}/`, payload)
      store.showToast(`Branch "${payload.name}" updated successfully!`, 'success')
    } else {
      await api.post('/core/branches/', payload)
      store.showToast(`New branch "${payload.name}" (${payload.code}) registered!`, 'success')
    }

    showDrawer.value = false
    await fetchBranchesList()
  } catch (err) {
    const errData = err.response?.data
    if (errData?.code) {
      formError.value = `Code Error: ${Array.isArray(errData.code) ? errData.code[0] : errData.code}`
    } else {
      formError.value = errData?.detail || errData?.error || 'Failed to save branch.'
    }
  } finally {
    submitting.value = false
  }
}

const handleToggleActive = async (branch) => {
  const actionText = branch.is_active ? 'deactivate' : 'activate'
  if (!window.confirm(`Are you sure you want to ${actionText} "${branch.name}"?`)) {
    return
  }

  try {
    const res = await api.post(`/core/branches/${branch.id}/toggle_active/`)
    store.showToast(res.data.message, res.data.is_active ? 'success' : 'warning')
    await fetchBranchesList()
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to update branch status.', 'error')
  }
}

const handleSwitchToBranch = (branch) => {
  store.switchBranch(branch.id)
  store.showToast(`Switched active workspace to "${branch.name}".`, 'success')
  emit('close')
}

onMounted(() => {
  fetchBranchesList()
})
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div 
      class="modal-card" 
      :class="{ 'is-dragging': isDragging }"
      :style="modalCardStyle"
    >
      <!-- Modal Header (Draggable) -->
      <div 
        class="modal-header draggable-header"
        @mousedown="startDrag"
        @touchstart="onTouchStart"
        title="Click and drag to move modal window"
      >
        <div class="header-left">
          <div class="header-icon-box">
            <MapPin :size="24" class="header-icon" />
          </div>
          <div>
            <div class="header-title-row">
              <h3 class="title">{{ t('branch.title') }}</h3>
              <span class="owner-badge">{{ t('branch.ownerBadge') }}</span>
            </div>
            <p class="subtitle">
              {{ t('branch.subtitle') }}
            </p>
          </div>
        </div>

        <div class="header-actions no-drag">
          <button class="btn-close" @click="$emit('close')" :title="t('common.backToPos')">
            <X :size="16" />
            <span>{{ t('common.backToPos') }}</span>
          </button>
        </div>
      </div>

      <!-- Access Guard -->
      <div v-if="!store.isOwner" class="denied-box">
        <AlertTriangle :size="32" class="denied-icon" />
        <h4>Access Restricted: Business Owner Privilege Required</h4>
        <p>Only the Business Owner has authority to register or manage branch locations.</p>
        <button class="btn-primary" @click="$emit('close')">{{ t('common.backToPos') }}</button>
      </div>

      <div v-else class="modal-content">
        <!-- Top Statistics -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">{{ t('branch.total') }}</span>
              <span class="stat-value">{{ stats.total }}</span>
            </div>
            <div class="stat-icon-wrap emerald"><Building2 :size="22" /></div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">{{ t('branch.active') }}</span>
              <span class="stat-value active-val">{{ stats.active }}</span>
            </div>
            <div class="stat-icon-wrap green"><CheckCircle2 :size="22" /></div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">{{ t('branch.assignedStaff') }}</span>
              <span class="stat-value">{{ stats.totalStaff }}</span>
            </div>
            <div class="stat-icon-wrap blue"><Users :size="22" /></div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">{{ t('branch.currentView') }}</span>
              <span class="stat-value current-val">{{ store.activeBranchName }}</span>
            </div>
            <div class="stat-icon-wrap amber"><MapPin :size="22" /></div>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <div class="search-box">
            <Search :size="16" class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search branches by name, code, address, phone..."
              class="search-input"
            />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
              <X :size="14" />
            </button>
          </div>

          <div class="filters">
            <select v-model="statusFilter" class="select-filter">
              <option value="all">{{ t('branch.allStatuses') }}</option>
              <option value="active">{{ t('branch.activeOnly') }}</option>
              <option value="inactive">{{ t('branch.inactiveOnly') }}</option>
            </select>

            <button class="btn-refresh" @click="fetchBranchesList" :title="t('common.refresh')">
              <RefreshCw :size="16" :class="{ 'spin-anim': loading }" />
            </button>

            <button class="btn-add-branch" @click="openCreateDrawer">
              <Plus :size="16" />
              <span>{{ t('branch.registerNew') }}</span>
            </button>
          </div>
        </div>

        <!-- Branches Table -->
        <div class="table-container">
          <table class="branch-table">
            <thead>
              <tr>
                <th>{{ t('branch.colLocation') }}</th>
                <th>{{ t('branch.colCode') }}</th>
                <th>{{ t('branch.colAddress') }}</th>
                <th>{{ t('branch.colPhone') }}</th>
                <th>{{ t('branch.colStaff') }}</th>
                <th>{{ t('branch.colStatus') }}</th>
                <th class="text-right">{{ t('branch.colActions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading && branches.length === 0">
                <td colspan="7" class="loading-td">
                  <RefreshCw :size="20" class="spin-anim" />
                  <span>Loading branch directory...</span>
                </td>
              </tr>
              <tr v-else-if="filteredBranches.length === 0">
                <td colspan="7" class="empty-td">
                  <MapPin :size="32" class="empty-icon" />
                  <p>No branch locations found. Click "+ Register New Branch" to establish a branch location.</p>
                </td>
              </tr>
              <tr 
                v-for="branch in filteredBranches" 
                :key="branch.id" 
                :class="{ 
                  'row-inactive': !branch.is_active,
                  'row-active-view': String(branch.id) === String(store.activeBranchId)
                }"
              >
                <!-- Branch Name -->
                <td>
                  <div class="branch-name-cell">
                    <div class="branch-icon-box">
                      <MapPin :size="16" class="text-emerald" />
                    </div>
                    <div>
                      <div class="branch-title">
                        {{ branch.name }}
                        <span v-if="String(branch.id) === String(store.activeBranchId)" class="current-badge">
                          ACTIVE VIEW
                        </span>
                      </div>
                      <div class="branch-meta">Registered: {{ new Date(branch.created_at).toLocaleDateString() }}</div>
                    </div>
                  </div>
                </td>

                <!-- Branch Code -->
                <td>
                  <span class="code-pill">{{ branch.code }}</span>
                </td>

                <!-- Address -->
                <td>
                  <span class="address-text">{{ branch.address || '—' }}</span>
                </td>

                <!-- Phone -->
                <td>
                  <div v-if="branch.phone" class="phone-cell">
                    <Phone :size="13" class="text-muted" />
                    <span>{{ branch.phone }}</span>
                  </div>
                  <span v-else class="text-muted">—</span>
                </td>

                <!-- Staff Count -->
                <td>
                  <span class="staff-count-pill">
                    <Users :size="13" />
                    <span>{{ branch.staff_count || 0 }} Staff</span>
                  </span>
                </td>

                <!-- Status Pill -->
                <td>
                  <span class="status-pill" :class="branch.is_active ? 'status-active' : 'status-suspended'">
                    {{ branch.is_active ? 'Active' : 'Deactivated' }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="text-right">
                  <div class="actions-group">
                    <!-- Switch View to this Branch -->
                    <button 
                      class="btn-action switch"
                      @click="handleSwitchToBranch(branch)"
                      title="Switch active POS & catalog view to this branch"
                    >
                      <ExternalLink :size="13" />
                      <span>Switch View</span>
                    </button>

                    <!-- Edit Branch -->
                    <button 
                      class="btn-action edit"
                      @click="openEditDrawer(branch)"
                      title="Edit branch details"
                    >
                      <Edit3 :size="13" />
                      <span>Edit</span>
                    </button>

                    <!-- Toggle Status -->
                    <button 
                      class="btn-action power"
                      :class="{ 'btn-deactivate': branch.is_active, 'btn-activate': !branch.is_active }"
                      @click="handleToggleActive(branch)"
                      :title="branch.is_active ? 'Deactivate branch' : 'Activate branch'"
                    >
                      <Power :size="13" />
                      <span>{{ branch.is_active ? 'Deactivate' : 'Activate' }}</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create / Edit Drawer Modal -->
    <div v-if="showDrawer" class="drawer-overlay" @click.self="showDrawer = false">
      <div class="drawer-card">
        <div class="drawer-header">
          <div class="drawer-title-row">
            <Building2 :size="20" class="text-emerald" />
            <h4>{{ isEditing ? 'Edit Branch Location' : 'Register New Branch' }}</h4>
          </div>
          <button class="drawer-close" @click="showDrawer = false">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleSaveBranch" class="drawer-form">
          <div class="drawer-scroll-body">
            <div v-if="formError" class="form-alert-error">
              <AlertTriangle :size="16" />
              <span>{{ formError }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">Branch Name <span class="req">*</span></label>
              <input 
                v-model="branchForm.name"
                type="text"
                class="form-input"
                placeholder="e.g. Oysterbay Lounge, City Center Bar, Mbezi Beach"
                required
              />
              <p class="field-hint">The physical name displayed on customer receipts and management dashboards.</p>
            </div>

            <div class="form-group">
              <label class="form-label">Branch Prefix Code <span class="req">*</span></label>
              <input 
                v-model="branchForm.code"
                type="text"
                class="form-input code-input"
                placeholder="e.g. OYB, CCB, MBZ"
                maxlength="10"
                required
              />
              <p class="field-hint">
                Unique 2-10 character code used as the prefix for all orders generated at this branch (e.g. 
                <strong>{{ (branchForm.code || 'CODE').toUpperCase() }}-261109-1234</strong>).
              </p>
            </div>

            <div class="form-group">
              <label class="form-label">Physical Address / Location</label>
              <textarea 
                v-model="branchForm.address"
                class="form-textarea"
                placeholder="e.g. Plot 42, Haile Selassie Road, Masaki / Oysterbay"
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Contact Phone Number</label>
              <input 
                v-model="branchForm.phone"
                type="tel"
                class="form-input"
                placeholder="e.g. +255 712 345 678"
              />
            </div>

            <div class="form-group-checkbox">
              <label class="checkbox-label">
                <input 
                  v-model="branchForm.is_active"
                  type="checkbox"
                  class="form-checkbox"
                />
                <span>Branch is Active and Operational</span>
              </label>
            </div>
          </div>

          <div class="drawer-actions">
            <button type="button" class="btn-cancel" @click="showDrawer = false">Cancel</button>
            <button type="submit" class="btn-submit" :disabled="submitting">
              <RefreshCw v-if="submitting" :size="16" class="spin-anim" />
              <span>{{ isEditing ? 'Save Changes' : 'Register Branch' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 7, 13, 0.78);
  backdrop-filter: blur(10px);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  animation: fadeIn 0.2s ease;
}

.modal-card {
  width: 100%;
  max-width: 1150px;
  height: 90vh;
  max-height: 92vh;
  background: var(--bg-surface, #121824);
  border: 1px solid var(--border-color, #1f293d);
  border-radius: 18px;
  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-main, #f1f5f9);
  will-change: transform;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid var(--border-color, #1f293d);
  background: var(--bg-surface-elevated, #161f30);
  flex-shrink: 0;
}

.draggable-header {
  cursor: grab;
  user-select: none;
}

.draggable-header:active,
.is-dragging .draggable-header {
  cursor: grabbing;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-reset-pos {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-color, #1f293d);
  color: var(--text-muted, #94a3b8);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-reset-pos:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-main, #f1f5f9);
  border-color: #3b82f6;
}

.movable-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.18rem 0.5rem;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.25);
  letter-spacing: 0.02em;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.header-icon-box {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10b981;
  flex-shrink: 0;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
}

.owner-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.subtitle {
  font-size: 0.85rem;
  color: var(--text-muted, #94a3b8);
  margin: 0;
  max-width: 680px;
  line-height: 1.4;
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.btn-close:hover {
  background: var(--bg-hover, rgba(255, 255, 255, 0.06));
  color: var(--text-main, #f1f5f9);
}

.modal-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 1.25rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stats-row {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: var(--bg-surface-elevated, #161f30);
  border: 1px solid var(--border-color, #1f293d);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted, #94a3b8);
  font-weight: 600;
  letter-spacing: 0.03em;
}

.stat-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-main, #f1f5f9);
}

.stat-value.active-val {
  color: #10b981;
}

.stat-value.current-val {
  font-size: 1rem;
  color: #f59e0b;
}

.stat-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-wrap.emerald { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.stat-icon-wrap.green { background: rgba(34, 197, 94, 0.12); color: #22c55e; }
.stat-icon-wrap.blue { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
.stat-icon-wrap.amber { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }

.toolbar {
  flex-shrink: 0;
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
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted, #94a3b8);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.65rem 2.2rem 0.65rem 2.4rem;
  background: var(--bg-surface-elevated, #161f30);
  border: 1px solid var(--border-color, #1f293d);
  border-radius: 9px;
  color: var(--text-main, #f1f5f9);
  font-size: 0.875rem;
  outline: none;
  transition: all 0.15s ease;
}

.search-input:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.clear-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
}

.filters {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.select-filter {
  padding: 0.65rem 1rem;
  background: var(--bg-surface-elevated, #161f30);
  border: 1px solid var(--border-color, #1f293d);
  border-radius: 9px;
  color: var(--text-main, #f1f5f9);
  font-size: 0.85rem;
  outline: none;
  cursor: pointer;
}

.btn-refresh {
  padding: 0.65rem;
  background: var(--bg-surface-elevated, #161f30);
  border: 1px solid var(--border-color, #1f293d);
  border-radius: 9px;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.btn-refresh:hover {
  color: var(--text-main, #f1f5f9);
  border-color: var(--text-muted, #94a3b8);
}

.btn-add-branch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.15rem;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 9px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-add-branch:hover {
  background: #059669;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
}

.table-container {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--border-color, #1f293d);
  border-radius: 12px;
  overflow-y: auto;
  overflow-x: auto;
  background: var(--bg-surface-elevated, #161f30);
  overscroll-behavior: contain;
  scroll-behavior: smooth;
}

.branch-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  text-align: left;
}

.branch-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #141c2c;
  border-bottom: 1px solid var(--border-color, #1f293d);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.branch-table th {
  padding: 0.85rem 1.15rem;
  font-weight: 600;
  color: var(--text-muted, #94a3b8);
  font-size: 0.775rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.branch-table td {
  padding: 0.95rem 1.15rem;
  border-bottom: 1px solid var(--border-color, #1f293d);
  vertical-align: middle;
}

.branch-table tbody tr:last-child td {
  border-bottom: none;
}

.branch-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.row-inactive {
  opacity: 0.6;
}

.row-active-view {
  background: rgba(16, 185, 129, 0.05) !important;
}

.branch-name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.branch-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.branch-title {
  font-weight: 600;
  color: var(--text-main, #f1f5f9);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.current-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.18);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.branch-meta {
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
}

.code-pill {
  font-family: monospace;
  font-weight: 700;
  font-size: 0.8rem;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.address-text {
  color: var(--text-muted, #cbd5e1);
  font-size: 0.825rem;
  max-width: 220px;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.phone-cell {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.825rem;
  color: var(--text-muted, #cbd5e1);
}

.staff-count-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.775rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-muted, #94a3b8);
}

.status-pill {
  font-size: 0.725rem;
  font-weight: 700;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-active {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-suspended {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.actions-group {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.65rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.12s ease;
}

.btn-action.switch {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.25);
}
.btn-action.switch:hover {
  background: #10b981;
  color: #fff;
}

.btn-action.edit {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.25);
}
.btn-action.edit:hover {
  background: #3b82f6;
  color: #fff;
}

.btn-deactivate {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.2);
}
.btn-deactivate:hover {
  background: #ef4444;
  color: #fff;
}

.btn-activate {
  background: rgba(34, 197, 94, 0.1);
  color: #4ade80;
  border-color: rgba(34, 197, 94, 0.2);
}
.btn-activate:hover {
  background: #22c55e;
  color: #fff;
}

.loading-td, .empty-td {
  padding: 3.5rem 1rem !important;
  text-align: center;
  color: var(--text-muted, #94a3b8);
}

.empty-icon {
  margin: 0 auto 0.75rem;
  opacity: 0.4;
}

.text-right { text-align: right; }
.text-emerald { color: #10b981; }
.text-muted { color: var(--text-muted, #94a3b8); }

.spin-anim {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

/* Drawer styles */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1100;
  display: flex;
  justify-content: flex-end;
  animation: fadeIn 0.15s ease;
}

.drawer-card {
  width: 100%;
  max-width: 480px;
  height: 100%;
  background: var(--bg-surface, #121824);
  border-left: 1px solid var(--border-color, #1f293d);
  display: flex;
  flex-direction: column;
  padding: 0;
  box-shadow: -15px 0 35px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color, #1f293d);
  background: var(--bg-surface-elevated, #161f30);
  flex-shrink: 0;
}

.drawer-title-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.drawer-title-row h4 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-main, #f1f5f9);
}

.drawer-close {
  background: none;
  border: none;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 6px;
}

.drawer-close:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-main, #f1f5f9);
}

.drawer-form {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-scroll-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-alert-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #f87171;
  font-size: 0.825rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-main, #f1f5f9);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.req { color: #ef4444; }

.form-input, .form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bg-surface-elevated, #161f30);
  border: 1px solid var(--border-color, #1f293d);
  border-radius: 9px;
  color: var(--text-main, #f1f5f9);
  font-size: 0.875rem;
  outline: none;
  transition: all 0.15s ease;
}

.code-input {
  font-family: monospace;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.form-input:focus, .form-textarea:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.field-hint {
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  margin: 0.2rem 0 0 0;
  line-height: 1.35;
}

.form-group-checkbox {
  padding: 0.5rem 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--text-main, #f1f5f9);
}

.form-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #10b981;
  cursor: pointer;
}

.drawer-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--border-color, #1f293d);
  background: var(--bg-surface-elevated, #161f30);
  flex-shrink: 0;
  margin-top: 0;
}

/* Custom sleek scrollbars */
.table-container::-webkit-scrollbar,
.drawer-scroll-body::-webkit-scrollbar,
.modal-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.table-container::-webkit-scrollbar-track,
.drawer-scroll-body::-webkit-scrollbar-track,
.modal-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.15);
}

.table-container::-webkit-scrollbar-thumb,
.drawer-scroll-body::-webkit-scrollbar-thumb,
.modal-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16);
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover,
.drawer-scroll-body::-webkit-scrollbar-thumb:hover,
.modal-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.btn-cancel {
  flex: 1;
  padding: 0.75rem 1rem;
  background: transparent;
  border: 1px solid var(--border-color, #1f293d);
  border-radius: 9px;
  color: var(--text-muted, #94a3b8);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-main, #f1f5f9);
}

.btn-submit {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: #10b981;
  border: none;
  border-radius: 9px;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-submit:hover:not(:disabled) {
  background: #059669;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.denied-box {
  padding: 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.denied-icon {
  color: #f59e0b;
}
</style>
