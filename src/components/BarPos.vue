<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { store } from '../store'
import api from '../api'
import {
  Wine, GlassWater, Search, Plus, Minus, Trash2, ShieldAlert,
  ShieldCheck, Banknote, Smartphone, Split, Layers, Boxes, Receipt,
  BookmarkCheck, X, Check, Package, LayoutDashboard, ShoppingCart,
  ChevronRight
} from 'lucide-vue-next'

const isSw = computed(() => store.locale === 'sw')
const categories = ref([])
const products = ref([])
const selectedCategory = ref(null)
const searchQuery = ref('')
const loading = ref(true)
const isMobileCartOpen = ref(false)
const isSavingRound = ref(false)

const fmt = (val) => {
  const n = parseFloat(val || 0)
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : '0'
}

const fmtMoney = (val) => {
  const n = parseFloat(val || 0)
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'
}

const getDrinkCartCount = (drinkId) => {
  return store.cart
    .filter(item => item.product.id === drinkId)
    .reduce((sum, item) => sum + item.quantity, 0)
}

const fetchCategories = async () => {
  if (!store.isAuthenticated) return
  try {
    const response = await api.get('/catalog/categories/', { params: { _t: Date.now() } })
    categories.value = response.data.results || response.data
  } catch (err) {
    console.error('Error fetching categories:', err)
  }
}

const fetchProducts = async () => {
  if (!store.isAuthenticated) return
  loading.value = true
  try {
    const params = { _t: Date.now() }
    if (selectedCategory.value) params.category = selectedCategory.value
    if (searchQuery.value) params.search = searchQuery.value
    const response = await api.get('/catalog/products/', { params })
    products.value = response.data.results || response.data
  } catch (err) {
    console.error('Error fetching products:', err)
  } finally {
    loading.value = false
  }
}

watch([selectedCategory, searchQuery], () => {
  fetchProducts()
})

watch(() => store.activeUnit, () => {
  fetchCategories()
  fetchProducts()
})

watch(() => store.activeBranchId, () => {
  selectedCategory.value = null
  fetchCategories()
  fetchProducts()
})

watch(() => store.lastSaleAt, () => {
  fetchProducts()
})

const requestVoidItem = (item) => {
  if (store.isBarManager || store.isOwner) {
    store.removeFromCart(item.product.id, item.is_pack_sale)
    store.showToast(`Voided ${item.product.name} from ticket`, 'info')
  } else {
    store.openPinModal({
      action: 'VOID_ITEM',
      title: 'Authorize Void Item',
      subtitle: `Manager PIN required to void ${item.quantity}x ${item.product.name}`,
      context: { product_id: item.product.id, product_name: item.product.name, quantity: item.quantity },
      onSuccess: (authData) => {
        store.removeFromCart(item.product.id, item.is_pack_sale)
        store.showToast(`Void approved by ${authData.approver_name}`, 'success')
      }
    })
  }
}

const handleDrinkClick = (drink, isPack = true) => {
  if (!store.canRecordSales) {
    store.showToast(
      isSw.value
        ? 'Mauzo hufanywa na Wahudumu wa Baa pekee. Wasimamizi hutazama ripoti na stoo.'
        : 'Sales recording is strictly reserved for frontline Bartenders. Managers and Owners perform oversight and reporting only.',
      'warning'
    )
    return
  }
  store.addToCart(drink, 1, isPack)
}

const requestClearCart = async () => {
  if (store.cart.length === 0) return
  const confirmed = await store.confirm({
    title: isSw.value ? 'Futa Orodha ya Oda?' : 'Clear Order Ticket?',
    message: isSw.value
      ? `Hii itaondoa vinywaji vyote ${store.cartItemCount} kutoka kwenye oda ya sasa.`
      : `This will remove all ${store.cartItemCount} drink(s) from the current ticket.`,
    confirmText: isSw.value ? 'Futa Oda' : 'Clear Ticket',
    cancelText: isSw.value ? 'Ghairi' : 'Cancel',
    variant: 'warning'
  })
  if (confirmed) {
    store.clearCart()
    store.showToast('Order ticket cleared.', 'info')
  }
}

const handleProceedToPayment = () => {
  if (!store.canRecordSales) {
    store.showToast('Sales recording is strictly reserved for frontline Bartenders.', 'warning')
    return
  }
  if (store.cart.length === 0) {
    store.showToast('Order ticket is empty.', 'warning')
    return
  }
  if (store.cartHasAlcohol && !store.isAgeVerified) {
    store.activeModal = 'age_verification'
    return
  }
  store.activeModal = 'payment'
}

const handleSaveRoundToTab = async () => {
  if (!store.canRecordSales) {
    store.showToast('Sales recording is strictly reserved for frontline Bartenders.', 'warning')
    return
  }
  if (!store.selectedTab) {
    store.showToast('No active tab selected.', 'warning')
    return
  }
  if (store.cart.length === 0) {
    store.showToast('Add drinks to the ticket before saving a round.', 'warning')
    return
  }
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
    store.notifySaleCompleted()
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
  <div class="bar-pos-page" :data-theme="store.theme">
    <!-- LEFT: DRINKS CATALOG -->
    <section class="catalog-section">
      <!-- Top Quick Navigation Strip -->
      <div class="pos-top-bar">
        <div class="quick-nav-actions">
          <button type="button" class="btn-quick-nav" @click="store.activeModal = null">
            <LayoutDashboard :size="14" />
            <span>{{ isSw ? 'Dashibodi' : 'Dashboard' }}</span>
          </button>
          <button type="button" class="btn-quick-nav" @click="store.activeModal = 'tabs'">
            <Layers :size="14" />
            <span>{{ store.selectedTab ? `Tab: ${store.selectedTab.tab_name}` : (isSw ? 'Bili za Meza (Tabs)' : 'Open Tabs') }}</span>
          </button>
          <button type="button" class="btn-quick-nav" @click="store.activeModal = 'sales_records'">
            <Receipt :size="14" />
            <span>{{ store.isManagement ? (isSw ? 'Kumbukumbu za Mauzo' : 'Sales Records') : (isSw ? 'Mauzo Yangu' : 'My Sales') }}</span>
          </button>
          <button
            v-if="store.isOwner || store.isBarManager"
            type="button"
            class="btn-quick-nav"
            @click="store.activeModal = 'catalog_management'"
          >
            <Plus :size="14" />
            <span>{{ isSw ? 'Sajili Kinywaji' : 'Register Drink' }}</span>
          </button>
        </div>
      </div>

      <!-- Search Input -->
      <div class="search-box">
        <Search :size="16" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="isSw ? 'Tafuta kinywaji kwa jina, SKU au chapa...' : 'Search drinks by name, SKU, or brand...'"
          class="search-input"
        />
        <button v-if="searchQuery" type="button" class="clear-btn" @click="searchQuery = ''">
          <X :size="14" />
        </button>
      </div>

      <!-- Category Filter Pills -->
      <div class="categories-strip">
        <button
          type="button"
          class="cat-chip"
          :class="{ active: selectedCategory === null }"
          @click="selectedCategory = null"
        >
          <Wine :size="13" />
          <span>{{ isSw ? 'Vinywaji Vyote' : 'All Drinks' }} ({{ products.length }})</span>
        </button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          class="cat-chip"
          :class="{ active: selectedCategory === cat.id }"
          @click="selectedCategory = cat.id"
        >
          <span>{{ cat.name }}</span>
        </button>
      </div>

      <!-- Drinks Grid -->
      <div class="products-container">
        <div v-if="loading" class="state-placeholder">
          <div class="spinner"></div>
          <p>{{ isSw ? 'Inapakia orodha ya vinywaji...' : 'Loading bar catalog...' }}</p>
        </div>

        <div v-else-if="products.length === 0" class="state-placeholder">
          <div class="empty-icon-wrap">
            <Wine :size="28" />
          </div>
          <h3>{{ isSw ? 'Hakuna Vinywaji Vilivyopatikana' : 'No Drinks Found' }}</h3>
          <p>{{ isSw ? 'Sajili vinywaji vipya au badilisha kichujio chako cha utafutaji.' : 'Register drinks in the catalog or adjust your search filter.' }}</p>
          <button
            v-if="store.isOwner || store.isBarManager"
            type="button"
            class="btn-empty-cta"
            @click="store.activeModal = 'catalog_management'"
          >
            <Plus :size="15" />
            <span>{{ isSw ? 'Sajili Kinywaji' : 'Register Drink' }}</span>
          </button>
        </div>

        <div v-else class="drinks-grid">
          <div
            v-for="drink in products"
            :key="drink.id"
            class="drink-card"
            :class="{
              'in-cart': getDrinkCartCount(drink.id) > 0,
              'out-of-stock': Number(drink.stock_quantity) <= 0
            }"
          >
            <!-- Top Row: Name, Category, Badges -->
            <div class="dcard-head">
              <div class="dcard-title-wrap">
                <h4 class="dcard-name" :title="drink.name">{{ drink.name }}</h4>
                <div class="dcard-meta-row">
                  <span class="dcard-cat-chip">{{ drink.category_name || (isSw ? 'Kinywaji' : 'Beverage') }}</span>
                  <span v-if="drink.volume_ml" class="dcard-vol-chip">{{ drink.volume_ml }}ml</span>
                  <span v-if="drink.is_pack" class="dcard-pack-chip">
                    <Package :size="11" />
                    <span>{{ drink.pack_name || 'Crate' }} · {{ drink.pack_unit_ratio }}</span>
                  </span>
                </div>
              </div>

              <div class="dcard-right-badges">
                <span v-if="getDrinkCartCount(drink.id) > 0" class="in-cart-pill">
                  <Check :size="11" />
                  <span>{{ getDrinkCartCount(drink.id) }}</span>
                </span>
                <span v-if="drink.is_alcoholic" class="alc-pill">18+</span>
              </div>
            </div>

            <!-- Pricing Panel -->
            <div class="dcard-pricing">
              <div class="dcard-price-row">
                <span class="dcard-price-label">
                  {{ drink.is_pack ? (drink.pack_name || 'Crate') : (isSw ? 'Bei' : 'Price') }}
                </span>
                <strong class="dcard-price-main">TSH {{ fmt(drink.selling_price) }}</strong>
              </div>
              <div v-if="drink.is_pack && drink.allow_split_sale" class="dcard-split-row">
                <span class="dcard-split-label">
                  {{ isSw ? 'Kipande 1' : 'Single' }} {{ drink.unit_name || 'Bottle' }}
                </span>
                <strong class="dcard-split-val">
                  TSH {{ fmt(drink.split_unit_price || (parseFloat(drink.selling_price || 0) / Math.max(1, parseInt(drink.pack_unit_ratio || 1, 10)))) }}
                </strong>
              </div>
            </div>

            <!-- Stock Meter -->
            <div class="dcard-stock-row">
              <div class="dcard-meter-track">
                <div
                  class="dcard-meter-fill"
                  :class="Number(drink.stock_quantity) <= Number(drink.reorder_threshold) ? 'fill-low' : 'fill-ok'"
                  :style="{ width: `${Math.min(100, (Number(drink.stock_quantity || 0) / Math.max(1, Number(drink.reorder_threshold || 5) * 3)) * 100)}%` }"
                ></div>
              </div>
              <span
                class="dcard-stock-label"
                :class="{ 'is-low': Number(drink.stock_quantity) <= Number(drink.reorder_threshold) }"
              >
                <template v-if="Number(drink.stock_quantity) <= 0">
                  {{ isSw ? 'Imeisha' : 'Out of stock' }}
                </template>
                <template v-else-if="drink.is_pack">
                  {{ Math.floor(Number(drink.stock_quantity)) }} {{ drink.pack_name || 'Crate' }}
                  <span v-if="drink.pack_unit_ratio > 1">({{ Math.round(Number(drink.stock_quantity) * drink.pack_unit_ratio) }} {{ drink.unit_name || 'btls' }})</span>
                </template>
                <template v-else>
                  {{ Number(drink.stock_quantity).toFixed(0) }} {{ isSw ? 'imebaki' : 'left' }}
                </template>
              </span>
            </div>

            <!-- Action Buttons -->
            <div class="dcard-actions">
              <template v-if="drink.is_pack && drink.allow_split_sale">
                <button
                  type="button"
                  class="btn-dcard btn-dcard-primary"
                  :disabled="Number(drink.stock_quantity) <= 0"
                  @click="handleDrinkClick(drink, true)"
                >
                  <Package :size="14" />
                  <span>{{ drink.pack_name || 'Crate' }}</span>
                </button>
                <button
                  type="button"
                  class="btn-dcard btn-dcard-secondary"
                  :disabled="Number(drink.stock_quantity) <= 0"
                  @click="handleDrinkClick(drink, false)"
                >
                  <Wine v-if="drink.is_alcoholic" :size="14" />
                  <GlassWater v-else :size="14" />
                  <span>1 {{ drink.unit_name || 'Bottle' }}</span>
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="btn-dcard btn-dcard-primary"
                  :disabled="Number(drink.stock_quantity) <= 0"
                  @click="handleDrinkClick(drink, true)"
                >
                  <Plus :size="15" />
                  <span>{{ isSw ? 'Ongeza Kwenye Oda' : 'Add to Order' }}</span>
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- RIGHT: ORDER TICKET PANEL -->
    <aside class="ticket-section" :class="{ 'mobile-open': isMobileCartOpen }">
      <div class="ticket-header">
        <div class="ticket-title-group">
          <div class="ticket-icon-box">
            <ShoppingCart :size="18" />
          </div>
          <div>
            <h3>{{ isSw ? 'Oda ya Sasa' : 'Current Order' }}</h3>
            <span class="ticket-sub">
              {{ store.cartItemCount }} {{ isSw ? 'vinywaji' : 'item(s)' }} ·
              <template v-if="store.selectedTab">
                <strong>Tab: {{ store.selectedTab.tab_name }}</strong>
              </template>
              <template v-else>
                {{ isSw ? 'Mauzo ya Moja kwa Moja' : 'Walk-in Counter Sale' }}
              </template>
            </span>
          </div>
        </div>

        <div class="ticket-header-actions">
          <button
            v-if="store.cart.length > 0"
            type="button"
            class="btn-icon-danger"
            :title="isSw ? 'Futa Oda' : 'Clear Order'"
            @click="requestClearCart"
          >
            <Trash2 :size="15" />
          </button>
          <button
            type="button"
            class="btn-close-mobile-cart"
            @click="isMobileCartOpen = false"
          >
            <X :size="18" />
          </button>
        </div>
      </div>

      <!-- Role Oversight Banner -->
      <div v-if="!store.canRecordSales" class="oversight-banner">
        <Boxes v-if="store.isStockClerk" :size="18" class="oversight-icon" />
        <ShieldCheck v-else :size="18" class="oversight-icon" />
        <div class="oversight-copy">
          <strong>{{ store.isStockClerk ? (isSw ? 'Hali ya Karani wa Stoo' : 'Stock Clerk Mode') : (isSw ? 'Hali ya Usimamizi' : 'Management Oversight Mode') }}</strong>
          <p>
            {{ isSw
              ? `Umeingia kama @${store.user?.username} (${store.user?.role?.toUpperCase()}). Mauzo ya kaunta hufanywa na Wahudumu wa Baa.`
              : `Signed in as @${store.user?.username} (${store.user?.role?.toUpperCase()}). Sales recording is reserved for frontline Bartenders.` }}
          </p>
        </div>
      </div>

      <!-- 18+ Alcohol Reminder -->
      <div v-if="store.cartHasAlcohol" class="alcohol-warning">
        <ShieldAlert :size="16" />
        <span>
          <strong>{{ isSw ? 'Kilevi Kwenye Oda:' : 'Alcohol in Ticket:' }}</strong>
          {{ isSw ? 'Uthibitisho wa umri (18+) utahitajika wakati wa malipo.' : 'Mandatory 18+ age check will be prompted at checkout.' }}
        </span>
      </div>

      <!-- Cart Items -->
      <div class="ticket-items">
        <div v-if="store.cart.length === 0" class="empty-ticket">
          <Wine :size="36" class="empty-ticket-icon" />
          <strong>{{ isSw ? 'Oda Iko Wazi' : 'Order Ticket is Empty' }}</strong>
          <span>{{ isSw ? 'Gusa kinywaji chochote kuongeza kwenye oda.' : 'Tap any drink from the catalog to add it here.' }}</span>
        </div>

        <div
          v-for="item in store.cart"
          :key="`${item.product.id}-${item.is_pack_sale}`"
          class="ticket-item-card"
        >
          <div class="ti-top">
            <div class="ti-info">
              <strong class="ti-name">{{ item.product.name }}</strong>
              <div class="ti-badges">
                <span v-if="item.is_pack_sale === false" class="ti-chip">1 {{ item.product.unit_name || 'Bottle' }}</span>
                <span v-else-if="item.product.is_pack" class="ti-chip">{{ item.product.pack_name || 'Crate' }}</span>
                <span v-if="item.product.is_alcoholic" class="ti-chip alc">18+</span>
                <span class="ti-unit-price">TSH {{ fmt(item.unit_price) }}</span>
              </div>
            </div>
            <button type="button" class="btn-void" @click="requestVoidItem(item)" title="Void Item">
              <Trash2 :size="14" />
            </button>
          </div>

          <div class="ti-bottom">
            <div class="qty-stepper">
              <button type="button" class="step-btn" @click="store.updateCartQuantity(item.product.id, -1, item.is_pack_sale)">
                <Minus :size="13" />
              </button>
              <span class="step-qty">{{ item.quantity }}</span>
              <button type="button" class="step-btn" @click="store.updateCartQuantity(item.product.id, 1, item.is_pack_sale)">
                <Plus :size="13" />
              </button>
            </div>
            <strong class="ti-subtotal">TSH {{ fmtMoney(parseFloat(item.unit_price) * item.quantity) }}</strong>
          </div>
        </div>
      </div>

      <!-- Order Notes -->
      <div v-if="store.cart.length > 0" class="notes-wrap">
        <input
          v-model="store.orderNotes"
          type="text"
          :placeholder="isSw ? 'Namba ya meza au maelezo (mf. Meza 4, Barafu)...' : 'Table # or note (e.g. Table 4, VIP Lounge, Extra ice)...'"
          class="note-input"
        />
      </div>

      <!-- Checkout Footer -->
      <div class="ticket-footer">
        <div class="total-row">
          <span>{{ isSw ? 'Jumla ya Kulipa' : 'Total Due' }}</span>
          <strong>TSH {{ fmtMoney(store.cartSubtotal) }}</strong>
        </div>

        <!-- Active Tab Round Box -->
        <div v-if="store.selectedTab" class="tab-round-box">
          <div class="tab-round-head">
            <span>{{ isSw ? 'Bili:' : 'Tab:' }} <strong>{{ store.selectedTab.tab_name }}</strong></span>
            <button type="button" class="btn-deselect-tab" @click="store.selectedTab = null">
              {{ isSw ? 'Badili kuwa Walk-in' : 'Switch to Walk-in' }}
            </button>
          </div>
          <button
            type="button"
            class="btn-save-round"
            :disabled="store.cart.length === 0 || !store.canRecordSales || isSavingRound"
            @click="handleSaveRoundToTab"
          >
            <BookmarkCheck :size="16" />
            <span>{{ isSavingRound ? (isSw ? 'Inahifadhi...' : 'Saving...') : (isSw ? `Hifadhi kwenye ${store.selectedTab.tab_name}` : `Save Round to ${store.selectedTab.tab_name}`) }}</span>
          </button>
        </div>

        <!-- Primary Payment & Tabs CTAs -->
        <div class="checkout-btns">
          <button
            type="button"
            class="btn-checkout-primary"
            :disabled="store.cart.length === 0 || !store.canRecordSales"
            @click="handleProceedToPayment"
          >
            <Banknote :size="17" />
            <span>{{ isSw ? 'Endelea na Malipo' : 'Proceed to Payment' }}</span>
            <ChevronRight :size="16" />
          </button>

          <button
            type="button"
            class="btn-checkout-secondary"
            :disabled="!store.canRecordSales && !store.isBarManager && !store.isOwner"
            @click="store.activeModal = 'tabs'"
          >
            <Layers :size="15" />
            <span>{{ store.selectedTab ? `Tab: ${store.selectedTab.tab_name}` : (isSw ? 'Bili za Meza (Open Tabs)' : 'Open Bar Tabs') }}</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Mobile Floating Cart Bar -->
    <button
      v-if="store.cartItemCount > 0 && !isMobileCartOpen"
      type="button"
      class="mobile-cart-fab"
      @click="isMobileCartOpen = true"
    >
      <span class="fab-left">
        <ShoppingCart :size="17" />
        <span>{{ store.cartItemCount }} {{ isSw ? 'vinywaji' : 'item(s)' }}</span>
      </span>
      <strong>TSH {{ fmtMoney(store.cartSubtotal) }}</strong>
    </button>
  </div>
</template>

<style scoped>
.bar-pos-page {
  --bp-bg: #0b1120;
  --bp-surface: #111827;
  --bp-card: #111827;
  --bp-elevated: #1e293b;
  --bp-input: #0f172a;
  --bp-border: rgba(148, 163, 184, 0.16);
  --bp-border-strong: rgba(148, 163, 184, 0.28);
  --bp-text: #f8fafc;
  --bp-text-sec: #cbd5e1;
  --bp-muted: #94a3b8;
  --bp-accent: #6366f1;
  --bp-accent-hover: #4f46e5;
  --bp-accent-soft: rgba(99, 102, 241, 0.16);
  --bp-positive: #34d399;
  --bp-positive-soft: rgba(16, 185, 129, 0.14);
  --bp-danger: #fb7185;
  --bp-danger-soft: rgba(239, 68, 68, 0.14);
  --bp-shadow: 0 2px 10px rgba(0, 0, 0, 0.24);

  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  gap: 20px;
  padding: 20px 24px 56px;
  min-height: 100vh;
  background: var(--bp-bg);
  color: var(--bp-text);
  align-items: start;
}

.bar-pos-page[data-theme="light"] {
  --bp-bg: #f8fafc;
  --bp-surface: #ffffff;
  --bp-card: #ffffff;
  --bp-elevated: #f8fafc;
  --bp-input: #ffffff;
  --bp-border: #e2e8f0;
  --bp-border-strong: #cbd5e1;
  --bp-text: #0f172a;
  --bp-text-sec: #334155;
  --bp-muted: #64748b;
  --bp-accent: #4f46e5;
  --bp-accent-hover: #4338ca;
  --bp-accent-soft: #eef2ff;
  --bp-positive: #059669;
  --bp-positive-soft: #ecfdf5;
  --bp-danger: #dc2626;
  --bp-danger-soft: #fef2f2;
  --bp-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.03);
}

.catalog-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.quick-nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-quick-nav {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 13px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  background: var(--bp-surface);
  border: 1px solid var(--bp-border);
  color: var(--bp-text-sec);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-quick-nav:hover {
  border-color: var(--bp-accent);
  color: var(--bp-accent);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bp-input);
  border: 1px solid var(--bp-border-strong);
  border-radius: 12px;
  padding: 0 12px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.search-box:focus-within {
  border-color: var(--bp-accent);
  box-shadow: 0 0 0 3px var(--bp-accent-soft);
}

.search-icon {
  color: var(--bp-muted);
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  border: none;
  background: transparent;
  padding: 11px 10px;
  color: var(--bp-text);
  font-size: 0.88rem;
  outline: none;
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--bp-muted);
  cursor: pointer;
  padding: 4px;
}

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
  background: var(--bp-surface);
  border: 1px solid var(--bp-border);
  color: var(--bp-text-sec);
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cat-chip.active {
  background: var(--bp-accent);
  border-color: var(--bp-accent);
  color: #ffffff;
}

/* Drink Cards Grid */
.drinks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
  gap: 14px;
}

.drink-card {
  background: var(--bp-card);
  border: 1px solid var(--bp-border);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--bp-shadow);
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.drink-card:hover {
  transform: translateY(-2px);
  border-color: var(--bp-accent);
}

.drink-card.in-cart {
  border-color: var(--bp-accent);
}

.drink-card.out-of-stock {
  opacity: 0.55;
}

.dcard-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.dcard-title-wrap {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dcard-name {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--bp-text);
  line-height: 1.3;
}

.dcard-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.dcard-cat-chip,
.dcard-vol-chip,
.dcard-pack-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--bp-elevated);
  border: 1px solid var(--bp-border);
  color: var(--bp-muted);
}

.dcard-right-badges {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.in-cart-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--bp-accent);
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 800;
}

.alc-pill {
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--bp-danger-soft);
  color: var(--bp-danger);
  font-size: 0.68rem;
  font-weight: 800;
}

.dcard-pricing {
  background: var(--bp-elevated);
  border: 1px solid var(--bp-border);
  border-radius: 12px;
  padding: 11px 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.dcard-price-row,
.dcard-split-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.dcard-split-row {
  padding-top: 7px;
  border-top: 1px dashed var(--bp-border-strong);
}

.dcard-price-label,
.dcard-split-label {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--bp-muted);
}

.dcard-price-main {
  font-size: 1.08rem;
  font-weight: 800;
  color: var(--bp-text);
  font-variant-numeric: tabular-nums;
}

.dcard-split-val {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--bp-accent);
  font-variant-numeric: tabular-nums;
}

.dcard-stock-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dcard-meter-track {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: var(--bp-elevated);
  overflow: hidden;
}

.dcard-meter-fill {
  height: 100%;
  border-radius: 999px;
}

.dcard-meter-fill.fill-ok { background: var(--bp-positive); }
.dcard-meter-fill.fill-low { background: var(--bp-danger); }

.dcard-stock-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--bp-muted);
  white-space: nowrap;
}

.dcard-stock-label.is-low {
  color: var(--bp-danger);
  font-weight: 700;
}

.dcard-actions {
  margin-top: auto;
  display: flex;
  gap: 8px;
}

.btn-dcard {
  flex: 1;
  padding: 9px 10px;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-dcard:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-dcard-primary {
  background: var(--bp-accent);
  border: 1px solid var(--bp-accent);
  color: #ffffff;
}

.btn-dcard-primary:hover:not(:disabled) {
  background: var(--bp-accent-hover);
}

.btn-dcard-secondary {
  background: var(--bp-surface);
  border: 1px solid var(--bp-border-strong);
  color: var(--bp-text);
}

.btn-dcard-secondary:hover:not(:disabled) {
  border-color: var(--bp-accent);
  color: var(--bp-accent);
  background: var(--bp-accent-soft);
}

/* Empty & Loading States */
.state-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  min-height: 340px;
  max-width: 440px;
  margin: 24px auto;
  padding: 36px 24px;
  border-radius: 18px;
  background: var(--bp-surface);
  border: 1px dashed var(--bp-border-strong);
}

.empty-icon-wrap {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  background: var(--bp-accent-soft);
  color: var(--bp-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-placeholder h3 {
  margin: 0;
  font-size: 1.02rem;
  color: var(--bp-text);
}

.state-placeholder p {
  margin: 0;
  font-size: 0.84rem;
  color: var(--bp-muted);
}

.btn-empty-cta {
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 10px;
  border: none;
  background: var(--bp-accent);
  color: #ffffff;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--bp-border);
  border-top-color: var(--bp-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* RIGHT: ORDER TICKET PANEL */
.ticket-section {
  background: var(--bp-surface);
  border: 1px solid var(--bp-border);
  border-radius: 20px;
  box-shadow: var(--bp-shadow);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 72px;
  max-height: calc(100vh - 96px);
  overflow: hidden;
}

.ticket-header {
  padding: 16px 18px;
  border-bottom: 1px solid var(--bp-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ticket-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ticket-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--bp-accent-soft);
  color: var(--bp-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ticket-header h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 800;
  color: var(--bp-text);
}

.ticket-sub {
  font-size: 0.74rem;
  color: var(--bp-muted);
}

.ticket-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-icon-danger {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--bp-border);
  background: var(--bp-elevated);
  color: var(--bp-danger);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-close-mobile-cart {
  display: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--bp-border);
  background: var(--bp-elevated);
  color: var(--bp-text);
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.oversight-banner {
  margin: 12px 16px 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--bp-accent-soft);
  border: 1px solid rgba(79, 70, 229, 0.24);
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.oversight-icon {
  color: var(--bp-accent);
  flex-shrink: 0;
  margin-top: 2px;
}

.oversight-copy strong {
  display: block;
  font-size: 0.8rem;
  color: var(--bp-text);
}

.oversight-copy p {
  margin: 3px 0 0;
  font-size: 0.74rem;
  color: var(--bp-muted);
  line-height: 1.45;
}

.alcohol-warning {
  margin: 10px 16px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bp-danger-soft);
  border: 1px solid rgba(239, 68, 68, 0.28);
  color: var(--bp-danger);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ticket-items {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-ticket {
  margin: auto 0;
  padding: 36px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--bp-muted);
}

.empty-ticket-icon {
  opacity: 0.4;
  margin-bottom: 4px;
}

.empty-ticket strong {
  font-size: 0.92rem;
  color: var(--bp-text-sec);
}

.empty-ticket span {
  font-size: 0.78rem;
}

.ticket-item-card {
  background: var(--bp-elevated);
  border: 1px solid var(--bp-border);
  border-radius: 12px;
  padding: 11px 12px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.ti-top,
.ti-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ti-info {
  min-width: 0;
  flex: 1;
}

.ti-name {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--bp-text);
}

.ti-badges {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 3px;
}

.ti-chip {
  font-size: 0.67rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--bp-accent-soft);
  color: var(--bp-accent);
}

.ti-chip.alc {
  background: var(--bp-danger-soft);
  color: var(--bp-danger);
}

.ti-unit-price {
  font-size: 0.72rem;
  color: var(--bp-muted);
}

.btn-void {
  background: transparent;
  border: none;
  color: var(--bp-muted);
  cursor: pointer;
  padding: 4px;
}

.btn-void:hover {
  color: var(--bp-danger);
}

.qty-stepper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bp-surface);
  border: 1px solid var(--bp-border);
  border-radius: 8px;
  padding: 3px 6px;
}

.step-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: var(--bp-elevated);
  color: var(--bp-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.step-qty {
  font-size: 0.82rem;
  font-weight: 800;
  min-width: 18px;
  text-align: center;
}

.ti-subtotal {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--bp-text);
  font-variant-numeric: tabular-nums;
}

.notes-wrap {
  padding: 0 16px 10px;
}

.note-input {
  width: 100%;
  box-sizing: border-box;
  background: var(--bp-elevated);
  border: 1px solid var(--bp-border);
  border-radius: 10px;
  padding: 9px 12px;
  color: var(--bp-text);
  font-size: 0.8rem;
  outline: none;
}

.note-input:focus {
  border-color: var(--bp-accent);
}

.ticket-footer {
  padding: 14px 16px 16px;
  border-top: 1px solid var(--bp-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bp-surface);
}

.total-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 0.88rem;
  color: var(--bp-muted);
}

.total-row strong {
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--bp-text);
  font-variant-numeric: tabular-nums;
}

.tab-round-box {
  background: var(--bp-elevated);
  border: 1px solid var(--bp-border);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tab-round-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;
}

.btn-deselect-tab {
  background: transparent;
  border: none;
  color: var(--bp-accent);
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-save-round {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: none;
  background: #d97706;
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

.checkout-btns {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-checkout-primary {
  width: 100%;
  padding: 13px 16px;
  border-radius: 12px;
  border: none;
  background: var(--bp-accent);
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.16s ease;
}

.btn-checkout-primary:hover:not(:disabled) {
  background: var(--bp-accent-hover);
}

.btn-checkout-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-checkout-secondary {
  width: 100%;
  padding: 10px 14px;
  border-radius: 11px;
  background: var(--bp-elevated);
  border: 1px solid var(--bp-border-strong);
  color: var(--bp-text-sec);
  font-size: 0.82rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

.btn-checkout-secondary:hover:not(:disabled) {
  border-color: var(--bp-accent);
  color: var(--bp-accent);
}

.mobile-cart-fab {
  display: none;
}

@media (max-width: 1024px) {
  .bar-pos-page {
    grid-template-columns: 1fr;
    padding: 14px 14px 80px;
  }

  .ticket-section {
    position: fixed;
    inset: 0;
    top: 0;
    max-height: 100vh;
    border-radius: 0;
    z-index: 2100;
    transform: translateX(100%);
    transition: transform 0.22s ease;
  }

  .ticket-section.mobile-open {
    transform: translateX(0);
  }

  .btn-close-mobile-cart {
    display: flex;
  }

  .mobile-cart-fab {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: 16px;
    z-index: 900;
    padding: 14px 18px;
    border-radius: 14px;
    border: none;
    background: var(--bp-accent);
    color: #ffffff;
    font-size: 0.9rem;
    font-weight: 700;
    box-shadow: 0 12px 28px rgba(79, 70, 229, 0.35);
    cursor: pointer;
  }

  .fab-left {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
