<script setup>
import { onMounted } from 'vue'
import { store } from './store'
import api from './api'

import SidebarNav from './components/SidebarNav.vue'
import BarPos from './components/BarPos.vue'
import StationeryPos from './components/StationeryPos.vue'
import StationeryDashboard from './components/StationeryDashboard.vue'
import LoginModal from './components/LoginModal.vue'
import AgeVerificationModal from './components/AgeVerificationModal.vue'
import ManagerPinModal from './components/ManagerPinModal.vue'
import PaymentModal from './components/PaymentModal.vue'
import TabsDrawer from './components/TabsDrawer.vue'
import ShiftModal from './components/ShiftModal.vue'
import BarReportsModal from './components/BarReportsModal.vue'
import StationeryReportsModal from './components/StationeryReportsModal.vue'
import CustomersModal from './components/CustomersModal.vue'
import SuppliersModal from './components/SuppliersModal.vue'
import AuditTrailModal from './components/AuditTrailModal.vue'
import StaffManagementModal from './components/StaffManagementModal.vue'
import StockControlModal from './components/StockControlModal.vue'
import CatalogManagementModal from './components/CatalogManagementModal.vue'
import SalesRecordsModal from './components/SalesRecordsModal.vue'
import AccountSettingsModal from './components/AccountSettingsModal.vue'
import ExpensesModal from './components/ExpensesModal.vue'
import QuotationsModal from './components/QuotationsModal.vue'
import StationeryReturnsModal from './components/StationeryReturnsModal.vue'
import WholesaleDocumentsModal from './components/WholesaleDocumentsModal.vue'
import ProductImportModal from './components/ProductImportModal.vue'
import BarcodeLabelsModal from './components/BarcodeLabelsModal.vue'
import BranchManagementModal from './components/BranchManagementModal.vue'
import BusinessSetupModal from './components/BusinessSetupModal.vue'
import IdleTimeoutModal from './components/IdleTimeoutModal.vue'
import { initIdleTracker } from './idleTracker'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next'

const checkAuth = async () => {
  if (!store.token) {
    store.activeModal = 'login'
    return
  }

  try {
    const response = await api.get('/auth/me/')
    store.user = response.data.user
    if (store.user.role !== 'owner' && store.user.business_unit) {
      store.activeUnit = store.user.business_unit
      localStorage.setItem('fringe_active_unit', store.activeUnit)
    }
    localStorage.setItem('fringe_user', JSON.stringify(response.data.user))
    if (response.data.branches) {
      store.branches = response.data.branches
    }
    store.syncBusinessUnits(
      response.data.available_units,
      response.data.requires_business_setup,
      response.data.requires_branch_setup
    )
    if (store.requiresBusinessSetup || store.requiresBranchSetup) {
      store.activeModal = 'business_setup'
      return
    }
    await store.fetchBranches()
    await store.fetchActiveShift()
  } catch (err) {
    store.token = null
    store.user = null
    localStorage.removeItem('fringe_token')
    localStorage.removeItem('fringe_user')
    store.activeModal = 'login'
  }
}

onMounted(() => {
  store.initTheme()
  initIdleTracker()
  checkAuth()
})
</script>

<template>
  <div class="app-layout">
    <!-- Vertical Role Sidebar (Left) -->
    <SidebarNav />

    <!-- Main Workspace (Right) -->
    <main class="main-workspace">
      <!-- Full-Workspace Pages (All Sidebar Navigation Views) -->
      <div
        v-if="[
          'catalog_management',
          'sales_records',
          'customers',
          'quotations',
          'wholesale_docs',
          'stationery_returns',
          'stock_inventory',
          'suppliers',
          'barcode_labels',
          'expenses',
          'reports',
          'stationery_reports',
          'audit',
          'staff_management',
          'branch_management',
          'account_settings',
          'shift'
        ].includes(store.activeModal)"
        class="workspace-page-wrap"
      >
        <CatalogManagementModal
          v-if="store.activeModal === 'catalog_management'"
          @close="store.activeModal = null"
        />
        <SalesRecordsModal
          v-else-if="store.activeModal === 'sales_records'"
          @close="store.activeModal = null"
        />
        <CustomersModal
          v-else-if="store.activeModal === 'customers'"
          @close="store.activeModal = null"
        />
        <QuotationsModal
          v-else-if="store.activeModal === 'quotations'"
          @close="store.activeModal = null"
        />
        <WholesaleDocumentsModal
          v-else-if="store.activeModal === 'wholesale_docs'"
          @close="store.activeModal = null"
        />
        <StationeryReturnsModal
          v-else-if="store.activeModal === 'stationery_returns'"
          @close="store.activeModal = null"
        />
        <StockControlModal
          v-else-if="store.activeModal === 'stock_inventory'"
          @close="store.activeModal = null"
        />
        <SuppliersModal
          v-else-if="store.activeModal === 'suppliers'"
          @close="store.activeModal = null"
        />
        <BarcodeLabelsModal
          v-else-if="store.activeModal === 'barcode_labels'"
          @close="store.activeModal = null"
        />
        <ExpensesModal
          v-else-if="store.activeModal === 'expenses'"
          @close="store.activeModal = null"
        />
        <BarReportsModal
          v-else-if="store.activeModal === 'reports'"
          @close="store.activeModal = null"
        />
        <StationeryReportsModal
          v-else-if="store.activeModal === 'stationery_reports'"
          @close="store.activeModal = null"
        />
        <AuditTrailModal
          v-else-if="store.activeModal === 'audit'"
          @close="store.activeModal = null"
        />
        <StaffManagementModal
          v-else-if="store.activeModal === 'staff_management'"
          @close="store.activeModal = null"
        />
        <BranchManagementModal
          v-else-if="store.activeModal === 'branch_management'"
          @close="store.activeModal = null"
        />
        <AccountSettingsModal
          v-else-if="store.activeModal === 'account_settings'"
          @close="store.activeModal = null"
        />
        <ShiftModal
          v-else-if="store.activeModal === 'shift'"
          @close="store.activeModal = null"
        />
      </div>

      <!-- Stationery POS Counter View -->
      <StationeryPos v-else-if="store.activeUnit === 'stationery' && store.activeModal === 'stationery_pos'" />

      <!-- Stationery Role-Aware Dashboard (Default Landing Page for Stationery) -->
      <StationeryDashboard v-else-if="store.activeUnit === 'stationery'" />

      <!-- Bar & Lounge POS View -->
      <BarPos v-else />
    </main>

    <!-- Modals & Overlays -->
    <LoginModal v-if="store.activeModal === 'login' || !store.isAuthenticated" />
    <BusinessSetupModal v-else-if="store.isAuthenticated && store.isOwner && (store.requiresBusinessSetup || store.requiresBranchSetup)" />
    
    <AgeVerificationModal 
      v-if="store.activeModal === 'age_verification'"
      @verified="store.activeModal = 'payment'"
      @cancelled="store.activeModal = null"
    />

    <ManagerPinModal v-if="store.activeModal === 'manager_pin'" />

    <PaymentModal 
      v-if="store.activeModal === 'payment'"
      @close="store.activeModal = null"
      @order-completed="store.fetchActiveShift()"
    />

    <TabsDrawer 
      v-if="store.activeModal === 'tabs'"
      @close="store.activeModal = null"
    />

    <ProductImportModal 
      v-if="store.activeModal === 'product_import'"
      @close="store.activeModal = null"
    />

    <!-- Inactivity Auto-Logout Warning Overlay -->
    <IdleTimeoutModal v-if="store.isIdleWarningActive" />

    <!-- Global Rich Toast Notifications -->
    <transition name="toast-slide">
      <div v-if="store.toast.show" class="toast-card" :class="`toast-${store.toast.type}`">
        <div class="toast-icon-box">
          <CheckCircle2 v-if="store.toast.type === 'success'" :size="18" />
          <AlertCircle v-else-if="store.toast.type === 'error'" :size="18" />
          <AlertTriangle v-else-if="store.toast.type === 'warning'" :size="18" />
          <Info v-else :size="18" />
        </div>
        <div class="toast-body">
          <div class="toast-title">{{ store.toast.title }}</div>
          <div class="toast-message">{{ store.toast.message }}</div>
        </div>
        <button class="btn-toast-close" @click="store.dismissToast" title="Dismiss notification">
          <X :size="14" />
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.app-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  background: #090d16;
}

.main-workspace {
  flex: 1;
  height: 100vh;
  overflow: hidden;
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.stationery-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 68px);
  padding: 24px;
}

.placeholder-card {
  text-align: center;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 40px;
  max-width: 480px;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.placeholder-card h2 {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 8px;
}

.placeholder-card p {
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 24px;
  line-height: 1.5;
}

.btn-switch-bar {
  padding: 12px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
  font-weight: 800;
  font-size: 14px;
}

/* Global Rich Toast Notifications */
.toast-card {
  position: fixed;
  bottom: 24px;
  right: 24px;
  min-width: 300px;
  max-width: 440px;
  padding: 14px 16px;
  border-radius: 14px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  z-index: 2500;
  animation: toast-slide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 2px;
}

.toast-message {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
}

.btn-toast-close {
  background: transparent;
  border: none;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.btn-toast-close:hover {
  opacity: 1;
}

/* Toast Color Themes */
.toast-success {
  background: rgba(6, 78, 59, 0.95);
  border: 1px solid rgba(16, 185, 129, 0.5);
  color: #ecfdf5;
}
.toast-success .toast-icon-box {
  background: rgba(16, 185, 129, 0.25);
  color: #34d399;
}
.toast-success .toast-title {
  color: #6ee7b7;
}

.toast-error {
  background: rgba(136, 19, 55, 0.95);
  border: 1px solid rgba(244, 63, 94, 0.5);
  color: #fff1f2;
}
.toast-error .toast-icon-box {
  background: rgba(244, 63, 94, 0.25);
  color: #fb7185;
}
.toast-error .toast-title {
  color: #fda4af;
}

.toast-warning {
  background: rgba(120, 53, 15, 0.95);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #fffbeb;
}
.toast-warning .toast-icon-box {
  background: rgba(245, 158, 11, 0.25);
  color: #fbbf24;
}
.toast-warning .toast-title {
  color: #fde68a;
}

.toast-info {
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.5);
  color: #eff6ff;
}
.toast-info .toast-icon-box {
  background: rgba(59, 130, 246, 0.25);
  color: #60a5fa;
}
.toast-info .toast-title {
  color: #93c5fd;
}

/* Light Theme Toast Styles */
:root[data-theme="light"] .toast-success {
  background: #ffffff;
  border: 1px solid #10b981;
  color: #064e3b;
  box-shadow: 0 16px 36px -4px rgba(16, 185, 129, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08);
}
:root[data-theme="light"] .toast-error {
  background: #ffffff;
  border: 1px solid #f43f5e;
  color: #881337;
  box-shadow: 0 16px 36px -4px rgba(244, 63, 94, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08);
}
:root[data-theme="light"] .toast-warning {
  background: #ffffff;
  border: 1px solid #f59e0b;
  color: #78350f;
  box-shadow: 0 16px 36px -4px rgba(245, 158, 11, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08);
}
:root[data-theme="light"] .toast-info {
  background: #ffffff;
  border: 1px solid #3b82f6;
  color: #1e3a8a;
  box-shadow: 0 16px 36px -4px rgba(59, 130, 246, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08);
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.95);
}
</style>
