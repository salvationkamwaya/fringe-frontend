<script setup>
import { onMounted } from 'vue'
import { store } from './store'
import api from './api'

import HeaderNav from './components/HeaderNav.vue'
import BarPos from './components/BarPos.vue'
import StationeryPos from './components/StationeryPos.vue'
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

const checkAuth = async () => {
  if (!store.token) {
    store.activeModal = 'login'
    return
  }

  try {
    const response = await api.get('/auth/me/')
    store.user = response.data.user
    localStorage.setItem('fringe_user', JSON.stringify(response.data.user))
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
  checkAuth()
})
</script>

<template>
  <div class="app-layout">
    <!-- Top Navigation Header -->
    <HeaderNav />

    <!-- Main Workspace -->
    <main class="main-workspace">
      <!-- Stationery POS View -->
      <StationeryPos v-if="store.activeUnit === 'stationery'" />

      <!-- Bar & Lounge POS View -->
      <BarPos v-else />
    </main>

    <!-- Modals & Overlays -->
    <LoginModal v-if="store.activeModal === 'login' || !store.isAuthenticated" />
    
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

    <ShiftModal 
      v-if="store.activeModal === 'shift'"
      @close="store.activeModal = null"
    />

    <BarReportsModal 
      v-if="store.activeModal === 'reports'"
      @close="store.activeModal = null"
    />

    <StationeryReportsModal 
      v-if="store.activeModal === 'stationery_reports'"
      @close="store.activeModal = null"
    />

    <CustomersModal 
      v-if="store.activeModal === 'customers'"
      @close="store.activeModal = null"
    />

    <SuppliersModal 
      v-if="store.activeModal === 'suppliers'"
      @close="store.activeModal = null"
    />

    <AuditTrailModal 
      v-if="store.activeModal === 'audit'"
      @close="store.activeModal = null"
    />

    <StaffManagementModal 
      v-if="store.activeModal === 'staff_management'"
      @close="store.activeModal = null"
    />

    <!-- Global Toast Notifications -->
    <transition name="toast-fade">
      <div v-if="store.toast.show" class="toast" :class="`toast-${store.toast.type}`">
        {{ store.toast.message }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #090d16;
}

.main-workspace {
  flex: 1;
  position: relative;
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

/* Global Toast */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  z-index: 2000;
  max-width: 400px;
}

.toast-success {
  background: #065f46;
  border: 1px solid #10b981;
  color: #a7f3d0;
}

.toast-error {
  background: #881337;
  border: 1px solid #f43f5e;
  color: #fecdd3;
}

.toast-warning {
  background: #78350f;
  border: 1px solid #f59e0b;
  color: #fde68a;
}

.toast-info {
  background: #1e293b;
  border: 1px solid #3b82f6;
  color: #bfdbfe;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
