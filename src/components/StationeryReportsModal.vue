<script setup>
import { ref, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  FileText, DollarSign, Package, AlertTriangle, TrendingUp, 
  Printer, X, ArrowDownRight, Layers, CheckCircle2, ShoppingBag,
  Coins, Smartphone, CreditCard
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const activeTab = ref('eod') // 'eod' | 'sales' | 'stock'
const reportData = ref(null)
const loading = ref(false)

const fetchReports = async () => {
  loading.value = true
  try {
    const res = await api.get('/pos/reports/stationery/')
    reportData.value = res.data
  } catch (err) {
    store.showToast('Failed to load stationery reports.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReports()
})

const printReport = () => {
  window.print()
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="reports-window">
      <!-- Window Header -->
      <div class="window-header">
        <div class="header-branding">
          <div class="header-icon-box">
            <FileText :size="22" />
          </div>
          <div>
            <h2>Stationery Business Reports</h2>
            <span class="subtitle">End-of-Day Reconciliation, Sales Breakdown & Inventory Alerts</span>
          </div>
        </div>

        <div class="header-actions">
          <div class="header-tabs">
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'eod' }"
              @click="activeTab = 'eod'"
            >
              <span>End-of-Day</span>
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'sales' }"
              @click="activeTab = 'sales'"
            >
              <span>Product Sales</span>
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'stock' }"
              @click="activeTab = 'stock'"
            >
              <span>Stock & Reorder</span>
            </button>
          </div>

          <button class="btn-print" @click="printReport" title="Print Report">
            <Printer :size="18" />
            <span>Print</span>
          </button>

          <button class="btn-close-window" @click="emit('close')">
            <X :size="20" />
          </button>
        </div>
      </div>

      <!-- Main Report Body -->
      <div class="report-body">
        <div v-if="loading" class="state-placeholder">
          <div class="spinner"></div>
          <p>Compiling stationery business reports...</p>
        </div>

        <div v-else-if="!reportData" class="state-placeholder">
          <p>No report data available.</p>
        </div>

        <div v-else class="content-wrapper">
          <!-- TAB 1: END-OF-DAY RECONCILIATION -->
          <div v-if="activeTab === 'eod'" class="tab-pane">
            <!-- Primary Drawer Calculation Banner -->
            <div class="drawer-cash-banner">
              <div class="drawer-title-box">
                <Coins :size="28" class="text-cyan" />
                <div>
                  <h3>Expected Cash in Register Drawer</h3>
                  <span class="drawer-sub">Total of direct cash sales plus debt repayment cash collections</span>
                </div>
              </div>
              <div class="drawer-cash-val">
                ZMW {{ parseFloat(reportData.end_of_day.expected_cash_drawer).toFixed(2) }}
              </div>
            </div>

            <!-- Breakdown KPI Cards -->
            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-head">
                  <span class="kpi-title">Total Revenue Generated</span>
                  <DollarSign :size="18" class="text-cyan" />
                </div>
                <div class="kpi-number text-cyan">
                  ZMW {{ parseFloat(reportData.end_of_day.total_revenue).toFixed(2) }}
                </div>
                <span class="kpi-desc">All completed customer orders</span>
              </div>

              <div class="kpi-card">
                <div class="kpi-head">
                  <span class="kpi-title">Direct Cash Sales</span>
                  <Coins :size="18" class="text-emerald" />
                </div>
                <div class="kpi-number text-emerald">
                  ZMW {{ parseFloat(reportData.end_of_day.cash_sales).toFixed(2) }}
                </div>
                <span class="kpi-desc">Cash collected at checkout</span>
              </div>

              <div class="kpi-card">
                <div class="kpi-head">
                  <span class="kpi-title">Mobile Money Sales</span>
                  <Smartphone :size="18" class="text-yellow" />
                </div>
                <div class="kpi-number text-yellow">
                  ZMW {{ parseFloat(reportData.end_of_day.mobile_sales).toFixed(2) }}
                </div>
                <span class="kpi-desc">Airtel / MTN Mobile Money</span>
              </div>

              <div class="kpi-card">
                <div class="kpi-head">
                  <span class="kpi-title">Credit Sales (Debtors)</span>
                  <CreditCard :size="18" class="text-amber" />
                </div>
                <div class="kpi-number text-amber">
                  ZMW {{ parseFloat(reportData.end_of_day.credit_sales).toFixed(2) }}
                </div>
                <span class="kpi-desc">Charged to client accounts</span>
              </div>

              <div class="kpi-card">
                <div class="kpi-head">
                  <span class="kpi-title">Debts Recovered (Cash)</span>
                  <ArrowDownRight :size="18" class="text-emerald" />
                </div>
                <div class="kpi-number text-emerald">
                  ZMW {{ parseFloat(reportData.end_of_day.debt_recovered).toFixed(2) }}
                </div>
                <span class="kpi-desc">Prior debt payments received</span>
              </div>

              <div class="kpi-card">
                <div class="kpi-head">
                  <span class="kpi-title">Total Outstanding Debtors</span>
                  <AlertTriangle :size="18" class="text-rose" />
                </div>
                <div class="kpi-number text-rose">
                  ZMW {{ parseFloat(reportData.end_of_day.total_debtors_balance).toFixed(2) }}
                </div>
                <span class="kpi-desc">Total balance due from clients</span>
              </div>
            </div>
          </div>

          <!-- TAB 2: PRODUCT SALES BREAKDOWN -->
          <div v-else-if="activeTab === 'sales'" class="tab-pane">
            <div class="table-container">
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th class="text-center">Sale Format</th>
                    <th class="text-right">Units / Packs Sold</th>
                    <th class="text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ps in reportData.product_sales" :key="ps.product__id + '-' + ps.is_pack_sale">
                    <td>
                      <strong>{{ ps.product__name }}</strong>
                    </td>
                    <td class="text-center">
                      <span class="format-pill" :class="ps.is_pack_sale ? 'pill-pack' : 'pill-unit'">
                        {{ ps.is_pack_sale ? 'Full Pack' : 'Single Piece' }}
                      </span>
                    </td>
                    <td class="text-right font-bold">{{ parseFloat(ps.total_quantity).toFixed(0) }}</td>
                    <td class="text-right text-emerald font-bold">ZMW {{ parseFloat(ps.total_revenue).toFixed(2) }}</td>
                  </tr>

                  <tr v-if="reportData.product_sales.length === 0">
                    <td colspan="4" class="empty-cell">No sales recorded yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 3: STOCK ON HAND & REORDER ALERTS -->
          <div v-else-if="activeTab === 'stock'" class="tab-pane">
            <div class="table-container">
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Pack Format</th>
                    <th class="text-right">Cost Price</th>
                    <th class="text-right">Selling Price</th>
                    <th class="text-right">Stock on Hand</th>
                    <th class="text-right">Reorder Threshold</th>
                    <th class="text-center">Inventory Health</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in reportData.stock_on_hand" :key="item.id">
                    <td><strong>{{ item.name }}</strong></td>
                    <td>
                      <span v-if="item.is_pack" class="text-cyan text-sm">{{ item.pack_name || 'Pack' }}</span>
                      <span v-else class="text-slate text-sm">Piece</span>
                    </td>
                    <td class="text-right">ZMW {{ parseFloat(item.cost_price).toFixed(2) }}</td>
                    <td class="text-right">ZMW {{ parseFloat(item.selling_price).toFixed(2) }}</td>
                    <td class="text-right font-bold" :class="parseFloat(item.stock_quantity) <= parseFloat(item.reorder_threshold) ? 'text-rose' : 'text-emerald'">
                      {{ parseFloat(item.stock_quantity).toFixed(1) }}
                    </td>
                    <td class="text-right">{{ parseFloat(item.reorder_threshold).toFixed(0) }}</td>
                    <td class="text-center">
                      <span 
                        v-if="parseFloat(item.stock_quantity) <= parseFloat(item.reorder_threshold)" 
                        class="health-badge badge-warning"
                      >
                        ⚠️ REORDER NEEDED
                      </span>
                      <span v-else class="health-badge badge-healthy">
                        ✓ In Stock
                      </span>
                    </td>
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

.reports-window {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  width: 95%;
  max-width: 1100px;
  height: 85vh;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
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
  padding: 0.5rem 1.1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(6, 182, 212, 0.2);
  color: #22d3ee;
  font-weight: 600;
}

.btn-print {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #f1f5f9;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-close-window {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.report-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* Drawer Cash Banner */
.drawer-cash-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(8, 145, 178, 0.25), rgba(6, 182, 212, 0.15));
  border: 1px solid rgba(6, 182, 212, 0.4);
  border-radius: 16px;
  padding: 1.25rem 1.75rem;
  margin-bottom: 1.5rem;
}

.drawer-title-box {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.drawer-title-box h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #f8fafc;
}

.drawer-sub {
  font-size: 0.82rem;
  color: #94a3b8;
}

.drawer-cash-val {
  font-size: 1.8rem;
  font-weight: 800;
  color: #22d3ee;
}

/* KPI Cards Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

.kpi-card {
  background: rgba(18, 24, 38, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.kpi-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-title {
  font-size: 0.85rem;
  color: #94a3b8;
  font-weight: 500;
}

.kpi-number {
  font-size: 1.4rem;
  font-weight: 700;
}

.kpi-desc {
  font-size: 0.75rem;
  color: #64748b;
}

/* Table Styles */
.table-container {
  background: rgba(18, 24, 38, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.report-table th {
  background: rgba(15, 23, 42, 0.8);
  padding: 0.85rem 1rem;
  color: #94a3b8;
  font-weight: 600;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.report-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
}

.text-right { text-align: right; }
.text-center { text-align: center; }
.text-cyan { color: #22d3ee; }
.text-emerald { color: #34d399; }
.text-yellow { color: #facc15; }
.text-amber { color: #fbbf24; }
.text-rose { color: #f43f5e; }
.text-slate { color: #64748b; }
.font-bold { font-weight: 700; }

.format-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.pill-pack {
  background: rgba(6, 182, 212, 0.2);
  color: #22d3ee;
}

.pill-unit {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.health-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
}

.badge-warning {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.badge-healthy {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}
</style>
