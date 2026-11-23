<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import api from '../api'
import {
  LayoutDashboard, Wine, Package, AlertTriangle, Receipt,
  TrendingUp, Clock, DollarSign, BarChart3, Boxes, MapPin,
  UserCheck, ShieldCheck, ArrowRight, RefreshCw, Plus,
  ShoppingCart, Layers
} from 'lucide-vue-next'

const isSw = computed(() => store.locale === 'sw')
const loading = ref(true)
const recentOrders = ref([])
const orderSummary = ref({
  total_sales: '0.00',
  total_orders: 0,
  cash_total: '0.00',
  mobile_total: '0.00',
})
const products = ref([])
const expensesTotal = ref(0)

const role = computed(() => store.user?.role || 'bartender')
const isOwner = computed(() => role.value === 'owner')
const isManager = computed(() => role.value === 'bar_manager')
const isBartender = computed(() => role.value === 'bartender')
const isStockClerk = computed(() => role.value === 'stock_clerk')

const businessName = computed(() =>
  store.businessUnits.find(u => u.id === 'bar')?.name || 'Bar & Lounge'
)

const roleDisplay = computed(() => {
  const map = {
    owner: isSw.value ? 'Mmiliki wa Biashara' : 'Business Owner',
    bar_manager: isSw.value ? 'Meneja wa Baa' : 'Bar Manager',
    bartender: isSw.value ? 'Mhudumu wa Baa' : 'Bartender / Cashier',
    stock_clerk: isSw.value ? 'Karani wa Stoo' : 'Stock Clerk',
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
    const min = Number(p.reorder_threshold ?? 5)
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
  const total = cash + mobile || 1
  return [
    { label: t('dash.cash'), amount: cash, pct: Math.round((cash / total) * 100) },
    { label: t('dash.mobileMoney'), amount: mobile, pct: Math.round((mobile / total) * 100) },
  ]
})

const barBranchesCount = computed(() =>
  (store.branches || []).filter(b => (b.business_unit_id || b.business_unit) === 'bar' && b.is_active !== false).length
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
  if (isBartender.value) {
    return [
      {
        label: isSw.value ? 'Zamu ya Kaunta' : 'Register Shift',
        value: store.activeShift ? `Shift #${store.activeShift.id}` : (isSw.value ? 'Haijafunguliwa' : 'Not Open'),
        sub: store.activeShift
          ? (isSw.value ? 'Iko wazi kwa mauzo' : 'Active & ready for orders')
          : (isSw.value ? 'Fungua zamu kuanza kuuza' : 'Open a shift to start selling'),
        icon: Clock,
        tone: store.activeShift ? 'positive' : 'alert',
        action: () => { store.activeModal = 'shift' },
      },
      {
        label: isSw.value ? 'Mauzo Yangu Leo' : 'My Sales Today',
        value: `TSH ${formatMoney(orderSummary.value.total_sales)}`,
        sub: `${orderSummary.value.total_orders || 0} ${isSw.value ? 'oda leo' : 'orders today'}`,
        icon: TrendingUp,
        tone: 'neutral',
        action: () => { store.activeModal = 'sales_records' },
      },
      {
        label: isSw.value ? 'Taslimu Leo' : 'Cash Collected',
        value: `TSH ${formatMoney(orderSummary.value.cash_total)}`,
        sub: isSw.value ? 'Malipo ya taslimu' : 'Cash counter payments',
        icon: DollarSign,
        tone: 'neutral',
        action: () => { store.activeModal = 'sales_records' },
      },
      {
        label: isSw.value ? 'Tahadhari ya Stoo' : 'Low Stock Drinks',
        value: `${lowStockProducts.value.length + outOfStockProducts.value.length}`,
        sub: `${products.value.length} ${isSw.value ? 'vinywaji vyote' : 'total drinks'}`,
        icon: AlertTriangle,
        tone: (lowStockProducts.value.length + outOfStockProducts.value.length) > 0 ? 'alert' : 'positive',
        action: () => { store.activeModal = 'bar_pos' },
      },
    ]
  }

  return [
    {
      label: isSw.value ? 'Mapato ya Baa Leo' : "Today's Bar Revenue",
      value: `TSH ${formatMoney(orderSummary.value.total_sales)}`,
      sub: `${orderSummary.value.total_orders || 0} ${isSw.value ? 'oda leo' : 'completed orders today'}`,
      icon: TrendingUp,
      tone: 'neutral',
      action: () => { store.activeModal = 'sales_records' },
    },
    {
      label: isSw.value ? 'Vinywaji na Stoo' : 'Drinks & Stock Health',
      value: `${products.value.length} ${isSw.value ? 'Aina' : 'SKUs'}`,
      sub: `${lowStockProducts.value.length + outOfStockProducts.value.length} ${isSw.value ? 'chache / zimeisha' : 'low / out of stock'}`,
      icon: Package,
      tone: (lowStockProducts.value.length + outOfStockProducts.value.length) > 0 ? 'alert' : 'positive',
      action: () => { store.activeModal = 'catalog_management' },
    },
    {
      label: isSw.value ? 'Matumizi ya Mwezi' : 'Monthly Operating Costs',
      value: `TSH ${formatMoney(expensesTotal.value)}`,
      sub: isSw.value ? 'Gharama za uendeshaji wa baa' : 'Deducted in Bar P&L reports',
      icon: DollarSign,
      tone: 'neutral',
      action: () => { store.activeModal = 'expenses' },
    },
    {
      label: isSw.value ? 'Matawi ya Baa' : 'Bar Branches',
      value: `${barBranchesCount.value}`,
      sub: isSw.value ? 'Matawi hai ya baa' : 'Active physical locations',
      icon: MapPin,
      tone: 'neutral',
      action: () => { store.activeModal = 'branch_management' },
    },
  ]
})

const quickActions = computed(() => {
  if (isBartender.value) {
    return [
      { label: isSw.value ? 'Kaunta ya Baa (POS)' : 'Bar POS Counter', desc: isSw.value ? 'Anza kuhudumia wateja' : 'Take drink orders & tabs', icon: Wine, modal: 'bar_pos' },
      { label: isSw.value ? 'Bili za Meza (Tabs)' : 'Open Bar Tabs', desc: isSw.value ? 'Simamia bili zinazoendelea' : 'Manage running customer tabs', icon: Layers, modal: 'tabs' },
      { label: isSw.value ? 'Mauzo Yangu' : 'My Sales', desc: isSw.value ? 'Tazama risiti za leo' : 'View today’s receipts', icon: Receipt, modal: 'sales_records' },
      { label: isSw.value ? 'Zamu ya Kaunta' : 'Register Shift', desc: isSw.value ? 'Fungua au funga zamu' : 'Open or close shift', icon: Clock, modal: 'shift' },
    ]
  }
  return [
    { label: isSw.value ? 'Kaunta ya Baa (POS)' : 'Bar POS Counter', desc: isSw.value ? 'Fungua kaunta ya vinywaji' : 'Open drinks POS counter', icon: Wine, modal: 'bar_pos' },
    { label: isSw.value ? 'Usajili wa Vinywaji' : 'Drink Registration', desc: isSw.value ? 'Ongeza na hariri vinywaji' : 'Register & price beverages', icon: Plus, modal: 'catalog_management' },
    { label: isSw.value ? 'Ripoti za Baa' : 'Bar Reports', desc: isSw.value ? 'Mapato, faida na stoo' : 'Revenue, margins & stock worth', icon: BarChart3, modal: 'reports' },
    { label: isSw.value ? 'Stoo na Hesabu' : 'Inventory & Stock', desc: isSw.value ? 'Rekebisha idadi ya kreti' : 'Adjust crate & bottle counts', icon: Boxes, modal: 'stock_inventory' },
    { label: isSw.value ? 'Matumizi ya Uendeshaji' : 'Operating Expenses', desc: isSw.value ? 'Rekodi gharama za baa' : 'Track bar running costs', icon: DollarSign, modal: 'expenses' },
    ...(isOwner.value
      ? [{ label: isSw.value ? 'Wafanyakazi na Majukumu' : 'Staff & Roles', desc: isSw.value ? 'Timu na ruhusa' : 'Team & permissions', icon: UserCheck, modal: 'staff_management' }]
      : [{ label: isSw.value ? 'Kumbukumbu za Ukaguzi' : 'Audit Trail', desc: isSw.value ? 'Kagua matukio ya mfumo' : 'Review system logs', icon: ShieldCheck, modal: 'audit' }])
  ]
})

const fetchDashboardData = async () => {
  loading.value = true
  try {
    const bust = Date.now()
    const orderParams = { range: 'today', page_size: 6, _t: bust }
    if (isBartender.value) {
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

    const [prodRes, orderRes, expRes] = await Promise.allSettled(tasks)

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
            <span class="dot">•</span>
            <span>{{ roleDisplay }}</span>
          </div>
          <h1>{{ greeting }}, {{ store.user?.first_name || store.user?.username || 'User' }}</h1>
          <p class="dash-date">{{ todayLabel }} · {{ store.activeBranchName }}</p>
        </div>

        <div class="dash-header-actions">
          <button type="button" class="btn-ghost" @click="fetchDashboardData" :disabled="loading">
            <RefreshCw :size="15" :class="{ spin: loading }" />
            <span>{{ t('common.refresh') }}</span>
          </button>
          <button type="button" class="btn-primary" @click="store.activeModal = 'bar_pos'">
            <ShoppingCart :size="15" />
            <span>{{ isSw ? 'Fungua Kaunta ya Baa' : 'Open Bar POS' }}</span>
          </button>
        </div>
      </header>

      <!-- KPI Cards Grid -->
      <section class="kpi-grid">
        <button
          v-for="card in kpiCards"
          :key="card.label"
          type="button"
          class="kpi-card"
          :class="`tone-${card.tone}`"
          @click="card.action"
        >
          <div class="kpi-top">
            <span class="kpi-label">{{ card.label }}</span>
            <div class="kpi-icon-box">
              <component :is="card.icon" :size="17" />
            </div>
          </div>
          <strong class="kpi-value">{{ card.value }}</strong>
          <span class="kpi-sub">{{ card.sub }}</span>
        </button>
      </section>

      <!-- Quick Actions -->
      <section class="panel-card">
        <div class="panel-head">
          <h2>{{ isSw ? 'Njia za Haraka' : 'Quick Actions' }}</h2>
          <span class="panel-sub">{{ isSw ? 'Fikia zana muhimu za baa kwa kubonyeza mara moja' : 'Jump straight to your Bar & Lounge workflows' }}</span>
        </div>
        <div class="actions-grid">
          <button
            v-for="act in quickActions"
            :key="act.label"
            type="button"
            class="action-tile"
            @click="store.activeModal = act.modal"
          >
            <div class="action-icon">
              <component :is="act.icon" :size="18" />
            </div>
            <div class="action-copy">
              <strong>{{ act.label }}</strong>
              <span>{{ act.desc }}</span>
            </div>
            <ArrowRight :size="15" class="action-arrow" />
          </button>
        </div>
      </section>

      <!-- Two-Column Insights: Payment Mix & Low Stock Watchlist -->
      <div class="dash-two-col">
        <section class="panel-card">
          <div class="panel-head">
            <h2>{{ isSw ? 'Mgawanyo wa Malipo Leo' : "Today's Payment Mix" }}</h2>
            <span class="panel-sub">{{ isSw ? 'Taslimu dhidi ya Pesa za Simu' : 'Cash vs Mobile Money tenders' }}</span>
          </div>
          <div class="mix-list">
            <div v-for="m in paymentMix" :key="m.label" class="mix-row">
              <div class="mix-meta">
                <span>{{ m.label }}</span>
                <strong>TSH {{ formatMoney(m.amount) }} ({{ m.pct }}%)</strong>
              </div>
              <div class="mix-bar">
                <div class="mix-fill" :style="{ width: `${m.pct}%` }"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="panel-card">
          <div class="panel-head">
            <h2>{{ isSw ? 'Vinywaji Vinavyohitaji Kuongezwa' : 'Drink Stock Watchlist' }}</h2>
            <span class="panel-sub">
              {{ inStockCount }} {{ isSw ? 'viko sawa' : 'healthy' }} · {{ lowStockProducts.length }} {{ isSw ? 'chache' : 'low' }} · {{ outOfStockProducts.length }} {{ isSw ? 'zimeisha' : 'out' }}
            </span>
          </div>
          <div v-if="watchlistProducts.length === 0" class="empty-mini">
            {{ isSw ? 'Vinywaji vyote vina stoo ya kutosha.' : 'All drinks are well stocked.' }}
          </div>
          <div v-else class="watch-list">
            <div v-for="p in watchlistProducts" :key="p.id" class="watch-row">
              <span class="watch-name">{{ p.name }}</span>
              <span class="watch-pill" :class="Number(p.stock_quantity) <= 0 ? 'out' : 'low'">
                {{ Number(p.stock_quantity) <= 0 ? (isSw ? 'Imeisha' : 'Out') : `${Number(p.stock_quantity).toFixed(0)} ${isSw ? 'imebaki' : 'left'}` }}
              </span>
            </div>
          </div>
        </section>
      </div>

      <!-- Recent Orders -->
      <section class="panel-card">
        <div class="panel-head row-between">
          <div>
            <h2>{{ isSw ? 'Oda za Hivi Karibuni Leo' : 'Recent Orders Today' }}</h2>
            <span class="panel-sub">{{ isSw ? 'Miamala ya hivi karibuni kwenye baa' : 'Latest completed beverage sales' }}</span>
          </div>
          <button type="button" class="btn-link" @click="store.activeModal = 'sales_records'">
            <span>{{ isSw ? 'Tazama Zote' : 'View All' }}</span>
            <ArrowRight :size="14" />
          </button>
        </div>

        <div v-if="recentOrders.length === 0" class="empty-mini">
          {{ isSw ? 'Hakuna mauzo yaliyorekodiwa leo bado.' : 'No orders recorded yet today.' }}
        </div>
        <div v-else class="orders-list">
          <div v-for="ord in recentOrders" :key="ord.id" class="order-row">
            <div class="order-left">
              <strong>#{{ ord.order_number }}</strong>
              <span>{{ formatTime(ord.created_at) }} · {{ ord.cashier_name || 'Staff' }}</span>
            </div>
            <strong class="order-amt">TSH {{ formatMoney(ord.final_amount) }}</strong>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dash-page {
  --d-bg: #0b1120;
  --d-surface: #111827;
  --d-elevated: #1e293b;
  --d-border: rgba(148, 163, 184, 0.16);
  --d-border-strong: rgba(148, 163, 184, 0.28);
  --d-text: #f8fafc;
  --d-text-sec: #cbd5e1;
  --d-muted: #94a3b8;
  --d-accent: #6366f1;
  --d-accent-hover: #4f46e5;
  --d-accent-soft: rgba(99, 102, 241, 0.16);
  --d-positive: #34d399;
  --d-danger: #fb7185;
  --d-shadow: 0 2px 10px rgba(0, 0, 0, 0.24);

  min-height: 100vh;
  background: var(--d-bg);
  color: var(--d-text);
  padding: 24px 28px 64px;
}

.dash-page[data-theme="light"] {
  --d-bg: #f8fafc;
  --d-surface: #ffffff;
  --d-elevated: #f8fafc;
  --d-border: #e2e8f0;
  --d-border-strong: #cbd5e1;
  --d-text: #0f172a;
  --d-text-sec: #334155;
  --d-muted: #64748b;
  --d-accent: #4f46e5;
  --d-accent-hover: #4338ca;
  --d-accent-soft: #eef2ff;
  --d-positive: #059669;
  --d-danger: #dc2626;
  --d-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.03);
}

.dash-inner {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dash-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.dash-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--d-accent);
  margin-bottom: 6px;
}

.dash-header h1 {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 800;
  color: var(--d-text);
  letter-spacing: -0.02em;
}

.dash-date {
  margin: 4px 0 0;
  font-size: 0.84rem;
  color: var(--d-muted);
}

.dash-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-ghost,
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  border-radius: 11px;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.16s ease;
}

.btn-ghost {
  background: var(--d-surface);
  border: 1px solid var(--d-border-strong);
  color: var(--d-text-sec);
}

.btn-ghost:hover {
  border-color: var(--d-accent);
  color: var(--d-text);
}

.btn-primary {
  background: var(--d-accent);
  border: 1px solid var(--d-accent);
  color: #ffffff;
}

.btn-primary:hover {
  background: var(--d-accent-hover);
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.kpi-card {
  background: var(--d-surface);
  border: 1px solid var(--d-border);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  cursor: pointer;
  box-shadow: var(--d-shadow);
  transition: transform 0.16s ease, border-color 0.16s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  border-color: var(--d-accent);
}

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.kpi-label {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--d-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kpi-icon-box {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--d-accent-soft);
  color: var(--d-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-card.tone-alert .kpi-icon-box {
  background: rgba(239, 68, 68, 0.12);
  color: var(--d-danger);
}

.kpi-card.tone-positive .kpi-icon-box {
  background: rgba(16, 185, 129, 0.14);
  color: var(--d-positive);
}

.kpi-value {
  font-size: 1.32rem;
  font-weight: 800;
  color: var(--d-text);
  font-variant-numeric: tabular-nums;
}

.kpi-sub {
  font-size: 0.78rem;
  color: var(--d-muted);
}

.panel-card {
  background: var(--d-surface);
  border: 1px solid var(--d-border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--d-shadow);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-head h2 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 800;
  color: var(--d-text);
}

.panel-sub {
  display: block;
  font-size: 0.78rem;
  color: var(--d-muted);
  margin-top: 2px;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.btn-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  color: var(--d-accent);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.action-tile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 13px;
  background: var(--d-elevated);
  border: 1px solid var(--d-border);
  text-align: left;
  cursor: pointer;
  transition: all 0.16s ease;
}

.action-tile:hover {
  border-color: var(--d-accent);
  transform: translateY(-1px);
}

.action-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--d-accent-soft);
  color: var(--d-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-copy strong {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--d-text);
}

.action-copy span {
  font-size: 0.75rem;
  color: var(--d-muted);
}

.action-arrow {
  color: var(--d-muted);
  flex-shrink: 0;
}

.dash-two-col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.mix-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mix-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--d-text-sec);
  margin-bottom: 6px;
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
}

.watch-list,
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.watch-row,
.order-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--d-elevated);
  border: 1px solid var(--d-border);
}

.watch-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--d-text);
}

.watch-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
}

.watch-pill.low {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
}

.watch-pill.out {
  background: rgba(239, 68, 68, 0.14);
  color: var(--d-danger);
}

.order-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-left strong {
  font-size: 0.85rem;
  color: var(--d-text);
}

.order-left span {
  font-size: 0.74rem;
  color: var(--d-muted);
}

.order-amt {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--d-text);
  font-variant-numeric: tabular-nums;
}

.empty-mini {
  padding: 20px;
  text-align: center;
  font-size: 0.84rem;
  color: var(--d-muted);
  border: 1px dashed var(--d-border-strong);
  border-radius: 12px;
}

@media (max-width: 1024px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .actions-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dash-two-col {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .dash-page {
    padding: 16px 14px 56px;
  }
  .kpi-grid,
  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>

