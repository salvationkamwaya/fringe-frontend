<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  Wine, Beer, GlassWater, Sparkles, Search, Plus, Minus, 
  Trash2, AlertTriangle, ShieldAlert, ShieldCheck, CreditCard, Banknote, 
  Smartphone, Split, Layers, Percent, CheckCircle, Boxes, Receipt,
  BookmarkCheck, X, Check, ArrowRight, MapPin, Package
} from 'lucide-vue-next'

const categories = ref([])
const products = ref([])
const selectedCategory = ref(null)
const searchQuery = ref('')
const loading = ref(true)
const isMobileCartOpen = ref(false)

const getDrinkCartCount = (drinkId) => {
  return store.cart
    .filter(item => item.product.id === drinkId)
    .reduce((sum, item) => sum + item.quantity, 0)
}

const fetchCategories = async () => {
  if (!store.isAuthenticated) return
  try {
    const response = await api.get('/catalog/categories/')
    categories.value = response.data.results || response.data
  } catch (err) {
    console.error('Error fetching categories:', err)
  }
}

const fetchProducts = async () => {
  if (!store.isAuthenticated) return
  loading.value = true
  try {
    const params = {}
    if (selectedCategory.value) {
      params.category = selectedCategory.value
    }
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    const response = await api.get('/catalog/products/', { params })
    products.value = response.data.results || response.data
  } catch (err) {
    console.error('Error fetching products:', err)
  } finally {
    loading.value = false
  }
}

// Watch for category or search change
watch([selectedCategory, searchQuery], () => {
  fetchProducts()
})

// Watch for unit switch
watch(() => store.activeUnit, () => {
  fetchCategories()
  fetchProducts()
})

// Watch for branch switch
watch(() => store.activeBranchId, () => {
  selectedCategory.value = null
  fetchCategories()
  fetchProducts()
})

// Auto-refresh drink stock immediately after any sale completes
watch(() => store.lastSaleAt, () => {
  fetchProducts()
})

// Voiding a line item from current cart
const requestVoidItem = (item) => {
  if (store.isBarManager || store.isOwner) {
    // Current user is already a manager or owner
    store.removeFromCart(item.product.id, item.is_pack_sale)
    store.showToast(`Voided ${item.product.name} from ticket`, 'info')
  } else {
    // Requires Manager PIN authorization!
    store.openPinModal({
      action: 'VOID_ITEM',
      title: `Authorize Void Item`,
      subtitle: `Manager PIN required to void ${item.quantity}x ${item.product.name}`,
      context: { product_id: item.product.id, product_name: item.product.name, quantity: item.quantity },
      onSuccess: (authData) => {
        store.removeFromCart(item.product.id, item.is_pack_sale)
        store.showToast(`Void approved by ${authData.approver_name}`, 'success')
      }
    })
  }
}

const handleDrinkClick = (drink, is_pack_sale = true) => {
  if (!store.canRecordSales) {
    store.showToast('Sales recording is strictly reserved for frontline Bartenders. Managers and Owners perform oversight and reporting only.', 'warning')
    return
  }
  if (Number(drink.stock_quantity) <= 0) {
    store.showToast(`${drink.name} is currently out of stock.`, 'warning')
    return
  }
  store.addToCart(drink, 1, is_pack_sale)
  const modeLabel = !is_pack_sale 
    ? `Single ${drink.unit_name || 'Bottle'}` 
    : (drink.is_pack ? `Full ${drink.pack_name || 'Crate'}` : 'Drink')
  store.showToast(`Added ${drink.name} (${modeLabel}) to ticket`, 'success')
}

// Clear order ticket with confirmation
const requestClearCart = async () => {
  if (store.cart.length === 0) return
  const isSw = store.locale === 'sw'
  const confirmed = await store.confirm({
    title: isSw ? 'Futa Orodha ya Oda?' : 'Clear Order Ticket?',
    message: isSw
      ? `Hii itaondoa vinywaji vyote ${store.cartItemCount} kutoka kwenye oda ya sasa.`
      : `This will remove all ${store.cartItemCount} drink(s) from the current ticket.`,
    confirmText: isSw ? 'Futa Oda' : 'Clear Ticket',
    cancelText: isSw ? 'Ghairi' : 'Cancel',
    variant: 'warning'
  })
  if (confirmed) {
    store.clearCart()
    store.showToast('Order ticket cleared.', 'info')
  }
}

// Initiating checkout with mandatory age check intercept
const handleProceedToPayment = (mode = 'CASH') => {
  if (!store.canRecordSales) {
    store.showToast('Sales recording is strictly reserved for frontline Bartenders. Managers and Owners perform oversight and reporting only.', 'warning')
    return
  }

  if (store.cart.length === 0) {
    store.showToast('Cart is empty. Add drinks to proceed.', 'warning')
    return
  }

  isMobileCartOpen.value = false

  // 1. NON-BYPASSABLE AGE CHECK
  if (store.cartHasAlcohol && !store.isAgeVerified) {
    store.activeModal = 'age_verification'
    return
  }

  // 2. Open Payment Modal
  store.activeModal = 'payment'
}

const isSavingRound = ref(false)

// Save Round to Tab without requiring immediate checkout
const handleSaveRoundToTab = async () => {
  if (!store.canRecordSales) {
    store.showToast('Sales recording is strictly reserved for frontline Bartenders.', 'warning')
    return
  }
  if (!store.selectedTab) return
  if (store.cart.length === 0) {
    store.showToast('Cart is empty. Add drinks to save round to tab.', 'warning')
    return
  }

  // Mandatory age check if alcohol is present
  if (store.cartHasAlcohol && !store.isAgeVerified) {
    store.activeModal = 'age_verification'
    return
  }

  isSavingRound.value = true
  try {
    const payload = {
      items: store.cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        is_pack_sale: item.is_pack_sale !== undefined ? item.is_pack_sale : true
      })),
      payments: [],
      tab_id: store.selectedTab.id,
      shift_id: store.activeShift?.id || null,
      is_age_verified: store.isAgeVerified,
      discount_amount: 0,
      notes: store.orderNotes || undefined
    }
    await api.post('/pos/orders/', payload)
    const count = store.cartItemCount
    const tabName = store.selectedTab.tab_name
    store.showToast(`Round of ${count} drink(s) saved to Tab '${tabName}'!`, 'success')
    store.clearCart()
    isMobileCartOpen.value = false
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to save round to tab.', 'error')
  } finally {
    isSavingRound.value = false
  }
}

const onBranchChange = () => {
  selectedCategory.value = null
  fetchCategories()
  fetchProducts()
}

onMounted(() => {
  if (store.isAuthenticated) {
    fetchCategories()
    fetchProducts()
  }
  window.addEventListener('fringe-branch-changed', onBranchChange)
})

watch(() => store.isAuthenticated, (auth) => {
  if (auth) {
    fetchCategories()
    fetchProducts()
  }
})

onUnmounted(() => {
  window.removeEventListener('fringe-branch-changed', onBranchChange)
})
</script>

<template>
  <div class="pos-container">
    <!-- LEFT: CATALOG & TOUCH DRINK TILES -->
    <div class="catalog-panel">
      <!-- Active Branch Context Strip -->
      <div class="branch-context-strip">
        <div class="branch-context-info">
          <MapPin :size="14" class="branch-icon-pin" />
          <span class="branch-label">LOCATION:</span>
          <strong class="branch-name">{{ store.activeBranchName }}</strong>
          <span v-if="store.activeBranchCode" class="branch-code-badge">{{ store.activeBranchCode }}</span>
        </div>
        <div v-if="store.isOwner" class="branch-context-action">
          <button class="btn-manage-branches-link" @click="store.activeModal = 'branch_management'">
            <span>Manage Branches</span>
            <ArrowRight :size="12" />
          </button>
        </div>
      </div>

      <!-- Search & Category Filter Bar -->
      <div class="filter-header">
        <div class="search-box">
          <Search :size="18" class="search-icon" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search drinks by name, SKU, or brand..." 
            class="search-input"
          />
          <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">&times;</button>
        </div>

        <div class="category-pills">
          <button 
            class="cat-pill" 
            :class="{ active: selectedCategory === null }"
            @click="selectedCategory = null"
          >
            <span>All Drinks</span>
          </button>
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            class="cat-pill"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectedCategory = cat.id"
          >
            <span>{{ cat.name }}</span>
          </button>
        </div>
      </div>

      <!-- Drink Tiles Grid -->
      <div class="products-scroll">
        <div v-if="loading" class="grid-state">
          <div class="spinner"></div>
          <p>Loading bar catalog...</p>
        </div>

        <div v-else-if="products.length === 0" class="grid-state">
          <p>No drinks found matching your criteria.</p>
        </div>

        <div v-else class="drinks-grid">
          <div 
            v-for="drink in products" 
            :key="drink.id"
            class="drink-card"
            :class="{ 
              'card-alcohol': drink.is_alcoholic,
              'in-cart': getDrinkCartCount(drink.id) > 0,
              'out-of-stock': Number(drink.stock_quantity) <= 0
            }"
            @click="!drink.allow_split_sale && Number(drink.stock_quantity) > 0 && handleDrinkClick(drink, true)"
          >
            <!-- Card Top Badges Row -->
            <div class="drink-card-top-badges">
              <!-- In-Cart Quantity Indicator Badge -->
              <div v-if="getDrinkCartCount(drink.id) > 0" class="in-cart-pill" title="Currently on order ticket">
                <Check :size="11" />
                <span>{{ getDrinkCartCount(drink.id) }} in ticket</span>
              </div>
              <div v-else></div>

              <!-- Alcoholic 18+ Warning Badge -->
              <div v-if="drink.is_alcoholic" class="alcohol-pill" title="Age 18+ Required">
                <span>18+ ALCOHOL</span>
              </div>
            </div>

            <div class="drink-content">
              <div class="drink-category">{{ drink.category_name || 'Bar Drink' }}</div>
              <h4 class="drink-name">{{ drink.name }}</h4>
              <div v-if="drink.volume_ml" class="drink-volume">{{ drink.volume_ml }}ml</div>
            </div>

            <!-- Split Sale Touch Buttons (Crate/Carton vs Single Bottle/Unit) -->
            <div v-if="drink.allow_split_sale && Number(drink.stock_quantity) > 0" class="split-sale-buttons">
              <button 
                class="btn-split-unit" 
                @click.stop="handleDrinkClick(drink, true)"
                :title="`Add Full ${drink.pack_name || 'Crate'} (${drink.pack_unit_ratio} ${drink.unit_name || 'bottles'})`"
              >
                <Package :size="12" />
                <span>{{ drink.pack_name || 'Crate' }}</span>
              </button>
              <button 
                class="btn-split-unit btn-peg" 
                @click.stop="handleDrinkClick(drink, false)"
                :title="`Add Single ${drink.unit_name || 'Bottle'}`"
              >
                <Wine v-if="drink.is_alcoholic" :size="12" />
                <GlassWater v-else :size="12" />
                <span>Single {{ drink.unit_name || 'Bottle' }}</span>
              </button>
            </div>

            <div class="drink-footer">
              <div class="price-tag">
                <span class="currency">TSH</span>
                <span class="amount">{{ parseFloat(drink.selling_price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}</span>
                <span v-if="drink.is_pack && drink.allow_split_sale && drink.split_unit_price" class="split-price-sub">
                  • 🍾 {{ parseFloat(drink.split_unit_price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}
                </span>
              </div>

              <div 
                class="stock-badge"
                :class="Number(drink.stock_quantity) <= 0 ? 'stock-empty' : Number(drink.stock_quantity) <= Number(drink.reorder_threshold) ? 'stock-low' : 'stock-ok'"
              >
                <span v-if="Number(drink.stock_quantity) <= 0">Out of stock</span>
                <span v-else-if="drink.is_pack">
                  {{ Math.floor(Number(drink.stock_quantity)) }} {{ drink.pack_name || 'Crates' }}
                  <span v-if="drink.pack_unit_ratio > 1" class="stock-pieces-sub">
                    ({{ Math.round(Number(drink.stock_quantity) * drink.pack_unit_ratio) }} {{ drink.unit_name || 'btls' }})
                  </span>
                </span>
                <span v-else>{{ Number(drink.stock_quantity).toFixed(0) }} left</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT: ORDER CART & TICKET PANEL -->
    <div class="cart-panel" :class="{ 'mobile-open': isMobileCartOpen }">
      <!-- Cart Header -->
      <div class="cart-header">
        <div>
          <h3 class="cart-title">Current Order</h3>
          <div class="cart-meta">
            <span class="item-count">{{ store.cartItemCount }} items</span>
            <span v-if="store.selectedTab" class="tab-indicator">
              &bull; Tab: <strong>{{ store.selectedTab.tab_name }}</strong>
              <button 
                class="btn-deselect-tab" 
                @click="store.selectedTab = null; store.showToast('Switched to Walk-in Cash Sale mode', 'info')" 
                title="Deselect tab for Walk-in Cash Sale"
              >
                <X :size="11" />
                <span>Walk-in</span>
              </button>
            </span>
            <span v-else class="walkin-tag">
              &bull; Walk-in Sale
            </span>
          </div>
        </div>

        <div class="cart-header-actions">
          <button 
            class="btn-quick-sales"
            :title="store.isManagerOrOwner ? 'View Sales Records' : 'View My Sold Drinks & Transactions'"
            @click="store.activeModal = 'sales_records'"
          >
            <Receipt :size="14" />
            <span>{{ store.isManagerOrOwner ? 'Sales Records' : 'My Sales' }}</span>
          </button>

          <button 
            v-if="store.cart.length > 0" 
            class="btn-clear-cart"
            title="Clear Current Order Ticket"
            @click="requestClearCart"
          >
            <Trash2 :size="16" />
          </button>

          <!-- Close button on mobile/tablet drawer -->
          <button class="btn-close-mobile-cart" @click="isMobileCartOpen = false" title="Close Ticket Drawer">
            <X :size="18" />
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
              Inventory custody & goods receiving. Point-of-sale customer sales are handled by frontline Bartenders.
            </span>
            <span v-else>
              Sales recording is reserved for frontline Bartenders. Use the left sidebar to access Reports, Stock, Shift Oversight, and Audits.
            </span>
          </div>
          <button v-if="store.isStockClerk" class="btn-banner-action" @click="store.activeModal = 'stock_inventory'">
            <Boxes :size="14" />
            <span>Open Inventory & Stock Control</span>
          </button>
        </div>
      </div>

      <!-- Alcohol Mandatory Warning in Cart -->
      <div v-if="store.cartHasAlcohol" class="alcohol-cart-warning">
        <ShieldAlert :size="18" class="warning-icon" />
        <div class="warning-text">
          <strong>Alcohol in Cart:</strong> Mandatory ID check (18+) will be prompted at checkout.
        </div>
      </div>

      <!-- Order Ticket Items List -->
      <div class="cart-items-list">
        <div v-if="store.cart.length === 0" class="empty-cart">
          <Wine :size="48" class="empty-cart-icon" />
          <p>Order ticket is currently empty.</p>
          <span>Tap on any drink tile to add to current order.</span>
        </div>

        <div 
          v-for="item in store.cart" 
          :key="`${item.product.id}-${item.is_pack_sale}`"
          class="ticket-item"
        >
          <div class="item-info">
            <div class="item-top">
              <span class="item-title">{{ item.product.name }}</span>
              <span v-if="item.is_pack_sale === false" class="mini-split-badge">
                🍾 Single {{ item.product.unit_name || 'Bottle' }}
              </span>
              <span v-else-if="item.product.is_pack" class="mini-bottle-badge">
                📦 {{ item.product.pack_name || 'Crate' }} ({{ item.product.pack_unit_ratio }})
              </span>
              <span v-if="item.product.is_alcoholic" class="mini-alcohol-badge">18+</span>
            </div>
            <div class="item-subprice">TSH {{ parseFloat(item.unit_price).toFixed(2) }} each</div>
          </div>

          <!-- Quantity Stepper -->
          <div class="stepper">
            <button class="step-btn" @click="store.updateCartQuantity(item.product.id, -1, item.is_pack_sale)">
              <Minus :size="14" />
            </button>
            <span class="step-qty">{{ item.quantity }}</span>
            <button class="step-btn" @click="store.updateCartQuantity(item.product.id, 1, item.is_pack_sale)">
              <Plus :size="14" />
            </button>
          </div>

          <!-- Line Subtotal -->
          <div class="item-subtotal">
            TSH {{ (parseFloat(item.unit_price) * item.quantity).toFixed(2) }}
          </div>

          <!-- Void Button -->
          <button 
            class="btn-void-item" 
            title="Void Item (Requires Manager PIN)"
            @click="requestVoidItem(item)"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>

      <!-- Order Table Reference / Notes -->
      <div v-if="store.cart.length > 0" class="order-notes-section">
        <input 
          v-model="store.orderNotes" 
          type="text" 
          placeholder="Table # or note (e.g. Table 4, VIP Lounge, Extra ice)..."
          class="order-note-input"
        />
      </div>

      <!-- Cart Bottom & Checkout Summary -->
      <div class="cart-footer">
        <div class="summary-breakdown">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>TSH {{ store.cartSubtotal.toFixed(2) }}</span>
          </div>
          <div class="summary-row total-row">
            <span>Total Due:</span>
            <span class="total-val">TSH {{ store.cartSubtotal.toFixed(2) }}</span>
          </div>
        </div>

        <!-- If Tab is active: Save Round to Tab action -->
        <div v-if="store.selectedTab" class="tab-round-box">
          <div class="tab-round-header">
            <div class="round-desc">
              <BookmarkCheck :size="15" class="text-amber" />
              <span>Target: <strong>{{ store.selectedTab.tab_name }}</strong></span>
            </div>
            <button 
              class="btn-switch-walkin" 
              @click="store.selectedTab = null; store.showToast('Switched to Walk-in Cash Sale mode', 'info')"
              title="Deselect tab to sell to walk-in customer"
            >
              Switch to Walk-in
            </button>
          </div>
          <button 
            class="btn-save-round"
            :disabled="store.cart.length === 0 || !store.canRecordSales || isSavingRound"
            @click="handleSaveRoundToTab"
          >
            <BookmarkCheck :size="17" />
            <span>{{ isSavingRound ? 'Saving to Tab...' : `Save Round to ${store.selectedTab.tab_name}` }}</span>
          </button>
        </div>

        <!-- Touch Checkout Buttons -->
        <div class="checkout-actions">
          <button 
            class="btn-pay btn-cash"
            :disabled="store.cart.length === 0 || !store.canRecordSales"
            :title="!store.canRecordSales ? 'Frontline Bartender role required to record sales' : 'Pay Cash'"
            @click="handleProceedToPayment('CASH')"
          >
            <Banknote :size="20" />
            <span>Pay Cash</span>
          </button>

          <button 
            class="btn-pay btn-momo"
            :disabled="store.cart.length === 0 || !store.canRecordSales"
            :title="!store.canRecordSales ? 'Frontline Bartender role required to record sales' : 'Mobile Money'"
            @click="handleProceedToPayment('MOBILE_MONEY')"
          >
            <Smartphone :size="20" />
            <span>Mobile Money</span>
          </button>

          <button 
            class="btn-pay btn-split"
            :disabled="store.cart.length === 0 || !store.canRecordSales"
            :title="!store.canRecordSales ? 'Frontline Bartender role required to record sales' : 'Split Tender'"
            @click="handleProceedToPayment('SPLIT')"
          >
            <Split :size="20" />
            <span>Split Tender</span>
          </button>

          <button 
            class="btn-tab-action"
            :disabled="!store.canRecordSales && !store.isBarManager"
            @click="store.activeModal = 'tabs'"
          >
            <Layers :size="18" />
            <span>{{ store.selectedTab ? `Tab: ${store.selectedTab.tab_name}` : 'Open Tabs' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Floating Order Bar (<= 900px) -->
    <div 
      v-if="store.cartItemCount > 0 && !isMobileCartOpen" 
      class="mobile-bottom-bar"
      @click="isMobileCartOpen = true"
    >
      <div class="mobile-bar-left">
        <span class="mobile-count-pill">{{ store.cartItemCount }}</span>
        <div>
          <div class="mobile-bar-total">TSH {{ store.cartSubtotal.toFixed(2) }}</div>
          <div class="mobile-bar-sub">{{ store.selectedTab ? `Tab: ${store.selectedTab.tab_name}` : 'Walk-in Order' }}</div>
        </div>
      </div>
      <div class="mobile-bar-right">
        <span>View Ticket</span>
        <ArrowRight :size="16" />
      </div>
    </div>

    <!-- Mobile Drawer Backdrop Overlay -->
    <div 
      v-if="isMobileCartOpen" 
      class="mobile-cart-backdrop" 
      @click="isMobileCartOpen = false"
    ></div>
  </div>
</template>

<style scoped>
.pos-container {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: #090d16;
}

/* Left Catalog */
.catalog-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.branch-context-strip {
  padding: 8px 20px;
  background: rgba(16, 185, 129, 0.08);
  border-bottom: 1px solid rgba(16, 185, 129, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.branch-context-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.branch-icon-pin {
  color: #10b981;
}

.branch-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #10b981;
}

.branch-name {
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
}

.branch-code-badge {
  font-family: monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.btn-manage-branches-link {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: color 0.15s ease;
}

.btn-manage-branches-link:hover {
  color: #10b981;
}

.filter-header {
  padding: 16px 20px;
  background: rgba(17, 24, 39, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: #64748b;
}

.search-input {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px 14px 12px 42px;
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.2);
}

.clear-btn {
  position: absolute;
  right: 12px;
  background: transparent;
  color: #94a3b8;
  font-size: 18px;
}

.category-pills {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.cat-pill {
  padding: 8px 16px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.15s ease;
}

.cat-pill:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.cat-pill.active {
  background: #f59e0b;
  color: #111827;
  border-color: #f59e0b;
  font-weight: 800;
  box-shadow: 0 2px 10px rgba(245, 158, 11, 0.35);
}

.products-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.drinks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.drink-card {
  position: relative;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 140px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.drink-card:hover {
  transform: translateY(-3px);
  border-color: rgba(245, 158, 11, 0.5);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.drink-card:active {
  transform: scale(0.97);
}

.card-alcohol {
  border-left: 3px solid #ef4444;
}

.alcohol-pill {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 9px;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.drink-category {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 4px;
}

.drink-name {
  font-size: 15px;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.3;
  margin-bottom: 4px;
}

.drink-volume {
  font-size: 11px;
  color: #94a3b8;
}

.drink-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 12px;
}

.price-tag {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.price-tag .currency {
  font-size: 11px;
  font-weight: 700;
  color: #fbbf24;
}

.price-tag .amount {
  font-size: 18px;
  font-weight: 900;
  color: #fff;
}

.stock-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.stock-ok {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.stock-low {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* Right Cart Panel */
.cart-panel {
  width: 420px;
  display: flex;
  flex-direction: column;
  background: #0f172a;
}

.cart-header {
  padding: 18px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cart-title {
  font-size: 17px;
  font-weight: 800;
  color: #f8fafc;
}

.cart-meta {
  font-size: 12px;
  color: #94a3b8;
}

.tab-indicator strong {
  color: #fbbf24;
}

.tab-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-deselect-tab {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  margin-left: 4px;
  transition: all 0.15s ease;
}

.btn-deselect-tab:hover {
  background: rgba(239, 68, 68, 0.35);
  color: #fff;
}

.walkin-tag {
  color: #94a3b8;
  font-size: 11.5px;
}

.tab-round-box {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.tab-round-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.round-desc {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #e2e8f0;
}

.round-desc strong {
  color: #fbbf24;
}

.btn-switch-walkin {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-switch-walkin:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.btn-save-round {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
  transition: all 0.2s;
}

.btn-save-round:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.5);
}

.btn-save-round:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cart-header-actions {
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
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-quick-sales:hover {
  background: rgba(245, 158, 11, 0.28);
  border-color: #f59e0b;
  color: #fff;
  transform: translateY(-1px);
}

.btn-clear-cart {
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
  transition: all 0.2s ease;
}

.btn-clear-cart:hover {
  background: rgba(239, 68, 68, 0.3);
}

.management-oversight-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(59, 130, 246, 0.12);
  border-bottom: 1px solid rgba(59, 130, 246, 0.3);
  padding: 12px 16px;
  color: #bfdbfe;
}

.management-oversight-banner .oversight-icon {
  color: #60a5fa;
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
  color: #93c5fd;
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

.alcohol-cart-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(239, 68, 68, 0.15);
  border-bottom: 1px solid rgba(239, 68, 68, 0.3);
  padding: 10px 16px;
  color: #fca5a5;
  font-size: 12px;
}

.warning-icon {
  color: #ef4444;
  flex-shrink: 0;
}

.cart-items-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-cart {
  text-align: center;
  padding: 64px 20px;
  color: #64748b;
}

.empty-cart-icon {
  margin: 0 auto 12px;
  color: #334155;
}

.ticket-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 10px 12px;
}

.item-info {
  flex: 1;
}

.item-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-title {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
}

.mini-alcohol-badge {
  font-size: 8px;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.25);
  color: #f87171;
}

.item-subprice {
  font-size: 11px;
  color: #94a3b8;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #1e293b;
  border-radius: 8px;
  padding: 2px 4px;
}

.step-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: transparent;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.step-qty {
  font-size: 13px;
  font-weight: 800;
  color: #fbbf24;
  min-width: 18px;
  text-align: center;
}

.item-subtotal {
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
  min-width: 65px;
  text-align: right;
}

.btn-void-item {
  padding: 6px;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  transition: all 0.15s ease;
}

.btn-void-item:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
}

.cart-footer {
  padding: 16px 20px;
  background: #0b0f19;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.summary-breakdown {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #94a3b8;
}

.summary-row.total-row {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 8px;
  font-size: 16px;
  font-weight: 900;
  color: #fff;
}

.total-val {
  font-size: 22px;
  font-weight: 900;
  color: #fbbf24;
}

.checkout-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.btn-pay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 6px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 800;
  transition: all 0.2s ease;
}

.btn-pay:hover:not(:disabled) {
  transform: translateY(-2px);
}

.btn-pay:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-cash {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
}

.btn-momo {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
}

.btn-split {
  grid-column: span 1;
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-tab-action {
  grid-column: span 1;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.grid-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(245, 158, 11, 0.2);
  border-top-color: #f59e0b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Drink Card Status & Badges */
.drink-card.in-cart {
  border-color: rgba(16, 185, 129, 0.6);
  background: linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, #111827 100%);
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.2);
}

.drink-card.out-of-stock {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.6);
}

.drink-card-top-badges {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 8px;
}

.in-cart-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
  letter-spacing: 0.02em;
}

.split-sale-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 10px;
}

.btn-split-unit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-split-unit:hover {
  background: rgba(245, 158, 11, 0.25);
  border-color: #f59e0b;
  color: #ffffff;
}

.btn-split-unit.btn-peg:hover {
  background: rgba(99, 102, 241, 0.25);
  border-color: #818cf8;
  color: #ffffff;
}

.mini-split-badge {
  font-size: 9px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.35);
}

.mini-bottle-badge {
  font-size: 9px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.stock-empty {
  background: rgba(239, 68, 68, 0.25);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.order-notes-section {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.order-note-input {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #ffffff;
  font-size: 12px;
  outline: none;
  transition: all 0.2s;
}

.order-note-input:focus {
  border-color: #f59e0b;
  background: rgba(255, 255, 255, 0.07);
}

.btn-close-mobile-cart {
  display: none;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
}

.btn-close-mobile-cart:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.mobile-bottom-bar {
  display: none;
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #ffffff;
  padding: 12px 18px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(245, 158, 11, 0.45);
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  z-index: 1000;
  animation: bar-pop 0.25s ease-out;
}

@keyframes bar-pop {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.mobile-bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mobile-count-pill {
  background: #ffffff;
  color: #d97706;
  font-weight: 900;
  font-size: 13px;
  padding: 2px 10px;
  border-radius: 999px;
}

.mobile-bar-total {
  font-size: 15px;
  font-weight: 800;
}

.mobile-bar-sub {
  font-size: 11px;
  opacity: 0.85;
}

.mobile-bar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}

.mobile-cart-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1150;
  animation: fade-in 0.2s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Responsive Breakpoints */
@media (max-width: 900px) {
  .pos-container {
    position: relative;
    flex-direction: column;
  }

  .catalog-panel {
    border-right: none;
    height: 100%;
    padding-bottom: 74px; /* clearance for floating mobile bar */
  }

  .drinks-grid {
    grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
    gap: 12px;
  }

  .cart-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: 440px;
    z-index: 1200;
    box-shadow: -10px 0 35px rgba(0, 0, 0, 0.7);
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .cart-panel.mobile-open {
    transform: translateX(0);
  }

  .btn-close-mobile-cart {
    display: flex;
  }

  .mobile-bottom-bar {
    display: flex;
  }
}

/* Light Theme Support */
:root[data-theme="light"] .drink-card {
  background: #ffffff;
  border-color: #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

:root[data-theme="light"] .drink-name {
  color: #0f172a;
}

:root[data-theme="light"] .price-tag .amount {
  color: #0f172a;
}

:root[data-theme="light"] .drink-card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border-color: #f59e0b;
}

:root[data-theme="light"] .btn-split-unit {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #334155;
}

:root[data-theme="light"] .order-note-input {
  background: #ffffff;
  border-color: #cbd5e1;
  color: #0f172a;
}

:root[data-theme="light"] .cart-panel {
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
}

:root[data-theme="light"] .cart-title,
:root[data-theme="light"] .item-title,
:root[data-theme="light"] .item-subtotal {
  color: #0f172a;
}

:root[data-theme="light"] .ticket-item {
  background: #f8fafc;
  border-color: #e2e8f0;
}

:root[data-theme="light"] .stepper {
  background: #e2e8f0;
}

:root[data-theme="light"] .step-btn {
  color: #334155;
}

:root[data-theme="light"] .cart-footer {
  background: #f8fafc;
  border-top-color: #e2e8f0;
}

:root[data-theme="light"] .summary-row.total-row {
  color: #0f172a;
}

.split-price-sub {
  font-size: 10px;
  color: #38bdf8;
  font-weight: 700;
  margin-left: 4px;
}

.stock-pieces-sub {
  font-size: 9.5px;
  opacity: 0.8;
  display: block;
}
</style>
