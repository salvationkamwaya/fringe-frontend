<script setup>
import { ref } from 'vue'
import { store } from '../store'
import api from '../api'
import { ShieldCheck, Delete, X, AlertCircle } from 'lucide-vue-next'

const pin = ref('')
const reason = ref('')
const loading = ref(false)
const errorMessage = ref('')

const handleDigit = (digit) => {
  if (pin.value.length < 6) {
    pin.value += digit
    errorMessage.value = ''
  }
}

const handleClear = () => {
  pin.value = ''
  errorMessage.value = ''
}

const handleBackspace = () => {
  pin.value = pin.value.slice(0, -1)
  errorMessage.value = ''
}

const handleVerify = async () => {
  if (pin.value.length < 4) {
    errorMessage.value = 'PIN must be at least 4 digits.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await api.post('/auth/verify-manager-pin/', {
      pin: pin.value,
      action: store.pinModalConfig.action,
      context: {
        ...store.pinModalConfig.context,
        reason: reason.value || 'Manager Authorization',
      }
    })

    if (response.data.approved) {
      store.showToast(`Approved by ${response.data.approver_name} (${response.data.approver_role})`, 'success')
      if (typeof store.pinModalConfig.onSuccess === 'function') {
        store.pinModalConfig.onSuccess({
          approver_id: response.data.approver_id,
          approver_name: response.data.approver_name,
          reason: reason.value,
          pin: pin.value,
        })
      }
      store.closeModal()
    }
  } catch (err) {
    errorMessage.value = err.response?.data?.error || 'Invalid Manager PIN for this business unit.'
    pin.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay">
    <div class="modal-card">
      <div class="header">
        <div class="icon-box">
          <ShieldCheck :size="24" />
        </div>
        <div class="header-text">
          <h3 class="title">{{ store.pinModalConfig.title }}</h3>
          <p class="subtitle">{{ store.pinModalConfig.subtitle }}</p>
        </div>
        <button class="btn-close" @click="store.closeModal">
          <X :size="18" />
        </button>
      </div>

      <!-- Action Context Details -->
      <div v-if="store.pinModalConfig.context?.details" class="context-banner">
        <strong>Target:</strong> {{ store.pinModalConfig.context.details }}
      </div>

      <!-- Reason Input -->
      <div class="reason-group">
        <label>Reason for Override / Approval:</label>
        <input 
          v-model="reason" 
          type="text" 
          placeholder="e.g. Customer cancelled / Broken bottle / 10% promo"
        />
      </div>

      <!-- Masked PIN Indicator -->
      <div class="pin-display">
        <div 
          v-for="i in 4" 
          :key="i" 
          class="pin-dot"
          :class="{ filled: pin.length >= i }"
        ></div>
      </div>

      <div v-if="errorMessage" class="error-msg">
        <AlertCircle :size="16" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Touch Numpad Grid -->
      <div class="numpad">
        <button 
          v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9]" 
          :key="num"
          class="num-btn"
          @click="handleDigit(String(num))"
        >
          {{ num }}
        </button>
        <button class="num-btn aux" @click="handleClear">C</button>
        <button class="num-btn" @click="handleDigit('0')">0</button>
        <button class="num-btn aux" @click="handleBackspace">
          <Delete :size="20" />
        </button>
      </div>

      <button 
        class="btn-submit" 
        :disabled="pin.length < 4 || loading"
        @click="handleVerify"
      >
        {{ loading ? 'Verifying...' : 'Authorize Action' }}
      </button>
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
  max-width: 440px;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  padding: 24px;
}

.header {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  margin-bottom: 16px;
}

.icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.title {
  font-size: 17px;
  font-weight: 800;
  color: #f8fafc;
}

.subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.btn-close {
  position: absolute;
  top: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border-radius: 8px;
  padding: 6px;
}

.context-banner {
  background: rgba(255, 255, 255, 0.04);
  border-left: 3px solid #818cf8;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #cbd5e1;
  margin-bottom: 14px;
}

.reason-group {
  margin-bottom: 16px;
}

.reason-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 6px;
}

.reason-group input {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 10px 14px;
  color: #f8fafc;
  font-size: 13px;
  outline: none;
}

.reason-group input:focus {
  border-color: #818cf8;
}

.pin-display {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 16px 0;
}

.pin-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  transition: all 0.2s ease;
}

.pin-dot.filled {
  background: #818cf8;
  border-color: #818cf8;
  box-shadow: 0 0 12px rgba(129, 140, 248, 0.6);
  transform: scale(1.15);
}

.error-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fca5a5;
  font-size: 13px;
  margin-bottom: 12px;
}

.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.num-btn {
  height: 52px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  font-size: 20px;
  font-weight: 700;
  color: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.num-btn:hover {
  background: #334155;
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.num-btn:active {
  transform: scale(0.96);
}

.num-btn.aux {
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  font-size: 16px;
}

.btn-submit {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #fff;
  font-weight: 800;
  font-size: 15px;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
  transition: all 0.2s ease;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
</style>
