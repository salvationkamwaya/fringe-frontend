<script setup>
import { ref, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import { Layers, Plus, CheckCircle2, RotateCcw, X, Users, AlertCircle } from 'lucide-vue-next'

const emit = defineEmits(['close', 'tab-selected'])

const tabs = ref([])
const loading = ref(false)
const showCreateModal = ref(false)
const newTabName = ref('')
const newCustomerName = ref('')
const errorMessage = ref('')

const fetchTabs = async () => {
  loading.value = true
  try {
    const response = await api.get('/pos/tabs/')
    tabs.value = response.data.results || response.data
  } catch (err) {
    errorMessage.value = 'Failed to load bar tabs.'
  } finally {
    loading.value = false
  }
}

const handleCreateTab = async () => {
  if (!newTabName.value) return
  try {
    const response = await api.post('/pos/tabs/', {
      tab_name: newTabName.value,
      customer_name: newCustomerName.value
    })
    store.showToast(`Tab '${newTabName.value}' opened!`, 'success')
    newTabName.value = ''
    newCustomerName.value = ''
    showCreateModal.value = false
    await fetchTabs()
  } catch (err) {
    errorMessage.value = err.response?.data?.error || 'Failed to create tab.'
  }
}

const handleSelectTab = (tab) => {
  store.selectedTab = tab
  store.showToast(`Active Tab set to '${tab.tab_name}'`, 'info')
  emit('tab-selected', tab)
  emit('close')
}

const handleReopenTab = (tab) => {
  store.openPinModal({
    action: 'REOPEN_TAB',
    title: `Reopen Tab '${tab.tab_name}'`,
    subtitle: 'Manager or Owner PIN authorization required to reopen settled tabs.',
    context: { tab_id: tab.id, tab_name: tab.tab_name },
    onSuccess: async (authData) => {
      try {
        await api.post(`/pos/tabs/${tab.id}/reopen/`, {
          approver_id: authData.approver_id,
          manager_pin: authData.pin
        })
        store.showToast(`Tab '${tab.tab_name}' successfully reopened!`, 'success')
        await fetchTabs()
      } catch (err) {
        store.showToast(err.response?.data?.error || 'Failed to reopen tab.', 'error')
      }
    }
  })
}

onMounted(() => {
  fetchTabs()
})
</script>

<template>
  <div class="drawer-overlay" @click.self="$emit('close')">
    <div class="drawer-panel">
      <div class="drawer-header">
        <div class="header-left">
          <Layers :size="20" class="header-icon" />
          <div>
            <h3 class="title">Active Bar Tabs</h3>
            <p class="subtitle">Open drink tabs for tables and customers</p>
          </div>
        </div>
        <button class="btn-close" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>

      <!-- Action Bar -->
      <div class="drawer-actions">
        <button class="btn-create-tab" @click="showCreateModal = !showCreateModal">
          <Plus :size="16" />
          <span>Open New Tab</span>
        </button>
      </div>

      <!-- Create Tab Inline Card -->
      <div v-if="showCreateModal" class="create-card">
        <h4 class="card-title">Open New Tab</h4>
        <input 
          v-model="newTabName" 
          type="text" 
          placeholder="Tab Name / Table (e.g. Table 8 or VIP Couch)"
          class="tab-input"
          required
        />
        <input 
          v-model="newCustomerName" 
          type="text" 
          placeholder="Customer Name (Optional)"
          class="tab-input"
        />
        <div class="create-buttons">
          <button class="btn-cancel" @click="showCreateModal = false">Cancel</button>
          <button class="btn-save" :disabled="!newTabName" @click="handleCreateTab">Open Tab</button>
        </div>
      </div>

      <!-- Tabs List -->
      <div class="tabs-list">
        <div v-if="loading" class="loading-state">Loading open tabs...</div>
        <div v-else-if="tabs.length === 0" class="empty-state">
          <Users :size="32" class="empty-icon" />
          <p>No active bar tabs right now.</p>
          <span>Open a tab to track drinks for tables or lounge guests.</span>
        </div>

        <div 
          v-for="tab in tabs" 
          :key="tab.id" 
          class="tab-card"
          :class="{ selected: store.selectedTab?.id === tab.id }"
        >
          <div class="tab-card-header">
            <div>
              <div class="tab-name">{{ tab.tab_name }}</div>
              <div v-if="tab.customer_name" class="customer-name">{{ tab.customer_name }}</div>
            </div>
            <span class="status-pill" :class="tab.status.toLowerCase()">{{ tab.status }}</span>
          </div>

          <div class="tab-metrics">
            <div class="metric">
              <span class="metric-label">Orders</span>
              <span class="metric-val">{{ tab.orders?.length || 0 }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Total Balance</span>
              <span class="metric-val price">ZMW {{ tab.total_amount || '0.00' }}</span>
            </div>
          </div>

          <div class="tab-actions">
            <button 
              v-if="tab.status === 'OPEN'"
              class="btn-select"
              @click="handleSelectTab(tab)"
            >
              <CheckCircle2 :size="16" />
              <span>Select Tab for POS</span>
            </button>
            <button 
              v-else
              class="btn-reopen"
              @click="handleReopenTab(tab)"
            >
              <RotateCcw :size="14" />
              <span>Reopen (Requires Mgr PIN)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 14, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: flex-end;
  z-index: 1050;
}

.drawer-panel {
  width: 100%;
  max-width: 440px;
  height: 100%;
  background: #111827;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  padding: 24px;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #fbbf24;
}

.title {
  font-size: 18px;
  font-weight: 800;
  color: #f8fafc;
}

.subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.btn-close {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border-radius: 8px;
  padding: 6px;
}

.drawer-actions {
  margin-bottom: 16px;
}

.btn-create-tab {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);
}

.create-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-title {
  font-size: 13px;
  font-weight: 700;
  color: #fbbf24;
}

.tab-input {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 13px;
  outline: none;
}

.create-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel {
  padding: 6px 12px;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
}

.btn-save {
  padding: 6px 16px;
  border-radius: 8px;
  background: #f59e0b;
  color: #111827;
  font-size: 12px;
  font-weight: 700;
}

.tabs-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: #64748b;
}

.empty-icon {
  margin: 0 auto 12px;
  color: #475569;
}

.empty-state p {
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
}

.empty-state span {
  font-size: 12px;
  color: #64748b;
}

.tab-card {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px;
  transition: all 0.2s ease;
}

.tab-card.selected {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.tab-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.tab-name {
  font-size: 15px;
  font-weight: 800;
  color: #f8fafc;
}

.customer-name {
  font-size: 12px;
  color: #94a3b8;
}

.status-pill {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 9999px;
  text-transform: uppercase;
}

.status-pill.open {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.status-pill.settled {
  background: rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
}

.tab-metrics {
  display: flex;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.metric-label {
  display: block;
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 700;
}

.metric-val {
  font-size: 14px;
  font-weight: 800;
  color: #e2e8f0;
}

.metric-val.price {
  color: #fbbf24;
}

.tab-actions {
  display: flex;
  gap: 8px;
}

.btn-select {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-reopen {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
</style>
