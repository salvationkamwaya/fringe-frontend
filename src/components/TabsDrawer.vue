<script setup>
import { ref, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  Layers, Plus, CheckCircle2, RotateCcw, X, Users, AlertCircle, 
  Check, Banknote, Smartphone, Split, ArrowLeft, Receipt, CreditCard, Sparkles, DollarSign
} from 'lucide-vue-next'

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
    store.playSound('beep')
    store.showToast(`Tab '${newTabName.value}' opened!`, 'success')
    newTabName.value = ''
    newCustomerName.value = ''
    showCreateModal.value = false
    await fetchTabs()
  } catch (err) {
    store.playSound('error')
    errorMessage.value = err.response?.data?.error || 'Failed to create tab.'
  }
}

const handleSelectTab = (tab) => {
  store.selectedTab = tab
  store.playSound('beep')
  store.showToast(`Active Tab set to '${tab.tab_name}'`, 'info')
  emit('tab-selected', tab)
  emit('close')
}

const handleCloseTab = async (tab) => {
  try {
    await api.post(`/pos/tabs/${tab.id}/close_tab/`)
    store.showToast(`Tab '${tab.tab_name}' closed successfully.`, 'info')
    if (store.selectedTab?.id === tab.id) {
      store.selectedTab = null
    }
    await fetchTabs()
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to close tab.', 'error')
  }
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

const settleTab = ref(null)
const settleMode = ref('CASH')
const settleCashTendered = ref(0)
const settleMobileRef = ref('')
const settleSplitCash = ref(0)
const settleSplitMobile = ref(0)
const isSettling = ref(false)

const openSettle = (tab) => {
  settleTab.value = tab
  const due = parseFloat(tab.balance_due || tab.total_amount || 0)
  settleMode.value = 'CASH'
  settleCashTendered.value = due
  settleMobileRef.value = ''
  settleSplitCash.value = Math.floor(due / 2)
  settleSplitMobile.value = due - settleSplitCash.value
}

const cancelSettle = () => {
  settleTab.value = null
}

const settleChangeDue = (tab) => {
  if (!tab) return 0
  const due = parseFloat(tab.balance_due || tab.total_amount || 0)
  if (settleMode.value === 'CASH') {
    return Math.max(0, parseFloat(settleCashTendered.value || 0) - due)
  }
  return 0
}

const handleConfirmSettle = async () => {
  if (!settleTab.value) return
  const due = parseFloat(settleTab.value.balance_due || settleTab.value.total_amount || 0)
  
  const payments = []
  if (settleMode.value === 'CASH') {
    if (parseFloat(settleCashTendered.value || 0) < due) {
      store.showToast('Cash tendered is less than balance due.', 'warning')
      return
    }
    payments.push({ payment_method: 'CASH', amount: due })
  } else if (settleMode.value === 'MOBILE_MONEY') {
    if (!settleMobileRef.value) {
      store.showToast('Please provide mobile money reference ID.', 'warning')
      return
    }
    payments.push({ payment_method: 'MOBILE_MONEY', amount: due, reference: settleMobileRef.value })
  } else if (settleMode.value === 'SPLIT') {
    const total = Number(settleSplitCash.value) + Number(settleSplitMobile.value)
    if (total < due) {
      store.showToast(`Split total (TSH ${total}) is less than due (TSH ${due}).`, 'warning')
      return
    }
    payments.push({ payment_method: 'CASH', amount: Number(settleSplitCash.value) })
    payments.push({ payment_method: 'MOBILE_MONEY', amount: Number(settleSplitMobile.value), reference: settleMobileRef.value || 'SPLIT' })
  }

  isSettling.value = true
  try {
    const res = await api.post(`/pos/tabs/${settleTab.value.id}/settle/`, { payments })
    store.playSound('success')
    store.showToast(res.data.message || 'Tab settled and closed!', 'success')
    if (store.selectedTab?.id === settleTab.value.id) {
      store.selectedTab = null
    }
    settleTab.value = null
    await fetchTabs()
  } catch (err) {
    store.playSound('error')
    store.showToast(err.response?.data?.error || 'Failed to settle tab.', 'error')
  } finally {
    isSettling.value = false
  }
}

onMounted(() => {
  fetchTabs()
})
</script>

<template>
  <div class="drawer-overlay" @click.self="$emit('close')">
    <div class="drawer-panel">
      <!-- STATE 1: TAB SETTLEMENT SCREEN -->
      <div v-if="settleTab" class="settle-panel">
        <div class="settle-header">
          <button class="btn-back" @click="cancelSettle">
            <ArrowLeft :size="16" />
            <span>Back to Tabs</span>
          </button>
          <span class="status-pill open">Settling Bill</span>
        </div>

        <div class="settle-tab-meta">
          <h3 class="settle-tab-title">{{ settleTab.tab_name }}</h3>
          <span v-if="settleTab.customer_name" class="settle-cust">Guest: {{ settleTab.customer_name }}</span>
        </div>

        <!-- Orders & Drinks Breakdown -->
        <div class="settle-orders-box">
          <div class="settle-section-label">
            <Receipt :size="14" />
            <span>Drinks Served ({{ settleTab.orders?.length || 0 }} Rounds)</span>
          </div>
          <div class="settle-items-list">
            <template v-for="order in settleTab.orders" :key="order.id">
              <div v-for="item in order.items" :key="item.id" class="settle-item-row">
                <span class="item-name">{{ item.quantity }}x {{ item.product_name }}</span>
                <span class="item-amt">TSH {{ parseFloat(item.subtotal).toFixed(2) }}</span>
              </div>
            </template>
            <div v-if="!settleTab.orders || settleTab.orders.length === 0" class="no-items-text">
              No orders recorded on this tab yet.
            </div>
          </div>
        </div>

        <!-- Total Due Banner -->
        <div class="settle-total-banner">
          <span class="lbl">TOTAL TAB BALANCE DUE</span>
          <div class="val">TSH {{ parseFloat(settleTab.balance_due || settleTab.total_amount || 0).toFixed(2) }}</div>
        </div>

        <!-- Payment Method Tabs -->
        <div class="settle-method-tabs">
          <button 
            class="method-btn" 
            :class="{ active: settleMode === 'CASH' }"
            @click="settleMode = 'CASH'"
          >
            <Banknote :size="16" />
            <span>Cash</span>
          </button>
          <button 
            class="method-btn" 
            :class="{ active: settleMode === 'MOBILE_MONEY' }"
            @click="settleMode = 'MOBILE_MONEY'"
          >
            <Smartphone :size="16" />
            <span>Mobile Money</span>
          </button>
          <button 
            class="method-btn" 
            :class="{ active: settleMode === 'SPLIT' }"
            @click="settleMode = 'SPLIT'"
          >
            <Split :size="16" />
            <span>Split</span>
          </button>
        </div>

        <!-- Tender Inputs -->
        <div v-if="settleMode === 'CASH'" class="settle-tender-form">
          <label>Cash Tendered (TSH):</label>
          <input 
            v-model.number="settleCashTendered" 
            type="number" 
            class="settle-input" 
          />
          <div v-if="settleChangeDue(settleTab) > 0" class="change-box">
            <span>Change to Return:</span>
            <strong>TSH {{ settleChangeDue(settleTab).toFixed(2) }}</strong>
          </div>
        </div>

        <div v-else-if="settleMode === 'MOBILE_MONEY'" class="settle-tender-form">
          <label>Mobile Reference ID (M-Pesa / Tigo):</label>
          <input 
            v-model="settleMobileRef" 
            type="text" 
            placeholder="e.g. MP2603.9921"
            class="settle-input" 
            required
          />
        </div>

        <div v-else-if="settleMode === 'SPLIT'" class="settle-tender-form">
          <div class="split-inputs-row">
            <div>
              <label>Cash (TSH):</label>
              <input v-model.number="settleSplitCash" type="number" class="settle-input" />
            </div>
            <div>
              <label>Mobile Money (TSH):</label>
              <input v-model.number="settleSplitMobile" type="number" class="settle-input" />
            </div>
          </div>
          <input 
            v-model="settleMobileRef" 
            type="text" 
            placeholder="Mobile Reference ID (Optional)"
            class="settle-input" 
            style="margin-top: 8px;"
          />
        </div>

        <!-- Settlement Action Button -->
        <div class="settle-footer">
          <button 
            class="btn-confirm-settle" 
            :disabled="isSettling"
            @click="handleConfirmSettle"
          >
            {{ isSettling ? 'Processing...' : `Confirm Settlement & Close Tab (TSH ${parseFloat(settleTab.balance_due || settleTab.total_amount || 0).toFixed(2)})` }}
          </button>
        </div>
      </div>

      <!-- STATE 2: ACTIVE TABS LIST -->
      <template v-else>
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

            <!-- Active in POS Indicator -->
            <div v-if="store.selectedTab?.id === tab.id" class="active-pos-badge">
              <span>Active in POS Cart</span>
              <button 
                class="btn-mini-walkin" 
                @click="store.selectedTab = null; store.showToast('Switched to Walk-in Cash Sale mode', 'info')"
                title="Deselect to sell to walk-in customer"
              >
                Switch to Walk-in
              </button>
            </div>

            <div class="tab-metrics">
              <div class="metric">
                <span class="metric-label">Rounds</span>
                <span class="metric-val">{{ tab.orders?.length || 0 }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Drinks</span>
                <span class="metric-val">{{ tab.items_count || 0 }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Balance Due</span>
                <span class="metric-val price">TSH {{ parseFloat(tab.balance_due || tab.total_amount || 0).toFixed(2) }}</span>
              </div>
            </div>

            <div class="tab-actions">
              <template v-if="tab.status === 'OPEN'">
                <button 
                  class="btn-select"
                  @click="handleSelectTab(tab)"
                  title="Add more drinks to this tab"
                >
                  <Plus :size="15" />
                  <span>Add Drinks</span>
                </button>

                <button 
                  v-if="parseFloat(tab.balance_due || tab.total_amount || 0) > 0"
                  class="btn-settle"
                  @click="openSettle(tab)"
                  title="Review bill and accept payment"
                >
                  <Banknote :size="15" />
                  <span>Settle Bill</span>
                </button>

                <button 
                  v-else
                  class="btn-close-tab"
                  @click="handleCloseTab(tab)"
                  title="Mark this tab closed"
                >
                  <Check :size="14" />
                  <span>Close Tab</span>
                </button>
              </template>
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
      </template>
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

.btn-close-tab {
  padding: 8px 12px;
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
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-close-tab:hover {
  background: rgba(239, 68, 68, 0.28);
  color: #fff;
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

.btn-settle {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-settle:hover {
  background: rgba(16, 185, 129, 0.35);
  color: #fff;
}

.active-pos-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 8px;
  padding: 6px 10px;
  margin-bottom: 10px;
  font-size: 11px;
  font-weight: 700;
  color: #fbbf24;
}

.btn-mini-walkin {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-mini-walkin:hover {
  background: rgba(239, 68, 68, 0.4);
}

/* Settle Screen */
.settle-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.settle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.15);
}

.settle-tab-meta {
  margin-bottom: 16px;
}

.settle-tab-title {
  font-size: 20px;
  font-weight: 800;
  color: #f8fafc;
  margin: 0;
}

.settle-cust {
  font-size: 12px;
  color: #94a3b8;
}

.settle-orders-box {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  max-height: 180px;
  overflow-y: auto;
}

.settle-section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #fbbf24;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.settle-items-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settle-item-row {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  color: #cbd5e1;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.item-amt {
  font-weight: 700;
  color: #f8fafc;
}

.no-items-text {
  font-size: 12px;
  color: #64748b;
  text-align: center;
  padding: 10px;
}

.settle-total-banner {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.25));
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 14px;
  padding: 14px;
  text-align: center;
  margin-bottom: 16px;
}

.settle-total-banner .lbl {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #34d399;
}

.settle-total-banner .val {
  font-size: 26px;
  font-weight: 900;
  color: #fff;
  margin-top: 2px;
}

.settle-method-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  background: rgba(255, 255, 255, 0.04);
  padding: 4px;
  border-radius: 10px;
  margin-bottom: 16px;
}

.method-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 4px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.method-btn.active {
  background: rgba(16, 185, 129, 0.25);
  color: #34d399;
}

.settle-tender-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

.settle-tender-form label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}

.settle-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  outline: none;
}

.settle-input:focus {
  border-color: #10b981;
}

.change-box {
  display: flex;
  justify-content: space-between;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: #a7f3d0;
  margin-top: 6px;
}

.split-inputs-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.settle-footer {
  margin-top: auto;
  padding-top: 14px;
}

.btn-confirm-settle {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
  transition: all 0.2s;
}

.btn-confirm-settle:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.55);
}

.btn-confirm-settle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
