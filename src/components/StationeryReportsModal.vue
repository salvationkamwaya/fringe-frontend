<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  FileText, DollarSign, Package, AlertTriangle, TrendingUp, 
  Printer, X, ArrowDownRight, Layers, CheckCircle2, ShoppingBag,
  Coins, Smartphone, CreditCard, Download, RefreshCw, Users, 
  Truck, Building, BarChart3, Calendar, FileDown, Check
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const activeTab = ref('eod') // 'eod' | 'sales' | 'stock' | 'debtors' | 'payables' | 'consolidated'
const reportData = ref(null)
const consolidatedData = ref(null)
const loading = ref(false)
const downloadingPdf = ref(false)
const downloadingCsv = ref(false)
const searchQuery = ref('')

// Date range state
const selectedRange = ref('all') // 'all' | 'today' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom'
const customStartDate = ref('')
const customEndDate = ref('')

const rangePresets = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'last_year', label: 'Last Year' },
  { id: 'custom', label: 'Custom Range' },
]

const setRange = (rangeId) => {
  selectedRange.value = rangeId
  if (rangeId !== 'custom') {
    fetchReports()
  }
}

const applyCustomRange = () => {
  if (!customStartDate.value || !customEndDate.value) {
    store.showToast('Please select both start and end dates.', 'warning')
    return
  }
  if (customStartDate.value > customEndDate.value) {
    store.showToast('Start date cannot be after end date.', 'warning')
    return
  }
  fetchReports()
}

const fetchReports = async () => {
  loading.value = true
  try {
    const params = { range: selectedRange.value }
    if (selectedRange.value === 'custom') {
      if (customStartDate.value) params.start_date = customStartDate.value
      if (customEndDate.value) params.end_date = customEndDate.value
    }

    const res = await api.get('/pos/reports/stationery/', { params })
    reportData.value = res.data

    if (store.isOwner) {
      const conRes = await api.get('/pos/reports/consolidated/', { params })
      consolidatedData.value = conRes.data
    }
  } catch (err) {
    store.showToast('Failed to load stationery reports.', 'error')
  } finally {
    loading.value = false
  }
}

const filteredProductSales = computed(() => {
  if (!reportData.value?.product_sales) return []
  if (!searchQuery.value) return reportData.value.product_sales
  const q = searchQuery.value.toLowerCase()
  return reportData.value.product_sales.filter(p => 
    p.product__name.toLowerCase().includes(q)
  )
})

const filteredStockOnHand = computed(() => {
  if (!reportData.value?.stock_on_hand) return []
  if (!searchQuery.value) return reportData.value.stock_on_hand
  const q = searchQuery.value.toLowerCase()
  return reportData.value.stock_on_hand.filter(s => 
    s.name.toLowerCase().includes(q)
  )
})

const downloadPDF = async () => {
  downloadingPdf.value = true
  const isConsolidated = activeTab.value === 'consolidated'
  const endpoint = isConsolidated ? '/pos/reports/consolidated/' : '/pos/reports/stationery/'
  const params = {
    export: 'pdf',
    range: selectedRange.value
  }
  if (selectedRange.value === 'custom') {
    if (customStartDate.value) params.start_date = customStartDate.value
    if (customEndDate.value) params.end_date = customEndDate.value
  }

  const dateTag = new Date().toISOString().slice(0, 10)
  const defaultFilename = isConsolidated 
    ? `fringe_consolidated_report_${selectedRange.value}_${dateTag}.pdf`
    : `stationery_report_${selectedRange.value}_${dateTag}.pdf`

  try {
    store.showToast('Preparing PDF report...', 'info')
    const res = await api.get(endpoint, { params, responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', defaultFilename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    store.showToast('Comprehensive report downloaded as PDF.', 'success')
  } catch (err) {
    store.showToast('Failed to download PDF report.', 'error')
  } finally {
    downloadingPdf.value = false
  }
}

const downloadCSV = async () => {
  downloadingCsv.value = true
  const isConsolidated = activeTab.value === 'consolidated'
  const endpoint = isConsolidated ? '/pos/reports/consolidated/' : '/pos/reports/stationery/'
  const params = {
    export: 'csv',
    range: selectedRange.value
  }
  if (selectedRange.value === 'custom') {
    if (customStartDate.value) params.start_date = customStartDate.value
    if (customEndDate.value) params.end_date = customEndDate.value
  }

  const dateTag = new Date().toISOString().slice(0, 10)
  const defaultFilename = isConsolidated 
    ? `fringe_consolidated_report_${selectedRange.value}_${dateTag}.csv`
    : `stationery_comprehensive_report_${selectedRange.value}_${dateTag}.csv`

  try {
    const res = await api.get(endpoint, { params, responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', defaultFilename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    store.showToast('Comprehensive report downloaded as CSV.', 'success')
  } catch (err) {
    store.showToast('Failed to download CSV report.', 'error')
  } finally {
    downloadingCsv.value = false
  }
}

const printReport = () => {
  window.print()
}

onMounted(() => {
  fetchReports()
})
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="reports-window print-report-window">
      <!-- Window Header -->
      <div class="window-header">
        <div class="header-branding">
          <div class="header-icon-box">
            <FileText :size="24" />
          </div>
          <div>
            <div class="branding-badge">TANZANIA STATUTORY COMPLIANCE • TSH</div>
            <h2>Stationery Business Reports</h2>
            <span class="subtitle">End-of-Day Reconciliation, Pack Splits, Debtors Aging & Supplier Payables</span>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-tool btn-pdf" @click="downloadPDF" :disabled="downloadingPdf" title="Download Official PDF Report">
            <FileDown :size="16" :class="{ 'spin-anim': downloadingPdf }" />
            <span>{{ downloadingPdf ? 'Generating...' : 'Export PDF' }}</span>
          </button>

          <button class="btn-tool btn-download" @click="downloadCSV" :disabled="downloadingCsv" title="Download Report as CSV">
            <Download :size="16" :class="{ 'spin-anim': downloadingCsv }" />
            <span>{{ downloadingCsv ? 'Exporting...' : 'Export CSV' }}</span>
          </button>

          <button class="btn-tool btn-print" @click="printReport" title="Print or Save as PDF">
            <Printer :size="16" />
            <span>Print</span>
          </button>

          <button class="btn-tool btn-refresh" @click="fetchReports" title="Refresh Live Data">
            <RefreshCw :size="16" :class="{ 'spin-anim': loading }" />
          </button>

          <button class="btn-close-window" @click="emit('close')">
            <X :size="20" />
          </button>
        </div>
      </div>

      <!-- Date Range Filter Toolbar -->
      <div class="date-range-toolbar">
        <div class="range-presets-group">
          <span class="range-toolbar-label">
            <Calendar :size="14" />
            <span>Period:</span>
          </span>
          <button 
            v-for="p in rangePresets" 
            :key="p.id" 
            class="range-pill" 
            :class="{ active: selectedRange === p.id }"
            @click="setRange(p.id)"
          >
            {{ p.label }}
          </button>
        </div>

        <!-- Custom Date Range Inputs -->
        <div v-if="selectedRange === 'custom'" class="custom-range-inputs">
          <div class="date-field">
            <label>From:</label>
            <input type="date" v-model="customStartDate" class="date-input" />
          </div>
          <div class="date-field">
            <label>To:</label>
            <input type="date" v-model="customEndDate" class="date-input" />
          </div>
          <button 
            class="btn-apply-range" 
            :disabled="!customStartDate || !customEndDate"
            @click="applyCustomRange"
          >
            <Check :size="14" />
            <span>Apply</span>
          </button>
        </div>

        <!-- Active Period Indicator Badge -->
        <div class="active-period-badge" v-if="reportData?.date_range?.label">
          <span class="dot"></span>
          <span class="period-text">{{ reportData.date_range.label }}</span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="window-tabs-bar">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'eod' }"
          @click="activeTab = 'eod'"
        >
          <DollarSign :size="15" />
          <span>End-of-Day</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'expenses' }"
          @click="activeTab = 'expenses'"
        >
          <DollarSign :size="15" />
          <span>Expenses & Net Profit</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'sales' }"
          @click="activeTab = 'sales'"
        >
          <TrendingUp :size="15" />
          <span>Product Sales</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'stock' }"
          @click="activeTab = 'stock'"
        >
          <Package :size="15" />
          <span>Stock & Reorder</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'debtors' }"
          @click="activeTab = 'debtors'"
        >
          <Users :size="15" />
          <span>Debtors Aging</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'payables' }"
          @click="activeTab = 'payables'"
        >
          <Truck :size="15" />
          <span>Supplier Payables</span>
        </button>
        <button 
          v-if="store.isOwner"
          class="tab-btn tab-consolidated" 
          :class="{ active: activeTab === 'consolidated' }"
          @click="activeTab = 'consolidated'"
        >
          <Building :size="15" />
          <span>Consolidated (Owner)</span>
        </button>
      </div>

      <!-- Main Report Body -->
      <div class="report-body">
        <div v-if="loading" class="state-placeholder">
          <div class="spinner"></div>
          <p>Compiling comprehensive Stationery business reports...</p>
        </div>

        <div v-else-if="!reportData" class="state-placeholder">
          <p>No report data available.</p>
        </div>

        <div v-else class="content-wrapper">
          
          <!-- TAB 1: END-OF-DAY FINANCIAL RECONCILIATION -->
          <div v-if="activeTab === 'eod'" class="tab-pane">
            <!-- Financial Totals Grid -->
            <div class="eod-metrics-grid">
              <div class="metric-card highlight-card">
                <span class="m-title">Total Gross Revenue</span>
                <strong class="m-val text-cyan">TSH {{ parseFloat(reportData.end_of_day.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="m-sub">{{ reportData.end_of_day.total_orders || 0 }} completed orders (Avg: TSH {{ reportData.end_of_day.avg_order_value || '0.00' }})</span>
              </div>

              <div class="metric-card drawer-card">
                <span class="m-title">Expected Drawer Cash</span>
                <strong class="m-val text-green">TSH {{ parseFloat(reportData.end_of_day.expected_cash_drawer || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="m-sub">Cash Sales + Debt Recovered</span>
              </div>

              <div class="metric-card profit-card">
                <span class="m-title">Gross Profit</span>
                <strong class="m-val text-emerald">TSH {{ parseFloat(reportData.end_of_day.gross_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="m-sub">Margin: <strong>{{ reportData.end_of_day.gross_margin_percent || '0.0%' }}</strong> (COGS: TSH {{ parseFloat(reportData.end_of_day.cogs || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }})</span>
              </div>

              <div class="metric-card net-profit-card">
                <span class="m-title">Net Operating Profit</span>
                <strong class="m-val" :class="parseFloat(reportData.end_of_day.net_profit || 0) >= 0 ? 'text-emerald' : 'text-rose'">
                  TSH {{ parseFloat(reportData.end_of_day.net_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                </strong>
                <span class="m-sub">
                  Expenses: TSH {{ parseFloat(reportData.end_of_day.total_expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }} (Net: <strong>{{ reportData.end_of_day.net_margin_percent || '0.0%' }}</strong>)
                </span>
              </div>
            </div>

            <!-- Payment Tenders Breakdown -->
            <div class="report-section">
              <div class="section-title">
                <Coins :size="18" class="text-amber" />
                <h4>Revenue by Payment Method</h4>
              </div>

              <div class="payments-grid">
                <div class="payment-card">
                  <div class="pay-icon-box cash">
                    <Coins :size="20" />
                  </div>
                  <div>
                    <span class="p-type">Cash Collected</span>
                    <strong class="p-amt">TSH {{ parseFloat(reportData.end_of_day.cash_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  </div>
                </div>

                <div class="payment-card">
                  <div class="pay-icon-box momo">
                    <Smartphone :size="20" />
                  </div>
                  <div>
                    <span class="p-type">Mobile Money</span>
                    <strong class="p-amt">TSH {{ parseFloat(reportData.end_of_day.mobile_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  </div>
                </div>

                <div class="payment-card">
                  <div class="pay-icon-box credit">
                    <CreditCard :size="20" />
                  </div>
                  <div>
                    <span class="p-type">Customer Credit</span>
                    <strong class="p-amt">TSH {{ parseFloat(reportData.end_of_day.credit_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  </div>
                </div>

                <div class="payment-card">
                  <div class="pay-icon-box debt">
                    <ArrowDownRight :size="20" />
                  </div>
                  <div>
                    <span class="p-type">Debt Recovered</span>
                    <strong class="p-amt">TSH {{ parseFloat(reportData.end_of_day.debt_recovered || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pack vs Single Sale Ratio Breakdown -->
            <div class="report-section">
              <div class="section-title">
                <Package :size="18" class="text-cyan" />
                <h4>Pack vs Single Item Split Ratio</h4>
              </div>

              <div class="split-ratio-grid">
                <div class="ratio-card">
                  <div class="ratio-badge">WHOLE PACKS</div>
                  <span class="ratio-label">Full Pack Sales</span>
                  <strong class="ratio-val">TSH {{ parseFloat(reportData.end_of_day.pack_sales_rev || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  <span class="ratio-sub">{{ reportData.end_of_day.pack_sales_count || 0 }} boxes/cartons sold</span>
                </div>

                <div class="ratio-card">
                  <div class="ratio-badge single">SINGLE PIECES</div>
                  <span class="ratio-label">Split Single Sales</span>
                  <strong class="ratio-val">TSH {{ parseFloat(reportData.end_of_day.single_sales_rev || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  <span class="ratio-sub">{{ reportData.end_of_day.single_sales_count || 0 }} individual pieces sold</span>
                </div>
              </div>
            </div>

            <!-- Retail vs Wholesale Sales Breakdown (F1.2, F4, F5) -->
            <div class="report-section">
              <div class="section-title">
                <Building :size="18" class="text-blue" />
                <h4>Sales Channels: Walk-in Retail vs B2B Wholesale</h4>
              </div>

              <div class="split-ratio-grid">
                <div class="ratio-card">
                  <div class="ratio-badge retail-badge">WALK-IN RETAIL</div>
                  <span class="ratio-label">Retail Counter Sales</span>
                  <strong class="ratio-val">TSH {{ parseFloat(reportData.end_of_day.retail_sales_rev || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  <span class="ratio-sub">{{ reportData.end_of_day.retail_sales_count || 0 }} retail ticket(s) completed</span>
                </div>

                <div class="ratio-card">
                  <div class="ratio-badge wholesale-badge">B2B WHOLESALE</div>
                  <span class="ratio-label">Wholesale Institutional Sales</span>
                  <strong class="ratio-val text-blue">TSH {{ parseFloat(reportData.end_of_day.wholesale_sales_rev || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  <span class="ratio-sub">{{ reportData.end_of_day.wholesale_sales_count || 0 }} bulk order(s) (cartons/boxes)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB: OPERATING EXPENSES & NET PROFIT -->
          <div v-else-if="activeTab === 'expenses'" class="tab-pane">
            <div class="expenses-summary-card">
              <div class="exp-stat-box">
                <span class="stat-lbl">Total Operating Expenses</span>
                <strong class="stat-num text-rose">TSH {{ parseFloat(reportData.expenses?.total_expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="stat-sub">{{ reportData.expenses?.count || 0 }} expense transactions recorded</span>
              </div>
              <div class="exp-stat-box">
                <span class="stat-lbl">Gross Profit</span>
                <strong class="stat-num text-cyan">TSH {{ parseFloat(reportData.end_of_day.gross_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="stat-sub">Revenue minus COGS</span>
              </div>
              <div class="exp-stat-box highlight">
                <span class="stat-lbl">Net Bottom-Line Profit</span>
                <strong class="stat-num text-emerald">TSH {{ parseFloat(reportData.end_of_day.net_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="stat-sub">Net Margin: {{ reportData.end_of_day.net_margin_percent || '0.0%' }}</span>
              </div>
            </div>

            <!-- Expense Categories Breakdown -->
            <div class="report-section" v-if="reportData.expenses?.categories && Object.keys(reportData.expenses.categories).length > 0">
              <div class="section-title">
                <BarChart3 :size="18" class="text-amber" />
                <h4>Expenses by Category</h4>
              </div>
              <div class="cat-expense-bars">
                <div v-for="(amt, cat) in reportData.expenses.categories" :key="cat" class="cat-bar-row">
                  <div class="cat-bar-info">
                    <span class="cat-name">{{ cat }}</span>
                    <strong class="cat-amt">TSH {{ parseFloat(amt).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  </div>
                  <div class="bar-track">
                    <div 
                      class="bar-fill" 
                      :style="{ width: `${Math.min(100, (parseFloat(amt) / Math.max(1, parseFloat(reportData.expenses.total_expenses))) * 100)}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent Expenses Table -->
            <div class="report-section">
              <div class="section-title">
                <FileText :size="18" class="text-cyan" />
                <h4>Recorded Operating Expenses</h4>
              </div>
              <div class="table-container">
                <table class="report-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Recorded By</th>
                      <th style="text-align: right;">Amount (TSH)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!reportData.expenses?.recent || reportData.expenses.recent.length === 0">
                      <td colspan="5" class="text-center empty-cell">No operating expenses recorded for this period.</td>
                    </tr>
                    <tr v-for="e in reportData.expenses?.recent" :key="e.id">
                      <td>{{ e.date }}</td>
                      <td><span class="cat-tag">{{ e.category }}</span></td>
                      <td>{{ e.description }}</td>
                      <td><span class="user-tag">@{{ e.recorded_by }}</span></td>
                      <td style="text-align: right; font-weight: 700; color: #fb7185;">
                        TSH {{ parseFloat(e.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 2: PRODUCT SALES BREAKDOWN -->
          <div v-else-if="activeTab === 'sales'" class="tab-pane">
            <div class="pane-toolbar">
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Filter stationery products..." 
                class="table-search-input"
              />
              <span class="record-counter">{{ filteredProductSales.length }} items sold</span>
            </div>

            <div class="table-container">
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Sale Mode</th>
                    <th class="text-right">Units Sold</th>
                    <th class="text-right">Total Revenue</th>
                    <th class="text-right">COGS</th>
                    <th class="text-right">Gross Profit</th>
                    <th class="text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in filteredProductSales" :key="item.product__id + '_' + item.is_pack_sale">
                    <td class="bold">{{ item.product__name }}</td>
                    <td>
                      <span class="badge" :class="item.is_pack_sale ? 'badge-pack' : 'badge-single'">
                        {{ item.sale_type || (item.is_pack_sale ? 'Whole Pack' : 'Single Piece') }}
                      </span>
                    </td>
                    <td class="text-right">{{ item.total_quantity }}</td>
                    <td class="text-right bold price">TSH {{ parseFloat(item.total_revenue).toFixed(2) }}</td>
                    <td class="text-right text-muted">TSH {{ parseFloat(item.total_cogs || 0).toFixed(2) }}</td>
                    <td class="text-right text-success bold">TSH {{ parseFloat(item.line_profit || 0).toFixed(2) }}</td>
                    <td class="text-right">{{ item.margin_percent || '0.0%' }}</td>
                  </tr>
                  <tr v-if="filteredProductSales.length === 0">
                    <td colspan="7" class="empty-row">No product sales found matching criteria.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 3: STOCK-ON-HAND & VALUATION -->
          <div v-else-if="activeTab === 'stock'" class="tab-pane">
            <div class="eod-metrics-grid">
              <div class="metric-card">
                <span class="m-title">Total Catalog Products</span>
                <strong class="m-val text-cyan">{{ reportData.inventory_valuation?.total_items || reportData.stock_on_hand.length }}</strong>
                <span class="m-sub">Stationery and retail stock lines</span>
              </div>
              <div class="metric-card">
                <span class="m-title">Stock Valuation at Cost</span>
                <strong class="m-val text-muted">TSH {{ parseFloat(reportData.inventory_valuation?.valuation_at_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="m-sub">Working capital tied up in stationery</span>
              </div>
              <div class="metric-card">
                <span class="m-title">Stock Value at Retail</span>
                <strong class="m-val text-emerald">TSH {{ parseFloat(reportData.inventory_valuation?.valuation_at_retail || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="m-sub">Potential Profit: TSH {{ parseFloat(reportData.inventory_valuation?.potential_gross_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
              </div>
            </div>

            <div class="pane-toolbar">
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Search stock..." 
                class="table-search-input"
              />
              <div class="alert-pills">
                <span class="pill-tag low-tag">Low Stock Alerts: {{ reportData.inventory_valuation?.low_stock_count || 0 }}</span>
                <span class="pill-tag out-tag">Out of Stock: {{ reportData.inventory_valuation?.out_of_stock_count || 0 }}</span>
              </div>
            </div>

            <div class="table-container">
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Type</th>
                    <th class="text-right">Stock Qty</th>
                    <th class="text-right">Reorder Level</th>
                    <th class="text-right">Cost Price</th>
                    <th class="text-right">Selling Price</th>
                    <th class="text-right">Value at Cost</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="prod in filteredStockOnHand" :key="prod.id">
                    <td class="bold">{{ prod.name }}</td>
                    <td>
                      <span class="badge" :class="prod.is_pack ? 'badge-pack' : 'badge-single'">
                        {{ prod.is_pack ? (prod.pack_name || 'Pack') : 'Unit' }}
                      </span>
                    </td>
                    <td class="text-right bold" :class="{ 'text-danger': Number(prod.stock_quantity) <= Number(prod.reorder_threshold) }">
                      {{ Number(prod.stock_quantity).toFixed(1) }}
                    </td>
                    <td class="text-right">{{ prod.reorder_threshold }}</td>
                    <td class="text-right">TSH {{ parseFloat(prod.cost_price).toFixed(2) }}</td>
                    <td class="text-right">TSH {{ parseFloat(prod.selling_price).toFixed(2) }}</td>
                    <td class="text-right bold">TSH {{ parseFloat(prod.valuation_cost || (prod.stock_quantity * prod.cost_price)).toFixed(2) }}</td>
                    <td>
                      <span 
                        class="badge" 
                        :class="Number(prod.stock_quantity) <= 0 ? 'badge-danger' : (Number(prod.stock_quantity) <= Number(prod.reorder_threshold) ? 'badge-warning' : 'badge-good')"
                      >
                        {{ prod.status || (Number(prod.stock_quantity) <= 0 ? 'Out of Stock' : (Number(prod.stock_quantity) <= Number(prod.reorder_threshold) ? 'Low Stock' : 'Optimal')) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 4: DEBTORS & CREDIT AGING -->
          <div v-else-if="activeTab === 'debtors'" class="tab-pane">
            <div class="eod-metrics-grid">
              <div class="metric-card highlight-card">
                <span class="m-title">Total Customer Debt</span>
                <strong class="m-val text-cyan">TSH {{ parseFloat(reportData.debtors?.total_balance || reportData.end_of_day?.total_debtors_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="m-sub">{{ reportData.debtors?.active_debtors_count || 0 }} accounts with pending balances</span>
              </div>
              <div class="metric-card">
                <span class="m-title">Current Debts (0-30 Days)</span>
                <strong class="m-val text-green">TSH {{ parseFloat(reportData.debtors?.aging_0_30 || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="m-sub">Within standard payment terms</span>
              </div>
              <div class="metric-card">
                <span class="m-title">Overdue (60+ & 90+ Days)</span>
                <strong class="m-val text-danger">TSH {{ (parseFloat(reportData.debtors?.aging_61_90 || 0) + parseFloat(reportData.debtors?.aging_90_plus || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="m-sub">Requires urgent recovery follow-up</span>
              </div>
            </div>

            <!-- Aging Buckets Breakdown -->
            <div class="report-section">
              <div class="section-title">
                <Users :size="18" class="text-cyan" />
                <h4>Statutory Aging Buckets</h4>
              </div>

              <div class="aging-buckets-grid">
                <div class="aging-box current">
                  <span class="ab-label">Current (0-30 days)</span>
                  <strong class="ab-val">TSH {{ parseFloat(reportData.debtors?.aging_0_30 || 0).toFixed(2) }}</strong>
                </div>
                <div class="aging-box moderate">
                  <span class="ab-label">31-60 days</span>
                  <strong class="ab-val">TSH {{ parseFloat(reportData.debtors?.aging_31_60 || 0).toFixed(2) }}</strong>
                </div>
                <div class="aging-box late">
                  <span class="ab-label">61-90 days</span>
                  <strong class="ab-val">TSH {{ parseFloat(reportData.debtors?.aging_61_90 || 0).toFixed(2) }}</strong>
                </div>
                <div class="aging-box critical">
                  <span class="ab-label">90+ days</span>
                  <strong class="ab-val">TSH {{ parseFloat(reportData.debtors?.aging_90_plus || 0).toFixed(2) }}</strong>
                </div>
              </div>
            </div>

            <!-- Top Debtors Table -->
            <div class="report-section" v-if="reportData.debtors?.top_debtors && reportData.debtors.top_debtors.length > 0">
              <div class="section-title">
                <h4>Top Accounts Receivable</h4>
              </div>
              <div class="table-container">
                <table class="report-table">
                  <thead>
                    <tr>
                      <th>Customer / School Name</th>
                      <th>Phone</th>
                      <th class="text-right">Credit Limit</th>
                      <th class="text-right">Available Credit</th>
                      <th class="text-right">Current Balance Owed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="c in reportData.debtors.top_debtors" :key="c.id">
                      <td class="bold">{{ c.name }}</td>
                      <td>{{ c.phone || 'N/A' }}</td>
                      <td class="text-right">TSH {{ parseFloat(c.credit_limit).toFixed(2) }}</td>
                      <td class="text-right">TSH {{ parseFloat(c.available_credit).toFixed(2) }}</td>
                      <td class="text-right text-danger bold">TSH {{ parseFloat(c.current_balance).toFixed(2) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 5: SUPPLIER PAYABLES -->
          <div v-else-if="activeTab === 'payables'" class="tab-pane">
            <div class="eod-metrics-grid">
              <div class="metric-card">
                <span class="m-title">Registered Suppliers</span>
                <strong class="m-val text-cyan">{{ reportData.payables?.suppliers_count || 0 }}</strong>
                <span class="m-sub">Active supply chain vendors</span>
              </div>
              <div class="metric-card highlight-card">
                <span class="m-title">Total PO Commitments</span>
                <strong class="m-val text-muted">TSH {{ parseFloat(reportData.payables?.total_po_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="m-sub">{{ reportData.payables?.total_po_count || 0 }} purchase orders placed</span>
              </div>
              <div class="metric-card">
                <span class="m-title">Outstanding Payables Owed</span>
                <strong class="m-val text-danger">TSH {{ parseFloat(reportData.payables?.outstanding_payables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="m-sub">Total Paid: TSH {{ parseFloat(reportData.payables?.total_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
              </div>
            </div>

            <div class="report-section">
              <div class="section-title">
                <Truck :size="18" class="text-amber" />
                <h4>Payables Position Overview</h4>
              </div>
              <p class="payables-desc">
                Supplier payables represent short-term liabilities to stationery vendors. All purchase orders and payments are tracked to ensure supplier goodwill and timely stock delivery.
              </p>
            </div>
          </div>

          <!-- TAB 6: CONSOLIDATED BUSINESS VIEW (OWNER) -->
          <div v-else-if="activeTab === 'consolidated' && consolidatedData" class="tab-pane">
            <div class="consolidated-hero">
              <div class="hero-left">
                <Building :size="32" class="text-cyan" />
                <div>
                  <h3>The Fringe Enterprises Tanzania</h3>
                  <p>Consolidated Executive Summary • Bar & Lounge + Stationery & Retail</p>
                </div>
              </div>
              <button class="btn-tool btn-download" @click="downloadCSV">
                <Download :size="16" />
                <span>Download Consolidated CSV</span>
              </button>
            </div>

            <!-- Group Financial Totals Grid -->
            <div class="eod-metrics-grid">
              <div class="metric-card highlight-card">
                <span class="m-title">Total Group Revenue</span>
                <strong class="m-val text-cyan">TSH {{ parseFloat(consolidatedData.group_summary?.group_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="m-sub">Gross sales across Bar & Stationery</span>
              </div>
              <div class="metric-card profit-card">
                <span class="m-title">Group Gross Profit</span>
                <strong class="m-val text-emerald">TSH {{ parseFloat(consolidatedData.group_summary?.group_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="m-sub">Group Margin: <strong>{{ consolidatedData.group_summary?.group_margin_percent }}</strong></span>
              </div>
              <div class="metric-card drawer-card">
                <span class="m-title">Total Drawer Cash</span>
                <strong class="m-val text-green">TSH {{ parseFloat(consolidatedData.group_summary?.group_drawer_cash || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="m-sub">Cash across Bar & Stationery registers</span>
              </div>
            </div>

            <!-- Working Capital Snapshot -->
            <div class="working-capital-grid">
              <div class="wc-card">
                <span class="wc-title">Working Capital in Stock</span>
                <strong class="wc-val">TSH {{ parseFloat(consolidatedData.group_summary?.group_inventory_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="wc-sub">Combined Inventory at Cost</span>
              </div>
              <div class="wc-card">
                <span class="wc-title">Accounts Receivable (Debtors)</span>
                <strong class="wc-val text-cyan">TSH {{ parseFloat(consolidatedData.group_summary?.total_receivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="wc-sub">Stationery customer credit</span>
              </div>
              <div class="wc-card">
                <span class="wc-title">Accounts Payable (Suppliers)</span>
                <strong class="wc-val text-danger">TSH {{ parseFloat(consolidatedData.group_summary?.total_payables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="wc-sub">Outstanding vendor bills</span>
              </div>
              <div class="wc-card highlight">
                <span class="wc-title">Net Working Capital Position</span>
                <strong class="wc-val text-emerald">TSH {{ parseFloat(consolidatedData.group_summary?.net_working_capital || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="wc-sub">(Cash + Receivables + Stock) - Payables</span>
              </div>
            </div>

            <!-- Comparison Table -->
            <div class="report-section">
              <div class="section-title">
                <h4>Unit Breakdown & Performance</h4>
              </div>
              <div class="table-container">
                <table class="report-table">
                  <thead>
                    <tr>
                      <th>Business Unit</th>
                      <th class="text-right">Gross Revenue</th>
                      <th class="text-right">Share of Business</th>
                      <th class="text-right">Orders</th>
                      <th class="text-right">COGS</th>
                      <th class="text-right">Gross Profit</th>
                      <th class="text-right">Margin %</th>
                      <th class="text-right">Drawer Cash</th>
                      <th class="text-right">Stock (Cost)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="bold">Bar & Lounge</td>
                      <td class="text-right bold">TSH {{ parseFloat(consolidatedData.units?.bar?.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                      <td class="text-right">{{ consolidatedData.units?.bar?.share_percent }}</td>
                      <td class="text-right">{{ consolidatedData.units?.bar?.orders_count }}</td>
                      <td class="text-right">TSH {{ parseFloat(consolidatedData.units?.bar?.cogs || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                      <td class="text-right text-success bold">TSH {{ parseFloat(consolidatedData.units?.bar?.gross_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                      <td class="text-right">{{ consolidatedData.units?.bar?.gross_margin_percent }}</td>
                      <td class="text-right">TSH {{ parseFloat(consolidatedData.units?.bar?.cash_in_drawer || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                      <td class="text-right">TSH {{ parseFloat(consolidatedData.units?.bar?.inventory_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                    </tr>
                    <tr>
                      <td class="bold">Stationery & Retail</td>
                      <td class="text-right bold">TSH {{ parseFloat(consolidatedData.units?.stationery?.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                      <td class="text-right">{{ consolidatedData.units?.stationery?.share_percent }}</td>
                      <td class="text-right">{{ consolidatedData.units?.stationery?.orders_count }}</td>
                      <td class="text-right">TSH {{ parseFloat(consolidatedData.units?.stationery?.cogs || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                      <td class="text-right text-success bold">TSH {{ parseFloat(consolidatedData.units?.stationery?.gross_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                      <td class="text-right">{{ consolidatedData.units?.stationery?.gross_margin_percent }}</td>
                      <td class="text-right">TSH {{ parseFloat(consolidatedData.units?.stationery?.cash_in_drawer || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                      <td class="text-right">TSH {{ parseFloat(consolidatedData.units?.stationery?.inventory_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
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
  background: rgba(3, 7, 18, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.reports-window {
  width: 100%;
  max-width: 980px;
  max-height: 90vh;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.window-header {
  padding: 18px 24px 14px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-branding {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.branding-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #22d3ee;
  margin-bottom: 2px;
}

.header-branding h2 {
  font-size: 19px;
  font-weight: 800;
  color: #f8fafc;
  margin: 0;
}

.subtitle {
  font-size: 12px;
  color: #94a3b8;
  margin: 2px 0 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.btn-tool:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-pdf {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #f87171;
}

.btn-pdf:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.28);
  border-color: rgba(239, 68, 68, 0.6);
  color: #fca5a5;
}

.btn-download {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.btn-download:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.25);
}

.btn-print {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}

.btn-print:hover {
  background: rgba(59, 130, 246, 0.25);
}

.btn-refresh:hover {
  background: rgba(255, 255, 255, 0.12);
}

.spin-anim {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn-close-window {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border-radius: 10px;
  padding: 8px;
  cursor: pointer;
}

.btn-close-window:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

/* Date Range Filter Toolbar */
.date-range-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px 24px;
}

.range-presets-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.range-toolbar-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-right: 4px;
}

.range-pill {
  padding: 5px 12px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.range-pill:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}

.range-pill.active {
  background: #06b6d4;
  border-color: #06b6d4;
  color: #0f172a;
  font-weight: 800;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.35);
}

.custom-range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px dashed rgba(6, 182, 212, 0.4);
  border-radius: 8px;
  padding: 4px 10px;
}

.date-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-field label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 700;
}

.date-input {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #f8fafc;
  font-size: 11px;
  padding: 4px 8px;
  outline: none;
  color-scheme: dark;
}

.date-input:focus {
  border-color: #06b6d4;
}

.btn-apply-range {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  background: #06b6d4;
  color: #0f172a;
  border: none;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-apply-range:hover:not(:disabled) {
  background: #22d3ee;
}

.btn-apply-range:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.active-period-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.25);
  border-radius: 20px;
  padding: 4px 11px;
  font-size: 11px;
  color: #67e8f9;
  font-weight: 700;
}

.active-period-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #06b6d4;
  box-shadow: 0 0 6px #06b6d4;
}

/* Tabs Bar */
.window-tabs-bar {
  display: flex;
  gap: 6px;
  background: rgba(15, 23, 42, 0.8);
  padding: 8px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.04);
}

.tab-btn.active {
  background: #06b6d4;
  color: #0f172a;
}

.tab-btn.tab-consolidated.active {
  background: #3b82f6;
  color: #ffffff;
}

/* Report Body */
.report-body {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Metrics Grids */
.eod-metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.metric-card {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-card.highlight-card {
  border-color: rgba(6, 182, 212, 0.35);
  background: rgba(6, 182, 212, 0.05);
}

.metric-card.drawer-card {
  border-color: rgba(34, 197, 94, 0.35);
  background: rgba(34, 197, 94, 0.05);
}

.metric-card.profit-card {
  border-color: rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.05);
}

.m-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

.m-val {
  font-size: 22px;
  font-weight: 900;
  color: #f8fafc;
}

.text-cyan { color: #22d3ee; }
.text-green { color: #4ade80; }
.text-emerald { color: #34d399; }
.text-amber { color: #fbbf24; }
.text-danger { color: #f87171; }
.text-muted { color: #94a3b8; }

.m-sub {
  font-size: 11.5px;
  color: #64748b;
}

/* Sections */
.report-section {
  background: rgba(30, 41, 59, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title h4 {
  font-size: 13.5px;
  font-weight: 800;
  color: #e2e8f0;
  margin: 0;
}

/* Payments Grid */
.payments-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.payment-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px;
}

.pay-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pay-icon-box.cash { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.pay-icon-box.momo { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }
.pay-icon-box.credit { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.pay-icon-box.debt { background: rgba(168, 85, 247, 0.15); color: #c084fc; }

.p-type {
  font-size: 10.5px;
  font-weight: 700;
  color: #94a3b8;
  display: block;
}

.p-amt {
  font-size: 14px;
  color: #f8fafc;
}

/* Split Ratio */
.split-ratio-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.ratio-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-left: 4px solid #06b6d4;
}

.ratio-badge {
  display: inline-block;
  align-self: flex-start;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(6, 182, 212, 0.2);
  color: #22d3ee;
}

.ratio-badge.single {
  background: rgba(168, 85, 247, 0.2);
  color: #c084fc;
}

.ratio-label {
  font-size: 12px;
  font-weight: 700;
  color: #cbd5e1;
}

.ratio-val {
  font-size: 18px;
  font-weight: 900;
  color: #f8fafc;
}

.ratio-sub {
  font-size: 11px;
  color: #64748b;
}

/* Aging Buckets */
.aging-buckets-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.aging-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.aging-box.current { border-top: 3px solid #22c55e; }
.aging-box.moderate { border-top: 3px solid #eab308; }
.aging-box.late { border-top: 3px solid #f97316; }
.aging-box.critical { border-top: 3px solid #ef4444; }

.ab-label {
  font-size: 10.5px;
  font-weight: 700;
  color: #94a3b8;
}

.ab-val {
  font-size: 15px;
  color: #f8fafc;
}

/* Toolbar & Tables */
.pane-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.table-search-input {
  max-width: 320px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 8px 12px;
  color: #f8fafc;
  font-size: 12px;
}

.record-counter {
  font-size: 12px;
  color: #64748b;
}

.alert-pills {
  display: flex;
  gap: 8px;
}

.pill-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
}

.low-tag {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.out-tag {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.table-container {
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  text-align: left;
}

.report-table th {
  background: rgba(15, 23, 42, 0.9);
  color: #94a3b8;
  font-weight: 700;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.report-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
}

.report-table tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

.text-right { text-align: right; }
.bold { font-weight: 700; }
.price { color: #22d3ee; }

.empty-row {
  text-align: center;
  color: #64748b;
  padding: 24px;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.badge-pack {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.3);
}

.badge-single {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.badge-good {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.badge-warning {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.badge-danger {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

/* Consolidated Section */
.consolidated-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 14px;
  padding: 16px;
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-left h3 {
  font-size: 16px;
  font-weight: 800;
  color: #93c5fd;
  margin: 0;
}

.hero-left p {
  font-size: 12px;
  color: #cbd5e1;
  margin: 2px 0 0 0;
}

.working-capital-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.wc-card {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wc-card.highlight {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.08);
}

.wc-title {
  font-size: 10.5px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}

.wc-val {
  font-size: 16px;
  color: #f8fafc;
}

.wc-sub {
  font-size: 10.5px;
  color: #64748b;
}

.payables-desc {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

.state-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #64748b;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #06b6d4;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Expenses & Wholesale Custom Styles */
.net-profit-card {
  border-color: rgba(16, 185, 129, 0.4);
  background: rgba(16, 185, 129, 0.08);
}

.retail-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.wholesale-badge {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.expenses-summary-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem;
}

.exp-stat-box {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.exp-stat-box.highlight {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 0.85rem;
  border-radius: 8px;
}

.stat-lbl { font-size: 0.8rem; font-weight: 600; color: #94a3b8; }
.stat-num { font-size: 1.45rem; font-weight: 800; }
.stat-sub { font-size: 0.775rem; color: #64748b; }

.cat-expense-bars {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 1.25rem;
}

.cat-bar-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.cat-bar-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.825rem;
}

.cat-name { color: #cbd5e1; font-weight: 600; }
.cat-amt { color: #fb7185; font-weight: 700; }

.bar-track {
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #f43f5e, #fb7185);
  border-radius: 4px;
}

.cat-tag {
  background: rgba(244, 63, 94, 0.15);
  color: #fda4af;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.user-tag {
  color: #94a3b8;
  font-family: monospace;
  font-size: 0.75rem;
}

/* Print Styles */
@media print {
  body * {
    visibility: hidden;
  }
  .modal-backdrop {
    position: static !important;
    background: transparent !important;
    padding: 0 !important;
  }
  .print-report-window {
    visibility: visible !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    background: #ffffff !important;
    color: #000000 !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
  .print-report-window * {
    visibility: visible !important;
    color: #111827 !important;
    box-shadow: none !important;
  }
  .btn-close-window, .window-tabs-bar, .header-actions button, .pane-toolbar input, .range-presets-group, .custom-range-inputs {
    display: none !important;
  }
  .date-range-toolbar {
    border: none !important;
    background: transparent !important;
    padding: 0 !important;
  }
  .active-period-badge {
    background: transparent !important;
    border: 1px solid #94a3b8 !important;
    color: #000 !important;
  }
  .metric-card, .payment-card, .ratio-card, .aging-box, .report-section, .wc-card {
    border: 1px solid #cbd5e1 !important;
    background: #f8fafc !important;
  }
  .report-table {
    border-collapse: collapse !important;
    width: 100% !important;
  }
  .report-table th, .report-table td {
    border: 1px solid #cbd5e1 !important;
    color: #000000 !important;
    padding: 6px 8px !important;
  }
}
</style>