<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from '../store'
import { t } from '../i18n'
import { Wine, BookOpen, Layers, MapPin, ChevronRight, ChevronDown, Check } from 'lucide-vue-next'

const isBranchMenuOpen = ref(false)
const dropdownRef = ref(null)

const activeBusinessName = computed(() => {
  if (store.activeUnit === 'all') return t('ctx.combinedScope')
  const found = (store.businessUnits || []).find(u => u.id === store.activeUnit)
  if (found?.name) return found.name
  return store.activeUnit === 'bar' ? 'Bar & Lounge' : 'Stationery & Retail'
})

const unitBranches = computed(() => {
  const list = (store.branches || []).filter(b => b.is_active !== false)
  if (store.activeUnit === 'all') return list
  return list.filter(b => (b.business_unit_id || b.business_unit) === store.activeUnit)
})

const activeBranchLabel = computed(() => {
  if (store.activeUnit === 'all' || String(store.activeBranchId) === 'all') {
    return t('ctx.allBranches')
  }
  const found = unitBranches.value.find(b => String(b.id) === String(store.activeBranchId))
  if (found) return found.name
  return store.activeBranchName || t('ctx.allBranches')
})

const activeBranchCode = computed(() => {
  if (store.activeUnit === 'all' || String(store.activeBranchId) === 'all') return ''
  const found = unitBranches.value.find(b => String(b.id) === String(store.activeBranchId))
  return found?.code || ''
})

const selectBranch = (branchId) => {
  isBranchMenuOpen.value = false
  if (String(store.activeBranchId) !== String(branchId)) {
    store.switchBranch(String(branchId))
  }
}

const onDocClick = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    isBranchMenuOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div v-if="store.isAuthenticated" class="context-bar" :data-theme="store.theme">
    <!-- Left: Minimalistic Business & Active Branch Breadcrumb -->
    <div class="ctx-left">
      <div class="ctx-unit-pill">
        <Wine v-if="store.activeUnit === 'bar'" :size="14" />
        <BookOpen v-else-if="store.activeUnit === 'stationery'" :size="14" />
        <Layers v-else :size="14" />
        <span class="ctx-unit-name">{{ activeBusinessName }}</span>
      </div>

      <ChevronRight :size="14" class="ctx-sep" />

      <div class="ctx-branch-indicator">
        <span class="ctx-live-dot"></span>
        <MapPin :size="13" class="ctx-pin" />
        <span class="ctx-branch-name">{{ activeBranchLabel }}</span>
        <span v-if="activeBranchCode" class="ctx-branch-code">{{ activeBranchCode }}</span>
      </div>
    </div>

    <!-- Right: Owner Branch Switcher -->
    <div v-if="store.isOwner && unitBranches.length > 0" class="ctx-right" ref="dropdownRef">
      <div class="branch-dd" :class="{ open: isBranchMenuOpen }">
        <button
          type="button"
          class="branch-dd-trigger"
          @click.stop="isBranchMenuOpen = !isBranchMenuOpen"
          :aria-expanded="isBranchMenuOpen"
        >
          <MapPin :size="13" />
          <span>{{ t('ctx.switchBranch') }}</span>
          <ChevronDown :size="13" class="dd-chevron" :class="{ rotated: isBranchMenuOpen }" />
        </button>

        <transition name="ctx-pop">
          <div v-if="isBranchMenuOpen" class="branch-dd-menu" role="listbox">
            <button
              type="button"
              class="branch-dd-opt"
              :class="{ active: String(store.activeBranchId) === 'all' }"
              @click="selectBranch('all')"
            >
              <Layers :size="14" class="opt-icon" />
              <div class="opt-text">
                <strong>{{ t('ctx.allBranches') }}</strong>
                <span>{{ activeBusinessName }}</span>
              </div>
              <Check v-if="String(store.activeBranchId) === 'all'" :size="14" class="opt-check" />
            </button>

            <div class="dd-divider"></div>

            <button
              v-for="b in unitBranches"
              :key="b.id"
              type="button"
              class="branch-dd-opt"
              :class="{ active: String(store.activeBranchId) === String(b.id) }"
              @click="selectBranch(b.id)"
            >
              <MapPin :size="14" class="opt-icon" />
              <div class="opt-text">
                <strong>{{ b.name }}</strong>
                <span>{{ b.code }}{{ b.address ? ` · ${b.address}` : '' }}</span>
              </div>
              <Check v-if="String(store.activeBranchId) === String(b.id)" :size="14" class="opt-check" />
            </button>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.context-bar {
  --cb-bg: #111827;
  --cb-surface: #182132;
  --cb-hover: #1f293b;
  --cb-border: rgba(255, 255, 255, 0.08);
  --cb-border-strong: rgba(255, 255, 255, 0.16);
  --cb-text: #f8fafc;
  --cb-sec: #cbd5e1;
  --cb-muted: #94a3b8;
  --cb-accent: #6366f1;
  --cb-accent-soft: rgba(99, 102, 241, 0.16);
  --cb-live: #10b981;
  --cb-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);

  position: sticky;
  top: 0;
  z-index: 40;
  width: 100%;
  padding: 9px 24px;
  background: var(--cb-bg);
  border-bottom: 1px solid var(--cb-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.context-bar[data-theme="light"] {
  --cb-bg: #ffffff;
  --cb-surface: #ffffff;
  --cb-hover: #f1f5f9;
  --cb-border: #e2e8f0;
  --cb-border-strong: #cbd5e1;
  --cb-text: #0f172a;
  --cb-sec: #334155;
  --cb-muted: #64748b;
  --cb-accent: #4f46e5;
  --cb-accent-soft: #eef2ff;
  --cb-live: #059669;
  --cb-shadow: 0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.05);
}

.ctx-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.ctx-unit-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  background: var(--cb-accent-soft);
  color: var(--cb-accent);
  font-size: 0.78rem;
  font-weight: 700;
}

.ctx-sep {
  color: var(--cb-muted);
  opacity: 0.6;
  flex-shrink: 0;
}

.ctx-branch-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--cb-text);
  font-weight: 600;
}

.ctx-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cb-live);
  flex-shrink: 0;
}

.ctx-pin {
  color: var(--cb-muted);
  flex-shrink: 0;
}

.ctx-branch-code {
  font-size: 0.7rem;
  font-weight: 700;
  font-family: monospace;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--cb-hover);
  border: 1px solid var(--cb-border);
  color: var(--cb-muted);
}

/* Branch Switcher Dropdown */
.branch-dd {
  position: relative;
}

.branch-dd-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9px;
  font-size: 0.78rem;
  font-weight: 600;
  background: var(--cb-hover);
  border: 1px solid var(--cb-border);
  color: var(--cb-sec);
  transition: all 0.16s ease;
}

.branch-dd-trigger:hover,
.branch-dd.open .branch-dd-trigger {
  border-color: var(--cb-accent);
  color: var(--cb-accent);
  background: var(--cb-surface);
}

.dd-chevron {
  transition: transform 0.18s ease;
}

.dd-chevron.rotated {
  transform: rotate(180deg);
}

.branch-dd-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 240px;
  max-width: 300px;
  background: var(--cb-surface);
  border: 1px solid var(--cb-border-strong);
  border-radius: 13px;
  padding: 6px;
  box-shadow: var(--cb-shadow);
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 60;
}

.dd-divider {
  height: 1px;
  background: var(--cb-border);
  margin: 4px 6px;
}

.branch-dd-opt {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 9px;
  background: transparent;
  color: var(--cb-text);
  text-align: left;
  transition: background 0.14s ease;
}

.branch-dd-opt:hover {
  background: var(--cb-hover);
}

.branch-dd-opt.active {
  background: var(--cb-accent-soft);
}

.opt-icon {
  color: var(--cb-muted);
  flex-shrink: 0;
}

.branch-dd-opt.active .opt-icon,
.opt-check {
  color: var(--cb-accent);
  flex-shrink: 0;
}

.opt-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.opt-text strong {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--cb-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.opt-text span {
  font-size: 0.7rem;
  color: var(--cb-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ctx-pop-enter-active,
.ctx-pop-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.ctx-pop-enter-from,
.ctx-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

@media (max-width: 640px) {
  .context-bar {
    padding: 8px 14px;
  }

  .branch-dd-menu {
    right: auto;
    left: 0;
  }
}
</style>

