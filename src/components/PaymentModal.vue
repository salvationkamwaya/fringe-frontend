<script setup>
import { ref, computed } from 'vue'
import { store } from '../store'
import api from '../api'
import {
  Banknote, Smartphone, Split, CheckCircle2, X, AlertCircle,
  CreditCard, Building2, FileText, ArrowRight, ShieldCheck
} from 'lucide-vue-next'

const emit = defineEmits(['order-completed', 'close'])

const isSw = computed(() => store.locale === 'sw')
const totalDue = computed(() => Number(store.cartSubtotal || 0))

const fmt = (val) => {
  const n = Number(val || 0)
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'
}

const paymentMode = ref(store.selectedCustomer ? 'CREDIT' : 'CASH')
const cashTendered = ref(totalDue.value)
const mobileRef = ref('')
const cardRef = ref('')
const bankTransferRef = ref('')
const splitCashAmount = ref(Math.floor(totalDue.value / 2))
const splitMobileAmount = ref(totalDue.value - splitCashAmount.value)
const managerPin = ref('')

const loading = ref(false)
const errorMessage = ref('')
const completedOrder = ref(null)

const changeDue = computed(() => {
  if (paymentMode.value === 'CASH') {
    return Math.max(0, Number(cashTendered.value || 0) - totalDue.value)
  }
  return 0
})

const setExactCash = () => {
  cashTendered.value = totalDue.value
}

const addPresetCash = (amount) => {
  cashTendered.value = Number(amount)
}

const handlePayment = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const payments = []

    if (paymentMode.value === 'CASH') {
      if (Number(cashTendered.value || 0) < totalDue.value) {
        throw new Error(isSw.value ? 'Pesa iliyotolewa ni ndogo kuliko jumla inayodaiwa.' : 'Cash tendered is less than total due.')
      }
      payments.push({
        payment_method: 'CASH',
        amount: totalDue.value,
        reference: ''
      })
    } else if (paymentMode.value === 'MOBILE_MONEY') {
      if (!mobileRef.value.trim()) {
        throw new Error(isSw.value ? 'Tafadhali weka namba ya kumbukumbu ya muamala wa simu.' : 'Please enter mobile money transaction reference ID.')
      }
      payments.push({
        payment_method: 'MOBILE_MONEY',
        amount: totalDue.value,
        reference: mobileRef.value.trim()
      })
    } else if (paymentMode.value === 'CARD') {
      payments.push({
        payment_method: 'CARD',
        amount: totalDue.value,
        reference: cardRef.value.trim() || 'POS-CARD'
      })
    } else if (paymentMode.value === 'TRANSFER') {
      payments.push({
        payment_method: 'TRANSFER',
        amount: totalDue.value,
        reference: bankTransferRef.value.trim() || 'BANK-TRANSFER'
      })
    } else if (paymentMode.value === 'SPLIT') {
      const splitTotal = Number(splitCashAmount.value || 0) + Number(splitMobileAmount.value || 0)
      if (splitTotal < totalDue.value) {
        throw new Error(`Split amounts sum to TSH ${fmt(splitTotal)}, but TSH ${fmt(totalDue.value)} is due.`)
      }
      payments.push({
        payment_method: 'CASH',
        amount: Number(splitCashAmount.value || 0),
        reference: ''
      })
      payments.push({
        payment_method: 'MOBILE_MONEY',
        amount: Number(splitMobileAmount.value || 0),
        reference: mobileRef.value.trim() || 'SPLIT-MOMO'
      })
    } else if (paymentMode.value === 'CREDIT') {
      if (!store.selectedCustomer) {
        throw new Error(isSw.value ? 'Tafadhali chagua mteja aliyesajiliwa kwa mauzo ya mkopo.' : 'Please select or attach a registered customer account for credit sales.')
      }
      payments.push({
        payment_method: 'CREDIT',
        amount: totalDue.value,
        reference: ''
      })
    }

    const payload = {
      items: store.cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        is_pack_sale: item.is_pack_sale !== undefined ? item.is_pack_sale : true,
        unit_price: item.unit_price,
      })),
      payments,
      customer_id: store.selectedCustomer?.id || null,
      manager_pin: managerPin.value || null,
      tab_id: store.selectedTab?.id || null,
      shift_id: store.activeShift?.id || null,
      is_age_verified: store.isAgeVerified,
      discount_amount: 0,
      order_type: store.activeUnit === 'stationery' ? (store.stationeryMode || 'RETAIL') : 'RETAIL',
      quotation_id: store.activeQuotationId || null,
    }

    const response = await api.post('/pos/orders/', payload)
    completedOrder.value = response.data
    store.activeQuotationId = null
    store.playSound('success')
    store.notifySaleCompleted(response.data)
    store.showToast(
      isSw.value ? `Oda #${response.data.order_number} Imekamilika!` : `Order #${response.data.order_number} Completed!`,
      'success'
    )
    emit('order-completed', response.data)
  } catch (err) {
    errorMessage.value = err.response?.data?.error || err.message || 'Payment processing failed.'
  } finally {
    loading.value = false
  }
}

const finishSale = () => {
  store.clearCart()
  emit('close')
}
</script>

<template>
  <div class="pay-overlay" :data-theme="store.theme" @click.self="!completedOrder && $emit('close')">
    <div class="pay-modal">
      <!-- SUCCESS RECEIPT STATE -->
      <div v-if="completedOrder" class="success-view">
        <div class="success-icon-wrap">
          <CheckCircle2 :size="40" />
        </div>
        <h2 class="success-title">{{ isSw ? 'Malipo Yamekamilika!' : 'Sale Complete!' }}</h2>
        <div class="order-badge">{{ isSw ? 'Oda' : 'Order' }} #{{ completedOrder.order_number }}</div>

        <div class="receipt-summary">
          <div class="receipt-row">
            <span>{{ isSw ? 'Jumla Iliyolipwa' : 'Total Paid' }}</span>
            <strong class="receipt-amount">TSH {{ fmt(completedOrder.final_amount) }}</strong>
          </div>
          <div v-if="changeDue > 0" class="receipt-row change-row">
            <span>{{ isSw ? 'Chenji ya Mteja' : 'Change Due' }}</span>
            <strong class="change-amount">TSH {{ fmt(changeDue) }}</strong>
          </div>
          <div class="receipt-row">
            <span>{{ isSw ? 'Keshia' : 'Cashier' }}</span>
            <span>{{ completedOrder.cashier_name }}</span>
          </div>
          <div class="receipt-row">
            <span>{{ isSw ? 'Idadi ya Bidhaa' : 'Items Count' }}</span>
            <span>{{ completedOrder.items?.length || 0 }} {{ isSw ? 'bidhaa' : 'item(s)' }}</span>
          </div>
        </div>

        <div v-if="completedOrder.order_number && completedOrder.order_number.includes('-WS-')" class="wholesale-action-banner">
          <div class="ws-tag">{{ isSw ? 'Mauzo ya Jumla (B2B) Yamekamilika' : 'B2B Wholesale Sale Completed' }}</div>
          <button type="button" class="btn-wholesale-open" @click="store.activeModal = 'wholesale_docs'">
            <FileText :size="15" />
            <span>{{ isSw ? 'Tengeneza Ankara ya Kodi na Hati ya Usafirishaji' : 'Generate Wholesale Tax Invoice & Delivery Note' }}</span>
          </button>
        </div>

        <button type="button" class="btn-new-sale" @click="finishSale">
          <span>{{ isSw ? 'Anza Mauzo Mengine' : 'Start Next Sale' }}</span>
          <ArrowRight :size="16" />
        </button>
      </div>

      <!-- ACTIVE PAYMENT FORM -->
      <div v-else class="payment-form-layout">
        <!-- Header -->
        <div class="pay-header">
          <div>
            <h3 class="pay-title">{{ isSw ? 'Kamilisha Malipo' : 'Settle Payment' }}</h3>
            <p class="pay-subtitle">{{ isSw ? 'Chagua njia ya malipo na kamilisha muamala' : 'Select payment method and complete transaction' }}</p>
          </div>
          <button type="button" class="btn-close-pay" @click="$emit('close')" :aria-label="isSw ? 'Funga' : 'Close'">
            <X :size="18" />
          </button>
        </div>

        <div class="payment-scroll-body">
          <!-- Total Due Hero Card -->
          <div class="total-banner">
            <span class="total-label">{{ isSw ? 'KIASI KINACHODAIWA' : 'AMOUNT DUE' }}</span>
            <strong class="total-amount">TSH {{ fmt(totalDue) }}</strong>
            <span class="total-items-pill">
              {{ store.cartItemCount }} {{ isSw ? 'bidhaa kwenye oda' : 'item(s) in order ticket' }}
            </span>
          </div>

          <!-- Payment Method Selector Grid -->
          <div class="method-tabs">
            <button
              type="button"
              class="method-tile"
              :class="{ active: paymentMode === 'CASH' }"
              @click="paymentMode = 'CASH'"
            >
              <Banknote :size="18" />
              <span>{{ isSw ? 'Taslimu' : 'Cash' }}</span>
            </button>

            <button
              type="button"
              class="method-tile"
              :class="{ active: paymentMode === 'MOBILE_MONEY' }"
              @click="paymentMode = 'MOBILE_MONEY'"
            >
              <Smartphone :size="18" />
              <span>{{ isSw ? 'Pesa za Simu' : 'Mobile Money' }}</span>
            </button>

            <button
              type="button"
              class="method-tile"
              :class="{ active: paymentMode === 'CARD' }"
              @click="paymentMode = 'CARD'"
            >
              <CreditCard :size="18" />
              <span>{{ isSw ? 'Kadi ya Benki' : 'Bank Card' }}</span>
            </button>

            <button
              type="button"
              class="method-tile"
              :class="{ active: paymentMode === 'TRANSFER' }"
              @click="paymentMode = 'TRANSFER'"
            >
              <Building2 :size="18" />
              <span>{{ isSw ? 'Benki' : 'Bank Transfer' }}</span>
            </button>

            <button
              type="button"
              class="method-tile"
              :class="{ active: paymentMode === 'SPLIT' }"
              @click="paymentMode = 'SPLIT'"
            >
              <Split :size="18" />
              <span>{{ isSw ? 'Gawanya' : 'Split Payment' }}</span>
            </button>

            <button
              v-if="store.activeUnit === 'stationery'"
              type="button"
              class="method-tile"
              :class="{ active: paymentMode === 'CREDIT' }"
              @click="paymentMode = 'CREDIT'"
            >
              <ShieldCheck :size="18" />
              <span>{{ isSw ? 'Mkopo' : 'Customer Credit' }}</span>
            </button>
          </div>

          <!-- 1. CASH MODE -->
          <div v-if="paymentMode === 'CASH'" class="tender-panel">
            <div class="cash-input-group">
              <label>{{ isSw ? 'Pesa Iliyotolewa (TSH)' : 'Cash Tendered (TSH)' }}</label>
              <div class="cash-input-shell">
                <span class="cash-prefix">TSH</span>
                <input
                  v-model.number="cashTendered"
                  type="number"
                  step="1"
                  min="0"
                  class="cash-input"
                />
              </div>
            </div>

            <!-- Balanced 3x2 Quick Presets -->
            <div class="presets-grid">
              <button type="button" class="preset-btn preset-exact" @click="setExactCash">
                {{ isSw ? 'Kamili' : 'Exact' }}
              </button>
              <button type="button" class="preset-btn" @click="addPresetCash(1000)">1,000</button>
              <button type="button" class="preset-btn" @click="addPresetCash(2000)">2,000</button>
              <button type="button" class="preset-btn" @click="addPresetCash(5000)">5,000</button>
              <button type="button" class="preset-btn" @click="addPresetCash(10000)">10,000</button>
              <button type="button" class="preset-btn" @click="addPresetCash(20000)">20,000</button>
            </div>

            <div v-if="changeDue > 0" class="change-preview">
              <span>{{ isSw ? 'Chenji ya Kurudisha:' : 'Change to Return:' }}</span>
              <strong class="change-val">TSH {{ fmt(changeDue) }}</strong>
            </div>
          </div>

          <!-- 2. MOBILE MONEY MODE -->
          <div v-else-if="paymentMode === 'MOBILE_MONEY'" class="tender-panel">
            <div class="form-group">
              <label>{{ isSw ? 'Mtandao wa Simu' : 'Supported Providers' }}</label>
              <div class="provider-badges">
                <span class="provider-chip">M-Pesa</span>
                <span class="provider-chip">Mixx by Yas</span>
                <span class="provider-chip">Airtel Money</span>
                <span class="provider-chip">HaloPesa</span>
              </div>
            </div>

            <div class="form-group">
              <label>{{ isSw ? 'Namba ya Kumbukumbu ya Muamala' : 'Transaction Reference ID' }} <span class="req">*</span></label>
              <input
                v-model="mobileRef"
                type="text"
                placeholder="e.g. PP261031.1200.H49921"
                class="ref-input"
                required
              />
            </div>
          </div>

          <!-- 3. CARD MODE -->
          <div v-else-if="paymentMode === 'CARD'" class="tender-panel">
            <div class="form-group">
              <label>{{ isSw ? 'Namba ya Risiti ya POS / Kadi' : 'Bank Card Terminal Reference / Slip #' }}</label>
              <input
                v-model="cardRef"
                type="text"
                placeholder="e.g. VISA-CRDB-9281"
                class="ref-input"
              />
            </div>
            <p class="panel-hint">
              {{ isSw ? 'Hifadhi nakala ya risiti ya kadi kwa ajili ya usawazishaji wa zamu.' : 'File the card terminal slip with the end-of-shift register reconciliation.' }}
            </p>
          </div>

          <!-- 4. BANK TRANSFER MODE -->
          <div v-else-if="paymentMode === 'TRANSFER'" class="tender-panel">
            <div class="form-group">
              <label>{{ isSw ? 'Namba ya Muamala wa Benki / Hundi' : 'Bank Wire / EFT Reference / Cheque #' }}</label>
              <input
                v-model="bankTransferRef"
                type="text"
                placeholder="e.g. EFT-CRDB-829103"
                class="ref-input"
              />
            </div>
            <p class="panel-hint">
              {{ isSw ? 'Malipo ya moja kwa moja ya benki yanahitaji uthibitisho wa risiti ya benki.' : 'Direct bank deposits require bank notification or slip copy.' }}
            </p>
          </div>

          <!-- 5. SPLIT MODE -->
          <div v-else-if="paymentMode === 'SPLIT'" class="tender-panel">
            <div class="split-grid">
              <div class="form-group">
                <label>{{ isSw ? 'Taslimu (TSH)' : 'Cash Amount (TSH)' }}</label>
                <input v-model.number="splitCashAmount" type="number" class="ref-input" />
              </div>
              <div class="form-group">
                <label>{{ isSw ? 'Pesa za Simu (TSH)' : 'Mobile Money (TSH)' }}</label>
                <input v-model.number="splitMobileAmount" type="number" class="ref-input" />
              </div>
            </div>

            <div class="form-group" style="margin-top: 10px;">
              <label>{{ isSw ? 'Kumbukumbu ya Simu (Hiari)' : 'Mobile Reference (Optional)' }}</label>
              <input v-model="mobileRef" type="text" placeholder="e.g. Ref ID" class="ref-input" />
            </div>
          </div>

          <!-- 6. CUSTOMER CREDIT MODE -->
          <div v-else-if="paymentMode === 'CREDIT'" class="tender-panel">
            <div v-if="store.selectedCustomer" class="credit-card-panel">
              <div class="credit-meta-row">
                <span class="credit-meta-lbl">{{ isSw ? 'Akaunti ya Mteja' : 'Customer Account' }}</span>
                <strong class="credit-meta-val">{{ store.selectedCustomer.name }}</strong>
              </div>
              <div class="credit-meta-row">
                <span class="credit-meta-lbl">{{ isSw ? 'Deni la Sasa' : 'Current Owed Balance' }}</span>
                <strong class="credit-meta-val text-amber">TSH {{ fmt(store.selectedCustomer.current_balance) }}</strong>
              </div>
              <div class="credit-meta-row">
                <span class="credit-meta-lbl">{{ isSw ? 'Mkopo Uliobaki' : 'Available Credit' }}</span>
                <strong class="credit-meta-val text-emerald">TSH {{ fmt(store.selectedCustomer.available_credit) }}</strong>
              </div>

              <div v-if="totalDue > store.selectedCustomer.available_credit" class="credit-override-alert">
                <div class="alert-head">
                  <AlertCircle :size="15" />
                  <strong>{{ isSw ? 'Idhini ya Meneja Inahitajika' : 'Manager Authorization Required' }}</strong>
                </div>
                <p class="alert-txt">
                  {{ isSw
                    ? `Mauzo haya (TSH ${fmt(totalDue)}) yanazidi kikomo cha mkopo. Weka PIN ya Meneja au Mmiliki:`
                    : `This sale (TSH ${fmt(totalDue)}) exceeds available credit. Enter Manager or Owner PIN to override:` }}
                </p>
                <input
                  v-model="managerPin"
                  type="password"
                  maxlength="6"
                  placeholder="••••"
                  class="ref-input pin-center"
                  required
                />
              </div>
            </div>

            <div v-else class="credit-no-customer">
              <AlertCircle :size="22" />
              <p>{{ isSw ? 'Hakuna mteja aliyesajiliwa aliyeambatanishwa na oda hii.' : 'No registered customer attached to this order.' }}</p>
              <button type="button" class="btn-attach-picker" @click="store.activeModal = 'customers'">
                {{ isSw ? 'Chagua Mteja Aliyesajiliwa' : 'Select Registered Customer' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Sticky Footer -->
        <div class="payment-footer">
          <div v-if="errorMessage" class="error-msg">
            <AlertCircle :size="15" />
            <span>{{ errorMessage }}</span>
          </div>

          <button
            type="button"
            class="btn-complete-pay"
            :disabled="loading"
            @click="handlePayment"
          >
            <span>
              {{ loading
                ? (isSw ? 'Inakamilisha Malipo...' : 'Processing Settlement...')
                : (isSw ? `Kamilisha Mauzo (TSH ${fmt(totalDue)})` : `Complete Sale (TSH ${fmt(totalDue)})`) }}
            </span>
            <ArrowRight v-if="!loading" :size="17" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pay-overlay {
  --pm-bg: #111827;
  --pm-surface: #1e293b;
  --pm-elevated: #0f172a;
  --pm-border: rgba(148, 163, 184, 0.18);
  --pm-border-strong: rgba(148, 163, 184, 0.3);
  --pm-text: #f8fafc;
  --pm-text-sec: #cbd5e1;
  --pm-muted: #94a3b8;
  --pm-accent: #6366f1;
  --pm-accent-hover: #4f46e5;
  --pm-accent-soft: rgba(99, 102, 241, 0.16);
  --pm-emerald: #10b981;
  --pm-emerald-soft: rgba(16, 185, 129, 0.14);
  --pm-shadow: 0 24px 56px rgba(0, 0, 0, 0.65);

  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.62);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2200;
  padding: 16px;
  overflow-y: auto;
}

.pay-overlay[data-theme="light"] {
  --pm-bg: #ffffff;
  --pm-surface: #f8fafc;
  --pm-elevated: #ffffff;
  --pm-border: #e2e8f0;
  --pm-border-strong: #cbd5e1;
  --pm-text: #0f172a;
  --pm-text-sec: #334155;
  --pm-muted: #64748b;
  --pm-accent: #4f46e5;
  --pm-accent-hover: #4338ca;
  --pm-accent-soft: #eef2ff;
  --pm-emerald: #059669;
  --pm-emerald-soft: #ecfdf5;
  --pm-shadow: 0 24px 56px rgba(15, 23, 42, 0.22);
}

.pay-modal {
  width: 100%;
  max-width: 490px;
  max-height: 92vh;
  background: var(--pm-bg);
  border: 1px solid var(--pm-border);
  border-radius: 22px;
  box-shadow: var(--pm-shadow);
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.payment-form-layout {
  display: flex;
  flex-direction: column;
  max-height: calc(92vh - 48px);
  min-height: 0;
}

.pay-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.pay-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--pm-text);
  letter-spacing: -0.01em;
}

.pay-subtitle {
  margin: 3px 0 0;
  font-size: 0.8rem;
  color: var(--pm-muted);
}

.btn-close-pay {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--pm-border);
  background: var(--pm-surface);
  color: var(--pm-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.btn-close-pay:hover {
  color: var(--pm-text);
  border-color: var(--pm-border-strong);
}

.payment-scroll-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-right: 2px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Amount Due Hero */
.total-banner {
  background: var(--pm-accent-soft);
  border: 1px solid rgba(79, 70, 229, 0.24);
  border-radius: 16px;
  padding: 18px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.total-label {
  font-size: 0.69rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--pm-accent);
  text-transform: uppercase;
}

.total-amount {
  font-size: 1.95rem;
  font-weight: 900;
  color: var(--pm-text);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.total-items-pill {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--pm-accent);
  background: var(--pm-bg);
  border: 1px solid var(--pm-border);
  padding: 3px 11px;
  border-radius: 999px;
}

/* Payment Method Selector Grid */
.method-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.method-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 12px;
  background: var(--pm-surface);
  border: 1px solid var(--pm-border);
  color: var(--pm-text-sec);
  font-size: 0.77rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.method-tile:hover {
  border-color: var(--pm-accent);
  color: var(--pm-accent);
}

.method-tile.active {
  background: var(--pm-accent);
  border-color: var(--pm-accent);
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.28);
}

/* Tender Panel */
.tender-panel {
  background: var(--pm-surface);
  border: 1px solid var(--pm-border);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cash-input-group label,
.form-group label {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--pm-text-sec);
  margin-bottom: 6px;
}

.req { color: #ef4444; }

.cash-input-shell {
  display: flex;
  align-items: center;
  background: var(--pm-elevated);
  border: 1.5px solid var(--pm-border-strong);
  border-radius: 12px;
  padding: 0 14px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.cash-input-shell:focus-within {
  border-color: var(--pm-accent);
  box-shadow: 0 0 0 3px var(--pm-accent-soft);
}

.cash-prefix {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--pm-muted);
  margin-right: 8px;
}

.cash-input {
  width: 100%;
  border: none;
  background: transparent;
  padding: 12px 4px;
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--pm-text);
  font-variant-numeric: tabular-nums;
  outline: none;
}

/* Balanced 3x2 Presets Grid */
.presets-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.preset-btn {
  padding: 9px 8px;
  border-radius: 10px;
  background: var(--pm-elevated);
  border: 1px solid var(--pm-border-strong);
  color: var(--pm-text);
  font-size: 0.82rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-btn:hover {
  border-color: var(--pm-accent);
  color: var(--pm-accent);
  background: var(--pm-accent-soft);
}

.preset-btn.preset-exact {
  background: var(--pm-accent-soft);
  border-color: rgba(79, 70, 229, 0.3);
  color: var(--pm-accent);
}

.change-preview {
  background: var(--pm-emerald-soft);
  border: 1px solid rgba(16, 185, 129, 0.28);
  border-radius: 11px;
  padding: 11px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--pm-emerald);
}

.change-val {
  font-size: 1rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.provider-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-chip {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--pm-elevated);
  border: 1px solid var(--pm-border);
  color: var(--pm-text-sec);
}

.ref-input {
  width: 100%;
  box-sizing: border-box;
  background: var(--pm-elevated);
  border: 1px solid var(--pm-border-strong);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--pm-text);
  font-size: 0.86rem;
  outline: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.ref-input:focus {
  border-color: var(--pm-accent);
  box-shadow: 0 0 0 3px var(--pm-accent-soft);
}

.pin-center {
  text-align: center;
  letter-spacing: 0.3em;
  font-weight: 800;
}

.panel-hint {
  margin: 0;
  font-size: 0.76rem;
  color: var(--pm-muted);
  line-height: 1.45;
}

.split-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
}

.credit-card-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.credit-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.84rem;
}

.credit-meta-lbl { color: var(--pm-muted); }
.credit-meta-val { color: var(--pm-text); }
.text-amber { color: #d97706 !important; }
.text-emerald { color: var(--pm-emerald) !important; }

.credit-override-alert {
  margin-top: 6px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alert-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: #d97706;
}

.alert-txt {
  margin: 0;
  font-size: 0.76rem;
  color: var(--pm-text-sec);
  line-height: 1.4;
}

.credit-no-customer {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--pm-muted);
  font-size: 0.84rem;
}

.credit-no-customer p { margin: 0; }

.btn-attach-picker {
  padding: 8px 14px;
  border-radius: 9px;
  background: var(--pm-accent);
  color: #ffffff;
  border: none;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

/* Sticky Footer */
.payment-footer {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--pm-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.28);
  color: #dc2626;
  font-size: 0.8rem;
  font-weight: 600;
}

.btn-complete-pay {
  width: 100%;
  padding: 14px 18px;
  border-radius: 12px;
  border: none;
  background: #059669;
  color: #ffffff;
  font-size: 0.94rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.btn-complete-pay:hover:not(:disabled) {
  background: #047857;
  transform: translateY(-1px);
}

.btn-complete-pay:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Success View */
.success-view {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.success-icon-wrap {
  width: 68px;
  height: 68px;
  border-radius: 20px;
  background: var(--pm-emerald-soft);
  color: var(--pm-emerald);
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--pm-text);
}

.order-badge {
  font-size: 0.78rem;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--pm-accent-soft);
  color: var(--pm-accent);
}

.receipt-summary {
  width: 100%;
  background: var(--pm-surface);
  border: 1px solid var(--pm-border);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.receipt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--pm-muted);
}

.receipt-amount {
  font-size: 1.02rem;
  color: var(--pm-text);
}

.change-row {
  padding-top: 8px;
  border-top: 1px dashed var(--pm-border-strong);
}

.change-amount {
  color: var(--pm-emerald);
}

.wholesale-action-banner {
  width: 100%;
  background: var(--pm-accent-soft);
  border: 1px solid rgba(79, 70, 229, 0.25);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ws-tag {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--pm-accent);
}

.btn-wholesale-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 9px;
  border: none;
  background: var(--pm-accent);
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-new-sale {
  width: 100%;
  padding: 13px 18px;
  border-radius: 12px;
  border: none;
  background: var(--pm-accent);
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  margin-top: 4px;
}

.btn-new-sale:hover {
  background: var(--pm-accent-hover);
}

@media (max-width: 480px) {
  .pay-modal {
    padding: 18px;
  }
  .method-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .split-grid {
    grid-template-columns: 1fr;
  }
}
</style>
