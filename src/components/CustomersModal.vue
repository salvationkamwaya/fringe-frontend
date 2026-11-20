<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import api from '../api'
import { 
  Users, UserPlus, Search, DollarSign, Calendar, Clock, 
  FileText, ArrowDownLeft, X, CheckCircle2, AlertCircle, 
  Phone, Mail, MapPin, Receipt, ShieldCheck, ChevronRight
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const activeTab = ref('directory') // 'directory' | 'aging'
const customers = ref([])
const agingData = ref(null)
const searchQuery = ref('')
const loading = ref(false)

// Modals inside Customers
const showRegisterModal = ref(false)
const showPaymentModal = ref(false)
const showStatementModal = ref(false)

const selectedCustomer = ref(null)
const customerStatement = ref(null)

// Register Form State
const regForm = ref({
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  credit_limit: '1500.00',
  notes: ''
})

// Repayment Form State
const paymentForm = ref({
  amount: '',
  payment_method: 'CASH',
  reference: '',
  notes: ''
})
const paymentSubmitting = ref(false)
const paymentError = ref('')

// Fetch Customers List
const fetchCustomers = async () => {
  loading.value = true
  try {
    const res = await api.get('/pos/customers/')
    customers.value = res.data
  } catch (err) {
    store.showToast('Failed to load customers.', 'error')
  } finally {
    loading.value = false
  }
}

// Fetch Debtors Aging Report
const fetchAgingReport = async () => {
  loading.value = true
  try {
    const res = await api.get('/pos/debtors-aging/')
    agingData.value = res.data
  } catch (err) {
    store.showToast('Failed to load debtors aging report.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCustomers()
  fetchAgingReport()
})

const filteredCustomers = computed(() => {
  if (!searchQuery.value) return customers.value
  const q = searchQuery.value.toLowerCase()
  return customers.value.filter(c => 
    c.name.toLowerCase().includes(q) || 
    (c.phone && c.phone.includes(q)) ||
    (c.contact_person && c.contact_person.toLowerCase().includes(q))
  )
})

// Register customer handler
const handleRegisterCustomer = async () => {
  if (!regForm.value.name.trim()) {
    store.showToast('Customer business or individual name is required.', 'error')
    return
  }

  try {
    const res = await api.post('/pos/customers/', regForm.value)
    store.showToast(`Customer "${res.data.name}" registered successfully!`, 'success')
    showRegisterModal.value = false
    regForm.value = {
      name: '', contact_person: '', phone: '', email: '',
      address: '', credit_limit: '1500.00', notes: ''
    }
    await fetchCustomers()
    await fetchAgingReport()
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Registration failed.', 'error')
  }
}

// Open Payment Dialog
const openPaymentDialog = (cust) => {
  selectedCustomer.value = cust
  paymentForm.value = {
    amount: '',
    payment_method: 'CASH',
    reference: '',
    notes: ''
  }
  paymentError.value = ''
  showPaymentModal.value = true
}

// Submit Customer Repayment
const submitRepayment = async () => {
  if (!selectedCustomer.value) return
  paymentSubmitting.value = true
  paymentError.value = ''

  try {
    const res = await api.post(`/pos/customers/${selectedCustomer.value.id}/record_payment/`, paymentForm.value)
    store.showToast(`Repayment of TSH ${paymentForm.value.amount} recorded for ${selectedCustomer.value.name}!`, 'success')
    showPaymentModal.value = false
    await fetchCustomers()
    await fetchAgingReport()
    await store.fetchActiveShift()
  } catch (err) {
    paymentError.value = err.response?.data?.error || 'Failed to record repayment.'
  } finally {
    paymentSubmitting.value = false
  }
}

// Open Statement Dialog
const openStatementDialog = async (cust) => {
  selectedCustomer.value = cust
  showStatementModal.value = true
  try {
    const res = await api.get(`/pos/customers/${cust.id}/statement/`)
    customerStatement.value = res.data
  } catch (err) {
    store.showToast('Failed to fetch account statement.', 'error')
  }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="customers-window">
      <!-- Modal Header -->
      <div class="window-header">
        <div class="header-branding">
          <div class="header-icon-box">
            <Users :size="22" />
          </div>
          <div>
            <h2>{{ t('cust.title') }}</h2>
            <span class="subtitle">{{ t('cust.subtitle') }}</span>
          </div>
        </div>

        <div class="header-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'directory' }"
            @click="activeTab = 'directory'"
          >
            <span>{{ t('cust.tabDirectory') }}</span>
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'aging' }"
            @click="activeTab = 'aging'"
          >
            <span>{{ t('cust.tabAging') }}</span>
          </button>
        </div>

        <button class="btn-close-window" @click="emit('close')" :title="t('common.backToPos')">
          <X :size="16" />
          <span>{{ t('common.backToPos') }}</span>
        </button>
      </div>

      <!-- TAB 1: CUSTOMER DIRECTORY -->
      <div v-if="activeTab === 'directory'" class="tab-content">
        <!-- Directory Toolbar -->
        <div class="toolbar">
          <div class="search-bar">
            <Search :size="18" class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              :placeholder="t('cust.searchPlaceholder')" 
              class="search-input"
            />
          </div>

          <button class="btn-add-customer" @click="showRegisterModal = true">
            <UserPlus :size="18" />
            <span>{{ t('cust.registerNew') }}</span>
          </button>
        </div>

        <!-- Customers Grid / List -->
        <div class="customers-scroll">
          <div v-if="loading" class="state-placeholder">
            <div class="spinner"></div>
            <p>{{ t('common.refresh') }}...</p>
          </div>

          <div v-else-if="filteredCustomers.length === 0" class="state-placeholder">
            <Users :size="48" class="empty-icon" />
            <h3>{{ t('cust.emptyTitle') }}</h3>
            <p>{{ t('cust.emptySub') }}</p>
          </div>

          <div v-else class="customer-cards-grid">
            <div 
              v-for="cust in filteredCustomers" 
              :key="cust.id" 
              class="customer-card"
              :class="{ 'card-debt': parseFloat(cust.current_balance) > 0 }"
            >
              <div class="card-top">
                <div class="customer-title-block">
                  <h3 class="cust-title">{{ cust.name }}</h3>
                  <span v-if="cust.contact_person" class="cust-rep">Attn: {{ cust.contact_person }}</span>
                </div>
                <div 
                  class="balance-tag" 
                  :class="parseFloat(cust.current_balance) > 0 ? 'tag-debt' : 'tag-clear'"
                >
                  {{ parseFloat(cust.current_balance) > 0 ? 'DEBT DUE' : 'CLEAR' }}
                </div>
              </div>

              <!-- Contact Info -->
              <div class="contact-details">
                <div v-if="cust.phone" class="detail-item">
                  <Phone :size="14" />
                  <span>{{ cust.phone }}</span>
                </div>
                <div v-if="cust.email" class="detail-item">
                  <Mail :size="14" />
                  <span>{{ cust.email }}</span>
                </div>
              </div>

              <!-- Financials KPI Strip -->
              <div class="financials-strip">
                <div class="fin-box">
                  <span class="fin-label">Credit Limit</span>
                  <span class="fin-val">TSH {{ parseFloat(cust.credit_limit).toFixed(2) }}</span>
                </div>
                <div class="fin-box">
                  <span class="fin-label">Amount Owed</span>
                  <span class="fin-val fin-debt">TSH {{ parseFloat(cust.current_balance).toFixed(2) }}</span>
                </div>
                <div class="fin-box">
                  <span class="fin-label">Available</span>
                  <span class="fin-val fin-avail">TSH {{ parseFloat(cust.available_credit).toFixed(2) }}</span>
                </div>
              </div>

              <!-- Card Action Buttons -->
              <div class="card-actions-bar">
                <button 
                  v-if="parseFloat(cust.current_balance) > 0"
                  class="btn-card-action btn-repay" 
                  @click="openPaymentDialog(cust)"
                >
                  <DollarSign :size="15" />
                  <span>Record Payment</span>
                </button>
                <button 
                  class="btn-card-action btn-statement" 
                  @click="openStatementDialog(cust)"
                >
                  <Receipt :size="15" />
                  <span>Statement</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: DEBTORS AGING REPORT -->
      <div v-else-if="activeTab === 'aging'" class="tab-content aging-content">
        <div v-if="agingData" class="aging-wrapper">
          <!-- Summary KPIs Banner -->
          <div class="aging-kpis-grid">
            <div class="kpi-card kpi-current">
              <span class="kpi-label">Current (0-30 Days)</span>
              <div class="kpi-value">TSH {{ agingData.summary.total_current }}</div>
              <span class="kpi-sub">Within standard term</span>
            </div>

            <div class="kpi-card kpi-30">
              <span class="kpi-label">31 - 60 Days</span>
              <div class="kpi-value">TSH {{ agingData.summary.total_31_60 }}</div>
              <span class="kpi-sub">Due for reminder</span>
            </div>

            <div class="kpi-card kpi-60">
              <span class="kpi-label">61 - 90 Days</span>
              <div class="kpi-value">TSH {{ agingData.summary.total_61_90 }}</div>
              <span class="kpi-sub">Critical overdue</span>
            </div>

            <div class="kpi-card kpi-90">
              <span class="kpi-label">90+ Days (Delinquent)</span>
              <div class="kpi-value">TSH {{ agingData.summary.total_90_plus }}</div>
              <span class="kpi-sub">Account hold review</span>
            </div>

            <div class="kpi-card kpi-grand">
              <span class="kpi-label">Grand Total Debtors</span>
              <div class="kpi-value text-cyan">TSH {{ agingData.summary.grand_total_debt }}</div>
              <span class="kpi-sub">{{ agingData.summary.debtors_count }} Outstanding Accounts</span>
            </div>
          </div>

          <!-- Aging Breakdown Table -->
          <div class="aging-table-container">
            <table class="aging-table">
              <thead>
                <tr>
                  <th>Customer / Account</th>
                  <th>Phone Contact</th>
                  <th class="text-right">Credit Limit</th>
                  <th class="text-right">0-30 Days</th>
                  <th class="text-right">31-60 Days</th>
                  <th class="text-right">61-90 Days</th>
                  <th class="text-right">90+ Days</th>
                  <th class="text-right">Total Balance Due</th>
                  <th class="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in agingData.debtors" :key="d.customer_id">
                  <td>
                    <div class="debtor-name-cell">
                      <strong>{{ d.customer_name }}</strong>
                    </div>
                  </td>
                  <td>{{ d.phone || 'N/A' }}</td>
                  <td class="text-right">TSH {{ parseFloat(d.credit_limit).toFixed(2) }}</td>
                  <td class="text-right text-emerald">TSH {{ parseFloat(d.current_0_30).toFixed(2) }}</td>
                  <td class="text-right text-yellow">TSH {{ parseFloat(d.aging_31_60).toFixed(2) }}</td>
                  <td class="text-right text-orange">TSH {{ parseFloat(d.aging_61_90).toFixed(2) }}</td>
                  <td class="text-right text-rose">TSH {{ parseFloat(d.aging_90_plus).toFixed(2) }}</td>
                  <td class="text-right font-bold text-white">TSH {{ parseFloat(d.total_balance).toFixed(2) }}</td>
                  <td class="text-center">
                    <button 
                      class="btn-table-action" 
                      @click="openPaymentDialog({ id: d.customer_id, name: d.customer_name, current_balance: d.total_balance })"
                    >
                      Receive Payment
                    </button>
                  </td>
                </tr>

                <tr v-if="agingData.debtors.length === 0">
                  <td colspan="9" class="text-center empty-cell">
                    All customer credit accounts are fully settled! Zero outstanding debtors.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-MODAL 1: REGISTER NEW CUSTOMER -->
    <div v-if="showRegisterModal" class="inner-modal-backdrop" @click.self="showRegisterModal = false">
      <div class="inner-modal-card">
        <div class="inner-header">
          <h3>Register New Customer Account</h3>
          <button class="btn-close-inner" @click="showRegisterModal = false"><X :size="18" /></button>
        </div>

        <form @submit.prevent="handleRegisterCustomer" class="inner-form">
          <div class="form-row">
            <label>Business / School / Client Name *</label>
            <input v-model="regForm.name" type="text" placeholder="e.g. Apex Academy" required class="form-input" />
          </div>

          <div class="form-grid-2">
            <div class="form-row">
              <label>Contact Person</label>
              <input v-model="regForm.contact_person" type="text" placeholder="e.g. Principal Banda" class="form-input" />
            </div>
            <div class="form-row">
              <label>Phone Number</label>
              <input v-model="regForm.phone" type="text" placeholder="e.g. 0977889900" class="form-input" />
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-row">
              <label>Email Address</label>
              <input v-model="regForm.email" type="email" placeholder="e.g. accounts@client.zm" class="form-input" />
            </div>
            <div class="form-row">
              <label>Approved Credit Limit (TSH) *</label>
              <input v-model="regForm.credit_limit" type="number" step="0.01" min="0" required class="form-input" />
            </div>
          </div>

          <div class="form-row">
            <label>Physical Address</label>
            <input v-model="regForm.address" type="text" placeholder="Plot / Street / Area" class="form-input" />
          </div>

          <div class="form-row">
            <label>Notes / Terms</label>
            <textarea v-model="regForm.notes" rows="2" placeholder="Credit terms, authorized buyers..." class="form-input"></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showRegisterModal = false">Cancel</button>
            <button type="submit" class="btn-primary">Register Customer Account</button>
          </div>
        </form>
      </div>
    </div>

    <!-- SUB-MODAL 2: RECORD CUSTOMER REPAYMENT -->
    <div v-if="showPaymentModal" class="inner-modal-backdrop" @click.self="showPaymentModal = false">
      <div class="inner-modal-card">
        <div class="inner-header">
          <div>
            <h3>Record Customer Repayment</h3>
            <span class="inner-sub">Account: {{ selectedCustomer?.name }}</span>
          </div>
          <button class="btn-close-inner" @click="showPaymentModal = false"><X :size="18" /></button>
        </div>

        <div class="debt-status-banner">
          <span>Current Amount Due:</span>
          <strong>TSH {{ parseFloat(selectedCustomer?.current_balance || 0).toFixed(2) }}</strong>
        </div>

        <form @submit.prevent="submitRepayment" class="inner-form">
          <div v-if="paymentError" class="error-banner">
            <AlertCircle :size="16" />
            <span>{{ paymentError }}</span>
          </div>

          <div class="form-row">
            <label>Payment Amount Received (TSH) *</label>
            <input 
              v-model="paymentForm.amount" 
              type="number" 
              step="0.01" 
              min="0.01" 
              :max="selectedCustomer?.current_balance"
              required 
              placeholder="0.00" 
              class="form-input input-highlight" 
            />
          </div>

          <div class="form-row">
            <label>Payment Method</label>
            <div class="method-selector">
              <label 
                v-for="m in ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CHEQUE']" 
                :key="m"
                class="method-chip"
                :class="{ active: paymentForm.payment_method === m }"
              >
                <input type="radio" v-model="paymentForm.payment_method" :value="m" class="hidden-radio" />
                <span>{{ m.replace('_', ' ') }}</span>
              </label>
            </div>
          </div>

          <div class="form-row">
            <label>Receipt / Reference Number</label>
            <input v-model="paymentForm.reference" type="text" placeholder="e.g. RCPT-0128 or Momo TXID" class="form-input" />
          </div>

          <div class="form-row">
            <label>Notes</label>
            <input v-model="paymentForm.notes" type="text" placeholder="Paid by who, bank ref, etc." class="form-input" />
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showPaymentModal = false">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="paymentSubmitting">
              {{ paymentSubmitting ? 'Recording...' : 'Confirm Repayment' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- SUB-MODAL 3: ACCOUNT STATEMENT -->
    <div v-if="showStatementModal" class="inner-modal-backdrop" @click.self="showStatementModal = false">
      <div class="inner-modal-card statement-card">
        <div class="inner-header">
          <div>
            <h3>Account Statement: {{ selectedCustomer?.name }}</h3>
            <span class="inner-sub">Ledger of Credit Sales and Debt Repayments</span>
          </div>
          <button class="btn-close-inner" @click="showStatementModal = false"><X :size="18" /></button>
        </div>

        <div class="statement-summary">
          <div class="stat-box">
            <span>Credit Limit:</span>
            <strong>TSH {{ parseFloat(customerStatement?.customer?.credit_limit || 0).toFixed(2) }}</strong>
          </div>
          <div class="stat-box">
            <span>Current Balance Due:</span>
            <strong class="text-rose">TSH {{ parseFloat(customerStatement?.customer?.current_balance || 0).toFixed(2) }}</strong>
          </div>
          <div class="stat-box">
            <span>Available Credit:</span>
            <strong class="text-emerald">TSH {{ parseFloat(customerStatement?.customer?.available_credit || 0).toFixed(2) }}</strong>
          </div>
        </div>

        <div class="statement-table-scroll">
          <table class="statement-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Method / Ref</th>
                <th class="text-right">Amount</th>
                <th class="text-right">Balance After</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in customerStatement?.transactions" :key="t.id">
                <td>{{ new Date(t.created_at).toLocaleString() }}</td>
                <td>
                  <span 
                    class="type-pill" 
                    :class="t.transaction_type === 'CREDIT_SALE' ? 'pill-sale' : 'pill-repay'"
                  >
                    {{ t.transaction_type === 'CREDIT_SALE' ? 'Credit Purchase' : 'Repayment' }}
                  </span>
                </td>
                <td>{{ t.payment_method || '-' }} {{ t.reference ? `(${t.reference})` : '' }}</td>
                <td class="text-right font-bold" :class="t.transaction_type === 'CREDIT_SALE' ? 'text-amber' : 'text-emerald'">
                  {{ t.transaction_type === 'CREDIT_SALE' ? '+' : '-' }} TSH {{ parseFloat(t.amount).toFixed(2) }}
                </td>
                <td class="text-right text-white">TSH {{ parseFloat(t.balance_after).toFixed(2) }}</td>
                <td>{{ t.recorded_by_name || 'Cashier' }}</td>
              </tr>

              <tr v-if="!customerStatement?.transactions || customerStatement.transactions.length === 0">
                <td colspan="6" class="text-center empty-cell">No credit transactions on this account yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.customers-window {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  width: 95%;
  max-width: 1200px;
  height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
}

.window-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.75rem;
  background: rgba(18, 24, 38, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-branding {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(6, 182, 212, 0.15);
  border: 1px solid rgba(6, 182, 212, 0.3);
  color: #22d3ee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-branding h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #f8fafc;
}

.subtitle {
  font-size: 0.8rem;
  color: #64748b;
}

.header-tabs {
  display: flex;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0.3rem;
  gap: 0.3rem;
}

.tab-btn {
  padding: 0.5rem 1.25rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(6, 182, 212, 0.2);
  color: #22d3ee;
  font-weight: 600;
}

.btn-close-window {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.5rem;
}

/* Toolbar */
.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-bar {
  flex: 1;
  max-width: 500px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(18, 24, 38, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.6rem 1rem;
}

.search-input {
  background: transparent;
  border: none;
  outline: none;
  color: #f1f5f9;
  font-size: 0.95rem;
  width: 100%;
}

.btn-add-customer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  background: linear-gradient(135deg, #0891b2, #0284c7);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(8, 145, 178, 0.35);
}

/* Cards Grid */
.customers-scroll {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.customer-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

.customer-card {
  background: rgba(18, 24, 38, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  backdrop-filter: blur(10px);
  transition: all 0.25s ease;
}

.customer-card:hover {
  transform: translateY(-2px);
  border-color: rgba(6, 182, 212, 0.3);
}

.card-debt {
  border-left: 3px solid #f59e0b;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.cust-title {
  margin: 0;
  color: #f8fafc;
  font-size: 1.05rem;
}

.cust-rep {
  font-size: 0.75rem;
  color: #64748b;
}

.balance-tag {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.tag-debt {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.tag-clear {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.contact-details {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #94a3b8;
}

.financials-strip {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 10px;
  padding: 0.6rem;
  margin-bottom: 1rem;
}

.fin-box {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.fin-label {
  font-size: 0.68rem;
  color: #64748b;
}

.fin-val {
  font-size: 0.82rem;
  font-weight: 600;
  color: #f1f5f9;
}

.fin-debt {
  color: #f59e0b;
}

.fin-avail {
  color: #10b981;
}

.card-actions-bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.btn-card-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-repay {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.btn-repay:hover {
  background: rgba(16, 185, 129, 0.35);
}

.btn-statement {
  background: rgba(30, 41, 59, 0.6);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.btn-statement:hover {
  background: rgba(30, 41, 59, 0.9);
  color: #f8fafc;
}

/* Aging Report Tab */
.aging-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

.aging-kpis-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
}

.kpi-card {
  background: rgba(18, 24, 38, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.kpi-current { border-top: 3px solid #10b981; }
.kpi-30 { border-top: 3px solid #eab308; }
.kpi-60 { border-top: 3px solid #f97316; }
.kpi-90 { border-top: 3px solid #ef4444; }
.kpi-grand { border-top: 3px solid #06b6d4; }

.kpi-label {
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 600;
}

.kpi-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: #f8fafc;
}

.kpi-sub {
  font-size: 0.72rem;
  color: #64748b;
}

.aging-table-container {
  flex: 1;
  overflow-y: auto;
  background: rgba(18, 24, 38, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}

.aging-table, .statement-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.aging-table th, .statement-table th {
  background: rgba(15, 23, 42, 0.8);
  padding: 0.85rem 1rem;
  color: #94a3b8;
  font-weight: 600;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.aging-table td, .statement-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
}

.text-right { text-align: right; }
.text-center { text-align: center; }
.text-emerald { color: #34d399; }
.text-yellow { color: #facc15; }
.text-orange { color: #fb923c; }
.text-rose { color: #f43f5e; }
.text-cyan { color: #22d3ee; }
.font-bold { font-weight: 700; }

.btn-table-action {
  padding: 0.35rem 0.75rem;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-table-action:hover {
  background: rgba(16, 185, 129, 0.35);
}

/* SUB-MODALS */
.inner-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.inner-modal-card {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  width: 90%;
  max-width: 540px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 1.5rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
}

.statement-card {
  max-width: 800px;
}

.inner-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.75rem;
}

.inner-header h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.15rem;
}

.inner-sub {
  font-size: 0.8rem;
  color: #94a3b8;
}

.btn-close-inner {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.debt-status-banner {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  color: #fbbf24;
  margin-bottom: 1rem;
}

.inner-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-row label {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 500;
}

.form-input {
  background: rgba(18, 24, 38, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  color: #f1f5f9;
  font-size: 0.9rem;
  outline: none;
}

.form-input:focus {
  border-color: #06b6d4;
}

.input-highlight {
  font-size: 1.2rem;
  font-weight: 700;
  color: #10b981;
}

.method-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.method-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #94a3b8;
  font-size: 0.8rem;
  cursor: pointer;
  font-weight: 600;
}

.method-chip.active {
  background: rgba(6, 182, 212, 0.2);
  border-color: #06b6d4;
  color: #22d3ee;
}

.hidden-radio { display: none; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn-secondary {
  padding: 0.6rem 1.2rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  border-radius: 8px;
  cursor: pointer;
}

.btn-primary {
  padding: 0.6rem 1.4rem;
  background: linear-gradient(135deg, #0891b2, #0284c7);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  font-size: 0.85rem;
}

/* Statement Layout */
.statement-summary {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.85rem;
  border-radius: 10px;
  margin-bottom: 1rem;
}

.stat-box {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.82rem;
  color: #94a3b8;
}

.statement-table-scroll {
  max-height: 400px;
  overflow-y: auto;
}

.type-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.pill-sale {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.pill-repay {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}
</style>
