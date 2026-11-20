<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import api from '../api'
import { 
  Wine, BookOpen, Layers, Plus, Search, Edit3, Trash2, 
  X, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, 
  DollarSign, Package, Tag, RefreshCw, BarChart2, ShieldCheck,
  Percent, ArrowRight, MapPin
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
  branch: null,
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
  branch: null,
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

// RBAC: Only Managers and Owner can register, edit, or deactivate catalog items
const canManage = computed(() => {
  if (store.isOwner) return true
  if (isBar.value) return store.user?.role === 'bar_manager'
  return store.user?.role === 'stationery_manager'
})

// Drink & Grocery Packaging Presets (Standard for Tanzania & East African Groceries / Bars)
const drinkPackagePresets = [
  {
    id: 'beer_crate_25',
    label: 'Beer Crate (25 Btls)',
    icon: '🍺',
    desc: 'Kilimanjaro, Safari, Serengeti (500ml)',
    pack_name: 'Crate',
    unit_name: 'Bottle',
    capacity: 25,
    is_alcoholic: true,
    volume_ml: '500',
    default_price: '70000',
    default_split_price: '3000',
  },
  {
    id: 'beer_crate_24',
    label: 'Beer Crate (24 Cans/Btls)',
    icon: '🍻',
    desc: 'Castle Lite, Heineken, Windhoek (330ml)',
    pack_name: 'Crate',
    unit_name: 'Bottle',
    capacity: 24,
    is_alcoholic: true,
    volume_ml: '330',
    default_price: '72000',
    default_split_price: '3500',
  },
  {
    id: 'juice_carton_24',
    label: 'Juice Carton (24 Packs)',
    icon: '🧃',
    desc: 'Azam Juice, Ceres, Mo Juice (250ml)',
    pack_name: 'Carton',
    unit_name: 'Pack',
    capacity: 24,
    is_alcoholic: false,
    volume_ml: '250',
    default_price: '24000',
    default_split_price: '1200',
  },
  {
    id: 'juice_carton_12',
    label: 'Juice Carton (12 Bottles)',
    icon: '🧃',
    desc: 'Sayona, Fresh Fruit Juice (500ml)',
    pack_name: 'Carton',
    unit_name: 'Bottle',
    capacity: 12,
    is_alcoholic: false,
    volume_ml: '500',
    default_price: '18000',
    default_split_price: '1800',
  },
  {
    id: 'water_carton_24',
    label: 'Water Carton (24 Bottles)',
    icon: '💧',
    desc: 'Kilimanjaro, Uhai, Afya Water (500ml)',
    pack_name: 'Carton',
    unit_name: 'Bottle',
    capacity: 24,
    is_alcoholic: false,
    volume_ml: '500',
    default_price: '18000',
    default_split_price: '1000',
  },
  {
    id: 'water_carton_12',
    label: 'Water Carton (12 Large Btls)',
    icon: '💧',
    desc: 'Mineral Water (1.5 Litres)',
    pack_name: 'Carton',
    unit_name: 'Bottle',
    capacity: 12,
    is_alcoholic: false,
    volume_ml: '1500',
    default_price: '18000',
    default_split_price: '2000',
  },
  {
    id: 'soda_crate_24',
    label: 'Soda Crate (24 Glass Btls)',
    icon: '🥤',
    desc: 'Coca-Cola, Fanta, Sprite, Pepsi (350ml)',
    pack_name: 'Crate',
    unit_name: 'Bottle',
    capacity: 24,
    is_alcoholic: false,
    volume_ml: '350',
    default_price: '24000',
    default_split_price: '1200',
  },
  {
    id: 'energy_carton_24',
    label: 'Energy Pack (24 Cans)',
    icon: '⚡',
    desc: 'Red Bull, Mo Energy, Azam Energy (250ml)',
    pack_name: 'Carton',
    unit_name: 'Can',
    capacity: 24,
    is_alcoholic: false,
    volume_ml: '250',
    default_price: '60000',
    default_split_price: '3000',
  },
  {
    id: 'wine_spirits_case_6',
    label: 'Wine / Spirit Case (6 Btls)',
    icon: '🍷',
    desc: 'Wine, Whiskeys, Vodka (750ml)',
    pack_name: 'Case',
    unit_name: 'Bottle',
    capacity: 6,
    is_alcoholic: true,
    volume_ml: '750',
    default_price: '120000',
    default_split_price: '25000',
  }
]

const activePreset = ref(null)

const applyPackagePreset = (preset) => {
  activePreset.value = preset.id
  productForm.value.is_pack = true
  productForm.value.pack_name = preset.pack_name
  productForm.value.unit_name = preset.unit_name
  productForm.value.pack_unit_ratio = preset.capacity
  productForm.value.is_alcoholic = preset.is_alcoholic
  productForm.value.volume_ml = preset.volume_ml
  productForm.value.allow_split_sale = true

  if (!productForm.value.selling_price || parseFloat(productForm.value.selling_price) === 0) {
    productForm.value.selling_price = preset.default_price
  }
  if (!productForm.value.split_unit_price || parseFloat(productForm.value.split_unit_price) === 0) {
    productForm.value.split_unit_price = preset.default_split_price
  }
}

const onSinglePriceChange = () => {
  const single = parseFloat(productForm.value.split_unit_price || 0)
  const ratio = parseInt(productForm.value.pack_unit_ratio || 1, 10)
  if (single > 0 && ratio > 0 && (!productForm.value.selling_price || parseFloat(productForm.value.selling_price) === 0)) {
    productForm.value.selling_price = (single * ratio).toFixed(2)
  }
}

const onCratePriceChange = () => {
  const cratePrice = parseFloat(productForm.value.selling_price || 0)
  const ratio = parseInt(productForm.value.pack_unit_ratio || 1, 10)
  if (cratePrice > 0 && ratio > 0 && (!productForm.value.split_unit_price || parseFloat(productForm.value.split_unit_price) === 0)) {
    productForm.value.split_unit_price = (cratePrice / ratio).toFixed(2)
  }
}

const getUnitCost = computed(() => {
  if (!productForm.value.is_pack || !productForm.value.pack_unit_ratio) return parseFloat(productForm.value.cost_price || 0)
  return parseFloat(productForm.value.cost_price || 0) / productForm.value.pack_unit_ratio
})

const getSingleProfit = computed(() => {
  const singlePrice = parseFloat(productForm.value.split_unit_price || 0)
  const unitCost = getUnitCost.value
  return singlePrice - unitCost
})

const getPackageProfit = computed(() => {
  const packPrice = parseFloat(productForm.value.selling_price || 0)
  const packCost = parseFloat(productForm.value.cost_price || 0)
  return packPrice - packCost
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

watch(() => store.activeBranchId, () => {
  fetchData()
})

const onBranchChanged = () => {
  fetchData()
}

onMounted(() => {
  store.fetchBranches()
  fetchData()
  window.addEventListener('fringe-branch-changed', onBranchChanged)
})

onUnmounted(() => {
  window.removeEventListener('fringe-branch-changed', onBranchChanged)
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
  activePreset.value = null
  if (store.user?.role === 'stationery_manager' || store.activeUnit === 'stationery') {
    itemType.value = 'stationery'
  } else {
    itemType.value = 'bar'
  }

  const defaultBranch = (store.activeBranchId && store.activeBranchId !== 'all')
    ? parseInt(store.activeBranchId, 10)
    : (store.branches[0]?.id || null)

  productForm.value = {
    name: '',
    category: categories.value[0]?.id || '',
    branch: isBar.value ? defaultBranch : null,
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
  const matched = drinkPackagePresets.find(p => p.pack_name === prod.pack_name && p.capacity === prod.pack_unit_ratio)
  activePreset.value = matched ? matched.id : null

  productForm.value = {
    name: prod.name,
    category: prod.category || '',
    branch: prod.branch || null,
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

  // Auto-sync prices if one was left blank for packaged goods
  if (productForm.value.is_pack && productForm.value.allow_split_sale) {
    const ratio = parseInt(productForm.value.pack_unit_ratio || 1, 10)
    if ((!productForm.value.selling_price || parseFloat(productForm.value.selling_price) <= 0) && productForm.value.split_unit_price) {
      productForm.value.selling_price = (parseFloat(productForm.value.split_unit_price) * ratio).toFixed(2)
    } else if (productForm.value.selling_price && (!productForm.value.split_unit_price || parseFloat(productForm.value.split_unit_price) <= 0)) {
      productForm.value.split_unit_price = (parseFloat(productForm.value.selling_price) / ratio).toFixed(2)
    }
  }

  if (!productForm.value.selling_price || parseFloat(productForm.value.selling_price) <= 0) {
    productError.value = 'Selling price must be greater than zero.'
    return
  }
  if (isBar.value && store.branches.length > 0 && !productForm.value.branch) {
    productError.value = 'Please assign this drink to a specific branch location.'
    return
  }

  productSubmitting.value = true
  productError.value = ''

  try {
    const payload = {
      ...productForm.value,
      cost_price: productForm.value.cost_price || '0.00',
      category: productForm.value.category || null,
      branch: isBar.value ? productForm.value.branch : null,
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
  const defaultBranch = (store.activeBranchId && store.activeBranchId !== 'all')
    ? parseInt(store.activeBranchId, 10)
    : (store.branches[0]?.id || null)

  categoryForm.value = {
    name: '',
    slug: '',
    icon: 'tag',
    branch: isBar.value ? defaultBranch : null,
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
  if (isBar.value && store.branches.length > 0 && !categoryForm.value.branch) {
    categoryError.value = 'Please select a branch location for this category.'
    return
  }

  categorySubmitting.value = true
  categoryError.value = ''

  try {
    const payload = {
      ...categoryForm.value,
      branch: isBar.value ? categoryForm.value.branch : null
    }
    const res = await api.post('/catalog/categories/', payload)
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
  <div class="catalog-page">
    <div class="catalog-window">
      <!-- Window Header -->
      <div class="window-header">
        <div class="header-branding">
          <div class="header-icon-box">
            <Wine v-if="isBar" :size="24" />
            <BookOpen v-else :size="24" />
          </div>
          <div>
            <div class="branding-badge-row">
              <span class="branding-badge">TANZANIA STATUTORY COMPLIANCE • TSH</span>
              <span v-if="isBar" class="branch-indicator-badge">
                <MapPin :size="12" />
                <span>{{ store.activeBranchName }}</span>
              </span>
            </div>
            <h2>{{ isBar ? t('cat.barTitle') : t('cat.statTitle') }}</h2>
            <span class="subtitle">{{ t('cat.subtitle') }}</span>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-primary-action" @click="openCreateProduct">
            <Plus :size="16" />
            <span>{{ isBar ? t('cat.registerDrink') : t('cat.registerProduct') }}</span>
          </button>

          <button class="btn-tool" @click="fetchData" :title="t('common.refresh')">
            <RefreshCw :size="16" :class="{ 'spin-anim': loading }" />
          </button>

          <button class="btn-close-window" @click="emit('close')" :title="t('common.backToPos')">
            <X :size="18" />
            <span>{{ t('common.backToPos') }}</span>
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
          <span>{{ isBar ? t('cat.tabDrinks') : t('cat.tabProducts') }} ({{ products.length }})</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'categories' }"
          @click="activeTab = 'categories'"
        >
          <Tag :size="16" />
          <span>{{ t('cat.tabCategories') }} ({{ categories.length }})</span>
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
              :placeholder="isBar ? t('cat.searchDrink') : t('cat.searchProduct')" 
              class="search-input"
            />
          </div>

          <div class="toolbar-right">
            <select v-model="categoryFilter" class="filter-select">
              <option value="all">{{ t('cat.allCategories') }}</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>

        <!-- Products Table -->
        <div class="table-container">
          <div v-if="loading" class="state-box">
            <div class="spinner"></div>
            <p>{{ t('cat.loading') }}</p>
          </div>

          <div v-else-if="filteredProducts.length === 0" class="empty-box">
            <Layers :size="40" class="empty-icon" />
            <h4>{{ t('cat.emptyTitle') }}</h4>
            <p>{{ isBar ? t('cat.emptyDrinkSub') : t('cat.emptyProductSub') }}</p>
          </div>

          <table v-else class="catalog-table">
            <thead>
              <tr>
                <th>{{ isBar ? 'Beverage / Drink' : 'Product Name' }}</th>
                <th>Category</th>
                <th v-if="isBar && store.isOwner">Branch</th>
                <th>Packaging & Capacity</th>
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
                    <div class="prod-badges-inline">
                      <span v-if="p.sku" class="sku-sub">SKU: {{ p.sku }}</span>
                      <span v-if="p.is_alcoholic" class="badge-tag badge-alcohol">18+ Alcohol</span>
                      <span v-else-if="isBar" class="badge-tag badge-soft">Soft Drink</span>
                      <span v-if="p.volume_ml" class="vol-info">{{ p.volume_ml }}ml</span>
                    </div>
                  </div>
                </td>

                <td>
                  <span class="cat-badge">{{ p.category_name || 'Unassigned' }}</span>
                </td>

                <td v-if="isBar && store.isOwner">
                  <span v-if="p.branch_name" class="branch-tag">
                    <MapPin :size="11" />
                    <span>{{ p.branch_name }}</span>
                  </span>
                  <span v-else class="branch-tag-all">Global</span>
                </td>

                <!-- Packaging & Capacity -->
                <td>
                  <div v-if="p.is_pack" class="pack-display-cell">
                    <span class="badge-tag badge-pack">
                      📦 1 {{ p.pack_name || 'Crate' }} = {{ p.pack_unit_ratio }} {{ p.unit_name || 'Bottles' }}
                    </span>
                    <span v-if="p.allow_split_sale && p.split_unit_price" class="split-sale-hint">
                      🍾 Single: TSH {{ parseFloat(p.split_unit_price).toLocaleString() }}
                    </span>
                  </div>
                  <div v-else>
                    <span class="badge-tag badge-single">Single Unit</span>
                  </div>
                </td>

                <!-- Cost Price -->
                <td class="text-right font-num">
                  TSH {{ parseFloat(p.cost_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                </td>

                <!-- Selling Price -->
                <td class="text-right font-num font-bold text-accent">
                  <div class="price-cell-stack">
                    <span>TSH {{ parseFloat(p.selling_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
                    <span v-if="p.is_pack" class="price-sub-label">per {{ p.pack_name || 'crate' }}</span>
                  </div>
                </td>

                <!-- Margin -->
                <td class="text-right font-num">
                  <span class="margin-pill">
                    {{ calculateMargin(p.selling_price, p.cost_price) }}%
                  </span>
                </td>

                <!-- Current Stock -->
                <td class="text-right font-num">
                  <div v-if="p.is_pack">
                    <span :class="parseFloat(p.stock_quantity) <= parseFloat(p.reorder_threshold) ? 'text-amber font-bold' : ''">
                      {{ Math.floor(parseFloat(p.stock_quantity || 0)) }} {{ p.pack_name || 'Crates' }}
                    </span>
                    <span v-if="p.pack_unit_ratio > 1" class="stock-sub-units">
                      ({{ Math.round(parseFloat(p.stock_quantity || 0) * p.pack_unit_ratio) }} {{ p.unit_name || 'bottles' }})
                    </span>
                  </div>
                  <div v-else>
                    <span :class="parseFloat(p.stock_quantity) <= parseFloat(p.reorder_threshold) ? 'text-amber font-bold' : ''">
                      {{ parseFloat(p.stock_quantity).toLocaleString() }}
                    </span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="text-right">
                  <div v-if="canManage" class="row-actions">
                    <button class="btn-icon btn-edit" @click="openEditProduct(p)" title="Edit Pricing & Details">
                      <Edit3 :size="15" />
                    </button>
                    <button class="btn-icon btn-delete" @click="handleDeactivateProduct(p)" title="Deactivate from Catalog">
                      <Trash2 :size="15" />
                    </button>
                  </div>
                  <span v-else class="text-muted text-xs">Read Only</span>
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
          <button v-if="canManage" class="btn-primary-action" @click="openCreateCategory">
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

                <!-- Physical Branch Location (Bar & Lounge) -->
                <div class="form-group" v-if="isBar && store.branches.length > 0">
                  <label>Physical Branch Location <span class="req">*</span></label>
                  <select v-model="productForm.branch" class="form-select" required>
                    <option :value="null" disabled>Select Branch Location...</option>
                    <option v-for="b in store.branches" :key="b.id" :value="b.id">
                      📍 {{ b.name }} ({{ b.code }}) {{ b.is_active ? '' : '[Inactive]' }}
                    </option>
                  </select>
                  <span class="field-hint">Drink catalogs and stock are strictly isolated per branch location.</span>
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

              <!-- SECTION 2: DRINK PACKAGING & CAPACITY CONFIGURATION (STEP 5) -->
              <div class="form-section-card highlight-packaging-card">
                <div class="form-section-title text-amber">
                  <Package :size="15" />
                  <span>Step 5: Packaging & Capacity (Crates, Cartons & Packs)</span>
                </div>

                <div class="checkbox-row highlight-checkbox">
                  <input 
                    type="checkbox" 
                    id="chkPack" 
                    v-model="productForm.is_pack" 
                    class="form-checkbox"
                  />
                  <label for="chkPack" class="checkbox-label">
                    <strong class="packaging-badge-text">
                      {{ isBar ? 'Stocked & Handled in Crates / Cartons / Cases' : 'Pack / Bulk Product (Box, Carton, Ream)' }}
                    </strong>
                    <span class="sublabel">
                      {{ isBar ? 'Configure how many bottles or cans are contained inside each crate or carton (e.g. 25 beers/crate, 24 juices/carton, 24 waters/carton).' : 'Allows selling as complete bulk packs and breaking down into individual retail pieces.' }}
                    </span>
                  </label>
                </div>

                <div v-if="productForm.is_pack" class="pack-config-details mt-3">
                  <!-- Quick Presets for Drinks (Tanzania Bar & Grocery Domain) -->
                  <div v-if="isBar" class="package-presets-section">
                    <span class="presets-title">⚡ Quick Grocery & Bar Packaging Presets:</span>
                    <div class="presets-grid">
                      <button 
                        v-for="preset in drinkPackagePresets" 
                        :key="preset.id"
                        type="button"
                        class="preset-chip"
                        :class="{ active: activePreset === preset.id }"
                        @click="applyPackagePreset(preset)"
                      >
                        <span class="preset-name">{{ preset.label }}</span>
                        <span class="preset-desc">{{ preset.pack_name }} of {{ preset.capacity }} {{ preset.unit_name }}s</span>
                      </button>
                    </div>
                  </div>

                  <!-- Packaging Capacity Equation Display -->
                  <div class="packaging-rule-banner">
                    <div class="rule-icon">📦</div>
                    <div class="rule-equation">
                      <span>1 {{ productForm.pack_name || 'Crate' }} of <strong>{{ productForm.name || 'Drink' }}</strong> holds</span>
                      <span class="pill-unit-large">{{ productForm.pack_unit_ratio || 1 }}</span>
                      <span>individual {{ productForm.unit_name || 'Bottles' }}</span>
                    </div>
                  </div>

                  <!-- Packaging Breakdown Form Inputs -->
                  <div class="form-row">
                    <div class="form-group">
                      <label>Package / Bulk Container Name <span class="req">*</span></label>
                      <input 
                        v-model="productForm.pack_name" 
                        type="text" 
                        :placeholder="isBar ? 'e.g. Crate, Carton, Case, 6-Pack' : 'e.g. Box, Ream, Carton'" 
                        class="form-input" 
                        required
                      />
                      <span class="field-hint">e.g. "Crate" for beers, "Carton" for juice/water boxes.</span>
                    </div>

                    <div class="form-group">
                      <label>Items / Bottles Per Package <span class="req">*</span></label>
                      <div class="input-with-suffix">
                        <input 
                          v-model.number="productForm.pack_unit_ratio" 
                          type="number" 
                          min="1" 
                          step="1"
                          placeholder="e.g. 25, 24, 12, 6" 
                          class="form-input" 
                          required
                          @input="onCratePriceChange"
                        />
                        <span class="suffix-badge">{{ productForm.unit_name || 'units' }}</span>
                      </div>
                      <span class="field-hint">e.g. 25 for Kilimanjaro beer, 24 for Azam juice/water carton.</span>
                    </div>

                    <div class="form-group">
                      <label>Single Item Unit Name <span class="req">*</span></label>
                      <input 
                        v-model="productForm.unit_name" 
                        type="text" 
                        :placeholder="isBar ? 'e.g. Bottle, Can, Pack' : 'e.g. Piece, Pen, Sheet'" 
                        class="form-input" 
                        required
                      />
                      <span class="field-hint">e.g. "Bottle", "Can", or "Pack".</span>
                    </div>
                  </div>

                  <!-- Single Bottle / Item Split Sales Checkbox -->
                  <div class="checkbox-row split-sale-row mt-2">
                    <input 
                      type="checkbox" 
                      id="chkSplit" 
                      v-model="productForm.allow_split_sale" 
                      class="form-checkbox"
                    />
                    <label for="chkSplit" class="checkbox-label">
                      <strong>{{ isBar ? 'Enable Single Bottle / Single Unit Sales at POS Counter' : 'Allow Single Unit Split Sales' }}</strong>
                      <span class="sublabel">
                        When checked, bartenders/cashiers can sell both full {{ productForm.pack_name || 'crates' }} and single {{ productForm.unit_name || 'bottles' }}. Stock automatically deducts 1/{{ productForm.pack_unit_ratio || 1 }} {{ productForm.pack_name || 'crate' }} per single sale.
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- SECTION 3: PRICING & PROFIT MARGINS (STEP 6) -->
              <div class="form-section-card">
                <div class="form-section-title">
                  <DollarSign :size="14" />
                  <span>Step 6: Pricing & Gross Profit (TSH)</span>
                </div>

                <div class="pricing-dual-grid" v-if="productForm.is_pack && productForm.allow_split_sale">
                  <!-- Package / Crate Price Card -->
                  <div class="price-input-card">
                    <div class="price-card-header">
                      <Package :size="13" />
                      <span>Full {{ productForm.pack_name || 'Crate' }} Wholesale Price</span>
                    </div>
                    <div class="form-group">
                      <label>Selling Price per {{ productForm.pack_name || 'Crate' }} (TSH) <span class="req">*</span></label>
                      <input 
                        v-model="productForm.selling_price" 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        placeholder="e.g. 62,500.00" 
                        class="form-input font-bold text-accent"
                        required
                        @input="onCratePriceChange"
                      />
                    </div>
                    <div class="price-card-summary">
                      <span>Package Profit:</span>
                      <strong class="text-emerald">
                        TSH {{ getPackageProfit > 0 ? getPackageProfit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00' }}
                      </strong>
                    </div>
                  </div>

                  <!-- Single Unit / Bottle Price Card -->
                  <div class="price-input-card">
                    <div class="price-card-header">
                      <Wine v-if="isBar" :size="13" />
                      <Tag v-else :size="13" />
                      <span>Single {{ productForm.unit_name || 'Bottle' }} Retail Price</span>
                    </div>
                    <div class="form-group">
                      <label>Selling Price per {{ productForm.unit_name || 'Bottle' }} (TSH) <span class="req">*</span></label>
                      <input 
                        v-model="productForm.split_unit_price" 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        placeholder="e.g. 2,500.00" 
                        class="form-input font-bold text-cyan"
                        required
                        @input="onSinglePriceChange"
                      />
                    </div>
                    <div class="price-card-summary">
                      <span>Profit per {{ productForm.unit_name || 'Bottle' }}:</span>
                      <strong class="text-cyan">
                        TSH {{ getSingleProfit > 0 ? getSingleProfit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00' }}
                      </strong>
                    </div>
                  </div>
                </div>

                <!-- Single Item Non-Pack Pricing -->
                <div v-else class="form-row">
                  <div class="form-group">
                    <label>Retail Selling Price (TSH) <span class="req">*</span></label>
                    <input 
                      v-model="productForm.selling_price" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      placeholder="0.00" 
                      class="form-input font-bold text-accent"
                      required
                    />
                  </div>
                </div>

                <!-- Cost Price from Brewery / Supplier -->
                <div class="form-row mt-2">
                  <div class="form-group">
                    <label>
                      {{ productForm.is_pack ? `Cost Price per ${productForm.pack_name || 'Crate'} (TSH)` : 'Cost Price (TSH)' }}
                      <span class="opt">(Optional)</span>
                    </label>
                    <input 
                      v-model="productForm.cost_price" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      placeholder="0.00" 
                      class="form-input"
                    />
                    <span v-if="productForm.is_pack && productForm.cost_price" class="field-hint">
                      Equates to ~TSH {{ getUnitCost.toLocaleString('en-US', { maximumFractionDigits: 2 }) }} cost per single {{ productForm.unit_name || 'bottle' }}.
                    </span>
                  </div>
                  <div class="form-group">
                    <label>Overall Gross Margin (%)</label>
                    <div class="margin-readonly-display">
                      <span class="margin-pill large">{{ calculateMargin(productForm.selling_price, productForm.cost_price) }}%</span>
                      <span class="field-hint">Calculated on full package retail selling price.</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- SECTION 4: INVENTORY CONTROL (STEP 7) -->
              <div class="form-section-card">
                <div class="form-section-title">
                  <Layers :size="14" />
                  <span>Step 7: Inventory & Reorder Levels</span>
                </div>

                <div class="form-row">
                  <div class="form-group" v-if="!isEditing">
                    <label>
                      {{ productForm.is_pack ? `Opening Stock (${productForm.pack_name || 'Crates'})` : 'Opening Stock Quantity' }}
                    </label>
                    <input 
                      v-model="productForm.stock_quantity" 
                      type="number" 
                      step="1" 
                      min="0" 
                      class="form-input"
                    />
                    <span v-if="productForm.is_pack && productForm.stock_quantity" class="field-hint text-emerald">
                      = {{ Math.round(parseFloat(productForm.stock_quantity || 0) * (productForm.pack_unit_ratio || 1)) }} total {{ productForm.unit_name || 'bottles' }} available.
                    </span>
                  </div>

                  <div class="form-group">
                    <label>
                      {{ productForm.is_pack ? `Reorder Alert Threshold (${productForm.pack_name || 'Crates'})` : 'Reorder Alert Threshold' }}
                    </label>
                    <input 
                      v-model="productForm.reorder_threshold" 
                      type="number" 
                      step="1" 
                      min="0" 
                      class="form-input"
                    />
                    <span class="field-hint">Alert bartender/manager when stock drops below this level.</span>
                  </div>
                </div>
              </div>

              <!-- SECTION 5: TANZANIA STATUTORY ALCOHOL COMPLIANCE (STEP 8) -->
              <div v-if="isBar" class="form-section-card alcohol-card-highlight">
                <div class="form-section-title text-amber">
                  <Wine :size="16" />
                  <span>Step 8: Tanzania Regulatory Compliance (Liquor Laws)</span>
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
            <div class="form-group" v-if="isBar && store.branches.length > 0">
              <label>Branch Location <span class="req">*</span></label>
              <select v-model="categoryForm.branch" class="form-select" required>
                <option :value="null" disabled>Select Branch Location...</option>
                <option v-for="b in store.branches" :key="b.id" :value="b.id">
                  📍 {{ b.name }} ({{ b.code }})
                </option>
              </select>
            </div>

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
.catalog-page {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary, #0a0e17);
}

.catalog-window {
  width: 100%;
  flex: 1;
  min-height: 0;
  background: var(--bg-secondary, #0f172a);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.window-header {
  padding: 16px 24px;
  background: var(--bg-secondary, rgba(15, 23, 42, 0.95));
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.window-header h2 {
  color: var(--text-primary, #f8fafc);
}

.window-header .subtitle {
  color: var(--text-secondary, #94a3b8);
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

.branding-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.branding-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #fbbf24;
}

.branch-indicator-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 1px 7px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 700;
}

.branch-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.branch-tag-all {
  font-size: 11px;
  color: #94a3b8;
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
  background: var(--bg-card, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #f1f5f9);
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
}

.btn-close-window {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-card, rgba(255, 255, 255, 0.06));
  color: var(--text-secondary, #94a3b8);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
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

/* Packaging & Presets Styles */
.highlight-packaging-card {
  border: 1px solid rgba(245, 158, 11, 0.3) !important;
  background: rgba(245, 158, 11, 0.04) !important;
}

.packaging-badge-text {
  color: #fbbf24;
}

.package-presets-section {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
}

.presets-title {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #fbbf24;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 8px;
}

.preset-chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}

.preset-chip:hover {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.4);
}

.preset-chip.active {
  background: rgba(245, 158, 11, 0.2);
  border-color: #f59e0b;
}

.preset-name {
  font-size: 11px;
  font-weight: 800;
  color: #f8fafc;
}

.preset-desc {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
}

.packaging-rule-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px dashed rgba(245, 158, 11, 0.4);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 12px;
}

.rule-icon {
  font-size: 22px;
}

.rule-equation {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: #e2e8f0;
}

.pill-unit-large {
  background: #f59e0b;
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 6px;
}

.pricing-dual-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 8px;
}

.price-input-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.price-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.price-card-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #94a3b8;
  padding-top: 6px;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
}

.margin-readonly-display {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
}

.margin-pill.large {
  font-size: 13px;
  padding: 4px 10px;
}

.pack-display-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.split-sale-hint {
  font-size: 10.5px;
  color: #38bdf8;
  font-weight: 600;
}

.price-cell-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.price-sub-label {
  font-size: 10px;
  color: #94a3b8;
  font-weight: normal;
}

.stock-sub-units {
  display: block;
  font-size: 10px;
  color: #94a3b8;
}

.prod-badges-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}
</style>

