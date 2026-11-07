<script setup>
import { computed } from 'vue'
import { store } from '../store'
import { resetIdleActivity } from '../idleTracker'
import { Clock, ShieldAlert, Check, LogOut } from 'lucide-vue-next'

const countdown = computed(() => store.idleCountdownSeconds || 0)
const progressPercentage = computed(() => {
  return Math.min(100, Math.max(0, (countdown.value / 30) * 100))
})

const handleKeepWorking = () => {
  resetIdleActivity()
}

const handleSignOutNow = () => {
  store.logout('manual')
}
</script>

<template>
  <div class="idle-modal-overlay" @click="handleKeepWorking">
    <div class="idle-modal-card" @click.stop>
      <!-- Pulsing Security Badge -->
      <div class="idle-icon-wrapper">
        <div class="idle-icon-box">
          <Clock :size="28" class="clock-icon" />
        </div>
        <div class="pulse-ring"></div>
      </div>

      <div class="idle-content">
        <div class="idle-tag">
          <ShieldAlert :size="14" />
          <span>SECURITY TIMEOUT</span>
        </div>
        <h3 class="idle-title">Workstation Inactivity Warning</h3>
        <p class="idle-desc">
          No cashier or terminal activity has been detected. To protect customer tabs, open cash floats, and business data, your session will automatically lock in:
        </p>

        <!-- Big Countdown Display -->
        <div class="countdown-card">
          <div class="countdown-value">{{ countdown }}</div>
          <div class="countdown-unit">SECONDS REMAINING</div>

          <!-- Animated Progress Bar -->
          <div class="progress-track">
            <div 
              class="progress-bar" 
              :style="{ width: `${progressPercentage}%` }"
              :class="{ 'progress-danger': countdown <= 10 }"
            ></div>
          </div>
        </div>

        <p class="idle-hint">
          Moving your mouse, tapping anywhere, or clicking <strong>"I'm Still Working"</strong> will instantly extend your session.
        </p>

        <!-- Actions -->
        <div class="idle-actions">
          <button class="btn-stay" @click="handleKeepWorking">
            <Check :size="18" />
            <span>I'm Still Working</span>
          </button>

          <button class="btn-signout" @click="handleSignOutNow">
            <LogOut :size="16" />
            <span>Lock & Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.idle-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 15, 29, 0.92);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
  animation: overlay-fade 0.25s ease-out;
}

@keyframes overlay-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.idle-modal-card {
  width: 100%;
  max-width: 480px;
  background: #111827;
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 20px;
  box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 158, 11, 0.15);
  padding: 32px 28px;
  text-align: center;
  position: relative;
  overflow: hidden;
  animation: card-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes card-pop {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.idle-icon-wrapper {
  position: relative;
  width: 72px;
  height: 72px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.idle-icon-box {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.15));
  border: 2px solid rgba(245, 158, 11, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fbbf24;
  position: relative;
  z-index: 2;
}

.pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(245, 158, 11, 0.4);
  animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 0.2; }
  100% { transform: scale(1.5); opacity: 0; }
}

.idle-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fbbf24;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.idle-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 8px;
}

.idle-desc {
  font-size: 0.85rem;
  color: #94a3b8;
  line-height: 1.5;
  margin-bottom: 20px;
}

/* Countdown Card */
.countdown-card {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.countdown-value {
  font-size: 3.5rem;
  font-weight: 900;
  color: #fbbf24;
  line-height: 1;
  font-family: monospace;
  letter-spacing: -1px;
  text-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
}

.countdown-unit {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #94a3b8;
  margin-top: 6px;
  margin-bottom: 14px;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  border-radius: 9999px;
  transition: width 1s linear;
}

.progress-danger {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.idle-hint {
  font-size: 0.78rem;
  color: #64748b;
  margin-bottom: 24px;
  line-height: 1.4;
}

.idle-hint strong {
  color: #cbd5e1;
}

/* Action Buttons */
.idle-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-stay {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 13px 20px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35);
  transition: all 0.2s ease;
}

.btn-stay:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.45);
}

.btn-signout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-signout:hover {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

/* Light Theme Adjustments */
:root[data-theme="light"] .idle-modal-card {
  background: #ffffff;
  border-color: #f59e0b;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
}

:root[data-theme="light"] .idle-title {
  color: #0f172a;
}

:root[data-theme="light"] .idle-desc {
  color: #475569;
}

:root[data-theme="light"] .countdown-card {
  background: #f8fafc;
  border-color: #e2e8f0;
}

:root[data-theme="light"] .countdown-unit {
  color: #64748b;
}

:root[data-theme="light"] .btn-signout {
  border-color: #cbd5e1;
  color: #64748b;
}
</style>
