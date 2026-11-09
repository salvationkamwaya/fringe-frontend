<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  FileText, TrendingUp, Layers, DollarSign, X, Download, 
  Printer, Clock, Banknote, Smartphone, ShieldAlert, 
  ShieldCheck, AlertTriangle, RefreshCw, BarChart3, Building,
  Calendar, FileDown, Check, MapPin
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const activeTab = ref('summary') // 'summary' | 'sales' | 'stock' | 'shifts' | 'consolidated'
const loading = ref(true)
const downloadingPdf = ref(false)
const downloadingCsv = ref(false)
const reportData = ref(null)
const consolidatedData = ref(null)
const errorMessage = ref('')
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
  errorMessage.value = ''
  try {
    const params = { range: selectedRange.value }
    if (selectedRange.value === 'custom') {
      if (customStartDate.value) params.start_date = customStartDate.value
      if (customEndDate.value) params.end_date = customEndDate.value
    }

    const response = await api.get('/pos/reports/bar/', { params })
    reportData.value = response.data

    if (store.isOwner) {
      const conRes = await api.get('/pos/reports/consolidated/', { params })
      consolidatedData.value = conRes.data
    }
  } catch (err) {
    errorMessage.value = err.response?.data?.detail || err.response?.data?.error || 'Failed to load bar reports.'
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
  const endpoint = isConsolidated ? '/pos/reports/consolidated/' : '/pos/reports/bar/'
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
    : `bar_report_${selectedRange.value}_${dateTag}.pdf`

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
  const endpoint = isConsolidated ? '/pos/reports/consolidated/' : '/pos/reports/bar/'
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
    : `bar_comprehensive_report_${selectedRange.value}_${dateTag}.csv`

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
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card print-report-card">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-left">
          <div class="header-icon-box">
            <FileText :size="24" />
          </div>
          <div>
            <div class="branding-badge-row">
              <span class="branding-badge">TANZANIA STATUTORY COMPLIANCE • TSH</span>
              <span class="report-branch-pill">
                <MapPin :size="12" />
                <span>{{ store.activeBranchName }}</span>
              </span>
            </div>
            <h3 class="title">Bar Management & Executive Reports</h3>
            <p class="subtitle">Real-time revenue, gross margins, stock valuation & shift reconciliation</p>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-action-icon btn-pdf" @click="downloadPDF" :disabled="downloadingPdf" title="Download Official PDF Report">
            <FileDown :size="16" :class="{ 'spin-anim': downloadingPdf }" />
            <span>{{ downloadingPdf ? 'Generating...' : 'Export PDF' }}</span>
          </button>

          <button class="btn-action-icon btn-download" @click="downloadCSV" :disabled="downloadingCsv" title="Download Report as CSV">
            <Download :size="16" :class="{ 'spin-anim': downloadingCsv }" />
            <span>{{ downloadingCsv ? 'Exporting...' : 'Export CSV' }}</span>
          </button>

          <button class="btn-action-icon btn-print" @click="printReport" title="Print or Save as PDF">
            <Printer :size="16" />
            <span>Print</span>
          </button>

          <button class="btn-action-icon btn-refresh" @click="fetchReports" title="Refresh Live Data">
            <RefreshCw :size="16" :class="{ 'spin-anim': loading }" />
          </button>

          <button class="btn-close" @click="$emit('close')">
            <X :size="18" />
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

      <!-- Report Navigation Tabs -->
      <div class="report-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'summary' }"
          @click="activeTab = 'summary'"
        >
          <DollarSign :size="16" />
          <span>Financials & Tenders</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'sales' }"
          @click="activeTab = 'sales'"
        >
          <TrendingUp :size="16" />
          <span>Product Sales</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'stock' }"
          @click="activeTab = 'stock'"
        >
          <Layers :size="16" />
          <span>Stock & Valuation</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'shifts' }"
          @click="activeTab = 'shifts'"
        >
          <Clock :size="16" />
          <span>Cashier Shifts</span>
        </button>
        <button 
          v-if="store.isOwner"
          class="tab-btn tab-consolidated" 
          :class="{ active: activeTab === 'consolidated' }"
          @click="activeTab = 'consolidated'"
        >
          <Building :size="16" />
          <span>Consolidated (Owner)</span>
        </button>
      </div>

      <!-- Loading / Error States -->
      <div v-if="loading" class="state-msg">
        <div class="spinner"></div>
        <p>Compiling comprehensive Bar business reports...</p>
      </div>

      <div v-else-if="errorMessage" class="error-banner">
        <AlertTriangle :size="18" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Report Body -->
      <div v-else-if="reportData" class="report-body">
        
        <!-- 1. FINANCIAL SUMMARY & TENDERS TAB -->
        <div v-if="activeTab === 'summary'" class="tab-pane">
          <!-- Executive KPI Grid -->
          <div class="kpi-grid">
            <div class="kpi-card highlight">
              <span class="kpi-label">Total Bar Revenue</span>
              <span class="kpi-value text-accent">TSH {{ parseFloat(reportData.summary?.total_revenue || reportData.profit_snapshot?.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
              <span class="kpi-desc">{{ reportData.summary?.total_orders || 0 }} completed orders (Avg: TSH {{ reportData.summary?.avg_order_value || '0.00' }})</span>
            </div>

            <div class="kpi-card">
              <span class="kpi-label">Cost of Goods Sold (COGS)</span>
              <span class="kpi-value text-muted">TSH {{ parseFloat(reportData.summary?.cogs || reportData.profit_snapshot?.cogs || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
              <span class="kpi-desc">Total drink inventory cost</span>
            </div>

            <div class="kpi-card success-card">
              <span class="kpi-label">Gross Profit</span>
              <span class="kpi-value text-success">TSH {{ parseFloat(reportData.summary?.gross_profit || reportData.profit_snapshot?.gross_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
              <span class="kpi-desc">Profit Margin: <strong>{{ reportData.summary?.gross_margin_percent || reportData.profit_snapshot?.gross_margin_percent }}</strong></span>
            </div>
          </div>

          <!-- Section: Branch Location Performance Breakdown (When viewing All Branches as Owner) -->
          <div v-if="reportData.branch_breakdown && reportData.branch_breakdown.length > 0" class="content-section">
            <div class="section-title-row">
              <Building :size="18" class="text-emerald" />
              <h4>Branch Performance Comparison (Multi-Location)</h4>
            </div>

            <div class="branch-breakdown-grid">
              <div 
                v-for="b in reportData.branch_breakdown" 
                :key="b.branch_id"
                class="branch-breakdown-card"
                :class="{ 'inactive-branch-card': !b.is_active }"
              >
                <div class="branch-card-header">
                  <div class="branch-card-title">
                    <span class="branch-card-name">{{ b.branch_name }}</span>
                    <span class="branch-card-code">{{ b.branch_code }}</span>
                  </div>
                  <span class="branch-card-status" :class="b.is_active ? 'active' : 'inactive'">
                    {{ b.is_active ? 'Active' : 'Deactivated' }}
                  </span>
                </div>
                <div class="branch-card-metrics">
                  <div class="metric-item">
                    <span class="metric-lbl">Total Sales:</span>
                    <strong class="metric-val text-accent">TSH {{ parseFloat(b.total_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  </div>
                  <div class="metric-item">
                    <span class="metric-lbl">Orders:</span>
                    <span class="metric-val">{{ b.order_count || 0 }} completed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: Payment Tenders Breakdown -->
          <div class="content-section">
            <div class="section-title-row">
              <Banknote :size="18" class="text-amber" />
              <h4>Payment Tenders Breakdown</h4>
            </div>

            <div class="tenders-grid">
              <div class="tender-card">
                <div class="tender-icon-box cash">
                  <Banknote :size="20" />
                </div>
                <div class="tender-details">
                  <span class="tender-type">Cash Collected</span>
                  <strong class="tender-amount">TSH {{ parseFloat(reportData.payment_tenders?.cash_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  <span class="tender-sub">{{ reportData.payment_tenders?.cash_count || 0 }} transactions</span>
                </div>
              </div>

              <div class="tender-card">
                <div class="tender-icon-box momo">
                  <Smartphone :size="20" />
                </div>
                <div class="tender-details">
                  <span class="tender-type">Mobile Money (M-Pesa / Airtel)</span>
                  <strong class="tender-amount">TSH {{ parseFloat(reportData.payment_tenders?.mobile_money_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  <span class="tender-sub">{{ reportData.payment_tenders?.mobile_money_count || 0 }} transactions</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: Alcohol vs Soft Drinks Statutory Split -->
          <div class="content-section">
            <div class="section-title-row">
              <ShieldCheck :size="18" class="text-blue" />
              <h4>Tanzania Statutory Category Split</h4>
            </div>

            <div class="split-cards-grid">
              <div class="split-card alcoholic-card">
                <div class="split-badge">18+ RESTRICTED</div>
                <span class="split-label">Alcoholic Beverages</span>
                <strong class="split-val">TSH {{ parseFloat(reportData.summary?.alcoholic_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="split-desc">{{ reportData.summary?.alcoholic_count || 0 }} drinks sold with statutory age verification</span>
              </div>

              <div class="split-card soft-card">
                <div class="split-badge soft">STANDARD</div>
                <span class="split-label">Non-Alcoholic Beverages</span>
                <strong class="split-val">TSH {{ parseFloat(reportData.summary?.non_alcoholic_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                <span class="split-desc">{{ reportData.summary?.non_alcoholic_count || 0 }} juices, sodas, and waters sold</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. PRODUCT SALES PERFORMANCE TAB -->
        <div v-else-if="activeTab === 'sales'" class="tab-pane">
          <div class="pane-toolbar">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Filter drinks by name..." 
              class="table-search-input"
            />
            <span class="record-counter">{{ filteredProductSales.length }} products sold</span>
          </div>

          <div class="table-container">
            <table class="report-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Classification</th>
                  <th class="text-right">Units Sold</th>
                  <th class="text-right">Unit Cost</th>
                  <th class="text-right">Selling Price</th>
                  <th class="text-right">Total Revenue</th>
                  <th class="text-right">Gross Profit</th>
                  <th class="text-right">Margin %</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredProductSales" :key="item.product__id">
                  <td class="bold">{{ item.product__name }}</td>
                  <td>
                    <span class="badge" :class="item.product__is_alcoholic ? 'badge-alcohol' : 'badge-soft'">
                      {{ item.product__is_alcoholic ? 'Alcoholic (18+)' : 'Non-Alcoholic' }}
                    </span>
                  </td>
                  <td class="text-right">{{ item.total_quantity }}</td>
                  <td class="text-right">TSH {{ parseFloat(item.unit_cost || 0).toFixed(2) }}</td>
                  <td class="text-right">TSH {{ parseFloat(item.unit_price || 0).toFixed(2) }}</td>
                  <td class="text-right bold price">TSH {{ parseFloat(item.total_revenue).toFixed(2) }}</td>
                  <td class="text-right text-success bold">TSH {{ parseFloat(item.line_profit || 0).toFixed(2) }}</td>
                  <td class="text-right">{{ item.margin_percent || '0.0%' }}</td>
                </tr>
                <tr v-if="filteredProductSales.length === 0">
                  <td colspan="8" class="empty-row">No matching product sales recorded.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 3. STOCK-ON-HAND & VALUATION TAB -->
        <div v-else-if="activeTab === 'stock'" class="tab-pane">
          <!-- Stock Valuation KPIs -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <span class="kpi-label">Total Stock Units</span>
              <span class="kpi-value text-accent">{{ reportData.inventory_valuation?.total_units || 0 }}</span>
              <span class="kpi-desc">{{ reportData.inventory_valuation?.total_items || 0 }} catalog items</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Inventory Valuation (Cost)</span>
              <span class="kpi-value text-muted">TSH {{ parseFloat(reportData.inventory_valuation?.valuation_at_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
              <span class="kpi-desc">Working capital tied up</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Inventory Value (Retail)</span>
              <span class="kpi-value text-success">TSH {{ parseFloat(reportData.inventory_valuation?.valuation_at_retail || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
              <span class="kpi-desc">Potential Profit: TSH {{ parseFloat(reportData.inventory_valuation?.potential_gross_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>

          <div class="pane-toolbar">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search inventory items..." 
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
                  <td class="text-right bold" :class="{ 'text-danger': Number(prod.stock_quantity) <= Number(prod.reorder_threshold) }">
                    {{ Number(prod.stock_quantity).toFixed(0) }}
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

        <!-- 4. CASHIER SHIFTS & RECONCILIATIONS TAB -->
        <div v-else-if="activeTab === 'shifts'" class="tab-pane">
          <div class="table-container">
            <table class="report-table">
              <thead>
                <tr>
                  <th>Shift #</th>
                  <th>Cashier</th>
                  <th>Started At</th>
                  <th class="text-right">Opening Float</th>
                  <th class="text-right">Cash Sales</th>
                  <th class="text-right">Expected Drawer</th>
                  <th class="text-right">Actual Counted</th>
                  <th class="text-right">Variance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in reportData.recent_shifts" :key="s.id">
                  <td class="bold">#{{ s.id }}</td>
                  <td>{{ s.cashier }}</td>
                  <td>{{ s.started_at ? new Date(s.started_at).toLocaleString() : 'N/A' }}</td>
                  <td class="text-right">TSH {{ parseFloat(s.opening_float).toFixed(2) }}</td>
                  <td class="text-right">TSH {{ parseFloat(s.total_sales_cash).toFixed(2) }}</td>
                  <td class="text-right bold">TSH {{ parseFloat(s.expected_cash).toFixed(2) }}</td>
                  <td class="text-right">{{ s.counted_cash ? `TSH ${parseFloat(s.counted_cash).toFixed(2)}` : 'Pending' }}</td>
                  <td class="text-right bold" :class="Number(s.variance) === 0 ? 'text-success' : 'text-danger'">
                    TSH {{ parseFloat(s.variance || 0).toFixed(2) }}
                  </td>
                  <td>
                    <span class="badge" :class="s.status === 'OPEN' ? 'badge-status-open' : 'badge-soft'">
                      {{ s.status }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!reportData.recent_shifts || reportData.recent_shifts.length === 0">
                  <td colspan="9" class="empty-row">No recent shifts recorded.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 5. CONSOLIDATED BUSINESS REPORT (OWNER VIEW) -->
        <div v-else-if="activeTab === 'consolidated' && consolidatedData" class="tab-pane">
          <div class="consolidated-hero">
            <div class="hero-left">
              <Building :size="32" class="text-accent" />
              <div>
                <h3>The Fringe Enterprises Tanzania</h3>
                <p>Consolidated Executive Summary • Bar & Lounge + Stationery & Retail</p>
              </div>
            </div>
            <button class="btn-action-icon btn-download" @click="downloadCSV">
              <Download :size="16" />
              <span>Download Consolidated CSV</span>
            </button>
          </div>

          <!-- Group Financial Totals Grid -->
          <div class="kpi-grid">
            <div class="kpi-card highlight">
              <span class="kpi-label">Total Group Revenue</span>
              <span class="kpi-value text-accent">TSH {{ parseFloat(consolidatedData.group_summary?.group_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
              <span class="kpi-desc">Gross sales across all units</span>
            </div>
            <div class="kpi-card success-card">
              <span class="kpi-label">Group Gross Profit</span>
              <span class="kpi-value text-success">TSH {{ parseFloat(consolidatedData.group_summary?.group_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
              <span class="kpi-desc">Group Margin: <strong>{{ consolidatedData.group_summary?.group_margin_percent }}</strong></span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Total Drawer Cash</span>
              <span class="kpi-value text-amber">TSH {{ parseFloat(consolidatedData.group_summary?.group_drawer_cash || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
              <span class="kpi-desc">Expected cash across registers</span>
            </div>
          </div>

          <!-- Working Capital Snapshot -->
          <div class="working-capital-grid">
            <div class="wc-card">
              <span class="wc-title">Working Capital in Stock</span>
              <strong class="wc-val">TSH {{ parseFloat(consolidatedData.group_summary?.group_inventory_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
              <span class="wc-sub">Bar + Stationery Inventory at Cost</span>
            </div>
            <div class="wc-card">
              <span class="wc-title">Accounts Receivable (Debtors)</span>
              <strong class="wc-val text-cyan">TSH {{ parseFloat(consolidatedData.group_summary?.total_receivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
              <span class="wc-sub">Outstanding credit customer debts</span>
            </div>
            <div class="wc-card">
              <span class="wc-title">Accounts Payable (Suppliers)</span>
              <strong class="wc-val text-danger">TSH {{ parseFloat(consolidatedData.group_summary?.total_payables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
              <span class="wc-sub">Pending supplier liabilities</span>
            </div>
            <div class="wc-card highlight">
              <span class="wc-title">Net Working Capital Position</span>
              <strong class="wc-val text-success">TSH {{ parseFloat(consolidatedData.group_summary?.net_working_capital || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
              <span class="wc-sub">(Cash + Receivables + Stock) - Payables</span>
            </div>
          </div>

          <!-- Cross-Unit Comparison Table -->
          <div class="content-section">
            <div class="section-title-row">
              <h4>Business Unit Performance Comparison</h4>
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
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 14, 0.88);
  backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 960px;
  max-height: 90vh;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
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
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.branding-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #fbbf24;
  margin-bottom: 2px;
}

.title {
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

.btn-action-icon {
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

.btn-action-icon:disabled {
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

.btn-close {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border-radius: 10px;
  padding: 8px;
  cursor: pointer;
}

.btn-close:hover {
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
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 8px 14px;
  margin-bottom: 14px;
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
  background: #f59e0b;
  border-color: #f59e0b;
  color: #0f172a;
  font-weight: 800;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.35);
}

.custom-range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px dashed rgba(245, 158, 11, 0.4);
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
  border-color: #f59e0b;
}

.btn-apply-range {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  background: #f59e0b;
  color: #0f172a;
  border: none;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-apply-range:hover:not(:disabled) {
  background: #fbbf24;
}

.btn-apply-range:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.active-period-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 20px;
  padding: 4px 11px;
  font-size: 11px;
  color: #93c5fd;
  font-weight: 700;
}

.active-period-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 6px #3b82f6;
}

/* Tabs */
.report-tabs {
  display: flex;
  gap: 6px;
  background: rgba(255, 255, 255, 0.04);
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.04);
}

.tab-btn.active {
  background: #f59e0b;
  color: #0f172a;
}

.tab-btn.tab-consolidated.active {
  background: #3b82f6;
  color: #fff;
}

/* Content Area */
.report-body {
  overflow-y: auto;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* KPI Cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.kpi-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-card.highlight {
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.05);
}

.kpi-card.success-card {
  border-color: rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.05);
}

.kpi-label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

.kpi-value {
  font-size: 22px;
  font-weight: 900;
  color: #f8fafc;
}

.text-accent { color: #fbbf24; }
.text-muted { color: #94a3b8; }
.text-success { color: #34d399; }
.text-danger { color: #f87171; }
.text-amber { color: #f59e0b; }
.text-cyan { color: #38bdf8; }
.text-blue { color: #60a5fa; }

.kpi-desc {
  font-size: 11.5px;
  color: #64748b;
}

/* Content Sections */
.content-section {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title-row h4 {
  font-size: 13.5px;
  font-weight: 800;
  color: #e2e8f0;
  margin: 0;
}

/* Tenders Grid */
.tenders-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.tender-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px;
}

.tender-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tender-icon-box.cash {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.tender-icon-box.momo {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.tender-details {
  display: flex;
  flex-direction: column;
}

.tender-type {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
}

.tender-amount {
  font-size: 16px;
  color: #f8fafc;
}

.tender-sub {
  font-size: 11px;
  color: #64748b;
}

/* Split Cards */
.split-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.split-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.split-card.alcoholic-card {
  border-left: 4px solid #ef4444;
}

.split-card.soft-card {
  border-left: 4px solid #10b981;
}

.split-badge {
  display: inline-block;
  align-self: flex-start;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  letter-spacing: 0.05em;
}

.split-badge.soft {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.split-label {
  font-size: 12px;
  font-weight: 700;
  color: #cbd5e1;
}

.split-val {
  font-size: 18px;
  font-weight: 900;
  color: #f8fafc;
}

.split-desc {
  font-size: 11px;
  color: #64748b;
}

/* Table */
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
.price { color: #fbbf24; }

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

.badge-alcohol {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.badge-soft {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
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

.badge-status-open {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
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

.branding-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.report-branch-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 1px 7px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 700;
}

.branch-breakdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.branch-breakdown-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.branch-breakdown-card.inactive-branch-card {
  opacity: 0.55;
}

.branch-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.branch-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.branch-card-name {
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
}

.branch-card-code {
  font-family: monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.branch-card-status {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 9999px;
  text-transform: uppercase;
}

.branch-card-status.active {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.branch-card-status.inactive {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.branch-card-metrics {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.metric-lbl {
  color: #94a3b8;
}

.metric-val {
  font-weight: 700;
  color: #e2e8f0;
}

/* Print Styles */
@media print {
  body * {
    visibility: hidden;
  }
  .modal-overlay {
    position: static !important;
    background: transparent !important;
    padding: 0 !important;
  }
  .print-report-card {
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
  .print-report-card * {
    visibility: visible !important;
    color: #111827 !important;
    box-shadow: none !important;
  }
  .btn-close, .report-tabs, .header-actions button, .pane-toolbar input, .range-presets-group, .custom-range-inputs {
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
  .kpi-card, .tender-card, .split-card, .content-section, .wc-card {
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