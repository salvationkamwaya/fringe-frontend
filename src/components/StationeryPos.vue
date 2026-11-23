<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import api from '../api'
import { 
  Search, Barcode, ShoppingCart, Trash2, Plus, Minus, 
  Package, Layers, UserCheck, AlertTriangle, CheckCircle2,
  Sparkles, CreditCard, ChevronRight, X, UserPlus, BookOpen, ShieldCheck, Boxes, Receipt,
  PauseCircle, PlayCircle, Clock, FileText, RotateCcw, DollarSign, Truck, FileSpreadsheet, Building
} from 'lucide-vue-next'

const products = ref([])
const categories = ref([])
const customers = ref([])
const searchQuery = ref('')
const selectedCategory = ref(null)
const barcodeInput = ref('')
const loading = ref(false)

const showCustomerPicker = ref(false)
const customerSearch = ref('')

// Hold Sale Drawer & Notes Modal
const showHeldSalesDrawer = ref(false)
const showHoldNoteModal = ref(false)
const holdCustomNote = ref('')

// Selling mode toggle (Retail vs Wholesale)
const setSellingMode = (mode) => {
  store.stationeryMode = mode
  if (mode === 'WHOLESALE') {
    store.showToast(
      store.locale === 'sw'
        ? 'Hali ya Jumla (B2B) Imewashwa. Punguzo la 15% limetumika.'
        : 'Wholesale B2B Mode Active. 15% wholesale tier pricing applied. Registered customer required.',
      'info'
    )
  } else {
    store.showToast(
      store.locale === 'sw'
        ? 'Hali ya Rejareja Imewashwa. Bei za kawaida za rejareja zinatumika.'
        : 'Retail Walk-in Mode Active. Standard retail counter pricing applied.',
      'info'
    )
  }
}

// Safe numeric pricing & formatting helpers (prevents DecimalField string .toFixed errors)
const formatTsh = (val) => {
  const num = Number(val)
  if (!Number.isFinite(num)) return '0'
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const getRetailPackPrice = (prod) => {
  const p = parseFloat(prod?.selling_price)
  return Number.isFinite(p) ? p : 0
}

const getPackPrice = (prod) => {
  const base = getRetailPackPrice(prod)
  return store.stationeryMode === 'WHOLESALE' ? base * 0.85 : base
}

const getWholesaleSavings = (prod) => {
  return Math.max(0, getRetailPackPrice(prod) - getPackPrice(prod))
}

const getRetailSinglePrice = (prod) => {
  const split = parseFloat(prod?.split_unit_price)
  if (Number.isFinite(split) && split > 0) return split
  const ratio = Math.max(1, parseInt(prod?.pack_unit_ratio || 1, 10))
  return getRetailPackPrice(prod) / ratio
}

const getSinglePrice = (prod) => {
  const base = getRetailSinglePrice(prod)
  return store.stationeryMode === 'WHOLESALE' ? base * 0.85 : base
}

// Fetch catalog and categories for Stationery
const fetchCatalog = async () => {
  if (!store.isAuthenticated) return
  loading.value = true
  try {
    const [prodRes, catRes] = await Promise.all([
      api.get('/catalog/products/'),
      api.get('/catalog/categories/')
    ])
    products.value = prodRes.data
    categories.value = catRes.data
  } catch (err) {
    store.showToast('Failed to load stationery catalog.', 'error')
  } finally {
    loading.value = false
  }
}

// Fetch registered customers
const fetchCustomers = async () => {
  if (!store.isAuthenticated) return
  try {
    const res = await api.get('/pos/customers/')
    customers.value = res.data
  } catch (err) {
    // Non-fatal
  }
}

onMounted(() => {
  if (store.isAuthenticated) {
    fetchCatalog()
    fetchCustomers()
  }
})

watch(() => store.isAuthenticated, (auth) => {
  if (auth) {
    fetchCatalog()
    fetchCustomers()
  }
})

// Filtered products
const filteredProducts = computed(() => {
  return products.value.filter(item => {
    const matchesSearch = !searchQuery.value || 
      item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (item.barcode && item.barcode.includes(searchQuery.value))

    const matchesCategory = !selectedCategory.value || item.category === selectedCategory.value

    return matchesSearch && matchesCategory
  })
})

// Add product to cart with role enforcement & wholesale pricing
const handleAddToCart = (prod, qty = 1, isPack = true) => {
  if (!store.canRecordSales) {
    store.showToast('Sales recording is strictly reserved for frontline Stationery Cashiers. Managers and Owners perform oversight and reporting only.', 'warning')
    return
  }

  // Calculate price (Wholesale 15% discount if wholesale mode is active)
  let customPrice = null
  if (store.stationeryMode === 'WHOLESALE') {
    if (isPack) {
      customPrice = parseFloat((parseFloat(prod.selling_price) * 0.85).toFixed(2))
    } else if (prod.allow_split_sale) {
      const baseSplit = prod.split_unit_price || (prod.selling_price / prod.pack_unit_ratio)
      customPrice = parseFloat((parseFloat(baseSplit) * 0.85).toFixed(2))
    }
  }

  store.addToCart(prod, qty, isPack, customPrice)
}

// Hold sale handlers
const openHoldDialog = () => {
  if (store.cart.length === 0) {
    store.showToast('Order ticket is empty. Nothing to suspend.', 'warning')
    return
  }
  holdCustomNote.value = store.selectedCustomer ? `Order for ${store.selectedCustomer.name}` : ''
  showHoldNoteModal.value = true
}

const confirmHoldSale = () => {
  store.holdCurrentSale(holdCustomNote.value)
  showHoldNoteModal.value = false
  holdCustomNote.value = ''
}

const resumeSale = (heldId) => {
  store.resumeHeldSale(heldId)
  showHeldSalesDrawer.value = false
}

const discardSale = (heldId) => {
  store.discardHeldSale(heldId)
}

// Save current cart as quotation
const saveAsQuotation = () => {
  if (store.cart.length === 0) {
    store.showToast('Add items to cart before creating a quotation.', 'warning')
    return
  }
  store.activeModal = 'quotations'
}

// Barcode scan handler (Enter key on barcode input)
const handleBarcodeScan = () => {
  if (!store.canRecordSales) {
    store.showToast('Sales recording is strictly reserved for frontline Stationery Cashiers. Managers and Owners perform oversight and reporting only.', 'warning')
    barcodeInput.value = ''
    return
  }

  const code = barcodeInput.value.trim()
  if (!code) return

  const found = products.value.find(p => 
    (p.barcode && p.barcode === code) || 
    (p.sku && p.sku.toLowerCase() === code.toLowerCase())
  )

  if (found) {
    handleAddToCart(found, 1, true)
    store.showToast(`Scanned: ${found.name}`, 'success')
    barcodeInput.value = ''
  } else {
    store.showToast(`No product matching barcode "${code}"`, 'error')
  }
}

// Customer selection
const filteredCustomers = computed(() => {
  if (!customerSearch.value) return customers.value
  const q = customerSearch.value.toLowerCase()
  return customers.value.filter(c => 
    c.name.toLowerCase().includes(q) || 
    (c.phone && c.phone.includes(q)) ||
    (c.contact_person && c.contact_person.toLowerCase().includes(q))
  )
})

const selectCustomer = (cust) => {
  store.selectedCustomer = cust
  showCustomerPicker.value = false
  store.showToast(`Customer attached: ${cust.name}`, 'info')
}

const removeCustomer = () => {
  store.selectedCustomer = null
  store.showToast('Customer removed from order ticket.', 'info')
}

// Proceed to payment
const proceedToCheckout = () => {
  if (!store.canRecordSales) {
    store.showToast('Sales recording is strictly reserved for frontline Stationery Cashiers. Managers and Owners perform oversight and reporting only.', 'warning')
    return
  }

  if (store.cart.length === 0) return

  // F5 Wholesale mode requires selecting a registered customer
  if (store.stationeryMode === 'WHOLESALE' && !store.selectedCustomer) {
    store.showToast('Wholesale orders require selecting a registered customer (school, business, or shop).', 'warning')
    showCustomerPicker.value = true
    return
  }

  if (!store.activeShift) {
    store.showToast('Please open a register shift before processing sales.', 'warning')
    store.activeModal = 'shift'
    return
  }
  store.activeModal = 'payment'
}
</script>

<template>
  <div class="stationery-workspace" :data-theme="store.theme">
    <!-- LEFT PANEL: Catalog, Search & Barcode -->
    <section class="catalog-section">
      <!-- SELLING MODE TOGGLE & QUICK ACTIONS TOOLBAR -->
      <div class="pos-top-toolbar">
        <div class="selling-mode-toggle">
          <button 
            class="mode-btn" 
            :class="{ active: store.stationeryMode === 'RETAIL' }"
            @click="setSellingMode('RETAIL')"
          >
            <ShoppingCart :size="15" />
            <span>{{ t('pos.walkInRetail') }}</span>
          </button>
          <button 
            class="mode-btn wholesale-btn" 
            :class="{ active: store.stationeryMode === 'WHOLESALE' }"
            @click="setSellingMode('WHOLESALE')"
          >
            <Building :size="15" />
            <span>{{ t('pos.wholesaleB2b') }}</span>
          </button>
        </div>

        <div class="quick-nav-actions">
          <button class="btn-quick-nav" @click="store.activeModal = null" :title="t('nav.dashboard')">
            <BookOpen :size="14" />
            <span>{{ t('nav.dashboard') }}</span>
          </button>
          <button class="btn-quick-nav" @click="store.activeModal = 'quotations'" :title="t('nav.quotations')">
            <FileText :size="14" />
            <span>{{ t('nav.quotations') }}</span>
          </button>
          <button class="btn-quick-nav" @click="store.activeModal = 'stationery_returns'" :title="t('nav.returns')">
            <RotateCcw :size="14" />
            <span>{{ t('nav.returns') }}</span>
          </button>
          <button class="btn-quick-nav" @click="store.activeModal = 'expenses'" :title="t('nav.expenses')">
            <DollarSign :size="14" />
            <span>{{ t('nav.expenses') }}</span>
          </button>
          <button class="btn-quick-nav" @click="store.activeModal = 'barcode_labels'" :title="t('nav.barcodeLabels')">
            <Barcode :size="14" />
            <span>{{ t('nav.barcodeLabels') }}</span>
          </button>
          <button class="btn-quick-nav" @click="store.activeModal = 'product_import'" :title="t('pos.import')">
            <FileSpreadsheet :size="14" />
            <span>{{ t('pos.import') }}</span>
          </button>
          <button class="btn-quick-nav" @click="store.activeModal = 'wholesale_docs'" :title="t('nav.wholesaleInvoices')">
            <Truck :size="14" />
            <span>{{ t('nav.wholesaleInvoices') }}</span>
          </button>
        </div>
      </div>

      <!-- WHOLESALE MODE ALERT BANNER -->
      <div v-if="store.stationeryMode === 'WHOLESALE'" class="wholesale-banner">
        <Building :size="18" class="text-blue" />
        <div class="ws-banner-text">
          <strong>{{ t('pos.wholesaleActiveTitle') }}</strong> {{ t('pos.wholesaleActiveDesc') }}
          <span v-if="!store.selectedCustomer" class="ws-alert-highlight">
            {{ t('pos.wholesaleAttachWarn') }}
          </span>
          <span v-else>
            {{ t('pos.wholesaleInvoicedTo') }} <strong>{{ store.selectedCustomer.name }}</strong>.
          </span>
        </div>
      </div>

      <!-- Search & Barcode Header Bar -->
      <div class="search-toolbar">
        <!-- Live Search Input -->
        <div class="search-input-box">
          <Search :size="18" class="input-icon" />
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="t('pos.searchPlaceholder')" 
            class="text-input"
          />
          <button v-if="searchQuery" class="clear-input-btn" @click="searchQuery = ''">
            <X :size="16" />
          </button>
        </div>

        <!-- Barcode Fast Scanner Input -->
        <div class="barcode-input-box">
          <Barcode :size="18" class="input-icon barcode-icon" />
          <input 
            v-model="barcodeInput" 
            type="text" 
            :placeholder="t('pos.barcodePlaceholder')" 
            class="text-input barcode-input"
            @keyup.enter="handleBarcodeScan"
          />
        </div>
      </div>

      <!-- Categories Filter Strip -->
      <div class="categories-strip">
        <button 
          class="cat-chip" 
          :class="{ active: selectedCategory === null }"
          @click="selectedCategory = null"
        >
          <BookOpen :size="14" />
          <span>{{ t('pos.allProducts') }} ({{ products.length }})</span>
        </button>
        <button 
          v-for="cat in categories" 
          :key="cat.id"
          class="cat-chip"
          :class="{ active: selectedCategory === cat.id }"
          @click="selectedCategory = cat.id"
        >
          <span>{{ cat.name }}</span>
        </button>
      </div>

      <!-- Products Grid -->
      <div class="products-container">
        <div v-if="loading" class="state-placeholder">
          <div class="spinner"></div>
          <p>{{ t('pos.loadingCatalog') }}</p>
        </div>

        <div v-else-if="filteredProducts.length === 0" class="state-placeholder">
          <div class="empty-icon-wrap">
            <Package :size="28" />
          </div>
          <h3>{{ t('pos.noProducts') }}</h3>
          <p>{{ t('pos.noProductsSub') }}</p>
          <button
            v-if="store.isOwner || store.isStationeryManager"
            class="btn-empty-cta"
            @click="store.activeModal = 'catalog_management'"
          >
            <Plus :size="15" />
            <span>{{ t('dash.registerProduct') }}</span>
          </button>
        </div>

        <div v-else class="products-grid">
          <div 
            v-for="prod in filteredProducts" 
            :key="prod.id"
            class="product-card"
            :class="{
              'card-pack': prod.is_pack,
              'card-low-stock': prod.is_low_stock,
              'card-wholesale': store.stationeryMode === 'WHOLESALE'
            }"
          >
            <!-- Top Row: Product Title, SKU & Compact Badges -->
            <div class="pcard-head">
              <div class="pcard-title-wrap">
                <h4 class="pcard-name" :title="prod.name">{{ prod.name }}</h4>
                <div class="pcard-meta-row">
                  <span v-if="prod.sku" class="pcard-sku">{{ prod.sku }}</span>
                  <span v-if="prod.is_pack" class="pcard-pack-pill">
                    <Package :size="11" />
                    <span>{{ prod.pack_name || 'Pack' }} · {{ prod.pack_unit_ratio }} {{ prod.unit_name || 'pcs' }}</span>
                  </span>
                </div>
              </div>
              <span v-if="prod.is_low_stock" class="pcard-low-badge" title="Low stock threshold reached">
                {{ store.locale === 'sw' ? 'Chache' : 'Low' }}: {{ parseFloat(prod.stock_quantity || 0).toFixed(0) }}
              </span>
            </div>

            <!-- Pricing Panel -->
            <div class="pcard-pricing" :class="{ 'is-wholesale': store.stationeryMode === 'WHOLESALE' }">
              <!-- Wholesale Mode Pricing -->
              <template v-if="store.stationeryMode === 'WHOLESALE'">
                <div class="ws-header-row">
                  <span class="ws-discount-pill">
                    {{ store.locale === 'sw' ? 'JUMLA -15%' : 'WHOLESALE -15%' }}
                  </span>
                  <span class="ws-save-text">
                    {{ store.locale === 'sw' ? 'Okoa' : 'Save' }} TSH {{ formatTsh(getWholesaleSavings(prod)) }}
                  </span>
                </div>

                <div class="pcard-main-price-row">
                  <div class="pcard-price-stack">
                    <span class="pcard-price-main">TSH {{ formatTsh(getPackPrice(prod)) }}</span>
                    <span class="pcard-price-unit">/ {{ prod.is_pack ? (prod.pack_name || 'Pack') : (prod.unit_name || 'Unit') }}</span>
                  </div>
                  <span class="pcard-price-strike">TSH {{ formatTsh(getRetailPackPrice(prod)) }}</span>
                </div>

                <div v-if="prod.is_pack && prod.allow_split_sale" class="pcard-split-row">
                  <span class="pcard-split-label">
                    {{ store.locale === 'sw' ? 'Kipande 1' : 'Single' }} {{ prod.unit_name || 'Piece' }}
                  </span>
                  <div class="pcard-split-prices">
                    <span class="pcard-split-val">TSH {{ formatTsh(getSinglePrice(prod)) }}</span>
                    <span class="pcard-split-strike">TSH {{ formatTsh(getRetailSinglePrice(prod)) }}</span>
                  </div>
                </div>
              </template>

              <!-- Retail Mode Pricing -->
              <template v-else>
                <div class="pcard-retail-row">
                  <span class="pcard-retail-label">
                    {{ prod.is_pack ? (prod.pack_name || 'Pack') : (store.locale === 'sw' ? 'Bei' : 'Price') }}
                  </span>
                  <span class="pcard-price-main">TSH {{ formatTsh(getPackPrice(prod)) }}</span>
                </div>

                <div v-if="prod.is_pack && prod.allow_split_sale" class="pcard-split-row">
                  <span class="pcard-split-label">
                    {{ store.locale === 'sw' ? 'Kipande 1' : 'Single' }} {{ prod.unit_name || 'Piece' }}
                  </span>
                  <span class="pcard-split-val">TSH {{ formatTsh(getSinglePrice(prod)) }}</span>
                </div>
              </template>
            </div>

            <!-- Stock Level Bar -->
            <div class="pcard-stock-row">
              <div class="pcard-meter-track">
                <div 
                  class="pcard-meter-fill" 
                  :style="{ width: `${Math.min(100, (parseFloat(prod.stock_quantity || 0) / Math.max(1, parseFloat(prod.reorder_threshold || 5) * 3)) * 100)}%` }"
                  :class="prod.is_low_stock ? 'fill-low' : 'fill-ok'"
                ></div>
              </div>
              <span class="pcard-stock-label" :class="{ 'is-low': prod.is_low_stock }">
                {{ parseFloat(prod.stock_quantity || 0).toFixed(0) }} {{ prod.is_pack ? (prod.pack_name || 'Pack') + 's' : (store.locale === 'sw' ? 'vipande' : 'units') }}
              </span>
            </div>

            <!-- Action Buttons -->
            <div class="pcard-actions">
              <template v-if="prod.is_pack && prod.allow_split_sale">
                <button 
                  class="btn-pcard btn-pcard-primary" 
                  @click="handleAddToCart(prod, 1, true)"
                  :title="store.locale === 'sw' ? 'Ongeza pakiti 1 kamili' : 'Add 1 full pack to cart'"
                >
                  <Package :size="14" />
                  <span>{{ store.locale === 'sw' ? 'Pakiti' : 'Full' }} {{ prod.pack_name || 'Pack' }}</span>
                </button>
                <button 
                  class="btn-pcard btn-pcard-secondary" 
                  @click="handleAddToCart(prod, 1, false)"
                  :title="store.locale === 'sw' ? 'Uza kipande kimoja' : 'Sell individual piece from this pack'"
                >
                  <Layers :size="14" />
                  <span>1 {{ prod.unit_name || 'Piece' }}</span>
                </button>
              </template>

              <template v-else>
                <button 
                  class="btn-pcard btn-pcard-primary" 
                  @click="handleAddToCart(prod, 1, true)"
                >
                  <Plus :size="15" />
                  <span>{{ t('pos.addToTicket') }}</span>
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- RIGHT PANEL: Current Order Ticket -->
    <aside class="ticket-section">
      <!-- Ticket Header -->
      <div class="ticket-header">
        <div class="header-title-box">
          <ShoppingCart :size="20" class="header-icon" />
          <div>
            <h3>{{ t('pos.currentOrder') }}</h3>
            <span class="ticket-subtitle">{{ t('pos.registerSub') }}</span>
          </div>
        </div>

        <div class="ticket-header-actions">
          <!-- Held Sales Drawer Button -->
          <button 
            class="btn-ticket-nav"
            :class="{ 'has-held-badge': store.currentUnitHeldSales.length > 0 }"
            :title="t('pos.modal.heldTitle')"
            @click="showHeldSalesDrawer = true"
          >
            <Clock :size="13" />
            <span>{{ t('pos.held') }} ({{ store.currentUnitHeldSales.length }})</span>
          </button>

          <!-- Hold Current Sale Button -->
          <button 
            v-if="store.cart.length > 0 && store.canRecordSales"
            class="btn-ticket-nav btn-hold"
            :title="t('pos.modal.holdTitle')"
            @click="openHoldDialog"
          >
            <PauseCircle :size="13" />
            <span>{{ t('pos.hold') }}</span>
          </button>

          <!-- Create Quotation from Cart -->
          <button 
            v-if="store.cart.length > 0"
            class="btn-ticket-nav btn-quote"
            :title="t('nav.quotations')"
            @click="saveAsQuotation"
          >
            <FileText :size="13" />
            <span>{{ t('pos.quote') }}</span>
          </button>

          <button 
            class="btn-quick-sales"
            :title="store.isManagerOrOwner ? t('nav.salesRecords') : t('nav.mySales')"
            @click="store.activeModal = 'sales_records'"
          >
            <Receipt :size="14" />
            <span>{{ store.isManagerOrOwner ? t('pos.sales') : t('pos.mySales') }}</span>
          </button>

          <button 
            v-if="store.cart.length > 0" 
            class="btn-clear" 
            :title="t('common.reset')"
            @click="store.clearCart"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </div>

      <!-- Role Oversight / Stock Clerk Banner -->
      <div v-if="!store.canRecordSales" class="management-oversight-banner" :class="{ 'clerk-banner': store.isStockClerk }">
        <Boxes v-if="store.isStockClerk" :size="20" class="oversight-icon" />
        <ShieldCheck v-else :size="20" class="oversight-icon" />
        <div class="oversight-text">
          <div class="oversight-title">{{ store.isStockClerk ? t('pos.clerkTitle') : t('pos.oversightTitle') }}</div>
          <div class="oversight-desc">
            {{ t('pos.signedInAs') }} <strong>@{{ store.user?.username }} ({{ store.user?.role?.toUpperCase() }})</strong>.
            <span v-if="store.isStockClerk">
              {{ t('pos.clerkDesc') }}
            </span>
            <span v-else>
              {{ t('pos.oversightDesc') }}
            </span>
          </div>
          <button v-if="store.isStockClerk" class="btn-banner-action" @click="store.activeModal = 'stock_inventory'">
            <Boxes :size="14" />
            <span>{{ t('pos.openStockControl') }}</span>
          </button>
        </div>
      </div>

      <!-- Customer Credit Selection Bar -->
      <div class="customer-credit-bar">
        <!-- Selected Customer Card -->
        <div v-if="store.selectedCustomer" class="selected-customer-card">
          <div class="customer-avatar">
            <UserCheck :size="18" />
          </div>
          <div class="customer-meta">
            <div class="customer-name-row">
              <strong class="cust-name">{{ store.selectedCustomer.name }}</strong>
              <button class="btn-remove-cust" @click="removeCustomer" title="Remove customer">
                <X :size="14" />
              </button>
            </div>
            <div class="customer-financials">
              <span class="owed-text">Owed: TSH {{ parseFloat(store.selectedCustomer.current_balance).toFixed(2) }}</span>
              <span class="avail-text">Avail: TSH {{ parseFloat(store.selectedCustomer.available_credit).toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- Button to Select Registered Customer -->
        <button 
          v-else 
          class="btn-attach-customer"
          @click="showCustomerPicker = true"
        >
          <UserPlus :size="16" />
          <span>{{ t('pos.attachCustomer') }}</span>
        </button>
      </div>

      <!-- Cart Items List -->
      <div class="ticket-items-scroll">
        <div v-if="store.cart.length === 0" class="ticket-empty">
          <ShoppingCart :size="48" class="empty-cart-icon" />
          <h4>{{ t('pos.ticketEmpty') }}</h4>
          <p>{{ t('pos.ticketEmptySub') }}</p>
        </div>

        <div v-else class="items-list">
          <div 
            v-for="(item, idx) in store.cart" 
            :key="item.product.id + '-' + (item.is_pack_sale ? 'pack' : 'unit')"
            class="ticket-row"
          >
            <!-- Item Details -->
            <div class="row-info">
              <div class="row-title-line">
                <span class="row-title">{{ item.product.name }}</span>
                <span 
                  class="sale-type-pill" 
                  :class="item.is_pack_sale ? 'pill-pack' : 'pill-unit'"
                >
                  {{ item.is_pack_sale ? (item.product.pack_name || 'Pack') : (item.product.unit_name || 'Piece') }}
                </span>
              </div>
              <div class="row-price">TSH {{ parseFloat(item.unit_price).toFixed(2) }} each</div>
            </div>

            <!-- Quantity Stepper -->
            <div class="stepper">
              <button class="step-btn" @click="store.updateCartQuantity(idx, -1)">
                <Minus :size="14" />
              </button>
              <span class="step-value">{{ item.quantity }}</span>
              <button class="step-btn" @click="store.updateCartQuantity(idx, 1)">
                <Plus :size="14" />
              </button>
            </div>

            <!-- Row Subtotal -->
            <div class="row-subtotal">
              <span>TSH {{ parseFloat(item.subtotal).toFixed(2) }}</span>
            </div>

            <!-- Remove Button -->
            <button class="btn-remove-row" @click="store.removeFromCart(idx)" title="Remove item">
              <X :size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- Ticket Footer: Totals & Checkout -->
      <div class="ticket-footer">
        <div class="totals-breakdown">
          <div class="summary-line">
            <span>{{ t('pos.itemsCount') }}:</span>
            <span>{{ store.cartItemCount }}</span>
          </div>
          <div class="summary-line grand-total-line">
            <span>{{ t('pos.totalPayable') }}:</span>
            <span class="grand-total-amount">TSH {{ store.cartSubtotal.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Checkout Action Button -->
        <button 
          class="btn-checkout" 
          :disabled="store.cart.length === 0 || !store.canRecordSales"
          :title="!store.canRecordSales ? 'Frontline Stationery Cashier role required to record sales' : t('pos.proceedPayment')"
          @click="proceedToCheckout"
        >
          <CreditCard :size="20" />
          <span>{{ t('pos.proceedPayment') }}</span>
          <ChevronRight :size="20" />
        </button>
      </div>
    </aside>

    <!-- CUSTOMER SELECTOR MODAL -->
    <div v-if="showCustomerPicker" class="modal-backdrop" @click.self="showCustomerPicker = false">
      <div class="customer-picker-dialog">
        <div class="picker-header">
          <div class="picker-title-box">
            <UserCheck :size="20" />
            <h3>{{ t('pos.modal.selectCustomer') }}</h3>
          </div>
          <button class="btn-close-modal" @click="showCustomerPicker = false">
            <X :size="18" />
          </button>
        </div>

        <div class="picker-search-bar">
          <Search :size="16" class="search-icon" />
          <input 
            v-model="customerSearch" 
            type="text" 
            :placeholder="t('pos.modal.searchCustomer')" 
            class="picker-search-input"
          />
        </div>

        <div class="picker-customers-list">
          <div 
            v-for="c in filteredCustomers" 
            :key="c.id" 
            class="picker-cust-row"
            @click="selectCustomer(c)"
          >
            <div class="cust-main">
              <strong>{{ c.name }}</strong>
              <span class="cust-contact">{{ c.contact_person }} • {{ c.phone }}</span>
            </div>
            <div class="cust-limits">
              <span class="badge-limit">{{ t('pos.limit') }}: TSH {{ parseFloat(c.credit_limit).toFixed(2) }}</span>
              <span class="badge-balance" :class="{ 'has-debt': parseFloat(c.current_balance) > 0 }">
                {{ t('pos.owed') }}: TSH {{ parseFloat(c.current_balance).toFixed(2) }}
              </span>
            </div>
          </div>

          <div v-if="filteredCustomers.length === 0" class="picker-empty">
            <p>{{ t('pos.modal.noCustomers') }} "{{ customerSearch }}".</p>
          </div>
        </div>
      </div>
    </div>

    <!-- HOLD NOTE MODAL -->
    <div v-if="showHoldNoteModal" class="modal-backdrop" @click.self="showHoldNoteModal = false">
      <div class="hold-dialog-card">
        <div class="hold-dialog-header">
          <div class="dialog-title">
            <PauseCircle :size="20" />
            <h3>{{ t('pos.modal.holdTitle') }}</h3>
          </div>
          <button class="btn-close-modal" @click="showHoldNoteModal = false">
            <X :size="18" />
          </button>
        </div>
        <div class="hold-dialog-body">
          <p class="dialog-desc">{{ t('pos.modal.holdDesc') }}</p>
          <label class="field-label">{{ t('pos.modal.holdNoteLabel') }}</label>
          <input 
            v-model="holdCustomNote" 
            type="text" 
            :placeholder="t('pos.modal.holdNotePlaceholder')" 
            class="styled-hold-input"
            @keyup.enter="confirmHoldSale"
          />
        </div>
        <div class="hold-dialog-footer">
          <button class="btn-cancel-modal" @click="showHoldNoteModal = false">{{ t('common.cancel') }}</button>
          <button class="btn-confirm-hold" @click="confirmHoldSale">
            <PauseCircle :size="16" />
            <span>{{ t('pos.modal.confirmHold') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- HELD TICKETS DRAWER / MODAL -->
    <div v-if="showHeldSalesDrawer" class="modal-backdrop" @click.self="showHeldSalesDrawer = false">
      <div class="held-tickets-modal">
        <div class="held-header">
          <div class="held-title-box">
            <Clock :size="20" />
            <div>
              <h3>{{ t('pos.modal.heldTitle') }}</h3>
              <p class="subtitle">{{ store.currentUnitHeldSales.length }} {{ t('pos.modal.heldSub') }}</p>
            </div>
          </div>
          <button class="btn-close-modal" @click="showHeldSalesDrawer = false">
            <X :size="18" />
          </button>
        </div>

        <div class="held-body-scroll">
          <div v-if="store.currentUnitHeldSales.length === 0" class="held-empty-state">
            <Clock :size="40" class="text-muted" />
            <h4>{{ t('pos.modal.noHeldTitle') }}</h4>
            <p>{{ t('pos.modal.noHeldDesc') }}</p>
          </div>

          <div v-else class="held-cards-grid">
            <div v-for="s in store.currentUnitHeldSales" :key="s.id" class="held-ticket-card">
              <div class="card-top-row">
                <span class="held-id">{{ s.id }}</span>
                <span class="held-time">{{ new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
              </div>

              <div class="held-note-box">
                <strong class="note-text">{{ s.note }}</strong>
                <span v-if="s.customer" class="cust-tag">{{ s.customer.name }}</span>
              </div>

              <div class="held-items-preview">
                <span class="item-count">{{ s.itemCount }} {{ t('pos.modal.itemsLabel') }}</span>
                <span class="items-summary-text">
                  {{ s.items.map(i => `${i.quantity}x ${i.product.name}`).slice(0, 3).join(', ') }}
                  <template v-if="s.items.length > 3">...</template>
                </span>
              </div>

              <div class="held-total-row">
                <span class="total-lbl">{{ t('pos.totalPayable') }}:</span>
                <span class="total-val">TSH {{ parseFloat(s.total).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
              </div>

              <div class="held-actions">
                <button class="btn-resume-ticket" @click="resumeSale(s.id)">
                  <PlayCircle :size="15" />
                  <span>{{ t('pos.modal.resume') }}</span>
                </button>
                <button class="btn-discard-ticket" @click="discardSale(s.id)" :title="t('pos.modal.discard')">
                  <Trash2 :size="15" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   STATIONERY POS — MINIMALISTIC LIGHT & DARK MODE (FEW COLORS)
   ============================================================ */
.stationery-workspace {
  --p-bg: #0b0f19;
  --p-surface: #111827;
  --p-card: #161f30;
  --p-elevated: #1e293b;
  --p-input: #0f1623;
  --p-border: rgba(255, 255, 255, 0.08);
  --p-border-strong: rgba(255, 255, 255, 0.16);
  --p-text: #f8fafc;
  --p-text-sec: #cbd5e1;
  --p-text-muted: #94a3b8;
  --p-accent: #6366f1;
  --p-accent-hover: #4f46e5;
  --p-accent-soft: rgba(99, 102, 241, 0.15);
  --p-positive: #10b981;
  --p-positive-soft: rgba(16, 185, 129, 0.14);
  --p-danger: #f43f5e;
  --p-danger-soft: rgba(244, 63, 94, 0.14);
  --p-shadow: 0 2px 14px rgba(0, 0, 0, 0.28);

  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  gap: 20px;
  padding: 20px;
  min-height: 100vh;
  background: var(--p-bg);
  color: var(--p-text);
  align-items: start;
}

.stationery-workspace[data-theme="light"] {
  --p-bg: #f6f8fb;
  --p-surface: #ffffff;
  --p-card: #ffffff;
  --p-elevated: #f1f5f9;
  --p-input: #ffffff;
  --p-border: #e2e8f0;
  --p-border-strong: #cbd5e1;
  --p-text: #0f172a;
  --p-text-sec: #334155;
  --p-text-muted: #64748b;
  --p-accent: #4f46e5;
  --p-accent-hover: #4338ca;
  --p-accent-soft: #eef2ff;
  --p-positive: #059669;
  --p-positive-soft: #ecfdf5;
  --p-danger: #e11d48;
  --p-danger-soft: #fff1f2;
  --p-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 6px 20px rgba(15, 23, 42, 0.03);
}

/* LEFT CATALOG SECTION */
.catalog-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.pos-top-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.selling-mode-toggle {
  display: inline-flex;
  padding: 4px;
  border-radius: 12px;
  background: var(--p-surface);
  border: 1px solid var(--p-border);
  gap: 4px;
  box-shadow: var(--p-shadow);
}

.mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border-radius: 9px;
  font-size: 0.82rem;
  font-weight: 600;
  background: transparent;
  color: var(--p-text-muted);
  transition: all 0.16s ease;
}

.mode-btn:hover {
  color: var(--p-text);
}

.mode-btn.active {
  background: var(--p-accent);
  color: #ffffff;
}

.quick-nav-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-quick-nav {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  background: var(--p-surface);
  border: 1px solid var(--p-border);
  color: var(--p-text-sec);
  transition: all 0.16s ease;
}

.btn-quick-nav:hover {
  border-color: var(--p-border-strong);
  color: var(--p-text);
  background: var(--p-elevated);
}

.wholesale-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--p-accent-soft);
  border: 1px solid var(--p-accent);
  color: var(--p-text);
  font-size: 0.84rem;
}

.ws-alert-highlight {
  color: var(--p-danger);
  font-weight: 700;
  margin-left: 4px;
}

/* Search & Barcode Row */
.search-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(200px, 1fr);
  gap: 12px;
}

.search-input-box,
.barcode-input-box {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--p-input);
  border: 1px solid var(--p-border-strong);
  border-radius: 12px;
  padding: 0 12px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.search-input-box:focus-within,
.barcode-input-box:focus-within {
  border-color: var(--p-accent);
  box-shadow: 0 0 0 3px var(--p-accent-soft);
}

.input-icon {
  color: var(--p-text-muted);
  flex-shrink: 0;
}

.text-input {
  width: 100%;
  padding: 11px 10px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--p-text);
  font-size: 0.88rem;
  font-family: inherit;
}

.text-input::placeholder {
  color: var(--p-text-muted);
}

.clear-input-btn {
  background: transparent;
  color: var(--p-text-muted);
  padding: 4px;
}

/* Category Pills */
.categories-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.cat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  background: var(--p-surface);
  border: 1px solid var(--p-border);
  color: var(--p-text-sec);
  white-space: nowrap;
  transition: all 0.16s ease;
}

.cat-chip:hover {
  border-color: var(--p-border-strong);
  color: var(--p-text);
}

.cat-chip.active {
  background: var(--p-accent);
  border-color: var(--p-accent);
  color: #ffffff;
}

/* Products Grid & Empty State */
.products-container {
  flex: 1;
}

.state-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  min-height: 360px;
  max-width: 440px;
  margin: 28px auto;
  padding: 40px 28px;
  border-radius: 20px;
  background: var(--p-surface);
  border: 1px dashed var(--p-border-strong);
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--p-elevated);
  color: var(--p-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.state-placeholder h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--p-text);
}

.state-placeholder p {
  font-size: 0.85rem;
  color: var(--p-text-muted);
  line-height: 1.5;
}

.btn-empty-cta {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 700;
  background: var(--p-accent);
  color: #ffffff;
}

.btn-empty-cta:hover {
  background: var(--p-accent-hover);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.product-card {
  background: var(--p-card);
  border: 1px solid var(--p-border);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--p-shadow);
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.product-card:hover {
  transform: translateY(-2px);
  border-color: var(--p-accent);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.product-card.card-low-stock {
  border-color: rgba(239, 68, 68, 0.35);
}

.product-card.out-of-stock {
  opacity: 0.55;
}

/* Card Header */
.pcard-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.pcard-title-wrap {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pcard-name {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--p-text);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pcard-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.pcard-sku {
  font-size: 0.69rem;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--p-elevated);
  color: var(--p-text-muted);
  border: 1px solid var(--p-border);
}

.pcard-pack-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--p-elevated);
  color: var(--p-text-sec);
  border: 1px solid var(--p-border);
}

.pcard-low-badge {
  flex-shrink: 0;
  font-size: 0.69rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--p-danger-soft);
  color: var(--p-danger);
  white-space: nowrap;
}

/* Pricing Panel */
.pcard-pricing {
  background: var(--p-elevated);
  border: 1px solid var(--p-border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pcard-pricing.is-wholesale {
  background: var(--p-accent-soft);
  border-color: rgba(79, 70, 229, 0.25);
}

.ws-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.ws-discount-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--p-accent);
  color: #ffffff;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.ws-save-text {
  font-size: 0.71rem;
  font-weight: 700;
  color: var(--p-positive);
  font-variant-numeric: tabular-nums;
}

.pcard-main-price-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.pcard-price-stack {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.pcard-price-main {
  font-size: 1.12rem;
  font-weight: 800;
  color: var(--p-text);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.pcard-pricing.is-wholesale .pcard-price-main {
  color: var(--p-accent);
}

.pcard-price-unit {
  font-size: 0.73rem;
  font-weight: 600;
  color: var(--p-text-muted);
}

.pcard-price-strike {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--p-text-muted);
  text-decoration: line-through;
  font-variant-numeric: tabular-nums;
}

.pcard-retail-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.pcard-retail-label {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--p-text-muted);
}

.pcard-split-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--p-border-strong);
}

.pcard-split-label {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--p-text-sec);
}

.pcard-split-prices {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.pcard-split-val {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--p-text);
  font-variant-numeric: tabular-nums;
}

.pcard-split-strike {
  font-size: 0.72rem;
  color: var(--p-text-muted);
  text-decoration: line-through;
  font-variant-numeric: tabular-nums;
}

/* Stock Meter Row */
.pcard-stock-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pcard-meter-track {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: var(--p-elevated);
  overflow: hidden;
}

.pcard-meter-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.25s ease;
}

.pcard-meter-fill.fill-ok {
  background: var(--p-positive);
}

.pcard-meter-fill.fill-low {
  background: var(--p-danger);
}

.pcard-stock-label {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--p-text-muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.pcard-stock-label.is-low {
  color: var(--p-danger);
  font-weight: 700;
}

/* Action Buttons */
.pcard-actions {
  margin-top: auto;
  display: flex;
  gap: 8px;
  padding-top: 2px;
}

.btn-pcard {
  flex: 1;
  padding: 9px 10px;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  transition: all 0.16s ease;
}

.btn-pcard-primary {
  background: var(--p-accent);
  color: #ffffff;
  border: 1px solid transparent;
}

.btn-pcard-primary:hover:not(:disabled) {
  background: var(--p-accent-hover);
}

.btn-pcard-secondary {
  background: var(--p-surface);
  color: var(--p-text);
  border: 1px solid var(--p-border-strong);
}

.btn-pcard-secondary:hover:not(:disabled) {
  border-color: var(--p-accent);
  color: var(--p-accent);
  background: var(--p-accent-soft);
}

/* RIGHT PANEL: ORDER TICKET / CART (Fully Light & Dark Themed!) */
.ticket-section {
  background: var(--p-surface);
  border: 1px solid var(--p-border);
  border-radius: 20px;
  box-shadow: var(--p-shadow);
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 40px);
  position: sticky;
  top: 20px;
  overflow: hidden;
  color: var(--p-text);
}

.ticket-header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--p-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: var(--p-surface);
  flex-wrap: wrap;
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  color: var(--p-accent);
}

.header-title-box h3 {
  font-size: 1rem;
  font-weight: 800;
  color: var(--p-text);
  margin: 0;
}

.ticket-subtitle {
  font-size: 0.75rem;
  color: var(--p-text-muted);
}

.ticket-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-ticket-nav,
.btn-quick-sales,
.btn-clear {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.76rem;
  font-weight: 600;
  background: var(--p-elevated);
  border: 1px solid var(--p-border);
  color: var(--p-text-sec);
  transition: all 0.16s ease;
}

.btn-ticket-nav:hover,
.btn-quick-sales:hover,
.btn-clear:hover {
  border-color: var(--p-border-strong);
  color: var(--p-text);
}

.management-oversight-banner {
  margin: 14px 16px 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--p-elevated);
  border: 1px solid var(--p-border);
  font-size: 0.78rem;
  color: var(--p-text-sec);
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.oversight-icon {
  color: var(--p-accent);
  flex-shrink: 0;
  margin-top: 2px;
}

.oversight-title {
  font-weight: 700;
  color: var(--p-text);
  margin-bottom: 3px;
}

.oversight-desc {
  line-height: 1.45;
  color: var(--p-text-muted);
}

.oversight-desc strong {
  color: var(--p-text);
}

.btn-banner-action {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  background: var(--p-accent);
  color: #ffffff;
}

.customer-credit-bar {
  padding: 14px 16px 0;
}

.btn-attach-customer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 11px;
  font-size: 0.82rem;
  font-weight: 600;
  background: var(--p-elevated);
  border: 1px dashed var(--p-border-strong);
  color: var(--p-text-sec);
  transition: all 0.16s ease;
}

.btn-attach-customer:hover {
  border-color: var(--p-accent);
  color: var(--p-accent);
}

.selected-customer-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 11px;
  background: var(--p-accent-soft);
  border: 1px solid var(--p-accent);
}

.customer-meta {
  flex: 1;
  min-width: 0;
}

.customer-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.customer-financials {
  display: flex;
  gap: 10px;
  font-size: 0.74rem;
  color: var(--p-text-muted);
  margin-top: 2px;
}

.ticket-items-scroll {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.ticket-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  padding: 36px 20px;
  color: var(--p-text-muted);
}

.empty-cart-icon {
  opacity: 0.45;
  margin-bottom: 4px;
}

.ticket-empty h4 {
  color: var(--p-text);
  font-size: 0.94rem;
  font-weight: 700;
}

.ticket-empty p {
  font-size: 0.8rem;
  max-width: 240px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ticket-row {
  padding: 11px 12px;
  border-radius: 12px;
  background: var(--p-elevated);
  border: 1px solid var(--p-border);
  display: flex;
  align-items: center;
  gap: 10px;
}

.row-info {
  flex: 1;
  min-width: 0;
}

.row-title-line {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.row-title {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--p-text);
}

.sale-type-pill {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--p-surface);
  border: 1px solid var(--p-border);
  color: var(--p-text-muted);
}

.row-price {
  font-size: 0.74rem;
  color: var(--p-text-muted);
  margin-top: 2px;
}

.stepper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--p-surface);
  border: 1px solid var(--p-border);
  border-radius: 8px;
  padding: 3px 6px;
}

.step-btn {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: transparent;
  color: var(--p-text);
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-btn:hover {
  background: var(--p-elevated);
}

.step-value {
  font-size: 0.82rem;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
}

.row-subtotal {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--p-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.btn-remove-row {
  background: transparent;
  color: var(--p-text-muted);
  padding: 4px;
}

.btn-remove-row:hover {
  color: var(--p-danger);
}

.ticket-footer {
  padding: 16px 20px 20px;
  border-top: 1px solid var(--p-border);
  background: var(--p-surface);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.totals-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.84rem;
  color: var(--p-text-muted);
}

.grand-total-line {
  font-size: 1rem;
  font-weight: 800;
  color: var(--p-text);
  align-items: baseline;
}

.grand-total-amount {
  font-size: 1.25rem;
  color: var(--p-accent);
  font-variant-numeric: tabular-nums;
}

.btn-checkout {
  width: 100%;
  padding: 13px 18px;
  border-radius: 12px;
  font-size: 0.92rem;
  font-weight: 700;
  background: var(--p-accent);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.18s ease;
}

.btn-checkout:hover:not(:disabled) {
  background: var(--p-accent-hover);
  transform: translateY(-1px);
}

.btn-checkout:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Sub-modals (Customer Picker, Held Sales, Hold Note) */
.modal-backdrop,
.submodal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2200;
  background: rgba(6, 10, 20, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.customer-picker-dialog,
.hold-dialog-card,
.held-tickets-modal,
.picker-modal,
.hold-modal,
.held-drawer {
  width: 100%;
  max-width: 500px;
  background: var(--p-surface);
  border: 1px solid var(--p-border);
  border-radius: 18px;
  padding: 20px;
  color: var(--p-text);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.picker-header,
.hold-dialog-header,
.held-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--p-border);
}

.picker-title-box,
.dialog-title,
.held-title-box {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--p-text);
}

.picker-title-box h3,
.dialog-title h3,
.held-title-box h3 {
  font-size: 1rem;
  font-weight: 800;
  margin: 0;
  color: var(--p-text);
}

.btn-close-modal {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--p-elevated);
  border: 1px solid var(--p-border);
  color: var(--p-text-sec);
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: 10px;
  background: var(--p-input);
  border: 1px solid var(--p-border-strong);
}

.picker-search-input,
.styled-hold-input {
  width: 100%;
  padding: 10px 4px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--p-text);
  font-size: 0.88rem;
}

.styled-hold-input {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--p-input);
  border: 1px solid var(--p-border-strong);
  margin-top: 6px;
}

.picker-customers-list,
.held-body-scroll {
  max-height: 340px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.picker-cust-row,
.held-ticket-card {
  padding: 12px;
  border-radius: 12px;
  background: var(--p-elevated);
  border: 1px solid var(--p-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.held-ticket-card {
  flex-direction: column;
  align-items: stretch;
  cursor: default;
}

.picker-cust-row:hover {
  border-color: var(--p-accent);
}

.picker-empty,
.held-empty-state {
  text-align: center;
  padding: 32px 16px;
  color: var(--p-text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.held-empty-state h4 {
  color: var(--p-text);
  font-size: 0.95rem;
}

.hold-dialog-footer,
.held-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
}

.btn-cancel-modal {
  padding: 9px 14px;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 600;
  background: var(--p-elevated);
  border: 1px solid var(--p-border);
  color: var(--p-text-sec);
}

.btn-confirm-hold,
.btn-resume-ticket {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 700;
  background: var(--p-accent);
  color: #ffffff;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--p-border-strong);
  border-top-color: var(--p-accent);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 1080px) {
  .stationery-workspace {
    grid-template-columns: 1fr;
  }

  .ticket-section {
    position: static;
    min-height: auto;
  }
}

@media (max-width: 640px) {
  .stationery-workspace {
    padding: 12px;
  }

  .search-toolbar {
    grid-template-columns: 1fr;
  }

  .products-grid {
    grid-template-columns: 1fr;
  }
}
</style>
