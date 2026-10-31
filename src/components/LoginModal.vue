<script setup>
import { ref } from 'vue'
import { store } from '../store'
import { Lock, User, KeyRound, Sparkles, X } from 'lucide-vue-next'

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

const quickAccounts = [
  { label: 'Dr. Mitu (Owner)', username: 'owner', role: 'Full Cross-Unit Access', badge: 'Owner' },
  { label: 'Alex Banda (Bar Manager)', username: 'bar_manager', role: 'Bar Approvals & Z-Reports', badge: 'Bar Mgr' },
  { label: 'John Mwila (Bartender)', username: 'bartender', role: 'Bar Counter POS & Tabs', badge: 'Bartender' },
  { label: 'Sarah Tembo (Stat Mgr)', username: 'stationery_manager', role: 'Stationery Approvals', badge: 'Stat Mgr' },
  { label: 'Grace Phiri (Stat Cashier)', username: 'stationery_cashier', role: 'Stationery Counter POS', badge: 'Cashier' },
]

const handleLogin = async (usr = username.value, pwd = password.value || 'password123') => {
  loading.value = true
  errorMessage.value = ''
  try {
    await store.login(usr, pwd)
  } catch (err) {
    errorMessage.value = err.response?.data?.error || 'Invalid credentials'
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
        <div>
          <h2 class="modal-title">Sign In to Fringe POS</h2>
          <p class="modal-subtitle">Select a role or enter your credentials</p>
        </div>
        <button v-if="store.isAuthenticated" class="btn-close" @click="store.activeModal = null">
          <X :size="18" />
        </button>
      </div>

      <!-- Quick Role Selection for Seamless Pair Programming & Demo -->
      <div class="quick-roles-section">
        <div class="section-title">
          <Sparkles :size="14" />
          <span>Quick Switch Accounts (Development Sandbox)</span>
        </div>
        <div class="quick-grid">
          <button 
            v-for="acc in quickAccounts" 
            :key="acc.username"
            class="quick-card"
            :disabled="loading"
            @click="handleLogin(acc.username, 'password123')"
          >
            <div class="quick-badge">{{ acc.badge }}</div>
            <div class="quick-name">{{ acc.label }}</div>
            <div class="quick-role">{{ acc.role }}</div>
          </button>
        </div>
      </div>

      <div class="divider">
        <span>OR ENTER CREDENTIALS</span>
      </div>

      <!-- Credentials Form -->
      <form @submit.prevent="handleLogin()" class="login-form">
        <div class="form-group">
          <label>Username or Email Address</label>
          <div class="input-group">
            <User :size="18" class="input-icon" />
            <input 
              v-model="username" 
              type="text" 
              placeholder="e.g. owner or mitu@fringebusiness.com" 
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label>Password</label>
          <div class="input-group">
            <Lock :size="18" class="input-icon" />
            <input 
              v-model="password" 
              type="password" 
              placeholder="••••••••" 
              required
            />
          </div>
        </div>

        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign In to Counter' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 12, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 540px;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  padding: 28px;
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
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.modal-title {
  font-size: 20px;
  font-weight: 800;
  color: #f8fafc;
}

.modal-subtitle {
  font-size: 13px;
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

.quick-roles-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #fbbf24;
  margin-bottom: 12px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.quick-card {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px;
  text-align: left;
  transition: all 0.2s ease;
}

.quick-card:hover {
  background: rgba(245, 158, 11, 0.15);
  border-color: #f59e0b;
  transform: translateY(-2px);
}

.quick-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  margin-bottom: 4px;
}

.quick-name {
  font-size: 12px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.2;
}

.quick-role {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 20px 0;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.divider::before, .divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.divider span {
  padding: 0 12px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 6px;
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
}

.input-group input {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 12px 14px 12px 42px;
  color: #f8fafc;
  font-size: 14px;
  outline: none;
}

.input-group input:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.25);
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.btn-submit {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  padding: 14px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35);
  transition: all 0.2s ease;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.45);
}
</style>
