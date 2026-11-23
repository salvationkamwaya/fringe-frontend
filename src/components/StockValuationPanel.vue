<script setup>
import { computed } from 'vue'
import { store } from '../store'
import { BarChart3, Package, Box, Sparkles } from 'lucide-vue-next'

const props = defineProps({
  valuation: {
    type: Object,
    default: () => null
  },
  title: {
    type: String,
    default: ''
  }
})

const isSw = computed(() => store.locale === 'sw')

const fmt = (val) => {
  const n = parseFloat(val || 0)
  return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'
}

const fmtQty = (val) => {
  const n = parseFloat(val || 0)
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

const hasSplitUpside = computed(() => parseFloat(props.valuation?.split_upside || 0) > 0)
const packData = computed(() => props.valuation?.pack_products || { count: 0 })
const singleData = computed(() => props.valuation?.single_products || { count: 0 })
</script>

<template>
  <div v-if="valuation" class="svp-section" :data-theme="store.theme">
    <!-- Section Header -->
    <div class="svp-header">
      <div class="svp-title-group">
        <div class="svp-icon-pill">
          <BarChart3 :size="17" />
        </div>
        <div>
          <h4>{{ title || (isSw ? 'Thamani ya Biashara (Stoo Iliyopo)' : 'Business Worth & Inventory Valuation') }}</h4>
          <span class="svp-sub">
            {{ isSw
              ? `Jumla ya bidhaa ${valuation.total_items || 0} • ${fmtQty(valuation.total_stock_units)} kwenye stoo`
              : `${valuation.total_items || 0} active product(s) · ${fmtQty(valuation.total_stock_units)} total stock units` }}
          </span>
        </div>
      </div>

      <div class="svp-margin-badges">
        <span class="svp-pill-emerald">
          {{ isSw ? 'Faida Tarajiwa' : 'Expected Margin' }}:
          <strong>{{ valuation.expected_margin_percent || '0.0%' }}</strong>
        </span>
        <span v-if="hasSplitUpside" class="svp-pill-indigo">
          <Sparkles :size="12" />
          <span>
            {{ isSw ? 'Ziada ya Vipande' : 'Split Upside' }}: +TSH {{ fmt(valuation.split_upside) }}
          </span>
        </span>
      </div>
    </div>

    <!-- Top Summary Row: 3 Clear Cards (Buying, Standard Selling, Max Split Selling) -->
    <div class="svp-top-grid">
      <!-- Card 1: Buying Worth -->
      <div class="svp-card">
        <span class="svp-k">{{ isSw ? 'Thamani ya Kununua (Mtaji)' : 'Total Buying Worth (Capital)' }}</span>
        <strong class="svp-v">TSH {{ fmt(valuation.valuation_at_cost) }}</strong>
        <span class="svp-hint">
          {{ isSw
            ? 'Gharama halisi ya stoo yote (pakiti + bidhaa moja moja).'
            : 'Exact cost capital invested across all pack & single-item stock.' }}
        </span>
      </div>

      <!-- Card 2: Standard / Pack Rate Selling Worth -->
      <div class="svp-card">
        <span class="svp-k">{{ isSw ? 'Thamani ya Kuuza (Bei ya Pakiti / Kawaida)' : 'Selling Worth (Standard / Pack Rate)' }}</span>
        <strong class="svp-v svp-accent">TSH {{ fmt(valuation.valuation_at_retail) }}</strong>
        <div class="svp-profit-line">
          <span>{{ isSw ? 'Faida Tarajiwa' : 'Base Expected Profit' }}:</span>
          <strong class="svp-emerald">TSH {{ fmt(valuation.potential_gross_profit) }}</strong>
        </div>
      </div>

      <!-- Card 3: Max Retail / Split Singles Selling Worth -->
      <div class="svp-card svp-card-highlight">
        <span class="svp-k">{{ isSw ? 'Thamani ya Juu (Ikiuzwa kwa Vipande)' : 'Max Selling Worth (With Split Singles)' }}</span>
        <strong class="svp-v svp-emerald">TSH {{ fmt(valuation.valuation_at_max_split ?? valuation.valuation_at_retail) }}</strong>
        <div class="svp-profit-line">
          <span>{{ isSw ? 'Faida ya Juu' : 'Max Expected Profit' }}:</span>
          <strong class="svp-emerald">TSH {{ fmt(valuation.potential_max_profit ?? valuation.potential_gross_profit) }}</strong>
          <span class="svp-mini-badge">{{ valuation.max_margin_percent || valuation.expected_margin_percent || '0.0%' }}</span>
        </div>
      </div>
    </div>

    <!-- Separated Breakdown Strip: Bulk/Pack Products vs Single-Item Only Products -->
    <div class="svp-split-strip">
      <!-- Bulk / Pack Products -->
      <div class="svp-sub-card">
        <div class="svp-sub-head">
          <div class="svp-sub-title">
            <Package :size="15" class="svp-accent" />
            <span>{{ isSw ? 'Bidhaa za Pakiti / Boksi' : 'Bulk / Pack Products' }}</span>
          </div>
          <span class="svp-count-chip">
            {{ packData.count || 0 }} {{ isSw ? 'bidhaa' : 'items' }} · {{ fmtQty(packData.total_packs) }} {{ isSw ? 'pakiti' : 'packs' }}
            <template v-if="parseFloat(packData.total_pieces || 0) > 0">
              ({{ fmtQty(packData.total_pieces) }} {{ isSw ? 'vipande' : 'pcs' }})
            </template>
          </span>
        </div>

        <div class="svp-sub-metrics">
          <div class="svp-m">
            <span class="svp-mk">{{ isSw ? 'Kununua' : 'Buying Worth' }}</span>
            <strong class="svp-mv">TSH {{ fmt(packData.buying_worth) }}</strong>
          </div>
          <div class="svp-m">
            <span class="svp-mk">{{ isSw ? 'Kuuza (Pakiti)' : 'Pack Selling' }}</span>
            <strong class="svp-mv svp-accent">TSH {{ fmt(packData.selling_standard) }}</strong>
          </div>
          <div class="svp-m">
            <span class="svp-mk">{{ isSw ? 'Kuuza (Vipande)' : 'Max Split Selling' }}</span>
            <strong class="svp-mv svp-emerald">TSH {{ fmt(packData.selling_max_split) }}</strong>
          </div>
          <div class="svp-m">
            <span class="svp-mk">{{ isSw ? 'Faida Tarajiwa' : 'Profit Range' }}</span>
            <strong class="svp-mv svp-emerald">
              TSH {{ fmt(packData.profit_standard) }}
              <template v-if="parseFloat(packData.split_upside || 0) > 0">
                – {{ fmt(packData.profit_max_split) }}
              </template>
            </strong>
          </div>
        </div>
      </div>

      <!-- Single-Item Only Products -->
      <div class="svp-sub-card">
        <div class="svp-sub-head">
          <div class="svp-sub-title">
            <Box :size="15" class="svp-emerald" />
            <span>{{ isSw ? 'Bidhaa za Kipande Kimoja Pekee' : 'Single-Item Only Products' }}</span>
          </div>
          <span class="svp-count-chip">
            {{ singleData.count || 0 }} {{ isSw ? 'bidhaa' : 'items' }} · {{ fmtQty(singleData.total_units) }} {{ isSw ? 'vipande' : 'units' }}
          </span>
        </div>

        <div class="svp-sub-metrics cols-3">
          <div class="svp-m">
            <span class="svp-mk">{{ isSw ? 'Kununua' : 'Buying Worth' }}</span>
            <strong class="svp-mv">TSH {{ fmt(singleData.buying_worth) }}</strong>
          </div>
          <div class="svp-m">
            <span class="svp-mk">{{ isSw ? 'Kuuza' : 'Selling Worth' }}</span>
            <strong class="svp-mv svp-accent">TSH {{ fmt(singleData.selling_worth) }}</strong>
          </div>
          <div class="svp-m">
            <span class="svp-mk">{{ isSw ? 'Faida Tarajiwa' : 'Expected Profit' }}</span>
            <strong class="svp-mv svp-emerald">
              TSH {{ fmt(singleData.expected_profit) }}
              <span class="svp-mini-badge">{{ singleData.margin_percent || '0.0%' }}</span>
            </strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.svp-section {
  --svp-bg: #111827;
  --svp-elevated: #1e293b;
  --svp-border: rgba(148, 163, 184, 0.16);
  --svp-text: #f8fafc;
  --svp-text-sec: #cbd5e1;
  --svp-muted: #94a3b8;
  --svp-accent: #818cf8;
  --svp-accent-soft: rgba(99, 102, 241, 0.16);
  --svp-emerald: #34d399;
  --svp-emerald-soft: rgba(16, 185, 129, 0.14);

  background: var(--svp-bg);
  border: 1px solid var(--svp-border);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.svp-section[data-theme="light"] {
  --svp-bg: #ffffff;
  --svp-elevated: #f8fafc;
  --svp-border: #e2e8f0;
  --svp-text: #0f172a;
  --svp-text-sec: #334155;
  --svp-muted: #64748b;
  --svp-accent: #4f46e5;
  --svp-accent-soft: #eef2ff;
  --svp-emerald: #059669;
  --svp-emerald-soft: #ecfdf5;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.svp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.svp-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.svp-icon-pill {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--svp-accent-soft);
  color: var(--svp-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.svp-title-group h4 {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 800;
  color: var(--svp-text);
}

.svp-sub {
  display: block;
  font-size: 0.78rem;
  color: var(--svp-muted);
  margin-top: 2px;
}

.svp-margin-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.svp-pill-emerald,
.svp-pill-indigo {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 600;
}

.svp-pill-emerald {
  background: var(--svp-emerald-soft);
  color: var(--svp-emerald);
}

.svp-pill-indigo {
  background: var(--svp-accent-soft);
  color: var(--svp-accent);
  font-weight: 700;
}

/* Top 3 Summary Cards */
.svp-top-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.svp-card {
  background: var(--svp-elevated);
  border: 1px solid var(--svp-border);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.svp-card-highlight {
  background: var(--svp-emerald-soft);
  border-color: rgba(16, 185, 129, 0.28);
}

.svp-k {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--svp-muted);
}

.svp-v {
  font-size: 1.28rem;
  font-weight: 800;
  color: var(--svp-text);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.svp-accent { color: var(--svp-accent) !important; }
.svp-emerald { color: var(--svp-emerald) !important; }

.svp-hint {
  font-size: 0.75rem;
  color: var(--svp-muted);
  line-height: 1.4;
}

.svp-profit-line {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: var(--svp-text-sec);
  margin-top: 2px;
}

.svp-mini-badge {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.16);
  color: var(--svp-emerald);
}

/* Separated Breakdown Strip */
.svp-split-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.svp-sub-card {
  background: var(--svp-elevated);
  border: 1px solid var(--svp-border);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.svp-sub-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.svp-sub-title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.84rem;
  font-weight: 800;
  color: var(--svp-text);
}

.svp-count-chip {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--svp-muted);
  background: var(--svp-bg);
  border: 1px solid var(--svp-border);
  padding: 3px 9px;
  border-radius: 999px;
}

.svp-sub-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
}

.svp-sub-metrics.cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.svp-m {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.svp-mk {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--svp-muted);
}

.svp-mv {
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--svp-text);
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

@media (max-width: 1100px) {
  .svp-top-grid,
  .svp-split-strip {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .svp-sub-metrics,
  .svp-sub-metrics.cols-3 {
    grid-template-columns: 1fr;
  }
}
</style>

