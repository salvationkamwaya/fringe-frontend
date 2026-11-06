<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  Wine, BookOpen, Layers, Plus, Search, Edit3, Trash2, 
  X, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, 
  DollarSign, Package, Tag, RefreshCw, BarChart2, ShieldCheck,
  Percent, ArrowRight
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const activeTab = ref('products') // 'products' | 'categories'
const products = ref([])
const categories = ref([])
const loading = ref(true)
const searchQuery = ref('')
const categoryFilter = ref('all')

// Drawers & Modals
const showProductDrawer = ref(false)
const showCategoryDrawer = ref(false)
const isEditing = ref(false)
const selectedProductId = ref(null)
const selectedCategoryId = ref(null)

// Product Form
const productForm = ref({
  name: '',
  category: '',
  sku: '',
  barcode: '',
  description: '',
  cost_price: '',
  selling_price: '',
  stock_quantity: '0',
  reorder_threshold: '5',
  is_alcoholic: false,
  volume_ml: '',
  is_pack: false,
  pack_unit_ratio: 1,
  pack_name: 'Pack',
  unit_name: 'Piece',
  allow_split_sale: false,
  split_unit_price: ''
})
const productSubmitting = ref(false)
const productError = ref('')

// Category Form
const categoryForm = ref({
  name: '',
  slug: '',
  icon: 'tag',
  display_order: 0
})
const categorySubmitting = ref(false)
const categoryError = ref('')

const itemType = ref(store.activeUnit === 'stationery' ? 'stationery' : 'bar')

const isBar = computed(() => {
  if (store.user?.role === 'bar_manager') return true
  if (store.user?.role === 'stationery_manager') return false
  return itemType.value === 'bar' || store.activeUnit === 'bar'
})

const setItemType = (type) => {
  itemType.value = type
  if (type === 'bar') {
    productForm.value.pack_name = 'Crate'
    productForm.value.unit_name = 'Bottle'
    if (!productForm.value.volume_ml) productForm.value.volume_ml = '500'
  } else {
    productForm.value.is_alcoholic = false
    productForm.value.volume_ml = ''
    productForm.value.pack_name = 'Pack'
    productForm.value.unit_name = 'Piece'
  }
}

// Fetch data
const fetchData = async () => {
  loading.value = true
  try {
    const [prodRes, catRes] = await Promise.all([
      api.get('/catalog/products/'),
      api.get('/catalog/categories/')
    ])
    products.value = prodRes.data.results || prodRes.data
    categories.value = catRes.data.results || catRes.data
  } catch (err) {
    store.showToast('Failed to load catalog data.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

// Filtered products list
const filteredProducts = computed(() => {
  let list = products.value

  if (categoryFilter.value !== 'all') {
    list = list.filter(p => p.category === parseInt(categoryFilter.value))
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    )
  }

  return list
})

// Margin calculation helper
const calculateMargin = (selling, cost) => {
  const s = parseFloat(selling) || 0
  const c = parseFloat(cost) || 0
  if (s <= 0) return '0.0'
  return (((s - c) / s) * 100).toFixed(1)
}

// Open Register Drawer
const openCreateProduct = () => {
  isEditing.value = false
  selectedProductId.value = null
  if (store.user?.role === 'stationery_manager' || store.activeUnit === 'stationery') {
    itemType.value = 'stationery'
  } else {
    itemType.value = 'bar'
  }
  productForm.value = {
    name: '',
    category: categories.value[0]?.id || '',
    sku: '',
    barcode: '',
    description: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: '0',
    reorder_threshold: '5',
    is_alcoholic: isBar.value,
    volume_ml: isBar.value ? '500' : '',
    is_pack: false,
    pack_unit_ratio: 1,
    pack_name: isBar.value ? 'Crate' : 'Pack',
    unit_name: isBar.value ? 'Bottle' : 'Piece',
    allow_split_sale: false,
    split_unit_price: ''
  }
  productError.value = ''
  showProductDrawer.value = true
}

// Open Edit Drawer
const openEditProduct = (prod) => {
  isEditing.value = true
  selectedProductId.value = prod.id
  if (prod.is_alcoholic || prod.volume_ml || store.activeUnit === 'bar' || store.user?.role === 'bar_manager') {
    itemType.value = 'bar'
  } else {
    itemType.value = 'stationery'
  }
  productForm.value = {
    name: prod.name,
    category: prod.category || '',
    sku: prod.sku || '',
    barcode: prod.barcode || '',
    description: prod.description || '',
    cost_price: prod.cost_price,
    selling_price: prod.selling_price,
    stock_quantity: prod.stock_quantity,
    reorder_threshold: prod.reorder_threshold || '5',
    is_alcoholic: Boolean(prod.is_alcoholic),
    volume_ml: prod.volume_ml || '',
    is_pack: Boolean(prod.is_pack),
    pack_unit_ratio: prod.pack_unit_ratio || 1,
    pack_name: prod.pack_name || (isBar.value ? 'Crate' : 'Pack'),
    unit_name: prod.unit_name || (isBar.value ? 'Bottle' : 'Piece'),
    allow_split_sale: Boolean(prod.allow_split_sale),
    split_unit_price: prod.split_unit_price || ''
  }
  productError.value = ''
  showProductDrawer.value = true
}

// Submit Product Form
const handleSaveProduct = async () => {
  if (!productForm.value.name.trim()) {
    productError.value = 'Product name is required.'
    return
  }
  if (!productForm.value.selling_price || parseFloat(productForm.value.selling_price) <= 0) {
    productError.value = 'Selling price must be greater than zero.'
    return
  }

  productSubmitting.value = true
  productError.value = ''

  try {
    const payload = {
      ...productForm.value,
      cost_price: productForm.value.cost_price || '0.00',
      category: productForm.value.category || null,
      is_alcoholic: isBar.value ? Boolean(productForm.value.is_alcoholic) : false,
      volume_ml: (isBar.value && productForm.value.volume_ml) ? parseInt(productForm.value.volume_ml) : null,
      pack_unit_ratio: productForm.value.is_pack ? parseInt(productForm.value.pack_unit_ratio || 1) : 1,
      split_unit_price: (productForm.value.is_pack && productForm.value.allow_split_sale && productForm.value.split_unit_price) 
        ? productForm.value.split_unit_price 
        : null
    }

    if (isEditing.value) {
      await api.patch(`/catalog/products/${selectedProductId.value}/`, payload)
      store.showToast(`Product "${productForm.value.name}" updated successfully!`, 'success')
    } else {
      await api.post('/catalog/products/', payload)
      store.showToast(`New ${isBar.value ? 'drink' : 'product'} "${productForm.value.name}" registered!`, 'success')
    }

    showProductDrawer.value = false
    await fetchData()
  } catch (err) {
    productError.value = err.response?.data?.name?.[0] || err.response?.data?.detail || err.response?.data?.error || 'Failed to save product.'
  } finally {
    productSubmitting.value = false
  }
}

// Deactivate Product
const handleDeactivateProduct = async (prod) => {
  const confirmMsg = `Are you sure you want to deactivate "${prod.name}" from the active catalog?`
  if (!window.confirm(confirmMsg)) return

  try {
    await api.delete(`/catalog/products/${prod.id}/`)
    store.showToast(`Product "${prod.name}" deactivated.`, 'info')
    await fetchData()
  } catch (err) {
    store.showToast(err.response?.data?.detail || 'Failed to deactivate product.', 'error')
  }
}

// Category Management
const openCreateCategory = () => {
  categoryForm.value = {
    name: '',
    slug: '',
    icon: 'tag',
    display_order: categories.value.length + 1
  }
  categoryError.value = ''
  showCategoryDrawer.value = true
}

const onCategoryNameChange = () => {
  if (!isEditing.value) {
    categoryForm.value.slug = categoryForm.value.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
}

const handleSaveCategory = async () => {
  if (!categoryForm.value.name.trim()) {
    categoryError.value = 'Category name is required.'
    return
  }

  categorySubmitting.value = true
  categoryError.value = ''

  try {
    const res = await api.post('/catalog/categories/', categoryForm.value)
    store.showToast(`Category "${categoryForm.value.name}" created!`, 'success')
    showCategoryDrawer.value = false
    await fetchData()
    // Auto-select the newly created category in the product drawer
    const createdId = res.data?.id
    if (createdId) {
      productForm.value.category = createdId
    }
  } catch (err) {
    categoryError.value = err.response?.data?.name?.[0] || err.response?.data?.slug?.[0] || err.response?.data?.detail || err.response?.data?.error || 'Failed to create category.'
  } finally {
    categorySubmitting.value = false
  }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="catalog-window">
      <!-- Window Header -->
      <div class="window-header">
        <div class="header-branding">
          <div class="header-icon-box">
            <Wine v-if="isBar" :size="24" />
            <BookOpen v-else :size="24" />
          </div>
          <div>
            <div class="branding-badge">TANZANIA STATUTORY COMPLIANCE • TSH</div>
            <h2>{{ isBar ? 'Bar & Lounge Beverage Catalog' : 'Stationery & Retail Product Catalog' }}</h2>
            <span class="subtitle">Manager Product Registration, Retail Pricing & Category Administration</span>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-primary-action" @click="openCreateProduct">
            <Plus :size="16" />
            <span>{{ isBar ? 'Register Drink' : 'Register Product' }}</span>
          </button>

          <button class="btn-tool" @click="fetchData" title="Refresh Live Data">
            <RefreshCw :size="16" :class="{ 'spin-anim': loading }" />
          </button>

          <button class="btn-close-window" @click="emit('close')">
            <X :size="20" />
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="window-tabs-bar">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'products' }"
          @click="activeTab = 'products'"
        >
          <Layers :size="16" />
          <span>{{ isBar ? 'Drinks & Beverages' : 'Products Directory' }} ({{ products.length }})</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'categories' }"
          @click="activeTab = 'categories'"
        >
          <Tag :size="16" />
          <span>Product Categories ({{ categories.length }})</span>
        </button>
      </div>

      <!-- TAB 1: PRODUCTS / DRINKS -->
      <div v-if="activeTab === 'products'" class="tab-content">
        <!-- Toolbar: Search & Filter -->
        <div class="catalog-toolbar">
          <div class="search-box">
            <Search :size="16" class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              :placeholder="`Search ${isBar ? 'drinks by brand, name...' : 'products by name, SKU, barcode...'}`" 
              class="search-input"
            />
          </div>

          <div class="toolbar-right">
            <select v-model="categoryFilter" class="filter-select">
              <option value="all">All Categories</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>

        <!-- Products Table -->
        <div class="table-container">
          <div v-if="loading" class="state-box">
            <div class="spinner"></div>
            <p>Loading catalog items...</p>
          </div>

          <div v-else-if="filteredProducts.length === 0" class="empty-box">
            <Layers :size="40" class="empty-icon" />
            <h4>No products found</h4>
            <p>Click "Register {{ isBar ? 'Drink' : 'Product' }}" above to add items to your catalog.</p>
          </div>

          <table v-else class="catalog-table">
            <thead>
              <tr>
                <th>{{ isBar ? 'Beverage Name' : 'Product Name' }}</th>
                <th>Category</th>
                <th>Classification / Pack</th>
                <th class="text-right">Cost Price (TSH)</th>
                <th class="text-right">Selling Price (TSH)</th>
                <th class="text-right">Gross Margin</th>
                <th class="text-right">Current Stock</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in filteredProducts" :key="p.id">
                <td>
                  <div class="prod-name-cell">
                    <span class="prod-title">{{ p.name }}</span>
                    <span v-if="p.sku" class="sku-sub">SKU: {{ p.sku }}</span>
                  </div>
                </td>

                <td>
                  <span class="cat-badge">{{ p.category_name || 'Unassigned' }}</span>
                </td>

                <!-- Classification -->
                <td>
                  <div v-if="isBar">
                    <span v-if="p.is_alcoholic" class="badge-tag badge-alcohol">18+ Alcohol</span>
                    <span v-else class="badge-tag badge-soft">Soft Drink</span>
                    <span v-if="p.volume_ml" class="vol-info">{{ p.volume_ml }}ml</span>
                  </div>
                  <div v-else>
                    <span v-if="p.is_pack" class="badge-tag badge-pack">{{ p.pack_name }} ({{ p.pack_unit_ratio }})</span>
                    <span v-else class="badge-tag badge-single">Single Unit</span>
                  </div>
                </td>

                <!-- Cost Price -->
                <td class="text-right font-num">
                  TSH {{ parseFloat(p.cost_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                </td>

                <!-- Selling Price -->
                <td class="text-right font-num font-bold text-accent">
                  TSH {{ parseFloat(p.selling_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                </td>

                <!-- Margin -->
                <td class="text-right font-num">
                  <span class="margin-pill">
                    {{ calculateMargin(p.selling_price, p.cost_price) }}%
                  </span>
                </td>

                <!-- Current Stock -->
                <td class="text-right font-num">
                  <span :class="parseFloat(p.stock_quantity) <= parseFloat(p.reorder_threshold) ? 'text-amber font-bold' : ''">
                    {{ parseFloat(p.stock_quantity).toLocaleString() }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="text-right">
                  <div class="row-actions">
                    <button class="btn-icon btn-edit" @click="openEditProduct(p)" title="Edit Pricing & Details">
                      <Edit3 :size="15" />
                    </button>
                    <button class="btn-icon btn-delete" @click="handleDeactivateProduct(p)" title="Deactivate from Catalog">
                      <Trash2 :size="15" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: CATEGORIES -->
      <div v-else-if="activeTab === 'categories'" class="tab-content">
        <div class="catalog-toolbar">
          <div class="toolbar-left">
            <span class="section-hint">Categories organize your POS counter display tiles and sales reporting.</span>
          </div>
          <button class="btn-primary-action" @click="openCreateCategory">
            <Plus :size="15" />
            <span>Create Category</span>
          </button>
        </div>

        <div class="categories-grid">
          <div v-for="cat in categories" :key="cat.id" class="category-card">
            <div class="cat-header">
              <div class="cat-icon-box">
                <Tag :size="18" />
              </div>
              <div class="cat-meta">
                <span class="cat-name">{{ cat.name }}</span>
                <span class="cat-slug">slug: /{{ cat.slug }}</span>
              </div>
            </div>
            <div class="cat-footer">
              <span class="cat-count">{{ cat.product_count || 0 }} items cataloged</span>
            </div>
          </div>
        </div>
      </div>

      <!-- DRAWER: Register / Edit Product -->
      <div v-if="showProductDrawer" class="drawer-overlay" @click.self="showProductDrawer = false">
        <div class="drawer-panel">
          <div class="drawer-header">
            <div class="drawer-title-group">
              <Wine v-if="isBar" :size="22" class="text-accent" />
              <BookOpen v-else :size="22" class="text-cyan" />
              <div>
                <h3>{{ isEditing ? 'Edit Catalog Item' : (isBar ? 'Register New Drink' : 'Register New Product') }}</h3>
                <p class="drawer-sub">Authorized by @{{ store.user?.username || 'Manager' }} • {{ isBar ? 'Bar & Lounge Catalog' : 'Stationery & Retail Catalog' }}</p>
              </div>
            </div>
            <button class="btn-close-sub" @click="showProductDrawer = false"><X :size="18" /></button>
          </div>

          <!-- Type Switcher (Business Owner / Multi-unit only) -->
          <div v-if="store.isOwner && !isEditing" class="type-toggle-container">
            <button 
              type="button" 
              class="type-toggle-btn" 
              :class="{ active: itemType === 'bar' }"
              @click="setItemType('bar')"
            >
              <Wine :size="14" />
              <span>Drink / Bar Beverage</span>
            </button>
            <button 
              type="button" 
              class="type-toggle-btn" 
              :class="{ active: itemType === 'stationery' }"
              @click="setItemType('stationery')"
            >
              <BookOpen :size="14" />
              <span>Stationery / Retail Good</span>
            </button>
          </div>

          <form class="drawer-form" @submit.prevent="handleSaveProduct">
            <div class="drawer-scroll-body">
              <!-- SECTION 1: BASIC IDENTIFICATION (STEP 4) -->
              <div class="form-section-card">
                <div class="form-section-title">
                  <Tag :size="14" />
                  <span>Step 4: Basic Identification</span>
                </div>

                <!-- Product Name -->
                <div class="form-group">
                  <label>{{ isBar ? 'Drink Name / Brand' : 'Product Name / Brand' }} <span class="req">*</span></label>
                  <input 
                    v-model="productForm.name" 
                    type="text" 
                    :placeholder="isBar ? 'e.g. Serengeti Premium Lager, Jack Daniel\'s 750ml, Red Bull' : 'e.g. A4 Paper Ream, Bic Clic Pen (Blue)'" 
                    class="form-input"
                    required
                  />
                </div>

                <!-- Category -->
                <div class="form-group">
                  <div class="label-with-action">
                    <label>Category <span class="req">*</span></label>
                    <button type="button" class="btn-inline-link" @click="openCreateCategory">+ Add New Category</button>
                  </div>
                  <select v-model="productForm.category" class="form-select" required>
                    <option value="" disabled>Select category...</option>
                    <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>

                <!-- SKU & Barcode (Optional) -->
                <div class="form-row">
                  <div class="form-group">
                    <label>SKU Code <span class="opt">(Optional)</span></label>
                    <input 
                      v-model="productForm.sku" 
                      type="text" 
                      :placeholder="isBar ? 'e.g. DRK-SER-500' : 'e.g. SKU-A4-01'" 
                      class="form-input" 
                    />
                  </div>
                  <div class="form-group">
                    <label>Barcode <span class="opt">(Optional)</span></label>
                    <input 
                      v-model="productForm.barcode" 
                      type="text" 
                      placeholder="Scan or enter bottle barcode" 
                      class="form-input" 
                    />
                  </div>
                </div>

                <!-- Description / Notes (Optional) -->
                <div class="form-group">
                  <label>Description / Serving Notes <span class="opt">(Optional)</span></label>
                  <textarea 
                    v-model="productForm.description" 
                    rows="2" 
                    :placeholder="isBar ? 'e.g. Served chilled with glass; returnable glass bottle.' : 'e.g. 80gsm high opacity copy paper.'"
                    class="form-textarea"
                  ></textarea>
                </div>
              </div>

              <!-- SECTION 2: PRICING & PROFIT MARGINS (STEP 5) -->
              <div class="form-section-card">
                <div class="form-section-title">
                  <DollarSign :size="14" />
                  <span>Step 5: Pricing & Profit Margins (TSH)</span>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Retail Selling Price (TSH) <span class="req">*</span></label>
                    <input 
                      v-model="productForm.selling_price" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      placeholder="0.00" 
                      class="form-input"
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label>Cost Price (TSH) <span class="opt">(Optional)</span></label>
                    <input 
                      v-model="productForm.cost_price" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      placeholder="0.00" 
                      class="form-input"
                    />
                  </div>
                </div>

                <!-- Live Margin & Profit Calculator -->
                <div v-if="productForm.selling_price" class="margin-preview-box">
                  <div class="margin-preview-item">
                    <span class="preview-label">Estimated Gross Profit:</span>
                    <strong class="preview-value text-emerald">
                      TSH {{ (parseFloat(productForm.selling_price || 0) - parseFloat(productForm.cost_price || 0)).toFixed(2) }}
                    </strong>
                  </div>
                  <div class="margin-preview-item">
                    <span class="preview-label">Gross Margin:</span>
                    <span class="margin-pill">{{ calculateMargin(productForm.selling_price, productForm.cost_price) }}%</span>
                  </div>
                </div>
              </div>

              <!-- SECTION 3: INVENTORY CONTROL (STEP 6) -->
              <div class="form-section-card">
                <div class="form-section-title">
                  <Layers :size="14" />
                  <span>Step 6: Inventory & Reorder Levels</span>
                </div>

                <div class="form-row">
                  <div class="form-group" v-if="!isEditing">
                    <label>Opening Stock Quantity</label>
                    <input 
                      v-model="productForm.stock_quantity" 
                      type="number" 
                      step="1" 
                      min="0" 
                      class="form-input"
                    />
                  </div>

                  <div class="form-group">
                    <label>Reorder Alert Threshold</label>
                    <input 
                      v-model="productForm.reorder_threshold" 
                      type="number" 
                      step="1" 
                      min="0" 
                      class="form-input"
                    />
                  </div>
                </div>
              </div>

              <!-- SECTION 4: TANZANIA STATUTORY ALCOHOL COMPLIANCE (STEP 7) -->
              <div v-if="isBar" class="form-section-card alcohol-card-highlight">
                <div class="form-section-title text-amber">
                  <Wine :size="16" />
                  <span>Step 7: Tanzania Regulatory Compliance (Liquor Laws)</span>
                </div>

                <div class="checkbox-row highlight-checkbox">
                  <input 
                    type="checkbox" 
                    id="chkAlcohol" 
                    v-model="productForm.is_alcoholic" 
                    class="form-checkbox"
                  />
                  <label for="chkAlcohol" class="checkbox-label">
                    <strong class="alcohol-badge-text">Alcoholic Beverage (Statutory 18+ ID Verification)</strong>
                    <span class="sublabel">
                      Mandatory statutory compliance: The system will automatically prompt the bartender for customer age verification (18+) under Tanzania Liquor Licensing regulations before completing sale.
                    </span>
                  </label>
                </div>

                <div class="form-group mt-3">
                  <label>Liquid Volume in Millilitres (ml) <span class="req" v-if="productForm.is_alcoholic">*</span></label>
                  <div class="input-with-suffix">
                    <input 
                      v-model="productForm.volume_ml" 
                      type="number" 
                      placeholder="e.g. 330, 500, 750" 
                      class="form-input"
                      min="1"
                    />
                    <span class="suffix-badge">ml</span>
                  </div>
                  <span class="field-hint">Common standard sizes: 330ml (Can/Small bottle), 500ml (Standard beer), 750ml (Wine/Spirit).</span>
                </div>
              </div>

              <!-- SECTION 5: CRATES & PACKAGING (STEP 8) -->
              <div class="form-section-card">
                <div class="form-section-title">
                  <Package :size="14" />
                  <span>Step 8: {{ isBar ? 'Crates & Multi-pack Rules (Optional)' : 'Pack & Bulk Rules (Optional)' }}</span>
                </div>

                <div class="checkbox-row">
                  <input 
                    type="checkbox" 
                    id="chkPack" 
                    v-model="productForm.is_pack" 
                    class="form-checkbox"
                  />
                  <label for="chkPack" class="checkbox-label">
                    <strong>{{ isBar ? 'Stocked in Crates / Bulk Packaging' : 'Pack / Bulk Product (Box, Carton, Ream)' }}</strong>
                    <span class="sublabel">{{ isBar ? 'Allows receiving crates and optionally selling individual bottles.' : 'Allows selling as complete packs and breaking down into individual items.' }}</span>
                  </label>
                </div>

                <div v-if="productForm.is_pack" class="pack-subfields mt-3">
                  <div class="form-row">
                    <div class="form-group">
                      <label>Pack Name</label>
                      <input v-model="productForm.pack_name" type="text" :placeholder="isBar ? 'e.g. Crate, Case, 6-Pack' : 'e.g. Box, Ream, Carton'" class="form-input" />
                    </div>
                    <div class="form-group">
                      <label>Units / Bottles Per Pack</label>
                      <input v-model="productForm.pack_unit_ratio" type="number" min="1" class="form-input" />
                    </div>
                  </div>

                  <div class="checkbox-row mt-2">
                    <input 
                      type="checkbox" 
                      id="chkSplit" 
                      v-model="productForm.allow_split_sale" 
                      class="form-checkbox"
                    />
                    <label for="chkSplit" class="checkbox-label">
                      <strong>{{ isBar ? 'Allow Single Bottle Sales' : 'Allow Single Unit Split Sales' }}</strong>
                      <span class="sublabel">Deducts fractional quantity from crate stock when a single unit is sold.</span>
                    </label>
                  </div>

                  <div v-if="productForm.allow_split_sale" class="form-group mt-2">
                    <label>{{ isBar ? 'Single Bottle Retail Price (TSH)' : 'Single Unit Selling Price (TSH)' }}</label>
                    <input 
                      v-model="productForm.split_unit_price" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      class="form-input"
                    />
                  </div>
                </div>
              </div>

              <!-- Error Banner -->
              <div v-if="productError" class="error-banner">
                <AlertTriangle :size="16" />
                <span>{{ productError }}</span>
              </div>
            </div>

            <!-- Drawer Footer Actions -->
            <div class="drawer-footer">
              <button type="button" class="btn-cancel" @click="showProductDrawer = false">Cancel</button>
              <button type="submit" class="btn-submit" :disabled="productSubmitting">
                <RefreshCw v-if="productSubmitting" :size="15" class="spin-anim" />
                <span>{{ isEditing ? 'Update Catalog Product' : (isBar ? 'Register Drink' : 'Register Product') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: Create Category -->
      <div v-if="showCategoryDrawer" class="submodal-overlay" @click.self="showCategoryDrawer = false">
        <div class="submodal-card">
          <div class="submodal-header">
            <h4>Create New Category</h4>
            <button class="btn-close-sub" @click="showCategoryDrawer = false"><X :size="16" /></button>
          </div>

          <form class="submodal-body" @submit.prevent="handleSaveCategory">
            <div class="form-group">
              <label>Category Name <span class="req">*</span></label>
              <input 
                v-model="categoryForm.name" 
                type="text" 
                placeholder="e.g. Domestic Beers, Spirits, Writing Pens" 
                class="form-input"
                @input="onCategoryNameChange"
                required
                autofocus
              />
            </div>

            <div class="form-group">
              <label>URL Slug</label>
              <input 
                v-model="categoryForm.slug" 
                type="text" 
                class="form-input" 
                required
              />
            </div>

            <div v-if="categoryError" class="error-banner">
              <AlertTriangle :size="16" />
              <span>{{ categoryError }}</span>
            </div>

            <div class="submodal-footer">
              <button type="button" class="btn-cancel" @click="showCategoryDrawer = false">Cancel</button>
              <button type="submit" class="btn-submit" :disabled="categorySubmitting">
                <RefreshCw v-if="categorySubmitting" :size="14" class="spin-anim" />
                <span>Create Category</span>
              </button>
            </div>
          </form>
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

.catalog-window {
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
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary-action:hover { background: #fbbf24; }

.btn-tool {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
}

.btn-close-window {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border-radius: 10px;
  padding: 8px;
  cursor: pointer;
  border: none;
}

.btn-close-window:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; }

/* Tabs Bar */
.window-tabs-bar {
  display: flex;
  gap: 6px;
  padding: 8px 24px;
  background: rgba(15, 23, 42, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.tab-btn.active {
  background: #f59e0b;
  color: #0f172a;
}

/* Tab Content */
.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Toolbar */
.catalog-toolbar {
  padding: 12px 24px;
  background: rgba(15, 23, 42, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.search-box {
  flex: 1;
  max-width: 440px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon { position: absolute; left: 12px; color: #64748b; }
.search-input {
  width: 100%;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 9px 12px 9px 36px;
  color: #f8fafc;
  font-size: 12.5px;
  outline: none;
}
.search-input:focus { border-color: #f59e0b; }

.filter-select {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 8px 12px;
  color: #f8fafc;
  font-size: 12px;
  outline: none;
}

/* Table */
.table-container {
  flex: 1;
  overflow-y: auto;
}

.catalog-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}

.catalog-table th {
  background: rgba(15, 23, 42, 0.95);
  color: #94a3b8;
  font-weight: 700;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: sticky;
  top: 0;
  z-index: 10;
}

.catalog-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
}

.catalog-table tr:hover td { background: rgba(255, 255, 255, 0.02); }

.prod-name-cell { display: flex; flex-direction: column; }
.prod-title { font-weight: 700; color: #f8fafc; font-size: 13px; }
.sku-sub { font-size: 10.5px; color: #64748b; }

.cat-badge {
  background: rgba(255, 255, 255, 0.06);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
}

.badge-tag {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
}

.badge-alcohol { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
.badge-soft { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.badge-pack { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
.badge-single { background: rgba(255, 255, 255, 0.06); color: #94a3b8; }
.vol-info { margin-left: 6px; font-size: 10.5px; color: #94a3b8; }

.text-right { text-align: right; }
.font-num { font-variant-numeric: tabular-nums; }
.font-bold { font-weight: 800; }
.text-accent { color: #fbbf24; }
.text-amber { color: #f59e0b; }

.margin-pill {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 800;
}

.row-actions { display: flex; justify-content: flex-end; gap: 6px; }

.btn-icon {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-edit:hover { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.btn-delete:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; }

/* Categories Grid */
.categories-grid {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  overflow-y: auto;
}

.category-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cat-header { display: flex; align-items: center; gap: 12px; }
.cat-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cat-name { font-size: 13.5px; font-weight: 800; color: #f8fafc; display: block; }
.cat-slug { font-size: 11px; color: #64748b; }
.cat-footer { font-size: 11.5px; color: #94a3b8; border-top: 1px solid rgba(255, 255, 255, 0.04); padding-top: 8px; }

/* Drawer & Submodal */
.drawer-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 100%;
  max-width: 540px;
  height: 100%;
  background: #1e293b;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.6);
}

.drawer-header {
  padding: 18px 24px;
  background: rgba(15, 23, 42, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-title-group { display: flex; align-items: center; gap: 12px; }
.drawer-title-group h3 { font-size: 15px; font-weight: 800; color: #f8fafc; margin: 0; }
.drawer-sub { font-size: 11px; color: #94a3b8; margin: 0; }

.type-toggle-container {
  display: flex;
  gap: 8px;
  padding: 14px 24px 0 24px;
  background: rgba(15, 23, 42, 0.5);
}

.type-toggle-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.type-toggle-btn.active {
  background: #f59e0b;
  color: #0f172a;
  border-color: #f59e0b;
}

.drawer-form {
  padding: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.drawer-scroll-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 8px;
}

.alcohol-card-highlight {
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.06);
}

.alcohol-badge-text {
  color: #fbbf24;
  font-size: 12.5px;
  font-weight: 800;
}

.input-with-suffix {
  display: flex;
  align-items: center;
  position: relative;
}

.suffix-badge {
  position: absolute;
  right: 12px;
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
}

.form-textarea {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 9px 12px;
  color: #f8fafc;
  font-size: 12px;
  outline: none;
  font-family: inherit;
  resize: vertical;
  min-height: 58px;
}

.form-textarea:focus { border-color: #f59e0b; }

.field-hint {
  font-size: 10.5px;
  color: #64748b;
  margin-top: 4px;
}

.opt {
  font-size: 10px;
  color: #64748b;
  font-weight: normal;
}

.margin-preview-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12px;
}

.margin-preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-label {
  color: #94a3b8;
  font-size: 11.5px;
}

.preview-value {
  font-size: 12.5px;
}

.text-emerald { color: #34d399; }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 11.5px; font-weight: 700; color: #cbd5e1; }
.label-with-action { display: flex; justify-content: space-between; align-items: center; }
.btn-inline-link { background: transparent; border: none; color: #fbbf24; font-size: 11px; font-weight: 700; cursor: pointer; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.form-input, .form-select {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 9px 12px;
  color: #f8fafc;
  font-size: 12px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus, .form-select:focus { border-color: #f59e0b; }

.section-box {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 14px;
}

.checkbox-row { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
.form-checkbox { margin-top: 3px; accent-color: #f59e0b; }
.checkbox-label strong { font-size: 12px; color: #f8fafc; display: block; }
.checkbox-label .sublabel { font-size: 10.5px; color: #94a3b8; display: block; margin-top: 2px; }

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 11.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-footer {
  padding: 16px 24px;
  background: rgba(15, 23, 42, 0.9);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn-submit {
  background: #f59e0b;
  color: #0f172a;
  border: none;
  padding: 9px 20px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-submit:hover:not(:disabled) { background: #fbbf24; }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

/* Submodal */
.submodal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submodal-card {
  width: 100%;
  max-width: 440px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  overflow: hidden;
}

.submodal-header {
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.submodal-header h4 { font-size: 14px; font-weight: 800; color: #f8fafc; margin: 0; }
.submodal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.submodal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }

.btn-close-sub { background: transparent; border: none; color: #94a3b8; cursor: pointer; }
.req { color: #f87171; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #f59e0b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spin-anim { animation: spin 0.8s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>

