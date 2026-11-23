<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from '../store'
import { ShieldAlert, AlertTriangle, CheckCircle2, X, CreditCard, Wine } from 'lucide-vue-next'

const emit = defineEmits(['verified', 'cancelled'])

const isSw = computed(() => store.locale === 'sw')
const certified = ref(true)

const alcoholicItems = computed(() => {
  return store.cart.filter(item => item.product?.is_alcoholic)
})

const acceptedIds = computed(() =>
  isSw.value
    ? [
        'Kitambulisho cha Taifa (NIDA)',
        'Kadi ya Mpiga Kura',
        'Leseni ya Udereva',
        'Pasipoti Halali'
      ]
    : [
        'NIDA National ID (Taifa)',
        'Voter Card (Mpiga Kura)',
        'Driving Licence (Udereva)',
        'Valid Passport'
      ]
)

const confirmVerification = () => {
  if (!certified.value) return
  store.isAgeVerified = true
  emit('verified')
}

const cancelVerification = () => {
  store.isAgeVerified = false
  emit('cancelled')
}

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    cancelVerification()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="age-overlay" :data-theme="store.theme" @click.self="cancelVerification">
    <div class="age-card" role="dialog" aria-modal="true" aria-labelledby="age-modal-title">
      <!-- Top Statutory Accent Strip -->
      <div class="age-top-strip"></div>

      <!-- Close Button -->
      <button
        type="button"
        class="age-close-btn"
        :title="isSw ? 'Funga' : 'Close'"
        @click="cancelVerification"
      >
        <X :size="18" />
      </button>

      <!-- Header -->
      <div class="age-header">
        <div class="age-shield-badge">
          <ShieldAlert :size="30" />
        </div>

        <div class="age-compliance-pill">
          <AlertTriangle :size="12" />
          <span>
            {{ isSw ? 'SHERIA YA TANZANIA • UTHIBITISHO WA LAZIMA' : 'TANZANIA STATUTORY COMPLIANCE • NON-BYPASSABLE' }}
          </span>
        </div>

        <h2 id="age-modal-title" class="age-title">
          {{ isSw ? 'Uthibitisho wa Umri (18+)' : 'Mandatory Age Verification (18+)' }}
        </h2>

        <p class="age-subtitle" v-if="!isSw">
          Alcohol sales are regulated under <strong>The Intoxicating Liquors Act, Cap. 28 [R.E. 2002]</strong>
          (Sections 49 &amp; 50) and the <strong>Law of the Child Act, 2009</strong> of Tanzania.
          Selling alcohol to anyone under 18 is a punishable offence.
        </p>
        <p class="age-subtitle" v-else>
          Mauzo ya pombe yanadhibitiwa chini ya <strong>Sheria ya Vileo, Sura ya 28</strong> (Kifungu cha 49 &amp; 50)
          na <strong>Sheria ya Mtoto ya Mwaka 2009</strong> ya Tanzania. Kuuza pombe kwa mtu chini ya miaka 18 ni kosa la jinai.
        </p>
      </div>

      <!-- Body -->
      <div class="age-body">
        <!-- Accepted Government IDs -->
        <div class="age-section-card id-section">
          <div class="section-head">
            <CreditCard :size="14" class="section-head-icon id-icon" />
            <span>{{ isSw ? 'Vitambulisho Halali vya Serikali Vinavyokubalika' : 'Valid Government Photographic ID Required' }}</span>
          </div>
          <div class="id-grid">
            <div v-for="doc in acceptedIds" :key="doc" class="id-badge">
              <span class="id-dot"></span>
              <span>{{ doc }}</span>
            </div>
          </div>
        </div>

        <!-- Restricted Alcoholic Items in Cart -->
        <div class="age-section-card items-section">
          <div class="section-head between">
            <span class="section-head-left">
              <Wine :size="14" class="section-head-icon wine-icon" />
              <span>{{ isSw ? 'Vinywaji Vya Kileo Kwenye Kikapu' : 'Restricted Alcoholic Items in Cart' }}</span>
            </span>
            <span class="items-count-pill">
              {{ alcoholicItems.length }} {{ isSw ? 'bidhaa' : (alcoholicItems.length === 1 ? 'item' : 'items') }}
            </span>
          </div>
          <div class="items-list">
            <div v-for="item in alcoholicItems" :key="item.product.id" class="item-row">
              <span class="item-qty">{{ item.quantity }}×</span>
              <span class="item-name">{{ item.product.name }}</span>
              <span class="badge-alcohol">18+</span>
            </div>
          </div>
        </div>

        <!-- Bartender Certification Checkbox -->
        <label class="certification-box" :class="{ checked: certified }" for="certify-age">
          <input type="checkbox" id="certify-age" v-model="certified" class="cert-checkbox" />
          <span class="cert-text">
            {{
              isSw
                ? 'Nathibitisha kuwa kitambulisho halali cha picha cha Serikali ya Tanzania kimeonyeshwa, kukaguliwa, na mteja amethibitishwa kuwa na umri wa miaka 18 au zaidi.'
                : 'I certify that a valid Tanzanian Government-issued photographic ID has been presented, inspected, and the customer is verified to be 18 years of age or older.'
            }}
          </span>
        </label>
      </div>

      <!-- Footer Actions -->
      <div class="age-footer">
        <button type="button" class="btn-age-cancel" @click="cancelVerification">
          {{ isSw ? 'Ghairi na Rudi POS' : 'Cancel & Return to POS' }}
        </button>
        <button
          type="button"
          class="btn-age-confirm"
          :disabled="!certified"
          @click="confirmVerification"
        >
          <CheckCircle2 :size="17" />
          <span>{{ isSw ? 'Thibitisha Umri (18+) & Endelea' : 'Confirm Age (18+) & Proceed' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   THEME TOKENS — DARK MODE (DEFAULT) & LIGHT MODE
   ============================================================ */
.age-overlay {
  --age-backdrop: rgba(2, 6, 23, 0.78);
  --age-surface: #0f172a;
  --age-surface-2: rgba(30, 41, 59, 0.65);
  --age-surface-3: rgba(15, 23, 42, 0.72);
  --age-footer-bg: rgba(15, 23, 42, 0.92);
  --age-border: rgba(148, 163, 184, 0.16);
  --age-border-strong: rgba(239, 68, 68, 0.35);
  --age-text: #f8fafc;
  --age-text-secondary: #cbd5e1;
  --age-text-muted: #94a3b8;
  --age-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.06);

  --age-danger-bg: rgba(239, 68, 68, 0.14);
  --age-danger-border: rgba(239, 68, 68, 0.32);
  --age-danger-text: #fca5a5;
  --age-danger-solid: #dc2626;

  --age-id-chip-bg: rgba(15, 23, 42, 0.75);
  --age-id-chip-border: rgba(148, 163, 184, 0.18);
  --age-id-chip-text: #e2e8f0;

  --age-qty-bg: rgba(99, 102, 241, 0.2);
  --age-qty-text: #a5b4fc;

  --age-cert-bg: rgba(245, 158, 11, 0.1);
  --age-cert-border: rgba(245, 158, 11, 0.35);
  --age-cert-text: #fde68a;

  --age-cancel-bg: rgba(255, 255, 255, 0.06);
  --age-cancel-border: rgba(148, 163, 184, 0.22);
  --age-cancel-text: #e2e8f0;
  --age-cancel-hover: rgba(255, 255, 255, 0.12);

  position: fixed;
  inset: 0;
  background: var(--age-backdrop);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 16px;
  animation: ageFadeIn 0.18s ease-out;
}

.age-overlay[data-theme="light"] {
  --age-backdrop: rgba(15, 23, 42, 0.52);
  --age-surface: #ffffff;
  --age-surface-2: #f8fafc;
  --age-surface-3: #ffffff;
  --age-footer-bg: #f8fafc;
  --age-border: #e2e8f0;
  --age-border-strong: #fecaca;
  --age-text: #0f172a;
  --age-text-secondary: #334155;
  --age-text-muted: #64748b;
  --age-shadow: 0 24px 60px rgba(15, 23, 42, 0.22), 0 4px 16px rgba(15, 23, 42, 0.08);

  --age-danger-bg: #fef2f2;
  --age-danger-border: #fecaca;
  --age-danger-text: #b91c1c;
  --age-danger-solid: #dc2626;

  --age-id-chip-bg: #ffffff;
  --age-id-chip-border: #e2e8f0;
  --age-id-chip-text: #1e293b;

  --age-qty-bg: #eef2ff;
  --age-qty-text: #4338ca;

  --age-cert-bg: #fffbeb;
  --age-cert-border: #fcd34d;
  --age-cert-text: #78350f;

  --age-cancel-bg: #ffffff;
  --age-cancel-border: #cbd5e1;
  --age-cancel-text: #334155;
  --age-cancel-hover: #f1f5f9;
}

@keyframes ageFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes agePopIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.age-card {
  position: relative;
  width: 100%;
  max-width: 500px;
  max-height: calc(100vh - 32px);
  background: var(--age-surface);
  border: 1px solid var(--age-border);
  border-radius: 20px;
  box-shadow: var(--age-shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: agePopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.age-top-strip {
  height: 4px;
  width: 100%;
  background: linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #f97316 100%);
  flex-shrink: 0;
}

.age-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: 1px solid var(--age-border);
  background: var(--age-surface-2);
  color: var(--age-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.age-close-btn:hover {
  color: var(--age-text);
  border-color: var(--age-danger-border);
  background: var(--age-danger-bg);
}

/* Header */
.age-header {
  padding: 24px 26px 14px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.age-shield-badge {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  background: var(--age-danger-bg);
  border: 1px solid var(--age-danger-border);
  color: var(--age-danger-solid);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  box-shadow: 0 6px 20px rgba(220, 38, 38, 0.14);
}

.age-compliance-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 999px;
  background: var(--age-danger-bg);
  border: 1px solid var(--age-danger-border);
  color: var(--age-danger-text);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  margin-bottom: 10px;
}

.age-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--age-text);
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}

.age-subtitle {
  font-size: 12.5px;
  color: var(--age-text-muted);
  line-height: 1.55;
  margin: 0;
  max-width: 420px;
}

.age-subtitle strong {
  color: var(--age-text-secondary);
  font-weight: 700;
}

/* Body */
.age-body {
  padding: 6px 24px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.age-section-card {
  background: var(--age-surface-2);
  border: 1px solid var(--age-border);
  border-radius: 13px;
  padding: 13px 14px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--age-text-muted);
  margin-bottom: 10px;
}

.section-head.between {
  justify-content: space-between;
}

.section-head-left {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.section-head-icon {
  flex-shrink: 0;
}

.id-icon {
  color: var(--age-danger-solid);
}

.wine-icon {
  color: #6366f1;
}

/* ID Grid */
.id-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.id-badge {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: 9px;
  background: var(--age-id-chip-bg);
  border: 1px solid var(--age-id-chip-border);
  color: var(--age-id-chip-text);
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.25;
}

.id-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--age-danger-solid);
  flex-shrink: 0;
}

/* Restricted Items */
.items-count-pill {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--age-danger-bg);
  color: var(--age-danger-text);
  border: 1px solid var(--age-danger-border);
  text-transform: none;
  letter-spacing: 0;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 120px;
  overflow-y: auto;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 9px;
  background: var(--age-surface-3);
  border: 1px solid var(--age-border);
}

.item-qty {
  font-size: 11.5px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--age-qty-bg);
  color: var(--age-qty-text);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.item-name {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  color: var(--age-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge-alcohol {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--age-danger-bg);
  color: var(--age-danger-text);
  border: 1px solid var(--age-danger-border);
  flex-shrink: 0;
}

/* Certification Box */
.certification-box {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--age-cert-bg);
  border: 1px solid var(--age-cert-border);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.certification-box:hover {
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.16);
}

.cert-checkbox {
  margin-top: 2px;
  width: 17px;
  height: 17px;
  accent-color: #d97706;
  flex-shrink: 0;
  cursor: pointer;
}

.cert-text {
  font-size: 12px;
  color: var(--age-cert-text);
  line-height: 1.48;
  font-weight: 600;
}

/* Footer */
.age-footer {
  padding: 14px 24px 18px;
  background: var(--age-footer-bg);
  border-top: 1px solid var(--age-border);
  display: grid;
  grid-template-columns: 1fr 1.45fr;
  gap: 10px;
  flex-shrink: 0;
}

.btn-age-cancel {
  padding: 11px 14px;
  border-radius: 11px;
  background: var(--age-cancel-bg);
  border: 1px solid var(--age-cancel-border);
  color: var(--age-cancel-text);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-age-cancel:hover {
  background: var(--age-cancel-hover);
  color: var(--age-text);
}

.btn-age-confirm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 18px;
  border-radius: 11px;
  border: none;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.32);
  transition: all 0.16s ease;
}

.btn-age-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 6px 18px rgba(220, 38, 38, 0.42);
  transform: translateY(-1px);
}

.btn-age-confirm:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

@media (max-width: 520px) {
  .age-header {
    padding: 20px 18px 12px;
  }

  .age-body {
    padding: 4px 18px 14px;
  }

  .id-grid {
    grid-template-columns: 1fr;
  }

  .age-footer {
    padding: 12px 18px 16px;
    grid-template-columns: 1fr;
  }
}
</style>
