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
  <div class="modal-overlay" @click.self="$emit('close')">
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
              <span class="segment-badge">STATIONERY & RETAIL</span>
            </div>
            <p class="subtitle">Record business running costs (rent, utilities, fuel, salaries) to calculate true Net Profit.</p>
          </div>
        </div>

        <div class="header-right">
          <button class="btn-primary-add" @click="showCreateDrawer = true">
            <Plus :size="16" />
            <span>Record New Expense</span>
          </button>
          <button class="btn-close" @click="$emit('close')">
            <X :size="18" />
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
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 14, 0.88);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 1080px;
  max-height: 92vh;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 16px 24px;
  background: rgba(17, 24, 39, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #f8fafc;
}

.segment-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(6, 182, 212, 0.15);
  border: 1px solid rgba(6, 182, 212, 0.4);
  color: #22d3ee;
}

.subtitle {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-primary-add {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #fff;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
}

.btn-primary-add:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(239, 68, 68, 0.5);
}

.btn-close {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  border-radius: 8px;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.modal-content {
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 12px;
}

.metric-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
}

.m-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

.m-val {
  font-size: 20px;
  font-weight: 900;
  margin: 4px 0 2px;
}

.text-red { color: #f87171; }
.text-amber { color: #fbbf24; }
.text-cyan { color: #22d3ee; }

.m-sub {
  font-size: 11px;
  color: #64748b;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 6px 10px;
}

.select-filter {
  background: transparent;
  border: none;
  color: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
}

.select-filter option {
  background: #111827;
  color: #f8fafc;
}

.custom-dates {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.date-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11.5px;
}

.btn-apply {
  background: #3b82f6;
  border: none;
  color: #fff;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.btn-refresh {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  border-radius: 8px;
  padding: 7px;
  cursor: pointer;
}

.btn-refresh:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }

.expenses-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  min-height: 380px;
}

.table-container {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow-y: auto;
  max-height: 480px;
}

.expenses-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.expenses-table th {
  position: sticky;
  top: 0;
  background: #182234;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 2;
}

.expenses-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 12.5px;
  color: #cbd5e1;
}

.date-cell {
  display: flex;
  flex-direction: column;
}

.exp-date {
  font-weight: 700;
  color: #f8fafc;
}

.exp-id {
  font-size: 10px;
  color: #64748b;
  font-family: monospace;
}

.title-cell {
  display: flex;
  flex-direction: column;
}

.exp-title {
  color: #f8fafc;
}

.exp-notes {
  font-size: 11px;
  color: #94a3b8;
}

.cat-pill {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.method-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}

.amount-col {
  color: #f87171;
  font-weight: 800;
}

.btn-delete {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 5px;
  border-radius: 6px;
  opacity: 0.7;
}

.btn-delete:hover {
  opacity: 1;
  background: rgba(239, 68, 68, 0.15);
}

.breakdown-pane {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.breakdown-title {
  margin: 0 0 14px 0;
  font-size: 13px;
  font-weight: 800;
  color: #f8fafc;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  max-height: 420px;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.b-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.b-cat { color: #f1f5f9; font-weight: 600; }
.b-amt { color: #fca5a5; font-weight: 700; }

.progress-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #f59e0b);
  border-radius: 3px;
}

.b-percent {
  font-size: 10.5px;
  color: #64748b;
  text-align: right;
}

.state-cell {
  text-align: center;
  padding: 40px !important;
  color: #94a3b8;
}

/* Slide Drawer */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  justify-content: flex-end;
  z-index: 1100;
}

.drawer-panel {
  width: 100%;
  max-width: 440px;
  height: 100%;
  background: #111827;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  box-shadow: -15px 0 35px rgba(0, 0, 0, 0.6);
}

.drawer-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-title-group h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #f8fafc;
}

.drawer-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  flex: 1;
}

.form-group label {
  display: block;
  font-size: 11.5px;
  font-weight: 700;
  color: #cbd5e1;
  margin-bottom: 5px;
}

.req { color: #f87171; }

.form-input, .form-select, .form-textarea {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 9px 12px;
  color: #f8fafc;
  font-size: 13px;
  outline: none;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.drawer-footer {
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: auto;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 12.5px;
  cursor: pointer;
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #fff;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.spin-anim {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Light Mode Overrides */
:root[data-theme="light"] .modal-card,
:root[data-theme="light"] .drawer-panel {
  background: #ffffff;
  border-color: #cbd5e1;
}

:root[data-theme="light"] .modal-header,
:root[data-theme="light"] .drawer-header {
  background: #f8fafc;
  border-bottom-color: #e2e8f0;
}

:root[data-theme="light"] .title,
:root[data-theme="light"] .drawer-title-group h4,
:root[data-theme="light"] .breakdown-title,
:root[data-theme="light"] .exp-title,
:root[data-theme="light"] .b-cat {
  color: #0f172a;
}

:root[data-theme="light"] .metric-card,
:root[data-theme="light"] .breakdown-pane,
:root[data-theme="light"] .table-container {
  background: #f8fafc;
  border-color: #e2e8f0;
}

:root[data-theme="light"] .expenses-table th {
  background: #f1f5f9;
  color: #475569;
}

:root[data-theme="light"] .expenses-table td {
  border-bottom-color: #f1f5f9;
  color: #334155;
}

:root[data-theme="light"] .form-input,
:root[data-theme="light"] .form-select,
:root[data-theme="light"] .form-textarea {
  background: #ffffff;
  border-color: #cbd5e1;
  color: #0f172a;
}
</style>

