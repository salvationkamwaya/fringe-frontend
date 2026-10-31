<script setup>
import { computed } from 'vue'
import { store } from '../store'
import { 
  Wine, BookOpen, Layers, ShieldCheck, Clock, FileText, 
  LogOut, User as UserIcon, ChevronDown, Sparkles
} from 'lucide-vue-next'

const roleLabels = {
  owner: 'Business Owner',
  bar_manager: 'Bar Manager',
  bartender: 'Bartender',
  stationery_manager: 'Stationery Manager',
  stationery_cashier: 'Stationery Cashier',
  stock_clerk: 'Stock Clerk'
}

const currentRoleLabel = computed(() => {
  return roleLabels[store.user?.role] || store.user?.role || 'Staff'
})

const unitBadgeColor = computed(() => {
  if (store.activeUnit === 'bar') return 'badge-amber'
  if (store.activeUnit === 'stationery') return 'badge-cyan'
  return 'badge-purple'
})
</script>

<template>
  <header class="navbar">
    <div class="nav-left">
      <!-- Brand Logo -->
      <div class="brand-group">
        <div class="logo-box">
          <span class="logo-letter">F</span>
          <div class="pulse-indicator"></div>
        </div>
        <div class="brand-text">
          <div class="brand-title">FRINGE</div>
          <div class="brand-sub">BUSINESS SYSTEM</div>
        </div>
      </div>

      <!-- Business Unit Badge -->
      <div class="unit-badge" :class="unitBadgeColor">
        <Wine v-if="store.activeUnit === 'bar'" :size="16" />
        <BookOpen v-else-if="store.activeUnit === 'stationery'" :size="16" />
        <Layers v-else :size="16" />
        <span>{{ store.activeUnit === 'bar' ? 'Bar & Lounge' : store.activeUnit === 'stationery' ? 'Stationery & Retail' : 'All Businesses' }}</span>
      </div>

      <!-- Owner Business Switcher (Strictly for Owner) -->
      <div v-if="store.isOwner" class="owner-switcher">
        <label class="switcher-label">Owner View:</label>
        <div class="select-wrapper">
          <select 
            :value="store.activeUnit" 
            @change="store.switchBusinessUnit($event.target.value)"
            class="switcher-select"
          >
            <option value="bar">🍷 Bar & Lounge View</option>
            <option value="stationery">📚 Stationery Shop View</option>
            <option value="all">⚡ Combined (Cross-Unit)</option>
          </select>
          <ChevronDown class="select-arrow" :size="14" />
        </div>
      </div>
    </div>

    <!-- Center Navigation Actions -->
    <div class="nav-center">
      <button 
        class="nav-tab active"
        @click="store.activeModal = null"
      >
        <Wine :size="16" />
        <span>POS Counter</span>
      </button>

      <button 
        v-if="store.activeUnit === 'bar'"
        class="nav-tab"
        @click="store.activeModal = 'tabs'"
      >
        <Layers :size="16" />
        <span>Open Tabs</span>
      </button>

      <button 
        class="nav-tab"
        :class="{ 'pulse-shift': !store.activeShift }"
        @click="store.activeModal = 'shift'"
      >
        <Clock :size="16" />
        <span>{{ store.activeShift ? `Shift #${store.activeShift.id}` : 'Open Shift' }}</span>
        <span class="status-dot" :class="store.activeShift ? 'online' : 'idle'"></span>
      </button>

      <button 
        v-if="store.isBarManager || store.isOwner"
        class="nav-tab"
        @click="store.activeModal = 'reports'"
      >
        <FileText :size="16" />
        <span>Reports</span>
      </button>

      <button 
        v-if="store.isBarManager || store.isOwner"
        class="nav-tab"
        @click="store.activeModal = 'audit'"
      >
        <ShieldCheck :size="16" />
        <span>Audit Log</span>
      </button>
    </div>

    <!-- Right Profile & Logout -->
    <div class="nav-right">
      <div v-if="store.user" class="user-pill">
        <div class="user-avatar">
          <UserIcon :size="16" />
        </div>
        <div class="user-details">
          <div class="user-name">{{ store.user.first_name || store.user.username }}</div>
          <div class="user-role">{{ currentRoleLabel }}</div>
        </div>
      </div>

      <button 
        v-if="store.isAuthenticated" 
        class="btn-logout" 
        title="Sign Out"
        @click="store.logout()"
      >
        <LogOut :size="18" />
      </button>

      <button 
        v-else 
        class="btn-login"
        @click="store.activeModal = 'login'"
      >
        Sign In
      </button>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  height: 68px;
  background: rgba(13, 17, 27, 0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-left, .nav-center, .nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo-box {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
}

.logo-letter {
  font-family: var(--font-family-heading);
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.05em;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-family: var(--font-family-heading);
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #fff;
}

.brand-sub {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: #94a3b8;
}

.unit-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.badge-amber {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.badge-cyan {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.4);
}

.badge-purple {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.4);
}

.owner-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.switcher-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #9ca3af;
  letter-spacing: 0.05em;
}

.select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.switcher-select {
  appearance: none;
  background: #1e293b;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 6px 30px 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}

.switcher-select:focus {
  border-color: #f59e0b;
}

.select-arrow {
  position: absolute;
  right: 10px;
  pointer-events: none;
  color: #94a3b8;
}

.nav-center {
  background: rgba(255, 255, 255, 0.03);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.nav-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.nav-tab:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.nav-tab.active {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-dot.online {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.status-dot.idle {
  background: #ef4444;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.04);
  padding: 4px 12px 4px 6px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #334155;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1.2;
}

.user-role {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.02em;
}

.btn-logout {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #ef4444;
}

.btn-login {
  padding: 8px 18px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
}
</style>
