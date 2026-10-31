<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import { Clock, Banknote, Smartphone, CheckCircle2, AlertTriangle, Printer, X } from 'lucide-vue-next'

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
  <div class="modal-overlay">
    <div class="modal-card">
      <div class="header">
        <div class="header-left">
          <Clock :size="24" class="header-icon" />
          <div>
            <h3 class="title">Register Shift & Z-Report</h3>
            <p class="subtitle">Cash drawer balancing and end-of-shift reconciliation</p>
          </div>
        </div>
        <button class="btn-close" @click="$emit('close')">
          <X :size="18" />
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
            <span>ZMW {{ zReportData.opening_float }}</span>
          </div>
          <div class="z-row">
            <span>Cash Sales:</span>
            <span>ZMW {{ zReportData.total_sales_cash }}</span>
          </div>
          <div class="z-row">
            <span>Mobile Money Sales:</span>
            <span>ZMW {{ zReportData.total_sales_mobile }}</span>
          </div>
          <div class="z-row bold">
            <span>Total Gross Sales:</span>
            <span>ZMW {{ zReportData.total_sales_gross }}</span>
          </div>
          <div class="z-divider"></div>
          <div class="z-row">
            <span>Expected Cash:</span>
            <span>ZMW {{ zReportData.expected_cash_in_drawer }}</span>
          </div>
          <div class="z-row bold">
            <span>Actual Counted Cash:</span>
            <span>ZMW {{ zReportData.counted_cash }}</span>
          </div>
          <div class="z-row variance-row" :class="Number(zReportData.variance) === 0 ? 'balanced' : 'short'">
            <span>Cash Variance:</span>
            <strong>ZMW {{ zReportData.variance }}</strong>
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

      <!-- STATE 2: NO ACTIVE SHIFT (START SHIFT) -->
      <div v-else-if="!activeShift" class="start-shift-view">
        <div class="info-card">
          <Banknote :size="32" class="info-icon" />
          <p>Register drawer is currently closed.</p>
          <span>Enter the starting opening float to begin recording sales for this shift.</span>
        </div>

        <div class="form-group">
          <label>Starting Opening Float (ZMW):</label>
          <input 
            v-model.number="openingFloat" 
            type="number" 
            step="10"
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

      <!-- STATE 3: SHIFT ACTIVE (RECONCILIATION & CLOSE) -->
      <div v-else class="active-shift-view">
        <!-- Live Shift Metrics -->
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="m-label">Opening Float</span>
            <span class="m-val">ZMW {{ activeShift.opening_float }}</span>
          </div>
          <div class="metric-card">
            <span class="m-label">Cash Sales</span>
            <span class="m-val">ZMW {{ activeShift.total_sales_cash }}</span>
          </div>
          <div class="metric-card">
            <span class="m-label">Mobile Money</span>
            <span class="m-val">ZMW {{ activeShift.total_sales_mobile }}</span>
          </div>
          <div class="metric-card highlight">
            <span class="m-label">Expected Drawer Cash</span>
            <span class="m-val">ZMW {{ expectedCash.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Cash Count Input -->
        <div class="reconcile-card">
          <div class="form-group">
            <label>Physical Counted Cash in Drawer (ZMW):</label>
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
            <div class="var-val">ZMW {{ cashVariance.toFixed(2) }}</div>
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
  max-width: 520px;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  padding: 24px;
}

.header {
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

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.metric-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
}

.metric-card.highlight {
  grid-column: span 2;
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
}

.m-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.m-val {
  font-size: 16px;
  font-weight: 800;
  color: #f8fafc;
}

.reconcile-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 6px;
}

.count-input, .float-input {
  width: 100%;
  font-size: 24px;
  font-weight: 800;
  color: #fbbf24;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 10px 14px;
  text-align: center;
  outline: none;
}

.reason-input {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 13px;
  outline: none;
}

.variance-box {
  margin: 12px 0;
  padding: 12px;
  border-radius: 10px;
  text-align: center;
}

.variance-box.balanced {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
}

.variance-box.short {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
}

.variance-box.over {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fbbf24;
}

.var-title {
  font-size: 12px;
  font-weight: 700;
}

.var-val {
  font-size: 20px;
  font-weight: 900;
}

.btn-close-shift {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
  font-weight: 800;
  font-size: 15px;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.35);
}

.btn-start {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  font-weight: 800;
  font-size: 15px;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
  margin-top: 16px;
}

/* Z-Report View */
.z-report-view {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
}

.z-header {
  text-align: center;
  margin-bottom: 16px;
}

.z-badge {
  display: inline-block;
  background: #fbbf24;
  color: #111827;
  font-size: 11px;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
}

.z-title {
  font-size: 16px;
  font-weight: 800;
  color: #fff;
}

.z-time {
  font-size: 11px;
  color: #64748b;
}

.z-receipt {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: monospace;
  font-size: 13px;
  color: #cbd5e1;
  background: #020617;
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 16px;
}

.z-row {
  display: flex;
  justify-content: space-between;
}

.z-row.bold {
  font-weight: bold;
  color: #fff;
}

.z-row.variance-row.short {
  color: #f87171;
}

.z-row.variance-row.balanced {
  color: #34d399;
}

.z-divider {
  border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
  margin: 6px 0;
}

.z-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.btn-print {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: #1e293b;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
}

.btn-done {
  padding: 10px;
  border-radius: 10px;
  background: #f59e0b;
  color: #111827;
  font-weight: 800;
  font-size: 13px;
}
</style>
