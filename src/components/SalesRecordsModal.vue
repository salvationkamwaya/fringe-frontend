<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
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
  <div class="sales-page" :data-theme="store.theme">
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
                {{ isFrontline ? t('sales.myTitle') : t('sales.title') }}
              </h2>
              <span class="unit-tag" :class="store.activeUnit === 'bar' ? 'tag-bar' : 'tag-stationery'">
                {{ store.activeUnit === 'bar' ? '🍷 Bar & Lounge' : '📚 Stationery & Retail' }}
              </span>
            </div>
            <p class="window-sub">
              {{ t('sales.subtitle') }}
            </p>
          </div>
        </div>

        <div class="header-right">
          <button class="btn-tool" @click="fetchOrders" :title="t('common.refresh')">
            <RefreshCw :size="15" :class="{ 'spin-anim': loading }" />
            <span>{{ t('common.refresh') }}</span>
          </button>
          <button class="btn-close-window" @click="emit('close')" :title="t('common.backToPos')">
            <X :size="16" />
            <span>{{ t('common.backToPos') }}</span>
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
            <span class="kpi-label">{{ t('sales.totalFiltered') }}</span>
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
            <span class="kpi-label">{{ t('sales.totalTx') }}</span>
            <div class="kpi-value">
              {{ summary.total_orders }} <span class="kpi-unit">{{ t('sales.ordersUnit') }}</span>
            </div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box text-amber">
            <Banknote :size="18" />
          </div>
          <div class="kpi-details">
            <span class="kpi-label">{{ t('sales.cashSettlements') }}</span>
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
            <span class="kpi-label">{{ t('sales.mobileMoney') }}</span>
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
            <span class="kpi-label">{{ t('sales.customerCredit') }}</span>
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
              <span>{{ t('sales.mySalesOnly') }} (@{{ store.user?.username }})</span>
            </button>
            <button 
              type="button" 
              class="staff-toggle-btn" 
              :class="{ active: !mySalesOnly && !selectedCashier }"
              @click="mySalesOnly = false; selectedCashier = ''"
            >
              <Layers :size="14" />
              <span>{{ t('sales.allStaffTx') }}</span>
            </button>
          </div>

          <!-- Search Box -->
          <div class="search-box">
            <Search :size="15" class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              :placeholder="t('sales.searchPlaceholder')"
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
              <th class="col-order">{{ t('sales.col.order') }}</th>
              <th class="col-cashier">{{ t('sales.col.staff') }}</th>
              <th class="col-shift">{{ t('sales.col.shift') }}</th>
              <th class="col-date">{{ t('sales.col.date') }}</th>
              <th class="col-items">{{ t('sales.col.items') }}</th>
              <th class="col-payment">{{ t('sales.col.payment') }}</th>
              <th class="col-amount text-right">{{ t('sales.col.amount') }}</th>
              <th class="col-status text-center">{{ t('sales.col.status') }}</th>
              <th class="col-action text-right">{{ t('sales.col.receipt') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading && orders.length === 0">
              <td colspan="9" class="text-center py-8">
                <div class="spinner"></div>
              </td>
            </tr>

            <tr v-else-if="orders.length === 0">
              <td colspan="9" class="empty-row">
                <div class="empty-state">
                  <Receipt :size="32" />
                  <p class="empty-title">{{ t('sales.noRecords') }}</p>
                  <p class="empty-sub">{{ t('sales.noRecordsSub') }}</p>
                </div>
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
/* ============================================================
   SALES RECORDS PAGE — LIGHT & DARK MODE + RESPONSIVE
   ============================================================ */
.sales-page {
  --s-bg: #0a0e17;
  --s-surface: #111827;
  --s-card: #161f30;
  --s-elevated: #1e293b;
  --s-input: #0f1623;
  --s-border: rgba(255, 255, 255, 0.09);
  --s-border-strong: rgba(255, 255, 255, 0.18);
  --s-text: #f8fafc;
  --s-text-sec: #cbd5e1;
  --s-text-muted: #94a3b8;
  --s-accent: #6366f1;
  --s-accent-hover: #4f46e5;
  --s-accent-soft: rgba(99, 102, 241, 0.16);
  --s-emerald: #10b981;
  --s-emerald-soft: rgba(16, 185, 129, 0.14);
  --s-amber: #f59e0b;
  --s-amber-soft: rgba(245, 158, 11, 0.14);
  --s-blue: #3b82f6;
  --s-blue-soft: rgba(59, 130, 246, 0.14);
  --s-purple: #a855f7;
  --s-purple-soft: rgba(168, 85, 247, 0.14);
  --s-cyan: #06b6d4;
  --s-cyan-soft: rgba(6, 182, 212, 0.14);
  --s-danger: #f43f5e;
  --s-danger-soft: rgba(244, 63, 94, 0.14);
  --s-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);

  width: 100%;
  min-height: 100vh;
  background: var(--s-bg);
  color: var(--s-text);
  display: flex;
  flex-direction: column;
}

.sales-page[data-theme="light"] {
  --s-bg: #f1f5f9;
  --s-surface: #ffffff;
  --s-card: #ffffff;
  --s-elevated: #f8fafc;
  --s-input: #ffffff;
  --s-border: #e2e8f0;
  --s-border-strong: #cbd5e1;
  --s-text: #0f172a;
  --s-text-sec: #334155;
  --s-text-muted: #64748b;
  --s-accent: #4f46e5;
  --s-accent-hover: #4338ca;
  --s-accent-soft: #eef2ff;
  --s-emerald: #059669;
  --s-emerald-soft: #ecfdf5;
  --s-amber: #d97706;
  --s-amber-soft: #fffbeb;
  --s-blue: #2563eb;
  --s-blue-soft: #eff6ff;
  --s-purple: #7c3aed;
  --s-purple-soft: #f5f3ff;
  --s-cyan: #0891b2;
  --s-cyan-soft: #ecfeff;
  --s-danger: #e11d48;
  --s-danger-soft: #fff1f2;
  --s-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
}

.sales-window {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 24px 28px;
  gap: 18px;
  max-width: 1600px;
  margin: 0 auto;
}

/* Header */
.window-header {
  background: var(--s-surface);
  border: 1px solid var(--s-border);
  border-radius: 18px;
  padding: 18px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  box-shadow: var(--s-shadow);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.header-icon-box {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: var(--s-elevated);
  border: 1px solid var(--s-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.window-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.window-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--s-text);
  margin: 0;
}

.window-sub {
  font-size: 0.84rem;
  color: var(--s-text-muted);
  margin-top: 3px;
}

.unit-tag {
  font-size: 0.74rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}

.tag-bar {
  background: var(--s-amber-soft);
  color: var(--s-amber);
}

.tag-stationery {
  background: var(--s-cyan-soft);
  color: var(--s-cyan);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.btn-tool,
.btn-close-window {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 600;
  background: var(--s-elevated);
  border: 1px solid var(--s-border);
  color: var(--s-text-sec);
  transition: all 0.18s ease;
}

.btn-tool:hover,
.btn-close-window:hover {
  border-color: var(--s-border-strong);
  color: var(--s-text);
}

.spin-anim {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* KPI Ribbon */
.kpi-ribbon {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}

.kpi-card {
  background: var(--s-card);
  border: 1px solid var(--s-border);
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: var(--s-shadow);
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  border-color: var(--s-border-strong);
}

.kpi-icon-box {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--s-elevated);
  border: 1px solid var(--s-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-details {
  min-width: 0;
}

.kpi-label {
  display: block;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--s-text-muted);
  margin-bottom: 3px;
}

.kpi-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--s-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-currency,
.kpi-unit {
  font-size: 0.76rem;
  font-weight: 700;
  opacity: 0.75;
}

/* Filter Toolbar */
.sales-toolbar {
  background: var(--s-surface);
  border: 1px solid var(--s-border);
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: var(--s-shadow);
}

.toolbar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.staff-toggle-group {
  display: inline-flex;
  background: var(--s-elevated);
  border: 1px solid var(--s-border);
  border-radius: 11px;
  padding: 4px;
  gap: 4px;
  flex-wrap: wrap;
}

.staff-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  background: transparent;
  color: var(--s-text-muted);
  transition: all 0.18s ease;
}

.staff-toggle-btn.active {
  background: var(--s-accent);
  color: #ffffff;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 240px;
  max-width: 420px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--s-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 9px 34px 9px 36px;
  border-radius: 10px;
  font-size: 0.86rem;
  background: var(--s-input);
  border: 1px solid var(--s-border-strong);
  color: var(--s-text);
  outline: none;
}

.search-input:focus {
  border-color: var(--s-accent);
  box-shadow: 0 0 0 3px var(--s-accent-soft);
}

.btn-clear-search {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  color: var(--s-text-muted);
  padding: 3px;
}

.toolbar-filters {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 150px;
  flex: 1;
}

.filter-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--s-text-muted);
}

.filter-select,
.filter-date-input {
  padding: 8px 10px;
  border-radius: 9px;
  font-size: 0.83rem;
  background: var(--s-input);
  border: 1px solid var(--s-border-strong);
  color: var(--s-text);
  outline: none;
}

.filter-select:focus,
.filter-date-input:focus {
  border-color: var(--s-accent);
}

.custom-date-group {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.date-sep {
  font-size: 0.8rem;
  color: var(--s-text-muted);
}

.btn-reset-filters {
  padding: 8px 14px;
  border-radius: 9px;
  font-size: 0.82rem;
  font-weight: 600;
  background: var(--s-elevated);
  border: 1px solid var(--s-border);
  color: var(--s-text-sec);
  height: 36px;
}

.btn-reset-filters:hover {
  border-color: var(--s-border-strong);
  color: var(--s-text);
}

/* Table Container */
.table-container {
  background: var(--s-surface);
  border: 1px solid var(--s-border);
  border-radius: 16px;
  overflow-x: auto;
  box-shadow: var(--s-shadow);
  flex: 1;
}

.sales-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 880px;
}

.sales-table thead th {
  text-align: left;
  padding: 13px 16px;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--s-text-muted);
  background: var(--s-elevated);
  border-bottom: 1px solid var(--s-border);
  white-space: nowrap;
}

.sales-table tbody td {
  padding: 13px 16px;
  font-size: 0.86rem;
  color: var(--s-text-sec);
  border-bottom: 1px solid var(--s-border);
  vertical-align: middle;
}

.sale-row {
  cursor: pointer;
  transition: background 0.14s ease;
}

.sale-row:hover {
  background: var(--s-elevated);
}

.voided-row {
  opacity: 0.6;
}

.order-num {
  font-weight: 700;
  color: var(--s-text);
  font-family: monospace;
  font-size: 0.86rem;
}

.tab-badge {
  display: inline-block;
  margin-top: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--s-amber-soft);
  color: var(--s-amber);
}

.cashier-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.cashier-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--s-accent-soft);
  color: var(--s-accent);
  font-weight: 800;
  font-size: 0.76rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cashier-name {
  display: block;
  font-weight: 700;
  color: var(--s-text);
  font-size: 0.84rem;
}

.cashier-role {
  display: block;
  font-size: 0.72rem;
  color: var(--s-text-muted);
}

.shift-badge {
  font-size: 0.76rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--s-elevated);
  border: 1px solid var(--s-border);
  color: var(--s-text-sec);
}

.items-preview {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.items-count-pill {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--s-text);
}

.items-summary-text {
  font-size: 0.78rem;
  color: var(--s-text-muted);
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.payment-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.pay-cash {
  background: var(--s-emerald-soft);
  color: var(--s-emerald);
}

.pay-mobile {
  background: var(--s-purple-soft);
  color: var(--s-purple);
}

.pay-credit {
  background: var(--s-cyan-soft);
  color: var(--s-cyan);
}

.amount-val {
  font-weight: 800;
  color: var(--s-text);
  font-variant-numeric: tabular-nums;
}

.amount-currency {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--s-text-muted);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.73rem;
  font-weight: 700;
}

.status-completed {
  background: var(--s-emerald-soft);
  color: var(--s-emerald);
}

.status-voided {
  background: var(--s-danger-soft);
  color: var(--s-danger);
}

.btn-view-receipt {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  background: var(--s-elevated);
  border: 1px solid var(--s-border);
  color: var(--s-text-sec);
}

.btn-view-receipt:hover {
  background: var(--s-accent);
  border-color: var(--s-accent);
  color: #ffffff;
}

.empty-cell {
  text-align: center;
  padding: 48px 20px !important;
  color: var(--s-text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* Pagination */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  background: var(--s-surface);
  border: 1px solid var(--s-border);
  border-radius: 14px;
  padding: 12px 18px;
}

.pagination-info {
  font-size: 0.82rem;
  color: var(--s-text-muted);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--s-elevated);
  border: 1px solid var(--s-border);
  color: var(--s-text-sec);
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 0.82rem;
  color: var(--s-text-sec);
  padding: 0 8px;
}

/* Receipt Drawer */
.receipt-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(6, 10, 20, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
}

.receipt-drawer {
  width: 100%;
  max-width: 460px;
  height: 100%;
  background: var(--s-surface);
  border-left: 1px solid var(--s-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--s-text);
}

.drawer-header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--s-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer-title h3 {
  font-size: 1rem;
  font-weight: 800;
  margin: 0;
}

.drawer-order-num {
  font-size: 0.78rem;
  color: var(--s-text-muted);
}

.btn-close-drawer {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--s-elevated);
  border: 1px solid var(--s-border);
  color: var(--s-text-sec);
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-body {
  padding: 18px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.receipt-meta-card,
.receipt-totals-box {
  background: var(--s-card);
  border: 1px solid var(--s-border);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-row,
.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.84rem;
}

.meta-lbl {
  color: var(--s-text-muted);
}

.meta-val {
  color: var(--s-text);
  font-weight: 600;
}

.receipt-items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.receipt-items-table th {
  text-align: left;
  padding: 8px 6px;
  border-bottom: 1px solid var(--s-border);
  color: var(--s-text-muted);
  font-size: 0.74rem;
}

.receipt-items-table td {
  padding: 9px 6px;
  border-bottom: 1px solid var(--s-border);
  color: var(--s-text-sec);
}

.grand-total-row {
  padding-top: 8px;
  border-top: 1px dashed var(--s-border-strong);
  font-size: 0.96rem;
  font-weight: 800;
}

/* Text Helpers */
.text-emerald { color: var(--s-emerald); }
.text-blue { color: var(--s-blue); }
.text-amber { color: var(--s-amber); }
.text-purple { color: var(--s-purple); }
.text-cyan { color: var(--s-cyan); }
.text-red { color: var(--s-danger); }
.text-right { text-align: right; }
.text-center { text-align: center; }

/* Responsive */
@media (max-width: 768px) {
  .sales-window {
    padding: 12px 12px 24px;
    gap: 14px;
  }

  .window-header {
    padding: 14px 16px;
  }

  .kpi-ribbon {
    grid-template-columns: 1fr 1fr;
  }

  .search-box {
    max-width: none;
    width: 100%;
  }

  .filter-item {
    min-width: 130px;
  }
}

@media (max-width: 520px) {
  .kpi-ribbon {
    grid-template-columns: 1fr;
  }

  .header-right {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
