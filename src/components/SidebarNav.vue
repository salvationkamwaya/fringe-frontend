<script setup>
import { ref, computed } from 'vue'
import { store } from '../store'
import { 
  Wine, BookOpen, Layers, ShieldCheck, Clock, FileText, 
  LogOut, User as UserIcon, ChevronDown, ChevronLeft, ChevronRight,
  Users, Truck, BarChart3, UserCheck, Coins, Sparkles, Boxes, Sun, Moon, PlusCircle, Receipt,
  Settings
} from 'lucide-vue-next'

const isCollapsed = ref(false)

const roleLabels = {
  owner: 'Business Owner',
  bar_manager: 'Bar Manager',
  bartender: 'Bartender',
  stationery_manager: 'Stationery Manager',
  stationery_cashier: 'Stationery Cashier',
  stock_clerk: 'Stock Clerk'
}

const roleIcons = {
  owner: '👑',
  bar_manager: '🍷',
  bartender: '🍹',
  stationery_manager: '📚',
  stationery_cashier: '✏️',
  stock_clerk: '📦'
}

const currentRoleLabel = computed(() => {
  return roleLabels[store.user?.role] || store.user?.role || 'Staff'
})

const currentRoleIcon = computed(() => {
  return roleIcons[store.user?.role] || '👤'
})

const unitBadgeColor = computed(() => {
  if (store.activeUnit === 'bar') return 'badge-amber'
  if (store.activeUnit === 'stationery') return 'badge-cyan'
  return 'badge-purple'
})

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <aside class="sidebar-nav" :class="{ 'collapsed': isCollapsed }">
    <!-- Top Header: Logo, Brand & Toggle -->
    <div class="sidebar-header">
      <div class="brand-group" @click="store.activeModal = null" title="Fringe Business System">
        <div class="logo-box">
          <span class="logo-letter">F</span>
          <div class="pulse-indicator"></div>
        </div>
        <div v-if="!isCollapsed" class="brand-text">
          <div class="brand-title">FRINGE</div>
          <div class="brand-sub">BUSINESS SYSTEM</div>
        </div>
      </div>

      <button 
        class="btn-toggle" 
        :title="isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'"
        @click="toggleCollapse"
      >
        <ChevronRight v-if="isCollapsed" :size="16" />
        <ChevronLeft v-else :size="16" />
      </button>
    </div>

    <!-- User Profile & Active Role Card -->
    <div 
      class="user-card user-card-clickable" 
      :class="{ 'user-card-collapsed': isCollapsed }"
      @click="store.activeModal = 'account_settings'"
      title="Open Account Settings & Profile"
    >
      <div class="user-avatar" :title="`@${store.user?.username || 'user'} (${currentRoleLabel})`">
        <span class="role-avatar-emoji">{{ currentRoleIcon }}</span>
      </div>

      <div v-if="!isCollapsed" class="user-info">
        <div class="user-name">@{{ store.user?.username || 'Guest' }}</div>
        <div class="role-tag">
          <span class="role-badge">{{ currentRoleLabel }}</span>
        </div>
      </div>
    </div>

    <!-- Active Unit Context & Owner Switcher -->
    <div v-if="!isCollapsed" class="unit-context-box">
      <div class="unit-badge" :class="unitBadgeColor">
        <Wine v-if="store.activeUnit === 'bar'" :size="14" />
        <BookOpen v-else-if="store.activeUnit === 'stationery'" :size="14" />
        <Layers v-else :size="14" />
        <span>{{ store.activeUnit === 'bar' ? 'Bar & Lounge' : store.activeUnit === 'stationery' ? 'Stationery & Retail' : 'All Businesses' }}</span>
      </div>

      <!-- Owner Business Unit Switcher -->
      <div v-if="store.isOwner" class="owner-switcher">
        <label class="switcher-label">View Switcher:</label>
        <div class="select-wrapper">
          <select 
            :value="store.activeUnit" 
            @change="store.switchBusinessUnit($event.target.value)"
            class="switcher-select"
          >
            <option value="bar">🍷 Bar & Lounge</option>
            <option value="stationery">📚 Stationery Shop</option>
            <option value="all">⚡ Combined (Cross-Unit)</option>
          </select>
          <ChevronDown class="select-arrow" :size="13" />
        </div>
      </div>
    </div>

    <!-- Main Navigation Menu (Scrollable) -->
    <nav class="sidebar-menu">
      <!-- SECTION 1: POINT OF SALE -->
      <div class="menu-section">
        <div v-if="!isCollapsed" class="section-title">POS WORKSPACE</div>

        <!-- POS Counter Main Screen -->
        <button 
          class="nav-item" 
          :class="{ active: store.activeModal === null }"
          @click="store.activeModal = null"
          :title="isCollapsed ? 'POS Counter' : ''"
        >
          <Wine v-if="store.activeUnit === 'bar'" :size="18" class="nav-icon" />
          <BookOpen v-else :size="18" class="nav-icon" />
          <span v-if="!isCollapsed" class="nav-label">POS Counter</span>
        </button>

        <!-- Sales Records (Accessible to Bartenders, Cashiers, Managers, Owner) -->
        <button 
          class="nav-item sales-nav-item" 
          :class="{ active: store.activeModal === 'sales_records' }"
          @click="store.activeModal = 'sales_records'"
          :title="isCollapsed ? (store.canRecordSales ? 'My Sales' : 'Sales Records') : ''"
        >
          <Receipt :size="18" class="nav-icon" />
          <span v-if="!isCollapsed" class="nav-label">{{ store.canRecordSales ? 'My Sales' : 'Sales Records' }}</span>
        </button>

        <!-- BAR: Open Tabs -->
        <button 
          v-if="store.activeUnit === 'bar'"
          class="nav-item"
          :class="{ active: store.activeModal === 'tabs' }"
          @click="store.activeModal = 'tabs'"
          :title="isCollapsed ? 'Open Customer Tabs' : ''"
        >
          <Layers :size="18" class="nav-icon" />
          <span v-if="!isCollapsed" class="nav-label">Open Tabs</span>
        </button>

        <!-- STATIONERY: Customers & Debtors -->
        <button 
          v-if="store.activeUnit === 'stationery' || store.activeUnit === 'all'"
          class="nav-item"
          :class="{ active: store.activeModal === 'customers' }"
          @click="store.activeModal = 'customers'"
          :title="isCollapsed ? 'Customers & Credit' : ''"
        >
          <Users :size="18" class="nav-icon" />
          <span v-if="!isCollapsed" class="nav-label">Customers & Credit</span>
        </button>

        <!-- Inventory & Stock Control (Clerk, Managers, Owner) -->
        <button 
          v-if="store.hasInventoryAccess"
          class="nav-item stock-nav-item"
          :class="{ active: store.activeModal === 'stock_inventory' }"
          @click="store.activeModal = 'stock_inventory'"
          :title="isCollapsed ? 'Inventory & Stock Control' : ''"
        >
          <Boxes :size="18" class="nav-icon" />
          <span v-if="!isCollapsed" class="nav-label">Inventory & Stock</span>
        </button>

        <!-- STATIONERY: Suppliers & PO (Accessible to Clerk, Managers, Owner) -->
        <button 
          v-if="store.activeUnit === 'stationery' || store.activeUnit === 'all' || store.hasInventoryAccess"
          class="nav-item"
          :class="{ active: store.activeModal === 'suppliers' }"
          @click="store.activeModal = 'suppliers'"
          :title="isCollapsed ? 'Suppliers & Receiving' : ''"
        >
          <Truck :size="18" class="nav-icon" />
          <span v-if="!isCollapsed" class="nav-label">Suppliers & Goods</span>
        </button>

        <!-- Shift Status -->
        <button 
          class="nav-item shift-item"
          :class="{ 
            'pulse-shift': !store.activeShift && store.canRecordSales, 
            active: store.activeModal === 'shift' 
          }"
          @click="store.activeModal = 'shift'"
          :title="isCollapsed ? (store.activeShift ? `Shift #${store.activeShift.id}` : (store.canRecordSales ? 'Open Shift' : 'Shift Oversight')) : ''"
        >
          <Clock :size="18" class="nav-icon" />
          <span v-if="!isCollapsed" class="nav-label">
            {{ store.canRecordSales ? (store.activeShift ? `Shift #${store.activeShift.id}` : 'Open Register Shift') : 'Shift Oversight' }}
          </span>
          <span class="status-dot" :class="store.activeShift ? 'online' : 'idle'" :title="store.activeShift ? 'Shift Active' : 'No Active Shift'"></span>
        </button>
      </div>

      <!-- SECTION 2: MANAGEMENT & REPORTS -->
      <div 
        v-if="store.isBarManager || store.isStationeryManager || store.isOwner"
        class="menu-section"
      >
        <div v-if="!isCollapsed" class="section-title">MANAGEMENT</div>

        <!-- Drink / Product Registration (Managers & Owner) -->
        <button 
          class="nav-item catalog-nav-item"
          :class="{ active: store.activeModal === 'catalog_management' }"
          @click="store.activeModal = 'catalog_management'"
          :title="isCollapsed ? (store.activeUnit === 'bar' ? 'Register Drinks & Catalog' : 'Register Products & Catalog') : ''"
        >
          <Wine v-if="store.activeUnit === 'bar'" :size="18" class="nav-icon" />
          <BookOpen v-else :size="18" class="nav-icon" />
          <span v-if="!isCollapsed" class="nav-label">{{ store.activeUnit === 'bar' ? 'Drink Registration' : 'Product Registration' }}</span>
        </button>

        <!-- Bar Reports -->
        <button 
          v-if="store.activeUnit === 'bar' && (store.isBarManager || store.isOwner)"
          class="nav-item"
          :class="{ active: store.activeModal === 'reports' }"
          @click="store.activeModal = 'reports'"
          :title="isCollapsed ? 'Bar Reports & Stock' : ''"
        >
          <FileText :size="18" class="nav-icon" />
          <span v-if="!isCollapsed" class="nav-label">Bar Reports</span>
        </button>

        <!-- Stationery Reports -->
        <button 
          v-if="(store.activeUnit === 'stationery' || store.activeUnit === 'all') && (store.isStationeryManager || store.isOwner)"
          class="nav-item"
          :class="{ active: store.activeModal === 'stationery_reports' }"
          @click="store.activeModal = 'stationery_reports'"
          :title="isCollapsed ? 'Stationery Reports & EOD' : ''"
        >
          <BarChart3 :size="18" class="nav-icon" />
          <span v-if="!isCollapsed" class="nav-label">Stationery Reports</span>
        </button>

        <!-- Audit Trail -->
        <button 
          v-if="store.isBarManager || store.isStationeryManager || store.isOwner"
          class="nav-item"
          :class="{ active: store.activeModal === 'audit' }"
          @click="store.activeModal = 'audit'"
          :title="isCollapsed ? 'Audit Trail & Overrides' : ''"
        >
          <ShieldCheck :size="18" class="nav-icon" />
          <span v-if="!isCollapsed" class="nav-label">Audit Trail</span>
        </button>

        <!-- Staff & Roles (Owner Only) -->
        <button 
          v-if="store.isOwner"
          class="nav-item owner-item"
          :class="{ active: store.activeModal === 'staff_management' }"
          @click="store.activeModal = 'staff_management'"
          :title="isCollapsed ? 'Staff & Roles (Owner Only)' : ''"
        >
          <UserCheck :size="18" class="nav-icon" />
          <span v-if="!isCollapsed" class="nav-label">Staff & Roles</span>
          <span v-if="!isCollapsed" class="owner-pill">Owner</span>
        </button>
      </div>
    </nav>

    <!-- Sidebar Bottom: Currency Badge & Logout -->
    <div class="sidebar-footer">
      <div v-if="!isCollapsed" class="currency-badge">
        <Coins :size="14" class="currency-icon" />
        <span class="currency-label">Currency:</span>
        <strong class="currency-name">TSH</strong>
      </div>

      <!-- Account Settings & User Profile -->
      <button 
        v-if="store.isAuthenticated"
        class="btn-account-settings" 
        :class="{ active: store.activeModal === 'account_settings' }"
        @click="store.activeModal = 'account_settings'" 
        :title="isCollapsed ? 'Account Settings & Profile' : ''"
      >
        <Settings :size="16" class="settings-icon" />
        <span v-if="!isCollapsed">Account Settings</span>
      </button>

      <!-- Appearance Switcher (Dark / Light Mode) -->
      <button 
        class="btn-theme-toggle" 
        @click="store.toggleTheme()" 
        :title="store.theme === 'dark' ? 'Switch to Light Appearance' : 'Switch to Dark Appearance'"
      >
        <Sun v-if="store.theme === 'dark'" :size="16" class="theme-icon sun-icon" />
        <Moon v-else :size="16" class="theme-icon moon-icon" />
        <span v-if="!isCollapsed" class="theme-label">{{ store.theme === 'dark' ? 'Light Mode' : 'Dark Mode' }}</span>
      </button>

      <button 
        v-if="store.isAuthenticated" 
        class="btn-logout" 
        title="Sign Out of Session"
        @click="store.logout()"
      >
        <LogOut :size="18" />
        <span v-if="!isCollapsed">Sign Out</span>
      </button>

      <button 
        v-else 
        class="btn-login"
        @click="store.activeModal = 'login'"
        title="Sign In"
      >
        <UserIcon :size="18" />
        <span v-if="!isCollapsed">Sign In</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-nav {
  width: 250px;
  height: 100vh;
  background: #0d121e;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 100;
  user-select: none;
}

.sidebar-nav.collapsed {
  width: 68px;
}

/* Header */
.sidebar-header {
  height: 64px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  overflow: hidden;
}

.logo-box {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px rgba(245, 158, 11, 0.35);
  flex-shrink: 0;
}

.logo-letter {
  font-family: inherit;
  font-size: 20px;
  font-weight: 900;
  color: #fff;
}

.pulse-indicator {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.brand-text {
  display: flex;
  flex-direction: column;
  white-space: nowrap;
}

.brand-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #fff;
  line-height: 1.1;
}

.brand-sub {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: #94a3b8;
}

.btn-toggle {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-toggle:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

/* User Profile Card */
.user-card {
  margin: 12px 14px 6px 14px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
}

.user-card-clickable {
  cursor: pointer;
}

.user-card-clickable:hover {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.35);
  transform: translateY(-1px);
}

.user-card-collapsed {
  margin: 12px 10px 6px 10px;
  padding: 8px;
  justify-content: center;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  white-space: nowrap;
}

.user-name {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #f59e0b;
}

/* Unit Context & Owner Switcher */
.unit-context-box {
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.unit-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.badge-amber {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.badge-cyan {
  background: rgba(6, 182, 212, 0.12);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.3);
}

.badge-purple {
  background: rgba(168, 85, 247, 0.12);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.owner-switcher {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.switcher-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
}

.select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.switcher-select {
  width: 100%;
  appearance: none;
  background: #151c2e;
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #f8fafc;
  padding: 6px 26px 6px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  outline: none;
}

.switcher-select:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.25);
}

.select-arrow {
  position: absolute;
  right: 8px;
  color: #f59e0b;
  pointer-events: none;
}

/* Scrollable Menu */
.sidebar-menu {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-menu::-webkit-scrollbar {
  width: 4px;
}
.sidebar-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.menu-section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.section-title {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #64748b;
  padding: 4px 10px;
  text-transform: uppercase;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  width: 100%;
  text-align: left;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #f8fafc;
}

.nav-item.active {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.18), rgba(245, 158, 11, 0.05));
  border-color: rgba(245, 158, 11, 0.35);
  color: #fbbf24;
  font-weight: 700;
}

.nav-icon {
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.owner-item.active {
  background: linear-gradient(90deg, rgba(168, 85, 247, 0.18), rgba(168, 85, 247, 0.05));
  border-color: rgba(168, 85, 247, 0.35);
  color: #c084fc;
}

.owner-pill {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  background: rgba(168, 85, 247, 0.25);
  color: #d8b4fe;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Shift Status Dot */
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.online {
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}
.status-dot.idle {
  background: #f59e0b;
  box-shadow: 0 0 6px #f59e0b;
}

.pulse-shift {
  animation: pulse-border 2s infinite;
}

@keyframes pulse-border {
  0%, 100% { border-color: rgba(245, 158, 11, 0.2); }
  50% { border-color: rgba(245, 158, 11, 0.6); }
}

/* Footer */
.sidebar-footer {
  padding: 12px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(9, 13, 22, 0.6);
}

.currency-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 6px;
  font-size: 11px;
}

.currency-icon {
  color: #34d399;
}

.currency-label {
  color: #94a3b8;
  font-size: 11px;
}

.currency-name {
  color: #34d399;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.catalog-nav-item {
  border-left: 2px solid transparent;
}
.catalog-nav-item:hover, .catalog-nav-item.active {
  border-left-color: #6366f1;
}

.btn-account-settings {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  transition: all 0.2s ease;
  width: 100%;
  justify-content: flex-start;
}

.btn-account-settings:hover, .btn-account-settings.active {
  background: rgba(99, 102, 241, 0.18);
  border-color: rgba(99, 102, 241, 0.4);
  color: #a5b4fc;
}

.btn-account-settings .settings-icon {
  color: #818cf8;
}

.btn-theme-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  transition: all 0.2s ease;
  width: 100%;
  justify-content: flex-start;
}

.btn-theme-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  border-color: rgba(255, 255, 255, 0.2);
}

.sun-icon {
  color: #f59e0b;
}

.moon-icon {
  color: #818cf8;
}

.theme-label {
  font-size: 12px;
  font-weight: 600;
}

.btn-logout, .btn-login {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  justify-content: flex-start;
}

.btn-logout {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #f87171;
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.45);
}

.btn-login {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  color: #fff;
}
</style>

