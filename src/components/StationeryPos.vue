<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { store } from '../store'
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
    store.showToast('🏢 Wholesale B2B Mode Active. 15% wholesale tier pricing applied. Registered customer required.', 'info')
  } else {
    store.showToast('🛒 Retail Walk-in Mode Active. Standard retail counter pricing applied.', 'info')
  }
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
  <div class="stationery-workspace">
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
            <span>Walk-in Retail</span>
          </button>
          <button 
            class="mode-btn wholesale-btn" 
            :class="{ active: store.stationeryMode === 'WHOLESALE' }"
            @click="setSellingMode('WHOLESALE')"
          >
            <Building :size="15" />
            <span>Wholesale B2B (15% Off)</span>
          </button>
        </div>

        <div class="quick-nav-actions">
          <button class="btn-quick-nav" @click="store.activeModal = 'quotations'" title="Wholesale Quotations">
            <FileText :size="14" class="text-indigo" />
            <span>Quotations</span>
          </button>
          <button class="btn-quick-nav" @click="store.activeModal = 'stationery_returns'" title="Sales Returns & Refunds">
            <RotateCcw :size="14" class="text-rose" />
            <span>Returns</span>
          </button>
          <button class="btn-quick-nav" @click="store.activeModal = 'expenses'" title="Operating Expenses">
            <DollarSign :size="14" class="text-amber" />
            <span>Expenses</span>
          </button>
          <button class="btn-quick-nav" @click="store.activeModal = 'barcode_labels'" title="Print Barcode Labels">
            <Barcode :size="14" class="text-amber" />
            <span>Barcodes</span>
          </button>
          <button class="btn-quick-nav" @click="store.activeModal = 'product_import'" title="Bulk Import Products">
            <FileSpreadsheet :size="14" class="text-emerald" />
            <span>Import</span>
          </button>
          <button class="btn-quick-nav" @click="store.activeModal = 'wholesale_docs'" title="Wholesale Tax Invoices & Delivery Notes">
            <Truck :size="14" class="text-blue" />
            <span>Invoices</span>
          </button>
        </div>
      </div>

      <!-- WHOLESALE MODE ALERT BANNER -->
      <div v-if="store.stationeryMode === 'WHOLESALE'" class="wholesale-banner">
        <Building :size="18" class="text-blue" />
        <div class="ws-banner-text">
          <strong>Wholesale Selling Mode Active:</strong> Automatic 15% wholesale tier pricing is applied.
          <span v-if="!store.selectedCustomer" class="ws-alert-highlight">
            Attach a registered customer before checkout.
          </span>
          <span v-else>
            Invoiced to: <strong>{{ store.selectedCustomer.name }}</strong>.
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
            placeholder="Search stationery products by name or SKU..." 
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
            placeholder="Scan Barcode + Enter" 
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
          <span>All Products ({{ products.length }})</span>
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
          <p>Loading stationery catalog...</p>
        </div>

        <div v-else-if="filteredProducts.length === 0" class="state-placeholder">
          <Package :size="48" class="empty-icon" />
          <h3>No products found</h3>
          <p>Try adjusting your search query or selected category.</p>
        </div>

        <div v-else class="products-grid">
          <div 
            v-for="prod in filteredProducts" 
            :key="prod.id"
            class="product-card"
            :class="{ 'card-pack': prod.is_pack, 'card-low-stock': prod.is_low_stock }"
          >
            <!-- Card Header: Title & Badges -->
            <div class="card-header">
              <div class="product-title-group">
                <h4 class="product-name" :title="prod.name">{{ prod.name }}</h4>
                <div class="sku-tag" v-if="prod.sku">{{ prod.sku }}</div>
              </div>

              <!-- Badges -->
              <div class="card-badges">
                <span v-if="prod.is_low_stock" class="badge-low-stock" title="Low stock threshold reached">
                  Low: {{ parseFloat(prod.stock_quantity).toFixed(0) }} left
                </span>
                <span v-if="prod.is_pack" class="badge-pack-ratio">
                  {{ prod.pack_name || 'Pack' }} ({{ prod.pack_unit_ratio }} {{ prod.unit_name || 'pcs' }})
                </span>
              </div>
            </div>

            <!-- Pricing Breakdown -->
            <div class="price-breakdown">
              <div v-if="store.stationeryMode === 'WHOLESALE'" class="wholesale-price-box">
                <div class="ws-tag-pill">WHOLESALE 15% OFF</div>
                <div class="ws-price-row">
                  <span class="price-amount text-blue">TSH {{ (parseFloat(prod.selling_price) * 0.85).toFixed(2) }}</span>
                  <span class="retail-cross">TSH {{ parseFloat(prod.selling_price).toFixed(2) }}</span>
                </div>
              </div>
              <div v-else class="pack-price-row">
                <span class="price-label">{{ prod.is_pack ? `${prod.pack_name || 'Pack'}:` : 'Price:' }}</span>
                <span class="price-amount">TSH {{ parseFloat(prod.selling_price).toFixed(2) }}</span>
              </div>

              <!-- Split Unit Price if applicable -->
              <div v-if="prod.is_pack && prod.allow_split_sale" class="unit-price-row">
                <span class="price-label">Single {{ prod.unit_name || 'Piece' }}:</span>
                <span class="unit-amount">
                  TSH {{ (store.stationeryMode === 'WHOLESALE' ? ((prod.split_unit_price || (prod.selling_price / prod.pack_unit_ratio)) * 0.85) : (prod.split_unit_price || (prod.selling_price / prod.pack_unit_ratio))).toFixed(2) }}
                </span>
              </div>
            </div>

            <!-- Stock Level Indicator -->
            <div class="stock-meter">
              <div class="meter-bar">
                <div 
                  class="meter-fill" 
                  :style="{ width: `${Math.min(100, (parseFloat(prod.stock_quantity) / Math.max(1, parseFloat(prod.reorder_threshold) * 3)) * 100)}%` }"
                  :class="prod.is_low_stock ? 'fill-warning' : 'fill-good'"
                ></div>
              </div>
              <span class="stock-text">Stock: {{ parseFloat(prod.stock_quantity).toFixed(1) }} {{ prod.is_pack ? prod.pack_name + 's' : 'units' }}</span>
            </div>

            <!-- Action Buttons: Pack vs Unit -->
            <div class="card-actions">
              <!-- If product is a pack with split selling allowed -->
              <template v-if="prod.is_pack && prod.allow_split_sale">
                <button 
                  class="btn-action btn-pack" 
                  @click="handleAddToCart(prod, 1, true)"
                  title="Add 1 full pack to cart"
                >
                  <Package :size="14" />
                  <span>Full {{ prod.pack_name || 'Pack' }}</span>
                </button>
                <button 
                  class="btn-action btn-unit" 
                  @click="handleAddToCart(prod, 1, false)"
                  title="Sell individual piece from this pack"
                >
                  <Layers :size="14" />
                  <span>1 {{ prod.unit_name || 'Piece' }}</span>
                </button>
              </template>

              <!-- Standard product or pack-only sale -->
              <template v-else>
                <button 
                  class="btn-action btn-standard" 
                  @click="handleAddToCart(prod, 1, true)"
                >
                  <Plus :size="16" />
                  <span>Add to Ticket</span>
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
            <h3>Current Order</h3>
            <span class="ticket-subtitle">Stationery POS Register</span>
          </div>
        </div>

        <div class="ticket-header-actions">
          <!-- Held Sales Drawer Button -->
          <button 
            class="btn-ticket-nav"
            :class="{ 'has-held-badge': store.currentUnitHeldSales.length > 0 }"
            :title="`View ${store.currentUnitHeldSales.length} Suspended / Held Tickets`"
            @click="showHeldSalesDrawer = true"
          >
            <Clock :size="13" />
            <span>Held ({{ store.currentUnitHeldSales.length }})</span>
          </button>

          <!-- Hold Current Sale Button -->
          <button 
            v-if="store.cart.length > 0 && store.canRecordSales"
            class="btn-ticket-nav btn-hold"
            title="Suspend / Hold current order ticket"
            @click="openHoldDialog"
          >
            <PauseCircle :size="13" />
            <span>Hold</span>
          </button>

          <!-- Create Quotation from Cart -->
          <button 
            v-if="store.cart.length > 0"
            class="btn-ticket-nav btn-quote"
            title="Save current cart items as formal Quotation"
            @click="saveAsQuotation"
          >
            <FileText :size="13" />
            <span>Quote</span>
          </button>

          <button 
            class="btn-quick-sales"
            :title="store.isManagerOrOwner ? 'View Sales Records' : 'View My Sold Stationery & Transactions'"
            @click="store.activeModal = 'sales_records'"
          >
            <Receipt :size="14" />
            <span>{{ store.isManagerOrOwner ? 'Sales' : 'My Sales' }}</span>
          </button>

          <button 
            v-if="store.cart.length > 0" 
            class="btn-clear" 
            title="Clear all ticket items"
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
          <div class="oversight-title">{{ store.isStockClerk ? 'Stock Clerk Inventory Mode' : 'Management Oversight Mode' }}</div>
          <div class="oversight-desc">
            Signed in as <strong>@{{ store.user?.username }} ({{ store.user?.role?.toUpperCase() }})</strong>.
            <span v-if="store.isStockClerk">
              Inventory custody & goods receiving. Point-of-sale customer sales are handled by frontline Stationery Cashiers.
            </span>
            <span v-else>
              Sales recording is reserved for frontline Stationery Cashiers. Use the left sidebar to access Reports, Stock & Reorder, Debtors, Suppliers, and Approvals.
            </span>
          </div>
          <button v-if="store.isStockClerk" class="btn-banner-action" @click="store.activeModal = 'stock_inventory'">
            <Boxes :size="14" />
            <span>Open Inventory & Stock Control</span>
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
          <span>Attach Customer (Credit Account)</span>
        </button>
      </div>

      <!-- Cart Items List -->
      <div class="ticket-items-scroll">
        <div v-if="store.cart.length === 0" class="ticket-empty">
          <ShoppingCart :size="48" class="empty-cart-icon" />
          <h4>Order Ticket is Empty</h4>
          <p>Scan a barcode or tap products from the catalog to add items.</p>
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
            <span>Items Count:</span>
            <span>{{ store.cartItemCount }}</span>
          </div>
          <div class="summary-line grand-total-line">
            <span>Total Payable:</span>
            <span class="grand-total-amount">TSH {{ store.cartSubtotal.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Checkout Action Button -->
        <button 
          class="btn-checkout" 
          :disabled="store.cart.length === 0 || !store.canRecordSales"
          :title="!store.canRecordSales ? 'Frontline Stationery Cashier role required to record sales' : 'Proceed to Payment'"
          @click="proceedToCheckout"
        >
          <CreditCard :size="20" />
          <span>Proceed to Payment</span>
          <ChevronRight :size="20" />
        </button>
      </div>
    </aside>

    <!-- CUSTOMER SELECTOR MODAL -->
    <div v-if="showCustomerPicker" class="modal-backdrop" @click.self="showCustomerPicker = false">
      <div class="customer-picker-dialog">
        <div class="picker-header">
          <div class="picker-title-box">
            <UserCheck :size="20" class="text-cyan" />
            <h3>Select Stationery Customer</h3>
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
            placeholder="Search by school, business name, or phone..." 
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
              <span class="badge-limit">Limit: TSH {{ parseFloat(c.credit_limit).toFixed(2) }}</span>
              <span class="badge-balance" :class="{ 'has-debt': parseFloat(c.current_balance) > 0 }">
                Owed: TSH {{ parseFloat(c.current_balance).toFixed(2) }}
              </span>
            </div>
          </div>

          <div v-if="filteredCustomers.length === 0" class="picker-empty">
            <p>No customers found matching "{{ customerSearch }}".</p>
          </div>
        </div>
      </div>
    </div>

    <!-- HOLD NOTE MODAL -->
    <div v-if="showHoldNoteModal" class="modal-backdrop" @click.self="showHoldNoteModal = false">
      <div class="hold-dialog-card">
        <div class="hold-dialog-header">
          <div class="dialog-title">
            <PauseCircle :size="20" class="text-amber" />
            <h3>Hold Current Sale Ticket</h3>
          </div>
          <button class="btn-close-modal" @click="showHoldNoteModal = false">
            <X :size="18" />
          </button>
        </div>
        <div class="hold-dialog-body">
          <p class="dialog-desc">This ticket will be safely parked so you can serve the next customer. You can resume it anytime.</p>
          <label class="field-label">Note or Customer Reference (Optional):</label>
          <input 
            v-model="holdCustomNote" 
            type="text" 
            placeholder="e.g. Customer fetching cash, or School rep name..." 
            class="styled-hold-input"
            @keyup.enter="confirmHoldSale"
          />
        </div>
        <div class="hold-dialog-footer">
          <button class="btn-cancel-modal" @click="showHoldNoteModal = false">Cancel</button>
          <button class="btn-confirm-hold" @click="confirmHoldSale">
            <PauseCircle :size="16" />
            <span>Confirm & Hold Sale</span>
          </button>
        </div>
      </div>
    </div>

    <!-- HELD TICKETS DRAWER / MODAL -->
    <div v-if="showHeldSalesDrawer" class="modal-backdrop" @click.self="showHeldSalesDrawer = false">
      <div class="held-tickets-modal">
        <div class="held-header">
          <div class="held-title-box">
            <Clock :size="20" class="text-amber" />
            <div>
              <h3>Suspended & Held Tickets</h3>
              <p class="subtitle">{{ store.currentUnitHeldSales.length }} order ticket(s) currently parked</p>
            </div>
          </div>
          <button class="btn-close-modal" @click="showHeldSalesDrawer = false">
            <X :size="18" />
          </button>
        </div>

        <div class="held-body-scroll">
          <div v-if="store.currentUnitHeldSales.length === 0" class="held-empty-state">
            <Clock :size="40" class="text-muted" />
            <h4>No Held Tickets</h4>
            <p>When you hold a sale, it will be kept safely here until you are ready to resume.</p>
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
                <span class="item-count">{{ s.itemCount }} item(s):</span>
                <span class="items-summary-text">
                  {{ s.items.map(i => `${i.quantity}x ${i.product.name}`).slice(0, 3).join(', ') }}
                  <template v-if="s.items.length > 3">...</template>
                </span>
              </div>

              <div class="held-total-row">
                <span class="total-lbl">Total Payable:</span>
                <span class="total-val">TSH {{ parseFloat(s.total).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
              </div>

              <div class="held-actions">
                <button class="btn-resume-ticket" @click="resumeSale(s.id)">
                  <PlayCircle :size="15" />
                  <span>Resume Ticket</span>
                </button>
                <button class="btn-discard-ticket" @click="discardSale(s.id)" title="Discard suspended ticket">
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
.stationery-workspace {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 1.5rem;
  height: 100%;
  padding: 1.25rem 1.75rem;
  overflow: hidden;
}

/* LEFT CATALOG SECTION */
.catalog-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
}

/* TOP TOOLBAR: SELLING MODE & QUICK ACTIONS */
.pos-top-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.selling-mode-toggle {
  display: flex;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.25rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  gap: 0.35rem;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn.active {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.wholesale-btn.active {
  background: rgba(59, 130, 246, 0.25) !important;
  color: #60a5fa !important;
}

.quick-nav-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.btn-quick-nav {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(30, 41, 59, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  font-size: 0.775rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-quick-nav:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.text-indigo { color: #818cf8; }
.text-rose { color: #fb7185; }
.text-amber { color: #fbbf24; }
.text-emerald { color: #34d399; }
.text-blue { color: #60a5fa; }

/* WHOLESALE ALERT BANNER */
.wholesale-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(37, 99, 235, 0.12);
  border: 1px solid rgba(37, 99, 235, 0.3);
  border-radius: 10px;
  padding: 0.65rem 1rem;
}

.ws-banner-text {
  font-size: 0.825rem;
  color: #bfdbfe;
}

.ws-alert-highlight {
  color: #facc15;
  font-weight: 600;
  margin-left: 0.35rem;
}

/* WHOLESALE PRICING IN CARDS */
.wholesale-price-box {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.ws-tag-pill {
  font-size: 0.65rem;
  font-weight: 800;
  color: #60a5fa;
  background: rgba(37, 99, 235, 0.2);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  width: fit-content;
}

.ws-price-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.retail-cross {
  font-size: 0.75rem;
  color: #64748b;
  text-decoration: line-through;
}

/* TICKET HEADER BUTTONS */
.btn-ticket-nav {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  padding: 0.4rem 0.65rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ticket-nav:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.has-held-badge {
  background: rgba(245, 158, 11, 0.2) !important;
  color: #fbbf24 !important;
  border-color: #f59e0b !important;
}

.btn-hold {
  color: #fbbf24;
}

.btn-quote {
  color: #818cf8;
}

/* HOLD SALE MODAL */
.hold-dialog-card {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  width: 100%;
  max-width: 480px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.hold-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dialog-title h3 {
  font-size: 1.1rem;
  color: #f1f5f9;
  margin: 0;
}

.hold-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dialog-desc {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #cbd5e1;
}

.styled-hold-input {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  border-radius: 8px;
  padding: 0.65rem 0.85rem;
  font-size: 0.875rem;
  outline: none;
}

.styled-hold-input:focus { border-color: #f59e0b; }

.hold-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-cancel-modal {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  padding: 0.55rem 1rem;
  border-radius: 8px;
  cursor: pointer;
}

.btn-confirm-hold {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #d97706;
  color: white;
  border: none;
  padding: 0.55rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm-hold:hover { background: #b45309; }

/* HELD TICKETS MODAL */
.held-tickets-modal {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  width: 100%;
  max-width: 650px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.held-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.held-title-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.held-title-box h3 {
  font-size: 1.15rem;
  color: #f1f5f9;
  margin: 0;
}

.held-body-scroll {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.held-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: #64748b;
}

.held-empty-state h4 {
  color: #cbd5e1;
  margin: 0.75rem 0 0.25rem;
}

.held-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.held-ticket-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.held-id {
  font-family: monospace;
  font-weight: 700;
  color: #fbbf24;
  font-size: 0.9rem;
}

.held-time {
  font-size: 0.75rem;
  color: #64748b;
}

.held-note-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.note-text {
  font-size: 0.9rem;
  color: #f1f5f9;
}

.cust-tag {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.725rem;
}

.held-items-preview {
  font-size: 0.785rem;
  color: #94a3b8;
}

.held-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(15, 23, 42, 0.5);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  margin-top: 0.25rem;
}

.total-lbl { font-size: 0.8rem; color: #94a3b8; }
.total-val { font-size: 0.95rem; font-weight: 800; color: #38bdf8; }

.held-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

.btn-resume-ticket {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: #0284c7;
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.825rem;
  cursor: pointer;
}

.btn-resume-ticket:hover { background: #0369a1; }

.btn-discard-ticket {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
}

.search-toolbar {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1rem;
}

.search-input-box, .barcode-input-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(18, 24, 38, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.6rem 1rem;
  backdrop-filter: blur(10px);
}

.search-input-box:focus-within {
  border-color: #06b6d4;
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.25);
}

.barcode-input-box:focus-within {
  border-color: #10b981;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.25);
}

.input-icon {
  color: #94a3b8;
}

.barcode-icon {
  color: #10b981;
}

.text-input {
  background: transparent;
  border: none;
  outline: none;
  color: #f1f5f9;
  font-size: 0.95rem;
  width: 100%;
}

.clear-input-btn {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
}

/* Category Chips */
.categories-strip {
  display: flex;
  gap: 0.6rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.cat-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  color: #94a3b8;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.cat-chip:hover {
  background: rgba(30, 41, 59, 0.8);
  color: #f8fafc;
}

.cat-chip.active {
  background: rgba(6, 182, 212, 0.2);
  border-color: #06b6d4;
  color: #22d3ee;
  font-weight: 600;
}

/* Products Grid */
.products-container {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.product-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: rgba(18, 24, 38, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1rem;
  transition: all 0.25s ease;
  backdrop-filter: blur(12px);
}

.product-card:hover {
  transform: translateY(-3px);
  border-color: rgba(6, 182, 212, 0.4);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
}

.card-pack {
  border-left: 3px solid #06b6d4;
}

.card-low-stock {
  border-color: rgba(245, 158, 11, 0.4);
}

.card-header {
  margin-bottom: 0.75rem;
}

.product-name {
  color: #f8fafc;
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
}

.sku-tag {
  font-size: 0.75rem;
  color: #64748b;
  font-family: monospace;
}

.card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.badge-low-stock {
  font-size: 0.7rem;
  font-weight: 600;
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
}

.badge-pack-ratio {
  font-size: 0.7rem;
  font-weight: 600;
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.3);
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
}

/* Pricing Breakdown */
.price-breakdown {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
}

.pack-price-row, .unit-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.price-label {
  color: #94a3b8;
}

.price-amount {
  color: #10b981;
  font-weight: 700;
  font-size: 1rem;
}

.unit-price-row {
  margin-top: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
}

.unit-amount {
  color: #38bdf8;
  font-weight: 600;
}

/* Stock Meter */
.stock-meter {
  margin-bottom: 0.75rem;
}

.meter-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.meter-fill {
  height: 100%;
  border-radius: 2px;
}

.fill-good {
  background: #10b981;
}

.fill-warning {
  background: #f59e0b;
}

.stock-text {
  font-size: 0.72rem;
  color: #64748b;
}

/* Action Buttons */
.card-actions {
  display: grid;
  gap: 0.5rem;
  margin-top: auto;
}

.card-actions:has(.btn-unit) {
  grid-template-columns: 1.2fr 1fr;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-standard {
  background: linear-gradient(135deg, #0284c7, #0369a1);
  color: white;
}

.btn-standard:hover {
  background: linear-gradient(135deg, #0369a1, #075985);
}

.btn-pack {
  background: rgba(6, 182, 212, 0.2);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.4);
}

.btn-pack:hover {
  background: rgba(6, 182, 212, 0.35);
}

.btn-unit {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.btn-unit:hover {
  background: rgba(16, 185, 129, 0.35);
}

/* RIGHT TICKET SECTION */
.ticket-section {
  display: flex;
  flex-direction: column;
  background: rgba(18, 24, 38, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(16px);
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.6);
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  color: #06b6d4;
}

.header-title-box h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #f8fafc;
}

.ticket-subtitle {
  font-size: 0.75rem;
  color: #64748b;
}

.ticket-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-quick-sales {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.35);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-quick-sales:hover {
  background: rgba(6, 182, 212, 0.28);
  border-color: #22d3ee;
  color: #fff;
  transform: translateY(-1px);
}

.btn-clear {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 6px;
}

.btn-clear:hover {
  background: rgba(239, 68, 68, 0.15);
}

/* Management Oversight Banner */
.management-oversight-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(6, 182, 212, 0.1);
  border-bottom: 1px solid rgba(6, 182, 212, 0.25);
  padding: 12px 16px;
  color: #a5f3fc;
}

.management-oversight-banner .oversight-icon {
  color: #22d3ee;
  flex-shrink: 0;
  margin-top: 2px;
}

.oversight-text {
  font-size: 11.5px;
  line-height: 1.45;
}

.oversight-title {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #67e8f9;
  margin-bottom: 2px;
}

.oversight-desc {
  color: #cbd5e1;
}

.management-oversight-banner.clerk-banner {
  background: rgba(99, 102, 241, 0.12);
  border-bottom: 1px solid rgba(99, 102, 241, 0.3);
  color: #c7d2fe;
}

.management-oversight-banner.clerk-banner .oversight-icon {
  color: #a5b4fc;
}

.management-oversight-banner.clerk-banner .oversight-title {
  color: #c7d2fe;
}

.btn-banner-action {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #6366f1;
  color: #ffffff;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-banner-action:hover {
  background: #4f46e5;
}

/* Customer Credit Bar */
.customer-credit-bar {
  padding: 0.75rem 1.25rem;
  background: rgba(15, 23, 42, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.btn-attach-customer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem;
  background: rgba(6, 182, 212, 0.1);
  border: 1px dashed rgba(6, 182, 212, 0.4);
  border-radius: 10px;
  color: #22d3ee;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-attach-customer:hover {
  background: rgba(6, 182, 212, 0.2);
}

.selected-customer-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(6, 182, 212, 0.15);
  border: 1px solid rgba(6, 182, 212, 0.35);
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
}

.customer-avatar {
  color: #06b6d4;
}

.customer-meta {
  flex: 1;
}

.customer-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cust-name {
  color: #f1f5f9;
  font-size: 0.9rem;
}

.btn-remove-cust {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.btn-remove-cust:hover {
  color: #ef4444;
}

.customer-financials {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  margin-top: 0.15rem;
}

.owed-text {
  color: #f59e0b;
}

.avail-text {
  color: #10b981;
}

/* Items Scroll */
.ticket-items-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1.25rem;
}

.ticket-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
}

.empty-cart-icon {
  margin-bottom: 0.75rem;
  opacity: 0.4;
}

.ticket-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.row-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.row-title-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.row-title {
  color: #f1f5f9;
  font-size: 0.88rem;
  font-weight: 500;
}

.sale-type-pill {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.pill-pack {
  background: rgba(6, 182, 212, 0.2);
  color: #22d3ee;
}

.pill-unit {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.row-price {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Stepper */
.stepper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 8px;
  padding: 0.2rem;
}

.step-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #f1f5f9;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.step-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.step-value {
  font-size: 0.85rem;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
  color: #f8fafc;
}

.row-subtotal {
  font-size: 0.9rem;
  font-weight: 700;
  color: #10b981;
  min-width: 70px;
  text-align: right;
}

.btn-remove-row {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.2rem;
}

.btn-remove-row:hover {
  color: #ef4444;
}

/* Ticket Footer */
.ticket-footer {
  padding: 1.25rem;
  background: rgba(15, 23, 42, 0.75);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.totals-breakdown {
  margin-bottom: 1rem;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 0.4rem;
}

.grand-total-line {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f8fafc;
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.grand-total-amount {
  color: #22d3ee;
  font-size: 1.35rem;
}

.btn-checkout {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.85rem;
  background: linear-gradient(135deg, #0891b2, #0e7490);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(8, 145, 178, 0.35);
}

.btn-checkout:hover:not(:disabled) {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  transform: translateY(-1px);
}

.btn-checkout:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

/* MODAL BACKDROP & DIALOG */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.customer-picker-dialog {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  width: 90%;
  max-width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.picker-title-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.picker-title-box h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.1rem;
}

.btn-close-modal {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.picker-search-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 1.25rem;
  background: rgba(15, 23, 42, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.picker-search-input {
  background: transparent;
  border: none;
  outline: none;
  color: #f1f5f9;
  font-size: 0.9rem;
  width: 100%;
}

.picker-customers-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 1rem;
}

.picker-cust-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0.8rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.picker-cust-row:hover {
  background: rgba(6, 182, 212, 0.15);
}

.cust-main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.cust-main strong {
  color: #f8fafc;
  font-size: 0.92rem;
}

.cust-contact {
  font-size: 0.75rem;
  color: #94a3b8;
}

.cust-limits {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.badge-limit {
  font-size: 0.72rem;
  color: #94a3b8;
}

.badge-balance {
  font-size: 0.78rem;
  font-weight: 600;
  color: #10b981;
}

.badge-balance.has-debt {
  color: #f59e0b;
}

.picker-empty {
  padding: 2rem;
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
}
</style>
