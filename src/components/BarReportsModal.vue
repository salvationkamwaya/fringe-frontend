<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { store } from '../store'
import api from '../api'
import StockValuationPanel from './StockValuationPanel.vue'
import RevenueSummaryStrip from './RevenueSummaryStrip.vue'
import { 
  FileText, TrendingUp, Layers, DollarSign, X, Download, 
  Printer, Clock, Banknote, Smartphone, ShieldAlert, 
  ShieldCheck, AlertTriangle, RefreshCw, BarChart3, Building,
  Calendar, FileDown, Check, MapPin
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const isSw = computed(() => store.locale === 'sw')
const activeTab = ref(store.activeUnit === 'all' && store.isOwner ? 'consolidated' : 'summary') // 'summary' | 'sales' | 'stock' | 'shifts' | 'consolidated'

const totalBranchRevenue = computed(() => {
  const list = reportData.value?.branch_breakdown || []
  return list.reduce((sum, b) => sum + parseFloat(b.total_revenue ?? b.total_sales ?? 0), 0)
})

const getBranchShare = (b) => {
  const rev = parseFloat(b.total_revenue ?? b.total_sales ?? 0)
  if (totalBranchRevenue.value <= 0) return 0
  return Math.min(100, Math.round((rev / totalBranchRevenue.value) * 1000) / 10)
}

const getBranchAvgOrder = (b) => {
  const rev = parseFloat(b.total_revenue ?? b.total_sales ?? 0)
  const orders = parseInt(b.total_orders ?? b.order_count ?? 0, 10)
  return orders > 0 ? rev / orders : 0
}
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

const rangePresets = computed(() => [
  { id: 'all', label: isSw.value ? 'Muda Wote' : 'All Time' },
  { id: 'today', label: isSw.value ? 'Leo' : 'Today' },
  { id: 'this_month', label: isSw.value ? 'Mwezi Huu' : 'This Month' },
  { id: 'last_month', label: isSw.value ? 'Mwezi Uliopita' : 'Last Month' },
  { id: 'this_year', label: isSw.value ? 'Mwaka Huu' : 'This Year' },
  { id: 'last_year', label: isSw.value ? 'Mwaka Uliopita' : 'Last Year' },
  { id: 'custom', label: isSw.value ? 'Tarehe Maalum' : 'Custom Range' },
])

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
    const params = { range: selectedRange.value, _t: Date.now() }
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

const onBranchChanged = () => {
  fetchReports()
}

const onVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    fetchReports()
  }
}

watch(() => [store.activeUnit, store.activeBranchId], () => {
  fetchReports()
})

watch(activeTab, () => {
  fetchReports()
})

onMounted(() => {
  fetchReports()
  window.addEventListener('fringe-branch-changed', onBranchChanged)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener('fringe-branch-changed', onBranchChanged)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div class="modal-overlay" :data-theme="store.theme" @click.self="$emit('close')">
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
            <h3 class="title">{{ isSw ? 'Ripoti za Biashara ya Baa' : 'Bar Management & Executive Reports' }}</h3>
            <p class="subtitle">{{ isSw ? 'Mapato halisi, faida, thamani ya stoo na usawazishaji wa zamu' : 'Real-time revenue, gross margins, stock valuation & shift reconciliation' }}</p>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-action-icon btn-pdf" @click="downloadPDF" :disabled="downloadingPdf" title="Download Official PDF Report">
            <FileDown :size="16" :class="{ 'spin-anim': downloadingPdf }" />
            <span>{{ downloadingPdf ? '...' : (isSw ? 'Pakua PDF' : 'Export PDF') }}</span>
          </button>

          <button class="btn-action-icon btn-download" @click="downloadCSV" :disabled="downloadingCsv" title="Download Report as CSV">
            <Download :size="16" :class="{ 'spin-anim': downloadingCsv }" />
            <span>{{ downloadingCsv ? '...' : (isSw ? 'Pakua CSV' : 'Export CSV') }}</span>
          </button>

          <button class="btn-action-icon btn-print" @click="printReport" title="Print or Save as PDF">
            <Printer :size="16" />
            <span>{{ isSw ? 'Chapisha' : 'Print' }}</span>
          </button>

          <button class="btn-action-icon btn-refresh" @click="fetchReports" :title="isSw ? 'Onyesha upya' : 'Refresh Live Data'">
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
          <span>{{ isSw ? 'Fedha na Malipo' : 'Financials & Tenders' }}</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'sales' }"
          @click="activeTab = 'sales'"
        >
          <TrendingUp :size="16" />
          <span>{{ isSw ? 'Mauzo ya Vinywaji' : 'Product Sales' }}</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'stock' }"
          @click="activeTab = 'stock'"
        >
          <Layers :size="16" />
          <span>{{ isSw ? 'Stoo na Thamani' : 'Stock & Valuation' }}</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'shifts' }"
          @click="activeTab = 'shifts'"
        >
          <Clock :size="16" />
          <span>{{ isSw ? 'Zamu za Wahudumu' : 'Cashier Shifts' }}</span>
        </button>
        <button 
          v-if="store.isOwner"
          class="tab-btn tab-consolidated" 
          :class="{ active: activeTab === 'consolidated' }"
          @click="activeTab = 'consolidated'"
        >
          <Building :size="16" />
          <span>{{ isSw ? 'Muhtasari (Mmiliki)' : 'Consolidated (Owner)' }}</span>
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
          <!-- Bar Actual Revenue & True Net Profit (Income - Refunds - COGS - Bar Expenses) -->
          <RevenueSummaryStrip
            :gross-sales="reportData.summary?.total_revenue || reportData.profit_snapshot?.total_revenue || 0"
            :refunds="reportData.summary?.total_refunds || 0"
            :actual-revenue="reportData.summary?.actual_revenue ?? reportData.summary?.total_revenue ?? 0"
            :cogs="reportData.summary?.cogs || reportData.profit_snapshot?.cogs || 0"
            :expenses="reportData.summary?.total_expenses || reportData.expenses?.total_expenses || 0"
            :net-profit="reportData.summary?.net_profit ?? reportData.profit_snapshot?.net_profit ?? reportData.summary?.gross_profit ?? 0"
            :net-margin="reportData.summary?.net_margin_percent || reportData.summary?.gross_margin_percent || '0.0%'"
            :orders-count="reportData.summary?.total_orders || 0"
            :title="isSw ? 'Mapato Halisi na Faida ya Baa (Ukitoa Marejesho na Matumizi)' : 'Bar Actual Revenue & True Net Profit'"
          />

          <!-- Bar Separated Business Worth (Crates/Cartons vs Single Bottles) -->
          <StockValuationPanel
            :valuation="reportData.inventory_valuation"
            :title="isSw ? 'Thamani ya Biashara ya Baa (Stoo ya Vinywaji)' : 'Bar Business Worth & Drink Stock Valuation'"
          />

          <!-- Section: Branch Location Performance Breakdown (When viewing All Branches as Owner) -->
          <div v-if="reportData.branch_breakdown && reportData.branch_breakdown.length > 0" class="content-section">
            <div class="section-title-row br-section-head-split">
              <div class="br-section-head-left">
                <div class="section-icon-pill"><Building :size="16" /></div>
                <div>
                  <h4>{{ isSw ? 'Utendaji wa Matawi ya Baa' : 'Branch Performance Comparison' }}</h4>
                  <span class="section-sub">{{ isSw ? 'Mauzo, oda zilizokamilika na wastani wa oda kwa kila tawi' : 'Sales, completed orders & average ticket per Bar location' }}</span>
                </div>
              </div>
              <span class="br-branch-count-pill">
                {{ reportData.branch_breakdown.length }}
                {{ isSw ? (reportData.branch_breakdown.length === 1 ? 'tawi' : 'matawi') : (reportData.branch_breakdown.length === 1 ? 'branch' : 'branches') }}
              </span>
            </div>

            <div class="br-branch-grid">
              <div 
                v-for="b in reportData.branch_breakdown" 
                :key="b.id || b.branch_id"
                class="br-branch-card"
                :class="{ 'is-inactive': b.is_active === false }"
              >
                <div class="br-branch-top">
                  <div class="br-branch-identity">
                    <span class="br-branch-pin"><MapPin :size="15" /></span>
                    <div class="br-branch-name-row">
                      <span class="br-branch-name">{{ b.name || b.branch_name }}</span>
                      <span class="br-branch-code">{{ b.code || b.branch_code }}</span>
                    </div>
                  </div>
                  <div class="br-branch-badges">
                    <span class="br-branch-share-pill">{{ getBranchShare(b) }}% {{ isSw ? 'ya mauzo' : 'share' }}</span>
                    <span class="br-branch-status" :class="b.is_active !== false ? 'active' : 'inactive'">
                      <span class="br-status-dot"></span>
                      <span>{{ b.is_active !== false ? (isSw ? 'Hai' : 'Active') : (isSw ? 'Imezimwa' : 'Inactive') }}</span>
                    </span>
                  </div>
                </div>

                <div class="br-branch-stats">
                  <div class="br-stat-tile is-primary">
                    <span class="br-stat-label">{{ isSw ? 'Jumla ya Mauzo' : 'Total Sales' }}</span>
                    <strong class="br-stat-value">
                      TSH {{ parseFloat(b.total_revenue ?? b.total_sales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                    </strong>
                  </div>
                  <div class="br-stat-tile">
                    <span class="br-stat-label">{{ isSw ? 'Oda Zilizokamilika' : 'Completed Orders' }}</span>
                    <strong class="br-stat-value">
                      {{ b.total_orders ?? b.order_count ?? 0 }}
                      <span class="br-stat-unit">{{ isSw ? 'oda' : ((b.total_orders ?? b.order_count ?? 0) === 1 ? 'order' : 'orders') }}</span>
                    </strong>
                  </div>
                  <div class="br-stat-tile">
                    <span class="br-stat-label">{{ isSw ? 'Wastani wa Oda' : 'Avg. Order Value' }}</span>
                    <strong class="br-stat-value">
                      TSH {{ getBranchAvgOrder(b).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </strong>
                  </div>
                </div>

                <div class="br-branch-progress-wrap">
                  <div class="br-branch-progress-track">
                    <div class="br-branch-progress-fill" :style="{ width: `${Math.max(getBranchShare(b), getBranchShare(b) > 0 ? 3 : 0)}%` }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Two-Column Insights: Payment Tenders & Statutory Category Split -->
          <div class="bar-insights-grid">
            <!-- Section: Payment Tenders Breakdown -->
            <div class="content-section">
              <div class="section-title-row">
                <div class="section-icon-pill"><Banknote :size="16" /></div>
                <h4>{{ isSw ? 'Mapato kwa Njia ya Malipo' : 'Payment Tenders Breakdown' }}</h4>
              </div>

              <div class="tenders-grid">
                <div class="tender-card">
                  <div class="tender-icon-box cash">
                    <Banknote :size="18" />
                  </div>
                  <div class="tender-details">
                    <span class="tender-type">{{ isSw ? 'Taslimu' : 'Cash Collected' }}</span>
                    <strong class="tender-amount">TSH {{ parseFloat(reportData.payment_tenders?.cash_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                    <span class="tender-sub">{{ reportData.payment_tenders?.cash_count || 0 }} {{ isSw ? 'miamala' : 'transactions' }}</span>
                  </div>
                </div>

                <div class="tender-card">
                  <div class="tender-icon-box momo">
                    <Smartphone :size="18" />
                  </div>
                  <div class="tender-details">
                    <span class="tender-type">{{ isSw ? 'Pesa za Simu' : 'Mobile Money' }}</span>
                    <strong class="tender-amount">TSH {{ parseFloat(reportData.payment_tenders?.mobile_money_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                    <span class="tender-sub">{{ reportData.payment_tenders?.mobile_money_count || 0 }} {{ isSw ? 'miamala' : 'transactions' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Section: Alcohol vs Soft Drinks Statutory Split -->
            <div class="content-section">
              <div class="section-title-row">
                <div class="section-icon-pill"><ShieldCheck :size="16" /></div>
                <h4>{{ isSw ? 'Mchanganuo wa Vinywaji (Kisheria)' : 'Tanzania Statutory Category Split' }}</h4>
              </div>

              <div class="split-cards-grid">
                <div class="split-card">
                  <span class="split-badge">{{ isSw ? '18+ VILEVI' : '18+ RESTRICTED' }}</span>
                  <span class="split-label">{{ isSw ? 'Vinywaji Vyenye Kilevi' : 'Alcoholic Beverages' }}</span>
                  <strong class="split-val">TSH {{ parseFloat(reportData.summary?.alcoholic_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  <span class="split-desc">{{ reportData.summary?.alcoholic_count || 0 }} {{ isSw ? 'vimeuzwa kwa uthibitisho wa umri' : 'drinks sold with age check' }}</span>
                </div>

                <div class="split-card">
                  <span class="split-badge soft">{{ isSw ? 'KAWAIDA' : 'STANDARD' }}</span>
                  <span class="split-label">{{ isSw ? 'Vinywaji Baridi (Bila Kilevi)' : 'Non-Alcoholic Beverages' }}</span>
                  <strong class="split-val">TSH {{ parseFloat(reportData.summary?.non_alcoholic_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
                  <span class="split-desc">{{ reportData.summary?.non_alcoholic_count || 0 }} {{ isSw ? 'juisi, soda na maji' : 'juices, sodas & waters' }}</span>
                </div>
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
                <tr v-for="item in filteredProductSales" :key="`${item.product__id}_${item.is_pack_sale}`">
                  <td class="bold">
                    <div class="prod-sale-name-cell">
                      <span>{{ item.product__name }}</span>
                      <span v-if="item.sale_type" class="sale-unit-pill" :class="{ 'is-pack': item.is_pack_sale }">
                        {{ item.sale_type }}
                      </span>
                    </div>
                  </td>
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
          <StockValuationPanel
            :valuation="reportData.inventory_valuation"
            :title="isSw ? 'Thamani ya Stoo ya Vinywaji (Kreti/Katoni dhidi ya Chupa)' : 'Bar Stock Valuation (Crates/Cartons vs Single Items)'"
          />

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

          <!-- Combined Actual Revenue & True Net Profit (Bar + Stationery across all branches) -->
          <RevenueSummaryStrip
            :gross-sales="consolidatedData.group_summary?.group_revenue"
            :refunds="consolidatedData.group_summary?.group_refunds || 0"
            :actual-revenue="consolidatedData.group_summary?.group_actual_revenue ?? consolidatedData.group_summary?.group_revenue"
            :cogs="consolidatedData.group_summary?.group_cogs || 0"
            :expenses="consolidatedData.group_summary?.group_expenses || 0"
            :net-profit="consolidatedData.group_summary?.group_net_profit ?? consolidatedData.group_summary?.group_profit"
            :net-margin="consolidatedData.group_summary?.group_net_margin_percent || consolidatedData.group_summary?.group_margin_percent || '0.0%'"
            :orders-count="(consolidatedData.units?.bar?.orders_count || 0) + (consolidatedData.units?.stationery?.orders_count || 0)"
            :title="isSw ? 'Mapato Halisi na Faida ya Pamoja (Baa + Steshenari)' : 'Combined Actual Revenue & True Net Profit (Bar + Stationery)'"
          />

          <!-- Combined Business Worth (All Branches: Pack/Bulk vs Single-Item Only) -->
          <StockValuationPanel
            :valuation="consolidatedData.inventory_valuation"
            :title="isSw ? 'Thamani ya Pamoja ya Biashara Zote (Matawi Yote)' : 'Combined Enterprise Stock Worth (All Branches)'"
          />

          <!-- All Branches Performance Table -->
          <div v-if="consolidatedData.branches && consolidatedData.branches.length > 0" class="content-section">
            <div class="section-title-row">
              <Building :size="18" class="text-accent" />
              <h4>{{ isSw ? 'Utendaji wa Kila Tawi (Baa na Steshenari)' : 'All-Branch Performance Breakdown' }}</h4>
            </div>
            <div class="table-container">
              <table class="report-table">
                <thead>
                  <tr>
                    <th>{{ isSw ? 'Tawi' : 'Branch' }}</th>
                    <th>{{ isSw ? 'Biashara' : 'Unit' }}</th>
                    <th class="text-right">{{ isSw ? 'Oda' : 'Orders' }}</th>
                    <th class="text-right">{{ isSw ? 'Mapato Halisi' : 'Actual Revenue' }}</th>
                    <th class="text-right">{{ isSw ? 'Matumizi' : 'Expenses' }}</th>
                    <th class="text-right">{{ isSw ? 'Stoo (Kununua)' : 'Stock (Buying)' }}</th>
                    <th class="text-right">{{ isSw ? 'Stoo (Kuuza)' : 'Stock (Selling)' }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="br in consolidatedData.branches" :key="br.id">
                    <td class="bold">{{ br.name }} ({{ br.code }})</td>
                    <td>{{ br.business_unit === 'bar' ? 'Bar & Lounge' : 'Stationery' }}</td>
                    <td class="text-right">{{ br.orders_count }}</td>
                    <td class="text-right bold">TSH {{ parseFloat(br.actual_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                    <td class="text-right text-danger">TSH {{ parseFloat(br.expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                    <td class="text-right">TSH {{ parseFloat(br.valuation?.valuation_at_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                    <td class="text-right text-success bold">TSH {{ parseFloat(br.valuation?.valuation_at_retail || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tbody>
              </table>
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
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--br-card) !important;
  border: 1px solid var(--br-border) !important;
  padding: 8px 10px !important;
  border-radius: 14px !important;
  margin: 12px 24px 4px !important;
  overflow-x: auto;
  box-shadow: var(--br-shadow);
}

.report-tabs .tab-btn {
  flex: 1 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 18px !important;
  min-height: 42px;
  border-radius: 10px !important;
  border: 1px solid transparent;
  background: transparent;
  color: var(--br-muted);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.report-tabs .tab-btn:hover {
  color: var(--br-text);
  background: var(--br-elevated);
  border-color: var(--br-border);
}

.modal-overlay .report-tabs .tab-btn.active,
.modal-overlay .report-tabs .tab-btn.tab-consolidated.active {
  background: #4f46e5 !important;
  color: #ffffff !important;
  border-color: #4f46e5 !important;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.28);
}

.prod-sale-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sale-unit-pill {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--br-accent-soft);
  color: var(--br-accent);
  border: 1px solid var(--br-border);
}

.sale-unit-pill.is-pack {
  background: var(--br-emerald-soft);
  color: var(--br-emerald);
}

/* Content Area & Theme Tokens */
.modal-overlay {
  --br-card: #111827;
  --br-elevated: #1e293b;
  --br-border: rgba(148, 163, 184, 0.16);
  --br-border-strong: rgba(148, 163, 184, 0.28);
  --br-text: #f8fafc;
  --br-text-sec: #cbd5e1;
  --br-muted: #94a3b8;
  --br-accent: #818cf8;
  --br-accent-soft: rgba(99, 102, 241, 0.16);
  --br-emerald: #34d399;
  --br-emerald-soft: rgba(16, 185, 129, 0.14);
  --br-rose: #fb7185;
  --br-rose-soft: rgba(239, 68, 68, 0.14);
  --br-shadow: 0 2px 10px rgba(0, 0, 0, 0.24);
}

.modal-overlay[data-theme="light"] {
  --br-card: #ffffff;
  --br-elevated: #f8fafc;
  --br-border: #e2e8f0;
  --br-border-strong: #cbd5e1;
  --br-text: #0f172a;
  --br-text-sec: #334155;
  --br-muted: #64748b;
  --br-accent: #4f46e5;
  --br-accent-soft: #eef2ff;
  --br-emerald: #059669;
  --br-emerald-soft: #ecfdf5;
  --br-rose: #dc2626;
  --br-rose-soft: #fef2f2;
  --br-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.03);
}

.report-body {
  overflow-y: auto;
  padding: 20px 24px 72px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Content Sections */
.content-section {
  background: var(--br-card);
  border: 1px solid var(--br-border);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--br-shadow);
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-icon-pill {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--br-accent-soft);
  color: var(--br-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-title-row h4 {
  font-size: 0.94rem;
  font-weight: 800;
  color: var(--br-text);
  margin: 0;
}

.section-sub {
  display: block;
  font-size: 0.77rem;
  color: var(--br-muted);
  margin-top: 2px;
}

/* Branch Breakdown Grid */
.branch-breakdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.branch-breakdown-card {
  background: var(--br-elevated);
  border: 1px solid var(--br-border);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.branch-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.branch-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.branch-card-name {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--br-text);
}

.branch-card-code {
  font-size: 0.7rem;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--br-accent-soft);
  color: var(--br-accent);
}

.branch-card-status {
  font-size: 0.69rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
}

.branch-card-status.active {
  background: var(--br-emerald-soft);
  color: var(--br-emerald);
}

.branch-card-status.inactive {
  background: var(--br-rose-soft);
  color: var(--br-rose);
}

.branch-card-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--br-border);
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-lbl {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--br-muted);
}

.metric-val {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--br-text);
  font-variant-numeric: tabular-nums;
}

/* Two-Column Insights Row */
.bar-insights-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

/* Tenders Grid */
.tenders-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tender-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--br-elevated);
  border: 1px solid var(--br-border);
  border-radius: 14px;
  padding: 14px 16px;
}

.tender-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tender-icon-box.cash {
  background: var(--br-emerald-soft);
  color: var(--br-emerald);
}

.tender-icon-box.momo {
  background: var(--br-accent-soft);
  color: var(--br-accent);
}

.tender-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tender-type {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--br-muted);
}

.tender-amount {
  font-size: 1rem;
  font-weight: 800;
  color: var(--br-text);
  font-variant-numeric: tabular-nums;
}

.tender-sub {
  font-size: 0.72rem;
  color: var(--br-muted);
}

/* Split Cards */
.split-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.split-card {
  background: var(--br-elevated);
  border: 1px solid var(--br-border);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.split-badge {
  display: inline-block;
  align-self: flex-start;
  font-size: 0.66rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--br-rose-soft);
  color: var(--br-rose);
  letter-spacing: 0.04em;
}

.split-badge.soft {
  background: var(--br-emerald-soft);
  color: var(--br-emerald);
}

.split-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--br-text-sec);
}

.split-val {
  font-size: 1.12rem;
  font-weight: 800;
  color: var(--br-text);
  font-variant-numeric: tabular-nums;
}

.split-desc {
  font-size: 0.73rem;
  color: var(--br-muted);
}

@media (max-width: 1100px) {
  .bar-insights-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .report-body {
    padding: 14px 14px 64px;
  }
  .tenders-grid,
  .split-cards-grid {
    grid-template-columns: 1fr;
  }
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

.br-section-head-split {
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.br-section-head-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.br-branch-count-pill {
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--br-elevated);
  border: 1px solid var(--br-border);
  color: var(--br-muted);
}

.br-branch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.br-branch-card {
  background: var(--br-elevated);
  border: 1px solid var(--br-border);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.br-branch-card:hover {
  border-color: var(--br-border-strong);
  box-shadow: var(--br-shadow);
}

.br-branch-card.is-inactive {
  opacity: 0.6;
}

.br-branch-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.br-branch-identity {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.br-branch-pin {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--br-accent-soft);
  color: var(--br-accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.br-branch-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.br-branch-name {
  font-size: 14px;
  font-weight: 800;
  color: var(--br-text);
  letter-spacing: -0.01em;
}

.br-branch-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--br-accent-soft);
  color: var(--br-accent);
}

.br-branch-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.br-branch-share-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--br-card);
  border: 1px solid var(--br-border);
  color: var(--br-text-sec);
  font-variant-numeric: tabular-nums;
}

.br-branch-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.br-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.br-branch-status.active {
  background: var(--br-emerald-soft);
  color: var(--br-emerald);
}

.br-branch-status.inactive {
  background: var(--br-rose-soft);
  color: var(--br-rose);
}

.br-branch-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.br-stat-tile {
  background: var(--br-card);
  border: 1px solid var(--br-border);
  border-radius: 11px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
}

.br-stat-tile.is-primary {
  border-color: var(--br-border-strong);
}

.br-stat-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--br-muted);
}

.br-stat-value {
  font-size: 16px;
  font-weight: 800;
  color: var(--br-text);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.br-stat-tile.is-primary .br-stat-value {
  color: var(--br-accent);
}

.br-stat-unit {
  font-size: 12px;
  font-weight: 600;
  color: var(--br-muted);
}

.br-branch-progress-wrap {
  padding-top: 2px;
}

.br-branch-progress-track {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--br-border);
  overflow: hidden;
}

.br-branch-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%);
  transition: width 0.35s ease;
}

@media (max-width: 640px) {
  .br-branch-grid {
    grid-template-columns: 1fr;
  }

  .br-branch-stats {
    grid-template-columns: 1fr;
  }
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