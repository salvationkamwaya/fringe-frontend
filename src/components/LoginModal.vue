<script setup>
import { ref, computed } from 'vue'
import { store } from '../store'
import api from '../api'
import { 
  Lock, User, KeyRound, X, RefreshCw, Eye, EyeOff, AlertCircle, 
  RotateCcw, CheckCircle2, Shield, ArrowLeft, Mail, Check, Key
} from 'lucide-vue-next'

const mode = ref('login') // 'login' | 'forgot'
const forgotMethod = ref('token') // 'token' (Owner Token) | 'code' (Direct Verification Code)

// Login credentials
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Owner Reset Token Form
const ownerTokenForm = ref({
  username: '',
  token: '',
  newPassword: '',
  confirmPassword: ''
})
const showOwnerTokenPassword = ref(false)
const showOwnerTokenConfirmPassword = ref(false)

// Direct Code Form
const directCodeStep = ref(1) // 1 = Request Code, 2 = Verify & Reset
const directCodeForm = ref({
  identifier: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
})
const showDirectCodePassword = ref(false)
const showDirectCodeConfirmPassword = ref(false)
const directCodeResult = ref(null)

// Password validation checks for Owner Token
const ownerPasswordChecks = computed(() => {
  const pwd = ownerTokenForm.value.newPassword || ''
  return {
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    match: pwd.length > 0 && pwd === ownerTokenForm.value.confirmPassword
  }
})

const isOwnerTokenFormValid = computed(() => {
  const c = ownerPasswordChecks.value
  return (
    ownerTokenForm.value.username.trim() &&
    ownerTokenForm.value.token.trim() &&
    c.length &&
    c.uppercase &&
    c.lowercase &&
    c.number &&
    c.special &&
    c.match
  )
})

// Password validation checks for Direct Code
const directPasswordChecks = computed(() => {
  const pwd = directCodeForm.value.newPassword || ''
  return {
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    match: pwd.length > 0 && pwd === directCodeForm.value.confirmPassword
  }
})

const isDirectCodeFormValid = computed(() => {
  const c = directPasswordChecks.value
  return (
    directCodeForm.value.identifier.trim() &&
    directCodeForm.value.code.trim().length === 6 &&
    c.length &&
    c.uppercase &&
    c.lowercase &&
    c.number &&
    c.special &&
    c.match
  )
})

// Login Submission
const handleLogin = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!username.value.trim()) {
    errorMessage.value = 'Please enter your username or email address.'
    return
  }

  if (!password.value) {
    errorMessage.value = 'Please enter your password.'
    return
  }

  loading.value = true
  try {
    await store.login(username.value.trim(), password.value)
  } catch (err) {
    if (err.response) {
      errorMessage.value = err.response.data?.error || 'Invalid username or password.'
    } else if (err.request) {
      errorMessage.value = 'Cannot connect to backend server. Please verify Django is running on http://127.0.0.1:8000.'
    } else {
      errorMessage.value = err.message || 'An unexpected error occurred.'
    }
  } finally {
    loading.value = false
  }
}

// Owner Reset Token Submission
const handleOwnerTokenReset = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!isOwnerTokenFormValid.value) {
    errorMessage.value = 'Please fill out all fields and satisfy all password security criteria.'
    return
  }

  loading.value = true
  try {
    const res = await api.post('/core/auth/reset-password-with-token/', {
      username: ownerTokenForm.value.username.trim(),
      token: ownerTokenForm.value.token.trim(),
      new_password: ownerTokenForm.value.newPassword,
      confirm_password: ownerTokenForm.value.confirmPassword
    })

    const successMsg = res.data.message || 'Password successfully updated!'
    store.showToast(successMsg, 'success')

    // Switch back to login with username prefilled
    username.value = ownerTokenForm.value.username.trim()
    password.value = ''
    mode.value = 'login'
    successMessage.value = 'Password reset complete! Please enter your new password to sign in.'
  } catch (err) {
    errorMessage.value = err.response?.data?.error || 'Failed to reset password. Please verify your token.'
  } finally {
    loading.value = false
  }
}

// Direct Code Step 1: Request Code
const handleRequestDirectCode = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!directCodeForm.value.identifier.trim()) {
    errorMessage.value = 'Please enter your username or email address.'
    return
  }

  loading.value = true
  try {
    const res = await api.post('/core/auth/forgot-password/request/', {
      identifier: directCodeForm.value.identifier.trim()
    })

    directCodeResult.value = res.data
    directCodeStep.value = 2
    successMessage.value = res.data.message || 'Verification code generated!'
    store.showToast('Verification code generated!', 'info')
  } catch (err) {
    errorMessage.value = err.response?.data?.error || 'Account not found. Please check your username/email.'
  } finally {
    loading.value = false
  }
}

// Direct Code Step 2: Confirm Reset
const handleConfirmDirectCode = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!isDirectCodeFormValid.value) {
    errorMessage.value = 'Please satisfy all password security criteria and enter the 6-digit code.'
    return
  }

  loading.value = true
  try {
    const res = await api.post('/core/auth/forgot-password/confirm/', {
      identifier: directCodeForm.value.identifier.trim(),
      code: directCodeForm.value.code.trim(),
      new_password: directCodeForm.value.newPassword,
      confirm_password: directCodeForm.value.confirmPassword
    })

    const successMsg = res.data.message || 'Password successfully updated!'
    store.showToast(successMsg, 'success')

    // Switch back to login
    username.value = directCodeResult.value?.username || directCodeForm.value.identifier.trim()
    password.value = ''
    mode.value = 'login'
    successMessage.value = 'Password reset complete! Please sign in with your new password.'
  } catch (err) {
    errorMessage.value = err.response?.data?.error || 'Verification failed. Code may be invalid or expired.'
  } finally {
    loading.value = false
  }
}

const switchToLogin = () => {
  mode.value = 'login'
  errorMessage.value = ''
  successMessage.value = ''
}

const switchToForgot = () => {
  mode.value = 'forgot'
  errorMessage.value = ''
  successMessage.value = ''
  if (username.value) {
    ownerTokenForm.value.username = username.value
    directCodeForm.value.identifier = username.value
  }
}
</script>

<template>
  <div class="modal-overlay">
    <div class="modal-card">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-icon">
          <KeyRound v-if="mode === 'login'" :size="24" />
          <RotateCcw v-else :size="24" />
        </div>
        <div class="header-text">
          <div class="brand-tag">FRINGE BUSINESS SYSTEM</div>
          <h2 class="modal-title">
            {{ mode === 'login' ? 'Sign In' : 'Account Recovery' }}
          </h2>
        </div>
        <button v-if="store.isAuthenticated" class="btn-close" @click="store.activeModal = null" title="Close">
          <X :size="18" />
        </button>
      </div>

      <!-- VIEW 1: STANDARD SIGN IN -->
      <div v-if="mode === 'login'">
        <!-- Success Banner -->
        <div v-if="successMessage" class="success-banner">
          <CheckCircle2 :size="16" class="success-icon" />
          <span>{{ successMessage }}</span>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <!-- Username / Email Input -->
          <div class="form-group">
            <label>Username or Email Address</label>
            <div class="input-group">
              <User :size="18" class="input-icon" />
              <input 
                v-model="username" 
                type="text" 
                placeholder="e.g. owner or username" 
                autocomplete="username"
                required
              />
            </div>
          </div>

          <!-- Password Input with Toggle Eye -->
          <div class="form-group">
            <div class="label-row">
              <label>Password</label>
              <button 
                type="button" 
                class="btn-forgot-link" 
                @click="switchToForgot"
                tabindex="-1"
              >
                Forgot Password?
              </button>
            </div>
            <div class="input-group">
              <Lock :size="18" class="input-icon" />
              <input 
                v-model="password" 
                :type="showPassword ? 'text' : 'password'" 
                placeholder="Enter your password..." 
                autocomplete="current-password"
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
          </div>

          <!-- Error Feedback Banner -->
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

      <!-- VIEW 2: FORGOT PASSWORD / ACCOUNT RECOVERY -->
      <div v-else class="forgot-wrapper">
        <!-- Back to Login Navigation -->
        <button class="btn-back-link" @click="switchToLogin">
          <ArrowLeft :size="14" />
          <span>Back to Sign In</span>
        </button>

        <!-- Method Switcher Tabs -->
        <div class="recovery-tabs">
          <button 
            type="button" 
            class="recovery-tab" 
            :class="{ active: forgotMethod === 'token' }"
            @click="forgotMethod = 'token'; errorMessage = ''; successMessage = ''"
          >
            <Key :size="14" />
            <span>Owner Reset Token</span>
          </button>
          <button 
            type="button" 
            class="recovery-tab" 
            :class="{ active: forgotMethod === 'code' }"
            @click="forgotMethod = 'code'; errorMessage = ''; successMessage = ''"
          >
            <Mail :size="14" />
            <span>Direct Code</span>
          </button>
        </div>

        <!-- Success Banner -->
        <div v-if="successMessage" class="success-banner">
          <CheckCircle2 :size="16" class="success-icon" />
          <span>{{ successMessage }}</span>
        </div>

        <!-- Error Banner -->
        <div v-if="errorMessage" class="error-banner">
          <AlertCircle :size="16" class="error-icon" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- METHOD A: OWNER RESET TOKEN -->
        <div v-if="forgotMethod === 'token'" class="recovery-pane">
          <div class="recovery-intro">
            <p>
              If you forgot your password, contact your <strong>Business Owner</strong>. The Owner will generate a temporary <strong>Reset Token</strong> for you in Staff Management.
            </p>
          </div>

          <form @submit.prevent="handleOwnerTokenReset" class="login-form">
            <div class="form-group">
              <label>Your Username</label>
              <div class="input-group">
                <User :size="18" class="input-icon" />
                <input 
                  v-model="ownerTokenForm.username" 
                  type="text" 
                  placeholder="e.g. bartender_alex" 
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label>Owner Reset Token</label>
              <div class="input-group">
                <Key :size="18" class="input-icon" />
                <input 
                  v-model="ownerTokenForm.token" 
                  type="text" 
                  placeholder="e.g. RST-A9B2C4" 
                  class="token-input"
                  required
                />
              </div>
              <span class="field-hint">Format: RST-XXXXXX (given by the Owner, valid 24h)</span>
            </div>

            <div class="form-group">
              <label>New Password</label>
              <div class="input-group">
                <Lock :size="18" class="input-icon" />
                <input 
                  v-model="ownerTokenForm.newPassword" 
                  :type="showOwnerTokenPassword ? 'text' : 'password'" 
                  placeholder="Enter new strong password..." 
                  required
                />
                <button 
                  type="button" 
                  class="btn-eye" 
                  @click="showOwnerTokenPassword = !showOwnerTokenPassword" 
                  tabindex="-1"
                >
                  <EyeOff v-if="showOwnerTokenPassword" :size="18" />
                  <Eye v-else :size="18" />
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Confirm New Password</label>
              <div class="input-group">
                <Lock :size="18" class="input-icon" />
                <input 
                  v-model="ownerTokenForm.confirmPassword" 
                  :type="showOwnerTokenConfirmPassword ? 'text' : 'password'" 
                  placeholder="Re-enter new password..." 
                  required
                />
                <button 
                  type="button" 
                  class="btn-eye" 
                  @click="showOwnerTokenConfirmPassword = !showOwnerTokenConfirmPassword" 
                  tabindex="-1"
                >
                  <EyeOff v-if="showOwnerTokenConfirmPassword" :size="18" />
                  <Eye v-else :size="18" />
                </button>
              </div>
            </div>

            <!-- Password Checklist -->
            <div class="password-checklist">
              <div class="checklist-title">Password Standards</div>
              <div class="checklist-grid">
                <div class="checklist-item" :class="ownerPasswordChecks.length ? 'met' : 'missing'">
                  <Check v-if="ownerPasswordChecks.length" :size="12" class="icon-met" />
                  <span v-else class="bullet-missing">&bull;</span>
                  <span>At least 8 characters</span>
                </div>
                <div class="checklist-item" :class="ownerPasswordChecks.uppercase ? 'met' : 'missing'">
                  <Check v-if="ownerPasswordChecks.uppercase" :size="12" class="icon-met" />
                  <span v-else class="bullet-missing">&bull;</span>
                  <span>1 uppercase letter (A-Z)</span>
                </div>
                <div class="checklist-item" :class="ownerPasswordChecks.lowercase ? 'met' : 'missing'">
                  <Check v-if="ownerPasswordChecks.lowercase" :size="12" class="icon-met" />
                  <span v-else class="bullet-missing">&bull;</span>
                  <span>1 lowercase letter (a-z)</span>
                </div>
                <div class="checklist-item" :class="ownerPasswordChecks.number ? 'met' : 'missing'">
                  <Check v-if="ownerPasswordChecks.number" :size="12" class="icon-met" />
                  <span v-else class="bullet-missing">&bull;</span>
                  <span>1 numeric digit (0-9)</span>
                </div>
                <div class="checklist-item" :class="ownerPasswordChecks.special ? 'met' : 'missing'">
                  <Check v-if="ownerPasswordChecks.special" :size="12" class="icon-met" />
                  <span v-else class="bullet-missing">&bull;</span>
                  <span>1 special symbol (!@#$%^&*)</span>
                </div>
                <div class="checklist-item" :class="ownerPasswordChecks.match ? 'met' : 'missing'">
                  <Check v-if="ownerPasswordChecks.match" :size="12" class="icon-met" />
                  <span v-else class="bullet-missing">&bull;</span>
                  <span>Passwords match</span>
                </div>
              </div>
            </div>

            <button type="submit" class="btn-submit" :disabled="!isOwnerTokenFormValid || loading">
              <RefreshCw v-if="loading" :size="16" class="spin-anim" />
              <span>{{ loading ? 'Verifying Token...' : 'Reset Password & Sign In' }}</span>
            </button>
          </form>
        </div>

        <!-- METHOD B: DIRECT VERIFICATION CODE -->
        <div v-else class="recovery-pane">
          <!-- Step 1: Request Code -->
          <div v-if="directCodeStep === 1">
            <div class="recovery-intro">
              <p>
                Enter your username or registered email address to receive a 6-digit verification code.
              </p>
            </div>

            <form @submit.prevent="handleRequestDirectCode" class="login-form">
              <div class="form-group">
                <label>Username or Email Address</label>
                <div class="input-group">
                  <User :size="18" class="input-icon" />
                  <input 
                    v-model="directCodeForm.identifier" 
                    type="text" 
                    placeholder="Enter username or email..." 
                    required
                  />
                </div>
              </div>

              <button type="submit" class="btn-submit" :disabled="loading">
                <RefreshCw v-if="loading" :size="16" class="spin-anim" />
                <span>{{ loading ? 'Generating Code...' : 'Send Verification Code' }}</span>
              </button>
            </form>
          </div>

          <!-- Step 2: Confirm Code & Reset Password -->
          <div v-else>
            <!-- Simulated Code Info Card -->
            <div v-if="directCodeResult?.code" class="direct-code-display-card">
              <div class="code-header">
                <span class="code-sub">VERIFICATION CODE FOR @{{ directCodeResult.username }}:</span>
              </div>
              <div class="code-value">{{ directCodeResult.code }}</div>
              <span class="code-hint">Enter this 6-digit code below to set your new password.</span>
            </div>

            <form @submit.prevent="handleConfirmDirectCode" class="login-form">
              <div class="form-group">
                <label>6-Digit Verification Code</label>
                <div class="input-group">
                  <Key :size="18" class="input-icon" />
                  <input 
                    v-model="directCodeForm.code" 
                    type="text" 
                    maxlength="6"
                    placeholder="e.g. 123456" 
                    class="token-input text-center"
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <label>New Password</label>
                <div class="input-group">
                  <Lock :size="18" class="input-icon" />
                  <input 
                    v-model="directCodeForm.newPassword" 
                    :type="showDirectCodePassword ? 'text' : 'password'" 
                    placeholder="Enter new strong password..." 
                    required
                  />
                  <button 
                    type="button" 
                    class="btn-eye" 
                    @click="showDirectCodePassword = !showDirectCodePassword" 
                    tabindex="-1"
                  >
                    <EyeOff v-if="showDirectCodePassword" :size="18" />
                    <Eye v-else :size="18" />
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label>Confirm New Password</label>
                <div class="input-group">
                  <Lock :size="18" class="input-icon" />
                  <input 
                    v-model="directCodeForm.confirmPassword" 
                    :type="showDirectCodeConfirmPassword ? 'text' : 'password'" 
                    placeholder="Re-enter new password..." 
                    required
                  />
                  <button 
                    type="button" 
                    class="btn-eye" 
                    @click="showDirectCodeConfirmPassword = !showDirectCodeConfirmPassword" 
                    tabindex="-1"
                  >
                    <EyeOff v-if="showDirectCodeConfirmPassword" :size="18" />
                    <Eye v-else :size="18" />
                  </button>
                </div>
              </div>

              <!-- Password Checklist -->
              <div class="password-checklist">
                <div class="checklist-title">Password Standards</div>
                <div class="checklist-grid">
                  <div class="checklist-item" :class="directPasswordChecks.length ? 'met' : 'missing'">
                    <Check v-if="directPasswordChecks.length" :size="12" class="icon-met" />
                    <span v-else class="bullet-missing">&bull;</span>
                    <span>At least 8 characters</span>
                  </div>
                  <div class="checklist-item" :class="directPasswordChecks.uppercase ? 'met' : 'missing'">
                    <Check v-if="directPasswordChecks.uppercase" :size="12" class="icon-met" />
                    <span v-else class="bullet-missing">&bull;</span>
                    <span>1 uppercase letter (A-Z)</span>
                  </div>
                  <div class="checklist-item" :class="directPasswordChecks.lowercase ? 'met' : 'missing'">
                    <Check v-if="directPasswordChecks.lowercase" :size="12" class="icon-met" />
                    <span v-else class="bullet-missing">&bull;</span>
                    <span>1 lowercase letter (a-z)</span>
                  </div>
                  <div class="checklist-item" :class="directPasswordChecks.number ? 'met' : 'missing'">
                    <Check v-if="directPasswordChecks.number" :size="12" class="icon-met" />
                    <span v-else class="bullet-missing">&bull;</span>
                    <span>1 numeric digit (0-9)</span>
                  </div>
                  <div class="checklist-item" :class="directPasswordChecks.special ? 'met' : 'missing'">
                    <Check v-if="directPasswordChecks.special" :size="12" class="icon-met" />
                    <span v-else class="bullet-missing">&bull;</span>
                    <span>1 special symbol (!@#$%^&*)</span>
                  </div>
                  <div class="checklist-item" :class="directPasswordChecks.match ? 'met' : 'missing'">
                    <Check v-if="directPasswordChecks.match" :size="12" class="icon-met" />
                    <span v-else class="bullet-missing">&bull;</span>
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              <button type="submit" class="btn-submit" :disabled="!isDirectCodeFormValid || loading">
                <RefreshCw v-if="loading" :size="16" class="spin-anim" />
                <span>{{ loading ? 'Resetting Password...' : 'Verify Code & Set Password' }}</span>
              </button>

              <button type="button" class="btn-secondary-link" @click="directCodeStep = 1">
                Request another verification code
              </button>
            </form>
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
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 460px;
  max-height: 92vh;
  overflow-y: auto;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  padding: 28px 24px;
  position: relative;
  animation: modal-enter 0.2s ease-out;
}

@keyframes modal-enter {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  margin-bottom: 20px;
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
  font-size: 20px;
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
  gap: 16px;
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

.btn-forgot-link {
  background: transparent;
  color: #fbbf24;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.btn-forgot-link:hover {
  color: #f59e0b;
  text-decoration: underline;
}

.btn-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  margin-bottom: 14px;
  padding: 4px 0;
  transition: color 0.15s;
}

.btn-back-link:hover {
  color: #f1f5f9;
}

.btn-secondary-link {
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
  border: none;
  cursor: pointer;
  padding: 6px;
  margin-top: 4px;
  transition: color 0.15s;
}

.btn-secondary-link:hover {
  color: #f1f5f9;
  text-decoration: underline;
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
  padding: 11px 40px 11px 42px;
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

.token-input {
  letter-spacing: 1.5px;
  font-family: monospace;
  font-weight: 700;
  text-transform: uppercase;
}

.field-hint {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
  display: block;
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

/* Recovery Tabs */
.recovery-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 16px;
}

.recovery-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.recovery-tab:hover {
  color: #ffffff;
}

.recovery-tab.active {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.recovery-intro {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
}

.recovery-intro strong {
  color: #f1f5f9;
}

/* Direct Code Display Card */
.direct-code-display-card {
  background: rgba(16, 185, 129, 0.1);
  border: 1px dashed rgba(16, 185, 129, 0.4);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
  margin-bottom: 16px;
}

.code-header {
  margin-bottom: 4px;
}

.code-sub {
  font-size: 10px;
  font-weight: 700;
  color: #34d399;
  letter-spacing: 0.05em;
}

.code-value {
  font-size: 24px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 4px;
  font-family: monospace;
  margin: 4px 0;
}

.code-hint {
  font-size: 11px;
  color: #a7f3d0;
}

/* Password Checklist */
.password-checklist {
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
  font-size: 11px;
  color: #64748b;
  transition: all 0.2s ease;
}

.checklist-item.met {
  color: #34d399;
  font-weight: 600;
}

.checklist-item.missing {
  color: #64748b;
}

.icon-met {
  color: #34d399;
  flex-shrink: 0;
}

.bullet-missing {
  font-size: 14px;
  line-height: 1;
  color: #64748b;
  flex-shrink: 0;
}

/* Feedback Banners */
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

.success-banner {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #6ee7b7;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.45;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 14px;
}

.success-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.btn-submit {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  padding: 12px;
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

.text-center {
  text-align: center;
}
</style>