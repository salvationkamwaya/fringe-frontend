<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import {
  Wine, BookOpen, Sparkles, CheckCircle2, AlertCircle,
  Sun, Moon, LogOut, ArrowRight, Wand2, ShieldCheck, Building2,
  MapPin, Phone, Layers
} from 'lucide-vue-next'

const emit = defineEmits(['completed'])

const loading = ref(false)
const errorMsg = ref('')
const currentStep = ref(store.requiresBusinessSetup ? 1 : 2)
const openCatalogAfter = ref(true)

const barForm = ref({
  name: '',
  code: 'BAR',
  currency: 'TSH',
  age_verification: true,
  allow_tabs: true,
})

const stationeryForm = ref({
  name: '',
  code: 'STAT',
  currency: 'TSH',
  allow_wholesale: true,
  barcode_printing: true,
})

const barBranchForm = ref({
  name: '',
  code: 'BAR-01',
  address: '',
  phone: '',
})

const stationeryBranchForm = ref({
  name: '',
  code: 'STAT-01',
  address: '',
  phone: '',
})

const currencies = ['TSH', 'USD', 'KES', 'UGX', 'RWF', 'EUR']

const existingBarBranch = computed(() =>
  (store.branches || []).find(b => (b.business_unit_id || b.business_unit) === 'bar' && b.is_active !== false) || null
)

const existingStationeryBranch = computed(() =>
  (store.branches || []).find(b => (b.business_unit_id || b.business_unit) === 'stationery' && b.is_active !== false) || null
)

const barDisplayName = computed(() =>
  store.businessUnits.find(u => u.id === 'bar')?.name || barForm.value.name.trim() || 'Bar & Lounge'
)

const stationeryDisplayName = computed(() =>
  store.businessUnits.find(u => u.id === 'stationery')?.name || stationeryForm.value.name.trim() || 'Stationery & Retail'
)

onMounted(() => {
  currentStep.value = store.requiresBusinessSetup ? 1 : 2

  const existingBar = store.businessUnits.find(u => u.id === 'bar')
  if (existingBar) {
    barForm.value.name = existingBar.name || ''
    barForm.value.code = existingBar.code || 'BAR'
    barForm.value.currency = existingBar.currency || 'TSH'
    if (existingBar.settings) {
      barForm.value.age_verification = existingBar.settings.age_verification ?? true
      barForm.value.allow_tabs = existingBar.settings.allow_tabs ?? true
    }
  }

  const existingStat = store.businessUnits.find(u => u.id === 'stationery')
  if (existingStat) {
    stationeryForm.value.name = existingStat.name || ''
    stationeryForm.value.code = existingStat.code || 'STAT'
    stationeryForm.value.currency = existingStat.currency || 'TSH'
    if (existingStat.settings) {
      stationeryForm.value.allow_wholesale = existingStat.settings.allow_wholesale ?? true
      stationeryForm.value.barcode_printing = existingStat.settings.barcode_printing ?? true
    }
  }
})

// Step 1 validation
const isBarValid = computed(() => {
  const name = barForm.value.name.trim()
  const code = barForm.value.code.trim()
  return name.length >= 2 && code.length >= 1 && code.length <= 10
})

const isStationeryValid = computed(() => {
  const name = stationeryForm.value.name.trim()
  const code = stationeryForm.value.code.trim()
  return name.length >= 2 && code.length >= 1 && code.length <= 10
})

const hasCodeConflict = computed(() => {
  const bCode = barForm.value.code.trim().toUpperCase()
  const sCode = stationeryForm.value.code.trim().toUpperCase()
  return bCode.length > 0 && bCode === sCode
})

const canSubmitStep1 = computed(() => {
  return isBarValid.value && isStationeryValid.value && !hasCodeConflict.value && !loading.value
})

// Step 2 validation
const isBarBranchValid = computed(() => {
  if (existingBarBranch.value) return true
  const name = barBranchForm.value.name.trim()
  const code = barBranchForm.value.code.trim()
  return name.length >= 2 && code.length >= 1 && code.length <= 20
})

const isStationeryBranchValid = computed(() => {
  if (existingStationeryBranch.value) return true
  const name = stationeryBranchForm.value.name.trim()
  const code = stationeryBranchForm.value.code.trim()
  return name.length >= 2 && code.length >= 1 && code.length <= 20
})

const hasBranchCodeConflict = computed(() => {
  if (existingBarBranch.value || existingStationeryBranch.value) return false
  const bCode = barBranchForm.value.code.trim().toUpperCase()
  const sCode = stationeryBranchForm.value.code.trim().toUpperCase()
  return bCode.length > 0 && bCode === sCode
})

const canSubmitStep2 = computed(() => {
  return isBarBranchValid.value && isStationeryBranchValid.value && !hasBranchCodeConflict.value && !loading.value
})

const fillDefaults = () => {
  errorMsg.value = ''
  if (currentStep.value === 1) {
    if (!barForm.value.name.trim()) barForm.value.name = 'Fringe Lounge & Bar'
    if (!barForm.value.code.trim()) barForm.value.code = 'BAR'
    if (!barForm.value.currency.trim()) barForm.value.currency = 'TSH'

    if (!stationeryForm.value.name.trim()) stationeryForm.value.name = 'Fringe Stationery & Retail'
    if (!stationeryForm.value.code.trim()) stationeryForm.value.code = 'STAT'
    if (!stationeryForm.value.currency.trim()) stationeryForm.value.currency = 'TSH'
  } else {
    if (!existingBarBranch.value) {
      if (!barBranchForm.value.name.trim()) barBranchForm.value.name = `${barDisplayName.value} - Main Branch`
      if (!barBranchForm.value.code.trim()) barBranchForm.value.code = 'BAR-01'
    }
    if (!existingStationeryBranch.value) {
      if (!stationeryBranchForm.value.name.trim()) stationeryBranchForm.value.name = `${stationeryDisplayName.value} - Main Branch`
      if (!stationeryBranchForm.value.code.trim()) stationeryBranchForm.value.code = 'STAT-01'
    }
  }
}

const normalizeCode = (form, maxLen = 10) => {
  form.code = form.code.toUpperCase().replace(/\s+/g, '').slice(0, maxLen)
}

const submitStep1 = async () => {
  errorMsg.value = ''
  if (!isBarValid.value) {
    errorMsg.value = 'Please enter a valid Bar & Lounge business name and code (1–10 characters).'
    return
  }
  if (!isStationeryValid.value) {
    errorMsg.value = 'Please enter a valid Stationery & Retail business name and code (1–10 characters).'
    return
  }
  if (hasCodeConflict.value) {
    errorMsg.value = 'Bar and Stationery business codes must be different.'
    return
  }

  loading.value = true
  try {
    const payload = {
      bar: {
        name: barForm.value.name.trim(),
        code: barForm.value.code.trim().toUpperCase(),
        currency: barForm.value.currency.trim().toUpperCase() || 'TSH',
        settings: {
          age_verification: barForm.value.age_verification,
          allow_tabs: barForm.value.allow_tabs,
          allow_credit: false,
        },
      },
      stationery: {
        name: stationeryForm.value.name.trim(),
        code: stationeryForm.value.code.trim().toUpperCase(),
        currency: stationeryForm.value.currency.trim().toUpperCase() || 'TSH',
        settings: {
          allow_wholesale: stationeryForm.value.allow_wholesale,
          barcode_printing: stationeryForm.value.barcode_printing,
        },
      },
    }

    const res = await api.post('/core/business-units/setup-initial/', payload)
    store.syncBusinessUnits(res.data.business_units, false, store.requiresBranchSetup)
    await store.fetchBranches()

    if (store.requiresBranchSetup) {
      currentStep.value = 2
      store.showToast('Businesses saved! Now create at least one branch for each business.', 'success')
    } else {
      store.activeModal = null
      await store.fetchActiveShift()
      store.showToast('Workspace setup complete!', 'success')
      emit('completed', res.data.business_units)
    }
  } catch (err) {
    errorMsg.value =
      err.response?.data?.error ||
      err.response?.data?.detail ||
      'Failed to initialize business units. Please check your inputs and try again.'
  } finally {
    loading.value = false
  }
}

const submitStep2 = async () => {
  errorMsg.value = ''
  if (!isBarBranchValid.value) {
    errorMsg.value = `Please enter a branch name and code for ${barDisplayName.value}.`
    return
  }
  if (!isStationeryBranchValid.value) {
    errorMsg.value = `Please enter a branch name and code for ${stationeryDisplayName.value}.`
    return
  }
  if (hasBranchCodeConflict.value) {
    errorMsg.value = 'Bar and Stationery branch codes must be unique.'
    return
  }

  loading.value = true
  try {
    const payload = {}
    if (!existingBarBranch.value) {
      payload.bar = {
        name: barBranchForm.value.name.trim(),
        code: barBranchForm.value.code.trim().toUpperCase(),
        address: barBranchForm.value.address.trim(),
        phone: barBranchForm.value.phone.trim(),
      }
    }
    if (!existingStationeryBranch.value) {
      payload.stationery = {
        name: stationeryBranchForm.value.name.trim(),
        code: stationeryBranchForm.value.code.trim().toUpperCase(),
        address: stationeryBranchForm.value.address.trim(),
        phone: stationeryBranchForm.value.phone.trim(),
      }
    }

    const res = await api.post('/core/branches/setup-initial/', payload)
    store.branches = res.data.branches || []
    store.syncBusinessUnits(store.businessUnits, false, false)

    await store.fetchActiveShift()
    store.showToast('Branches created! Your workspace is ready for products and sales.', 'success')

    if (openCatalogAfter.value) {
      store.activeModal = 'catalog_management'
    } else {
      store.activeModal = null
    }
    emit('completed', store.businessUnits)
  } catch (err) {
    errorMsg.value =
      err.response?.data?.error ||
      err.response?.data?.detail ||
      'Failed to create branches. Please verify your branch codes are unique.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="setup-overlay" :data-theme="store.theme" role="dialog" aria-modal="true" aria-labelledby="setup-title">
    <div class="setup-container">
      <!-- Top Header -->
      <header class="setup-header">
        <div class="header-left">
          <div class="hero-icon-badge">
            <Sparkles v-if="currentStep === 1" :size="24" />
            <MapPin v-else :size="24" />
          </div>
          <div>
            <div class="eyebrow-pill">
              <ShieldCheck :size="13" />
              <span>Owner Onboarding · Step {{ currentStep }} of 2</span>
            </div>
            <h1 id="setup-title" class="setup-title">
              {{ currentStep === 1 ? 'Step 1: Name Your Two Businesses' : 'Step 2: Create Branches for Each Business' }}
            </h1>
            <p class="setup-subtitle">
              <template v-if="currentStep === 1">
                Welcome, <strong>{{ store.user?.first_name || store.user?.username || 'Owner' }}</strong>.
                Register one <strong>Bar &amp; Lounge</strong> business and one <strong>Stationery &amp; Retail</strong> business to begin.
              </template>
              <template v-else>
                Every business needs at least <strong>one physical branch</strong> before you can add products or record sales.
                Create one branch for each business below.
              </template>
            </p>
          </div>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="icon-action-btn"
            @click="store.toggleTheme()"
            :title="`Switch to ${store.theme === 'dark' ? 'Light' : 'Dark'} Mode`"
          >
            <Sun v-if="store.theme === 'dark'" :size="17" />
            <Moon v-else :size="17" />
          </button>
          <button
            type="button"
            class="icon-action-btn danger"
            @click="store.logout('manual')"
            title="Sign Out"
          >
            <LogOut :size="17" />
          </button>
        </div>
      </header>

      <!-- 2-Step Wizard Progress Strip -->
      <div class="readiness-strip">
        <div class="readiness-step" :class="{ active: currentStep === 1, ready: currentStep === 2 }">
          <CheckCircle2 v-if="currentStep === 2" :size="16" />
          <Layers v-else :size="16" />
          <span>Step 1: Businesses</span>
        </div>
        <div class="readiness-divider"></div>
        <div class="readiness-step" :class="{ active: currentStep === 2 }">
          <MapPin :size="16" />
          <span>Step 2: First Branches</span>
        </div>
        <button type="button" class="btn-defaults" @click="fillDefaults">
          <Wand2 :size="14" />
          <span>Fill Recommended Defaults</span>
        </button>
      </div>

      <!-- Error Banner -->
      <div v-if="errorMsg || (currentStep === 1 && hasCodeConflict) || (currentStep === 2 && hasBranchCodeConflict)" class="error-banner">
        <AlertCircle :size="18" />
        <span>
          {{
            errorMsg ||
            (currentStep === 1
              ? 'Bar and Stationery business codes must be unique.'
              : 'Bar and Stationery branch codes must be unique.')
          }}
        </span>
      </div>

      <!-- STEP 1: BUSINESS UNITS -->
      <form v-if="currentStep === 1" class="setup-form" @submit.prevent="submitStep1">
        <div class="units-grid">
          <!-- Card 1: Bar & Lounge -->
          <section class="unit-card unit-card-bar">
            <div class="card-glow card-glow-bar"></div>
            <div class="unit-card-header">
              <div class="unit-icon-wrap bar-icon">
                <Wine :size="22" />
              </div>
              <div class="unit-header-text">
                <span class="unit-type-tag bar-tag">Unit ID: bar</span>
                <h2>Bar &amp; Lounge</h2>
              </div>
              <span class="status-dot" :class="{ complete: isBarValid }">
                {{ isBarValid ? 'Ready' : 'Required' }}
              </span>
            </div>

            <div class="live-preview-chip bar-preview">
              <Building2 :size="14" />
              <span class="preview-name">{{ barForm.name.trim() || 'Your Bar Name' }}</span>
              <span class="preview-meta">{{ barForm.code || 'BAR' }} · {{ barForm.currency || 'TSH' }}</span>
            </div>

            <div class="form-group">
              <label for="bar-name">Business Name <span class="req">*</span></label>
              <input
                id="bar-name"
                v-model="barForm.name"
                type="text"
                maxlength="100"
                placeholder="e.g., Fringe Lounge & Bar"
                required
              />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label for="bar-code">Short Code <span class="req">*</span></label>
                <input
                  id="bar-code"
                  v-model="barForm.code"
                  @input="normalizeCode(barForm, 10)"
                  type="text"
                  maxlength="10"
                  placeholder="BAR"
                  required
                />
              </div>

              <div class="form-group">
                <label for="bar-currency">Currency</label>
                <select id="bar-currency" v-model="barForm.currency">
                  <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
            </div>

            <div class="toggles-box">
              <label class="toggle-pill">
                <input type="checkbox" v-model="barForm.age_verification" />
                <span>Require 18+ Age Verification</span>
              </label>
              <label class="toggle-pill">
                <input type="checkbox" v-model="barForm.allow_tabs" />
                <span>Enable Open Customer Tabs</span>
              </label>
            </div>
          </section>

          <!-- Card 2: Stationery & Retail -->
          <section class="unit-card unit-card-stationery">
            <div class="card-glow card-glow-stationery"></div>
            <div class="unit-card-header">
              <div class="unit-icon-wrap stationery-icon">
                <BookOpen :size="22" />
              </div>
              <div class="unit-header-text">
                <span class="unit-type-tag stationery-tag">Unit ID: stationery</span>
                <h2>Stationery &amp; Retail</h2>
              </div>
              <span class="status-dot" :class="{ complete: isStationeryValid && !hasCodeConflict }">
                {{ isStationeryValid && !hasCodeConflict ? 'Ready' : 'Required' }}
              </span>
            </div>

            <div class="live-preview-chip stationery-preview">
              <Building2 :size="14" />
              <span class="preview-name">{{ stationeryForm.name.trim() || 'Your Stationery Name' }}</span>
              <span class="preview-meta">{{ stationeryForm.code || 'STAT' }} · {{ stationeryForm.currency || 'TSH' }}</span>
            </div>

            <div class="form-group">
              <label for="stat-name">Business Name <span class="req">*</span></label>
              <input
                id="stat-name"
                v-model="stationeryForm.name"
                type="text"
                maxlength="100"
                placeholder="e.g., Fringe Stationery & Retail"
                required
              />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label for="stat-code">Short Code <span class="req">*</span></label>
                <input
                  id="stat-code"
                  v-model="stationeryForm.code"
                  @input="normalizeCode(stationeryForm, 10)"
                  type="text"
                  maxlength="10"
                  placeholder="STAT"
                  required
                />
              </div>

              <div class="form-group">
                <label for="stat-currency">Currency</label>
                <select id="stat-currency" v-model="stationeryForm.currency">
                  <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
            </div>

            <div class="toggles-box">
              <label class="toggle-pill">
                <input type="checkbox" v-model="stationeryForm.allow_wholesale" />
                <span>Enable Wholesale &amp; Quotations</span>
              </label>
              <label class="toggle-pill">
                <input type="checkbox" v-model="stationeryForm.barcode_printing" />
                <span>Enable Barcode Label Printing</span>
              </label>
            </div>
          </section>
        </div>

        <footer class="setup-footer">
          <span class="step-hint">Next: Step 2 will create one branch for each business.</span>

          <button type="submit" class="btn-launch" :disabled="!canSubmitStep1">
            <span v-if="loading" class="spinner"></span>
            <span>{{ loading ? 'Saving Businesses...' : 'Save Businesses & Continue' }}</span>
            <ArrowRight v-if="!loading" :size="18" />
          </button>
        </footer>
      </form>

      <!-- STEP 2: BRANCHES FOR EACH BUSINESS -->
      <form v-else class="setup-form" @submit.prevent="submitStep2">
        <div class="units-grid">
          <!-- Bar Branch Card -->
          <section class="unit-card unit-card-bar">
            <div class="card-glow card-glow-bar"></div>
            <div class="unit-card-header">
              <div class="unit-icon-wrap bar-icon">
                <Wine :size="22" />
              </div>
              <div class="unit-header-text">
                <span class="unit-type-tag bar-tag">Branch for Bar</span>
                <h2>{{ barDisplayName }}</h2>
              </div>
              <span class="status-dot" :class="{ complete: isBarBranchValid }">
                {{ existingBarBranch ? 'Configured' : isBarBranchValid ? 'Ready' : 'Required' }}
              </span>
            </div>

            <div v-if="existingBarBranch" class="existing-branch-box">
              <CheckCircle2 :size="18" />
              <div>
                <strong>{{ existingBarBranch.name }}</strong>
                <span>Code: {{ existingBarBranch.code }} · Active branch ready</span>
              </div>
            </div>

            <template v-else>
              <div class="form-group">
                <label for="bar-branch-name">Branch Name <span class="req">*</span></label>
                <input
                  id="bar-branch-name"
                  v-model="barBranchForm.name"
                  type="text"
                  maxlength="150"
                  placeholder="e.g., Mikocheni Lounge"
                  required
                />
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label for="bar-branch-code">Branch Code <span class="req">*</span></label>
                  <input
                    id="bar-branch-code"
                    v-model="barBranchForm.code"
                    @input="normalizeCode(barBranchForm, 20)"
                    type="text"
                    maxlength="20"
                    placeholder="BAR-01"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="bar-branch-phone"><Phone :size="12" /> Phone</label>
                  <input
                    id="bar-branch-phone"
                    v-model="barBranchForm.phone"
                    type="text"
                    maxlength="50"
                    placeholder="+255 700 000 000"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="bar-branch-addr"><MapPin :size="12" /> Address / Location</label>
                <input
                  id="bar-branch-addr"
                  v-model="barBranchForm.address"
                  type="text"
                  maxlength="255"
                  placeholder="Street, District, City"
                />
              </div>
            </template>
          </section>

          <!-- Stationery Branch Card -->
          <section class="unit-card unit-card-stationery">
            <div class="card-glow card-glow-stationery"></div>
            <div class="unit-card-header">
              <div class="unit-icon-wrap stationery-icon">
                <BookOpen :size="22" />
              </div>
              <div class="unit-header-text">
                <span class="unit-type-tag stationery-tag">Branch for Stationery</span>
                <h2>{{ stationeryDisplayName }}</h2>
              </div>
              <span class="status-dot" :class="{ complete: isStationeryBranchValid && !hasBranchCodeConflict }">
                {{ existingStationeryBranch ? 'Configured' : isStationeryBranchValid && !hasBranchCodeConflict ? 'Ready' : 'Required' }}
              </span>
            </div>

            <div v-if="existingStationeryBranch" class="existing-branch-box">
              <CheckCircle2 :size="18" />
              <div>
                <strong>{{ existingStationeryBranch.name }}</strong>
                <span>Code: {{ existingStationeryBranch.code }} · Active branch ready</span>
              </div>
            </div>

            <template v-else>
              <div class="form-group">
                <label for="stat-branch-name">Branch Name <span class="req">*</span></label>
                <input
                  id="stat-branch-name"
                  v-model="stationeryBranchForm.name"
                  type="text"
                  maxlength="150"
                  placeholder="e.g., Posta Stationery Hub"
                  required
                />
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label for="stat-branch-code">Branch Code <span class="req">*</span></label>
                  <input
                    id="stat-branch-code"
                    v-model="stationeryBranchForm.code"
                    @input="normalizeCode(stationeryBranchForm, 20)"
                    type="text"
                    maxlength="20"
                    placeholder="STAT-01"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="stat-branch-phone"><Phone :size="12" /> Phone</label>
                  <input
                    id="stat-branch-phone"
                    v-model="stationeryBranchForm.phone"
                    type="text"
                    maxlength="50"
                    placeholder="+255 700 000 001"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="stat-branch-addr"><MapPin :size="12" /> Address / Location</label>
                <input
                  id="stat-branch-addr"
                  v-model="stationeryBranchForm.address"
                  type="text"
                  maxlength="255"
                  placeholder="Street, District, City"
                />
              </div>
            </template>
          </section>
        </div>

        <footer class="setup-footer">
          <label class="next-step-check">
            <input type="checkbox" v-model="openCatalogAfter" />
            <span>Open <strong>Product Catalog</strong> next to add my first products</span>
          </label>

          <button type="submit" class="btn-launch" :disabled="!canSubmitStep2">
            <span v-if="loading" class="spinner"></span>
            <span>{{ loading ? 'Creating Branches...' : 'Save Branches & Enter Workspace' }}</span>
            <ArrowRight v-if="!loading" :size="18" />
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   THEME TOKENS — Neutral Surfaces; Color Only on Buttons & Active States
   ============================================================ */
.setup-overlay {
  --m-overlay: rgba(6, 10, 18, 0.84);
  --m-surface: #111827;
  --m-card: #182132;
  --m-elevated: #1f293b;
  --m-input: #0f1623;
  --m-border: rgba(255, 255, 255, 0.11);
  --m-border-strong: rgba(255, 255, 255, 0.2);
  --m-text: #f8fafc;
  --m-text-sec: #cbd5e1;
  --m-text-muted: #94a3b8;
  --m-placeholder: #64748b;
  --m-accent: #6366f1;
  --m-accent-hover: #4f46e5;
  --m-accent-soft: rgba(99, 102, 241, 0.16);
  --m-accent-text: #c7d2fe;
  --m-success: #10b981;
  --m-success-soft: rgba(16, 185, 129, 0.15);
  --m-success-text: #6ee7b7;
  --m-danger: #f43f5e;
  --m-danger-soft: rgba(244, 63, 94, 0.14);
  --m-danger-text: #fda4af;
  --m-shadow: 0 28px 70px rgba(0, 0, 0, 0.6);

  position: fixed;
  inset: 0;
  z-index: 2500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--m-overlay);
  backdrop-filter: blur(14px);
  overflow-y: auto;
}

.setup-overlay[data-theme="light"] {
  --m-overlay: rgba(15, 23, 42, 0.48);
  --m-surface: #ffffff;
  --m-card: #f8fafc;
  --m-elevated: #f1f5f9;
  --m-input: #ffffff;
  --m-border: #e2e8f0;
  --m-border-strong: #cbd5e1;
  --m-text: #0f172a;
  --m-text-sec: #334155;
  --m-text-muted: #64748b;
  --m-placeholder: #94a3b8;
  --m-accent: #4f46e5;
  --m-accent-hover: #4338ca;
  --m-accent-soft: #eef2ff;
  --m-accent-text: #4338ca;
  --m-success: #059669;
  --m-success-soft: #ecfdf5;
  --m-success-text: #047857;
  --m-danger: #e11d48;
  --m-danger-soft: #fff1f2;
  --m-danger-text: #be123c;
  --m-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}

.setup-container {
  width: 100%;
  max-width: 960px;
  max-height: 94vh;
  overflow-y: auto;
  background: var(--m-surface);
  border: 1px solid var(--m-border);
  border-radius: 22px;
  padding: 28px 30px;
  box-shadow: var(--m-shadow);
  color: var(--m-text);
}

/* Header */
.setup-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.hero-icon-badge {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--m-elevated);
  border: 1px solid var(--m-border);
  color: var(--m-text);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.eyebrow-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: var(--m-elevated);
  border: 1px solid var(--m-border);
  color: var(--m-text-muted);
  margin-bottom: 8px;
}

.setup-title {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.25;
  color: var(--m-text);
  margin-bottom: 6px;
}

.setup-subtitle {
  font-size: 0.92rem;
  color: var(--m-text-sec);
  max-width: 660px;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.icon-action-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--m-elevated);
  border: 1px solid var(--m-border);
  color: var(--m-text-sec);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
}

.icon-action-btn:hover {
  border-color: var(--m-border-strong);
  color: var(--m-text);
}

.icon-action-btn.danger:hover {
  background: var(--m-danger-soft);
  color: var(--m-danger-text);
  border-color: var(--m-danger);
}

/* Progress Strip */
.readiness-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--m-card);
  border: 1px solid var(--m-border);
  margin-bottom: 20px;
}

.readiness-step {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--m-text-muted);
  padding: 6px 12px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.readiness-step.active {
  color: var(--m-accent-text);
  background: var(--m-accent-soft);
  border-color: var(--m-accent);
}

.readiness-step.ready {
  color: var(--m-success-text);
  background: var(--m-success-soft);
  border-color: var(--m-success);
}

.readiness-divider {
  flex: 1;
  min-width: 16px;
  height: 1px;
  background: var(--m-border);
}

.btn-defaults {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  background: var(--m-accent);
  color: #ffffff;
  border: 1px solid transparent;
  transition: all 0.18s ease;
}

.btn-defaults:hover {
  background: var(--m-accent-hover);
  transform: translateY(-1px);
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  border-radius: 12px;
  background: var(--m-danger-soft);
  border: 1px solid var(--m-danger);
  color: var(--m-danger-text);
  font-size: 0.88rem;
  font-weight: 600;
  margin-bottom: 18px;
}

/* Cards Grid */
.units-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.unit-card {
  position: relative;
  border-radius: 18px;
  padding: 20px;
  background: var(--m-card);
  border: 1px solid var(--m-border);
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.unit-card:focus-within {
  border-color: var(--m-accent);
  box-shadow: 0 0 0 3px var(--m-accent-soft);
}

.card-glow {
  display: none;
}

.unit-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.unit-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--m-elevated);
  border: 1px solid var(--m-border);
  color: var(--m-text);
}

.unit-header-text {
  flex: 1;
  min-width: 0;
}

.unit-header-text h2 {
  font-size: 1.06rem;
  font-weight: 700;
  color: var(--m-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-type-tag {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--m-text-muted);
  margin-bottom: 2px;
}

.status-dot {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--m-elevated);
  border: 1px solid var(--m-border);
  color: var(--m-text-muted);
  flex-shrink: 0;
}

.status-dot.complete {
  background: var(--m-success-soft);
  border-color: var(--m-success);
  color: var(--m-success-text);
}

.live-preview-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 0.82rem;
  background: var(--m-elevated);
  border: 1px solid var(--m-border);
  color: var(--m-text-sec);
}

.preview-name {
  font-weight: 700;
  color: var(--m-text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-meta {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--m-text-muted);
  flex-shrink: 0;
}

.existing-branch-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: var(--m-success-soft);
  border: 1px solid var(--m-success);
  color: var(--m-success-text);
}

.existing-branch-box div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.existing-branch-box span {
  font-size: 0.8rem;
  opacity: 0.9;
}

/* Form Controls */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--m-text-sec);
}

.req {
  color: var(--m-danger);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-family: inherit;
  background: var(--m-input);
  border: 1px solid var(--m-border-strong);
  color: var(--m-text);
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.form-group input::placeholder {
  color: var(--m-placeholder);
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--m-accent);
  box-shadow: 0 0 0 3px var(--m-accent-soft);
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.toggles-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.toggle-pill {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 0.84rem;
  color: var(--m-text-sec);
  cursor: pointer;
  user-select: none;
}

.toggle-pill input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--m-accent);
  cursor: pointer;
}

/* Footer */
.setup-footer {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--m-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.step-hint {
  font-size: 0.84rem;
  color: var(--m-text-muted);
}

.next-step-check {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 0.86rem;
  color: var(--m-text-sec);
  cursor: pointer;
}

.next-step-check input {
  width: 16px;
  height: 16px;
  accent-color: var(--m-accent);
  cursor: pointer;
}

.btn-launch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffffff;
  background: var(--m-accent);
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.28);
  transition: all 0.2s ease;
}

.btn-launch:hover:not(:disabled) {
  background: var(--m-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(79, 70, 229, 0.36);
}

.btn-launch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ============================================================
   RESPONSIVE BREAKPOINTS
   ============================================================ */
@media (max-width: 820px) {
  .setup-container {
    padding: 20px;
    border-radius: 18px;
  }

  .units-grid {
    grid-template-columns: 1fr;
  }

  .setup-title {
    font-size: 1.3rem;
  }
}

@media (max-width: 540px) {
  .setup-overlay {
    padding: 10px;
  }

  .setup-container {
    padding: 16px;
  }

  .header-left {
    flex-direction: column;
    gap: 10px;
  }

  .form-row-2 {
    grid-template-columns: 1fr;
  }

  .setup-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-launch {
    width: 100%;
  }
}
</style>
