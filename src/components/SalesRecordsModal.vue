<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  Receipt, Search, Calendar, Filter, User as UserIcon, 
  DollarSign, Layers, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  X, Eye, Clock, CheckCircle2, AlertTriangle, ShieldCheck, 
  Wine, BookOpen, RefreshCw, ArrowUpDown, Tag, CreditCard, Banknote, Smartphone
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

// Data State
const orders = ref([])
const loading = ref(true)
const summary = ref({
  total_sales: '0.00',
  total_orders: 0,
  cash_total: '0.00',
  mobile_total: '0.00',
  credit_total: '0.00',
  currency: 'TSH'
})

// Pagination
const page = ref(1)
const pageSize = ref(15)
const totalPages = ref(1)
const totalCount = ref(0)

// Dynamic Filter Options
const availableCashiers = ref([])
const availableCategories = ref([])

// Active Filters
const isFrontline = computed(() => store.canRecordSales)
const mySalesOnly = ref(isFrontline.value)
const selectedCashier = ref('')
const selectedCategory = ref('')
const selectedPaymentMethod = ref('')
const selectedStatus = ref('')
const dateRangePreset = ref('today') // Default to today's sales
const customStartDate = ref('')
const customEndDate = ref('')
const searchQuery = ref('')

// Selected Order for Receipt Drawer
const selectedOrder = ref(null)
const showReceiptDrawer = ref(false)

// Formatting Helpers
const formatMoney = (val) => {
  const num = parseFloat(val) || 0
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatDate = (isoStr) => {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Fetch Filter Options (Cashiers & Categories)
const fetchFilterOptions = async () => {
  try {
    const res = await api.get('/pos/orders/filter_options/')
    availableCashiers.value = res.data.cashiers || []
    availableCategories.value = res.data.categories || []
  } catch (err) {
    console.error('Error loading sales filter options:', err)
  }
}

// Fetch Orders with Current Filters and Pagination
const fetchOrders = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      page_size: pageSize.value
    }

    // Cashier filter
    if (mySalesOnly.value) {
      params.my_sales = 'true'
    } else if (selectedCashier.value) {
      params.cashier = selectedCashier.value
    }

    // Date range filter
    if (dateRangePreset.value === 'custom') {
      if (customStartDate.value) params.start_date = customStartDate.value
      if (customEndDate.value) params.end_date = customEndDate.value
      params.range = 'custom'
    } else if (dateRangePreset.value !== 'all') {
      params.range = dateRangePreset.value
    }

    // Category / Product Type filter
    if (selectedCategory.value) {
      params.category = selectedCategory.value
    }

    // Payment Method filter
    if (selectedPaymentMethod.value) {
      params.payment_method = selectedPaymentMethod.value
    }

    // Status filter
    if (selectedStatus.value) {
      params.status = selectedStatus.value
    }

    // Search query
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }

    const res = await api.get('/pos/orders/', { params })
    
    if (res.data.results) {
      orders.value = res.data.results
      totalCount.value = res.data.count || 0
      totalPages.value = res.data.total_pages || 1
      page.value = res.data.current_page || 1
      if (res.data.summary) {
        summary.value = res.data.summary
      }
    } else {
      orders.value = Array.isArray(res.data) ? res.data : []
      totalCount.value = orders.value.length
      totalPages.value = 1
    }
  } catch (err) {
    store.showToast('Failed to load sales records.', 'error')
  } finally {
    loading.value = false
  }
}

// Watchers for reactive filtering
watch([mySalesOnly, selectedCashier, selectedCategory, selectedPaymentMethod, selectedStatus, dateRangePreset], () => {
  page.value = 1
  fetchOrders()
})

let searchTimer = null
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchOrders()
  }, 350)
})

const onCustomDateChange = () => {
  if (customStartDate.value && customEndDate.value) {
    page.value = 1
    fetchOrders()
  }
}

// Pagination navigation
const goToPage = (p) => {
  if (p >= 1 && p <= totalPages.value && p !== page.value) {
    page.value = p
    fetchOrders()
  }
}

const onPageSizeChange = () => {
  page.value = 1
  fetchOrders()
}

// Reset all filters to default
const resetFilters = () => {
  mySalesOnly.value = isFrontline.value
  selectedCashier.value = ''
  selectedCategory.value = ''
  selectedPaymentMethod.value = ''
  selectedStatus.value = ''
  dateRangePreset.value = 'today'
  customStartDate.value = ''
  customEndDate.value = ''
  searchQuery.value = ''
  page.value = 1
  fetchOrders()
}

// Open Receipt Detail Drawer
const viewReceipt = (order) => {
  selectedOrder.value = order
  showReceiptDrawer.value = true
}

const printReceipt = () => {
  window.print()
}

onMounted(() => {
  fetchFilterOptions()
  fetchOrders()
})
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="sales-window">
      <!-- WINDOW HEADER -->
      <div class="window-header">
        <div class="header-left">
          <div class="header-icon-box">
            <Receipt :size="22" class="text-amber" />
          </div>
          <div>
            <div class="window-title-row">
              <h2 class="window-title">
                {{ isFrontline ? 'My Sales Records & Shift Transactions' : 'Sales Records & Transactions Audit' }}
              </h2>
              <span class="unit-tag" :class="store.activeUnit === 'bar' ? 'tag-bar' : 'tag-stationery'">
                {{ store.activeUnit === 'bar' ? '🍷 Bar & Lounge' : '📚 Stationery & Retail' }}
              </span>
            </div>
            <p class="window-sub">
              Chronological sales ledger with recorded staff identification, shift reconciliation, and TSH settlement breakdown.
            </p>
          </div>
        </div>

        <div class="header-right">
          <button class="btn-tool" @click="fetchOrders" :title="'Refresh Sales Records'">
            <RefreshCw :size="15" :class="{ 'spin-anim': loading }" />
            <span>Refresh</span>
          </button>
          <button class="btn-close-window" @click="emit('close')" title="Close Window">
            <X :size="18" />
          </button>
        </div>
      </div>

      <!-- TOP METRIC KPI CARDS -->
      <div class="kpi-ribbon">
        <div class="kpi-card">
          <div class="kpi-icon-box text-emerald">
            <DollarSign :size="18" />
          </div>
          <div class="kpi-details">
            <span class="kpi-label">Total Filtered Sales</span>
            <div class="kpi-value text-emerald">
              <span class="kpi-currency">TSH</span> {{ formatMoney(summary.total_sales) }}
            </div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box text-blue">
            <Receipt :size="18" />
          </div>
          <div class="kpi-details">
            <span class="kpi-label">Total Transactions</span>
            <div class="kpi-value">
              {{ summary.total_orders }} <span class="kpi-unit">orders</span>
            </div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box text-amber">
            <Banknote :size="18" />
          </div>
          <div class="kpi-details">
            <span class="kpi-label">Cash Settlements</span>
            <div class="kpi-value">
              <span class="kpi-currency">TSH</span> {{ formatMoney(summary.cash_total) }}
            </div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box text-purple">
            <Smartphone :size="18" />
          </div>
          <div class="kpi-details">
            <span class="kpi-label">Mobile Money (M-Pesa/Tigo)</span>
            <div class="kpi-value">
              <span class="kpi-currency">TSH</span> {{ formatMoney(summary.mobile_total) }}
            </div>
          </div>
        </div>

        <div v-if="store.activeUnit === 'stationery'" class="kpi-card">
          <div class="kpi-icon-box text-cyan">
            <CreditCard :size="18" />
          </div>
          <div class="kpi-details">
            <span class="kpi-label">Customer Credit</span>
            <div class="kpi-value">
              <span class="kpi-currency">TSH</span> {{ formatMoney(summary.credit_total) }}
            </div>
          </div>
        </div>
      </div>

      <!-- FILTER & SEARCH TOOLBAR -->
      <div class="sales-toolbar">
        <div class="toolbar-top">
          <!-- Frontline quick toggle: My Sales vs All Staff Sales -->
          <div class="staff-toggle-group">
            <button 
              type="button" 
              class="staff-toggle-btn" 
              :class="{ active: mySalesOnly }"
              @click="mySalesOnly = true; selectedCashier = ''"
            >
              <UserIcon :size="14" />
              <span>My Sales Only (@{{ store.user?.username }})</span>
            </button>
            <button 
              type="button" 
              class="staff-toggle-btn" 
              :class="{ active: !mySalesOnly && !selectedCashier }"
              @click="mySalesOnly = false; selectedCashier = ''"
            >
              <Layers :size="14" />
              <span>All Staff Transactions</span>
            </button>
          </div>

          <!-- Search Box -->
          <div class="search-box">
            <Search :size="15" class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search by order #, drink name, tab, or cashier..."
              class="search-input"
            />
            <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''"><X :size="13" /></button>
          </div>
        </div>

        <!-- Filter Row -->
        <div class="toolbar-filters">
          <!-- Date Range Preset -->
          <div class="filter-item">
            <label class="filter-label">
              <Calendar :size="12" /> Date Range:
            </label>
            <select v-model="dateRangePreset" class="filter-select">
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
              <option value="last_year">Last Year</option>
              <option value="custom">Custom Date Range...</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <!-- Custom Date Pickers -->
          <div v-if="dateRangePreset === 'custom'" class="filter-item custom-date-group">
            <input 
              v-model="customStartDate" 
              type="date" 
              class="filter-date-input" 
              @change="onCustomDateChange"
            />
            <span class="date-sep">to</span>
            <input 
              v-model="customEndDate" 
              type="date" 
              class="filter-date-input" 
              @change="onCustomDateChange"
            />
          </div>

          <!-- Cashier / Bartender Dropdown (Managers & Owner) -->
          <div v-if="!mySalesOnly" class="filter-item">
            <label class="filter-label">
              <UserIcon :size="12" /> Recorded By:
            </label>
            <select v-model="selectedCashier" class="filter-select">
              <option value="">All Cashiers / Bartenders</option>
              <option v-for="c in availableCashiers" :key="c.id" :value="c.id">
                @{{ c.username }} ({{ c.first_name ? `${c.first_name} ${c.last_name}` : c.role }})
              </option>
            </select>
          </div>

          <!-- Drink / Product Category Filter -->
          <div class="filter-item">
            <label class="filter-label">
              <Tag :size="12" /> {{ store.activeUnit === 'bar' ? 'Drink Class:' : 'Category:' }}
            </label>
            <select v-model="selectedCategory" class="filter-select">
              <option value="">{{ store.activeUnit === 'bar' ? 'All Drink Types' : 'All Categories' }}</option>
              <option v-for="cat in availableCategories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Payment Method Filter -->
          <div class="filter-item">
            <label class="filter-label">
              <CreditCard :size="12" /> Payment:
            </label>
            <select v-model="selectedPaymentMethod" class="filter-select">
              <option value="">All Payment Types</option>
              <option value="CASH">Cash Only</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option v-if="store.activeUnit === 'stationery'" value="CREDIT">Customer Credit</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="filter-item">
            <label class="filter-label">Status:</label>
            <select v-model="selectedStatus" class="filter-select">
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="VOIDED">Voided</option>
            </select>
          </div>

          <!-- Reset Button -->
          <button class="btn-reset-filters" @click="resetFilters" title="Reset all filters to Today">
            Reset
          </button>
        </div>
      </div>

      <!-- MAIN DATA TABLE -->
      <div class="table-container">
        <table class="sales-table">
          <thead>
            <tr>
              <th class="col-order">Order #</th>
              <th class="col-cashier">Recorded By (Cashier/Bartender)</th>
              <th class="col-shift">Shift #</th>
              <th class="col-date">Date & Time</th>
              <th class="col-items">Drinks / Items Sold</th>
              <th class="col-payment">Payment Method</th>
              <th class="col-amount text-right">Total Amount</th>
              <th class="col-status text-center">Status</th>
              <th class="col-action text-right">Receipt</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading && orders.length === 0">
              <td colspan="9" class="text-center py-8">
                <div class="spinner"></div>
                <p class="text-muted mt-2">Loading sales records...</p>
              </td>
            </tr>

            <tr v-else-if="orders.length === 0">
              <td colspan="9" class="text-center py-8 empty-row">
                <Receipt :size="36" class="text-muted" />
                <p class="empty-title">No sales records found</p>
                <p class="empty-sub">Try expanding your date range or clearing your search filters.</p>
              </td>
            </tr>

            <tr 
              v-for="o in orders" 
              :key="o.id" 
              class="sales-row" 
              :class="{ 'row-voided': o.status === 'VOIDED' }"
              @click="viewReceipt(o)"
            >
              <!-- Order # -->
              <td class="col-order">
                <span class="order-number-badge font-num font-bold">#{{ o.order_number }}</span>
              </td>

              <!-- Recorded By (User requested column) -->
              <td class="col-cashier">
                <div class="cashier-cell">
                  <div class="cashier-avatar" :title="o.cashier_role">
                    <UserIcon :size="13" />
                  </div>
                  <div class="cashier-meta">
                    <strong class="cashier-username">@{{ o.cashier_name }}</strong>
                    <span class="cashier-fullname">{{ o.cashier_full_name }}</span>
                  </div>
                </div>
              </td>

              <!-- Shift # -->
              <td class="col-shift">
                <span v-if="o.shift_id" class="shift-pill">Shift #{{ o.shift_id }}</span>
                <span v-else class="text-muted">-</span>
              </td>

              <!-- Date & Time -->
              <td class="col-date font-num">
                <span class="date-main">{{ formatDate(o.created_at) }}</span>
              </td>

              <!-- Drinks / Items Sold -->
              <td class="col-items">
                <div class="items-summary" :title="o.items?.map(i => `${i.quantity}x ${i.product_name}`).join(', ')">
                  <span>{{ o.item_summary || `${o.items?.length || 0} items` }}</span>
                  <span v-if="o.is_age_verified" class="badge-age-verified" title="Tanzania Statutory 18+ ID Checked">
                    18+ ID
                  </span>
                </div>
              </td>

              <!-- Payment Method -->
              <td class="col-payment">
                <div class="payments-list">
                  <span 
                    v-for="m in o.payment_methods" 
                    :key="m" 
                    class="pay-method-pill" 
                    :class="`pay-${m.toLowerCase()}`"
                  >
                    {{ m === 'MOBILE_MONEY' ? 'Mobile' : m }}
                  </span>
                  <span v-if="!o.payment_methods || o.payment_methods.length === 0" class="text-muted">-</span>
                </div>
              </td>

              <!-- Total Amount -->
              <td class="col-amount text-right">
                <div class="amount-cell font-num">
                  <span class="amount-currency">TSH</span>
                  <strong class="amount-val">{{ formatMoney(o.final_amount) }}</strong>
                </div>
              </td>

              <!-- Status -->
              <td class="col-status text-center">
                <span class="status-pill" :class="o.status === 'COMPLETED' ? 'status-completed' : 'status-voided'">
                  {{ o.status }}
                </span>
              </td>

              <!-- Action: View Receipt -->
              <td class="col-action text-right" @click.stop="viewReceipt(o)">
                <button class="btn-view-receipt" title="View Electronic Receipt">
                  <Eye :size="14" />
                  <span>Receipt</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- PAGINATION FOOTER -->
      <div class="pagination-bar">
        <div class="pagination-info">
          <span>Showing {{ totalCount === 0 ? 0 : ((page - 1) * pageSize) + 1 }} to {{ Math.min(page * pageSize, totalCount) }} of <strong>{{ totalCount }}</strong> transactions</span>
        </div>

        <div class="pagination-controls">
          <!-- Page Size Selector -->
          <div class="page-size-selector">
            <span>Per page:</span>
            <select v-model="pageSize" @change="onPageSizeChange" class="select-page-size">
              <option :value="15">15</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>

          <!-- Page Navigation -->
          <div class="page-nav-buttons">
            <button 
              class="btn-page" 
              :disabled="page <= 1" 
              @click="goToPage(1)" 
              title="First Page"
            >
              <ChevronsLeft :size="14" />
            </button>
            <button 
              class="btn-page" 
              :disabled="page <= 1" 
              @click="goToPage(page - 1)" 
              title="Previous Page"
            >
              <ChevronLeft :size="14" />
            </button>

            <span class="page-indicator">
              Page <strong>{{ page }}</strong> of <strong>{{ totalPages }}</strong>
            </span>

            <button 
              class="btn-page" 
              :disabled="page >= totalPages" 
              @click="goToPage(page + 1)" 
              title="Next Page"
            >
              <ChevronRight :size="14" />
            </button>
            <button 
              class="btn-page" 
              :disabled="page >= totalPages" 
              @click="goToPage(totalPages)" 
              title="Last Page"
            >
              <ChevronsRight :size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- ELECTRONIC RECEIPT DRAWER / MODAL -->
      <div v-if="showReceiptDrawer" class="receipt-overlay" @click.self="showReceiptDrawer = false">
        <div class="receipt-drawer">
          <div class="receipt-drawer-header">
            <div class="receipt-header-left">
              <Receipt :size="20" class="text-amber" />
              <h3>Electronic Receipt Details</h3>
            </div>
            <button class="btn-close-sub" @click="showReceiptDrawer = false"><X :size="18" /></button>
          </div>

          <div v-if="selectedOrder" class="receipt-scroll-body printable-receipt">
            <!-- Brand & Store Banner -->
            <div class="receipt-store-banner">
              <h2 class="store-brand">FRINGE BUSINESS SYSTEM</h2>
              <p class="store-sub">{{ selectedOrder.business_unit === 'bar' ? 'Bar & Lounge Division' : 'Stationery & Retail Division' }}</p>
              <p class="store-location">Tanzania Revenue & Legal Compliance</p>
            </div>

            <!-- Receipt Meta -->
            <div class="receipt-meta-box">
              <div class="meta-row">
                <span class="meta-lbl">Order Number:</span>
                <strong class="meta-val font-num font-bold">#{{ selectedOrder.order_number }}</strong>
              </div>
              <div class="meta-row">
                <span class="meta-lbl">Date & Time:</span>
                <span class="meta-val font-num">{{ formatDate(selectedOrder.created_at) }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-lbl">Recorded By:</span>
                <span class="meta-val">
                  <strong>@{{ selectedOrder.cashier_name }}</strong> ({{ selectedOrder.cashier_full_name }})
                </span>
              </div>
              <div class="meta-row" v-if="selectedOrder.shift_id">
                <span class="meta-lbl">Shift Session:</span>
                <span class="meta-val">Shift #{{ selectedOrder.shift_id }}</span>
              </div>
              <div class="meta-row" v-if="selectedOrder.tab_name">
                <span class="meta-lbl">Bar Tab:</span>
                <span class="meta-val text-amber font-bold">{{ selectedOrder.tab_name }}</span>
              </div>
              <div class="meta-row" v-if="selectedOrder.customer_name">
                <span class="meta-lbl">Customer:</span>
                <span class="meta-val text-cyan font-bold">{{ selectedOrder.customer_name }}</span>
              </div>
              <div class="meta-row" v-if="selectedOrder.is_age_verified">
                <span class="meta-lbl">Age Compliance:</span>
                <span class="badge-age-verified">18+ Tanzania Verified</span>
              </div>
              <div class="meta-row" v-if="selectedOrder.status === 'VOIDED'">
                <span class="meta-lbl">Status:</span>
                <span class="status-pill status-voided">VOIDED</span>
              </div>
            </div>

            <!-- Items Breakdown Table -->
            <div class="receipt-items-container">
              <table class="receipt-items-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Total (TSH)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in selectedOrder.items" :key="item.id">
                    <td>
                      <div class="item-name-cell">
                        <strong>{{ item.product_name }}</strong>
                        <span v-if="item.is_alcoholic" class="text-amber-small">🍷 18+ Drink</span>
                      </div>
                    </td>
                    <td class="text-center font-num">{{ item.quantity }}</td>
                    <td class="text-right font-num">{{ formatMoney(item.unit_price) }}</td>
                    <td class="text-right font-num font-bold">{{ formatMoney(item.subtotal) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Totals & Payment Summary -->
            <div class="receipt-totals-box">
              <div class="total-row">
                <span>Subtotal:</span>
                <span class="font-num">TSH {{ formatMoney(selectedOrder.subtotal) }}</span>
              </div>
              <div v-if="parseFloat(selectedOrder.discount_amount) > 0" class="total-row text-red">
                <span>Discount:</span>
                <span class="font-num">- TSH {{ formatMoney(selectedOrder.discount_amount) }}</span>
              </div>
              <div class="total-row grand-total-row">
                <span>Total Amount Due:</span>
                <span class="font-num font-bold text-emerald">TSH {{ formatMoney(selectedOrder.final_amount) }}</span>
              </div>
            </div>

            <!-- Payments Recorded -->
            <div class="receipt-payments-box">
              <div class="payments-title">Payments Recorded:</div>
              <div v-for="p in selectedOrder.payments" :key="p.id" class="pay-record-row">
                <span class="pay-method-badge" :class="`pay-${p.payment_method.toLowerCase()}`">
                  {{ p.payment_method }}
                </span>
                <span v-if="p.reference" class="pay-ref">Ref: {{ p.reference }}</span>
                <strong class="pay-amt font-num">TSH {{ formatMoney(p.amount) }}</strong>
              </div>
            </div>

            <!-- Void Notice if applicable -->
            <div v-if="selectedOrder.status === 'VOIDED'" class="void-notice-box">
              <AlertTriangle :size="16" />
              <div>
                <strong>Order Voided on {{ formatDate(selectedOrder.voided_at) }}</strong>
                <p>Reason: {{ selectedOrder.void_reason || 'Not specified' }}</p>
              </div>
            </div>
          </div>

          <!-- Receipt Footer Actions -->
          <div class="receipt-drawer-footer">
            <button class="btn-cancel" @click="showReceiptDrawer = false">Close</button>
            <button class="btn-print" @click="printReceipt">Print Receipt</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 15, 29, 0.85);
  backdrop-filter: blur(8px);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.sales-window {
  width: 100%;
  max-width: 1350px;
  height: 92vh;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  position: relative;
}

/* Header */
.window-header {
  padding: 16px 24px;
  background: rgba(15, 23, 42, 0.95);
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
  background: rgba(245, 158, 11, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.window-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.window-title {
  font-size: 17px;
  font-weight: 800;
  color: #f8fafc;
  margin: 0;
}

.unit-tag {
  font-size: 11px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 6px;
}

.tag-bar { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
.tag-stationery { background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); }

.window-sub {
  font-size: 11.5px;
  color: #94a3b8;
  margin: 2px 0 0 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-tool {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  border-radius: 10px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-tool:hover { background: rgba(255, 255, 255, 0.12); }

.btn-close-window {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border-radius: 10px;
  padding: 8px;
  cursor: pointer;
  border: none;
}

.btn-close-window:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; }

/* KPI Ribbon */
.kpi-ribbon {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  padding: 14px 24px;
  background: rgba(15, 23, 42, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.kpi-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.kpi-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-label { font-size: 11px; font-weight: 600; color: #94a3b8; display: block; }
.kpi-value { font-size: 16px; font-weight: 900; color: #f8fafc; font-variant-numeric: tabular-nums; line-height: 1.2; }
.kpi-currency { font-size: 11px; font-weight: 700; color: #94a3b8; margin-right: 2px; }
.kpi-unit { font-size: 11.5px; font-weight: normal; color: #94a3b8; }

.text-emerald { color: #34d399; }
.text-amber { color: #f59e0b; }
.text-blue { color: #38bdf8; }
.text-purple { color: #c084fc; }
.text-cyan { color: #22d3ee; }
.text-red { color: #f87171; }

/* Toolbar */
.sales-toolbar {
  padding: 12px 24px;
  background: rgba(15, 23, 42, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolbar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.staff-toggle-group {
  display: flex;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 3px;
  gap: 4px;
}

.staff-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.staff-toggle-btn.active {
  background: #f59e0b;
  color: #0f172a;
}

.search-box {
  flex: 1;
  max-width: 440px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon { position: absolute; left: 12px; color: #64748b; }
.search-input {
  width: 100%;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 8px 30px 8px 34px;
  color: #f8fafc;
  font-size: 12px;
  outline: none;
}
.search-input:focus { border-color: #f59e0b; }
.btn-clear-search { position: absolute; right: 10px; background: transparent; border: none; color: #94a3b8; cursor: pointer; }

.toolbar-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-select, .filter-date-input {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 6px 10px;
  color: #f8fafc;
  font-size: 11.5px;
  outline: none;
}
.filter-select:focus, .filter-date-input:focus { border-color: #f59e0b; }

.custom-date-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.date-sep { color: #64748b; font-size: 11px; }

.btn-reset-filters {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  margin-left: auto;
}
.btn-reset-filters:hover { background: rgba(255, 255, 255, 0.1); color: #f1f5f9; }

/* Table */
.table-container {
  flex: 1;
  overflow-y: auto;
}

.sales-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.sales-table th {
  position: sticky;
  top: 0;
  background: #111827;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 10;
}

.sales-table td {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 12px;
  color: #e2e8f0;
}

.sales-row {
  cursor: pointer;
  transition: background 0.15s ease;
}
.sales-row:hover { background: rgba(255, 255, 255, 0.03); }
.row-voided { opacity: 0.6; }

.order-number-badge {
  font-size: 12px;
  color: #f59e0b;
}

/* Cashier cell */
.cashier-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cashier-avatar {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}
.cashier-meta {
  display: flex;
  flex-direction: column;
}
.cashier-username {
  font-size: 12px;
  color: #f8fafc;
}
.cashier-fullname {
  font-size: 10px;
  color: #64748b;
}

.shift-pill {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.12);
  color: #a5b4fc;
}

.items-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-age-verified {
  font-size: 9.5px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.payments-list { display: flex; gap: 4px; }
.pay-method-pill {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}
.pay-cash { background: rgba(16, 185, 129, 0.12); color: #34d399; }
.pay-mobile_money, .pay-mobile { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.pay-credit { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }

.amount-cell {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 4px;
}
.amount-currency { font-size: 10px; color: #94a3b8; }
.amount-val { font-size: 13.5px; color: #f8fafc; font-weight: 800; }

.status-pill {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
}
.status-completed { background: rgba(16, 185, 129, 0.12); color: #34d399; }
.status-voided { background: rgba(239, 68, 68, 0.15); color: #f87171; }

.btn-view-receipt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.btn-view-receipt:hover { background: rgba(255, 255, 255, 0.12); color: #f8fafc; }

/* Pagination Bar */
.pagination-bar {
  padding: 12px 24px;
  background: rgba(15, 23, 42, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pagination-info {
  font-size: 11.5px;
  color: #94a3b8;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #94a3b8;
}

.select-page-size {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 4px 6px;
  color: #f8fafc;
  font-size: 11.5px;
  outline: none;
}

.page-nav-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-page {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.btn-page:hover:not(:disabled) { background: rgba(255, 255, 255, 0.12); color: #fff; }
.btn-page:disabled { opacity: 0.35; cursor: not-allowed; }

.page-indicator {
  font-size: 11.5px;
  color: #94a3b8;
  padding: 0 4px;
}

/* Receipt Drawer */
.receipt-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.receipt-drawer {
  width: 100%;
  max-width: 480px;
  height: 100%;
  background: #1e293b;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.6);
}

.receipt-drawer-header {
  padding: 18px 24px;
  background: rgba(15, 23, 42, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.receipt-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.receipt-header-left h3 { font-size: 15px; font-weight: 800; color: #f8fafc; margin: 0; }

.receipt-scroll-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.receipt-store-banner {
  text-align: center;
  padding-bottom: 14px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.15);
}
.store-brand { font-size: 16px; font-weight: 900; color: #f59e0b; margin: 0; }
.store-sub { font-size: 11px; color: #cbd5e1; margin: 2px 0 0 0; }
.store-location { font-size: 10px; color: #64748b; margin: 2px 0 0 0; }

.receipt-meta-box {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
}
.meta-lbl { color: #94a3b8; }
.meta-val { color: #f8fafc; }

.receipt-items-container {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
}

.receipt-items-table {
  width: 100%;
  border-collapse: collapse;
}

.receipt-items-table th {
  background: rgba(15, 23, 42, 0.8);
  color: #94a3b8;
  font-size: 10.5px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.receipt-items-table td {
  padding: 8px 10px;
  font-size: 11.5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
}

.item-name-cell {
  display: flex;
  flex-direction: column;
}
.text-amber-small { font-size: 10px; color: #fbbf24; }

.receipt-totals-box {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #94a3b8;
}

.grand-total-row {
  font-size: 14px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  padding-top: 8px;
  margin-top: 4px;
}

.receipt-payments-box {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px 14px;
}

.payments-title { font-size: 11px; font-weight: 700; color: #94a3b8; margin-bottom: 6px; }

.pay-record-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
}

.pay-method-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
}

.pay-ref { font-size: 10.5px; color: #64748b; }
.pay-amt { color: #f8fafc; }

.void-notice-box {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 11.5px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.receipt-drawer-footer {
  padding: 16px 24px;
  background: rgba(15, 23, 42, 0.9);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn-print {
  background: #f59e0b;
  color: #0f172a;
  border: none;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.btn-print:hover { background: #fbbf24; }

.btn-close-sub { background: transparent; border: none; color: #94a3b8; cursor: pointer; }
.font-num { font-variant-numeric: tabular-nums; }
.font-bold { font-weight: 800; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-muted { color: #64748b; }
.py-8 { padding-top: 32px; padding-bottom: 32px; }

.empty-title { font-size: 14px; font-weight: 800; color: #cbd5e1; margin: 8px 0 2px 0; }
.empty-sub { font-size: 11.5px; color: #64748b; margin: 0; }

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #f59e0b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

.spin-anim { animation: spin 0.8s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>

