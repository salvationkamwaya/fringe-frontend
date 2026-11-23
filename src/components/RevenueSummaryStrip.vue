<script setup>
import { computed } from 'vue'
import { store } from '../store'
import { Minus, Equal } from 'lucide-vue-next'

const props = defineProps({
  grossSales: { type: [String, Number], default: 0 },
  refunds: { type: [String, Number], default: 0 },
  actualRevenue: { type: [String, Number], default: 0 },
  cogs: { type: [String, Number], default: 0 },
  expenses: { type: [String, Number], default: 0 },
  netProfit: { type: [String, Number], default: 0 },
  netMargin: { type: String, default: '0.0%' },
  ordersCount: { type: Number, default: 0 },
  title: { type: String, default: '' }
})

const isSw = computed(() => store.locale === 'sw')

const fmt = (val) => {
  const n = parseFloat(val || 0)
  return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'
}

const isPositiveProfit = computed(() => parseFloat(props.netProfit || 0) >= 0)
</script>

<template>
  <div class="rss-wrap" :data-theme="store.theme">
    <div class="rss-head">
      <div>
        <h4>{{ title || (isSw ? 'Muhtasari wa Mapato Halisi na Faida' : 'Actual Revenue & True Net Profit Breakdown') }}</h4>
        <span class="rss-sub">
          {{ isSw
            ? 'Mapato yote ukitoa marejesho ya wateja, gharama ya bidhaa (COGS), na matumizi ya uendeshaji.'
            : 'Total sales income minus customer refunds, cost of goods sold (COGS), and operating expenses.' }}
        </span>
      </div>
      <span class="rss-orders-pill">
        {{ ordersCount }} {{ isSw ? 'oda zilizokamilika' : 'completed order(s)' }}
      </span>
    </div>

    <div class="rss-flow">
      <div class="rss-step">
        <span class="rss-k">{{ isSw ? 'Mapato ya Mauzo' : 'Gross Sales Income' }}</span>
        <strong class="rss-v">TSH {{ fmt(grossSales) }}</strong>
        <span class="rss-desc">{{ isSw ? 'Jumla ya mauzo yote' : 'Total completed sales' }}</span>
      </div>

      <div class="rss-op"><Minus :size="14" /></div>

      <div class="rss-step">
        <span class="rss-k">{{ isSw ? 'Marejesho (Refunds)' : 'Refunds & Returns' }}</span>
        <strong class="rss-v rss-rose">TSH {{ fmt(refunds) }}</strong>
        <span class="rss-desc">{{ isSw ? 'Bidhaa zilizorudishwa' : 'Customer refunds' }}</span>
      </div>

      <div class="rss-op"><Equal :size="14" /></div>

      <div class="rss-step rss-step-accent">
        <span class="rss-k">{{ isSw ? 'Mapato Halisi' : 'Actual Revenue' }}</span>
        <strong class="rss-v rss-accent">TSH {{ fmt(actualRevenue) }}</strong>
        <span class="rss-desc">{{ isSw ? 'Mauzo − Marejesho' : 'Income − Refunds' }}</span>
      </div>

      <div class="rss-op"><Minus :size="14" /></div>

      <div class="rss-step">
        <span class="rss-k">{{ isSw ? 'Gharama + Matumizi' : 'COGS + Expenses' }}</span>
        <strong class="rss-v rss-rose">TSH {{ fmt(parseFloat(cogs || 0) + parseFloat(expenses || 0)) }}</strong>
        <span class="rss-desc">
          COGS: {{ fmt(cogs) }} · {{ isSw ? 'Matumizi' : 'Exp' }}: {{ fmt(expenses) }}
        </span>
      </div>

      <div class="rss-op"><Equal :size="14" /></div>

      <div class="rss-step" :class="isPositiveProfit ? 'rss-step-profit' : 'rss-step-loss'">
        <span class="rss-k">{{ isSw ? 'Faida Halisi (Net)' : 'True Net Profit' }}</span>
        <strong class="rss-v" :class="isPositiveProfit ? 'rss-emerald' : 'rss-rose'">
          TSH {{ fmt(netProfit) }}
        </strong>
        <span class="rss-desc">{{ isSw ? 'Uwiano' : 'Net Margin' }}: <strong>{{ netMargin }}</strong></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rss-wrap {
  --rs-bg: #111827;
  --rs-tile: #1e293b;
  --rs-border: rgba(148, 163, 184, 0.16);
  --rs-text: #f8fafc;
  --rs-muted: #94a3b8;
  --rs-accent: #818cf8;
  --rs-accent-soft: rgba(99, 102, 241, 0.16);
  --rs-emerald: #34d399;
  --rs-emerald-soft: rgba(16, 185, 129, 0.14);
  --rs-rose: #fb7185;
  --rs-rose-soft: rgba(244, 63, 94, 0.14);

  background: var(--rs-bg);
  border: 1px solid var(--rs-border);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rss-wrap[data-theme="light"] {
  --rs-bg: #ffffff;
  --rs-tile: #f8fafc;
  --rs-border: #e2e8f0;
  --rs-text: #0f172a;
  --rs-muted: #64748b;
  --rs-accent: #4f46e5;
  --rs-accent-soft: #eef2ff;
  --rs-emerald: #059669;
  --rs-emerald-soft: #ecfdf5;
  --rs-rose: #dc2626;
  --rs-rose-soft: #fef2f2;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.rss-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.rss-head h4 {
  margin: 0;
  font-size: 0.94rem;
  font-weight: 800;
  color: var(--rs-text);
}

.rss-sub {
  display: block;
  font-size: 0.77rem;
  color: var(--rs-muted);
  margin-top: 2px;
}

.rss-orders-pill {
  font-size: 0.74rem;
  font-weight: 700;
  padding: 4px 11px;
  border-radius: 999px;
  background: var(--rs-tile);
  border: 1px solid var(--rs-border);
  color: var(--rs-muted);
}

.rss-flow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1.15fr) auto minmax(0, 1.1fr);
  align-items: stretch;
  gap: 8px;
}

.rss-step {
  background: var(--rs-tile);
  border: 1px solid var(--rs-border);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rss-step-accent {
  background: var(--rs-accent-soft);
  border-color: rgba(79, 70, 229, 0.25);
}

.rss-step-profit {
  background: var(--rs-emerald-soft);
  border-color: rgba(16, 185, 129, 0.28);
}

.rss-step-loss {
  background: var(--rs-rose-soft);
  border-color: rgba(239, 68, 68, 0.28);
}

.rss-op {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rs-muted);
}

.rss-k {
  font-size: 0.69rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--rs-muted);
}

.rss-v {
  font-size: 0.98rem;
  font-weight: 800;
  color: var(--rs-text);
  font-variant-numeric: tabular-nums;
}

.rss-accent { color: var(--rs-accent) !important; }
.rss-emerald { color: var(--rs-emerald) !important; }
.rss-rose { color: var(--rs-rose) !important; }

.rss-desc {
  font-size: 0.71rem;
  color: var(--rs-muted);
}

@media (max-width: 1180px) {
  .rss-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .rss-op {
    display: none;
  }
}

@media (max-width: 600px) {
  .rss-flow {
    grid-template-columns: 1fr;
  }
}
</style>

