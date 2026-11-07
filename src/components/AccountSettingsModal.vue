<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  User, Lock, Key, Shield, Sun, Moon, Check, X, Eye, EyeOff, 
  RefreshCw, CheckCircle2, AlertCircle, Sparkles, Building,
  LogOut, ShieldAlert, Award, Clock
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

const activeTab = ref('profile') // 'profile', 'security', 'pin', 'preferences'
const loadingProfile = ref(false)
const savingProfile = ref(false)
const changingPassword = ref(false)
const changingPin = ref(false)

// Profile Form
const profileForm = ref({
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  role: '',
  role_display: '',
  business_unit: '',
  business_unit_name: ''
})

// Password Form
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// PIN Form
const pinForm = ref({
  currentPassword: '',
  pin: '',
  confirmPin: ''
})
const showPinPassword = ref(false)

// Password validation checks
const passwordChecks = computed(() => {
  const pwd = passwordForm.value.newPassword || ''
  return {
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    match: pwd.length > 0 && pwd === passwordForm.value.confirmPassword,
    different: pwd.length > 0 && pwd !== passwordForm.value.currentPassword
  }
})

const isPasswordFormValid = computed(() => {
  const c = passwordChecks.value
  return (
    passwordForm.value.currentPassword &&
    c.length &&
    c.uppercase &&
    c.lowercase &&
    c.number &&
    c.special &&
    c.match &&
    c.different
  )
})

const isPinFormValid = computed(() => {
  return (
    pinForm.value.currentPassword &&
    /^\d{4,6}$/.test(pinForm.value.pin) &&
    pinForm.value.pin === pinForm.value.confirmPin
  )
})

const roleBadgeClass = computed(() => {
  const role = store.user?.role
  switch (role) {
    case 'owner': return 'role-badge-owner'
    case 'bar_manager': return 'role-badge-bar-mgr'
    case 'bartender': return 'role-badge-bartender'
    case 'stationery_manager': return 'role-badge-stat-mgr'
    case 'stationery_cashier': return 'role-badge-cashier'
    case 'stock_clerk': return 'role-badge-clerk'
    default: return 'role-badge-default'
  }
})

const rolePrivilegesDescription = computed(() => {
  const role = store.user?.role
  switch (role) {
    case 'owner':
      return 'Enterprise Sovereign Authority. Full governance over staff recruitment, role assignment, cash drawers, financial audit trail, and cross-unit analytics.'
    case 'bar_manager':
      return 'Bar & Lounge Leadership. Authorizes stock adjustments, physical inventory counts, drink registrations, shift variances, and lounge performance reports.'
    case 'bartender':
      return 'Bar Frontline Sales. Registers drink orders, operates customer open tabs, manages shift cash float, and collects cash/mobile/card settlements.'
    case 'stationery_manager':
      return 'Stationery Shop Leadership. Oversees retail catalog, supplier purchase orders, credit customer management, and retail profit & loss reports.'
    case 'stationery_cashier':
      return 'Stationery Frontline Sales. Operates retail point-of-sale, records pack & split sales, logs customer debts, and conducts shift drawer reconciliations.'
    case 'stock_clerk':
      return 'Inventory & Stock Logistics. Performs physical stock audits, receives supplier shipments, and records stock count verifications across warehouses.'
    default:
      return 'Standard system authenticated operator.'
  }
})

// Load Profile
const loadProfile = async () => {
  loadingProfile.value = true
  try {
    const res = await api.get('/core/auth/profile/')
    const data = res.data
    profileForm.value = {
      username: data.username || store.user?.username || '',
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      email: data.email || '',
      role: data.role || store.user?.role || '',
      role_display: data.role_display || store.user?.role || '',
      business_unit: data.business_unit || store.user?.business_unit || '',
      business_unit_name: data.business_unit_name || (data.business_unit === 'bar' ? 'Bar & Lounge' : data.business_unit === 'stationery' ? 'Stationery & Retail' : 'Global Enterprise')
    }
  } catch (err) {
    // Fallback to store
    if (store.user) {
      profileForm.value = {
        username: store.user.username,
        first_name: store.user.first_name || '',
        last_name: store.user.last_name || '',
        email: store.user.email || '',
        role: store.user.role || '',
        role_display: store.user.role || '',
        business_unit: store.user.business_unit || '',
        business_unit_name: store.user.business_unit === 'bar' ? 'Bar & Lounge' : store.user.business_unit === 'stationery' ? 'Stationery & Retail' : 'Global Enterprise'
      }
    }
  } finally {
    loadingProfile.value = false
  }
}

// Save Profile
const handleSaveProfile = async () => {
  savingProfile.value = true
  try {
    const res = await api.patch('/core/auth/profile/', {
      first_name: profileForm.value.first_name,
      last_name: profileForm.value.last_name,
      email: profileForm.value.email
    })
    
    // Update store
    if (res.data?.user) {
      store.user = { ...store.user, ...res.data.user }
      localStorage.setItem('fringe_user', JSON.stringify(store.user))
    }
    store.showToast('Profile information successfully saved!', 'success')
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to update profile.', 'error')
  } finally {
    savingProfile.value = false
  }
}

// Change Password
const handleChangePassword = async () => {
  if (!isPasswordFormValid.value) {
    store.showToast('Please satisfy all password security requirements.', 'warning')
    return
  }

  changingPassword.value = true
  try {
    const res = await api.post('/core/auth/change-password/', {
      current_password: passwordForm.value.currentPassword,
      new_password: passwordForm.value.newPassword,
      confirm_password: passwordForm.value.confirmPassword
    })

    if (res.data?.token) {
      store.token = res.data.token
      localStorage.setItem('fringe_token', res.data.token)
    }

    store.showToast(res.data.message || 'Password successfully updated!', 'success')
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to change password.', 'error')
  } finally {
    changingPassword.value = false
  }
}

// Change Manager PIN
const handleChangePin = async () => {
  if (!isPinFormValid.value) {
    store.showToast('PIN must be 4 to 6 numeric digits matching confirmation.', 'warning')
    return
  }

  changingPin.value = true
  try {
    const res = await api.post('/core/auth/change-pin/', {
      current_password: pinForm.value.currentPassword,
      pin: pinForm.value.pin,
      confirm_pin: pinForm.value.confirmPin
    })

    store.showToast(res.data.message || 'Authorization PIN updated successfully!', 'success')
    pinForm.value = {
      currentPassword: '',
      pin: '',
      confirmPin: ''
    }
  } catch (err) {
    store.showToast(err.response?.data?.error || 'Failed to update PIN.', 'error')
  } finally {
    changingPin.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-left">
          <div class="header-icon-box">
            <User :size="22" class="header-icon" />
          </div>
          <div>
            <div class="header-title-row">
              <h3 class="title">Account Settings & Profile</h3>
              <span class="user-pill-tag">@{{ store.user?.username }}</span>
            </div>
            <p class="subtitle">
              Manage personal credentials, review authority privileges, and maintain security.
            </p>
          </div>
        </div>
        <button class="btn-close" @click="emit('close')" title="Close Window">
          <X :size="20" />
        </button>
      </div>

      <!-- Identity Banner -->
      <div class="identity-banner">
        <div class="identity-avatar" :class="roleBadgeClass">
          <span>{{ (store.user?.first_name?.[0] || store.user?.username?.[0] || 'U').toUpperCase() }}</span>
        </div>
        <div class="identity-info">
          <div class="identity-top">
            <h4 class="identity-name">
              {{ store.user?.first_name ? `${store.user.first_name} ${store.user.last_name || ''}` : store.user?.username }}
            </h4>
            <span class="role-badge" :class="roleBadgeClass">
              {{ profileForm.role_display || store.user?.role }}
            </span>
            <span class="unit-tag">
              <Building :size="12" />
              <span>{{ profileForm.business_unit_name }}</span>
            </span>
          </div>
          <div class="identity-sub">
            <span>Username: <strong>@{{ store.user?.username }}</strong></span>
            <span class="dot">&bull;</span>
            <span>Currency: <strong>TSH</strong></span>
            <span class="dot">&bull;</span>
            <span class="status-online">● Active Session</span>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-nav">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'profile' }"
          @click="activeTab = 'profile'"
        >
          <User :size="16" />
          <span>Profile & Role</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'security' }"
          @click="activeTab = 'security'"
        >
          <Lock :size="16" />
          <span>Password & Security</span>
        </button>

        <button 
          v-if="store.isManagement"
          class="tab-btn" 
          :class="{ active: activeTab === 'pin' }"
          @click="activeTab = 'pin'"
        >
          <Key :size="16" />
          <span>Approval PIN</span>
        </button>

        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'preferences' }"
          @click="activeTab = 'preferences'"
        >
          <Sun :size="16" />
          <span>Appearance & Preferences</span>
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="modal-body">
        <!-- TAB 1: Profile & Role Details -->
        <div v-if="activeTab === 'profile'" class="tab-pane">
          <div class="pane-grid">
            <div class="pane-col">
              <h5 class="section-title">Personal Credentials</h5>
              
              <div class="form-group">
                <label>System Username (Login ID)</label>
                <input 
                  type="text" 
                  :value="profileForm.username" 
                  disabled 
                  class="input-disabled"
                  title="Username cannot be altered once assigned."
                />
                <span class="field-hint">Unique permanent identifier assigned upon staff registration.</span>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>First Name</label>
                  <input 
                    v-model="profileForm.first_name" 
                    type="text" 
                    placeholder="Enter first name"
                  />
                </div>
                <div class="form-group">
                  <label>Last Name</label>
                  <input 
                    v-model="profileForm.last_name" 
                    type="text" 
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div class="form-group">
                <label>Email Address</label>
                <input 
                  v-model="profileForm.email" 
                  type="email" 
                  placeholder="e.g. employee@fringe.co.tz"
                />
                <span class="field-hint">Used for system notifications and direct password recovery.</span>
              </div>

              <button 
                class="btn-primary" 
                :disabled="savingProfile" 
                @click="handleSaveProfile"
              >
                <RefreshCw v-if="savingProfile" :size="16" class="spin-anim" />
                <Check v-else :size="16" />
                <span>{{ savingProfile ? 'Saving Changes...' : 'Save Profile Details' }}</span>
              </button>
            </div>

            <!-- Role & Privilege Authority Overview -->
            <div class="pane-col privilege-col">
              <h5 class="section-title">Role Authority & Privileges</h5>

              <div class="privilege-card">
                <div class="privilege-header">
                  <Award :size="20" class="text-amber" />
                  <div>
                    <h6 class="privilege-role">{{ profileForm.role_display }}</h6>
                    <span class="privilege-unit">Segment: {{ profileForm.business_unit_name }}</span>
                  </div>
                </div>
                <p class="privilege-desc">
                  {{ rolePrivilegesDescription }}
                </p>
                <div class="privilege-security-notice">
                  <ShieldAlert :size="16" class="notice-icon" />
                  <span>
                    Role reassignments, security scopes, and business segment transfers are strictly administered by the <strong>Business Owner</strong>.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: Password & Security -->
        <div v-if="activeTab === 'security'" class="tab-pane">
          <div class="pane-grid">
            <div class="pane-col">
              <div class="security-intro-banner">
                <Lock :size="20" class="security-icon" />
                <div>
                  <h6 class="security-title">Password Security Policy</h6>
                  <p class="security-text">
                    For system integrity and theft deterrence at the POS registers, users should change their passwords periodically. Ensure your password satisfies all security criteria below.
                  </p>
                </div>
              </div>

              <!-- Current Password -->
              <div class="form-group">
                <label>Current Password</label>
                <div class="input-password-box">
                  <input 
                    v-model="passwordForm.currentPassword" 
                    :type="showCurrentPassword ? 'text' : 'password'"
                    placeholder="Enter current password to verify identity..."
                    autocomplete="current-password"
                  />
                  <button 
                    type="button" 
                    class="btn-eye" 
                    @click="showCurrentPassword = !showCurrentPassword"
                    tabindex="-1"
                  >
                    <EyeOff v-if="showCurrentPassword" :size="16" />
                    <Eye v-else :size="16" />
                  </button>
                </div>
              </div>

              <!-- New Password -->
              <div class="form-group">
                <label>New Password</label>
                <div class="input-password-box">
                  <input 
                    v-model="passwordForm.newPassword" 
                    :type="showNewPassword ? 'text' : 'password'"
                    placeholder="Enter new strong password..."
                    autocomplete="new-password"
                  />
                  <button 
                    type="button" 
                    class="btn-eye" 
                    @click="showNewPassword = !showNewPassword"
                    tabindex="-1"
                  >
                    <EyeOff v-if="showNewPassword" :size="16" />
                    <Eye v-else :size="16" />
                  </button>
                </div>
              </div>

              <!-- Confirm New Password -->
              <div class="form-group">
                <label>Confirm New Password</label>
                <div class="input-password-box">
                  <input 
                    v-model="passwordForm.confirmPassword" 
                    :type="showConfirmPassword ? 'text' : 'password'"
                    placeholder="Re-enter new password..."
                    autocomplete="new-password"
                  />
                  <button 
                    type="button" 
                    class="btn-eye" 
                    @click="showConfirmPassword = !showConfirmPassword"
                    tabindex="-1"
                  >
                    <EyeOff v-if="showConfirmPassword" :size="16" />
                    <Eye v-else :size="16" />
                  </button>
                </div>
              </div>

              <button 
                class="btn-primary" 
                :disabled="!isPasswordFormValid || changingPassword" 
                @click="handleChangePassword"
              >
                <RefreshCw v-if="changingPassword" :size="16" class="spin-anim" />
                <CheckCircle2 v-else :size="16" />
                <span>{{ changingPassword ? 'Updating Password...' : 'Update & Secure Password' }}</span>
              </button>
            </div>

            <!-- Password Requirements Checklist -->
            <div class="pane-col">
              <h5 class="section-title">Security Checklist</h5>
              <div class="checklist-card">
                <div class="check-item" :class="{ 'check-pass': passwordChecks.length }">
                  <CheckCircle2 v-if="passwordChecks.length" :size="16" />
                  <AlertCircle v-else :size="16" />
                  <span>At least 8 characters in length</span>
                </div>
                <div class="check-item" :class="{ 'check-pass': passwordChecks.uppercase }">
                  <CheckCircle2 v-if="passwordChecks.uppercase" :size="16" />
                  <AlertCircle v-else :size="16" />
                  <span>At least 1 uppercase letter (A-Z)</span>
                </div>
                <div class="check-item" :class="{ 'check-pass': passwordChecks.lowercase }">
                  <CheckCircle2 v-if="passwordChecks.lowercase" :size="16" />
                  <AlertCircle v-else :size="16" />
                  <span>At least 1 lowercase letter (a-z)</span>
                </div>
                <div class="check-item" :class="{ 'check-pass': passwordChecks.number }">
                  <CheckCircle2 v-if="passwordChecks.number" :size="16" />
                  <AlertCircle v-else :size="16" />
                  <span>At least 1 numeric digit (0-9)</span>
                </div>
                <div class="check-item" :class="{ 'check-pass': passwordChecks.special }">
                  <CheckCircle2 v-if="passwordChecks.special" :size="16" />
                  <AlertCircle v-else :size="16" />
                  <span>At least 1 special symbol (!@#$%^&*)</span>
                </div>
                <div class="check-item" :class="{ 'check-pass': passwordChecks.different }">
                  <CheckCircle2 v-if="passwordChecks.different" :size="16" />
                  <AlertCircle v-else :size="16" />
                  <span>Different from your current password</span>
                </div>
                <div class="check-item" :class="{ 'check-pass': passwordChecks.match }">
                  <CheckCircle2 v-if="passwordChecks.match" :size="16" />
                  <AlertCircle v-else :size="16" />
                  <span>New password and confirmation match</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 3: Manager Approval PIN -->
        <div v-if="activeTab === 'pin' && store.isManagement" class="tab-pane">
          <div class="pane-grid">
            <div class="pane-col">
              <div class="pin-intro-box">
                <Key :size="24" class="text-amber" />
                <div>
                  <h6 class="pin-title">Manager Authorization PIN</h6>
                  <p class="pin-text">
                    This numeric PIN is entered during high-privilege operations, including shift variance sign-offs, price overrides, and customer debt adjustments.
                  </p>
                </div>
              </div>

              <!-- Current Account Password -->
              <div class="form-group">
                <label>Verify Current Password</label>
                <div class="input-password-box">
                  <input 
                    v-model="pinForm.currentPassword" 
                    :type="showPinPassword ? 'text' : 'password'"
                    placeholder="Enter account password for verification..."
                  />
                  <button 
                    type="button" 
                    class="btn-eye" 
                    @click="showPinPassword = !showPinPassword"
                    tabindex="-1"
                  >
                    <EyeOff v-if="showPinPassword" :size="16" />
                    <Eye v-else :size="16" />
                  </button>
                </div>
                <span class="field-hint">Required to ensure only the authorized manager modifies their PIN.</span>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>New 4-6 Digit PIN</label>
                  <input 
                    v-model="pinForm.pin" 
                    type="password" 
                    maxlength="6"
                    placeholder="e.g. 1234"
                  />
                </div>
                <div class="form-group">
                  <label>Confirm PIN</label>
                  <input 
                    v-model="pinForm.confirmPin" 
                    type="password" 
                    maxlength="6"
                    placeholder="Re-enter PIN"
                  />
                </div>
              </div>

              <button 
                class="btn-primary" 
                :disabled="!isPinFormValid || changingPin" 
                @click="handleChangePin"
              >
                <RefreshCw v-if="changingPin" :size="16" class="spin-anim" />
                <Check v-else :size="16" />
                <span>{{ changingPin ? 'Updating PIN...' : 'Save Authorization PIN' }}</span>
              </button>
            </div>

            <div class="pane-col">
              <h5 class="section-title">PIN Security Guidelines</h5>
              <div class="privilege-card">
                <ul class="pin-rules-list">
                  <li>Keep your authorization PIN strictly confidential.</li>
                  <li>Do not share your PIN with bartenders, cashiers, or unauthorized staff.</li>
                  <li>All actions approved with your PIN are permanently logged into the immutable audit ledger with your user ID and timestamp.</li>
                  <li>If you suspect your PIN has been compromised, reset it immediately.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 4: Appearance & Preferences -->
        <div v-if="activeTab === 'preferences'" class="tab-pane">
          <div class="pane-grid">
            <div class="pane-col">
              <h5 class="section-title">Appearance & Display Mode</h5>
              <p class="section-desc">
                Toggle the platform's visual appearance between Dark mode (optimized for low-light bar counters) and Light mode (crisp daytime retail environment).
              </p>

              <div class="theme-options-grid">
                <!-- Dark Mode Option -->
                <div 
                  class="theme-card" 
                  :class="{ active: store.theme === 'dark' }"
                  @click="store.theme !== 'dark' && store.toggleTheme()"
                >
                  <div class="theme-card-preview dark-preview">
                    <Moon :size="24" class="theme-icon-lg" />
                  </div>
                  <div class="theme-card-footer">
                    <span class="theme-name">Dark Mode</span>
                    <span v-if="store.theme === 'dark'" class="theme-active-tag">Active</span>
                  </div>
                </div>

                <!-- Light Mode Option -->
                <div 
                  class="theme-card" 
                  :class="{ active: store.theme === 'light' }"
                  @click="store.theme !== 'light' && store.toggleTheme()"
                >
                  <div class="theme-card-preview light-preview">
                    <Sun :size="24" class="theme-icon-lg" />
                  </div>
                  <div class="theme-card-footer">
                    <span class="theme-name">Light Mode</span>
                    <span v-if="store.theme === 'light'" class="theme-active-tag">Active</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="pane-col">
              <h5 class="section-title">Terminal Inactivity Security</h5>
              <div class="privilege-card" style="margin-bottom: 20px;">
                <div class="privilege-header">
                  <Clock :size="18" class="text-amber" />
                  <div>
                    <h6 class="privilege-role">Idle Auto-Logout Lock</h6>
                    <span class="privilege-unit">Protects registers when staff step away</span>
                  </div>
                </div>
                <p class="privilege-desc">
                  When no mouse, touch, or keyboard input is detected, the platform automatically locks and signs out to prevent unauthorized sales.
                </p>

                <div class="form-group" style="margin-bottom: 0;">
                  <label>Lockout Inactivity Duration</label>
                  <select 
                    :value="store.idleTimeoutMinutes" 
                    @change="store.setIdleTimeout($event.target.value)"
                    class="form-select-idle"
                  >
                    <option value="2">⏱️ 2 Minutes (High Security / Fast Counter)</option>
                    <option value="5">⏱️ 5 Minutes (Recommended for Bar & Lounge)</option>
                    <option value="10">⏱️ 10 Minutes (Standard Business Default)</option>
                    <option value="15">⏱️ 15 Minutes (Extended)</option>
                    <option value="30">⏱️ 30 Minutes (Low Traffic Stations)</option>
                    <option value="0">⚠️ Disabled (Not recommended for POS)</option>
                  </select>
                  <span class="field-hint">A 30-second warning countdown will display before locking.</span>
                </div>
              </div>

              <h5 class="section-title">Session Management</h5>
              <div class="privilege-card">
                <h6 class="privilege-role">Sign Out Active Session</h6>
                <p class="privilege-desc">
                  Safely conclude your shift workstation session. All pending cart items will be cleared and your session token will be invalidated.
                </p>
                <button 
                  class="btn-danger-logout" 
                  @click="store.logout(); emit('close')"
                >
                  <LogOut :size="16" />
                  <span>Sign Out of Fringe System</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
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
  z-index: 1050;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 860px;
  max-height: 90vh;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-enter 0.25s ease-out;
}

@keyframes modal-enter {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Header */
.modal-header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.16);
  border: 1px solid rgba(99, 102, 241, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #818cf8;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f9fafb;
}

.user-pill-tag {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #cbd5e1;
  font-family: monospace;
}

.subtitle {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-top: 2px;
}

.btn-close {
  background: transparent;
  color: #94a3b8;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

/* Identity Banner */
.identity-banner {
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  gap: 16px;
}

.identity-avatar {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  font-weight: 800;
}

.role-badge-owner {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(202, 138, 4, 0.15));
  border: 1px solid rgba(234, 179, 8, 0.4);
  color: #facc15;
}

.role-badge-bar-mgr {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.15));
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
}

.role-badge-bartender {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.15));
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fbbf24;
}

.role-badge-stat-mgr {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(2, 132, 199, 0.15));
  border: 1px solid rgba(14, 165, 233, 0.4);
  color: #38bdf8;
}

.role-badge-cashier {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.15));
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
}

.role-badge-clerk {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(109, 40, 217, 0.15));
  border: 1px solid rgba(139, 92, 246, 0.4);
  color: #a78bfa;
}

.role-badge-default {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #e2e8f0;
}

.identity-info {
  flex: 1;
}

.identity-top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.identity-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
}

.role-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.unit-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.06);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #cbd5e1;
}

.identity-sub {
  margin-top: 4px;
  font-size: 0.8rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  color: #475569;
}

.status-online {
  color: #10b981;
  font-weight: 500;
}

/* Tabs Navigation */
.tab-nav {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0 24px;
  background: rgba(0, 0, 0, 0.15);
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: transparent;
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 600;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn:hover {
  color: #ffffff;
}

.tab-btn.active {
  color: #818cf8;
  border-bottom-color: #818cf8;
}

/* Modal Body */
.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.pane-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .pane-grid {
    grid-template-columns: 1fr;
  }
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 14px;
}

.section-desc {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 16px;
  line-height: 1.5;
}

/* Form Controls */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #818cf8;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.input-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0.25) !important;
}

.field-hint {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 4px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.input-password-box {
  position: relative;
  display: flex;
  align-items: center;
}

.input-password-box input {
  width: 100%;
  padding-right: 40px;
}

.btn-eye {
  position: absolute;
  right: 10px;
  background: transparent;
  color: #64748b;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-eye:hover {
  color: #cbd5e1;
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 20px;
  background: #4f46e5;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s;
  width: 100%;
  margin-top: 8px;
}

.btn-primary:hover:not(:disabled) {
  background: #4338ca;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin-anim {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Privilege & Security Cards */
.privilege-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
}

.privilege-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.privilege-role {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f8fafc;
}

.privilege-unit {
  font-size: 0.75rem;
  color: #94a3b8;
}

.privilege-desc {
  font-size: 0.85rem;
  color: #cbd5e1;
  line-height: 1.5;
  margin-bottom: 14px;
}

.privilege-security-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  font-size: 0.75rem;
  color: #fca5a5;
  line-height: 1.4;
}

.notice-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

/* Security Checklist */
.checklist-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  color: #64748b;
  transition: all 0.2s;
}

.check-item.check-pass {
  color: #10b981;
}

.security-intro-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  margin-bottom: 16px;
}

.security-icon {
  color: #818cf8;
  margin-top: 2px;
  flex-shrink: 0;
}

.security-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #c7d2fe;
}

.security-text {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 2px;
  line-height: 1.4;
}

/* PIN Guidelines */
.pin-intro-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 10px;
  margin-bottom: 16px;
}

.pin-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fde68a;
}

.pin-text {
  font-size: 0.75rem;
  color: #cbd5e1;
  margin-top: 2px;
  line-height: 1.4;
}

.pin-rules-list {
  padding-left: 20px;
  font-size: 0.8rem;
  color: #cbd5e1;
  line-height: 1.6;
}

/* Theme Option Cards */
.theme-options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 20px;
}

.theme-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.2s;
}

.theme-card:hover {
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.theme-card.active {
  border-color: #818cf8;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
}

.theme-card-preview {
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark-preview {
  background: #0f172a;
  color: #fbbf24;
}

.light-preview {
  background: #f8fafc;
  color: #f59e0b;
}

.theme-card-footer {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.theme-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #f1f5f9;
}

.theme-active-tag {
  background: #4f46e5;
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.btn-danger-logout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s;
  width: 100%;
}

.btn-danger-logout:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: #ef4444;
  color: #ffffff;
}

/* Light Theme Adjustments */
:root[data-theme="light"] .modal-card {
  background: #ffffff;
  border-color: #e2e8f0;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

:root[data-theme="light"] .title,
:root[data-theme="light"] .identity-name,
:root[data-theme="light"] .section-title,
:root[data-theme="light"] .privilege-role,
:root[data-theme="light"] .theme-name {
  color: #0f172a;
}

:root[data-theme="light"] .form-group label {
  color: #334155;
}

:root[data-theme="light"] .form-group input {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}

:root[data-theme="light"] .input-disabled {
  background: #e2e8f0 !important;
  color: #64748b;
}

:root[data-theme="light"] .privilege-card,
:root[data-theme="light"] .checklist-card {
  background: #f8fafc;
  border-color: #e2e8f0;
}

:root[data-theme="light"] .privilege-desc,
:root[data-theme="light"] .pin-rules-list {
  color: #334155;
}

:root[data-theme="light"] .identity-banner {
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.form-select-idle {
  width: 100%;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: all 0.2s;
}

.form-select-idle:focus {
  border-color: #f59e0b;
  background: rgba(255, 255, 255, 0.08);
}

.form-select-idle option {
  background: #111827;
  color: #ffffff;
}

:root[data-theme="light"] .form-select-idle {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}

:root[data-theme="light"] .form-select-idle option {
  background: #ffffff;
  color: #0f172a;
}
</style>
