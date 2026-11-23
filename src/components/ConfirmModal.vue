<script setup>
import { onMounted, onUnmounted } from 'vue'
import { store } from '../store'
import { AlertTriangle, Trash2, X } from 'lucide-vue-next'

const handleKeydown = (e) => {
  if (!store.confirmDialog.show) return
  if (e.key === 'Escape') {
    e.preventDefault()
    store.resolveConfirm(false)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <transition name="confirm-fade">
    <div
      v-if="store.confirmDialog.show"
      class="confirm-overlay"
      :data-theme="store.theme"
      @click.self="store.resolveConfirm(false)"
    >
      <div class="confirm-card" role="alertdialog" aria-modal="true">
        <button
          class="confirm-close-btn"
          type="button"
          @click="store.resolveConfirm(false)"
          :aria-label="store.locale === 'sw' ? 'Funga' : 'Close'"
        >
          <X :size="16" />
        </button>

        <div class="confirm-icon-wrap" :class="`variant-${store.confirmDialog.variant}`">
          <Trash2 v-if="store.confirmDialog.variant === 'danger'" :size="24" />
          <AlertTriangle v-else :size="24" />
        </div>

        <h3 class="confirm-title">{{ store.confirmDialog.title }}</h3>
        <p class="confirm-message">{{ store.confirmDialog.message }}</p>

        <div v-if="store.confirmDialog.itemLabel" class="confirm-item-pill">
          {{ store.confirmDialog.itemLabel }}
        </div>

        <div class="confirm-actions">
          <button
            type="button"
            class="btn-confirm-cancel"
            @click="store.resolveConfirm(false)"
          >
            {{ store.confirmDialog.cancelText }}
          </button>
          <button
            type="button"
            class="btn-confirm-ok"
            :class="`variant-${store.confirmDialog.variant}`"
            @click="store.resolveConfirm(true)"
          >
            {{ store.confirmDialog.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.confirm-overlay {
  --cm-bg: #111827;
  --cm-border: #1f2937;
  --cm-text: #f8fafc;
  --cm-text-sec: #94a3b8;
  --cm-pill-bg: #1e293b;
  --cm-cancel-bg: #1f2937;
  --cm-cancel-hover: #374151;
  --cm-cancel-text: #e2e8f0;
  --cm-shadow: 0 24px 48px rgba(0, 0, 0, 0.55);

  position: fixed;
  inset: 0;
  z-index: 3500;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.confirm-overlay[data-theme="light"] {
  --cm-bg: #ffffff;
  --cm-border: #e2e8f0;
  --cm-text: #0f172a;
  --cm-text-sec: #475569;
  --cm-pill-bg: #f8fafc;
  --cm-cancel-bg: #f1f5f9;
  --cm-cancel-hover: #e2e8f0;
  --cm-cancel-text: #334155;
  --cm-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
}

.confirm-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  background: var(--cm-bg);
  border: 1px solid var(--cm-border);
  border-radius: 20px;
  padding: 28px 24px 24px;
  box-shadow: var(--cm-shadow);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.confirm-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--cm-text-sec);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.confirm-close-btn:hover {
  background: var(--cm-cancel-bg);
  color: var(--cm-text);
}

.confirm-icon-wrap {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.confirm-icon-wrap.variant-danger {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.confirm-icon-wrap.variant-warning {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
}

.confirm-icon-wrap.variant-primary {
  background: rgba(79, 70, 229, 0.12);
  color: #4f46e5;
}

.confirm-title {
  margin: 0 0 8px;
  font-size: 1.08rem;
  font-weight: 800;
  color: var(--cm-text);
  letter-spacing: -0.01em;
}

.confirm-message {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--cm-text-sec);
  max-width: 340px;
}

.confirm-item-pill {
  margin-top: 14px;
  padding: 7px 14px;
  border-radius: 10px;
  background: var(--cm-pill-bg);
  border: 1px solid var(--cm-border);
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--cm-text);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.confirm-actions {
  margin-top: 22px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.btn-confirm-cancel,
.btn-confirm-ok {
  padding: 11px 16px;
  border-radius: 11px;
  font-size: 0.88rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.16s ease;
}

.btn-confirm-cancel {
  background: var(--cm-cancel-bg);
  color: var(--cm-cancel-text);
  border: 1px solid var(--cm-border);
}

.btn-confirm-cancel:hover {
  background: var(--cm-cancel-hover);
}

.btn-confirm-ok.variant-danger {
  background: #dc2626;
  color: #ffffff;
}

.btn-confirm-ok.variant-danger:hover {
  background: #b91c1c;
}

.btn-confirm-ok.variant-warning {
  background: #d97706;
  color: #ffffff;
}

.btn-confirm-ok.variant-warning:hover {
  background: #b45309;
}

.btn-confirm-ok.variant-primary {
  background: #4f46e5;
  color: #ffffff;
}

.btn-confirm-ok.variant-primary:hover {
  background: #4338ca;
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.18s ease;
}

.confirm-fade-enter-active .confirm-card,
.confirm-fade-leave-active .confirm-card {
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.confirm-fade-enter-from .confirm-card,
.confirm-fade-leave-to .confirm-card {
  transform: scale(0.95) translateY(6px);
  opacity: 0;
}

@media (max-width: 480px) {
  .confirm-card {
    padding: 22px 18px 18px;
  }
  .confirm-actions {
    grid-template-columns: 1fr;
  }
}
</style>

