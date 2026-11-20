<script setup>
import { ref, onMounted } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import api from '../api'
import { ShieldCheck, Search, Filter, History, X } from 'lucide-vue-next'

const emit = defineEmits(['close'])

const logs = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedAction = ref('')
const selectedLog = ref(null)

const fetchLogs = async () => {
  loading.value = true
  try {
    const params = {}
    if (selectedAction.value) params.action = selectedAction.value
    const response = await api.get('/audit-logs/', { params })
    logs.value = response.data.results || response.data
  } catch (err) {
    store.showToast('Failed to load audit logs.', 'error')
  } finally {
    loading.value = false
  }
}

const getActionBadgeClass = (action) => {
  if (action.includes('FAIL') || action.includes('BLOCKED') || action.includes('DENIED')) return 'badge-danger'
  if (action.includes('VOID') || action.includes('OVERRIDE')) return 'badge-warning'
  if (action.includes('SALE') || action.includes('VERIFIED')) return 'badge-success'
  return 'badge-info'
}

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <div class="header-left">
          <ShieldCheck :size="24" class="header-icon" />
          <div>
            <h3 class="title">{{ t('audit.title') }}</h3>
            <p class="subtitle">{{ t('audit.subtitle') }}</p>
          </div>
        </div>
        <button class="btn-close" @click="$emit('close')" :title="t('common.backToPos')">
          <X :size="16" />
          <span>{{ t('common.backToPos') }}</span>
        </button>
      </div>

      <!-- Filters Bar -->
      <div class="filters-bar">
        <div class="filter-group">
          <label>{{ t('audit.filterAction') }}:</label>
          <select v-model="selectedAction" @change="fetchLogs" class="filter-select">
            <option value="">{{ t('audit.allEvents') }}</option>
            <option value="SALE_COMPLETED">Sales Completed</option>
            <option value="AGE_VERIFIED">Alcohol Age Verifications</option>
            <option value="AGE_CHECK_BLOCKED_SALE">Age Verification Blocks</option>
            <option value="VOID_APPROVED">Approved Order Voids</option>
            <option value="APPROVAL_VOID_ITEM">Manager Item Overrides</option>
            <option value="TAB_REOPENED">Tab Reopens</option>
            <option value="PRICE_CHANGED">Price Modifications</option>
            <option value="BUSINESS_SWITCHED">Owner View Switches</option>
          </select>
        </div>

        <button class="btn-refresh" @click="fetchLogs">
          {{ t('audit.refreshLog') }}
        </button>
      </div>

      <!-- Audit Table -->
      <div class="table-wrapper">
        <table class="audit-table">
          <thead>
            <tr>
              <th>{{ t('audit.colTime') }}</th>
              <th>{{ t('audit.colUnit') }}</th>
              <th>{{ t('audit.colActor') }}</th>
              <th>{{ t('audit.colAction') }}</th>
              <th>{{ t('audit.colEntity') }}</th>
              <th>{{ t('audit.colDetails') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id" @click="selectedLog = log" class="clickable-row">
              <td class="timestamp">{{ new Date(log.timestamp).toLocaleTimeString() }}</td>
              <td>
                <span class="unit-tag" :class="log.business_unit === 'bar' ? 'unit-bar' : 'unit-stat'">
                  {{ (log.business_unit || 'Global').toUpperCase() }}
                </span>
              </td>
              <td>
                <div class="actor-cell">
                  <span class="actor-name">{{ log.username }}</span>
                  <span class="actor-role">{{ log.role }}</span>
                </div>
              </td>
              <td>
                <span class="action-badge" :class="getActionBadgeClass(log.action)">
                  {{ log.action }}
                </span>
              </td>
              <td class="entity-cell">
                {{ log.entity_type }} {{ log.entity_id ? `#${log.entity_id}` : '' }}
              </td>
              <td>
                <button class="btn-view" @click.stop="selectedLog = log">{{ t('audit.view') }}</button>
              </td>
            </tr>
            <tr v-if="logs.length === 0 && !loading">
              <td colspan="6" class="empty-cell">{{ t('audit.empty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- JSON Detail Drawer / Modal if Log Selected -->
      <div v-if="selectedLog" class="log-detail-card">
        <div class="detail-header">
          <h4>Event Detail: {{ selectedLog.action }} (ID #{{ selectedLog.id }})</h4>
          <button class="btn-close-detail" @click="selectedLog = null"><X :size="14" /></button>
        </div>
        <div class="detail-grid">
          <div v-if="selectedLog.before_value" class="json-block">
            <span class="json-label">Before Value:</span>
            <pre>{{ JSON.stringify(selectedLog.before_value, null, 2) }}</pre>
          </div>
          <div v-if="selectedLog.after_value" class="json-block">
            <span class="json-label">After Value:</span>
            <pre>{{ JSON.stringify(selectedLog.after_value, null, 2) }}</pre>
          </div>
          <div v-if="selectedLog.metadata" class="json-block">
            <span class="json-label">Metadata & Client Context:</span>
            <pre>{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 14, 0.88);
  backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 840px;
  max-height: 85vh;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
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

.filters-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.03);
  padding: 10px 14px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
}

.filter-select {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
}

.btn-refresh {
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  font-size: 12px;
  font-weight: 700;
}

.table-wrapper {
  flex: 1;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.audit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}

.audit-table th {
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  font-weight: 700;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  text-transform: uppercase;
  font-size: 11px;
}

.audit-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
}

.clickable-row:hover td {
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
}

.timestamp {
  font-family: monospace;
  color: #94a3b8;
}

.unit-tag {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
}

.unit-bar {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.unit-stat {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
}

.actor-cell {
  display: flex;
  flex-direction: column;
}

.actor-name {
  font-weight: 700;
  color: #f8fafc;
}

.actor-role {
  font-size: 10px;
  color: #64748b;
}

.action-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
  display: inline-block;
}

.badge-success {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.badge-warning {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.badge-danger {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.badge-info {
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
}

.btn-view {
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  font-size: 11px;
  font-weight: 700;
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: #64748b;
}

.log-detail-card {
  margin-top: 14px;
  background: #0b0f19;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 14px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.detail-header h4 {
  font-size: 13px;
  color: #fbbf24;
  font-weight: 700;
}

.btn-close-detail {
  background: transparent;
  color: #94a3b8;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.json-block {
  background: #020617;
  padding: 10px;
  border-radius: 8px;
  overflow-x: auto;
}

.json-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 4px;
}

.json-block pre {
  font-family: monospace;
  font-size: 11px;
  color: #38bdf8;
  margin: 0;
}
</style>
