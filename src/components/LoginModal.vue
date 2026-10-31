<script setup>
import { ref, computed } from 'vue'
import { store } from '../store'
import { Lock, User, KeyRound, X, RefreshCw, Eye, EyeOff, Check, AlertCircle } from 'lucide-vue-next'

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const passwordTouched = ref(false)

// Strong password requirements
const passwordRules = computed(() => {
  const p = password.value || ''
  return [
    { id: 'length', label: 'At least 8 characters', met: p.length >= 8 },
    { id: 'upper', label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(p) },
    { id: 'lower', label: 'One lowercase letter (a-z)', met: /[a-z]/.test(p) },
    { id: 'number', label: 'One number (0-9)', met: /[0-9]/.test(p) },
    { id: 'special', label: 'One special character (!@#$%^&*)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) }
  ]
})

const missingRules = computed(() => {
  return passwordRules.value.filter(r => !r.met).map(r => r.label)
})

const isPasswordStrong = computed(() => {
  return missingRules.value.length === 0
})

const handleLogin = async () => {
  errorMessage.value = ''

  if (!username.value.trim()) {
    errorMessage.value = 'Please enter your username or email address.'
    return
  }

  if (!password.value) {
    errorMessage.value = 'Please enter your password.'
    return
  }

  // Strong password check
  if (!isPasswordStrong.value) {
    passwordTouched.value = true
    errorMessage.value = `Password does not meet security standards. Missing: ${missingRules.value.join(', ')}.`
    return
  }

  loading.value = true
  try {
    await store.login(username.value.trim(), password.value)
  } catch (err) {
    errorMessage.value = err.response?.data?.error || 'Invalid username or password.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <div class="header-icon">
          <KeyRound :size="24" />
        </div>
        <div class="header-text">
          <div class="brand-tag">FRINGE BUSINESS SYSTEM</div>
          <h2 class="modal-title">Sign In</h2>
        </div>
        <button v-if="store.isAuthenticated" class="btn-close" @click="store.activeModal = null" title="Close">
          <X :size="18" />
        </button>
      </div>

      <!-- Credentials Form -->
      <form @submit.prevent="handleLogin" class="login-form">
        <!-- Username / Email Input -->
        <div class="form-group">
          <label>Username or Email Address</label>
          <div class="input-group">
            <User :size="18" class="input-icon" />
            <input 
              v-model="username" 
              type="text" 
              placeholder="e.g. owner or mitu@fringebusiness.com" 
              autocomplete="username"
              required
            />
          </div>
        </div>

        <!-- Password Input with Toggle Eye -->
        <div class="form-group">
          <div class="label-row">
            <label>Password</label>
            <span v-if="password && isPasswordStrong" class="strength-tag strong">
              <Check :size="12" /> Strong Password
            </span>
          </div>
          <div class="input-group">
            <Lock :size="18" class="input-icon" />
            <input 
              v-model="password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="Enter strong password..." 
              autocomplete="current-password"
              @input="passwordTouched = true"
              required
            />
            <button 
              type="button" 
              class="btn-eye" 
              @click="showPassword = !showPassword" 
              tabindex="-1"
              :title="showPassword ? 'Hide password' : 'View password'"
            >
              <EyeOff v-if="showPassword" :size="18" />
              <Eye v-else :size="18" />
            </button>
          </div>

          <!-- Dynamic Password Strength Requirements Checklist -->
          <div v-if="password.length > 0 || passwordTouched" class="password-checklist">
            <div class="checklist-title">Password Security Requirements:</div>
            <div class="checklist-grid">
              <div 
                v-for="rule in passwordRules" 
                :key="rule.id" 
                class="checklist-item"
                :class="{ 'met': rule.met, 'missing': !rule.met && passwordTouched }"
              >
                <Check v-if="rule.met" :size="13" class="icon-met" />
                <span v-else class="bullet-missing">&bull;</span>
                <span>{{ rule.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Error / Missing Feedback Banner -->
        <div v-if="errorMessage" class="error-banner">
          <AlertCircle :size="16" class="error-icon" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Sign In Button -->
        <button type="submit" class="btn-submit" :disabled="loading">
          <RefreshCw v-if="loading" :size="16" class="spin-anim" />
          <span>{{ loading ? 'Authenticating...' : 'Sign In' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 12, 0.88);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 440px;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  padding: 32px 28px;
  position: relative;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  margin-bottom: 24px;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1));
  color: #f59e0b;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(245, 158, 11, 0.35);
  flex-shrink: 0;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.brand-tag {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #f59e0b;
  margin-bottom: 2px;
}

.modal-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.2;
}

.btn-close {
  position: absolute;
  top: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  border-radius: 8px;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.btn-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 6px;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.strength-tag {
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
}
.strength-tag.strong {
  color: #34d399;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: #64748b;
  pointer-events: none;
}

.input-group input {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 12px 42px 12px 42px;
  color: #f8fafc;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.input-group input:focus {
  border-color: #f59e0b;
  background: #131d35;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.25);
}

.btn-eye {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 6px;
  transition: color 0.15s ease;
}
.btn-eye:hover {
  color: #f8fafc;
}

/* Password Checklist */
.password-checklist {
  margin-top: 10px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px 12px;
}

.checklist-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin-bottom: 6px;
}

.checklist-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  transition: all 0.2s ease;
}

.checklist-item.met {
  color: #34d399;
  font-weight: 600;
}

.checklist-item.missing {
  color: #f87171;
}

.icon-met {
  color: #34d399;
  flex-shrink: 0;
}

.bullet-missing {
  font-size: 14px;
  line-height: 1;
  color: #ef4444;
  flex-shrink: 0;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.45;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.error-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.btn-submit {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  padding: 13px;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35);
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.45);
}

.btn-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spin-anim {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
