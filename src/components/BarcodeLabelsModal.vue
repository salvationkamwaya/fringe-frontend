<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import api from '../api'
import { 
  Barcode, Printer, Search, Plus, Minus, Trash2, X, RefreshCw, Check
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const products = ref([])
const loading = ref(false)
const searchQuery = ref('')
const selectedProducts = ref([]) // [{ product, copies: 1, printType: 'pack' | 'unit' }]
const labelLayout = ref('THERMAL_50X30') // 'THERMAL_50X30' | 'A4_30_SHEET' | 'SHELF_TAG'
const includePrice = ref(true)
const includeStoreName = ref(true)

const fetchProducts = async () => {
  loading.value = true
  try {
    const res = await api.get('/catalog/products/')
    products.value = res.data
    selectedProducts.value = []
  } catch (err) {
    store.showToast('Failed to load products for barcode printing.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchProducts()
})

const filteredCatalog = computed(() => {
  if (!searchQuery.value) return products.value
  const q = searchQuery.value.toLowerCase()
  return products.value.filter(p => 
    p.name.toLowerCase().includes(q) ||
    (p.sku && p.sku.toLowerCase().includes(q)) ||
    (p.barcode && p.barcode.includes(q))
  )
})

const addProductToLabels = (prod) => {
  const existing = selectedProducts.value.find(item => item.product.id === prod.id)
  if (existing) {
    existing.copies += 1
  } else {
    selectedProducts.value.push({
      product: prod,
      copies: 1,
      printType: prod.is_pack ? 'pack' : 'unit'
    })
  }
  store.showToast(`Added ${prod.name} to print queue`, 'info')
}

const removeProduct = (idx) => {
  selectedProducts.value.splice(idx, 1)
}

const totalLabelsCount = computed(() => {
  return selectedProducts.value.reduce((acc, i) => acc + (parseInt(i.copies) || 1), 0)
})

// Flattened list for the print preview
const printableLabels = computed(() => {
  const list = []
  selectedProducts.value.forEach(item => {
    const qty = Math.max(1, parseInt(item.copies) || 1)
    for (let c = 0; c < qty; c++) {
      list.push({
        id: `${item.product.id}-${c}`,
        product: item.product,
        printType: item.printType
      })
    }
  })
  return list
})

const printLabels = () => {
  window.print()
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card labels-card">
      <!-- HEADER -->
      <div class="modal-header no-print">
        <div class="header-title-box">
          <div class="icon-bubble">
            <Barcode :size="22" class="text-amber" />
          </div>
          <div>
            <h2>{{ t('bc.title') }}</h2>
            <p class="subtitle">{{ t('bc.subtitle') }}</p>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-print" :disabled="printableLabels.length === 0" @click="printLabels">
            <Printer :size="16" />
            <span>{{ t('bc.print') }} ({{ totalLabelsCount }}) {{ t('bc.labels') }}</span>
          </button>
          <button class="btn-close" @click="$emit('close')" :title="t('common.backToPos')">
            <X :size="16" />
            <span>{{ t('common.backToPos') }}</span>
          </button>
        </div>
      </div>

      <!-- WORKSPACE -->
      <div class="labels-workspace">
        <!-- LEFT: Product Selector & Options (no-print) -->
        <aside class="sidebar-config no-print">
          <div class="config-section">
            <label class="section-label">{{ t('bc.formatLabel') }}</label>
            <select v-model="labelLayout" class="styled-select">
              <option value="THERMAL_50X30">Thermal Sticker (50mm x 30mm)</option>
              <option value="A4_30_SHEET">A4 Label Sheet (3x10 Grid)</option>
              <option value="SHELF_TAG">Shelf Price Tag (65mm x 40mm)</option>
            </select>
          </div>

          <div class="config-options-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="includePrice" />
              <span>{{ t('bc.showPrice') }}</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="includeStoreName" />
              <span>{{ t('bc.showBrand') }}</span>
            </label>
          </div>

          <!-- Add Product to Print Queue -->
          <div class="add-product-box">
            <label class="section-label">{{ t('bc.addQueue') }}</label>
            <div class="search-mini">
              <Search :size="14" class="text-muted" />
              <input 
                v-model="searchQuery" 
                type="text" 
                :placeholder="t('bc.searchPlaceholder')" 
                class="search-mini-input"
              />
            </div>

            <div class="catalog-mini-list">
              <div 
                v-for="p in filteredCatalog.slice(0, 15)" 
                :key="p.id" 
                class="catalog-mini-item"
                @click="addProductToLabels(p)"
              >
                <div class="item-text">
                  <strong>{{ p.name }}</strong>
                  <span class="subtext">{{ p.barcode || p.sku || 'No code' }}</span>
                </div>
                <button class="btn-add-mini">
                  <Plus :size="14" />
                </button>
              </div>
            </div>
          </div>

          <!-- Print Queue Summary -->
          <div class="queue-summary">
            <label class="section-label">{{ t('bc.selectedProducts') }} ({{ selectedProducts.length }})</label>
            <div class="queue-list-scroll">
              <div v-for="(it, idx) in selectedProducts" :key="it.product.id" class="queue-item">
                <div class="queue-info">
                  <span class="queue-name">{{ it.product.name }}</span>
                  <div class="queue-sub">
                    <select v-if="it.product.is_pack && it.product.allow_split_sale" v-model="it.printType" class="type-mini-select">
                      <option value="pack">Pack / Box</option>
                      <option value="unit">Single Piece</option>
                    </select>
                  </div>
                </div>

                <div class="copies-stepper">
                  <button class="step-btn" @click="it.copies = Math.max(1, it.copies - 1)">-</button>
                  <span class="step-val">{{ it.copies }}</span>
                  <button class="step-btn" @click="it.copies += 1">+</button>
                </div>

                <button class="btn-del-queue" @click="removeProduct(idx)">
                  <X :size="14" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <!-- RIGHT: Live Print Preview Sheet -->
        <main class="preview-stage">
          <div v-if="printableLabels.length === 0" class="no-labels-placeholder no-print">
            <Barcode :size="48" class="text-muted" />
            <h3>No labels selected for printing</h3>
            <p>Select products on the left to generate barcode stickers.</p>
          </div>

          <div v-else class="labels-grid-sheet" :class="labelLayout.toLowerCase()" id="labels-print-sheet">
            <div 
              v-for="lbl in printableLabels" 
              :key="lbl.id" 
              class="barcode-sticker"
              :class="labelLayout.toLowerCase()"
            >
              <div v-if="includeStoreName" class="sticker-brand">FRINGE STATIONERY</div>
              <div class="sticker-title">{{ lbl.product.name }}</div>

              <!-- Barcode SVG Simulation -->
              <div class="barcode-visual-box">
                <svg class="barcode-svg" viewBox="0 0 160 50" preserveAspectRatio="none">
                  <!-- Barcode stripes representation -->
                  <rect x="0" y="0" width="3" height="42" fill="#000" />
                  <rect x="5" y="0" width="2" height="42" fill="#000" />
                  <rect x="10" y="0" width="4" height="42" fill="#000" />
                  <rect x="16" y="0" width="2" height="42" fill="#000" />
                  <rect x="20" y="0" width="5" height="42" fill="#000" />
                  <rect x="28" y="0" width="2" height="42" fill="#000" />
                  <rect x="33" y="0" width="4" height="42" fill="#000" />
                  <rect x="39" y="0" width="3" height="42" fill="#000" />
                  <rect x="45" y="0" width="5" height="42" fill="#000" />
                  <rect x="53" y="0" width="2" height="42" fill="#000" />
                  <rect x="58" y="0" width="3" height="42" fill="#000" />
                  <rect x="64" y="0" width="4" height="42" fill="#000" />
                  <rect x="71" y="0" width="2" height="42" fill="#000" />
                  <rect x="76" y="0" width="5" height="42" fill="#000" />
                  <rect x="84" y="0" width="3" height="42" fill="#000" />
                  <rect x="90" y="0" width="2" height="42" fill="#000" />
                  <rect x="95" y="0" width="4" height="42" fill="#000" />
                  <rect x="102" y="0" width="3" height="42" fill="#000" />
                  <rect x="108" y="0" width="5" height="42" fill="#000" />
                  <rect x="116" y="0" width="2" height="42" fill="#000" />
                  <rect x="121" y="0" width="4" height="42" fill="#000" />
                  <rect x="128" y="0" width="3" height="42" fill="#000" />
                  <rect x="134" y="0" width="5" height="42" fill="#000" />
                  <rect x="142" y="0" width="2" height="42" fill="#000" />
                  <rect x="147" y="0" width="4" height="42" fill="#000" />
                  <rect x="154" y="0" width="3" height="42" fill="#000" />
                </svg>
                <span class="barcode-number-text">{{ lbl.product.barcode || lbl.product.sku || `PRD-${String(lbl.product.id).padStart(6, '0')}` }}</span>
              </div>

              <!-- Price Footer -->
              <div v-if="includePrice" class="sticker-price-row">
                <span class="unit-type-tag">
                  {{ lbl.printType === 'unit' ? (lbl.product.unit_name || 'Piece') : (lbl.product.pack_name || 'Item') }}
                </span>
                <span class="price-val">
                  TSH {{ (lbl.printType === 'unit' && lbl.product.allow_split_sale ? (lbl.product.split_unit_price || (lbl.product.selling_price / lbl.product.pack_unit_ratio)) : lbl.product.selling_price).toLocaleString() }}
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 15, 29, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1.5rem;
}

.labels-card {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 1150px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(17, 24, 39, 0.6);
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-bubble {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-amber { color: #fbbf24; }

.header-title-box h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f3f4f6;
  margin: 0;
}

.subtitle {
  font-size: 0.825rem;
  color: #9ca3af;
  margin: 0.2rem 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-print {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #d97706;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-print:hover { background: #b45309; }

.btn-close {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #9ca3af;
  border-radius: 10px;
  padding: 0.5rem;
  cursor: pointer;
}

.btn-close:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

/* WORKSPACE */
.labels-workspace {
  display: grid;
  grid-template-columns: 340px 1fr;
  flex: 1;
  overflow: hidden;
}

/* SIDEBAR */
.sidebar-config {
  background: rgba(15, 23, 42, 0.5);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  gap: 1.25rem;
  overflow-y: auto;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: block;
  margin-bottom: 0.4rem;
}

.styled-select {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
  border-radius: 8px;
  padding: 0.55rem 0.85rem;
  font-size: 0.85rem;
  width: 100%;
  outline: none;
}

.config-options-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.825rem;
  color: #cbd5e1;
  cursor: pointer;
}

.add-product-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.search-mini {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.4rem 0.65rem;
}

.search-mini-input {
  background: transparent;
  border: none;
  color: white;
  font-size: 0.8rem;
  outline: none;
  width: 100%;
}

.catalog-mini-list {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.catalog-mini-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.45rem 0.65rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  font-size: 0.8rem;
}

.catalog-mini-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.item-text {
  display: flex;
  flex-direction: column;
}

.item-text strong {
  color: #e2e8f0;
}

.item-text .subtext {
  font-size: 0.7rem;
  color: #64748b;
  font-family: monospace;
}

.btn-add-mini {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #cbd5e1;
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  cursor: pointer;
}

.queue-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.queue-list-scroll {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  max-height: 200px;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
}

.queue-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.queue-name {
  font-size: 0.8rem;
  color: #f1f5f9;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.type-mini-select {
  background: transparent;
  border: none;
  color: #fbbf24;
  font-size: 0.7rem;
  outline: none;
}

.copies-stepper {
  display: flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.copies-stepper .step-btn {
  background: transparent;
  border: none;
  color: #cbd5e1;
  padding: 0.15rem 0.4rem;
  cursor: pointer;
}

.copies-stepper .step-val {
  padding: 0.15rem 0.4rem;
  font-size: 0.75rem;
  color: white;
  font-weight: 700;
}

.btn-del-queue {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
}

/* PREVIEW STAGE */
.preview-stage {
  flex: 1;
  overflow-y: auto;
  background: #0f172a;
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.no-labels-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #64748b;
}

.no-labels-placeholder h3 {
  color: #cbd5e1;
  margin: 1rem 0 0.25rem;
}

/* PRINT SHEET & STICKERS */
.labels-grid-sheet {
  background: white;
  width: 100%;
  max-width: 780px;
  padding: 1.5rem;
  display: grid;
  gap: 12px;
  border-radius: 6px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
}

.labels-grid-sheet.thermal_50x30 {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.labels-grid-sheet.a4_30_sheet {
  grid-template-columns: repeat(3, 1fr);
}

.labels-grid-sheet.shelf_tag {
  grid-template-columns: repeat(2, 1fr);
}

/* STICKER STYLING */
.barcode-sticker {
  border: 1px dashed #cbd5e1;
  border-radius: 4px;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  background: white;
  color: black;
  text-align: center;
}

.sticker-brand {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #475569;
}

.sticker-title {
  font-size: 0.785rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0.2rem 0;
  max-height: 2.4em;
  overflow: hidden;
}

.barcode-visual-box {
  width: 85%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0.35rem 0;
}

.barcode-svg {
  width: 100%;
  height: 38px;
}

.barcode-number-text {
  font-family: monospace;
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  margin-top: 0.15rem;
}

.sticker-price-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e2e8f0;
  padding-top: 0.3rem;
  margin-top: 0.2rem;
}

.unit-type-tag {
  font-size: 0.65rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.price-val {
  font-size: 0.85rem;
  font-weight: 900;
  color: #0f172a;
}

/* SHELF TAG VARIANT */
.barcode-sticker.shelf_tag {
  padding: 1rem;
}
.barcode-sticker.shelf_tag .sticker-title {
  font-size: 0.95rem;
}
.barcode-sticker.shelf_tag .price-val {
  font-size: 1.25rem;
}

@media print {
  .no-print {
    display: none !important;
  }
  .modal-overlay {
    position: static;
    background: transparent;
    padding: 0;
  }
  .labels-card {
    border: none;
    box-shadow: none;
    height: auto;
    max-width: 100%;
  }
  .labels-workspace {
    display: block;
  }
  .preview-stage {
    background: white;
    padding: 0;
  }
  .labels-grid-sheet {
    box-shadow: none;
    padding: 0;
    max-width: 100%;
  }
}
</style>

