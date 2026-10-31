<script setup>
import { ref, computed } from 'vue'
import { store } from '../store'
import api from '../api'
import { Banknote, Smartphone, Split, CheckCircle2, X, AlertCircle, CreditCard } from 'lucide-vue-next'

const emit = defineEmits(['order-completed', 'close'])

const totalDue = computed(() => store.cartSubtotal)

const paymentMode = ref(store.selectedCustomer ? 'CREDIT' : 'CASH') // 'CASH' | 'MOBILE_MONEY' | 'SPLIT' | 'CREDIT'
const cashTendered = ref(totalDue.value)
const mobileRef = ref('')
const mobileAmount = ref(0)
const splitCashAmount = ref(Math.floor(totalDue.value / 2))
const splitMobileAmount = ref(totalDue.value - splitCashAmount.value)
const managerPin = ref('')

const loading = ref(false)
const errorMessage = ref('')
const completedOrder = ref(null)

const changeDue = computed(() => {
  if (paymentMode.value === 'CASH') {
    return Math.max(0, cashTendered.value - totalDue.value)
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
      if (cashTendered.value < totalDue.value) {
        throw new Error('Cash tendered is less than total due.')
      }
      payments.push({
        payment_method: 'CASH',
        amount: totalDue.value,
        reference: ''
      })
    } else if (paymentMode.value === 'MOBILE_MONEY') {
      if (!mobileRef.value) {
        throw new Error('Please enter mobile money transaction reference ID.')
      }
      payments.push({
        payment_method: 'MOBILE_MONEY',
        amount: totalDue.value,
        reference: mobileRef.value
      })
    } else if (paymentMode.value === 'SPLIT') {
      const splitTotal = Number(splitCashAmount.value) + Number(splitMobileAmount.value)
      if (splitTotal < totalDue.value) {
        throw new Error(`Split amounts sum to ZMW ${splitTotal}, but ZMW ${totalDue.value} is due.`)
      }
      payments.push({
        payment_method: 'CASH',
        amount: Number(splitCashAmount.value),
        reference: ''
      })
      payments.push({
        payment_method: 'MOBILE_MONEY',
        amount: Number(splitMobileAmount.value),
        reference: mobileRef.value || 'SPLIT-MOMO'
      })
    } else if (paymentMode.value === 'CREDIT') {
      if (!store.selectedCustomer) {
        throw new Error('Please select or attach a registered customer account for credit sales.')
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
        is_pack_sale: item.is_pack_sale !== undefined ? item.is_pack_sale : true
      })),
      payments,
      customer_id: store.selectedCustomer?.id || null,
      manager_pin: managerPin.value || null,
      tab_id: store.selectedTab?.id || null,
      shift_id: store.activeShift?.id || null,
      is_age_verified: store.isAgeVerified,
      discount_amount: 0,
    }

    const response = await api.post('/pos/orders/', payload)
    completedOrder.value = response.data
    store.showToast(`Order #${response.data.order_number} Completed!`, 'success')
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
  <div class="modal-overlay">
    <div class="modal-card">
      <!-- SUCCESS RECEIPT STATE -->
      <div v-if="completedOrder" class="success-view">
        <div class="success-icon">
          <CheckCircle2 :size="48" />
        </div>
        <h2 class="success-title">Sale Complete!</h2>
        <div class="order-badge">Order #{{ completedOrder.order_number }}</div>

        <div class="receipt-summary">
          <div class="receipt-row">
            <span>Total Paid:</span>
            <span class="amount">ZMW {{ completedOrder.final_amount }}</span>
          </div>
          <div v-if="changeDue > 0" class="receipt-row change-row">
            <span>Change Due to Customer:</span>
            <span class="change-amount">ZMW {{ changeDue.toFixed(2) }}</span>
          </div>
          <div class="receipt-row">
            <span>Cashier:</span>
            <span>{{ completedOrder.cashier_name }}</span>
          </div>
          <div class="receipt-row">
            <span>Items Count:</span>
            <span>{{ completedOrder.items?.length || 0 }} items</span>
          </div>
        </div>

        <button class="btn-new-sale" @click="finishSale">
          Start Next Sale
        </button>
      </div>

      <!-- ACTIVE PAYMENT FORM -->
      <div v-else>
        <div class="header">
          <div>
            <h3 class="title">Settle Payment</h3>
            <p class="subtitle">Select tender and complete transaction</p>
          </div>
          <button class="btn-close" @click="$emit('close')">
            <X :size="18" />
          </button>
        </div>

        <!-- Total Due Banner -->
        <div class="total-banner">
          <div class="total-label">AMOUNT DUE</div>
          <div class="total-amount">ZMW {{ totalDue.toFixed(2) }}</div>
        </div>

        <!-- Payment Method Tabs -->
        <div class="method-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: paymentMode === 'CASH' }"
            @click="paymentMode = 'CASH'"
          >
            <Banknote :size="18" />
            <span>Cash</span>
          </button>

          <button 
            class="tab-btn" 
            :class="{ active: paymentMode === 'MOBILE_MONEY' }"
            @click="paymentMode = 'MOBILE_MONEY'"
          >
            <Smartphone :size="18" />
            <span>Mobile Money</span>
          </button>

          <button 
            class="tab-btn" 
            :class="{ active: paymentMode === 'SPLIT' }"
            @click="paymentMode = 'SPLIT'"
          >
            <Split :size="18" />
            <span>Split Payment</span>
          </button>

          <button 
            v-if="store.activeUnit === 'stationery'"
            class="tab-btn tab-credit" 
            :class="{ active: paymentMode === 'CREDIT' }"
            @click="paymentMode = 'CREDIT'"
          >
            <CreditCard :size="18" />
            <span>Customer Credit</span>
          </button>
        </div>

        <!-- 1. CASH MODE -->
        <div v-if="paymentMode === 'CASH'" class="tender-body">
          <div class="cash-input-group">
            <label>Cash Tendered (ZMW):</label>
            <input 
              v-model.number="cashTendered" 
              type="number" 
              step="1"
              min="0"
              class="cash-input"
            />
          </div>

          <!-- Quick Presets -->
          <div class="presets-grid">
            <button class="preset-btn" @click="setExactCash">Exact</button>
            <button class="preset-btn" @click="addPresetCash(50)">50</button>
            <button class="preset-btn" @click="addPresetCash(100)">100</button>
            <button class="preset-btn" @click="addPresetCash(200)">200</button>
            <button class="preset-btn" @click="addPresetCash(500)">500</button>
          </div>

          <div v-if="changeDue > 0" class="change-preview">
            <span>Change to Return:</span>
            <span class="change-val">ZMW {{ changeDue.toFixed(2) }}</span>
          </div>
        </div>

        <!-- 2. MOBILE MONEY MODE -->
        <div v-else-if="paymentMode === 'MOBILE_MONEY'" class="tender-body">
          <div class="form-group">
            <label>Provider:</label>
            <div class="provider-badges">
              <span class="provider-badge airtel">Airtel Money</span>
              <span class="provider-badge mtn">MTN MoMo</span>
              <span class="provider-badge zamtel">Zamtel Kwacha</span>
            </div>
          </div>

          <div class="form-group">
            <label>Transaction Reference ID:</label>
            <input 
              v-model="mobileRef" 
              type="text" 
              placeholder="e.g. PP261031.1200.H49921"
              class="ref-input"
              required
            />
          </div>
        </div>

        <!-- 3. SPLIT MODE -->
        <div v-else-if="paymentMode === 'SPLIT'" class="tender-body">
          <div class="split-grid">
            <div class="split-col">
              <label>Cash Amount (ZMW):</label>
              <input 
                v-model.number="splitCashAmount" 
                type="number" 
                class="split-input"
              />
            </div>
            <div class="split-col">
              <label>Mobile Money (ZMW):</label>
              <input 
                v-model.number="splitMobileAmount" 
                type="number" 
                class="split-input"
              />
            </div>
          </div>

          <div class="form-group" style="margin-top: 10px;">
            <label>Mobile Reference (Optional):</label>
            <input 
              v-model="mobileRef" 
              type="text" 
              placeholder="e.g. Ref ID"
              class="ref-input"
            />
          </div>
        </div>

        <!-- 4. CUSTOMER CREDIT MODE (Stationery Only) -->
        <div v-else-if="paymentMode === 'CREDIT'" class="tender-body">
          <div v-if="store.selectedCustomer" class="credit-card-panel">
            <div class="credit-meta-row">
              <span class="credit-meta-lbl">Customer Account:</span>
              <strong class="credit-meta-val">{{ store.selectedCustomer.name }}</strong>
            </div>
            <div class="credit-meta-row">
              <span class="credit-meta-lbl">Current Owed Balance:</span>
              <span class="credit-meta-val text-amber">ZMW {{ parseFloat(store.selectedCustomer.current_balance).toFixed(2) }}</span>
            </div>
            <div class="credit-meta-row">
              <span class="credit-meta-lbl">Available Credit:</span>
              <span class="credit-meta-val text-emerald">ZMW {{ parseFloat(store.selectedCustomer.available_credit).toFixed(2) }}</span>
            </div>

            <!-- Over-limit warning & PIN prompt -->
            <div v-if="totalDue > store.selectedCustomer.available_credit" class="credit-override-alert">
              <div class="alert-head">
                <AlertCircle :size="16" class="text-amber" />
                <strong>Manager Authorization Required</strong>
              </div>
              <p class="alert-txt">This sale (ZMW {{ totalDue.toFixed(2) }}) exceeds available credit (ZMW {{ parseFloat(store.selectedCustomer.available_credit).toFixed(2) }}). Enter Manager or Owner PIN to authorize credit override:</p>
              <div class="pin-box">
                <label>Manager / Owner PIN:</label>
                <input 
                  v-model="managerPin" 
                  type="password" 
                  maxlength="4" 
                  placeholder="••••" 
                  class="pin-input"
                  required 
                />
              </div>
            </div>
          </div>

          <div v-else class="credit-no-customer">
            <AlertCircle :size="24" class="text-amber" />
            <p>No registered customer attached to this order.</p>
            <button class="btn-attach-picker" @click="store.activeModal = 'customers'">
              Select Registered Customer
            </button>
          </div>
        </div>

        <div v-if="errorMessage" class="error-msg">
          <AlertCircle :size="16" />
          <span>{{ errorMessage }}</span>
        </div>

        <button 
          class="btn-complete-pay" 
          :disabled="loading"
          @click="handlePayment"
        >
          {{ loading ? 'Processing Settlement...' : `Complete Sale (ZMW ${totalDue.toFixed(2)})` }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 14, 0.88);
  backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 480px;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  padding: 24px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.title {
  font-size: 18px;
  font-weight: 800;
  color: #f8fafc;
}

.subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.btn-close {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border-radius: 8px;
  padding: 6px;
}

.total-banner {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%);
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  margin-bottom: 20px;
}

.total-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #fbbf24;
}

.total-amount {
  font-family: var(--font-family-heading);
  font-size: 32px;
  font-weight: 900;
  color: #fff;
}

.method-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  padding: 6px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: #f59e0b;
  color: #111827;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.tender-body {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 20px;
}

.cash-input-group label {
  display: block;
  font-size: 12px;
  color: #cbd5e1;
  font-weight: 600;
  margin-bottom: 6px;
}

.cash-input {
  width: 100%;
  font-size: 24px;
  font-weight: 800;
  color: #fbbf24;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 10px 14px;
  text-align: center;
  outline: none;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-top: 12px;
}

.preset-btn {
  background: #1e293b;
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.15s ease;
}

.preset-btn:hover {
  background: #334155;
  border-color: #f59e0b;
}

.change-preview {
  margin-top: 14px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #6ee7b7;
  font-size: 13px;
  font-weight: 700;
}

.change-val {
  font-size: 16px;
  color: #10b981;
}

.provider-badges {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.provider-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
}

.provider-badge.airtel {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.provider-badge.mtn {
  background: rgba(234, 179, 8, 0.2);
  color: #facc15;
  border: 1px solid rgba(234, 179, 8, 0.4);
}

.provider-badge.zamtel {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.ref-input {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 10px 14px;
  color: #fff;
  font-size: 13px;
  outline: none;
}

.split-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.split-col label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.split-input {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fbbf24;
  font-size: 16px;
  font-weight: 700;
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fca5a5;
  font-size: 13px;
  margin-bottom: 12px;
}

.btn-complete-pay {
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  font-weight: 900;
  font-size: 16px;
  box-shadow: 0 4px 18px rgba(16, 185, 129, 0.4);
  transition: all 0.2s ease;
}

.btn-complete-pay:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(16, 185, 129, 0.55);
}

/* Success View */
.success-view {
  text-align: center;
  padding: 10px 0;
}

.success-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 0 30px rgba(16, 185, 129, 0.35);
}

.success-title {
  font-size: 24px;
  font-weight: 900;
  color: #fff;
  margin-bottom: 4px;
}

.order-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.08);
  color: #fbbf24;
  font-size: 13px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 9999px;
  margin-bottom: 20px;
}

.receipt-summary {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}

.receipt-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #cbd5e1;
}

.receipt-row.change-row {
  background: rgba(16, 185, 129, 0.15);
  padding: 8px 10px;
  border-radius: 8px;
  color: #34d399;
  font-weight: 700;
}

.change-amount {
  font-size: 16px;
  font-weight: 900;
  color: #10b981;
}

.amount {
  font-weight: 800;
  color: #fff;
}

.btn-new-sale {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
  font-weight: 800;
  font-size: 15px;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35);
}

/* Customer Credit Mode */
.credit-card-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px;
}

.credit-meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.credit-meta-lbl {
  color: #94a3b8;
}

.credit-meta-val {
  color: #f8fafc;
  font-weight: 600;
}

.credit-override-alert {
  margin-top: 10px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 10px;
  padding: 12px;
}

.alert-head {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fbbf24;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
}

.alert-txt {
  font-size: 12px;
  color: #cbd5e1;
  margin: 0 0 10px 0;
  line-height: 1.4;
}

.pin-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pin-box label {
  font-size: 11px;
  font-weight: 600;
  color: #fbbf24;
  text-transform: uppercase;
}

.pin-input {
  width: 100%;
  padding: 10px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 8px;
  color: #f8fafc;
  font-size: 18px;
  letter-spacing: 6px;
  text-align: center;
  outline: none;
}

.credit-no-customer {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 14px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.credit-no-customer p {
  color: #94a3b8;
  margin: 0;
  font-size: 13px;
}

.btn-attach-picker {
  padding: 10px 16px;
  background: rgba(6, 182, 212, 0.2);
  border: 1px solid rgba(6, 182, 212, 0.4);
  border-radius: 8px;
  color: #22d3ee;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
</style>
