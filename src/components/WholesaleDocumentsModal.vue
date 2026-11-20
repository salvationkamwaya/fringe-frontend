<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import api from '../api'
import { 
  FileText, Truck, Printer, Search, Calendar, User, CheckCircle2,
  Download, X, RefreshCw, ShoppingCart, ArrowRight
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const orders = ref([])
const loading = ref(false)
const searchQuery = ref('')
const selectedOrder = ref(null)
const documentType = ref('INVOICE') // 'INVOICE' | 'DELIVERY_NOTE'

// Delivery Note fields
const vehicleNumber = ref('')
const driverName = ref('')
const deliveryAddress = ref('')

const fetchWholesaleOrders = async () => {
  loading.value = true
  try {
    const res = await api.get('/pos/orders/', {
      params: { search: '-WS-' } // Wholesale orders
    })
    const list = res.data?.results || res.data || []
    orders.value = list
    if (list.length > 0 && !selectedOrder.value) {
      selectedOrder.value = list[0]
      if (list[0].customer?.address) {
        deliveryAddress.value = list[0].customer.address
      }
    }
  } catch (err) {
    store.showToast('Failed to load wholesale orders.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchWholesaleOrders()
})

const filteredOrders = computed(() => {
  if (!searchQuery.value) return orders.value
  const q = searchQuery.value.toLowerCase()
  return orders.value.filter(o => 
    o.order_number.toLowerCase().includes(q) ||
    (o.customer?.name && o.customer.name.toLowerCase().includes(q))
  )
})

const selectOrder = (order) => {
  selectedOrder.value = order
  if (order.customer?.address) {
    deliveryAddress.value = order.customer.address
  } else {
    deliveryAddress.value = 'Main Campus / Head Office Receiving Dock'
  }
}

const printDocument = () => {
  window.print()
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card docs-card">
      <!-- HEADER -->
      <div class="modal-header no-print">
        <div class="header-title-box">
          <div class="icon-bubble">
            <FileText :size="22" class="text-blue" />
          </div>
          <div>
            <h2>{{ t('ws.title') }}</h2>
            <p class="subtitle">{{ t('ws.subtitle') }}</p>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-print-doc" @click="printDocument">
            <Printer :size="16" />
            <span>{{ documentType === 'INVOICE' ? t('ws.printInvoice') : t('ws.printDelivery') }}</span>
          </button>
          <button class="btn-close" @click="$emit('close')" :title="t('common.backToPos')">
            <X :size="16" />
            <span>{{ t('common.backToPos') }}</span>
          </button>
        </div>
      </div>

      <!-- MAIN WORKSPACE -->
      <div class="docs-workspace">
        <!-- LEFT: Wholesale Orders Selector (no-print) -->
        <aside class="orders-sidebar no-print">
          <div class="sidebar-search">
            <Search :size="16" class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              :placeholder="t('ws.searchPlaceholder')" 
              class="sidebar-search-input"
            />
          </div>

          <div class="doc-type-toggle">
            <button 
              class="type-btn" 
              :class="{ active: documentType === 'INVOICE' }"
              @click="documentType = 'INVOICE'"
            >
              <FileText :size="14" />
              <span>{{ t('ws.tabInvoice') }}</span>
            </button>
            <button 
              class="type-btn" 
              :class="{ active: documentType === 'DELIVERY_NOTE' }"
              @click="documentType = 'DELIVERY_NOTE'"
            >
              <Truck :size="14" />
              <span>{{ t('ws.tabDelivery') }}</span>
            </button>
          </div>

          <div v-if="documentType === 'DELIVERY_NOTE'" class="delivery-meta-inputs">
            <div class="field-item">
              <label>Vehicle Reg Number</label>
              <input v-model="vehicleNumber" type="text" placeholder="e.g. T 482 DXC" class="styled-input-mini" />
            </div>
            <div class="field-item">
              <label>Driver / Dispatcher</label>
              <input v-model="driverName" type="text" placeholder="e.g. Driver Name" class="styled-input-mini" />
            </div>
            <div class="field-item">
              <label>Delivery Address</label>
              <input v-model="deliveryAddress" type="text" placeholder="Physical Delivery Location" class="styled-input-mini" />
            </div>
          </div>

          <div class="orders-list-scroll">
            <div v-if="loading" class="sidebar-state">
              <RefreshCw :size="20" class="spinner" />
              <span>Loading orders...</span>
            </div>
            <div v-else-if="filteredOrders.length === 0" class="sidebar-state">
              <span>{{ t('ws.noOrders') }}</span>
            </div>
            <div 
              v-else 
              v-for="ord in filteredOrders" 
              :key="ord.id" 
              class="order-picker-item"
              :class="{ active: selectedOrder?.id === ord.id }"
              @click="selectOrder(ord)"
            >
              <div class="item-top">
                <span class="ord-num">{{ ord.order_number }}</span>
                <span class="ord-date">{{ new Date(ord.created_at).toLocaleDateString('en-GB') }}</span>
              </div>
              <div class="ord-cust">{{ ord.customer?.name || 'Walk-in Buyer' }}</div>
              <div class="ord-amount">TSH {{ parseFloat(ord.final_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</div>
            </div>
          </div>
        </aside>

        <!-- RIGHT: Live Document Preview Sheet -->
        <main class="preview-area">
          <div v-if="!selectedOrder" class="no-selection-placeholder no-print">
            <FileText :size="48" class="text-muted" />
            <h3>Select a wholesale order on the left</h3>
            <p>Generate high-resolution printable tax invoices and delivery notes.</p>
          </div>

          <!-- PRINTABLE DOCUMENT -->
          <div v-else class="printable-sheet" id="wholesale-print-sheet">
            <!-- COMPANY & DOCUMENT HEADER -->
            <div class="doc-header">
              <div class="company-brand">
                <h1 class="brand-name">FRINGE INVESTMENT COMPANY LIMITED</h1>
                <p class="brand-sub">Stationery, Office Supplies, Printing & Wholesale Distribution</p>
                <p class="brand-contact">P.O. Box 1024, Commercial District, Tanzania | Phone: +255 700 000 000</p>
                <p class="brand-tax">TIN: 142-985-321 | VRN: 40-023819-W</p>
              </div>

              <div class="doc-badge-block">
                <div class="doc-stamp" :class="documentType.toLowerCase()">
                  {{ documentType === 'INVOICE' ? 'COMMERCIAL TAX INVOICE' : 'OFFICIAL GOODS DELIVERY NOTE' }}
                </div>
                <div class="doc-ref-row">
                  <span class="ref-label">{{ documentType === 'INVOICE' ? 'Invoice Ref:' : 'Delivery Note #:' }}</span>
                  <span class="ref-val">{{ documentType === 'INVOICE' ? `INV-${selectedOrder.order_number}` : `DN-${selectedOrder.order_number}` }}</span>
                </div>
                <div class="doc-ref-row">
                  <span class="ref-label">Order Reference:</span>
                  <span class="ref-val">{{ selectedOrder.order_number }}</span>
                </div>
                <div class="doc-ref-row">
                  <span class="ref-label">Date Issued:</span>
                  <span class="ref-val">{{ new Date(selectedOrder.created_at).toLocaleDateString('en-GB') }}</span>
                </div>
              </div>
            </div>

            <!-- CLIENT & TRANSACTION METADATA -->
            <div class="meta-two-col">
              <div class="meta-box">
                <span class="box-title">{{ documentType === 'INVOICE' ? 'INVOICED TO (BILL TO):' : 'DELIVER TO (CONSIGNEE):' }}</span>
                <h3 class="client-name">{{ selectedOrder.customer?.name || 'Wholesale Client' }}</h3>
                <p v-if="selectedOrder.customer?.phone"><strong>Phone:</strong> {{ selectedOrder.customer.phone }}</p>
                <p v-if="selectedOrder.customer?.email"><strong>Email:</strong> {{ selectedOrder.customer.email }}</p>
                <p><strong>Physical Address:</strong> {{ deliveryAddress || selectedOrder.customer?.address || 'Designated Receiving Bay' }}</p>
                <p v-if="selectedOrder.customer?.tax_id"><strong>Customer TIN:</strong> {{ selectedOrder.customer.tax_id }}</p>
              </div>

              <!-- Right Column Details -->
              <div v-if="documentType === 'INVOICE'" class="meta-box payment-terms-box">
                <span class="box-title">PAYMENT TERMS & BANK DETAILS:</span>
                <p><strong>Payment Terms:</strong> Net 30 Days (Direct Credit / Wire)</p>
                <p><strong>Bank:</strong> CRDB Bank Plc (Commercial Branch)</p>
                <p><strong>Account Name:</strong> Fringe Investment Co. Ltd</p>
                <p><strong>Account Number:</strong> 0150293847200</p>
                <p><strong>Mobile Money / Till:</strong> Lipa Namba 5829103</p>
              </div>

              <div v-else class="meta-box dispatch-meta-box">
                <span class="box-title">LOGISTICS & DISPATCH METADATA:</span>
                <p><strong>Vehicle Reg:</strong> {{ vehicleNumber || 'N/A (Pending Carrier Assignment)' }}</p>
                <p><strong>Driver / Carrier:</strong> {{ driverName || 'N/A (Pending Driver Assignment)' }}</p>
                <p><strong>Dispatch Status:</strong> Dispatched from Fringe Central Warehouse</p>
                <p><strong>Handling Instructions:</strong> Keep dry. Handle cartons with care.</p>
              </div>
            </div>

            <!-- ITEMS TABLE -->
            <table class="doc-items-table">
              <thead>
                <tr>
                  <th style="width: 35px;">#</th>
                  <th>Product Description / Specifications</th>
                  <th style="width: 110px;">Packaging</th>
                  <th style="width: 80px; text-align: center;">Dispatched Qty</th>
                  <th v-if="documentType === 'INVOICE'" style="width: 140px; text-align: right;">Unit Price (TSH)</th>
                  <th v-if="documentType === 'INVOICE'" style="width: 140px; text-align: right;">Total Amount (TSH)</th>
                  <th v-if="documentType === 'DELIVERY_NOTE'" style="width: 140px; text-align: center;">Receiving Check</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(it, i) in selectedOrder.items" :key="i">
                  <td>{{ i + 1 }}</td>
                  <td><strong>{{ it.product_name }}</strong></td>
                  <td>{{ it.is_pack_sale ? (it.product?.pack_name || 'Pack / Carton') : (it.product?.unit_name || 'Piece') }}</td>
                  <td style="text-align: center; font-weight: 700;">{{ it.quantity }}</td>
                  <td v-if="documentType === 'INVOICE'" style="text-align: right;">
                    {{ parseFloat(it.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                  </td>
                  <td v-if="documentType === 'INVOICE'" style="text-align: right; font-weight: 700;">
                    {{ (it.quantity * it.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                  </td>
                  <td v-if="documentType === 'DELIVERY_NOTE'" style="text-align: center;">
                    <span class="chk-box-outline">[ &nbsp; &nbsp; ] OK</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- FOOTER TOTALS OR CONDITIONS -->
            <div class="doc-bottom-section">
              <div v-if="documentType === 'INVOICE'" class="invoice-bottom-grid">
                <div class="tax-declaration">
                  <h4>Statutory Tax Declaration</h4>
                  <p>Certified that the particulars given above are true and correct and the amount indicated represents the price actually charged for the stationery supplied.</p>
                  <p>All prices are strictly in Tanzanian Shillings (TSH).</p>
                </div>
                <div class="financial-totals">
                  <div class="tot-row">
                    <span>Taxable Subtotal:</span>
                    <span>TSH {{ (parseFloat(selectedOrder.final_amount) / 1.18).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
                  </div>
                  <div class="tot-row">
                    <span>VAT (18% Statutory Rate):</span>
                    <span>TSH {{ (parseFloat(selectedOrder.final_amount) * 0.18 / 1.18).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
                  </div>
                  <div class="tot-row grand-total-row">
                    <span>TOTAL INVOICED:</span>
                    <span>TSH {{ parseFloat(selectedOrder.final_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
                  </div>
                </div>
              </div>

              <div v-else class="delivery-declaration">
                <p><strong>Customer Goods Acceptance Declaration:</strong></p>
                <p>I / We hereby acknowledge receipt of the stationery goods listed above in full quantity, intact packaging, and sound commercial condition without any shortage or defect.</p>
              </div>
            </div>

            <!-- SIGNATURE BLOCKS -->
            <div class="doc-signatures-grid">
              <div v-if="documentType === 'INVOICE'" class="sig-block">
                <div class="sig-line"></div>
                <span>Prepared By (Wholesale Billing Clerk)</span>
              </div>
              <div v-if="documentType === 'INVOICE'" class="sig-block">
                <div class="sig-line"></div>
                <span>Authorized Management Signatory & Official Stamp</span>
              </div>

              <div v-if="documentType === 'DELIVERY_NOTE'" class="sig-block">
                <div class="sig-line"></div>
                <span>Dispatched By / Driver (Name & Signature)</span>
              </div>
              <div v-if="documentType === 'DELIVERY_NOTE'" class="sig-block">
                <div class="sig-line"></div>
                <span>Received By Receiving Officer (Name, Signature & Official Stamp)</span>
              </div>
            </div>
          </div>
        </main>
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

.docs-card {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 1200px;
  height: 92vh;
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
  background: rgba(59, 130, 246, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-blue { color: #60a5fa; }

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

.btn-print-doc {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.6rem 1.15rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-print-doc:hover { background: #1d4ed8; }

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

/* WORKSPACE LAYOUT */
.docs-workspace {
  display: grid;
  grid-template-columns: 320px 1fr;
  flex: 1;
  overflow: hidden;
}

/* SIDEBAR */
.orders-sidebar {
  background: rgba(15, 23, 42, 0.5);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 1rem;
  overflow: hidden;
}

.sidebar-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
}

.sidebar-search-input {
  background: transparent;
  border: none;
  color: #f1f5f9;
  font-size: 0.85rem;
  outline: none;
  width: 100%;
}

.doc-type-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background: rgba(30, 41, 59, 0.4);
  padding: 0.25rem;
  border-radius: 8px;
}

.type-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 0.45rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn.active {
  background: #2563eb;
  color: white;
}

.delivery-meta-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: rgba(30, 41, 59, 0.3);
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-item label {
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: 600;
}

.styled-input-mini {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
  font-size: 0.8rem;
}

.orders-list-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: #64748b;
  font-size: 0.85rem;
  gap: 0.5rem;
}

.order-picker-item {
  background: rgba(30, 41, 59, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: all 0.2s;
}

.order-picker-item:hover {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(59, 130, 246, 0.3);
}

.order-picker-item.active {
  background: rgba(37, 99, 235, 0.15);
  border-color: #2563eb;
}

.item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ord-num {
  font-family: monospace;
  font-weight: 700;
  color: #60a5fa;
  font-size: 0.85rem;
}

.ord-date {
  font-size: 0.725rem;
  color: #64748b;
}

.ord-cust {
  font-weight: 600;
  color: #f1f5f9;
  font-size: 0.85rem;
}

.ord-amount {
  font-size: 0.8rem;
  font-weight: 700;
  color: #38bdf8;
}

/* PREVIEW AREA */
.preview-area {
  flex: 1;
  overflow-y: auto;
  background: #0f172a;
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.no-selection-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
  text-align: center;
}

.no-selection-placeholder h3 {
  color: #cbd5e1;
  margin: 1rem 0 0.25rem;
}

/* PRINTABLE SHEET */
.printable-sheet {
  background: white;
  color: #0f172a;
  width: 100%;
  max-width: 820px;
  padding: 2.5rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #0f172a;
  padding-bottom: 1.25rem;
}

.brand-name {
  font-size: 1.3rem;
  font-weight: 900;
  color: #0f172a;
  margin: 0;
}

.brand-sub {
  font-size: 0.825rem;
  color: #475569;
  font-weight: 600;
  margin: 0.25rem 0;
}

.brand-contact, .brand-tax {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0.15rem 0;
}

.doc-badge-block {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.doc-stamp {
  color: white;
  font-weight: 800;
  font-size: 0.825rem;
  padding: 0.4rem 0.85rem;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.doc-stamp.invoice { background: #1e3a8a; }
.doc-stamp.delivery_note { background: #065f46; }

.doc-ref-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  font-size: 0.825rem;
}

.ref-label { color: #64748b; font-weight: 600; }
.ref-val { font-weight: 700; color: #0f172a; }

.meta-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  background: #f8fafc;
  padding: 1.25rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.box-title {
  font-size: 0.7rem;
  font-weight: 800;
  color: #64748b;
  display: block;
  margin-bottom: 0.35rem;
  letter-spacing: 0.04em;
}

.client-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 0.35rem;
}

.meta-box p {
  font-size: 0.785rem;
  color: #334155;
  margin: 0.15rem 0;
}

.doc-items-table {
  width: 100%;
  border-collapse: collapse;
}

.doc-items-table th {
  background: #0f172a;
  color: white;
  padding: 0.65rem 0.85rem;
  font-size: 0.785rem;
  text-align: left;
}

.doc-items-table td {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.8rem;
  color: #1e293b;
}

.chk-box-outline {
  font-family: monospace;
  font-weight: 700;
  color: #059669;
}

.doc-bottom-section {
  margin-top: 0.5rem;
}

.invoice-bottom-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1.5rem;
}

.tax-declaration h4 {
  font-size: 0.8rem;
  font-weight: 800;
  margin: 0 0 0.35rem;
  color: #0f172a;
}

.tax-declaration p {
  font-size: 0.725rem;
  color: #64748b;
  margin: 0.2rem 0;
  line-height: 1.4;
}

.financial-totals {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: #f8fafc;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.tot-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #475569;
}

.grand-total-row {
  border-top: 2px solid #0f172a;
  padding-top: 0.5rem;
  font-size: 1rem;
  font-weight: 900;
  color: #0f172a;
}

.delivery-declaration {
  background: #f8fafc;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #334155;
  line-height: 1.4;
}

.doc-signatures-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3.5rem;
  margin-top: 2.5rem;
}

.sig-block {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sig-line {
  width: 100%;
  border-bottom: 1px dashed #94a3b8;
  margin-bottom: 0.45rem;
}

.sig-block span {
  font-size: 0.725rem;
  color: #64748b;
  font-weight: 600;
  text-align: center;
}

@media print {
  .no-print {
    display: none !important;
  }
  .modal-overlay {
    position: static;
    background: transparent;
    padding: 0;
  }
  .docs-card {
    height: auto;
    max-width: 100%;
    border-radius: 0;
    box-shadow: none;
    border: none;
  }
  .docs-workspace {
    display: block;
  }
  .preview-area {
    padding: 0;
    background: white;
  }
  .printable-sheet {
    box-shadow: none;
    padding: 0;
    max-width: 100%;
  }
}
</style>

