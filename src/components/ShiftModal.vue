<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import api from '../api'
import { Clock, Banknote, Smartphone, CheckCircle2, AlertTriangle, Printer, X, ShieldCheck } from 'lucide-vue-next'

const emit = defineEmits(['close'])

const openingFloat = ref(200)
const countedCash = ref(0)
const varianceReason = ref('')
const loading = ref(false)
const errorMessage = ref('')
const zReportData = ref(null)

const activeShift = computed(() => store.activeShift)

const expectedCash = computed(() => {
  if (!activeShift.value) return 0
  return parseFloat(activeShift.value.opening_float) + parseFloat(activeShift.value.total_sales_cash)
})

const cashVariance = computed(() => {
  return parseFloat(countedCash.value || 0) - expectedCash.value
})

const handleStartShift = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await api.post('/pos/shifts/start_shift/', {
      opening_float: openingFloat.value,
      notes: 'Standard opening float'
    })
    store.activeShift = response.data
    store.showToast('Shift drawer opened successfully!', 'success')
  } catch (err) {
    errorMessage.value = err.response?.data?.error || 'Failed to start shift.'
  } finally {
    loading.value = false
  }
}

const handleCloseShift = async () => {
  if (!activeShift.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await api.post(`/pos/shifts/${activeShift.value.id}/close_shift/`, {
      counted_cash: countedCash.value,
      variance_reason: varianceReason.value
    })
    
    // Fetch full Z-report details
    const zResp = await api.get(`/pos/shifts/${activeShift.value.id}/z_report/`)
    zReportData.value = zResp.data
    store.activeShift = null
    store.showToast('Shift closed and Z-Report generated!', 'success')
  } catch (err) {
    errorMessage.value = err.response?.data?.error || 'Failed to close shift.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  store.fetchActiveShift()
  if (activeShift.value) {
    countedCash.value = expectedCash.value
  }
})
</script>

<template>
  <div class="modal-overlay shift-page" :data-theme="store.theme">
    <div class="modal-card">
      <div class="header">
        <div class="header-left">
          <div class="header-icon-tile">
            <Clock :size="20" />
          </div>
          <div>
            <h3 class="title">{{ t('shift.title') }}</h3>
            <p class="subtitle">{{ t('shift.subtitle') }}</p>
          </div>
        </div>
        <button class="btn-close" @click="$emit('close')">
          <X :size="16" />
          <span>{{ t('common.backToPos') }}</span>
        </button>
      </div>

      <!-- STATE 1: Z-REPORT DISPLAY -->
      <div v-if="zReportData" class="z-report-view">
        <div class="z-header">
          <div class="z-badge">OFFICIAL Z-REPORT</div>
          <div class="z-title">Shift #{{ zReportData.shift_id }} Final Reconciliation</div>
          <div class="z-time">{{ zReportData.generated_at }}</div>
        </div>

        <div class="z-receipt">
          <div class="z-row">
            <span>Business Unit:</span>
            <strong>{{ zReportData.business_unit.toUpperCase() }}</strong>
          </div>
          <div class="z-row">
            <span>Cashier / Bartender:</span>
            <strong>{{ zReportData.cashier }}</strong>
          </div>
          <div class="z-divider"></div>
          <div class="z-row">
            <span>Opening Float:</span>
            <span>TSH {{ zReportData.opening_float }}</span>
          </div>
          <div class="z-row">
            <span>Cash Sales:</span>
            <span>TSH {{ zReportData.total_sales_cash }}</span>
          </div>
          <div class="z-row">
            <span>Mobile Money Sales:</span>
            <span>TSH {{ zReportData.total_sales_mobile }}</span>
          </div>
          <div class="z-row bold">
            <span>Total Gross Sales:</span>
            <span>TSH {{ zReportData.total_sales_gross }}</span>
          </div>
          <div class="z-divider"></div>
          <div class="z-row">
            <span>Expected Cash:</span>
            <span>TSH {{ zReportData.expected_cash_in_drawer }}</span>
          </div>
          <div class="z-row bold">
            <span>Actual Counted Cash:</span>
            <span>TSH {{ zReportData.counted_cash }}</span>
          </div>
          <div class="z-row variance-row" :class="Number(zReportData.variance) === 0 ? 'balanced' : 'short'">
            <span>Cash Variance:</span>
            <strong>TSH {{ zReportData.variance }}</strong>
          </div>
          <div v-if="zReportData.variance_reason" class="z-note">
            Reason: {{ zReportData.variance_reason }}
          </div>
        </div>

        <div class="z-actions">
          <button class="btn-print" onclick="window.print()">
            <Printer :size="16" />
            <span>Print Z-Report</span>
          </button>
          <button class="btn-done" @click="$emit('close')">Done</button>
        </div>
      </div>

      <!-- STATE 2: MANAGERIAL OVERSIGHT VIEW (Managers and Owner do not operate drawer) -->
      <div v-else-if="!store.canRecordSales" class="manager-oversight-view">
        <div class="oversight-hero">
          <div class="hero-icon-pill">
            <ShieldCheck :size="24" />
          </div>
          <h4>{{ t('shift.oversightTitle') }}</h4>
          <p>
            <strong>{{ store.user?.first_name || store.user?.username }} ({{ store.user?.role?.toUpperCase() }})</strong> ·
            {{ t('shift.oversightDesc') }}
          </p>
        </div>

        <div v-if="activeShift" class="active-oversight-card">
          <div class="oversight-header-row">
            <span class="pulse-indicator"></span>
            <strong>Active Cashier on Duty: {{ activeShift.cashier_username || activeShift.cashier?.username || 'Frontline Staff' }}</strong>
            <span class="badge-status-open">{{ t('shift.activeBadge') }}</span>
          </div>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="m-label">{{ t('shift.openingFloat') }}</span>
              <span class="m-val">TSH {{ activeShift.opening_float }}</span>
            </div>
            <div class="metric-card">
              <span class="m-label">{{ t('dash.cash') }}</span>
              <span class="m-val">TSH {{ activeShift.total_sales_cash }}</span>
            </div>
            <div class="metric-card">
              <span class="m-label">{{ t('dash.mobileMoney') }}</span>
              <span class="m-val">TSH {{ activeShift.total_sales_mobile }}</span>
            </div>
            <div class="metric-card highlight">
              <span class="m-label">{{ t('shift.expectedCash') }}</span>
              <span class="m-val">TSH {{ expectedCash.toFixed(2) }}</span>
            </div>
          </div>
          <div class="oversight-footer-note">
            The assigned cashier will perform physical cash count and reconcile drawer variance at shift end.
          </div>
        </div>

        <div v-else class="empty-oversight-card">
          <div class="empty-icon-pill">
            <Clock :size="26" />
          </div>
          <h5>{{ t('shift.noActiveTitle') }} ({{ store.activeUnit?.toUpperCase() }})</h5>
          <p>{{ t('shift.noActiveDesc') }}</p>
        </div>

        <div class="oversight-actions">
          <button class="btn-close-oversight" @click="$emit('close')">{{ t('shift.closeOversight') }}</button>
        </div>
      </div>

      <!-- STATE 3: NO ACTIVE SHIFT (FRONTLINE CASHIER OPENS DRAWER) -->
      <div v-else-if="!activeShift" class="start-shift-view">
        <div class="info-card">
          <Banknote :size="32" class="info-icon" />
          <p>Register drawer is currently closed.</p>
          <span>Enter the starting opening float to begin recording sales for this shift.</span>
        </div>

        <div class="form-group">
          <label>Starting Opening Float (TSH):</label>
          <input 
            v-model.number="openingFloat" 
            type="number" 
            step="100"
            min="0"
            class="float-input"
            required
          />
        </div>

        <div v-if="errorMessage" class="error-msg">{{ errorMessage }}</div>

        <button 
          class="btn-start" 
          :disabled="loading"
          @click="handleStartShift"
        >
          {{ loading ? 'Opening Drawer...' : 'Open Shift Drawer' }}
        </button>
      </div>

      <!-- STATE 4: SHIFT ACTIVE (FRONTLINE CASHIER CLOSES DRAWER) -->
      <div v-else class="active-shift-view">
        <!-- Live Shift Metrics -->
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="m-label">Opening Float</span>
            <span class="m-val">TSH {{ activeShift.opening_float }}</span>
          </div>
          <div class="metric-card">
            <span class="m-label">Cash Sales</span>
            <span class="m-val">TSH {{ activeShift.total_sales_cash }}</span>
          </div>
          <div class="metric-card">
            <span class="m-label">Mobile Money</span>
            <span class="m-val">TSH {{ activeShift.total_sales_mobile }}</span>
          </div>
          <div class="metric-card highlight">
            <span class="m-label">Expected Drawer Cash</span>
            <span class="m-val">TSH {{ expectedCash.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Cash Count Input -->
        <div class="reconcile-card">
          <div class="form-group">
            <label>Physical Counted Cash in Drawer (TSH):</label>
            <input 
              v-model.number="countedCash" 
              type="number" 
              step="1"
              class="count-input"
            />
          </div>

          <!-- Dynamic Variance Box -->
          <div 
            class="variance-box"
            :class="cashVariance === 0 ? 'balanced' : cashVariance > 0 ? 'over' : 'short'"
          >
            <div class="var-title">
              {{ cashVariance === 0 ? '✓ Balanced (Zero Variance)' : cashVariance > 0 ? '▲ Cash Overage' : '▼ Cash Shortage' }}
            </div>
            <div class="var-val">TSH {{ cashVariance.toFixed(2) }}</div>
          </div>

          <div v-if="cashVariance !== 0" class="form-group">
            <label>Variance Explanation (Required if non-zero):</label>
            <input 
              v-model="varianceReason" 
              type="text" 
              placeholder="e.g. Float coin denomination difference / Customer change error"
              class="reason-input"
            />
          </div>
        </div>

        <div v-if="errorMessage" class="error-msg">{{ errorMessage }}</div>

        <button 
          class="btn-close-shift" 
          :disabled="loading"
          @click="handleCloseShift"
        >
          {{ loading ? 'Generating Z-Report...' : 'Close Shift & Generate Z-Report' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   SHIFT & Z-REPORT PAGE — LIGHT & DARK MODE + RESPONSIVE
   ============================================================ */
.shift-page {
  --sh-bg: #0b0f19;
  --sh-surface: #111827;
  --sh-card: #161f30;
  --sh-elevated: #1e293b;
  --sh-input: #0f1623;
  --sh-border: rgba(255, 255, 255, 0.09);
  --sh-border-strong: rgba(255, 255, 255, 0.18);
  --sh-text: #f8fafc;
  --sh-text-sec: #cbd5e1;
  --sh-text-muted: #94a3b8;
  --sh-accent: #6366f1;
  --sh-accent-hover: #4f46e5;
  --sh-accent-soft: rgba(99, 102, 241, 0.15);
  --sh-positive: #10b981;
  --sh-positive-soft: rgba(16, 185, 129, 0.14);
  --sh-danger: #f43f5e;
  --sh-danger-soft: rgba(244, 63, 94, 0.14);
  --sh-shadow: 0 2px 14px rgba(0, 0, 0, 0.25);

  width: 100%;
  min-height: 100vh;
  background: var(--sh-bg);
  color: var(--sh-text);
}

.shift-page[data-theme="light"] {
  --sh-bg: #f6f8fb;
  --sh-surface: #ffffff;
  --sh-card: #ffffff;
  --sh-elevated: #f1f5f9;
  --sh-input: #ffffff;
  --sh-border: #e2e8f0;
  --sh-border-strong: #cbd5e1;
  --sh-text: #0f172a;
  --sh-text-sec: #334155;
  --sh-text-muted: #64748b;
  --sh-accent: #4f46e5;
  --sh-accent-hover: #4338ca;
  --sh-accent-soft: #eef2ff;
  --sh-positive: #059669;
  --sh-positive-soft: #ecfdf5;
  --sh-danger: #e11d48;
  --sh-danger-soft: #fff1f2;
  --sh-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 6px 20px rgba(15, 23, 42, 0.03);
}

.modal-card {
  width: 100%;
  background: var(--sh-bg);
  color: var(--sh-text);
  display: flex;
  flex-direction: column;
}

.header {
  background: var(--sh-surface);
  border-bottom: 1px solid var(--sh-border);
  padding: 18px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon-tile {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--sh-elevated);
  border: 1px solid var(--sh-border);
  color: var(--sh-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--sh-text);
  margin: 0;
}

.subtitle {
  font-size: 0.84rem;
  color: var(--sh-text-muted);
  margin-top: 2px;
}

.btn-close {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 600;
  background: var(--sh-elevated);
  border: 1px solid var(--sh-border);
  color: var(--sh-text-sec);
}

.btn-close:hover {
  border-color: var(--sh-border-strong);
  color: var(--sh-text);
}

/* Main Centered Body */
.manager-oversight-view,
.start-shift-view,
.active-shift-view,
.z-report-view {
  width: 100%;
  max-width: 820px;
  margin: 28px auto;
  padding: 0 20px 36px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.oversight-hero,
.active-oversight-card,
.info-card,
.reconcile-card,
.z-receipt {
  background: var(--sh-surface);
  border: 1px solid var(--sh-border);
  border-radius: 18px;
  padding: 24px;
  box-shadow: var(--sh-shadow);
}

.oversight-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.hero-icon-pill,
.empty-icon-pill {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--sh-accent-soft);
  color: var(--sh-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.empty-icon-pill {
  background: var(--sh-elevated);
  color: var(--sh-text-muted);
}

.oversight-hero h4 {
  font-size: 1.08rem;
  font-weight: 800;
  color: var(--sh-text);
}

.oversight-hero p {
  font-size: 0.86rem;
  color: var(--sh-text-muted);
  max-width: 540px;
  line-height: 1.5;
}

.oversight-hero strong {
  color: var(--sh-text);
}

.empty-oversight-card {
  background: var(--sh-surface);
  border: 1px dashed var(--sh-border-strong);
  border-radius: 18px;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  box-shadow: var(--sh-shadow);
}

.empty-oversight-card h5 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--sh-text);
}

.empty-oversight-card p {
  font-size: 0.85rem;
  color: var(--sh-text-muted);
  max-width: 480px;
  line-height: 1.5;
}

.oversight-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.pulse-indicator {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--sh-positive);
}

.badge-status-open {
  margin-left: auto;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--sh-positive-soft);
  color: var(--sh-positive);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  background: var(--sh-elevated);
  border: 1px solid var(--sh-border);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-card.highlight {
  background: var(--sh-accent-soft);
  border-color: var(--sh-accent);
}

.m-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--sh-text-muted);
}

.m-val {
  font-size: 1.08rem;
  font-weight: 800;
  color: var(--sh-text);
  font-variant-numeric: tabular-nums;
}

.oversight-footer-note {
  margin-top: 14px;
  font-size: 0.8rem;
  color: var(--sh-text-muted);
}

.oversight-actions,
.z-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-close-oversight,
.btn-start,
.btn-done,
.btn-close-shift {
  padding: 11px 20px;
  border-radius: 11px;
  font-size: 0.88rem;
  font-weight: 700;
  background: var(--sh-accent);
  color: #ffffff;
  transition: all 0.16s ease;
}

.btn-close-oversight:hover,
.btn-start:hover,
.btn-done:hover,
.btn-close-shift:hover {
  background: var(--sh-accent-hover);
}

.btn-print {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 11px 18px;
  border-radius: 11px;
  font-size: 0.86rem;
  font-weight: 600;
  background: var(--sh-elevated);
  border: 1px solid var(--sh-border);
  color: var(--sh-text-sec);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--sh-text-sec);
}

.float-input,
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 11px 14px;
  border-radius: 10px;
  font-size: 0.95rem;
  background: var(--sh-input);
  border: 1px solid var(--sh-border-strong);
  color: var(--sh-text);
  outline: none;
}

.float-input:focus,
.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--sh-accent);
  box-shadow: 0 0 0 3px var(--sh-accent-soft);
}

.error-msg {
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--sh-danger-soft);
  color: var(--sh-danger);
  font-size: 0.84rem;
  font-weight: 600;
}

.z-header {
  text-align: center;
}

.z-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--sh-accent-soft);
  color: var(--sh-accent);
  margin-bottom: 6px;
}

.z-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--sh-text);
}

.z-time {
  font-size: 0.8rem;
  color: var(--sh-text-muted);
}

.z-row {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  font-size: 0.88rem;
  color: var(--sh-text-sec);
}

.z-row.bold {
  font-weight: 800;
  color: var(--sh-text);
}

.z-divider {
  height: 1px;
  background: var(--sh-border);
  margin: 8px 0;
}

.variance-row.balanced { color: var(--sh-positive); }
.variance-row.short { color: var(--sh-danger); }

@media (max-width: 640px) {
  .header {
    padding: 14px 16px;
  }

  .manager-oversight-view,
  .start-shift-view,
  .active-shift-view,
  .z-report-view {
    margin: 16px auto;
    padding: 0 12px 24px;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
