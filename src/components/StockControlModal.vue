<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  Package, Search, AlertTriangle, CheckCircle2, ArrowDownCircle,
  RefreshCw, X, Sliders, PlusCircle, MinusCircle, Edit3, ShieldAlert,
  Boxes, Wine, BookOpen, Layers, Check, ChevronDown, DollarSign, Plus
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const loading = ref(true)
const products = ref([])
const categories = ref([])
const searchQuery = ref('')
const statusFilter = ref('all') // 'all' | 'low' | 'out' | 'packs'
const categoryFilter = ref('all')

// Sub-modals
const showAdjustModal = ref(false)
const showThresholdModal = ref(false)
const selectedProduct = ref(null)

// Adjust Form State
const adjustForm = ref({
  adjustment_type: 'ADD', // 'ADD' | 'SET' | 'SUBTRACT'
  quantity: '',
  reason: ''
})
const adjustSubmitting = ref(false)
const adjustError = ref('')

// Threshold Form State
const thresholdForm = ref({
  reorder_threshold: ''
})
const thresholdSubmitting = ref(false)
const thresholdError = ref('')

// Load catalog & categories
const fetchInventory = async () => {
  loading.value = true
  try {
    const [prodRes, catRes] = await Promise.all([
      api.get('/catalog/products/'),
      api.get('/catalog/categories/')
    ])
    products.value = prodRes.data
    categories.value = catRes.data
  } catch (err) {
    store.showToast('Failed to load inventory data.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchInventory()
})

// Computed KPI stats
const stats = computed(() => {
  const total = products.value.length
  let low = 0
  let out = 0
  let valCost = 0
  let valRetail = 0

  for (const p of products.value) {
    const qty = parseFloat(p.stock_quantity) || 0
    const reorder = parseFloat(p.reorder_threshold) || 5
    const cost = parseFloat(p.cost_price) || 0
    const price = parseFloat(p.selling_price) || 0

    if (qty <= 0) {
      out++
    } else if (qty <= reorder) {
      low++
    }

    valCost += qty * cost
    valRetail += qty * price
  }

  return {
    total,
    optimal: total - low - out,
    low,
    out,
    valCost,
    valRetail
  }
})

// Filtered list
const filteredProducts = computed(() => {
  let list = products.value

  // Unit filter if activeUnit is set
  if (store.activeUnit !== 'all') {
    list = list.filter(p => p.business_unit === store.activeUnit)
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    )
  }

  // Category filter
  if (categoryFilter.value !== 'all') {
    list = list.filter(p => p.category === parseInt(categoryFilter.value))
  }

  // Status filter
  if (statusFilter.value === 'low') {
    list = list.filter(p => {
      const q = parseFloat(p.stock_quantity) || 0
      const t = parseFloat(p.reorder_threshold) || 5
      return q > 0 && q <= t
    })
  } else if (statusFilter.value === 'out') {
    list = list.filter(p => (parseFloat(p.stock_quantity) || 0) <= 0)
  } else if (statusFilter.value === 'packs') {
    list = list.filter(p => p.is_pack)
  }

  return list
})

// Format currency
const formatTsh = (val) => {
  return parseFloat(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Open Adjust Dialog
const openAdjustDialog = (product) => {
  selectedProduct.value = product
  adjustForm.value = {
    adjustment_type: 'ADD',
    quantity: '',
    reason: ''
  }
  adjustError.value = ''
  showAdjustModal.value = true
}

// Projected new stock calculation
const projectedStock = computed(() => {
  if (!selectedProduct.value) return 0
  const cur = parseFloat(selectedProduct.value.stock_quantity) || 0
  const qty = parseFloat(adjustForm.value.quantity) || 0

  if (adjustForm.value.adjustment_type === 'ADD') return cur + qty
  if (adjustForm.value.adjustment_type === 'SUBTRACT') return Math.max(0, cur - qty)
  if (adjustForm.value.adjustment_type === 'SET') return qty
  return cur
})

// Submit Stock Adjustment
const submitStockAdjustment = async () => {
  if (!selectedProduct.value) return
  const qty = parseFloat(adjustForm.value.quantity)
  if (isNaN(qty) || qty < 0) {
    adjustError.value = 'Please enter a valid positive quantity.'
    return
  }
  if (!adjustForm.value.reason.trim()) {
    adjustError.value = 'Please provide a clear reason (e.g. Delivery Received, Stocktake Count, Damage).'
    return
  }

  adjustSubmitting.value = true
  adjustError.value = ''

  try {
    const res = await api.post(`/catalog/products/${selectedProduct.value.id}/adjust_stock/`, {
      adjustment_type: adjustForm.value.adjustment_type,
      quantity: adjustForm.value.quantity,
      reason: adjustForm.value.reason.trim()
    })

    store.showToast(res.data.message || 'Stock adjusted successfully.', 'success')
    showAdjustModal.value = false
    await fetchInventory()
  } catch (err) {
    adjustError.value = err.response?.data?.error || 'Failed to adjust stock.'
  } finally {
    adjustSubmitting.value = false
  }
}

// Open Threshold Dialog
const openThresholdDialog = (product) => {
  selectedProduct.value = product
  thresholdForm.value = {
    reorder_threshold: product.reorder_threshold || '5.00'
  }
  thresholdError.value = ''
  showThresholdModal.value = true
}

// Submit Threshold Update
const submitThresholdUpdate = async () => {
  if (!selectedProduct.value) return
  const t = parseFloat(thresholdForm.value.reorder_threshold)
  if (isNaN(t) || t < 0) {
    thresholdError.value = 'Please enter a valid positive threshold.'
    return
  }

  thresholdSubmitting.value = true
  thresholdError.value = ''

  try {
    const res = await api.post(`/catalog/products/${selectedProduct.value.id}/update_reorder_threshold/`, {
      reorder_threshold: thresholdForm.value.reorder_threshold
    })

    store.showToast(res.data.message || 'Reorder threshold updated.', 'success')
    showThresholdModal.value = false
    await fetchInventory()
  } catch (err) {
    thresholdError.value = err.response?.data?.error || 'Failed to update reorder threshold.'
  } finally {
    thresholdSubmitting.value = false
  }
}

const canAdjustStock = computed(() => {
  const role = store.user?.role
  return role === 'owner' || role === 'bar_manager' || role === 'stationery_manager' || role === 'stock_clerk'
})
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="stock-window">
      <!-- Window Header -->
      <div class="window-header">
        <div class="header-branding">
          <div class="header-icon-box">
            <Boxes :size="24" />
          </div>
          <div>
            <div class="branding-badge">INVENTORY CUSTODY & AUDIT • TSH</div>
            <h2>Inventory & Stock Control</h2>
            <span class="subtitle">Live Stock Tracking, Physical Stocktake Counts & Goods Receiving</span>
          </div>
        </div>

        <div class="header-actions">
          <button v-if="store.isManagement" class="btn-primary-action" @click="store.activeModal = 'catalog_management'" title="Register New Products or Drinks">
            <Plus :size="15" />
            <span>Register Products</span>
          </button>

          <div class="clerk-pill">
            <span class="clerk-label">Custody:</span>
            <span class="clerk-user">@{{ store.user?.username }}</span>
            <span class="clerk-role">{{ store.user?.role?.toUpperCase() }}</span>
          </div>

          <button class="btn-tool btn-refresh" @click="fetchInventory" title="Refresh Live Inventory">
            <RefreshCw :size="16" :class="{ 'spin-anim': loading }" />
          </button>

          <button class="btn-close-window" @click="emit('close')">
            <X :size="20" />
          </button>
        </div>
      </div>

      <!-- KPI Metrics Strip -->
      <div class="kpi-strip">
        <div class="kpi-mini-card">
          <span class="kpi-mini-label">Total Catalog</span>
          <span class="kpi-mini-val">{{ stats.total }}</span>
          <span class="kpi-mini-sub">Active Products</span>
        </div>

        <div class="kpi-mini-card">
          <span class="kpi-mini-label text-success">Optimal Stock</span>
          <span class="kpi-mini-val text-success">{{ stats.optimal }}</span>
          <span class="kpi-mini-sub">Above Threshold</span>
        </div>

        <div class="kpi-mini-card" :class="{ 'kpi-warn': stats.low > 0 }">
          <span class="kpi-mini-label text-amber">Low Stock Alerts</span>
          <span class="kpi-mini-val text-amber">{{ stats.low }}</span>
          <span class="kpi-mini-sub">Reorder Required</span>
        </div>

        <div class="kpi-mini-card" :class="{ 'kpi-danger': stats.out > 0 }">
          <span class="kpi-mini-label text-danger">Out of Stock</span>
          <span class="kpi-mini-val text-danger">{{ stats.out }}</span>
          <span class="kpi-mini-sub">Depleted</span>
        </div>

        <div class="kpi-mini-card highlight-cost">
          <span class="kpi-mini-label">Valuation at Cost</span>
          <span class="kpi-mini-val text-accent">TSH {{ formatTsh(stats.valCost) }}</span>
          <span class="kpi-mini-sub">Working Capital Invested</span>
        </div>

        <div class="kpi-mini-card highlight-retail">
          <span class="kpi-mini-label">Retail Value</span>
          <span class="kpi-mini-val text-cyan">TSH {{ formatTsh(stats.valRetail) }}</span>
          <span class="kpi-mini-sub">Gross Expected Revenue</span>
        </div>
      </div>

      <!-- Toolbar: Search, Filters & Unit Switch -->
      <div class="stock-toolbar">
        <div class="search-box">
          <Search :size="16" class="search-icon" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search by product name, SKU, or barcode..." 
            class="search-input"
          />
          <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''"><X :size="14" /></button>
        </div>

        <div class="filters-group">
          <!-- Filter Pills -->
          <div class="filter-pills">
            <button 
              class="pill-btn" 
              :class="{ active: statusFilter === 'all' }" 
              @click="statusFilter = 'all'"
            >
              All ({{ products.length }})
            </button>
            <button 
              class="pill-btn pill-low" 
              :class="{ active: statusFilter === 'low' }" 
              @click="statusFilter = 'low'"
            >
              Low Stock ({{ stats.low }})
            </button>
            <button 
              class="pill-btn pill-out" 
              :class="{ active: statusFilter === 'out' }" 
              @click="statusFilter = 'out'"
            >
              Out of Stock ({{ stats.out }})
            </button>
            <button 
              class="pill-btn" 
              :class="{ active: statusFilter === 'packs' }" 
              @click="statusFilter = 'packs'"
            >
              Crates / Cartons / Packs
            </button>
          </div>

          <!-- Category Select -->
          <div class="cat-select-wrapper" v-if="categories.length">
            <select v-model="categoryFilter" class="cat-select">
              <option value="all">All Categories</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Main Stock Table View -->
      <div class="table-container">
        <div v-if="loading" class="state-box">
          <div class="spinner"></div>
          <p>Loading live inventory records...</p>
        </div>

        <div v-else-if="filteredProducts.length === 0" class="empty-box">
          <Package :size="40" class="empty-icon" />
          <h4>No products found</h4>
          <p>No inventory items matched your search query or filter.</p>
        </div>

        <table v-else class="stock-table">
          <thead>
            <tr>
              <th>Product Details</th>
              <th>Unit / Pack Details</th>
              <th class="text-right">Stock Qty</th>
              <th class="text-right">Reorder Level</th>
              <th class="text-right">Cost Price (TSH)</th>
              <th class="text-right">Retail Price (TSH)</th>
              <th class="text-right">Valuation at Cost (TSH)</th>
              <th>Stock Status</th>
              <th class="text-right">Clerk Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filteredProducts" :key="p.id">
              <!-- Product Details -->
              <td>
                <div class="product-cell">
                  <div class="product-icon-tag" :class="p.business_unit === 'bar' ? 'icon-bar' : 'icon-stationery'">
                    <Wine v-if="p.business_unit === 'bar'" :size="14" />
                    <BookOpen v-else :size="14" />
                  </div>
                  <div>
                    <div class="product-name">
                      {{ p.name }}
                      <span v-if="p.is_alcoholic" class="tag-alc">18+ Alcohol</span>
                    </div>
                    <div class="product-meta">
                      <span v-if="p.sku" class="sku-tag">SKU: {{ p.sku }}</span>
                      <span v-if="p.barcode" class="barcode-tag">BAR: {{ p.barcode }}</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Pack Details -->
              <td>
                <div v-if="p.is_pack" class="pack-info">
                  <span class="pack-badge">📦 1 {{ p.pack_name || 'Crate' }} = {{ p.pack_unit_ratio }} {{ p.unit_name || 'units' }}</span>
                  <span v-if="p.allow_split_sale" class="split-info">🍾 Single: TSH {{ formatTsh(p.split_unit_price) }} / {{ p.unit_name || 'unit' }}</span>
                </div>
                <div v-else class="single-unit-info">
                  <span class="single-badge">Single Unit</span>
                </div>
              </td>

              <!-- Stock Quantity -->
              <td class="text-right">
                <div v-if="p.is_pack">
                  <span 
                    class="stock-number" 
                    :class="{
                      'stock-zero': parseFloat(p.stock_quantity) <= 0,
                      'stock-low': parseFloat(p.stock_quantity) > 0 && parseFloat(p.stock_quantity) <= parseFloat(p.reorder_threshold),
                      'stock-ok': parseFloat(p.stock_quantity) > parseFloat(p.reorder_threshold)
                    }"
                  >
                    {{ Math.floor(parseFloat(p.stock_quantity || 0)) }} {{ p.pack_name || 'Crates' }}
                  </span>
                  <span v-if="p.pack_unit_ratio > 1" class="stock-sub-units">
                    ({{ Math.round(parseFloat(p.stock_quantity || 0) * p.pack_unit_ratio) }} {{ p.unit_name || 'bottles' }})
                  </span>
                </div>
                <span 
                  v-else
                  class="stock-number" 
                  :class="{
                    'stock-zero': parseFloat(p.stock_quantity) <= 0,
                    'stock-low': parseFloat(p.stock_quantity) > 0 && parseFloat(p.stock_quantity) <= parseFloat(p.reorder_threshold),
                    'stock-ok': parseFloat(p.stock_quantity) > parseFloat(p.reorder_threshold)
                  }"
                >
                  {{ parseFloat(p.stock_quantity).toLocaleString() }}
                </span>
              </td>

              <!-- Reorder Threshold -->
              <td class="text-right">
                <span class="reorder-num">{{ parseFloat(p.reorder_threshold || 5).toLocaleString() }}</span>
              </td>

              <!-- Cost Price -->
              <td class="text-right">
                <span class="price-val">{{ formatTsh(p.cost_price) }}</span>
              </td>

              <!-- Retail Price -->
              <td class="text-right">
                <span class="price-val text-cyan">{{ formatTsh(p.selling_price) }}</span>
              </td>

              <!-- Valuation at Cost -->
              <td class="text-right">
                <span class="price-val text-accent bold">{{ formatTsh(parseFloat(p.stock_quantity) * parseFloat(p.cost_price)) }}</span>
              </td>

              <!-- Status Badge -->
              <td>
                <span 
                  v-if="parseFloat(p.stock_quantity) <= 0" 
                  class="badge-status badge-out"
                >
                  Out of Stock
                </span>
                <span 
                  v-else-if="parseFloat(p.stock_quantity) <= parseFloat(p.reorder_threshold)" 
                  class="badge-status badge-low"
                >
                  Low Stock
                </span>
                <span 
                  v-else 
                  class="badge-status badge-optimal"
                >
                  Optimal
                </span>
              </td>

              <!-- Actions -->
              <td class="text-right">
                <div v-if="canAdjustStock" class="row-actions">
                  <button 
                    class="btn-action btn-adjust" 
                    @click="openAdjustDialog(p)"
                    title="Adjust stock, record delivery receipt, or physical count"
                  >
                    <Sliders :size="14" />
                    <span>Adjust / Receive</span>
                  </button>

                  <button 
                    class="btn-action btn-threshold" 
                    @click="openThresholdDialog(p)"
                    title="Configure reorder alert threshold"
                  >
                    <Edit3 :size="13" />
                  </button>
                </div>
                <span v-else class="text-muted text-xs">View Only</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SUB-MODAL 1: Adjust / Receive Stock -->
      <div v-if="showAdjustModal" class="submodal-overlay" @click.self="showAdjustModal = false">
        <div class="submodal-card">
          <div class="submodal-header">
            <div class="submodal-title-group">
              <Sliders :size="18" class="text-accent" />
              <div>
                <h4>Adjust Stock / Goods Receiving</h4>
                <p class="submodal-sub">{{ selectedProduct?.name }}</p>
              </div>
            </div>
            <button class="btn-close-sub" @click="showAdjustModal = false"><X :size="16" /></button>
          </div>

          <div class="submodal-body">
            <!-- Current Stock Info -->
            <div class="stock-current-box">
              <div class="current-stat">
                <span class="cs-label">Current Stock:</span>
                <span class="cs-val" v-if="selectedProduct?.is_pack">
                  {{ Math.floor(parseFloat(selectedProduct?.stock_quantity || 0)) }} {{ selectedProduct?.pack_name || 'Crates' }}
                  <span v-if="selectedProduct?.pack_unit_ratio > 1" class="sub-stat-hint">
                    ({{ Math.round(parseFloat(selectedProduct?.stock_quantity || 0) * selectedProduct?.pack_unit_ratio) }} {{ selectedProduct?.unit_name || 'bottles' }})
                  </span>
                </span>
                <span class="cs-val" v-else>{{ parseFloat(selectedProduct?.stock_quantity || 0) }} units</span>
              </div>
              <div class="current-stat">
                <span class="cs-label">Resulting Stock:</span>
                <span class="cs-val bold text-accent" v-if="selectedProduct?.is_pack">
                  {{ projectedStock }} {{ selectedProduct?.pack_name || 'Crates' }}
                  <span v-if="selectedProduct?.pack_unit_ratio > 1" class="sub-stat-hint">
                    (= {{ Math.round(projectedStock * selectedProduct?.pack_unit_ratio) }} {{ selectedProduct?.unit_name || 'bottles' }})
                  </span>
                </span>
                <span class="cs-val bold text-accent" v-else>{{ projectedStock }} units</span>
              </div>
            </div>

            <!-- Mode Selection Tabs -->
            <div class="adjust-modes">
              <button 
                class="mode-btn" 
                :class="{ active: adjustForm.adjustment_type === 'ADD' }"
                @click="adjustForm.adjustment_type = 'ADD'"
              >
                <PlusCircle :size="15" />
                <span>Receive Goods (+)</span>
              </button>

              <button 
                class="mode-btn" 
                :class="{ active: adjustForm.adjustment_type === 'SET' }"
                @click="adjustForm.adjustment_type = 'SET'"
              >
                <Check :size="15" />
                <span>Stocktake Count (=)</span>
              </button>

              <button 
                class="mode-btn" 
                :class="{ active: adjustForm.adjustment_type === 'SUBTRACT' }"
                @click="adjustForm.adjustment_type = 'SUBTRACT'"
              >
                <MinusCircle :size="15" />
                <span>Damage / Spoilage (-)</span>
              </button>
            </div>

            <!-- Quantity Input -->
            <div class="form-group">
              <label>
                {{ adjustForm.adjustment_type === 'SET' 
                    ? 'Exact Verified Count (' + (selectedProduct?.pack_name || 'Units') + ')' 
                    : (selectedProduct?.pack_name || 'Units') + ' to ' + (adjustForm.adjustment_type === 'ADD' ? 'Receive / Add' : 'Deduct') 
                }}
                <span class="req">*</span>
              </label>
              <input 
                v-model="adjustForm.quantity" 
                type="number" 
                min="0" 
                step="1" 
                :placeholder="selectedProduct?.is_pack ? 'Enter number of ' + (selectedProduct?.pack_name || 'crates') + '...' : 'Enter units quantity...'"
                class="form-input"
                autofocus
              />
            </div>

            <!-- Mandatory Reason -->
            <div class="form-group">
              <label>Reason / Audit Justification <span class="req">*</span></label>
              <input 
                v-model="adjustForm.reason" 
                type="text" 
                placeholder="e.g. Received delivery from supplier, Weekly physical count, Broken bottle"
                class="form-input"
              />
              <span class="field-hint">Mandatory: Logged in the permanent immutable audit trail with clerk identity.</span>
            </div>

            <!-- Error Banner -->
            <div v-if="adjustError" class="modal-error">
              <AlertTriangle :size="16" />
              <span>{{ adjustError }}</span>
            </div>
          </div>

          <div class="submodal-footer">
            <button class="btn-cancel" @click="showAdjustModal = false">Cancel</button>
            <button 
              class="btn-save" 
              :disabled="adjustSubmitting || !adjustForm.quantity || !adjustForm.reason"
              @click="submitStockAdjustment"
            >
              <RefreshCw v-if="adjustSubmitting" :size="14" class="spin-anim" />
              <span>{{ adjustSubmitting ? 'Recording...' : 'Save Stock Adjustment' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- SUB-MODAL 2: Update Reorder Threshold -->
      <div v-if="showThresholdModal" class="submodal-overlay" @click.self="showThresholdModal = false">
        <div class="submodal-card">
          <div class="submodal-header">
            <div class="submodal-title-group">
              <Edit3 :size="18" class="text-amber" />
              <div>
                <h4>Configure Reorder Threshold</h4>
                <p class="submodal-sub">{{ selectedProduct?.name }}</p>
              </div>
            </div>
            <button class="btn-close-sub" @click="showThresholdModal = false"><X :size="16" /></button>
          </div>

          <div class="submodal-body">
            <p class="dialog-desc">
              When stock drops to or below this threshold, the platform flags the item as 
              <strong>Low Stock</strong> on executive reports and clerk alert feeds.
            </p>

            <div class="form-group">
              <label>Alert Threshold (Units) <span class="req">*</span></label>
              <input 
                v-model="thresholdForm.reorder_threshold" 
                type="number" 
                min="0" 
                step="1" 
                class="form-input"
                autofocus
              />
            </div>

            <div v-if="thresholdError" class="modal-error">
              <AlertTriangle :size="16" />
              <span>{{ thresholdError }}</span>
            </div>
          </div>

          <div class="submodal-footer">
            <button class="btn-cancel" @click="showThresholdModal = false">Cancel</button>
            <button 
              class="btn-save" 
              :disabled="thresholdSubmitting || !thresholdForm.reorder_threshold"
              @click="submitThresholdUpdate"
            >
              <RefreshCw v-if="thresholdSubmitting" :size="14" class="spin-anim" />
              <span>{{ thresholdSubmitting ? 'Saving...' : 'Update Threshold' }}</span>
            </button>
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
  background: rgba(10, 15, 29, 0.85);
  backdrop-filter: blur(8px);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.stock-window {
  width: 100%;
  max-width: 1350px;
  height: 92vh;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
}

/* Header */
.window-header {
  padding: 16px 24px;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-branding {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon-box {
  width: 44px;
  height: 44px;
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.branding-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #fbbf24;
  margin-bottom: 2px;
}

.window-header h2 {
  font-size: 18px;
  font-weight: 800;
  color: #f8fafc;
  margin: 0;
}

.subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-primary-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f59e0b;
  color: #0f172a;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary-action:hover { background: #fbbf24; }

.clerk-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 12px;
}

.clerk-label { color: #94a3b8; font-size: 11px; }
.clerk-user { color: #c7d2fe; font-weight: 800; }
.clerk-role { background: #6366f1; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; }

.btn-tool {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-tool:hover { background: rgba(255, 255, 255, 0.12); }

.btn-close-window {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border-radius: 10px;
  padding: 8px;
  cursor: pointer;
  border: none;
}

.btn-close-window:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; }

/* KPI Strip */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  padding: 14px 24px;
  background: rgba(15, 23, 42, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.kpi-mini-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.kpi-mini-card.kpi-warn {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.05);
}

.kpi-mini-card.kpi-danger {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
}

.kpi-mini-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

.kpi-mini-val {
  font-size: 17px;
  font-weight: 900;
  color: #f8fafc;
}

.kpi-mini-sub {
  font-size: 10px;
  color: #64748b;
}

.text-accent { color: #fbbf24; }
.text-cyan { color: #38bdf8; }
.text-success { color: #34d399; }
.text-amber { color: #f59e0b; }
.text-danger { color: #f87171; }
.bold { font-weight: 800; }

/* Toolbar */
.stock-toolbar {
  padding: 12px 24px;
  background: rgba(15, 23, 42, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 280px;
  max-width: 440px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #64748b;
}

.search-input {
  width: 100%;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 9px 36px 9px 36px;
  color: #f8fafc;
  font-size: 12.5px;
  outline: none;
}

.search-input:focus { border-color: #fbbf24; }

.clear-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.filters-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-pills {
  display: flex;
  gap: 6px;
}

.pill-btn {
  padding: 6px 12px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-btn:hover { background: rgba(255, 255, 255, 0.1); color: #f8fafc; }
.pill-btn.active { background: #fbbf24; border-color: #fbbf24; color: #0f172a; font-weight: 800; }
.pill-low.active { background: #f59e0b; color: #0f172a; }
.pill-out.active { background: #ef4444; color: #fff; }

.cat-select {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #f8fafc;
  font-size: 12px;
  padding: 7px 12px;
  outline: none;
}

/* Table */
.table-container {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.stock-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}

.stock-table th {
  background: rgba(15, 23, 42, 0.95);
  color: #94a3b8;
  font-weight: 700;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: sticky;
  top: 0;
  z-index: 10;
}

.stock-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
}

.stock-table tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

.text-right { text-align: right; }

.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-icon-tag {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-bar { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.icon-stationery { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }

.product-name {
  font-weight: 700;
  color: #f8fafc;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-alc {
  font-size: 9.5px;
  font-weight: 800;
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
  padding: 2px 6px;
  border-radius: 4px;
}

.product-meta {
  display: flex;
  gap: 8px;
  font-size: 10.5px;
  color: #64748b;
  margin-top: 2px;
}

.pack-badge {
  font-size: 11px;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  display: inline-block;
}

.split-info {
  display: block;
  font-size: 10px;
  color: #94a3b8;
  margin-top: 3px;
}

.single-badge {
  font-size: 10.5px;
  color: #64748b;
}

.stock-number {
  font-size: 14px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
}

.stock-ok { color: #34d399; }
.stock-low { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
.stock-zero { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }

.reorder-num { color: #94a3b8; font-weight: 700; }
.price-val { font-variant-numeric: tabular-nums; }

/* Status Badges */
.badge-status {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 800;
}

.badge-optimal { background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.25); }
.badge-low { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); }
.badge-out { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); }

/* Row Actions */
.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
}

.btn-adjust {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24;
}

.btn-adjust:hover { background: rgba(245, 158, 11, 0.28); color: #fef08a; }

.btn-threshold {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
}

.btn-threshold:hover { background: rgba(255, 255, 255, 0.12); color: #f8fafc; }

/* Sub-modals */
.submodal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submodal-card {
  width: 100%;
  max-width: 480px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.submodal-header {
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.submodal-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.submodal-title-group h4 {
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
  margin: 0;
}

.submodal-sub {
  font-size: 11.5px;
  color: #94a3b8;
  margin: 0;
}

.btn-close-sub {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.submodal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stock-current-box {
  display: flex;
  justify-content: space-between;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 10px 14px;
}

.current-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cs-label { font-size: 10.5px; color: #64748b; font-weight: 700; text-transform: uppercase; }
.cs-val { font-size: 14px; font-weight: 800; color: #f8fafc; }

.adjust-modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  background: rgba(15, 23, 42, 0.8);
  padding: 4px;
  border-radius: 10px;
}

.mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.mode-btn.active {
  background: #f59e0b;
  color: #0f172a;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 11.5px;
  font-weight: 700;
  color: #cbd5e1;
}

.req { color: #f87171; }

.form-input {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 9px 12px;
  color: #f8fafc;
  font-size: 12.5px;
  outline: none;
}

.form-input:focus { border-color: #f59e0b; }

.field-hint {
  font-size: 10.5px;
  color: #64748b;
  line-height: 1.4;
}

.modal-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 11.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.submodal-footer {
  padding: 14px 20px;
  background: rgba(15, 23, 42, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn-save {
  background: #f59e0b;
  color: #0f172a;
  border: none;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-save:hover:not(:disabled) { background: #fbbf24; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

.dialog-desc {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

.state-box, .empty-box {
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #64748b;
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #f59e0b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spin-anim { animation: spin 0.8s linear infinite; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

.stock-sub-units {
  display: block;
  font-size: 10px;
  color: #94a3b8;
  font-weight: normal;
}

.sub-stat-hint {
  font-size: 11px;
  color: #94a3b8;
  font-weight: normal;
  margin-left: 4px;
}
</style>

