<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import api from '../api'
import { 
  FileText, Plus, Search, CheckCircle2, Clock, XCircle, ArrowRightCircle,
  Printer, Trash2, Calendar, User, Phone, Check, RefreshCw, X, ShoppingBag, 
  Download, FileSpreadsheet, Send, ShieldCheck, DollarSign
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const quotations = ref([])
const customers = ref([])
const catalogProducts = ref([])
const loading = ref(false)
const activeTab = ref('ALL') // 'ALL' | 'PENDING' | 'ACCEPTED' | 'CONVERTED'
const searchQuery = ref('')

// New Quotation Form Modal
const showCreateModal = ref(false)
const selectedCustomer = ref(null)
const quoteCustomerName = ref('')
const quoteCustomerPhone = ref('')
const quoteCustomerEmail = ref('')
const quoteValidityDays = ref(30)
const quoteNotes = ref('Standard wholesale payment terms: net 30 days. Delivery to customer premises within 48 hours of order confirmation.')
const quoteItems = ref([])

// Print / View Quotation Modal
const printQuote = ref(null)
const showPrintModal = ref(false)

const fetchQuotations = async () => {
  loading.value = true
  try {
    const res = await api.get('/pos/quotations/')
    quotations.value = res.data
  } catch (err) {
    store.showToast('Failed to load quotations list.', 'error')
  } finally {
    loading.value = false
  }
}

const fetchDependencies = async () => {
  try {
    const [custRes, prodRes] = await Promise.all([
      api.get('/pos/customers/'),
      api.get('/catalog/products/')
    ])
    customers.value = custRes.data
    catalogProducts.value = prodRes.data
  } catch (err) {
    // Non-fatal
  }
}

onMounted(() => {
  fetchQuotations()
  fetchDependencies()
})

const filteredQuotations = computed(() => {
  return quotations.value.filter(q => {
    const matchesTab = activeTab.value === 'ALL' || q.status === activeTab.value
    const matchesSearch = !searchQuery.value || 
      q.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (q.customer_name && q.customer_name.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (q.customer_phone && q.customer_phone.includes(searchQuery.value))
    return matchesTab && matchesSearch
  })
})

const openCreateForm = () => {
  // If there are items in the cart, offer to populate the quote from current cart
  if (store.cart.length > 0) {
    quoteItems.value = store.cart.map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      is_pack: item.is_pack_sale,
      pack_name: item.product.pack_name || 'Pack',
      unit_name: item.product.unit_name || 'Piece',
      quantity: item.quantity,
      unit_price: parseFloat(item.unit_price),
      subtotal: parseFloat(item.subtotal)
    }))
  } else {
    quoteItems.value = []
  }

  if (store.selectedCustomer) {
    selectedCustomer.value = store.selectedCustomer
    quoteCustomerName.value = store.selectedCustomer.name
    quoteCustomerPhone.value = store.selectedCustomer.phone || ''
    quoteCustomerEmail.value = store.selectedCustomer.email || ''
  } else {
    selectedCustomer.value = null
    quoteCustomerName.value = ''
    quoteCustomerPhone.value = ''
    quoteCustomerEmail.value = ''
  }

  showCreateModal.value = true
}

const addProductToQuote = (product, isPack = true) => {
  const existing = quoteItems.value.find(i => i.product_id === product.id && i.is_pack === isPack)
  if (existing) {
    existing.quantity += 1
    existing.subtotal = existing.quantity * existing.unit_price
  } else {
    // Wholesale tier price: 15% discount off retail or custom split
    let price = parseFloat(product.selling_price)
    if (store.stationeryMode === 'WHOLESALE' || true) {
      if (!isPack && product.allow_split_sale) {
        const base = product.split_unit_price || (product.selling_price / product.pack_unit_ratio)
        price = parseFloat((base * 0.85).toFixed(2))
      } else {
        price = parseFloat((price * 0.85).toFixed(2))
      }
    }

    quoteItems.value.push({
      product_id: product.id,
      product_name: product.name,
      is_pack: isPack,
      pack_name: product.pack_name || 'Pack',
      unit_name: product.unit_name || 'Piece',
      quantity: 1,
      unit_price: price,
      subtotal: price
    })
  }
}

const updateItemQty = (index, delta) => {
  const item = quoteItems.value[index]
  const newQty = item.quantity + delta
  if (newQty <= 0) {
    quoteItems.value.splice(index, 1)
  } else {
    item.quantity = newQty
    item.subtotal = item.quantity * item.unit_price
  }
}

const updateItemPrice = (index, newPrice) => {
  const item = quoteItems.value[index]
  item.unit_price = Math.max(0, parseFloat(newPrice) || 0)
  item.subtotal = item.quantity * item.unit_price
}

const removeItem = (index) => {
  quoteItems.value.splice(index, 1)
}

const quoteSubtotal = computed(() => {
  return quoteItems.value.reduce((acc, i) => acc + (parseFloat(i.subtotal) || 0), 0)
})

const handleCustomerSelect = (e) => {
  const cid = e.target.value
  if (!cid) {
    selectedCustomer.value = null
    return
  }
  const cust = customers.value.find(c => String(c.id) === String(cid))
  if (cust) {
    selectedCustomer.value = cust
    quoteCustomerName.value = cust.name
    quoteCustomerPhone.value = cust.phone || ''
    quoteCustomerEmail.value = cust.email || ''
  }
}

const handleSaveQuotation = async () => {
  if (!quoteCustomerName.value.trim()) {
    store.showToast('Please specify a customer or business name for this quotation.', 'warning')
    return
  }
  if (quoteItems.value.length === 0) {
    store.showToast('Please add at least one stationery item to the quotation.', 'warning')
    return
  }

  loading.value = true
  try {
    const payload = {
      customer_id: selectedCustomer.value?.id || null,
      customer_name: quoteCustomerName.value.trim(),
      customer_phone: quoteCustomerPhone.value.trim(),
      customer_email: quoteCustomerEmail.value.trim(),
      items: quoteItems.value,
      valid_days: quoteValidityDays.value,
      notes: quoteNotes.value,
      terms: 'Fringe Investment Co. Wholesale Quotation. Prices in TSH, valid for 30 days.'
    }

    const res = await api.post('/pos/quotations/', payload)
    store.showToast(`Quotation ${res.data.id} created successfully!`, 'success')
    showCreateModal.value = false
    await fetchQuotations()

    // Prompt to view / print immediately
    openPrintView(res.data)
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to save quotation.', 'error')
  } finally {
    loading.value = false
  }
}

const updateStatus = async (quote, newStatus) => {
  try {
    const res = await api.patch(`/pos/quotations/${quote.id}/`, { status: newStatus })
    quote.status = newStatus
    store.showToast(`Quotation status updated to ${newStatus}`, 'success')
  } catch (err) {
    store.showToast('Failed to update status.', 'error')
  }
}

const convertToSaleOrder = async (quote) => {
  if (!store.canRecordSales) {
    store.showToast('Only frontline Stationery Cashiers can record sales orders. Managers perform approvals and oversight.', 'warning')
    return
  }

  // Clear current cart and load quotation items
  store.clearCart()
  store.stationeryMode = 'WHOLESALE'

  // Match or attach customer
  if (quote.customer_id) {
    const foundCust = customers.value.find(c => String(c.id) === String(quote.customer_id))
    if (foundCust) {
      store.selectedCustomer = foundCust
    } else {
      store.selectedCustomer = {
        id: quote.customer_id,
        name: quote.customer_name,
        phone: quote.customer_phone,
        current_balance: '0.00',
        available_credit: '0.00'
      }
    }
  } else {
    // Try to find by name
    const foundCust = customers.value.find(c => c.name.toLowerCase() === quote.customer_name.toLowerCase())
    if (foundCust) {
      store.selectedCustomer = foundCust
    }
  }

  // Populate cart
  for (const item of quote.items) {
    const prod = catalogProducts.value.find(p => String(p.id) === String(item.product_id)) || {
      id: item.product_id,
      name: item.product_name,
      selling_price: item.unit_price,
      is_pack: item.is_pack,
      pack_name: item.pack_name,
      unit_name: item.unit_name
    }
    store.addToCart(prod, item.quantity, item.is_pack, item.unit_price)
  }

  // Attach active quote reference
  store.activeQuotationId = quote.id

  store.showToast(`Loaded ${quote.items.length} items from ${quote.id} into Wholesale Ticket!`, 'success')
  emit('close')
}

const openPrintView = (quote) => {
  printQuote.value = quote
  showPrintModal.value = true
}

const printDocument = () => {
  window.print()
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card quotations-card">
      <!-- HEADER -->
      <div class="modal-header">
        <div class="header-title-box">
          <div class="icon-bubble">
            <FileText :size="22" class="text-indigo" />
          </div>
          <div>
            <h2>{{ t('quote.title') }}</h2>
            <p class="subtitle">{{ t('quote.subtitle') }}</p>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-create" @click="openCreateForm">
            <Plus :size="16" />
            <span>{{ t('quote.createNew') }}</span>
          </button>
          <button class="btn-close" @click="$emit('close')" :title="t('common.backToPos')">
            <X :size="16" />
            <span>{{ t('common.backToPos') }}</span>
          </button>
        </div>
      </div>

      <!-- FILTER TABS & SEARCH -->
      <div class="filter-strip">
        <div class="status-tabs">
          <button 
            v-for="st in ['ALL', 'PENDING', 'ACCEPTED', 'CONVERTED']" 
            :key="st"
            class="tab-btn"
            :class="{ active: activeTab === st }"
            @click="activeTab = st"
          >
            {{
              st === 'ALL' ? t('quote.tabAll')
              : st === 'PENDING' ? t('quote.tabPending')
              : st === 'ACCEPTED' ? t('quote.tabAccepted')
              : t('quote.tabConverted')
            }}
          </button>
        </div>

        <div class="search-box">
          <Search :size="16" class="search-icon" />
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="t('quote.searchPlaceholder')"
            class="search-input"
          />
        </div>
      </div>

      <!-- QUOTATIONS LIST -->
      <div class="quotes-body">
        <div v-if="loading" class="state-placeholder">
          <RefreshCw :size="32" class="spinner" />
          <p>{{ t('quote.loading') }}</p>
        </div>

        <div v-else-if="filteredQuotations.length === 0" class="state-placeholder">
          <FileText :size="48" class="empty-icon" />
          <h3>{{ t('quote.emptyTitle') }}</h3>
          <p v-if="searchQuery">"{{ searchQuery }}"</p>
          <p v-else>{{ t('quote.emptySub') }}</p>
        </div>

        <div v-else class="quotes-grid">
          <div 
            v-for="q in filteredQuotations" 
            :key="q.id" 
            class="quote-card"
            :class="`status-${q.status.toLowerCase()}`"
          >
            <div class="card-top">
              <div class="quote-id-group">
                <span class="quote-id">{{ q.id }}</span>
                <span class="quote-date">{{ new Date(q.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }}</span>
              </div>
              <span class="status-badge" :class="q.status.toLowerCase()">
                {{ q.status }}
              </span>
            </div>

            <div class="customer-info">
              <h4 class="cust-title">{{ q.customer_name }}</h4>
              <div class="cust-details">
                <span v-if="q.customer_phone"><Phone :size="12" /> {{ q.customer_phone }}</span>
                <span><Clock :size="12" /> Valid till: {{ q.valid_until }}</span>
              </div>
            </div>

            <div class="items-preview">
              <div class="items-count-badge">
                {{ q.items?.length || 0 }} Line Items
              </div>
              <div class="items-snippet">
                <span v-for="(it, idx) in q.items.slice(0, 3)" :key="idx" class="item-tag">
                  {{ it.quantity }}x {{ it.product_name }}
                </span>
                <span v-if="q.items.length > 3" class="more-tag">+{{ q.items.length - 3 }} more</span>
              </div>
            </div>

            <div class="quote-totals">
              <span class="total-label">Quoted Amount:</span>
              <span class="total-val">TSH {{ parseFloat(q.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
            </div>

            <div class="card-actions">
              <button class="btn-action-view" @click="openPrintView(q)" title="View & Print Proforma Invoice">
                <Printer :size="14" />
                <span>View & Print</span>
              </button>

              <button 
                v-if="q.status !== 'CONVERTED'" 
                class="btn-action-convert" 
                @click="convertToSaleOrder(q)"
                title="Convert this quote directly into an active Wholesale POS Order"
              >
                <ArrowRightCircle :size="14" />
                <span>Convert to Sale</span>
              </button>

              <div v-if="q.status === 'PENDING'" class="status-quick-toggle">
                <button class="btn-status-ok" @click="updateStatus(q, 'ACCEPTED')" title="Mark as Accepted by Customer">
                  <Check :size="14" />
                </button>
                <button class="btn-status-no" @click="updateStatus(q, 'REJECTED')" title="Mark as Rejected">
                  <X :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CREATE QUOTATION DIALOG -->
      <div v-if="showCreateModal" class="inner-modal-backdrop" @click.self="showCreateModal = false">
        <div class="inner-modal-card">
          <div class="inner-header">
            <div class="header-left">
              <FileText :size="20" class="text-indigo" />
              <h3>Draft Wholesale Quotation / Proforma</h3>
            </div>
            <button class="btn-close-sub" @click="showCreateModal = false">
              <X :size="18" />
            </button>
          </div>

          <div class="inner-body">
            <!-- Customer Picker & Details -->
            <div class="form-section">
              <h4 class="section-title">Customer / Institution Details</h4>
              <div class="form-row-grid">
                <div class="field-group">
                  <label>Select Registered Customer (Optional)</label>
                  <select class="styled-select" @change="handleCustomerSelect">
                    <option value="">-- Choose Existing Account or Enter Below --</option>
                    <option v-for="c in customers" :key="c.id" :value="c.id">
                      {{ c.name }} ({{ c.phone || 'No phone' }})
                    </option>
                  </select>
                </div>

                <div class="field-group">
                  <label>Customer / School / Business Name *</label>
                  <input 
                    v-model="quoteCustomerName" 
                    type="text" 
                    placeholder="e.g. St. Jude Secondary School" 
                    class="styled-input"
                  />
                </div>

                <div class="field-group">
                  <label>Contact Phone</label>
                  <input 
                    v-model="quoteCustomerPhone" 
                    type="text" 
                    placeholder="e.g. 0712 345 678" 
                    class="styled-input"
                  />
                </div>

                <div class="field-group">
                  <label>Validity (Days)</label>
                  <select v-model="quoteValidityDays" class="styled-select">
                    <option :value="7">7 Days</option>
                    <option :value="14">14 Days</option>
                    <option :value="30">30 Days (Recommended)</option>
                    <option :value="60">60 Days</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Items Section -->
            <div class="form-section">
              <div class="section-header-split">
                <h4 class="section-title">Quotation Line Items</h4>
                <div class="catalog-quick-add">
                  <select class="styled-select quick-add-select" @change="(e) => {
                    const pid = e.target.value
                    if (!pid) return
                    const prod = catalogProducts.find(p => String(p.id) === String(pid))
                    if (prod) addProductToQuote(prod, true)
                    e.target.value = ''
                  }">
                    <option value="">+ Add Product from Catalog...</option>
                    <option v-for="p in catalogProducts" :key="p.id" :value="p.id">
                      {{ p.name }} (Stock: {{ p.stock_quantity }})
                    </option>
                  </select>
                </div>
              </div>

              <div class="items-table-wrapper">
                <table class="styled-table">
                  <thead>
                    <tr>
                      <th>Product Description</th>
                      <th>Sale Unit</th>
                      <th style="width: 120px;">Quantity</th>
                      <th style="width: 140px;">Wholesale Unit Price (TSH)</th>
                      <th style="text-align: right;">Subtotal (TSH)</th>
                      <th style="width: 40px;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="quoteItems.length === 0">
                      <td colspan="6" class="text-center empty-cell">
                        No items added to this quotation yet. Pick from catalog above.
                      </td>
                    </tr>
                    <tr v-for="(it, idx) in quoteItems" :key="idx">
                      <td>
                        <strong>{{ it.product_name }}</strong>
                      </td>
                      <td>
                        <span class="unit-badge">{{ it.is_pack ? it.pack_name : it.unit_name }}</span>
                      </td>
                      <td>
                        <div class="stepper-mini">
                          <button class="step-btn" @click="updateItemQty(idx, -1)">-</button>
                          <input 
                            type="number" 
                            min="1" 
                            v-model.number="it.quantity" 
                            class="step-input" 
                            @change="it.subtotal = it.quantity * it.unit_price"
                          />
                          <button class="step-btn" @click="updateItemQty(idx, 1)">+</button>
                        </div>
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="0.01" 
                          v-model.number="it.unit_price" 
                          class="styled-input-mini"
                          @input="it.subtotal = it.quantity * it.unit_price"
                        />
                      </td>
                      <td style="text-align: right; font-weight: 600;">
                        {{ (it.quantity * it.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                      </td>
                      <td>
                        <button class="btn-del-mini" @click="removeItem(idx)">
                          <Trash2 :size="14" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Grand Total Summary -->
              <div class="quote-summary-bar">
                <div class="notes-field">
                  <label>Commercial Terms & Delivery Notes</label>
                  <textarea v-model="quoteNotes" rows="2" class="styled-textarea" placeholder="Payment terms, delivery point, etc."></textarea>
                </div>
                <div class="quote-final-amount">
                  <span class="final-label">Total Quotation Value:</span>
                  <span class="final-val">TSH {{ quoteSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="inner-footer">
            <button class="btn-cancel" @click="showCreateModal = false">Cancel</button>
            <button class="btn-confirm-save" :disabled="loading" @click="handleSaveQuotation">
              <Check :size="16" />
              <span>Save & Issue Quotation</span>
            </button>
          </div>
        </div>
      </div>

      <!-- PRINT / PROFORMA MODAL -->
      <div v-if="showPrintModal && printQuote" class="print-preview-backdrop" @click.self="showPrintModal = false">
        <div class="print-preview-modal">
          <div class="print-controls no-print">
            <div class="print-meta-info">
              <FileText :size="18" class="text-indigo" />
              <span>Print Preview: <strong>{{ printQuote.id }}</strong></span>
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
          <div class="printable-sheet" id="printable-quotation">
            <div class="doc-header">
              <div class="company-brand">
                <h1 class="brand-name">FRINGE INVESTMENT COMPANY LIMITED</h1>
                <p class="brand-sub">Stationery, Office Supplies, Printing & Wholesale Distribution</p>
                <p class="brand-contact">P.O. Box 1024, Commercial District, Tanzania | Phone: +255 700 000 000</p>
                <p class="brand-tax">TIN: 142-985-321 | VRN: 40-023819-W</p>
              </div>

              <div class="doc-badge-block">
                <div class="proforma-stamp">PROFORMA INVOICE / QUOTATION</div>
                <div class="doc-ref-row">
                  <span class="ref-label">Quote Ref:</span>
                  <span class="ref-val">{{ printQuote.id }}</span>
                </div>
                <div class="doc-ref-row">
                  <span class="ref-label">Date Issued:</span>
                  <span class="ref-val">{{ new Date(printQuote.created_at).toLocaleDateString('en-GB') }}</span>
                </div>
                <div class="doc-ref-row">
                  <span class="ref-label">Valid Until:</span>
                  <span class="ref-val">{{ printQuote.valid_until }}</span>
                </div>
              </div>
            </div>

            <div class="client-meta-box">
              <div class="client-col">
                <span class="col-title">QUOTATION PREPARED FOR:</span>
                <h3 class="client-name">{{ printQuote.customer_name }}</h3>
                <p v-if="printQuote.customer_phone">Phone: {{ printQuote.customer_phone }}</p>
                <p v-if="printQuote.customer_email">Email: {{ printQuote.customer_email }}</p>
              </div>
              <div class="client-col payment-info-col">
                <span class="col-title">BANK PAYMENT DETAILS:</span>
                <p><strong>Bank:</strong> CRDB Bank Plc</p>
                <p><strong>Account Name:</strong> Fringe Investment Co. Ltd</p>
                <p><strong>Account No:</strong> 0150293847200</p>
                <p><strong>Mobile Money Paybill:</strong> Lipa Namba 5829103</p>
              </div>
            </div>

            <table class="doc-items-table">
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th>Item Description</th>
                  <th style="width: 100px;">Packaging</th>
                  <th style="width: 80px; text-align: center;">Qty</th>
                  <th style="width: 140px; text-align: right;">Unit Price (TSH)</th>
                  <th style="width: 140px; text-align: right;">Subtotal (TSH)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(it, i) in printQuote.items" :key="i">
                  <td>{{ i + 1 }}</td>
                  <td><strong>{{ it.product_name }}</strong></td>
                  <td>{{ it.is_pack ? it.pack_name : it.unit_name }}</td>
                  <td style="text-align: center;">{{ it.quantity }}</td>
                  <td style="text-align: right;">{{ parseFloat(it.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                  <td style="text-align: right; font-weight: 600;">{{ (it.quantity * it.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                </tr>
              </tbody>
            </table>

            <div class="doc-bottom-grid">
              <div class="doc-terms">
                <h4>Terms & Commercial Conditions</h4>
                <p>{{ printQuote.notes || '1. Prices include all statutory taxes unless specified.' }}</p>
                <p>2. Payment strictly upon delivery or as agreed in formal credit terms.</p>
                <p>3. Goods delivered remain the property of Fringe Investment Co. until fully paid.</p>
              </div>

              <div class="doc-totals-box">
                <div class="totals-row">
                  <span>Subtotal:</span>
                  <span>TSH {{ parseFloat(printQuote.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="totals-row">
                  <span>VAT (18% Included):</span>
                  <span>TSH {{ (parseFloat(printQuote.total_amount) * 0.18 / 1.18).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="totals-row grand-total-row">
                  <span>TOTAL QUOTED:</span>
                  <span>TSH {{ parseFloat(printQuote.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>

            <div class="doc-sign-blocks">
              <div class="sign-box">
                <div class="sign-line"></div>
                <span>Prepared By (Wholesale Sales Officer)</span>
              </div>
              <div class="sign-box">
                <div class="sign-line"></div>
                <span>Authorized Signatory & Official Stamp</span>
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

.quotations-card {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 1100px;
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
  background: rgba(99, 102, 241, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-indigo { color: #818cf8; }

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

.btn-create {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #4f46e5;
  color: white;
  border: none;
  padding: 0.6rem 1.1rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-create:hover {
  background: #4338ca;
  transform: translateY(-1px);
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

/* FILTER STRIP */
.filter-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.75rem;
  background: rgba(15, 23, 42, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.status-tabs {
  display: flex;
  gap: 0.5rem;
}

.tab-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #9ca3af;
  padding: 0.45rem 1rem;
  border-radius: 8px;
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  border-color: #6366f1;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.45rem 0.85rem;
  width: 300px;
}

.search-input {
  background: transparent;
  border: none;
  color: #e2e8f0;
  font-size: 0.85rem;
  outline: none;
  width: 100%;
}

.search-icon { color: #64748b; }

/* BODY */
.quotes-body {
  flex: 1;
  padding: 1.5rem 1.75rem;
  overflow-y: auto;
}

.quotes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

.quote-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  transition: all 0.2s ease;
}

.quote-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  transform: translateY(-2px);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.quote-id-group {
  display: flex;
  flex-direction: column;
}

.quote-id {
  font-family: monospace;
  font-weight: 700;
  color: #818cf8;
  font-size: 0.95rem;
}

.quote-date {
  font-size: 0.75rem;
  color: #64748b;
}

.status-badge {
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  font-size: 0.725rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status-badge.pending { background: rgba(234, 179, 8, 0.15); color: #facc15; }
.status-badge.accepted { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.status-badge.converted { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.status-badge.rejected { background: rgba(239, 68, 68, 0.15); color: #f87171; }

.customer-info .cust-title {
  font-size: 1rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.3rem;
}

.cust-details {
  display: flex;
  gap: 1rem;
  font-size: 0.775rem;
  color: #94a3b8;
}

.cust-details span {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.items-preview {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.items-count-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: #cbd5e1;
}

.items-snippet {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.item-tag, .more-tag {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.725rem;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  color: #94a3b8;
}

.quote-totals {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.85rem;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 8px;
}

.total-label {
  font-size: 0.8rem;
  color: #94a3b8;
}

.total-val {
  font-size: 1.05rem;
  font-weight: 800;
  color: #38bdf8;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: auto;
}

.btn-action-view, .btn-action-convert {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-action-view {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  border-color: rgba(255, 255, 255, 0.1);
}

.btn-action-view:hover { background: rgba(255, 255, 255, 0.12); }

.btn-action-convert {
  background: #0284c7;
  color: white;
}

.btn-action-convert:hover { background: #0369a1; }

.status-quick-toggle {
  display: flex;
  gap: 0.35rem;
}

.btn-status-ok, .btn-status-no {
  padding: 0.55rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-status-ok { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.btn-status-no { background: rgba(239, 68, 68, 0.2); color: #f87171; }

/* STATE PLACEHOLDER */
.state-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: #64748b;
}

.state-placeholder h3 {
  color: #cbd5e1;
  margin: 1rem 0 0.5rem;
}

/* INNER MODAL (CREATE QUOTE) */
.inner-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1.5rem;
}

.inner-modal-card {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  width: 100%;
  max-width: 850px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

.inner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-left h3 {
  font-size: 1.15rem;
  color: #f1f5f9;
  margin: 0;
}

.btn-close-sub {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.inner-body {
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.section-title {
  font-size: 0.925rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.section-header-split {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-row-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
}

.styled-input, .styled-select, .styled-textarea {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  font-size: 0.875rem;
  outline: none;
}

.styled-input:focus, .styled-select:focus, .styled-textarea:focus {
  border-color: #6366f1;
}

.quick-add-select {
  padding: 0.45rem 0.85rem;
  font-size: 0.825rem;
}

/* TABLE */
.items-table-wrapper {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
}

.styled-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.styled-table th {
  background: rgba(30, 41, 59, 0.5);
  color: #94a3b8;
  font-weight: 600;
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.styled-table td {
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
}

.unit-badge {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.stepper-mini {
  display: flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  width: 90px;
  overflow: hidden;
}

.stepper-mini .step-btn {
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: #cbd5e1;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
}

.stepper-mini .step-input {
  width: 100%;
  background: transparent;
  border: none;
  color: white;
  text-align: center;
  font-size: 0.85rem;
  outline: none;
}

.styled-input-mini {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
  color: white;
  width: 120px;
  font-size: 0.85rem;
}

.btn-del-mini {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
}

.quote-summary-bar {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.5rem;
  align-items: center;
  margin-top: 0.5rem;
}

.notes-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.notes-field label {
  font-size: 0.75rem;
  color: #94a3b8;
}

.quote-final-amount {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.final-label {
  font-size: 0.8rem;
  color: #94a3b8;
}

.final-val {
  font-size: 1.35rem;
  font-weight: 800;
  color: #38bdf8;
}

.inner-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.4);
}

.btn-cancel {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm-save {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #4f46e5;
  color: white;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm-save:hover { background: #4338ca; }

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
  background: #4f46e5;
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

.proforma-stamp {
  background: #0f172a;
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

.payment-info-col p {
  font-size: 0.8rem;
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
  grid-template-columns: 1fr 300px;
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
  border-top: 2px solid #0f172a;
  padding-top: 0.5rem;
  font-size: 1.05rem;
  font-weight: 900;
  color: #0f172a;
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

/* PRINT MEDIA */
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

