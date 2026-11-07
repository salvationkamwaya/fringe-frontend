<script setup>
import { ref } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, 
  Trash2, X, RefreshCw, Layers, FileText
} from 'lucide-vue-next'

const emit = defineEmits(['close', 'imported'])

const csvText = ref('')
const parsedRows = ref([])
const loading = ref(false)
const importResults = ref(null)

const sampleCsvHeader = "name,sku,barcode,category,cost_price,selling_price,is_pack,pack_name,pack_unit_ratio,split_unit_price,stock_quantity,reorder_threshold"
const sampleCsvData = `Pelikan Ballpoint Blue Box,PEL-PEN-BLU,6161002001,Pens & Writing,12000,18000,true,Box,50,500,25,5
A4 Photocopy Paper Carton (5 Reams),A4-PAPER-CTN,6161002002,Paper Products,45000,60000,true,Carton,5,13000,40,10
Standard Plastic Ruler 30cm,RUL-30-STD,6161002003,Measuring Tools,500,1000,false,,,1000,120,20
Oxford Mathematical Set,OXF-GEO-SET,6161002004,School Supplies,3500,5500,false,,,5500,60,15`

const loadSample = () => {
  csvText.value = sampleCsvHeader + "\n" + sampleCsvData
  parseCsv()
}

const downloadTemplate = () => {
  const content = sampleCsvHeader + "\n" + sampleCsvData
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', 'stationery_products_import_template.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  store.showToast('Downloaded CSV import template.', 'info')
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    csvText.value = e.target.result
    parseCsv()
  }
  reader.readAsText(file)
}

const parseCsv = () => {
  parsedRows.value = []
  importResults.value = null
  const text = csvText.value.trim()
  if (!text) return

  const lines = text.split(/\r?\n/)
  if (lines.length <= 1) return

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Support commas inside quoted values
    const values = []
    let inQuotes = false
    let currentVal = ''
    for (let char of line) {
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(currentVal.trim())
        currentVal = ''
      } else {
        currentVal += char
      }
    }
    values.push(currentVal.trim())

    const rowObj = {}
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || ''
    })

    const isPack = String(rowObj['is_pack']).toLowerCase() === 'true' || String(rowObj['is_pack']) === '1'
    parsedRows.value.push({
      line_num: i + 1,
      name: rowObj['name'] || '',
      sku: rowObj['sku'] || rowObj['code'] || '',
      barcode: rowObj['barcode'] || '',
      category: rowObj['category'] || 'General Stationery',
      cost_price: parseFloat(rowObj['cost_price'] || rowObj['buying_price'] || 0),
      selling_price: parseFloat(rowObj['selling_price'] || 0),
      is_pack: isPack,
      pack_name: rowObj['pack_name'] || (isPack ? 'Box' : ''),
      pack_unit_ratio: parseInt(rowObj['pack_unit_ratio']) || (isPack ? 10 : 1),
      split_unit_price: parseFloat(rowObj['split_unit_price'] || 0),
      stock_quantity: parseFloat(rowObj['stock_quantity'] || 0),
      reorder_threshold: parseFloat(rowObj['reorder_threshold'] || 5),
    })
  }

  store.showToast(`Parsed ${parsedRows.value.length} product rows ready for import.`, 'success')
}

const handleCommitImport = async () => {
  if (parsedRows.value.length === 0) {
    store.showToast('Please upload or paste CSV data first.', 'warning')
    return
  }

  loading.value = true
  try {
    const res = await api.post('/pos/bulk-import/', {
      products: parsedRows.value
    })
    importResults.value = res.data
    store.showToast(`Successfully imported ${res.data.created_count} products into Stationery catalog!`, 'success')
    emit('imported', res.data)
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Bulk import failed. Please verify CSV columns.', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card import-card">
      <!-- HEADER -->
      <div class="modal-header">
        <div class="header-title-box">
          <div class="icon-bubble">
            <FileSpreadsheet :size="22" class="text-emerald" />
          </div>
          <div>
            <h2>Bulk Product Import (Excel / CSV)</h2>
            <p class="subtitle">Quickly populate the stationery catalog with items, barcodes, pack ratios, and initial stock</p>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-template" @click="downloadTemplate">
            <Download :size="15" />
            <span>Download CSV Template</span>
          </button>
          <button class="btn-close" @click="$emit('close')">
            <X :size="20" />
          </button>
        </div>
      </div>

      <!-- WORKSPACE -->
      <div class="import-body">
        <!-- SUCCESS BANNER IF DONE -->
        <div v-if="importResults" class="results-banner">
          <CheckCircle2 :size="28" class="text-emerald" />
          <div class="results-meta">
            <h4>Import Complete!</h4>
            <p>Added <strong>{{ importResults.created_count }}</strong> new products to Stationery catalog.</p>
            <p v-if="importResults.skipped_count > 0" class="skipped-warn">
              Skipped {{ importResults.skipped_count }} duplicate or invalid records.
            </p>
          </div>
        </div>

        <!-- UPLOAD & PASTE CONTROLS -->
        <div class="controls-grid">
          <!-- File Drop Zone -->
          <div class="drop-zone">
            <Upload :size="32" class="drop-icon" />
            <h4>Choose CSV File or Drag Here</h4>
            <p>Accepts UTF-8 encoded .csv files with standard header columns</p>
            <input 
              type="file" 
              accept=".csv,text/csv" 
              class="file-input" 
              @change="handleFileUpload" 
            />
          </div>

          <!-- Paste Raw CSV Box -->
          <div class="paste-zone">
            <div class="paste-header">
              <span class="label">Or Paste Comma-Separated (CSV) Lines:</span>
              <button class="btn-sample-link" @click="loadSample">Load Sample Stationery Data</button>
            </div>
            <textarea 
              v-model="csvText" 
              rows="5" 
              class="styled-textarea" 
              placeholder="name,sku,barcode,category,cost_price,selling_price,is_pack,pack_name,pack_unit_ratio..."
              @input="parseCsv"
            ></textarea>
          </div>
        </div>

        <!-- PARSED ROWS PREVIEW TABLE -->
        <div class="preview-section">
          <div class="preview-header">
            <h4>Data Preview ({{ parsedRows.length }} rows detected)</h4>
            <span v-if="parsedRows.length > 0" class="preview-note">Verify columns below before saving</span>
          </div>

          <div class="table-container">
            <table class="preview-table">
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th>Product Name</th>
                  <th>SKU / Code</th>
                  <th>Barcode</th>
                  <th>Category</th>
                  <th style="text-align: right;">Cost (TSH)</th>
                  <th style="text-align: right;">Retail (TSH)</th>
                  <th style="text-align: center;">Pack / Piece</th>
                  <th style="text-align: right;">Opening Stock</th>
                  <th style="text-align: right;">Reorder</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="parsedRows.length === 0">
                  <td colspan="10" class="text-center empty-cell">
                    No data to preview. Upload a CSV file or paste lines above.
                  </td>
                </tr>
                <tr v-for="(r, idx) in parsedRows" :key="idx">
                  <td>{{ r.line_num }}</td>
                  <td><strong>{{ r.name }}</strong></td>
                  <td><span class="code-tag">{{ r.sku || 'N/A' }}</span></td>
                  <td><span class="barcode-tag">{{ r.barcode || 'N/A' }}</span></td>
                  <td>{{ r.category }}</td>
                  <td style="text-align: right;">{{ r.cost_price.toLocaleString() }}</td>
                  <td style="text-align: right; font-weight: 700; color: #38bdf8;">{{ r.selling_price.toLocaleString() }}</td>
                  <td style="text-align: center;">
                    <span v-if="r.is_pack" class="badge-pack">{{ r.pack_name }} ({{ r.pack_unit_ratio }} pcs)</span>
                    <span v-else class="badge-piece">Single Item</span>
                  </td>
                  <td style="text-align: right; font-weight: 600;">{{ r.stock_quantity }}</td>
                  <td style="text-align: right; color: #94a3b8;">{{ r.reorder_threshold }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button 
          class="btn-commit" 
          :disabled="loading || parsedRows.length === 0"
          @click="handleCommitImport"
        >
          <RefreshCw v-if="loading" :size="16" class="spinner" />
          <CheckCircle2 v-else :size="16" />
          <span>Commit & Import {{ parsedRows.length }} Products</span>
        </button>
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

.import-card {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 1100px;
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
  background: rgba(16, 185, 129, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-emerald { color: #34d399; }

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

.btn-template {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 0.55rem 1rem;
  border-radius: 8px;
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-template:hover { background: rgba(255, 255, 255, 0.15); }

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

/* BODY */
.import-body {
  flex: 1;
  padding: 1.5rem 1.75rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.results-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 10px;
  padding: 1rem 1.25rem;
}

.results-meta h4 {
  font-size: 1rem;
  color: #34d399;
  margin: 0;
}

.results-meta p {
  font-size: 0.85rem;
  color: #e2e8f0;
  margin: 0.2rem 0 0;
}

.skipped-warn {
  color: #facc15 !important;
}

/* CONTROLS */
.controls-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.25rem;
}

.drop-zone {
  position: relative;
  background: rgba(30, 41, 59, 0.3);
  border: 2px dashed rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
}

.drop-zone:hover {
  border-color: #34d399;
  background: rgba(16, 185, 129, 0.05);
}

.drop-icon {
  color: #34d399;
  margin-bottom: 0.5rem;
}

.drop-zone h4 {
  font-size: 0.95rem;
  color: #f1f5f9;
  margin: 0 0 0.25rem;
}

.drop-zone p {
  font-size: 0.775rem;
  color: #94a3b8;
  margin: 0;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.paste-zone {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.paste-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.paste-header .label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
}

.btn-sample-link {
  background: transparent;
  border: none;
  color: #38bdf8;
  font-size: 0.775rem;
  cursor: pointer;
  text-decoration: underline;
}

.styled-textarea {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
  border-radius: 8px;
  padding: 0.65rem 0.85rem;
  font-family: monospace;
  font-size: 0.8rem;
  outline: none;
  resize: vertical;
}

.styled-textarea:focus { border-color: #34d399; }

/* PREVIEW SECTION */
.preview-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-header h4 {
  font-size: 0.95rem;
  color: #e2e8f0;
  margin: 0;
}

.preview-note {
  font-size: 0.775rem;
  color: #94a3b8;
}

.table-container {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: auto;
  max-height: 380px;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.825rem;
}

.preview-table th {
  background: rgba(30, 41, 59, 0.6);
  color: #94a3b8;
  padding: 0.65rem 0.85rem;
  text-align: left;
  position: sticky;
  top: 0;
}

.preview-table td {
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
}

.code-tag, .barcode-tag {
  font-family: monospace;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.badge-pack {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.725rem;
}

.badge-piece {
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.725rem;
}

.empty-cell {
  padding: 2.5rem !important;
  color: #64748b;
}

/* FOOTER */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(17, 24, 39, 0.6);
}

.btn-cancel {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-commit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #059669;
  color: white;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-commit:hover { background: #047857; }
.btn-commit:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

