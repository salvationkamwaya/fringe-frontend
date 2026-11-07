<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  RotateCcw, Search, ShieldCheck, CheckCircle2, AlertTriangle, 
  Trash2, Printer, Plus, X, Calendar, User, Package, FileText,
  DollarSign, Check, RefreshCw, Layers
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const activeTab = ref('NEW') // 'NEW' | 'HISTORY'
const returnsList = ref([])
const loading = ref(false)
const historySearch = ref('')

// Form state
const orderSearchQuery = ref('')
const searchingOrder = ref(false)
const foundOrder = ref(null)
const selectedItemsToReturn = ref([])
const returnReason = ref('DEFECTIVE')
const returnNotes = ref('')
const refundMethod = ref('CASH') // 'CASH' | 'CREDIT'
const managerPin = ref('')

// Print Return Voucher
const printReturn = ref(null)
const showPrintModal = ref(false)

const fetchReturnsHistory = async () => {
  loading.value = true
  try {
    const res = await api.get('/pos/returns/')
    returnsList.value = res.data
  } catch (err) {
    store.showToast('Failed to load returns history.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReturnsHistory()
})

const lookupOrder = async () => {
  const query = orderSearchQuery.value.trim()
  if (!query) {
    store.showToast('Enter an Order Number or Receipt # (e.g. STN-1234 or STN-WS-5678).', 'warning')
    return
  }

  searchingOrder.value = true
  foundOrder.value = null
  selectedItemsToReturn.value = []

  try {
    const res = await api.get('/pos/orders/', { params: { search: query } })
    const results = res.data?.results || res.data || []
    const match = results.find(o => o.order_number.toLowerCase() === query.toLowerCase()) || results[0]

    if (match) {
      foundOrder.value = match
      // Pre-select items for return customization
      selectedItemsToReturn.value = match.items.map(it => ({
        product_id: it.product?.id || it.product_id,
        product_name: it.product_name,
        sold_qty: it.quantity,
        return_qty: 0,
        unit_price: parseFloat(it.unit_price),
        is_pack: it.is_pack_sale,
        disposition: 'RETURN_TO_STOCK', // 'RETURN_TO_STOCK' | 'WRITE_OFF_DAMAGED'
        selected: false
      }))
      store.showToast(`Found Order #${match.order_number}`, 'success')
    } else {
      store.showToast(`No order found matching "${query}".`, 'error')
    }
  } catch (err) {
    store.showToast('Failed to lookup order.', 'error')
  } finally {
    searchingOrder.value = false
  }
}

const toggleItemSelect = (item) => {
  item.selected = !item.selected
  if (item.selected && item.return_qty === 0) {
    item.return_qty = 1
  } else if (!item.selected) {
    item.return_qty = 0
  }
}

const totalRefundAmount = computed(() => {
  return selectedItemsToReturn.value
    .filter(i => i.selected && i.return_qty > 0)
    .reduce((acc, i) => acc + (i.return_qty * i.unit_price), 0)
})

const activeReturnItems = computed(() => {
  return selectedItemsToReturn.value.filter(i => i.selected && i.return_qty > 0)
})

const handleSubmitReturn = async () => {
  if (!foundOrder.value) {
    store.showToast('Please search and attach an existing order first.', 'warning')
    return
  }

  if (activeReturnItems.value.length === 0) {
    store.showToast('Select at least one item and specify quantity to return.', 'warning')
    return
  }

  if (!managerPin.value) {
    store.showToast('Manager PIN authorization is required to process returns and refunds.', 'warning')
    return
  }

  loading.value = true
  try {
    const payload = {
      order_id: foundOrder.value.id,
      order_number: foundOrder.value.order_number,
      customer_id: foundOrder.value.customer?.id || null,
      customer_name: foundOrder.value.customer?.name || 'Walk-in Retail Customer',
      refund_method: refundMethod.value,
      reason: returnReason.value,
      notes: returnNotes.value,
      manager_pin: managerPin.value,
      items: activeReturnItems.value.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.return_qty,
        unit_price: i.unit_price,
        is_pack: i.is_pack,
        disposition: i.disposition,
        refund_amount: i.return_qty * i.unit_price
      }))
    }

    const res = await api.post('/pos/returns/', payload)
    store.showToast(`Return ${res.data.id} approved and recorded!`, 'success')

    // Reset form
    foundOrder.value = null
    orderSearchQuery.value = ''
    selectedItemsToReturn.value = []
    managerPin.value = ''
    returnNotes.value = ''

    await fetchReturnsHistory()
    activeTab.value = 'HISTORY'

    // Open print voucher
    printReturn.value = res.data
    showPrintModal.value = true
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to process return. Check manager PIN.', 'error')
  } finally {
    loading.value = false
  }
}

const filteredHistory = computed(() => {
  if (!historySearch.value) return returnsList.value
  const q = historySearch.value.toLowerCase()
  return returnsList.value.filter(r => 
    r.id.toLowerCase().includes(q) ||
    r.order_number.toLowerCase().includes(q) ||
    (r.customer_name && r.customer_name.toLowerCase().includes(q))
  )
})

const openPrintVoucher = (ret) => {
  printReturn.value = ret
  showPrintModal.value = true
}

const printDocument = () => {
  window.print()
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card returns-card">
      <!-- HEADER -->
      <div class="modal-header">
        <div class="header-title-box">
          <div class="icon-bubble">
            <RotateCcw :size="22" class="text-rose" />
          </div>
          <div>
            <h2>Sales Returns & Customer Refunds</h2>
            <p class="subtitle">Accept returned items linked to original receipt or wholesale invoice</p>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-close" @click="$emit('close')">
            <X :size="20" />
          </button>
        </div>
      </div>

      <!-- TABS -->
      <div class="tab-strip">
        <button 
          class="nav-tab-btn" 
          :class="{ active: activeTab === 'NEW' }"
          @click="activeTab = 'NEW'"
        >
          <Plus :size="16" />
          <span>Process New Return</span>
        </button>
        <button 
          class="nav-tab-btn" 
          :class="{ active: activeTab === 'HISTORY' }"
          @click="activeTab = 'HISTORY'"
        >
          <Calendar :size="16" />
          <span>Returns Audit History ({{ returnsList.length }})</span>
        </button>
      </div>

      <!-- BODY -->
      <div class="modal-body-scroll">
        <!-- PROCESS NEW RETURN TAB -->
        <div v-if="activeTab === 'NEW'" class="process-form-container">
          <!-- Step 1: Find Original Order -->
          <div class="form-card step-card">
            <div class="card-step-header">
              <span class="step-num">1</span>
              <div>
                <h3>Lookup Original Sale Order / Receipt</h3>
                <p>Enter the receipt number from the customer's paper receipt or wholesale invoice</p>
              </div>
            </div>

            <div class="search-order-row">
              <div class="search-input-box">
                <Search :size="16" class="search-icon" />
                <input 
                  v-model="orderSearchQuery" 
                  type="text" 
                  placeholder="e.g. STN-20261107-001 or STN-WS-004..." 
                  class="styled-search-input"
                  @keyup.enter="lookupOrder"
                />
              </div>
              <button class="btn-lookup" :disabled="searchingOrder" @click="lookupOrder">
                <RefreshCw v-if="searchingOrder" :size="16" class="spinner" />
                <span v-else>Locate Order</span>
              </button>
            </div>

            <!-- Order Match Header Info -->
            <div v-if="foundOrder" class="matched-order-banner">
              <div class="meta-col">
                <span class="meta-label">ORDER NUMBER</span>
                <strong class="order-no">{{ foundOrder.order_number }}</strong>
              </div>
              <div class="meta-col">
                <span class="meta-label">DATE & TIME</span>
                <span>{{ new Date(foundOrder.created_at).toLocaleString('en-GB') }}</span>
              </div>
              <div class="meta-col">
                <span class="meta-label">CUSTOMER</span>
                <span>{{ foundOrder.customer?.name || 'Walk-in Retail' }}</span>
              </div>
              <div class="meta-col">
                <span class="meta-label">ORIGINAL TOTAL</span>
                <span class="price-val">TSH {{ parseFloat(foundOrder.final_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
              </div>
            </div>
          </div>

          <!-- Step 2: Select Items to Return -->
          <div v-if="foundOrder" class="form-card step-card">
            <div class="card-step-header">
              <span class="step-num">2</span>
              <div>
                <h3>Select Items & Specify Disposition</h3>
                <p>Mark the items being returned, set quantity, and specify if returning to active stock or writing off as damaged</p>
              </div>
            </div>

            <div class="table-wrap">
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 40px;">Select</th>
                    <th>Product</th>
                    <th>Sold Unit</th>
                    <th style="text-align: center;">Sold Qty</th>
                    <th style="width: 130px; text-align: center;">Return Qty</th>
                    <th style="width: 200px;">Disposition</th>
                    <th style="text-align: right;">Refund Amount (TSH)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(it, idx) in selectedItemsToReturn" 
                    :key="idx"
                    :class="{ 'row-active': it.selected }"
                  >
                    <td>
                      <input 
                        type="checkbox" 
                        :checked="it.selected" 
                        @change="toggleItemSelect(it)"
                        class="styled-checkbox"
                      />
                    </td>
                    <td>
                      <strong>{{ it.product_name }}</strong>
                    </td>
                    <td>
                      <span class="unit-tag">{{ it.is_pack ? 'Pack / Box' : 'Single Piece' }}</span>
                    </td>
                    <td style="text-align: center; color: #94a3b8;">{{ it.sold_qty }}</td>
                    <td>
                      <div class="stepper" v-if="it.selected">
                        <button class="step-btn" @click="it.return_qty = Math.max(1, it.return_qty - 1)">-</button>
                        <input 
                          type="number" 
                          min="1" 
                          :max="it.sold_qty" 
                          v-model.number="it.return_qty" 
                          class="step-val"
                        />
                        <button class="step-btn" @click="it.return_qty = Math.min(it.sold_qty, it.return_qty + 1)">+</button>
                      </div>
                      <span v-else class="text-muted">-</span>
                    </td>
                    <td>
                      <select v-if="it.selected" v-model="it.disposition" class="styled-select-mini">
                        <option value="RETURN_TO_STOCK">🔄 Return to Stock (Restock)</option>
                        <option value="WRITE_OFF_DAMAGED">⚠️ Damaged (Write-off)</option>
                      </select>
                      <span v-else class="text-muted">-</span>
                    </td>
                    <td style="text-align: right; font-weight: 700; color: #38bdf8;">
                      {{ (it.return_qty * it.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Step 3: Refund Method & Manager Approval -->
          <div v-if="foundOrder && activeReturnItems.length > 0" class="form-card step-card">
            <div class="card-step-header">
              <span class="step-num">3</span>
              <div>
                <h3>Refund Tender & Manager Sign-Off</h3>
                <p>Manager PIN authorization is strictly required for cash payouts or account adjustments</p>
              </div>
            </div>

            <div class="step-split-grid">
              <div class="controls-col">
                <div class="field-item">
                  <label>Return Reason</label>
                  <select v-model="returnReason" class="styled-select">
                    <option value="DEFECTIVE">Defective / Damaged Item</option>
                    <option value="WRONG_ITEM">Wrong Item Ordered / Purchased</option>
                    <option value="CUSTOMER_CHANGED_MIND">Customer Changed Mind</option>
                    <option value="EXPIRED">Expired Stock / Stained Paper</option>
                    <option value="OTHER">Other Reason</option>
                  </select>
                </div>

                <div class="field-item">
                  <label>Refund Payment Method</label>
                  <select v-model="refundMethod" class="styled-select">
                    <option value="CASH">💵 Cash Refund (Paid from drawer)</option>
                    <option value="CREDIT" :disabled="!foundOrder.customer">
                      🏢 Credit to Customer Account ({{ foundOrder.customer ? foundOrder.customer.name : 'Requires registered customer' }})
                    </option>
                  </select>
                </div>

                <div class="field-item">
                  <label>Audit Notes / Remarks</label>
                  <input 
                    v-model="returnNotes" 
                    type="text" 
                    placeholder="e.g. Package opened, pens dried out, verified by manager" 
                    class="styled-input"
                  />
                </div>
              </div>

              <div class="approval-col">
                <div class="summary-box">
                  <span class="sum-label">TOTAL REFUND AMOUNT</span>
                  <span class="sum-amount">TSH {{ totalRefundAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
                  <span class="sum-items-count">{{ activeReturnItems.length }} item(s) selected</span>
                </div>

                <div class="pin-auth-box">
                  <div class="pin-title">
                    <ShieldCheck :size="18" class="text-rose" />
                    <span>Manager PIN Authorization</span>
                  </div>
                  <input 
                    v-model="managerPin" 
                    type="password" 
                    maxlength="6" 
                    placeholder="Enter 4-6 digit PIN" 
                    class="styled-pin-input"
                  />
                  <button 
                    class="btn-approve-return" 
                    :disabled="loading || !managerPin"
                    @click="handleSubmitReturn"
                  >
                    <CheckCircle2 :size="18" />
                    <span>Authorize & Complete Return</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- HISTORY TAB -->
        <div v-else-if="activeTab === 'HISTORY'" class="history-container">
          <div class="history-search-bar">
            <Search :size="16" class="search-icon" />
            <input 
              v-model="historySearch" 
              type="text" 
              placeholder="Search returns by Return ID, Order #, or Customer..." 
              class="history-search-input"
            />
          </div>

          <div v-if="filteredHistory.length === 0" class="state-placeholder">
            <RotateCcw :size="48" class="empty-icon" />
            <h3>No return records found</h3>
            <p>Sales returns and refunds will appear here for management auditing and credit notes.</p>
          </div>

          <div v-else class="returns-table-wrapper">
            <table class="returns-table">
              <thead>
                <tr>
                  <th>Return #</th>
                  <th>Date</th>
                  <th>Original Order</th>
                  <th>Customer</th>
                  <th>Reason</th>
                  <th>Refund Method</th>
                  <th style="text-align: right;">Amount (TSH)</th>
                  <th style="width: 90px; text-align: center;">Voucher</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in filteredHistory" :key="r.id">
                  <td><strong class="text-rose">{{ r.id }}</strong></td>
                  <td>{{ new Date(r.created_at).toLocaleDateString('en-GB') }}</td>
                  <td><span class="order-ref">{{ r.order_number }}</span></td>
                  <td>{{ r.customer_name }}</td>
                  <td><span class="reason-badge">{{ r.reason }}</span></td>
                  <td>
                    <span class="tender-badge" :class="r.refund_method.toLowerCase()">
                      {{ r.refund_method }}
                    </span>
                  </td>
                  <td style="text-align: right; font-weight: 700;">
                    TSH {{ parseFloat(r.total_refund).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                  </td>
                  <td style="text-align: center;">
                    <button class="btn-voucher" @click="openPrintVoucher(r)" title="Print Credit Note / Return Note">
                      <Printer :size="14" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- PRINT VOUCHER MODAL -->
      <div v-if="showPrintModal && printReturn" class="print-preview-backdrop" @click.self="showPrintModal = false">
        <div class="print-preview-modal">
          <div class="print-controls no-print">
            <div class="print-meta-info">
              <RotateCcw :size="18" class="text-rose" />
              <span>Credit Note / Return Voucher: <strong>{{ printReturn.id }}</strong></span>
            </div>
            <div class="ctrl-btns">
              <button class="btn-print" @click="printDocument">
                <Printer :size="16" />
                <span>Print Document</span>
              </button>
              <button class="btn-close-print" @click="showPrintModal = false">
                <X :size="18" />
              </button>
            </div>
          </div>

          <!-- PRINTABLE SHEET -->
          <div class="printable-sheet" id="printable-return-voucher">
            <div class="doc-header">
              <div class="company-brand">
                <h1 class="brand-name">FRINGE INVESTMENT COMPANY LIMITED</h1>
                <p class="brand-sub">Stationery, Office Supplies, Printing & Wholesale Distribution</p>
                <p class="brand-contact">P.O. Box 1024, Commercial District, Tanzania | Phone: +255 700 000 000</p>
                <p class="brand-tax">TIN: 142-985-321 | VRN: 40-023819-W</p>
              </div>

              <div class="doc-badge-block">
                <div class="credit-stamp">CREDIT NOTE / RETURN VOUCHER</div>
                <div class="doc-ref-row">
                  <span class="ref-label">Voucher #:</span>
                  <span class="ref-val">{{ printReturn.id }}</span>
                </div>
                <div class="doc-ref-row">
                  <span class="ref-label">Original Order:</span>
                  <span class="ref-val">{{ printReturn.order_number }}</span>
                </div>
                <div class="doc-ref-row">
                  <span class="ref-label">Date Issued:</span>
                  <span class="ref-val">{{ new Date(printReturn.created_at).toLocaleDateString('en-GB') }}</span>
                </div>
              </div>
            </div>

            <div class="client-meta-box">
              <div class="client-col">
                <span class="col-title">CREDIT ISSUED TO:</span>
                <h3 class="client-name">{{ printReturn.customer_name }}</h3>
                <p>Refund Tender: <strong>{{ printReturn.refund_method }}</strong></p>
                <p>Reason: {{ printReturn.reason }}</p>
              </div>
              <div class="client-col">
                <span class="col-title">MANAGEMENT AUTHORIZATION:</span>
                <p>Approved By: <strong>{{ printReturn.authorized_by || 'Manager PIN Verified' }}</strong></p>
                <p>Disposition: Restocked / Written Off according to audit record</p>
                <p v-if="printReturn.notes">Remarks: {{ printReturn.notes }}</p>
              </div>
            </div>

            <table class="doc-items-table">
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th>Item Description</th>
                  <th style="width: 120px;">Disposition</th>
                  <th style="width: 80px; text-align: center;">Qty</th>
                  <th style="width: 140px; text-align: right;">Unit Price (TSH)</th>
                  <th style="width: 140px; text-align: right;">Refund Subtotal (TSH)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(it, i) in printReturn.items" :key="i">
                  <td>{{ i + 1 }}</td>
                  <td><strong>{{ it.product_name }}</strong></td>
                  <td>{{ it.disposition === 'RETURN_TO_STOCK' ? 'Restocked' : 'Damaged Write-off' }}</td>
                  <td style="text-align: center;">{{ it.quantity }}</td>
                  <td style="text-align: right;">{{ parseFloat(it.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                  <td style="text-align: right; font-weight: 600;">{{ (it.quantity * it.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                </tr>
              </tbody>
            </table>

            <div class="doc-bottom-grid">
              <div class="doc-terms">
                <h4>Voucher Certification</h4>
                <p>This document certifies the return of the goods listed above and the corresponding credit adjustment or cash disbursement from the Stationery register.</p>
              </div>

              <div class="doc-totals-box">
                <div class="totals-row grand-total-row">
                  <span>TOTAL REFUND:</span>
                  <span>TSH {{ parseFloat(printReturn.total_refund).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>

            <div class="doc-sign-blocks">
              <div class="sign-box">
                <div class="sign-line"></div>
                <span>Customer Receiving Signature</span>
              </div>
              <div class="sign-box">
                <div class="sign-line"></div>
                <span>Manager Authorized Signature & Stamp</span>
              </div>
            </div>
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
  background: rgba(10, 15, 29, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1.5rem;
}

.returns-card {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 1050px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(17, 24, 39, 0.6);
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-bubble {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(244, 63, 94, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-rose { color: #fb7185; }

.header-title-box h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f3f4f6;
  margin: 0;
}

.subtitle {
  font-size: 0.825rem;
  color: #9ca3af;
  margin: 0.2rem 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-close {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #9ca3af;
  border-radius: 10px;
  padding: 0.5rem;
  cursor: pointer;
}

.btn-close:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

/* TAB STRIP */
.tab-strip {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1.75rem;
  background: rgba(15, 23, 42, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.nav-tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #9ca3af;
  padding: 0.5rem 1.1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-tab-btn.active {
  background: rgba(244, 63, 94, 0.18);
  color: #fda4af;
  border-color: #f43f5e;
}

/* BODY SCROLL */
.modal-body-scroll {
  flex: 1;
  padding: 1.5rem 1.75rem;
  overflow-y: auto;
}

.process-form-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.card-step-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f43f5e;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.95rem;
}

.card-step-header h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.card-step-header p {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: 0.15rem 0 0;
}

/* SEARCH ROW */
.search-order-row {
  display: flex;
  gap: 0.75rem;
}

.search-input-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  flex: 1;
}

.styled-search-input {
  background: transparent;
  border: none;
  color: #f1f5f9;
  font-size: 0.9rem;
  outline: none;
  width: 100%;
}

.btn-lookup {
  background: #f43f5e;
  color: white;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-lookup:hover { background: #e11d48; }

.matched-order-banner {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.2);
  border-radius: 8px;
  padding: 1rem;
}

.meta-col {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.meta-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #fb7185;
}

.order-no {
  font-family: monospace;
  font-size: 0.95rem;
  color: #f1f5f9;
}

.price-val {
  font-weight: 700;
  color: #38bdf8;
}

/* TABLE */
.table-wrap {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.items-table th {
  background: rgba(15, 23, 42, 0.6);
  color: #94a3b8;
  padding: 0.75rem 1rem;
  text-align: left;
}

.items-table td {
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
}

.row-active {
  background: rgba(244, 63, 94, 0.06);
}

.unit-tag {
  background: rgba(255, 255, 255, 0.06);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.stepper {
  display: flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  width: 90px;
  margin: 0 auto;
}

.stepper .step-btn {
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: #cbd5e1;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}

.stepper .step-val {
  width: 100%;
  background: transparent;
  border: none;
  color: white;
  text-align: center;
  font-size: 0.85rem;
}

.styled-select-mini {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f1f5f9;
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
  font-size: 0.8rem;
  width: 100%;
}

/* STEP 3 GRID */
.step-split-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.5rem;
}

.controls-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-item label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
}

.styled-select, .styled-input {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  font-size: 0.875rem;
  outline: none;
}

.summary-box {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.sum-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
}

.sum-amount {
  font-size: 1.5rem;
  font-weight: 900;
  color: #fb7185;
}

.sum-items-count {
  font-size: 0.8rem;
  color: #cbd5e1;
}

.pin-auth-box {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(244, 63, 94, 0.3);
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 1rem;
}

.pin-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: #f1f5f9;
}

.styled-pin-input {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  font-size: 1rem;
  letter-spacing: 0.3em;
  text-align: center;
  outline: none;
}

.btn-approve-return {
  background: #f43f5e;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-approve-return:hover { background: #e11d48; }

/* HISTORY VIEW */
.history-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.history-search-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.55rem 0.85rem;
  width: 350px;
}

.history-search-input {
  background: transparent;
  border: none;
  color: #f1f5f9;
  font-size: 0.875rem;
  outline: none;
  width: 100%;
}

.returns-table-wrapper {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
}

.returns-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.returns-table th {
  background: rgba(15, 23, 42, 0.6);
  color: #94a3b8;
  padding: 0.75rem 1rem;
  text-align: left;
}

.returns-table td {
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
}

.reason-badge {
  background: rgba(255, 255, 255, 0.06);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.tender-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
}

.tender-badge.cash { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.tender-badge.credit { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }

.btn-voucher {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  cursor: pointer;
}

.btn-voucher:hover { background: rgba(255, 255, 255, 0.12); }

/* PRINT PREVIEW */
.print-preview-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1200;
  padding: 1rem;
}

.print-preview-modal {
  background: #1e293b;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  height: 94vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.print-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.print-meta-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #cbd5e1;
  font-size: 0.95rem;
}

.ctrl-btns {
  display: flex;
  gap: 0.75rem;
}

.btn-print {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f43f5e;
  color: white;
  border: none;
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-close-print {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 0.55rem;
  border-radius: 8px;
  cursor: pointer;
}

.printable-sheet {
  background: white;
  color: #0f172a;
  flex: 1;
  overflow-y: auto;
  padding: 2.5rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #0f172a;
  padding-bottom: 1.25rem;
}

.brand-name {
  font-size: 1.35rem;
  font-weight: 900;
  color: #0f172a;
  margin: 0;
}

.brand-sub {
  font-size: 0.85rem;
  color: #475569;
  font-weight: 600;
  margin: 0.25rem 0;
}

.brand-contact, .brand-tax {
  font-size: 0.775rem;
  color: #64748b;
  margin: 0.15rem 0;
}

.doc-badge-block {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.credit-stamp {
  background: #be123c;
  color: white;
  font-weight: 800;
  font-size: 0.85rem;
  padding: 0.4rem 0.85rem;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.doc-ref-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.ref-label { color: #64748b; font-weight: 600; }
.ref-val { font-weight: 700; color: #0f172a; }

.client-meta-box {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  background: #f8fafc;
  padding: 1.25rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.col-title {
  font-size: 0.725rem;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 0.35rem;
}

.client-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 0.35rem;
}

.client-col p {
  font-size: 0.8rem;
  color: #334155;
  margin: 0.2rem 0;
}

.doc-items-table {
  width: 100%;
  border-collapse: collapse;
}

.doc-items-table th {
  background: #0f172a;
  color: white;
  padding: 0.65rem 0.85rem;
  font-size: 0.8rem;
  text-align: left;
}

.doc-items-table td {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.825rem;
  color: #1e293b;
}

.doc-bottom-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 2rem;
  margin-top: 1rem;
}

.doc-terms h4 {
  font-size: 0.825rem;
  font-weight: 800;
  margin: 0 0 0.4rem;
  color: #0f172a;
}

.doc-terms p {
  font-size: 0.75rem;
  color: #475569;
  margin: 0.25rem 0;
  line-height: 1.4;
}

.doc-totals-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #475569;
}

.grand-total-row {
  border-top: 2px solid #be123c;
  padding-top: 0.5rem;
  font-size: 1.05rem;
  font-weight: 900;
  color: #be123c;
}

.doc-sign-blocks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  margin-top: 3.5rem;
  padding-top: 1rem;
}

.sign-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sign-line {
  width: 100%;
  border-bottom: 1px dashed #94a3b8;
  margin-bottom: 0.5rem;
}

.sign-box span {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
}

@media print {
  .no-print {
    display: none !important;
  }
  .modal-overlay, .print-preview-backdrop {
    position: static;
    background: transparent;
    padding: 0;
  }
  .print-preview-modal {
    height: auto;
    max-width: 100%;
    border-radius: 0;
    box-shadow: none;
  }
  .printable-sheet {
    padding: 0;
    overflow: visible;
  }
}
</style>

