<script setup>
import { computed } from 'vue'
import { store } from '../store'
import { ShieldAlert, AlertTriangle, CheckCircle2, X } from 'lucide-vue-next'

const emit = defineEmits(['verified', 'cancelled'])

const alcoholicItems = computed(() => {
  return store.cart.filter(item => item.product.is_alcoholic)
})

const confirmVerification = () => {
  store.isAgeVerified = true
  emit('verified')
}

const cancelVerification = () => {
  store.isAgeVerified = false
  emit('cancelled')
}
</script>

<template>
  <div class="modal-overlay">
    <div class="modal-card">
      <div class="alert-icon-box">
        <ShieldAlert :size="40" />
      </div>

      <div class="badge-mandatory">
        <AlertTriangle :size="14" />
        <span>NON-BYPASSABLE LEGAL CHECK</span>
      </div>

      <h2 class="title">Mandatory Age Verification (18+)</h2>
      <p class="subtitle">
        The current cart contains alcoholic items governed by Zambian Liquor Licensing laws.
        Sales without age verification are strictly prohibited by system architecture and cannot be overridden by any role.
      </p>

      <!-- Alcoholic Items Triggering this Check -->
      <div class="items-summary">
        <div class="items-header">Restricted Items in Cart:</div>
        <div class="items-list">
          <div v-for="item in alcoholicItems" :key="item.product.id" class="item-row">
            <span class="item-qty">{{ item.quantity }}x</span>
            <span class="item-name">{{ item.product.name }}</span>
            <span class="badge-alcohol">ALCOHOLIC</span>
          </div>
        </div>
      </div>

      <div class="certification-box">
        <div class="checkbox-wrapper">
          <input type="checkbox" id="certify-age" checked disabled />
          <label for="certify-age">
            I confirm that valid government-issued photographic identification has been inspected and the customer is verified 18 years of age or older.
          </label>
        </div>
      </div>

      <div class="actions">
        <button class="btn-cancel" @click="cancelVerification">
          Cancel & Return to POS
        </button>
        <button class="btn-confirm" @click="confirmVerification">
          <CheckCircle2 :size="18" />
          <span>Confirm Age (18+) & Proceed</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 14, 0.9);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 520px;
  background: #111827;
  border: 2px solid #ef4444;
  border-radius: 24px;
  box-shadow: 0 0 50px rgba(239, 68, 68, 0.35);
  padding: 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.alert-icon-box {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(239, 68, 68, 0.3);
  margin-bottom: 16px;
  box-shadow: 0 0 25px rgba(239, 68, 68, 0.3);
}

.badge-mandatory {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.title {
  font-size: 22px;
  font-weight: 900;
  color: #f8fafc;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
  margin-bottom: 20px;
}

.items-summary {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 20px;
  text-align: left;
}

.items-header {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #9ca3af;
  margin-bottom: 8px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #e2e8f0;
}

.item-qty {
  font-weight: 700;
  color: #fbbf24;
  margin-right: 8px;
}

.item-name {
  flex: 1;
  font-weight: 600;
}

.badge-alcohol {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.certification-box {
  width: 100%;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 24px;
  text-align: left;
}

.checkbox-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.checkbox-wrapper input {
  margin-top: 3px;
  width: 16px;
  height: 16px;
  accent-color: #f59e0b;
}

.checkbox-wrapper label {
  font-size: 12px;
  color: #fef08a;
  line-height: 1.4;
  font-weight: 500;
}

.actions {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 12px;
}

.btn-cancel {
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 600;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.btn-confirm {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
}

.btn-confirm:hover {
  box-shadow: 0 6px 22px rgba(239, 68, 68, 0.55);
}
</style>
