<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  Wine, Beer, GlassWater, Sparkles, Search, Plus, Minus, 
  Trash2, AlertTriangle, ShieldAlert, ShieldCheck, CreditCard, Banknote, 
  Smartphone, Split, Layers, Percent, CheckCircle
} from 'lucide-vue-next'

const categories = ref([])
const products = ref([])
const selectedCategory = ref(null)
const searchQuery = ref('')
const loading = ref(true)

const fetchCategories = async () => {
  try {
    const response = await api.get('/catalog/categories/')
    categories.value = response.data.results || response.data
  } catch (err) {
    console.error('Error fetching categories:', err)
  }
}

const fetchProducts = async () => {
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

// Voiding a line item from current cart
const requestVoidItem = (item) => {
  if (store.isBarManager || store.isOwner) {
    // Current user is already a manager or owner
    store.removeFromCart(item.product.id)
    store.showToast(`Voided ${item.product.name}`, 'info')
  } else {
    // Requires Manager PIN authorization!
    store.openPinModal({
      action: 'VOID_ITEM',
      title: `Authorize Void Item`,
      subtitle: `Manager PIN required to void ${item.quantity}x ${item.product.name}`,
      context: { product_id: item.product.id, product_name: item.product.name, quantity: item.quantity },
      onSuccess: (authData) => {
        store.removeFromCart(item.product.id)
        store.showToast(`Void approved by ${authData.approver_name}`, 'success')
      }
    })
  }
}

const handleDrinkClick = (drink) => {
  if (!store.canRecordSales) {
    store.showToast('Sales recording is strictly reserved for frontline Bartenders. Managers and Owners perform oversight and reporting only.', 'warning')
    return
  }
  store.addToCart(drink)
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

  // 1. NON-BYPASSABLE AGE CHECK
  if (store.cartHasAlcohol && !store.isAgeVerified) {
    store.activeModal = 'age_verification'
    return
  }

  // 2. Open Payment Modal
  store.activeModal = 'payment'
}

onMounted(() => {
  fetchCategories()
  fetchProducts()
})
</script>

<template>
  <div class="pos-container">
    <!-- LEFT: CATALOG & TOUCH DRINK TILES -->
    <div class="catalog-panel">
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
            :class="{ 'card-alcohol': drink.is_alcoholic }"
            @click="handleDrinkClick(drink)"
          >
            <!-- Alcoholic 18+ Warning Badge -->
            <div v-if="drink.is_alcoholic" class="alcohol-pill" title="Age 18+ Required">
              <span>18+ ALCOHOL</span>
            </div>

            <div class="drink-content">
              <div class="drink-category">{{ drink.category_name || 'Bar Drink' }}</div>
              <h4 class="drink-name">{{ drink.name }}</h4>
              <div v-if="drink.volume_ml" class="drink-volume">{{ drink.volume_ml }}ml</div>
            </div>

            <div class="drink-footer">
              <div class="price-tag">
                <span class="currency">TSH</span>
                <span class="amount">{{ parseFloat(drink.selling_price).toFixed(2) }}</span>
              </div>

              <div 
                class="stock-badge"
                :class="Number(drink.stock_quantity) <= Number(drink.reorder_threshold) ? 'stock-low' : 'stock-ok'"
              >
                {{ Number(drink.stock_quantity).toFixed(0) }} left
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT: ORDER CART & TICKET PANEL -->
    <div class="cart-panel">
      <!-- Cart Header -->
      <div class="cart-header">
        <div>
          <h3 class="cart-title">Current Order</h3>
          <div class="cart-meta">
            <span class="item-count">{{ store.cartItemCount }} items</span>
            <span v-if="store.selectedTab" class="tab-indicator">
              &bull; Tab: <strong>{{ store.selectedTab.tab_name }}</strong>
            </span>
          </div>
        </div>

        <button 
          v-if="store.cart.length > 0" 
          class="btn-clear-cart"
          title="Clear Cart"
          @click="store.clearCart"
        >
          <Trash2 :size="16" />
        </button>
      </div>

      <!-- Management Oversight Banner -->
      <div v-if="!store.canRecordSales" class="management-oversight-banner">
        <ShieldCheck :size="20" class="oversight-icon" />
        <div class="oversight-text">
          <div class="oversight-title">Management Oversight Mode</div>
          <div class="oversight-desc">
            Signed in as <strong>{{ store.user?.first_name || store.user?.username }} ({{ store.user?.role?.toUpperCase() }})</strong>.
            Sales recording is reserved for frontline Bartenders. Use the left sidebar to access Reports, Stock, Shift Oversight, and Audits.
          </div>
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
          :key="item.product.id"
          class="ticket-item"
        >
          <div class="item-info">
            <div class="item-top">
              <span class="item-title">{{ item.product.name }}</span>
              <span v-if="item.product.is_alcoholic" class="mini-alcohol-badge">18+</span>
            </div>
            <div class="item-subprice">TSH {{ parseFloat(item.product.selling_price).toFixed(2) }} each</div>
          </div>

          <!-- Quantity Stepper -->
          <div class="stepper">
            <button class="step-btn" @click="store.updateCartQuantity(item.product.id, -1)">
              <Minus :size="14" />
            </button>
            <span class="step-qty">{{ item.quantity }}</span>
            <button class="step-btn" @click="store.updateCartQuantity(item.product.id, 1)">
              <Plus :size="14" />
            </button>
          </div>

          <!-- Line Subtotal -->
          <div class="item-subtotal">
            TSH {{ (parseFloat(item.product.selling_price) * item.quantity).toFixed(2) }}
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
</style>
