<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  Truck, Plus, Search, DollarSign, Calendar, Clock, 
  FileText, ArrowDownLeft, X, CheckCircle2, AlertCircle, 
  Phone, Mail, MapPin, Receipt, ShieldCheck, ChevronRight,
  PackageCheck, Building2
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const activeTab = ref('orders') // 'orders' | 'suppliers'
const suppliers = ref([])
const purchaseOrders = ref([])
const searchQuery = ref('')
const loading = ref(false)

// Inner Modals
const showCreateSupplier = ref(false)
const showCreatePO = ref(false)
const showPayPO = ref(false)

const selectedPO = ref(null)

// Forms
const supplierForm = ref({
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: ''
})

const poForm = ref({
  supplier: '',
  invoice_number: '',
  total_cost: '',
  notes: ''
})

const payForm = ref({
  amount: '',
  payment_method: 'BANK_TRANSFER',
  reference: '',
  notes: ''
})
const paySubmitting = ref(false)
const payError = ref('')

const fetchData = async () => {
  loading.value = true
  try {
    const [supRes, poRes] = await Promise.all([
      api.get('/pos/suppliers/'),
      api.get('/pos/purchase-orders/')
    ])
    suppliers.value = supRes.data
    purchaseOrders.value = poRes.data
  } catch (err) {
    store.showToast('Failed to load supplier & purchase order data.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

// Filtered POs
const filteredPOs = computed(() => {
  if (!searchQuery.value) return purchaseOrders.value
  const q = searchQuery.value.toLowerCase()
  return purchaseOrders.value.filter(po => 
    po.order_number.toLowerCase().includes(q) ||
    (po.invoice_number && po.invoice_number.toLowerCase().includes(q)) ||
    (po.supplier_name && po.supplier_name.toLowerCase().includes(q))
  )
})

// Register Supplier
const handleCreateSupplier = async () => {
  if (!supplierForm.value.name.trim()) return
  try {
    await api.post('/pos/suppliers/', supplierForm.value)
    store.showToast(`Supplier "${supplierForm.value.name}" registered!`, 'success')
    showCreateSupplier.value = false
    supplierForm.value = { name: '', contact_person: '', phone: '', email: '', address: '' }
    await fetchData()
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to create supplier.', 'error')
  }
}

// Create Purchase Order
const handleCreatePO = async () => {
  if (!poForm.value.supplier || !poForm.value.total_cost) {
    store.showToast('Supplier and Total Cost are required.', 'error')
    return
  }
  try {
    const res = await api.post('/pos/purchase-orders/', poForm.value)
    store.showToast(`Purchase Order #${res.data.order_number} recorded!`, 'success')
    showCreatePO.value = false
    poForm.value = { supplier: '', invoice_number: '', total_cost: '', notes: '' }
    await fetchData()
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to record purchase order.', 'error')
  }
}

// Open Payment Modal for PO
const openPayDialog = (po) => {
  selectedPO.value = po
  payForm.value = {
    amount: po.balance_remaining,
    payment_method: 'BANK_TRANSFER',
    reference: '',
    notes: ''
  }
  payError.value = ''
  showPayPO.value = true
}

// Submit Supplier Payment
const submitSupplierPayment = async () => {
  if (!selectedPO.value) return
  paySubmitting.value = true
  payError.value = ''

  try {
    await api.post(`/pos/purchase-orders/${selectedPO.value.id}/record_payment/`, payForm.value)
    store.showToast(`Payment of ZMW ${payForm.value.amount} recorded for ${selectedPO.value.supplier_name}!`, 'success')
    showPayPO.value = false
    await fetchData()
  } catch (err) {
    payError.value = err.response?.data?.error || 'Payment failed.'
  } finally {
    paySubmitting.value = false
  }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="suppliers-window">
      <!-- Window Header -->
      <div class="window-header">
        <div class="header-branding">
          <div class="header-icon-box">
            <Truck :size="22" />
          </div>
          <div>
            <h2>Suppliers & Goods Receiving</h2>
            <span class="subtitle">Stationery Inventory Purchases & Payables</span>
          </div>
        </div>

        <div class="header-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'orders' }"
            @click="activeTab = 'orders'"
          >
            <span>Purchase Orders ({{ purchaseOrders.length }})</span>
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'suppliers' }"
            @click="activeTab = 'suppliers'"
          >
            <span>Suppliers Directory ({{ suppliers.length }})</span>
          </button>
        </div>

        <button class="btn-close-window" @click="emit('close')">
          <X :size="20" />
        </button>
      </div>

      <!-- TAB 1: PURCHASE ORDERS -->
      <div v-if="activeTab === 'orders'" class="tab-content">
        <!-- Toolbar -->
        <div class="toolbar">
          <div class="search-bar">
            <Search :size="18" class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search PO #, invoice #, or supplier..." 
              class="search-input"
            />
          </div>

          <button class="btn-add" @click="showCreatePO = true">
            <PackageCheck :size="18" />
            <span>Record Goods Receiving (PO)</span>
          </button>
        </div>

        <!-- POs List -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Date Received</th>
                <th>Supplier</th>
                <th>Invoice #</th>
                <th class="text-right">Total Cost</th>
                <th class="text-right">Amount Paid</th>
                <th class="text-right">Balance Due</th>
                <th class="text-center">Status</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="po in filteredPOs" :key="po.id">
                <td class="font-mono font-bold text-cyan">{{ po.order_number }}</td>
                <td>{{ new Date(po.created_at).toLocaleDateString() }}</td>
                <td><strong>{{ po.supplier_name }}</strong></td>
                <td>{{ po.invoice_number || '-' }}</td>
                <td class="text-right">ZMW {{ parseFloat(po.total_cost).toFixed(2) }}</td>
                <td class="text-right text-emerald">ZMW {{ parseFloat(po.amount_paid).toFixed(2) }}</td>
                <td class="text-right font-bold" :class="parseFloat(po.balance_remaining) > 0 ? 'text-amber' : 'text-slate'">
                  ZMW {{ parseFloat(po.balance_remaining).toFixed(2) }}
                </td>
                <td class="text-center">
                  <span 
                    class="status-pill"
                    :class="{
                      'pill-unpaid': po.status === 'UNPAID',
                      'pill-partial': po.status === 'PARTIALLY_PAID',
                      'pill-paid': po.status === 'PAID'
                    }"
                  >
                    {{ po.status }}
                  </span>
                </td>
                <td class="text-center">
                  <button 
                    v-if="po.status !== 'PAID'"
                    class="btn-pay-po"
                    @click="openPayDialog(po)"
                  >
                    Pay Supplier
                  </button>
                  <span v-else class="text-emerald text-sm">Settled</span>
                </td>
              </tr>

              <tr v-if="filteredPOs.length === 0">
                <td colspan="9" class="empty-cell">No purchase orders found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: SUPPLIERS DIRECTORY -->
      <div v-else-if="activeTab === 'suppliers'" class="tab-content">
        <div class="toolbar">
          <div class="search-bar">
            <Search :size="18" class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search suppliers..." 
              class="search-input"
            />
          </div>

          <button class="btn-add" @click="showCreateSupplier = true">
            <Building2 :size="18" />
            <span>Add New Supplier</span>
          </button>
        </div>

        <div class="suppliers-grid">
          <div v-for="sup in suppliers" :key="sup.id" class="supplier-card">
            <div class="card-head">
              <h3>{{ sup.name }}</h3>
              <span class="payable-badge" :class="{ 'has-payable': parseFloat(sup.balance_payable) > 0 }">
                Payable: ZMW {{ parseFloat(sup.balance_payable).toFixed(2) }}
              </span>
            </div>

            <div class="card-details">
              <div v-if="sup.contact_person" class="detail-row">
                <span class="detail-lbl">Contact:</span>
                <span>{{ sup.contact_person }}</span>
              </div>
              <div v-if="sup.phone" class="detail-row">
                <Phone :size="14" />
                <span>{{ sup.phone }}</span>
              </div>
              <div v-if="sup.email" class="detail-row">
                <Mail :size="14" />
                <span>{{ sup.email }}</span>
              </div>
              <div v-if="sup.address" class="detail-row">
                <MapPin :size="14" />
                <span>{{ sup.address }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-MODAL 1: ADD SUPPLIER -->
    <div v-if="showCreateSupplier" class="inner-modal-backdrop" @click.self="showCreateSupplier = false">
      <div class="inner-modal-card">
        <div class="inner-header">
          <h3>Add New Inventory Supplier</h3>
          <button class="btn-close-inner" @click="showCreateSupplier = false"><X :size="18" /></button>
        </div>

        <form @submit.prevent="handleCreateSupplier" class="inner-form">
          <div class="form-row">
            <label>Supplier Company / Vendor Name *</label>
            <input v-model="supplierForm.name" type="text" placeholder="e.g. Lusaka Paper Mills" required class="form-input" />
          </div>

          <div class="form-grid-2">
            <div class="form-row">
              <label>Contact Person</label>
              <input v-model="supplierForm.contact_person" type="text" placeholder="e.g. Sales Manager" class="form-input" />
            </div>
            <div class="form-row">
              <label>Phone Number</label>
              <input v-model="supplierForm.phone" type="text" placeholder="e.g. 0966123456" class="form-input" />
            </div>
          </div>

          <div class="form-row">
            <label>Email Address</label>
            <input v-model="supplierForm.email" type="email" placeholder="orders@supplier.zm" class="form-input" />
          </div>

          <div class="form-row">
            <label>Physical Address</label>
            <input v-model="supplierForm.address" type="text" placeholder="Industrial Area, Lusaka" class="form-input" />
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showCreateSupplier = false">Cancel</button>
            <button type="submit" class="btn-primary">Save Supplier</button>
          </div>
        </form>
      </div>
    </div>

    <!-- SUB-MODAL 2: RECORD PURCHASE ORDER -->
    <div v-if="showCreatePO" class="inner-modal-backdrop" @click.self="showCreatePO = false">
      <div class="inner-modal-card">
        <div class="inner-header">
          <h3>Record Goods Receiving (Purchase Order)</h3>
          <button class="btn-close-inner" @click="showCreatePO = false"><X :size="18" /></button>
        </div>

        <form @submit.prevent="handleCreatePO" class="inner-form">
          <div class="form-row">
            <label>Supplier *</label>
            <select v-model="poForm.supplier" required class="form-input">
              <option value="" disabled>Select Supplier</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>

          <div class="form-grid-2">
            <div class="form-row">
              <label>Supplier Invoice / Delivery Note #</label>
              <input v-model="poForm.invoice_number" type="text" placeholder="e.g. INV-8874" class="form-input" />
            </div>
            <div class="form-row">
              <label>Total Invoice Cost (ZMW) *</label>
              <input v-model="poForm.total_cost" type="number" step="0.01" min="0.01" required placeholder="0.00" class="form-input input-highlight" />
            </div>
          </div>

          <div class="form-row">
            <label>Notes / Items Received Summary</label>
            <textarea v-model="poForm.notes" rows="2" placeholder="e.g. 50 reams A4 paper, 20 boxes pens..." class="form-input"></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showCreatePO = false">Cancel</button>
            <button type="submit" class="btn-primary">Record Purchase Order</button>
          </div>
        </form>
      </div>
    </div>

    <!-- SUB-MODAL 3: PAY SUPPLIER -->
    <div v-if="showPayPO" class="inner-modal-backdrop" @click.self="showPayPO = false">
      <div class="inner-modal-card">
        <div class="inner-header">
          <div>
            <h3>Pay Supplier: {{ selectedPO?.supplier_name }}</h3>
            <span class="inner-sub">Against PO #{{ selectedPO?.order_number }}</span>
          </div>
          <button class="btn-close-inner" @click="showPayPO = false"><X :size="18" /></button>
        </div>

        <div class="debt-status-banner">
          <span>Remaining PO Balance:</span>
          <strong>ZMW {{ parseFloat(selectedPO?.balance_remaining || 0).toFixed(2) }}</strong>
        </div>

        <form @submit.prevent="submitSupplierPayment" class="inner-form">
          <div v-if="payError" class="error-banner">
            <AlertCircle :size="16" />
            <span>{{ payError }}</span>
          </div>

          <div class="form-row">
            <label>Payment Amount (ZMW) *</label>
            <input 
              v-model="payForm.amount" 
              type="number" 
              step="0.01" 
              min="0.01" 
              :max="selectedPO?.balance_remaining"
              required 
              class="form-input input-highlight" 
            />
          </div>

          <div class="form-row">
            <label>Payment Method</label>
            <div class="method-selector">
              <label 
                v-for="m in ['BANK_TRANSFER', 'CHEQUE', 'CASH', 'MOBILE_MONEY']" 
                :key="m"
                class="method-chip"
                :class="{ active: payForm.payment_method === m }"
              >
                <input type="radio" v-model="payForm.payment_method" :value="m" class="hidden-radio" />
                <span>{{ m.replace('_', ' ') }}</span>
              </label>
            </div>
          </div>

          <div class="form-row">
            <label>Payment Reference (EFT / Cheque #)</label>
            <input v-model="payForm.reference" type="text" placeholder="e.g. EFT-99412" class="form-input" />
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showPayPO = false">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="paySubmitting">
              {{ paySubmitting ? 'Recording...' : 'Confirm Supplier Payment' }}
            </button>
          </div>
        </form>
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

.suppliers-window {
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
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
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
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
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

.btn-add {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  background: linear-gradient(135deg, #059669, #0d9488);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(5, 150, 105, 0.35);
}

.table-container {
  flex: 1;
  overflow-y: auto;
  background: rgba(18, 24, 38, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.data-table th {
  background: rgba(15, 23, 42, 0.8);
  padding: 0.85rem 1rem;
  color: #94a3b8;
  font-weight: 600;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.data-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
}

.text-right { text-align: right; }
.text-center { text-align: center; }
.font-mono { font-family: monospace; }
.font-bold { font-weight: 700; }
.text-cyan { color: #22d3ee; }
.text-emerald { color: #34d399; }
.text-amber { color: #fbbf24; }
.text-slate { color: #64748b; }

.status-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
}

.pill-unpaid {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.pill-partial {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.pill-paid {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.btn-pay-po {
  padding: 0.35rem 0.75rem;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-pay-po:hover {
  background: rgba(16, 185, 129, 0.35);
}

.suppliers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
  overflow-y: auto;
}

.supplier-card {
  background: rgba(18, 24, 38, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.25rem;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.card-head h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.05rem;
}

.payable-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  background: rgba(100, 116, 139, 0.2);
  color: #94a3b8;
}

.payable-badge.has-payable {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.card-details {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: #94a3b8;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.detail-lbl {
  color: #64748b;
}

/* SUB MODALS */
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
  max-width: 520px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 1.5rem;
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
  border-color: #10b981;
}

.input-highlight {
  font-size: 1.2rem;
  font-weight: 700;
  color: #34d399;
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
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #34d399;
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
  background: linear-gradient(135deg, #059669, #0d9488);
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
</style>
