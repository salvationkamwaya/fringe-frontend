<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import { 
  Wine, BookOpen, Layers, ShieldCheck, Clock, FileText, 
  LogOut, User as UserIcon, ChevronDown, ChevronLeft, ChevronRight,
  Users, Truck, BarChart3, UserCheck, Coins, Boxes, Sun, Moon, Receipt,
  Settings, DollarSign, RotateCcw, Barcode, MapPin, LayoutDashboard, Check, Globe
} from 'lucide-vue-next'

const isCollapsed = ref(typeof window !== 'undefined' ? window.innerWidth <= 900 : false)

const openGroups = ref({
  pos: true,
  sales: true,
  catalog: true,
  reports: true,
  org: true,
})

const toggleGroup = (key) => {
  openGroups.value[key] = !openGroups.value[key]
}

const roleLabels = {
  owner: 'Business Owner',
  bar_manager: 'Bar & Grocery Manager',
  bartender: 'Bartender / Grocery Cashier',
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

const barUnitName = computed(() => store.businessUnits.find(u => u.id === 'bar')?.name || 'Bar & Lounge')
const stationeryUnitName = computed(() => store.businessUnits.find(u => u.id === 'stationery')?.name || 'Stationery & Retail')

const isUnitDropdownOpen = ref(false)
const unitDropdownRef = ref(null)

const isBranchDropdownOpen = ref(false)
const branchDropdownRef = ref(null)

const unitScopedBranches = computed(() => {
  const all = (store.branches || []).filter(b => b.is_active !== false)
  if (store.activeUnit === 'all') return all
  return all.filter(b => (b.business_unit_id || b.business_unit) === store.activeUnit)
})

const selectBranch = (branchId) => {
  isBranchDropdownOpen.value = false
  if (String(store.activeBranchId) !== String(branchId)) {
    store.switchBranch(String(branchId))
  }
}

const unitOptions = computed(() => [
  { id: 'bar', label: barUnitName.value, desc: t('nav.barDesc'), icon: Wine },
  { id: 'stationery', label: stationeryUnitName.value, desc: t('nav.stationeryDesc'), icon: BookOpen },
  { id: 'all', label: t('nav.combinedView'), desc: t('nav.crossUnitDesc'), icon: Layers },
])

const activeUnitOption = computed(() =>
  unitOptions.value.find(o => o.id === store.activeUnit) || unitOptions.value[0]
)

const selectBusinessUnit = (unitId) => {
  isUnitDropdownOpen.value = false
  if (store.activeUnit !== unitId) {
    store.switchBusinessUnit(unitId)
  }
}

const handleOutsideClick = (e) => {
  if (unitDropdownRef.value && !unitDropdownRef.value.contains(e.target)) {
    isUnitDropdownOpen.value = false
  }
  if (branchDropdownRef.value && !branchDropdownRef.value.contains(e.target)) {
    isBranchDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
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
        <span>{{ store.activeUnit === 'bar' ? barUnitName : store.activeUnit === 'stationery' ? stationeryUnitName : 'All Businesses' }}</span>
      </div>

      <!-- Owner Business Unit Switcher (Custom Styled Dropdown) -->
      <div v-if="store.isOwner" class="owner-switcher" ref="unitDropdownRef">
        <label class="switcher-label">{{ t('nav.viewSwitcher') }}</label>
        <div class="custom-dropdown" :class="{ open: isUnitDropdownOpen }" :data-theme="store.theme">
          <button
            type="button"
            class="dropdown-trigger"
            @click.stop="isUnitDropdownOpen = !isUnitDropdownOpen"
            :aria-expanded="isUnitDropdownOpen"
          >
            <span class="trigger-icon-tile">
              <component :is="activeUnitOption.icon" :size="15" />
            </span>
            <span class="trigger-text">
              <strong>{{ activeUnitOption.label }}</strong>
            </span>
            <ChevronDown class="trigger-chevron" :class="{ rotated: isUnitDropdownOpen }" :size="15" />
          </button>

          <transition name="dd-pop">
            <div v-if="isUnitDropdownOpen" class="dropdown-menu" role="listbox">
              <button
                v-for="opt in unitOptions"
                :key="opt.id"
                type="button"
                class="dropdown-option"
                :class="{ active: store.activeUnit === opt.id }"
                @click="selectBusinessUnit(opt.id)"
              >
                <span class="option-icon-tile">
                  <component :is="opt.icon" :size="15" />
                </span>
                <span class="option-copy">
                  <strong>{{ opt.label }}</strong>
                  <span>{{ opt.desc }}</span>
                </span>
                <Check v-if="store.activeUnit === opt.id" :size="15" class="option-check" />
              </button>
            </div>
          </transition>
        </div>
      </div>

      <!-- Owner Branch Switcher (Custom Styled Dropdown) -->
      <div v-if="store.isOwner && unitScopedBranches.length > 0" class="owner-branch-switcher" ref="branchDropdownRef">
        <label class="switcher-label branch-label">
          <span>{{ store.locale === 'sw' ? 'TAWI LINALOTUMIKA' : 'ACTIVE BRANCH' }}</span>
          <span class="branch-count-tag">{{ unitScopedBranches.length }}</span>
        </label>
        <div class="custom-dropdown" :class="{ open: isBranchDropdownOpen }" :data-theme="store.theme">
          <button
            type="button"
            class="dropdown-trigger"
            @click.stop="isBranchDropdownOpen = !isBranchDropdownOpen"
            :aria-expanded="isBranchDropdownOpen"
          >
            <span class="trigger-icon-tile">
              <MapPin :size="15" />
            </span>
            <span class="trigger-text">
              <strong>{{ store.activeBranchId === 'all' ? (store.locale === 'sw' ? 'Matawi Yote' : 'All Branches') : store.activeBranchName }}</strong>
            </span>
            <ChevronDown class="trigger-chevron" :class="{ rotated: isBranchDropdownOpen }" :size="15" />
          </button>

          <transition name="dd-pop">
            <div v-if="isBranchDropdownOpen" class="dropdown-menu" role="listbox">
              <button
                type="button"
                class="dropdown-option"
                :class="{ active: store.activeBranchId === 'all' }"
                @click="selectBranch('all')"
              >
                <span class="option-icon-tile">
                  <Layers :size="14" />
                </span>
                <span class="option-copy">
                  <strong>{{ store.locale === 'sw' ? 'Matawi Yote' : 'All Branches' }}</strong>
                  <span>{{ store.locale === 'sw' ? 'Jumla ya matawi yote' : 'Combined branch view' }}</span>
                </span>
                <Check v-if="store.activeBranchId === 'all'" :size="15" class="option-check" />
              </button>

              <button
                v-for="b in unitScopedBranches"
                :key="b.id"
                type="button"
                class="dropdown-option"
                :class="{ active: String(store.activeBranchId) === String(b.id) }"
                @click="selectBranch(b.id)"
              >
                <span class="option-icon-tile">
                  <MapPin :size="14" />
                </span>
                <span class="option-copy">
                  <strong>{{ b.name }}</strong>
                  <span>{{ b.code }}</span>
                </span>
                <Check v-if="String(store.activeBranchId) === String(b.id)" :size="15" class="option-check" />
              </button>
            </div>
          </transition>
        </div>
      </div>

      <!-- Frontline Staff Branch Assignment Badge (Permanent, No Roaming) -->
      <div v-if="!store.isOwner && store.activeUnit === 'bar'" class="staff-branch-badge" :title="`Assigned to ${store.activeBranchName}`">
        <MapPin :size="13" class="staff-branch-icon" />
        <div class="staff-branch-info">
          <span class="staff-branch-name">{{ store.activeBranchName }}</span>
          <span v-if="store.activeBranchCode" class="staff-branch-code">{{ store.activeBranchCode }}</span>
        </div>
      </div>
    </div>

    <!-- Main Navigation Menu (Scrollable & Logically Grouped) -->
    <nav class="sidebar-menu">
      <!-- GROUP 1: POINT OF SALE -->
      <div class="menu-section">
        <button v-if="!isCollapsed" type="button" class="section-header-btn" @click="toggleGroup('pos')">
          <span class="section-title">{{ t('nav.group.pos') }}</span>
          <ChevronDown :size="13" class="group-chevron" :class="{ rotated: !openGroups.pos }" />
        </button>

        <template v-if="isCollapsed || openGroups.pos">
          <!-- Dashboard Landing Page (All Business Units) -->
          <button
            class="nav-item"
            :class="{ active: store.activeModal === null }"
            @click="store.activeModal = null"
            :title="isCollapsed ? t('nav.dashboard') : ''"
          >
            <LayoutDashboard :size="18" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.dashboard') }}</span>
          </button>

          <!-- POS Counter Main Screen -->
          <button 
            class="nav-item" 
            :class="{ active: store.activeUnit === 'stationery' ? store.activeModal === 'stationery_pos' : store.activeModal === 'bar_pos' }"
            @click="store.activeModal = store.activeUnit === 'stationery' ? 'stationery_pos' : 'bar_pos'"
            :title="isCollapsed ? t('nav.posCounter') : ''"
          >
            <Wine v-if="store.activeUnit === 'bar'" :size="18" class="nav-icon" />
            <BookOpen v-else :size="18" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.posCounter') }}</span>
          </button>

          <!-- BAR: Open Tabs -->
          <button 
            v-if="store.activeUnit === 'bar'"
            class="nav-item"
            :class="{ active: store.activeModal === 'tabs' }"
            @click="store.activeModal = 'tabs'"
            :title="isCollapsed ? t('nav.openTabs') : ''"
          >
            <Layers :size="18" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.openTabs') }}</span>
          </button>

          <!-- Shift Status -->
          <button 
            class="nav-item shift-item"
            :class="{ 
              'pulse-shift': !store.activeShift && store.canRecordSales, 
              active: store.activeModal === 'shift' 
            }"
            @click="store.activeModal = 'shift'"
            :title="isCollapsed ? (store.activeShift ? `Shift #${store.activeShift.id}` : (store.canRecordSales ? t('nav.openShift') : t('nav.shiftOversight'))) : ''"
          >
            <Clock :size="18" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">
              {{ store.canRecordSales ? (store.activeShift ? `Shift #${store.activeShift.id}` : t('nav.openShift')) : t('nav.shiftOversight') }}
            </span>
            <span class="status-dot" :class="store.activeShift ? 'online' : 'idle'" :title="store.activeShift ? 'Shift Active' : 'No Active Shift'"></span>
          </button>
        </template>
      </div>

      <!-- GROUP 2: SALES & CUSTOMERS -->
      <div class="menu-section">
        <button v-if="!isCollapsed" type="button" class="section-header-btn" @click="toggleGroup('sales')">
          <span class="section-title">{{ t('nav.group.sales') }}</span>
          <ChevronDown :size="13" class="group-chevron" :class="{ rotated: !openGroups.sales }" />
        </button>

        <template v-if="isCollapsed || openGroups.sales">
          <!-- Sales Records Page -->
          <button 
            class="nav-item sales-nav-item" 
            :class="{ active: store.activeModal === 'sales_records' }"
            @click="store.activeModal = 'sales_records'"
            :title="isCollapsed ? (store.canRecordSales ? t('nav.mySales') : t('nav.salesRecords')) : ''"
          >
            <Receipt :size="18" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">{{ store.canRecordSales ? t('nav.mySales') : t('nav.salesRecords') }}</span>
          </button>

          <!-- STATIONERY: Customers & Debtors -->
          <button 
            v-if="store.activeUnit === 'stationery' || store.activeUnit === 'all'"
            class="nav-item"
            :class="{ active: store.activeModal === 'customers' }"
            @click="store.activeModal = 'customers'"
            :title="isCollapsed ? t('nav.customers') : ''"
          >
            <Users :size="18" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.customers') }}</span>
          </button>

          <!-- STATIONERY: Quotations & Proformas -->
          <button 
            v-if="store.activeUnit === 'stationery' || store.activeUnit === 'all'"
            class="nav-item"
            :class="{ active: store.activeModal === 'quotations' }"
            @click="store.activeModal = 'quotations'"
            :title="isCollapsed ? t('nav.quotations') : ''"
          >
            <FileText :size="18" class="nav-icon text-indigo" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.quotations') }}</span>
          </button>

          <!-- STATIONERY: Wholesale Invoices & Delivery Notes -->
          <button 
            v-if="store.activeUnit === 'stationery' || store.activeUnit === 'all'"
            class="nav-item"
            :class="{ active: store.activeModal === 'wholesale_docs' }"
            @click="store.activeModal = 'wholesale_docs'"
            :title="isCollapsed ? t('nav.wholesaleInvoices') : ''"
          >
            <Truck :size="18" class="nav-icon text-blue" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.wholesaleInvoices') }}</span>
          </button>

          <!-- STATIONERY: Sales Returns & Refunds -->
          <button 
            v-if="store.activeUnit === 'stationery' || store.activeUnit === 'all'"
            class="nav-item"
            :class="{ active: store.activeModal === 'stationery_returns' }"
            @click="store.activeModal = 'stationery_returns'"
            :title="isCollapsed ? t('nav.returns') : ''"
          >
            <RotateCcw :size="18" class="nav-icon text-rose" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.returns') }}</span>
          </button>
        </template>
      </div>

      <!-- GROUP 3: CATALOG & INVENTORY -->
      <div
        v-if="store.hasInventoryAccess || store.isBarManager || store.isStationeryManager || store.isOwner || store.activeUnit === 'stationery' || store.activeUnit === 'all'"
        class="menu-section"
      >
        <button v-if="!isCollapsed" type="button" class="section-header-btn" @click="toggleGroup('catalog')">
          <span class="section-title">{{ t('nav.group.catalog') }}</span>
          <ChevronDown :size="13" class="group-chevron" :class="{ rotated: !openGroups.catalog }" />
        </button>

        <template v-if="isCollapsed || openGroups.catalog">
          <!-- Drink / Product Registration Page (Managers & Owner) -->
          <button 
            v-if="store.isBarManager || store.isStationeryManager || store.isOwner"
            class="nav-item catalog-nav-item"
            :class="{ active: store.activeModal === 'catalog_management' }"
            @click="store.activeModal = 'catalog_management'"
            :title="isCollapsed ? (store.activeUnit === 'bar' ? t('nav.drinkRegistration') : t('nav.productRegistration')) : ''"
          >
            <Wine v-if="store.activeUnit === 'bar'" :size="18" class="nav-icon" />
            <BookOpen v-else :size="18" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">{{ store.activeUnit === 'bar' ? t('nav.drinkRegistration') : t('nav.productRegistration') }}</span>
          </button>

          <!-- Inventory & Stock Control -->
          <button 
            v-if="store.hasInventoryAccess"
            class="nav-item stock-nav-item"
            :class="{ active: store.activeModal === 'stock_inventory' }"
            @click="store.activeModal = 'stock_inventory'"
            :title="isCollapsed ? t('nav.inventory') : ''"
          >
            <Boxes :size="18" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.inventory') }}</span>
          </button>

          <!-- Suppliers & Receiving -->
          <button 
            v-if="store.hasInventoryAccess"
            class="nav-item"
            :class="{ active: store.activeModal === 'suppliers' }"
            @click="store.activeModal = 'suppliers'"
            :title="isCollapsed ? t('nav.suppliers') : ''"
          >
            <Truck :size="18" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.suppliers') }}</span>
          </button>

          <!-- STATIONERY: Barcode Labels -->
          <button 
            v-if="store.activeUnit === 'stationery' || store.activeUnit === 'all'"
            class="nav-item"
            :class="{ active: store.activeModal === 'barcode_labels' }"
            @click="store.activeModal = 'barcode_labels'"
            :title="isCollapsed ? t('nav.barcodeLabels') : ''"
          >
            <Barcode :size="18" class="nav-icon text-amber" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.barcodeLabels') }}</span>
          </button>
        </template>
      </div>

      <!-- GROUP 4: FINANCE & REPORTS -->
      <div 
        v-if="store.isBarManager || store.isStationeryManager || store.isOwner"
        class="menu-section"
      >
        <button v-if="!isCollapsed" type="button" class="section-header-btn" @click="toggleGroup('reports')">
          <span class="section-title">{{ t('nav.group.reports') }}</span>
          <ChevronDown :size="13" class="group-chevron" :class="{ rotated: !openGroups.reports }" />
        </button>

        <template v-if="isCollapsed || openGroups.reports">
          <!-- Operating Expenses -->
          <button 
            class="nav-item"
            :class="{ active: store.activeModal === 'expenses' }"
            @click="store.activeModal = 'expenses'"
            :title="isCollapsed ? t('nav.expenses') : ''"
          >
            <DollarSign :size="18" class="nav-icon text-amber" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.expenses') }}</span>
          </button>

          <!-- Bar Reports -->
          <button 
            v-if="store.activeUnit === 'bar' && (store.isBarManager || store.isOwner)"
            class="nav-item"
            :class="{ active: store.activeModal === 'reports' }"
            @click="store.activeModal = 'reports'"
            :title="isCollapsed ? t('nav.barReports') : ''"
          >
            <FileText :size="18" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.barReports') }}</span>
          </button>

          <!-- Stationery Reports -->
          <button 
            v-if="(store.activeUnit === 'stationery' || store.activeUnit === 'all') && (store.isStationeryManager || store.isOwner)"
            class="nav-item"
            :class="{ active: store.activeModal === 'stationery_reports' }"
            @click="store.activeModal = 'stationery_reports'"
            :title="isCollapsed ? t('nav.stationeryReports') : ''"
          >
            <BarChart3 :size="18" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.stationeryReports') }}</span>
          </button>

          <!-- Audit Trail -->
          <button 
            class="nav-item"
            :class="{ active: store.activeModal === 'audit' }"
            @click="store.activeModal = 'audit'"
            :title="isCollapsed ? t('nav.auditTrail') : ''"
          >
            <ShieldCheck :size="18" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.auditTrail') }}</span>
          </button>
        </template>
      </div>

      <!-- GROUP 5: ORGANIZATION (Owner Only) -->
      <div v-if="store.isOwner" class="menu-section">
        <button v-if="!isCollapsed" type="button" class="section-header-btn" @click="toggleGroup('org')">
          <span class="section-title">{{ t('nav.group.org') }}</span>
          <ChevronDown :size="13" class="group-chevron" :class="{ rotated: !openGroups.org }" />
        </button>

        <template v-if="isCollapsed || openGroups.org">
          <!-- Staff & Roles -->
          <button 
            class="nav-item owner-item"
            :class="{ active: store.activeModal === 'staff_management' }"
            @click="store.activeModal = 'staff_management'"
            :title="isCollapsed ? t('nav.staffRoles') : ''"
          >
            <UserCheck :size="18" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.staffRoles') }}</span>
            <span v-if="!isCollapsed" class="owner-pill">Owner</span>
          </button>

          <!-- Branches & Locations -->
          <button 
            class="nav-item owner-item branch-nav-btn"
            :class="{ active: store.activeModal === 'branch_management' }"
            @click="store.activeModal = 'branch_management'"
            :title="isCollapsed ? t('nav.branches') : ''"
          >
            <MapPin :size="18" class="nav-icon text-emerald" />
            <span v-if="!isCollapsed" class="nav-label">{{ t('nav.branches') }}</span>
            <span v-if="!isCollapsed" class="owner-pill">Owner</span>
          </button>
        </template>
      </div>
    </nav>

    <!-- Sidebar Bottom: Currency Badge, Language Switcher, Theme & Logout -->
    <div class="sidebar-footer">
      <div v-if="!isCollapsed" class="currency-badge">
        <Coins :size="14" class="currency-icon" />
        <span class="currency-label">{{ t('nav.currency') }}:</span>
        <strong class="currency-name">TSH</strong>
      </div>

      <!-- Language Switcher (EN / SW) -->
      <div v-if="!isCollapsed" class="lang-switcher" :data-theme="store.theme">
        <Globe :size="14" class="lang-icon" />
        <button
          type="button"
          class="lang-btn"
          :class="{ active: store.locale === 'en' }"
          @click="store.setLocale('en')"
        >
          EN
        </button>
        <button
          type="button"
          class="lang-btn"
          :class="{ active: store.locale === 'sw' }"
          @click="store.setLocale('sw')"
        >
          SW
        </button>
      </div>
      <button
        v-else
        type="button"
        class="btn-theme-toggle"
        @click="store.toggleLocale()"
        :title="store.locale === 'en' ? 'Switch to Kiswahili' : 'Switch to English'"
      >
        <Globe :size="16" />
      </button>

      <!-- Account Settings & User Profile -->
      <button 
        v-if="store.isAuthenticated"
        class="btn-account-settings" 
        :class="{ active: store.activeModal === 'account_settings' }"
        @click="store.activeModal = 'account_settings'" 
        :title="isCollapsed ? t('nav.accountSettings') : ''"
      >
        <Settings :size="16" class="settings-icon" />
        <span v-if="!isCollapsed">{{ t('nav.accountSettings') }}</span>
      </button>

      <!-- Appearance Switcher (Dark / Light Mode) -->
      <button 
        class="btn-theme-toggle" 
        @click="store.toggleTheme()" 
        :title="store.theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')"
      >
        <Sun v-if="store.theme === 'dark'" :size="16" class="theme-icon sun-icon" />
        <Moon v-else :size="16" class="theme-icon moon-icon" />
        <span v-if="!isCollapsed" class="theme-label">{{ store.theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode') }}</span>
      </button>

      <button 
        v-if="store.isAuthenticated" 
        class="btn-logout" 
        :title="t('nav.signOut')"
        @click="store.logout()"
      >
        <LogOut :size="18" />
        <span v-if="!isCollapsed">{{ t('nav.signOut') }}</span>
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

.owner-branch-switcher {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 2px;
}

.branch-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #10b981;
}

.branch-count-tag {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  padding: 0 4px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
}

.branch-select {
  border-color: rgba(16, 185, 129, 0.35);
}

.branch-select:focus {
  border-color: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.25);
}

.staff-branch-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.22);
}

.staff-branch-icon {
  color: #10b981;
  flex-shrink: 0;
}

.staff-branch-info {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  white-space: nowrap;
}

.staff-branch-name {
  font-size: 11px;
  font-weight: 700;
  color: #f1f5f9;
  text-overflow: ellipsis;
  overflow: hidden;
}

.staff-branch-code {
  font-size: 9px;
  font-weight: 700;
  font-family: monospace;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.branch-nav-btn .text-emerald {
  color: #10b981;
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

.section-header-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  padding: 6px 10px 4px;
  cursor: pointer;
  color: inherit;
}

.section-header-btn:hover .section-title {
  color: var(--text-primary, #f9fafb);
}

.group-chevron {
  color: var(--text-muted, #6b7280);
  transition: transform 0.2s ease;
}

.group-chevron.rotated {
  transform: rotate(-90deg);
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

/* Custom Business Unit Switcher Dropdown */
.custom-dropdown {
  --dd-bg: #111827;
  --dd-surface: #182132;
  --dd-hover: #1f293b;
  --dd-border: rgba(255, 255, 255, 0.12);
  --dd-text: #f8fafc;
  --dd-muted: #94a3b8;
  --dd-accent: #6366f1;
  --dd-accent-soft: rgba(99, 102, 241, 0.16);
  --dd-shadow: 0 14px 36px rgba(0, 0, 0, 0.45);

  position: relative;
  width: 100%;
}

.custom-dropdown[data-theme="light"] {
  --dd-bg: #ffffff;
  --dd-surface: #ffffff;
  --dd-hover: #f1f5f9;
  --dd-border: #cbd5e1;
  --dd-text: #0f172a;
  --dd-muted: #64748b;
  --dd-accent: #4f46e5;
  --dd-accent-soft: #eef2ff;
  --dd-shadow: 0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.05);
}

.dropdown-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--dd-bg);
  border: 1px solid var(--dd-border);
  color: var(--dd-text);
  transition: all 0.16s ease;
}

.dropdown-trigger:hover,
.custom-dropdown.open .dropdown-trigger {
  border-color: var(--dd-accent);
  box-shadow: 0 0 0 3px var(--dd-accent-soft);
}

.trigger-icon-tile {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--dd-accent-soft);
  color: var(--dd-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.trigger-text {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.trigger-text strong {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--dd-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trigger-chevron {
  color: var(--dd-muted);
  transition: transform 0.18s ease;
  flex-shrink: 0;
}

.trigger-chevron.rotated {
  transform: rotate(180deg);
  color: var(--dd-accent);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 900;
  background: var(--dd-surface);
  border: 1px solid var(--dd-border);
  border-radius: 14px;
  padding: 6px;
  box-shadow: var(--dd-shadow);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dropdown-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 9px;
  border-radius: 10px;
  background: transparent;
  color: var(--dd-text);
  text-align: left;
  transition: background 0.14s ease;
}

.dropdown-option:hover {
  background: var(--dd-hover);
}

.dropdown-option.active {
  background: var(--dd-accent-soft);
}

.option-icon-tile {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--dd-hover);
  color: var(--dd-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dropdown-option.active .option-icon-tile {
  background: var(--dd-accent);
  color: #ffffff;
}

.option-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.option-copy strong {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--dd-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.option-copy span {
  font-size: 0.7rem;
  color: var(--dd-muted);
}

.option-check {
  color: var(--dd-accent);
  flex-shrink: 0;
}

.dd-pop-enter-active,
.dd-pop-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.dd-pop-enter-from,
.dd-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

/* Language Switcher Pill */
.lang-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
}

.lang-switcher[data-theme="light"] {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.lang-icon {
  color: var(--text-muted, #64748b);
  margin: 0 4px;
  flex-shrink: 0;
}

.lang-btn {
  flex: 1;
  padding: 5px 8px;
  border-radius: 7px;
  font-size: 0.74rem;
  font-weight: 700;
  background: transparent;
  color: var(--text-secondary, #64748b);
  transition: all 0.16s ease;
}

.lang-btn.active {
  background: #4f46e5;
  color: #ffffff;
}

@media (max-width: 900px) {
  .sidebar-nav {
    width: 68px;
  }
  .brand-text,
  .user-info,
  .unit-context-box,
  .nav-group-title,
  .nav-label,
  .theme-label,
  .btn-logout span,
  .btn-login span,
  .btn-account-settings span {
    display: none !important;
  }
  .user-card {
    margin: 10px 8px 6px 8px;
    padding: 8px;
    justify-content: center;
  }
  .btn-toggle {
    display: none;
  }
  .nav-item, .btn-account-settings, .btn-theme-toggle, .btn-logout, .btn-login {
    justify-content: center;
    padding: 10px;
  }
}
</style>

