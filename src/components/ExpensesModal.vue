<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  DollarSign, Plus, Calendar, Filter, Trash2, X, RefreshCw, 
  CheckCircle2, AlertCircle, Building, Tag, FileText, Check, 
  ArrowDownRight, CreditCard, Banknote, Smartphone, ChevronRight
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const expenses = ref([])
const loading = ref(true)
const submitting = ref(false)
const showCreateDrawer = ref(false)
const selectedCategory = ref('all')
const selectedRange = ref('this_month')
const customStartDate = ref('')
const customEndDate = ref('')

const categories = [
  'Rent',
  'Transport & Fuel',
  'Electricity & Utilities',
  'Staff Salaries & Allowances',
  'Repairs & Maintenance',
  'Office Supplies & Packing',
  'Marketing & Advertising',
  'Bank Charges & Taxes',
  'Miscellaneous & Sundry',
]

const form = ref({
  title: '',
  category: 'Miscellaneous & Sundry',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  paid_to: '',
  payment_method: 'CASH',
  reference: '',
  notes: ''
})

const fetchExpenses = async () => {
  loading.value = true
  try {
    const params = {}
    if (selectedCategory.value !== 'all') params.category = selectedCategory.value
    
    // Date ranges
    const now = new Date()
    if (selectedRange.value === 'today') {
      const todayStr = now.toISOString().slice(0, 10)
      params.start_date = todayStr
      params.end_date = todayStr
    } else if (selectedRange.value === 'this_month') {
      params.start_date = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      params.end_date = now.toISOString().slice(0, 10)
    } else if (selectedRange.value === 'custom') {
      if (customStartDate.value) params.start_date = customStartDate.value
      if (customEndDate.value) params.end_date = customEndDate.value
    }

    const res = await api.get('/pos/expenses/', { params })
    expenses.value = res.data.results || []
  } catch (err) {
    store.showToast('Failed to load expense records.', 'error')
  } finally {
    loading.value = false
  }
}

const totalExpensesAmount = computed(() => {
  return expenses.value.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
})

const categoryBreakdown = computed(() => {
  const map = {}
  for (const exp of expenses.value) {
    const c = exp.category || 'Miscellaneous & Sundry'
    map[c] = (map[c] || 0) + (parseFloat(exp.amount) || 0)
  }
  return Object.entries(map).map(([category, amount]) => ({
    category,
    amount,
    percent: totalExpensesAmount.value > 0 ? (amount / totalExpensesAmount.value) * 100 : 0
  })).sort((a, b) => b.amount - a.amount)
})

const handleCreateExpense = async () => {
  if (!form.value.title.trim() || !form.value.amount || parseFloat(form.value.amount) <= 0) {
    store.showToast('Please enter a valid expense description and positive amount.', 'warning')
    return
  }

  submitting.value = true
  try {
    const res = await api.post('/pos/expenses/', {
      ...form.value,
      amount: parseFloat(form.value.amount)
    })
    store.playSound('beep')
    store.showToast(`Expense of TSH ${parseFloat(form.value.amount).toLocaleString()} recorded!`, 'success')
    showCreateDrawer.value = false
    form.value = {
      title: '',
      category: 'Miscellaneous & Sundry',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      paid_to: '',
      payment_method: 'CASH',
      reference: '',
      notes: ''
    }
    await fetchExpenses()
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to record expense.', 'error')
  } finally {
    submitting.value = false
  }
}

const handleDeleteExpense = async (exp) => {
  if (!confirm(`Are you sure you want to delete expense "${exp.title}" (TSH ${parseFloat(exp.amount).toLocaleString()})?`)) {
    return
  }

  try {
    await api.delete(`/pos/expenses/${exp.id}/`)
    store.showToast('Expense record deleted.', 'info')
    await fetchExpenses()
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to delete expense.', 'error')
  }
}

onMounted(() => {
  fetchExpenses()
})
</script>

<template>
  <div class="modal-overlay expenses-page" :data-theme="store.theme">
    <div class="modal-card">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-left">
          <div class="header-icon-box">
            <DollarSign :size="24" />
          </div>
          <div>
            <div class="title-row">
              <h3 class="title">Operating Expenses Management</h3>
              <span class="segment-badge">
                {{ store.activeUnit === 'bar' ? 'BAR & LOUNGE' : store.activeUnit === 'stationery' ? 'STATIONERY & RETAIL' : 'ALL BUSINESSES' }}
              </span>
            </div>
            <p class="subtitle">Record business running costs (rent, utilities, fuel, salaries) to calculate true Net Profit.</p>
          </div>
        </div>

        <div class="header-right">
          <button class="btn-primary-add" @click="showCreateDrawer = true">
            <Plus :size="16" />
            <span>Record New Expense</span>
          </button>
          <button class="btn-close" @click="$emit('close')" title="Back to POS">
            <X :size="16" />
            <span>Back to POS</span>
          </button>
        </div>
      </div>

      <!-- Main Body -->
      <div class="modal-content">
        <!-- Top Metrics Grid -->
        <div class="metrics-grid">
          <div class="metric-card total-card">
            <span class="m-label">Total Expenses (Selected Period)</span>
            <strong class="m-val text-red">TSH {{ totalExpensesAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
            <span class="m-sub">{{ expenses.length }} transactions recorded</span>
          </div>

          <div class="metric-card">
            <span class="m-label">Primary Expense Category</span>
            <strong class="m-val text-amber">{{ categoryBreakdown[0]?.category || 'None' }}</strong>
            <span class="m-sub">{{ categoryBreakdown[0] ? `TSH ${categoryBreakdown[0].amount.toLocaleString()} (${categoryBreakdown[0].percent.toFixed(1)}%)` : 'No expenses recorded' }}</span>
          </div>

          <div class="metric-card">
            <span class="m-label">Net Profit Impact</span>
            <strong class="m-val text-cyan">Deducted from Gross Profit</strong>
            <span class="m-sub">Reflected in comprehensive P&L reports</span>
          </div>
        </div>

        <!-- Filter Toolbar -->
        <div class="toolbar">
          <div class="toolbar-filters">
            <!-- Period Filter -->
            <div class="filter-group">
              <Calendar :size="14" class="text-slate-400" />
              <select v-model="selectedRange" @change="fetchExpenses" class="select-filter">
                <option value="today">Today</option>
                <option value="this_month">This Month</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            <!-- Custom Date Inputs -->
            <div v-if="selectedRange === 'custom'" class="custom-dates">
              <input type="date" v-model="customStartDate" class="date-input" />
              <span>to</span>
              <input type="date" v-model="customEndDate" class="date-input" />
              <button class="btn-apply" @click="fetchExpenses">Apply</button>
            </div>

            <!-- Category Filter -->
            <div class="filter-group">
              <Tag :size="14" class="text-slate-400" />
              <select v-model="selectedCategory" @change="fetchExpenses" class="select-filter">
                <option value="all">All Categories</option>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
          </div>

          <button class="btn-refresh" @click="fetchExpenses" title="Refresh">
            <RefreshCw :size="15" :class="{ 'spin-anim': loading }" />
          </button>
        </div>

        <!-- Two Column Layout: Expense Records (Left) + Category Breakdown (Right) -->
        <div class="expenses-layout">
          <!-- Left: Expenses Table -->
          <div class="table-container">
            <table class="expenses-table">
              <thead>
                <tr>
                  <th>Date & Ref</th>
                  <th>Title / Description</th>
                  <th>Category</th>
                  <th>Paid To</th>
                  <th>Method</th>
                  <th class="text-right">Amount (TSH)</th>
                  <th class="text-center" v-if="store.isManagement">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="state-cell">
                    <RefreshCw :size="20" class="spin-anim text-amber" />
                    <span>Loading expense records...</span>
                  </td>
                </tr>
                <tr v-else-if="expenses.length === 0">
                  <td colspan="7" class="state-cell">
                    <DollarSign :size="28" class="text-slate-500" />
                    <p>No expense records found for the selected period.</p>
                  </td>
                </tr>
                <tr v-for="exp in expenses" :key="exp.id">
                  <td>
                    <div class="date-cell">
                      <span class="exp-date">{{ exp.date }}</span>
                      <span class="exp-id">{{ exp.id }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="title-cell">
                      <strong class="exp-title">{{ exp.title }}</strong>
                      <span v-if="exp.notes" class="exp-notes">{{ exp.notes }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="cat-pill">{{ exp.category }}</span>
                  </td>
                  <td>
                    <span class="paid-to">{{ exp.paid_to || '—' }}</span>
                  </td>
                  <td>
                    <span class="method-tag">{{ exp.payment_method }}</span>
                  </td>
                  <td class="text-right amount-col">
                    <strong>TSH {{ parseFloat(exp.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  </td>
                  <td class="text-center" v-if="store.isManagement">
                    <button class="btn-delete" @click="handleDeleteExpense(exp)" title="Delete expense record">
                      <Trash2 :size="14" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Right: Category Distribution -->
          <div class="breakdown-pane">
            <h5 class="breakdown-title">Spending by Category</h5>
            <div v-if="categoryBreakdown.length === 0" class="empty-breakdown">
              No expenses in period.
            </div>
            <div v-else class="breakdown-list">
              <div v-for="b in categoryBreakdown" :key="b.category" class="breakdown-item">
                <div class="b-row">
                  <span class="b-cat">{{ b.category }}</span>
                  <span class="b-amt">TSH {{ b.amount.toLocaleString() }}</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: `${b.percent}%` }"></div>
                </div>
                <span class="b-percent">{{ b.percent.toFixed(1) }}% of total spending</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Slide-Over Drawer: Record Expense -->
      <transition name="drawer-slide">
        <div v-if="showCreateDrawer" class="drawer-overlay" @click.self="showCreateDrawer = false">
          <div class="drawer-panel">
            <div class="drawer-header">
              <div class="drawer-title-group">
                <Plus :size="20" class="text-amber" />
                <h4>Record Business Expense</h4>
              </div>
              <button class="btn-close" @click="showCreateDrawer = false"><X :size="18" /></button>
            </div>

            <form @submit.prevent="handleCreateExpense" class="drawer-body">
              <div class="form-group">
                <label>Expense Description / Title <span class="req">*</span></label>
                <input 
                  v-model="form.title" 
                  type="text" 
                  placeholder="e.g. Shop monthly rent, delivery fuel, paper cartons packing" 
                  required 
                  class="form-input"
                />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Category <span class="req">*</span></label>
                  <select v-model="form.category" class="form-select" required>
                    <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Amount in TSH <span class="req">*</span></label>
                  <input 
                    v-model="form.amount" 
                    type="number" 
                    min="100" 
                    step="50" 
                    placeholder="e.g. 50000" 
                    required 
                    class="form-input"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Date of Expense</label>
                  <input v-model="form.date" type="date" class="form-input" required />
                </div>

                <div class="form-group">
                  <label>Payment Method</label>
                  <select v-model="form.payment_method" class="form-select">
                    <option value="CASH">Cash Drawer</option>
                    <option value="MOBILE_MONEY">Mobile Money (M-Pesa / Tigo)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Paid To / Vendor / Beneficiary</label>
                  <input v-model="form.paid_to" type="text" placeholder="e.g. Landlord, TANESCO, Fuel Station" class="form-input" />
                </div>

                <div class="form-group">
                  <label>Reference / Receipt #</label>
                  <input v-model="form.reference" type="text" placeholder="e.g. TAN-9281, Rec #402" class="form-input" />
                </div>
              </div>

              <div class="form-group">
                <label>Additional Notes</label>
                <textarea v-model="form.notes" rows="2" placeholder="Optional background details or reason..." class="form-textarea"></textarea>
              </div>

              <div class="drawer-footer">
                <button type="button" class="btn-cancel" @click="showCreateDrawer = false">Cancel</button>
                <button type="submit" class="btn-save" :disabled="submitting">
                  <RefreshCw v-if="submitting" :size="16" class="spin-anim" />
                  <Check v-else :size="16" />
                  <span>{{ submitting ? 'Saving Expense...' : 'Save Expense Record' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   OPERATING EXPENSES PAGE — LIGHT & DARK MODE + RESPONSIVE
   ============================================================ */
.expenses-page {
  --e-bg: #0a0e17;
  --e-surface: #111827;
  --e-card: #161f30;
  --e-elevated: #1e293b;
  --e-input: #0f1623;
  --e-border: rgba(255, 255, 255, 0.09);
  --e-border-strong: rgba(255, 255, 255, 0.18);
  --e-text: #f8fafc;
  --e-text-sec: #cbd5e1;
  --e-text-muted: #94a3b8;
  --e-accent: #6366f1;
  --e-accent-hover: #4f46e5;
  --e-accent-soft: rgba(99, 102, 241, 0.16);
  --e-amber: #f59e0b;
  --e-amber-soft: rgba(245, 158, 11, 0.14);
  --e-cyan: #06b6d4;
  --e-red: #f43f5e;
  --e-red-soft: rgba(244, 63, 94, 0.14);
  --e-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);

  color: var(--e-text);
}

.expenses-page[data-theme="light"] {
  --e-bg: #f1f5f9;
  --e-surface: #ffffff;
  --e-card: #ffffff;
  --e-elevated: #f8fafc;
  --e-input: #ffffff;
  --e-border: #e2e8f0;
  --e-border-strong: #cbd5e1;
  --e-text: #0f172a;
  --e-text-sec: #334155;
  --e-text-muted: #64748b;
  --e-accent: #4f46e5;
  --e-accent-hover: #4338ca;
  --e-accent-soft: #eef2ff;
  --e-amber: #d97706;
  --e-amber-soft: #fffbeb;
  --e-cyan: #0891b2;
  --e-red: #e11d48;
  --e-red-soft: #fff1f2;
  --e-shadow: 0 2px 12px rgba(15, 23, 42, 0.05);
}

.modal-card {
  background: var(--e-bg);
  color: var(--e-text);
  display: flex;
  flex-direction: column;
}

.modal-header {
  background: var(--e-surface);
  border-bottom: 1px solid var(--e-border);
  padding: 18px 24px;
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

.header-icon-box {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: var(--e-elevated);
  border: 1px solid var(--e-border);
  color: var(--e-amber);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--e-text);
  margin: 0;
}

.segment-badge {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--e-amber-soft);
  color: var(--e-amber);
}

.subtitle {
  font-size: 0.84rem;
  color: var(--e-text-muted);
  margin-top: 3px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-primary-add {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 0.86rem;
  font-weight: 700;
  background: var(--e-accent);
  color: #ffffff;
  transition: all 0.18s ease;
}

.btn-primary-add:hover {
  background: var(--e-accent-hover);
  transform: translateY(-1px);
}

.btn-close {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 600;
  background: var(--e-elevated);
  border: 1px solid var(--e-border);
  color: var(--e-text-sec);
}

.btn-close:hover {
  border-color: var(--e-border-strong);
  color: var(--e-text);
}

.modal-content {
  padding: 20px 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
}

/* Metrics */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  background: var(--e-card);
  border: 1px solid var(--e-border);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: var(--e-shadow);
}

.m-label {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--e-text-muted);
}

.m-val {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--e-text);
}

.m-sub {
  font-size: 0.8rem;
  color: var(--e-text-muted);
}

/* Toolbar */
.toolbar {
  background: var(--e-surface);
  border: 1px solid var(--e-border);
  border-radius: 14px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  box-shadow: var(--e-shadow);
}

.toolbar-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-filter,
.date-input {
  padding: 8px 11px;
  border-radius: 9px;
  font-size: 0.84rem;
  background: var(--e-input);
  border: 1px solid var(--e-border-strong);
  color: var(--e-text);
  outline: none;
}

.custom-dates {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-apply,
.btn-refresh {
  padding: 8px 12px;
  border-radius: 9px;
  font-size: 0.82rem;
  font-weight: 600;
  background: var(--e-elevated);
  border: 1px solid var(--e-border);
  color: var(--e-text-sec);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Main 2-column Layout */
.expenses-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
  align-items: start;
}

.table-container {
  background: var(--e-surface);
  border: 1px solid var(--e-border);
  border-radius: 16px;
  overflow-x: auto;
  box-shadow: var(--e-shadow);
}

.expenses-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 680px;
}

.expenses-table th {
  text-align: left;
  padding: 13px 16px;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--e-text-muted);
  background: var(--e-elevated);
  border-bottom: 1px solid var(--e-border);
}

.expenses-table td {
  padding: 13px 16px;
  font-size: 0.85rem;
  color: var(--e-text-sec);
  border-bottom: 1px solid var(--e-border);
  vertical-align: middle;
}

.date-cell,
.title-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.exp-date,
.exp-title {
  color: var(--e-text);
  font-weight: 700;
}

.exp-id,
.exp-notes {
  font-size: 0.75rem;
  color: var(--e-text-muted);
}

.cat-pill,
.method-tag {
  display: inline-block;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--e-elevated);
  border: 1px solid var(--e-border);
  color: var(--e-text-sec);
}

.amount-col strong {
  color: var(--e-red);
  font-variant-numeric: tabular-nums;
}

.btn-delete {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--e-red-soft);
  color: var(--e-red);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.state-cell {
  text-align: center;
  padding: 52px 20px !important;
  color: var(--e-text-muted);
}

.state-cell p {
  margin-top: 8px;
  font-size: 0.88rem;
}

/* Breakdown Pane */
.breakdown-pane {
  background: var(--e-surface);
  border: 1px solid var(--e-border);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: var(--e-shadow);
}

.breakdown-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--e-text);
  margin-bottom: 14px;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.b-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.84rem;
}

.b-cat {
  font-weight: 700;
  color: var(--e-text);
}

.b-amt {
  font-weight: 700;
  color: var(--e-text-sec);
}

.progress-track {
  height: 7px;
  border-radius: 999px;
  background: var(--e-elevated);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--e-accent);
}

.b-percent {
  font-size: 0.74rem;
  color: var(--e-text-muted);
}

/* Drawer */
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 2100;
  background: rgba(6, 10, 20, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 100%;
  max-width: 440px;
  height: 100%;
  background: var(--e-surface);
  border-left: 1px solid var(--e-border);
  display: flex;
  flex-direction: column;
  color: var(--e-text);
}

.drawer-header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--e-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer-title-group h4 {
  font-size: 1rem;
  font-weight: 800;
  margin: 0;
}

.drawer-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--e-text-sec);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.88rem;
  background: var(--e-input);
  border: 1px solid var(--e-border-strong);
  color: var(--e-text);
  outline: none;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.drawer-footer {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel {
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 0.86rem;
  font-weight: 600;
  background: var(--e-elevated);
  border: 1px solid var(--e-border);
  color: var(--e-text-sec);
}

.btn-submit {
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 0.86rem;
  font-weight: 700;
  background: var(--e-accent);
  color: #ffffff;
}

.text-red { color: var(--e-red); }
.text-amber { color: var(--e-amber); }
.text-cyan { color: var(--e-cyan); }
.text-right { text-align: right; }
.text-center { text-align: center; }

.spin-anim {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1024px) {
  .expenses-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .modal-content {
    padding: 14px;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
