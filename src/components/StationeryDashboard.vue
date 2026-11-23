<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import api from '../api'
import {
  LayoutDashboard, ShoppingCart, Package, AlertTriangle, Receipt,
  TrendingUp, Clock, Users, Truck, FileText, DollarSign, BarChart3,
  Boxes, MapPin, UserCheck, ShieldCheck, ArrowRight, RefreshCw,
  Barcode, Plus, CheckCircle2, PauseCircle
} from 'lucide-vue-next'

const loading = ref(true)
const recentOrders = ref([])
const orderSummary = ref({
  total_sales: '0.00',
  total_orders: 0,
  cash_total: '0.00',
  mobile_total: '0.00',
  credit_total: '0.00',
})
const products = ref([])
const expensesTotal = ref(0)
const suppliersCount = ref(0)

const role = computed(() => store.user?.role || 'stationery_cashier')
const isOwner = computed(() => role.value === 'owner')
const isManager = computed(() => role.value === 'stationery_manager')
const isCashier = computed(() => role.value === 'stationery_cashier')
const isStockClerk = computed(() => role.value === 'stock_clerk')

const businessName = computed(() =>
  store.businessUnits.find(u => u.id === 'stationery')?.name || 'Stationery & Retail'
)

const roleDisplay = computed(() => {
  const map = {
    owner: 'Business Owner',
    stationery_manager: 'Stationery Manager',
    stationery_cashier: 'Stationery Cashier',
    stock_clerk: 'Stock Clerk',
  }
  return map[role.value] || 'Staff'
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return t('dash.morning')
  if (hour < 17) return t('dash.afternoon')
  return t('dash.evening')
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
)

const lowStockProducts = computed(() =>
  products.value.filter(p => {
    const qty = Number(p.stock_quantity ?? 0)
    const min = Number(p.reorder_level ?? 10)
    return qty > 0 && qty <= min
  })
)

const outOfStockProducts = computed(() =>
  products.value.filter(p => Number(p.stock_quantity ?? 0) <= 0)
)

const watchlistProducts = computed(() =>
  [...outOfStockProducts.value, ...lowStockProducts.value].slice(0, 6)
)

const inStockCount = computed(() =>
  Math.max(0, products.value.length - lowStockProducts.value.length - outOfStockProducts.value.length)
)

const paymentMix = computed(() => {
  const cash = parseFloat(orderSummary.value.cash_total) || 0
  const mobile = parseFloat(orderSummary.value.mobile_total) || 0
  const credit = parseFloat(orderSummary.value.credit_total) || 0
  const total = cash + mobile + credit || 1
  return [
    { label: t('dash.cash'), amount: cash, pct: Math.round((cash / total) * 100) },
    { label: t('dash.mobileMoney'), amount: mobile, pct: Math.round((mobile / total) * 100) },
    { label: t('dash.customerCredit'), amount: credit, pct: Math.round((credit / total) * 100) },
  ]
})

const stationeryBranchesCount = computed(() =>
  (store.branches || []).filter(b => (b.business_unit_id || b.business_unit) === 'stationery' && b.is_active !== false).length
)

const formatMoney = (val) => {
  const num = parseFloat(val) || 0
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatTime = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const kpiCards = computed(() => {
  if (isCashier.value) {
    return [
      {
        label: 'Register Shift',
        value: store.activeShift ? `Shift #${store.activeShift.id}` : 'Not Open',
        sub: store.activeShift ? 'Active & ready for sales' : 'Open a shift to start selling',
        icon: Clock,
        tone: store.activeShift ? 'positive' : 'alert',
        action: () => { store.activeModal = 'shift' },
      },
      {
        label: 'My Sales Today',
        value: `TSH ${formatMoney(orderSummary.value.total_sales)}`,
        sub: `${orderSummary.value.total_orders || 0} completed orders`,
        icon: TrendingUp,
        tone: 'neutral',
        action: () => { store.activeModal = 'sales_records' },
      },
      {
        label: 'Cash & Mobile Today',
        value: `TSH ${formatMoney((parseFloat(orderSummary.value.cash_total) || 0) + (parseFloat(orderSummary.value.mobile_total) || 0))}`,
        sub: `Credit: TSH ${formatMoney(orderSummary.value.credit_total)}`,
        icon: Receipt,
        tone: 'neutral',
        action: () => { store.activeModal = 'sales_records' },
      },
      {
        label: 'Held Orders',
        value: `${(store.currentUnitHeldSales || []).length}`,
        sub: 'Suspended baskets waiting',
        icon: PauseCircle,
        tone: 'neutral',
        action: () => { store.activeModal = 'stationery_pos' },
      },
    ]
  }

  if (isStockClerk.value) {
    return [
      {
        label: 'Total Catalog Items',
        value: `${products.value.length}`,
        sub: `${inStockCount.value} healthy stock`,
        icon: Package,
        tone: 'neutral',
        action: () => { store.activeModal = 'stock_inventory' },
      },
      {
        label: 'Low Stock Alerts',
        value: `${lowStockProducts.value.length}`,
        sub: 'At or below reorder level',
        icon: AlertTriangle,
        tone: lowStockProducts.value.length > 0 ? 'alert' : 'positive',
        action: () => { store.activeModal = 'stock_inventory' },
      },
      {
        label: 'Out of Stock',
        value: `${outOfStockProducts.value.length}`,
        sub: 'Requires immediate restock',
        icon: Boxes,
        tone: outOfStockProducts.value.length > 0 ? 'alert' : 'positive',
        action: () => { store.activeModal = 'stock_inventory' },
      },
      {
        label: 'Active Suppliers',
        value: `${suppliersCount.value}`,
        sub: 'Vendors & purchase orders',
        icon: Truck,
        tone: 'neutral',
        action: () => { store.activeModal = 'suppliers' },
      },
    ]
  }

  if (isManager.value) {
    return [
      {
        label: "Today's Revenue",
        value: `TSH ${formatMoney(orderSummary.value.total_sales)}`,
        sub: `${orderSummary.value.total_orders || 0} transactions today`,
        icon: TrendingUp,
        tone: 'neutral',
        action: () => { store.activeModal = 'sales_records' },
      },
      {
        label: 'Catalog & Stock Alerts',
        value: `${products.value.length} Items`,
        sub: `${lowStockProducts.value.length + outOfStockProducts.value.length} need restock`,
        icon: Package,
        tone: (lowStockProducts.value.length + outOfStockProducts.value.length) > 0 ? 'alert' : 'positive',
        action: () => { store.activeModal = 'stock_inventory' },
      },
      {
        label: 'Monthly Expenses',
        value: `TSH ${formatMoney(expensesTotal.value)}`,
        sub: 'Recorded operating costs',
        icon: DollarSign,
        tone: 'neutral',
        action: () => { store.activeModal = 'expenses' },
      },
      {
        label: 'Customer Credit Today',
        value: `TSH ${formatMoney(orderSummary.value.credit_total)}`,
        sub: 'B2B & credit accounts',
        icon: Users,
        tone: 'neutral',
        action: () => { store.activeModal = 'customers' },
      },
    ]
  }

  // Business Owner
  return [
    {
      label: "Today's Stationery Revenue",
      value: `TSH ${formatMoney(orderSummary.value.total_sales)}`,
      sub: `${orderSummary.value.total_orders || 0} orders across branches`,
      icon: TrendingUp,
      tone: 'neutral',
      action: () => { store.activeModal = 'sales_records' },
    },
    {
      label: 'Products & Stock Health',
      value: `${products.value.length} SKUs`,
      sub: `${lowStockProducts.value.length + outOfStockProducts.value.length} low / out of stock`,
      icon: Package,
      tone: (lowStockProducts.value.length + outOfStockProducts.value.length) > 0 ? 'alert' : 'positive',
      action: () => { store.activeModal = 'catalog_management' },
    },
    {
      label: 'Monthly Operating Costs',
      value: `TSH ${formatMoney(expensesTotal.value)}`,
      sub: 'Deducted in P&L reports',
      icon: DollarSign,
      tone: 'neutral',
      action: () => { store.activeModal = 'expenses' },
    },
    {
      label: 'Stationery Branches',
      value: `${stationeryBranchesCount.value}`,
      sub: 'Active physical locations',
      icon: MapPin,
      tone: 'neutral',
      action: () => { store.activeModal = 'branch_management' },
    },
  ]
})

const quickActions = computed(() => {
  if (isCashier.value) {
    return [
      { label: 'POS Counter', desc: 'Start billing customers', icon: ShoppingCart, modal: 'stationery_pos' },
      { label: 'My Sales', desc: 'View today’s receipts', icon: Receipt, modal: 'sales_records' },
      { label: 'Register Shift', desc: 'Open or close shift', icon: Clock, modal: 'shift' },
      { label: 'Customers', desc: 'Credit & B2B accounts', icon: Users, modal: 'customers' },
      { label: 'Quotations', desc: 'Create proforma quotes', icon: FileText, modal: 'quotations' },
      { label: 'Barcode Labels', desc: 'Print shelf & item tags', icon: Barcode, modal: 'barcode_labels' },
    ]
  }
  if (isStockClerk.value) {
    return [
      { label: 'Inventory & Stock', desc: 'Adjust stock quantities', icon: Boxes, modal: 'stock_inventory' },
      { label: 'Suppliers & Goods', desc: 'Receive purchase orders', icon: Truck, modal: 'suppliers' },
      { label: 'Barcode Labels', desc: 'Print product labels', icon: Barcode, modal: 'barcode_labels' },
      { label: 'POS Counter', desc: 'Browse product catalog', icon: ShoppingCart, modal: 'stationery_pos' },
    ]
  }
  if (isManager.value) {
    return [
      { label: 'Product Catalog', desc: 'Register & price items', icon: Plus, modal: 'catalog_management' },
      { label: 'Inventory & Stock', desc: 'Monitor stock levels', icon: Boxes, modal: 'stock_inventory' },
      { label: 'Stationery Reports', desc: 'EOD & margin analytics', icon: BarChart3, modal: 'stationery_reports' },
      { label: 'Operating Expenses', desc: 'Log running costs', icon: DollarSign, modal: 'expenses' },
      { label: 'Quotations', desc: 'Wholesale proposals', icon: FileText, modal: 'quotations' },
      { label: 'POS Counter', desc: 'Open counter view', icon: ShoppingCart, modal: 'stationery_pos' },
    ]
  }
  return [
    { label: 'Product Catalog', desc: 'Add & manage SKUs', icon: Plus, modal: 'catalog_management' },
    { label: 'Stationery Reports', desc: 'Revenue & EOD reports', icon: BarChart3, modal: 'stationery_reports' },
    { label: 'Branches', desc: 'Manage locations', icon: MapPin, modal: 'branch_management' },
    { label: 'Staff & Roles', desc: 'Team & permissions', icon: UserCheck, modal: 'staff_management' },
    { label: 'Operating Expenses', desc: 'Track business costs', icon: DollarSign, modal: 'expenses' },
    { label: 'Audit Trail', desc: 'Review system logs', icon: ShieldCheck, modal: 'audit' },
  ]
})

const fetchDashboardData = async () => {
  loading.value = true
  try {
    const bust = Date.now()
    const orderParams = { range: 'today', page_size: 6, _t: bust }
    if (isCashier.value) {
      orderParams.my_sales = 'true'
    }

    const tasks = [
      api.get('/catalog/products/', { params: { _t: bust } }),
      api.get('/pos/orders/', { params: orderParams }),
    ]

    if (isOwner.value || isManager.value) {
      tasks.push(api.get('/pos/expenses/', { params: { range: 'this_month', _t: bust } }))
    } else {
      tasks.push(Promise.resolve(null))
    }

    if (isStockClerk.value || isOwner.value || isManager.value) {
      tasks.push(api.get('/pos/suppliers/', { params: { _t: bust } }))
    } else {
      tasks.push(Promise.resolve(null))
    }

    const [prodRes, orderRes, expRes, supRes] = await Promise.allSettled(tasks)

    if (prodRes.status === 'fulfilled' && prodRes.value?.data) {
      products.value = Array.isArray(prodRes.value.data) ? prodRes.value.data : (prodRes.value.data.results || [])
    }

    if (orderRes.status === 'fulfilled' && orderRes.value?.data) {
      const data = orderRes.value.data
      recentOrders.value = data.results || (Array.isArray(data) ? data.slice(0, 6) : [])
      if (data.summary) {
        orderSummary.value = data.summary
      }
    }

    if (expRes.status === 'fulfilled' && expRes.value?.data) {
      const list = Array.isArray(expRes.value.data) ? expRes.value.data : (expRes.value.data.expenses || [])
      expensesTotal.value = list.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    }

    if (supRes.status === 'fulfilled' && supRes.value?.data) {
      const sList = Array.isArray(supRes.value.data) ? supRes.value.data : (supRes.value.data.results || [])
      suppliersCount.value = sList.length
    }
  } finally {
    loading.value = false
  }
}

const onLiveRefresh = () => {
  fetchDashboardData()
  store.fetchActiveShift()
}

const onVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    onLiveRefresh()
  }
}

onMounted(() => {
  fetchDashboardData()
  window.addEventListener('fringe-sale-completed', onLiveRefresh)
  window.addEventListener('fringe-branch-changed', onLiveRefresh)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener('fringe-sale-completed', onLiveRefresh)
  window.removeEventListener('fringe-branch-changed', onLiveRefresh)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

watch(() => [store.activeBranchId, store.lastSaleAt], () => {
  fetchDashboardData()
})

watch(() => store.activeModal, (nextModal) => {
  if (nextModal === null) {
    onLiveRefresh()
  }
})
</script>

<template>
  <div class="dash-page" :data-theme="store.theme">
    <div class="dash-inner">
      <!-- Top Greeting Hero -->
      <header class="dash-header">
        <div class="dash-header-left">
          <div class="dash-eyebrow">
            <LayoutDashboard :size="14" />
            <span>{{ businessName }}</span>
            <span class="dot-sep">·</span>
            <span>{{ roleDisplay }}</span>
            <span v-if="store.activeBranchName" class="dot-sep">·</span>
            <span v-if="store.activeBranchName">{{ store.activeBranchName }}</span>
          </div>
          <h1 class="dash-title">
            {{ greeting }}, {{ store.user?.first_name || store.user?.username || 'Welcome' }}
          </h1>
          <p class="dash-date">{{ todayLabel }}</p>
        </div>

        <div class="dash-header-actions">
          <button class="btn-secondary" @click="fetchDashboardData" :title="t('common.refresh')">
            <RefreshCw :size="15" :class="{ spin: loading }" />
            <span>{{ t('common.refresh') }}</span>
          </button>

          <button
            v-if="isOwner || isManager"
            class="btn-secondary"
            @click="store.activeModal = 'catalog_management'"
          >
            <Plus :size="15" />
            <span>{{ t('dash.registerProduct') }}</span>
          </button>

          <button
            v-if="isStockClerk"
            class="btn-primary"
            @click="store.activeModal = 'stock_inventory'"
          >
            <Boxes :size="16" />
            <span>{{ t('dash.manageStock') }}</span>
            <ArrowRight :size="15" />
          </button>
          <button
            v-else
            class="btn-primary"
            @click="store.activeModal = 'stationery_pos'"
          >
            <ShoppingCart :size="16" />
            <span>{{ t('dash.openPos') }}</span>
            <ArrowRight :size="15" />
          </button>
        </div>
      </header>

      <!-- KPI Strip -->
      <section class="kpi-grid">
        <button
          v-for="(kpi, idx) in kpiCards"
          :key="idx"
          type="button"
          class="kpi-card"
          @click="kpi.action"
        >
          <div class="kpi-top">
            <span class="kpi-label">{{ kpi.label }}</span>
            <div class="kpi-icon" :class="kpi.tone">
              <component :is="kpi.icon" :size="17" />
            </div>
          </div>
          <div class="kpi-value">{{ kpi.value }}</div>
          <div class="kpi-sub" :class="kpi.tone">{{ kpi.sub }}</div>
        </button>
      </section>

      <!-- Main Two-Column Content -->
      <div class="dash-grid">
        <!-- Left Column: Primary Activity Table -->
        <section class="panel primary-panel">
          <!-- Stock Clerk View: Low Stock Watchlist -->
          <template v-if="isStockClerk">
            <div class="panel-header">
              <div>
                <h2>{{ t('dash.watchlistTitle') }}</h2>
                <p>{{ t('dash.watchlistSub') }}</p>
              </div>
              <button class="btn-link" @click="store.activeModal = 'stock_inventory'">
                <span>{{ t('common.allInventory') }}</span>
                <ArrowRight :size="14" />
              </button>
            </div>

            <div v-if="watchlistProducts.length === 0" class="mini-empty">
              <CheckCircle2 :size="28" />
              <h3>{{ t('dash.stockHealthyTitle') }}</h3>
              <p>{{ t('dash.stockHealthySub') }}</p>
            </div>

            <div v-else class="table-wrap">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th class="text-right">In Stock</th>
                    <th class="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in watchlistProducts" :key="item.id">
                    <td><strong>{{ item.name }}</strong></td>
                    <td class="mono">{{ item.sku || '—' }}</td>
                    <td class="text-right mono">{{ item.stock_quantity }}</td>
                    <td class="text-right">
                      <span class="pill" :class="Number(item.stock_quantity) <= 0 ? 'pill-danger' : 'pill-warn'">
                        {{ Number(item.stock_quantity) <= 0 ? 'Out of Stock' : 'Low Stock' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <!-- Owner / Manager / Cashier View: Recent Sales -->
          <template v-else>
            <div class="panel-header">
              <div>
                <h2>{{ isCashier ? t('dash.myRecentSales') : t('dash.recentSales') }}</h2>
                <p>{{ isCashier ? t('dash.myRecentSalesSub') : t('dash.recentSalesSub') }}</p>
              </div>
              <button class="btn-link" @click="store.activeModal = 'sales_records'">
                <span>{{ t('common.viewAll') }}</span>
                <ArrowRight :size="14" />
              </button>
            </div>

            <div v-if="recentOrders.length === 0" class="mini-empty">
              <Receipt :size="28" />
              <h3>{{ t('dash.noSalesTitle') }}</h3>
              <p>{{ isCashier ? t('dash.noSalesSubCashier') : t('dash.noSalesSubOther') }}</p>
              <button class="btn-primary-sm" @click="store.activeModal = 'stationery_pos'">
                <ShoppingCart :size="14" />
                <span>{{ t('dash.goToPos') }}</span>
              </button>
            </div>

            <div v-else class="table-wrap">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Time</th>
                    <th>Cashier</th>
                    <th>Payment</th>
                    <th class="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ord in recentOrders" :key="ord.id" @click="store.activeModal = 'sales_records'">
                    <td class="mono"><strong>{{ ord.order_number || `#${ord.id}` }}</strong></td>
                    <td>{{ formatTime(ord.created_at) }}</td>
                    <td>@{{ ord.cashier_username || ord.cashier_name || 'staff' }}</td>
                    <td>
                      <span class="pill pill-neutral">{{ (ord.payment_method || 'CASH').replace('_', ' ') }}</span>
                    </td>
                    <td class="text-right mono"><strong>TSH {{ formatMoney(ord.final_amount) }}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </section>

        <!-- Right Column: Quick Actions + Secondary Insight -->
        <aside class="side-stack">
          <!-- Quick Actions -->
          <section class="panel">
            <div class="panel-header compact">
              <div>
                <h2>{{ t('dash.quickActions') }}</h2>
                <p>{{ t('dash.quickActionsSub') }}</p>
              </div>
            </div>

            <div class="actions-grid">
              <button
                v-for="act in quickActions"
                :key="act.modal"
                type="button"
                class="action-tile"
                @click="store.activeModal = act.modal"
              >
                <div class="tile-icon">
                  <component :is="act.icon" :size="17" />
                </div>
                <div class="tile-text">
                  <strong>{{ act.label }}</strong>
                  <span>{{ act.desc }}</span>
                </div>
              </button>
            </div>
          </section>

          <!-- Secondary Insight Panel -->
          <section class="panel">
            <template v-if="isStockClerk">
              <div class="panel-header compact">
                <div>
                  <h2>Catalog Stock Health</h2>
                  <p>Distribution across {{ products.length }} products.</p>
                </div>
              </div>
              <div class="mix-list">
                <div class="mix-item">
                  <div class="mix-row">
                    <span>Healthy Stock</span>
                    <strong>{{ inStockCount }} items</strong>
                  </div>
                  <div class="mix-bar">
                    <div class="mix-fill positive" :style="{ width: `${products.length ? (inStockCount / products.length) * 100 : 0}%` }"></div>
                  </div>
                </div>
                <div class="mix-item">
                  <div class="mix-row">
                    <span>Low / Out of Stock</span>
                    <strong>{{ lowStockProducts.length + outOfStockProducts.length }} items</strong>
                  </div>
                  <div class="mix-bar">
                    <div class="mix-fill danger" :style="{ width: `${products.length ? ((lowStockProducts.length + outOfStockProducts.length) / products.length) * 100 : 0}%` }"></div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="panel-header compact">
                <div>
                  <h2>{{ t('dash.paymentMix') }}</h2>
                  <p>{{ t('dash.paymentMixSub') }}</p>
                </div>
              </div>
              <div class="mix-list">
                <div v-for="m in paymentMix" :key="m.label" class="mix-item">
                  <div class="mix-row">
                    <span>{{ m.label }}</span>
                    <strong>TSH {{ formatMoney(m.amount) }}</strong>
                  </div>
                  <div class="mix-bar">
                    <div class="mix-fill" :style="{ width: `${m.pct}%` }"></div>
                  </div>
                </div>
              </div>
            </template>
          </section>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   RESTRAINED, MINIMALISTIC PALETTE — LIGHT & DARK MODE
   ============================================================ */
.dash-page {
  --d-bg: #0b0f19;
  --d-surface: #111827;
  --d-card: #161f30;
  --d-elevated: #1e293b;
  --d-border: rgba(255, 255, 255, 0.08);
  --d-border-strong: rgba(255, 255, 255, 0.16);
  --d-text: #f8fafc;
  --d-text-sec: #cbd5e1;
  --d-text-muted: #94a3b8;
  --d-accent: #6366f1;
  --d-accent-hover: #4f46e5;
  --d-accent-soft: rgba(99, 102, 241, 0.14);
  --d-positive: #10b981;
  --d-positive-soft: rgba(16, 185, 129, 0.14);
  --d-danger: #f43f5e;
  --d-danger-soft: rgba(244, 63, 94, 0.14);
  --d-shadow: 0 2px 14px rgba(0, 0, 0, 0.25);

  width: 100%;
  min-height: 100vh;
  background: var(--d-bg);
  color: var(--d-text);
}

.dash-page[data-theme="light"] {
  --d-bg: #f6f8fb;
  --d-surface: #ffffff;
  --d-card: #ffffff;
  --d-elevated: #f1f5f9;
  --d-border: #e2e8f0;
  --d-border-strong: #cbd5e1;
  --d-text: #0f172a;
  --d-text-sec: #334155;
  --d-text-muted: #64748b;
  --d-accent: #4f46e5;
  --d-accent-hover: #4338ca;
  --d-accent-soft: #eef2ff;
  --d-positive: #059669;
  --d-positive-soft: #ecfdf5;
  --d-danger: #e11d48;
  --d-danger-soft: #fff1f2;
  --d-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 6px 20px rgba(15, 23, 42, 0.03);
}

.dash-inner {
  max-width: 1480px;
  margin: 0 auto;
  padding: 28px 28px 40px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* Header */
.dash-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.dash-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--d-text-muted);
  margin-bottom: 6px;
}

.dot-sep {
  opacity: 0.5;
}

.dash-title {
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--d-text);
  line-height: 1.2;
}

.dash-date {
  font-size: 0.86rem;
  color: var(--d-text-muted);
  margin-top: 4px;
}

.dash-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-primary-sm {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 11px;
  font-size: 0.88rem;
  font-weight: 700;
  background: var(--d-accent);
  color: #ffffff;
  transition: all 0.18s ease;
}

.btn-primary-sm {
  padding: 8px 14px;
  font-size: 0.82rem;
  margin-top: 6px;
}

.btn-primary:hover,
.btn-primary-sm:hover {
  background: var(--d-accent-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  border-radius: 11px;
  font-size: 0.85rem;
  font-weight: 600;
  background: var(--d-surface);
  border: 1px solid var(--d-border);
  color: var(--d-text-sec);
  transition: all 0.18s ease;
}

.btn-secondary:hover {
  border-color: var(--d-border-strong);
  color: var(--d-text);
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.kpi-card {
  text-align: left;
  background: var(--d-card);
  border: 1px solid var(--d-border);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: var(--d-shadow);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  border-color: var(--d-border-strong);
}

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.kpi-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--d-text-muted);
}

.kpi-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--d-elevated);
  color: var(--d-text-sec);
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-icon.positive {
  background: var(--d-positive-soft);
  color: var(--d-positive);
}

.kpi-icon.alert {
  background: var(--d-danger-soft);
  color: var(--d-danger);
}

.kpi-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--d-text);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.kpi-sub {
  font-size: 0.78rem;
  color: var(--d-text-muted);
}

.kpi-sub.positive { color: var(--d-positive); }
.kpi-sub.alert { color: var(--d-danger); }

/* Main Grid */
.dash-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(300px, 1fr);
  gap: 20px;
  align-items: start;
}

.side-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel {
  background: var(--d-surface);
  border: 1px solid var(--d-border);
  border-radius: 18px;
  padding: 20px 22px;
  box-shadow: var(--d-shadow);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-header.compact {
  margin-bottom: 14px;
}

.panel-header h2 {
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--d-text);
}

.panel-header p {
  font-size: 0.8rem;
  color: var(--d-text-muted);
  margin-top: 2px;
}

.btn-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--d-accent);
  background: transparent;
  padding: 4px 0;
  flex-shrink: 0;
}

.btn-link:hover {
  text-decoration: underline;
}

/* Table */
.table-wrap {
  overflow-x: auto;
}

.dash-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 480px;
}

.dash-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--d-text-muted);
  border-bottom: 1px solid var(--d-border);
}

.dash-table td {
  padding: 12px;
  font-size: 0.85rem;
  color: var(--d-text-sec);
  border-bottom: 1px solid var(--d-border);
}

.dash-table tbody tr {
  cursor: pointer;
  transition: background 0.14s ease;
}

.dash-table tbody tr:hover {
  background: var(--d-elevated);
}

.dash-table strong {
  color: var(--d-text);
}

.mono {
  font-variant-numeric: tabular-nums;
}

.text-right {
  text-align: right;
}

.pill {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
}

.pill-neutral {
  background: var(--d-elevated);
  color: var(--d-text-sec);
}

.pill-danger {
  background: var(--d-danger-soft);
  color: var(--d-danger);
}

.pill-warn {
  background: var(--d-accent-soft);
  color: var(--d-accent);
}

/* Minimalistic Empty State */
.mini-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  padding: 44px 20px;
  border-radius: 14px;
  border: 1px dashed var(--d-border-strong);
  color: var(--d-text-muted);
}

.mini-empty h3 {
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--d-text);
}

.mini-empty p {
  font-size: 0.82rem;
  max-width: 320px;
}

/* Quick Actions Grid */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.action-tile {
  text-align: left;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px;
  border-radius: 12px;
  background: var(--d-elevated);
  border: 1px solid transparent;
  transition: all 0.16s ease;
}

.action-tile:hover {
  border-color: var(--d-accent);
  background: var(--d-surface);
}

.tile-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--d-surface);
  border: 1px solid var(--d-border);
  color: var(--d-text-sec);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-tile:hover .tile-icon {
  background: var(--d-accent-soft);
  border-color: transparent;
  color: var(--d-accent);
}

.tile-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tile-text strong {
  font-size: 0.83rem;
  font-weight: 700;
  color: var(--d-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-text span {
  font-size: 0.72rem;
  color: var(--d-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Payment / Health Breakdown */
.mix-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mix-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mix-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--d-text-sec);
}

.mix-row strong {
  color: var(--d-text);
  font-variant-numeric: tabular-nums;
}

.mix-bar {
  height: 7px;
  border-radius: 999px;
  background: var(--d-elevated);
  overflow: hidden;
}

.mix-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--d-accent);
  transition: width 0.3s ease;
}

.mix-fill.positive {
  background: var(--d-positive);
}

.mix-fill.danger {
  background: var(--d-danger);
}

/* Responsive */
@media (max-width: 1120px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dash-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .dash-inner {
    padding: 16px 14px 28px;
  }

  .dash-title {
    font-size: 1.35rem;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }

  .dash-header-actions {
    width: 100%;
  }

  .dash-header-actions .btn-primary {
    flex: 1;
    justify-content: center;
  }
}
</style>
