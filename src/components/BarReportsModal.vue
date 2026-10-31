<script setup>
import { ref, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import { FileText, TrendingUp, AlertTriangle, Layers, DollarSign, X } from 'lucide-vue-next'

const emit = defineEmits(['close'])

const activeTab = ref('sales') // 'sales' | 'stock' | 'profit'
const loading = ref(true)
const reportData = ref(null)
const errorMessage = ref('')

const fetchReports = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await api.get('/pos/reports/bar/')
    reportData.value = response.data
  } catch (err) {
    errorMessage.value = err.response?.data?.detail || err.response?.data?.error || 'Failed to load bar reports.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReports()
})
</script>

<template>
  <div class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <div class="header-left">
          <FileText :size="24" class="header-icon" />
          <div>
            <h3 class="title">Bar Management Reports</h3>
            <p class="subtitle">Real-time sales, inventory valuation, and gross margins</p>
          </div>
        </div>
        <button class="btn-close" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>

      <!-- Report Tabs -->
      <div class="report-tabs">
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
          <span>Stock-On-Hand</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'profit' }"
          @click="activeTab = 'profit'"
        >
          <DollarSign :size="16" />
          <span>Profit Snapshot</span>
        </button>
      </div>

      <div v-if="loading" class="state-msg">Generating real-time reports...</div>
      <div v-else-if="errorMessage" class="error-banner">{{ errorMessage }}</div>
      <div v-else-if="reportData" class="report-body">
        
        <!-- 1. PRODUCT SALES BREAKDOWN -->
        <div v-if="activeTab === 'sales'" class="table-container">
          <table class="report-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Classification</th>
                <th class="text-right">Units Sold</th>
                <th class="text-right">Revenue (ZMW)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in reportData.product_sales" :key="item.product__id">
                <td class="bold">{{ item.product__name }}</td>
                <td>
                  <span class="badge" :class="item.product__is_alcoholic ? 'badge-alcohol' : 'badge-soft'">
                    {{ item.product__is_alcoholic ? 'Alcoholic (18+)' : 'Non-Alcoholic' }}
                  </span>
                </td>
                <td class="text-right">{{ item.total_quantity }}</td>
                <td class="text-right bold price">ZMW {{ parseFloat(item.total_revenue).toFixed(2) }}</td>
              </tr>
              <tr v-if="reportData.product_sales.length === 0">
                <td colspan="4" class="empty-row">No sales recorded yet for this session.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 2. STOCK-ON-HAND STATUS -->
        <div v-else-if="activeTab === 'stock'" class="table-container">
          <table class="report-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th class="text-right">Selling Price</th>
                <th class="text-right">Cost Price</th>
                <th class="text-right">Current Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="prod in reportData.stock_on_hand" :key="prod.id">
                <td class="bold">{{ prod.name }}</td>
                <td class="text-right">ZMW {{ parseFloat(prod.selling_price).toFixed(2) }}</td>
                <td class="text-right">ZMW {{ parseFloat(prod.cost_price).toFixed(2) }}</td>
                <td class="text-right bold" :class="{ 'text-danger': Number(prod.stock_quantity) <= Number(prod.reorder_threshold) }">
                  {{ Number(prod.stock_quantity).toFixed(0) }}
                </td>
                <td>
                  <span 
                    class="badge" 
                    :class="Number(prod.stock_quantity) <= Number(prod.reorder_threshold) ? 'badge-danger' : 'badge-good'"
                  >
                    {{ Number(prod.stock_quantity) <= Number(prod.reorder_threshold) ? 'Low Stock' : 'Optimal' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 3. PROFIT SNAPSHOT -->
        <div v-else-if="activeTab === 'profit'" class="profit-view">
          <div class="kpi-grid">
            <div class="kpi-card">
              <span class="kpi-label">Total Bar Revenue</span>
              <span class="kpi-value text-accent">ZMW {{ reportData.profit_snapshot.total_revenue }}</span>
              <span class="kpi-desc">Gross completed drink orders</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Cost of Goods Sold (COGS)</span>
              <span class="kpi-value text-muted">ZMW {{ reportData.profit_snapshot.cogs }}</span>
              <span class="kpi-desc">Inventory purchase cost</span>
            </div>
            <div class="kpi-card highlight">
              <span class="kpi-label">Gross Profit</span>
              <span class="kpi-value text-success">ZMW {{ reportData.profit_snapshot.gross_profit }}</span>
              <span class="kpi-desc">Margin: {{ reportData.profit_snapshot.gross_margin_percent }}</span>
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
  max-width: 680px;
  max-height: 85vh;
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
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #fbbf24;
}

.title {
  font-size: 18px;
  font-weight: 800;
  color: #f8fafc;
}

.subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.btn-close {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border-radius: 8px;
  padding: 6px;
}

.report-tabs {
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: #f59e0b;
  color: #111827;
}

.report-body {
  flex: 1;
  overflow-y: auto;
}

.table-container {
  overflow-x: auto;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.report-table th {
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  font-weight: 700;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  text-transform: uppercase;
  font-size: 11px;
}

.report-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
}

.report-table tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

.text-right {
  text-align: right;
}

.bold {
  font-weight: 700;
  color: #f8fafc;
}

.price {
  color: #fbbf24;
}

.text-danger {
  color: #f87171;
}

.badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
}

.badge-alcohol {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.badge-soft {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.badge-good {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.badge-danger {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.empty-row {
  text-align: center;
  color: #64748b;
  padding: 32px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-top: 10px;
}

.kpi-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
}

.kpi-card.highlight {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.kpi-label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.kpi-value {
  font-size: 22px;
  font-weight: 900;
  margin-bottom: 4px;
}

.kpi-desc {
  font-size: 11px;
  color: #64748b;
}

.text-accent {
  color: #fbbf24;
}

.text-success {
  color: #10b981;
}

.state-msg {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  padding: 14px;
  border-radius: 10px;
  font-size: 13px;
}
</style>
