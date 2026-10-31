<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

const backendStatus = ref('checking') // 'checking' | 'connected' | 'error'
const backendData = ref(null)
const latency = ref(null)
const errorMessage = ref('')
const activeTab = ref('overview')

const checkHealth = async () => {
  backendStatus.value = 'checking'
  errorMessage.value = ''
  const start = performance.now()
  try {
    const response = await axios.get(`${API_BASE}/health/`, { timeout: 5000 })
    latency.value = Math.round(performance.now() - start)
    backendData.value = response.data
    backendStatus.value = 'connected'
  } catch (err) {
    latency.value = null
    backendStatus.value = 'error'
    errorMessage.value = err.response?.data?.error || err.message || 'Cannot reach Django server'
  }
}

onMounted(() => {
  checkHealth()
})
</script>

<template>
  <div class="layout">
    <!-- Navigation Bar -->
    <header class="header">
      <div class="header-container">
        <div class="brand">
          <div class="logo-mark">F</div>
          <div>
            <h1 class="brand-title">Fringe Business System</h1>
            <p class="brand-subtitle">Multi-Tenant Point of Sale (POS) Platform</p>
          </div>
        </div>

        <div class="system-status-pill">
          <span class="status-dot" :class="backendStatus"></span>
          <span class="status-label">
            {{ backendStatus === 'connected' ? 'All Systems Operational' : backendStatus === 'checking' ? 'Checking Connection...' : 'Backend Offline (Start Django)' }}
          </span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-container">
      <!-- Hero Section -->
      <section class="hero-card">
        <div class="hero-badge">Architecture & Environment Ready</div>
        <h2 class="hero-heading">Full-Stack Development Environment Initialized</h2>
        <p class="hero-description">
          The development environment for <strong>Fringe Business System</strong> is fully configured with 
          <strong>Vue.js 3</strong> on the frontend, <strong>Django & DRF</strong> on the backend, and 
          <strong>MySQL</strong> as the primary relational database.
        </p>

        <div class="hero-actions">
          <button class="btn btn-primary" @click="checkHealth" :disabled="backendStatus === 'checking'">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            {{ backendStatus === 'checking' ? 'Pinging API...' : 'Test Backend & DB Connection' }}
          </button>
          <a href="http://127.0.0.1:8000/admin/" target="_blank" class="btn btn-secondary">
            Open Django Admin &rarr;
          </a>
        </div>
      </section>

      <!-- Tech Stack Status Grid -->
      <section class="grid grid-3">
        <!-- Frontend Card -->
        <div class="card status-card">
          <div class="card-header">
            <div class="card-icon vue-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 3.8L19.4 19H4.6L12 5.8z" opacity="0.4"/>
                <path d="M12 2L2 19.5h4.2L12 9l5.8 10.5H22L12 2z"/>
              </svg>
            </div>
            <span class="badge badge-success">Running</span>
          </div>
          <h3 class="card-title">Vue.js 3 Frontend</h3>
          <p class="card-subtitle">Vite 8 &bull; Composition API &bull; Port 5173</p>
          <ul class="meta-list">
            <li><span>Dev Server:</span> <code>http://localhost:5173</code></li>
            <li><span>API Client:</span> Axios configured</li>
            <li><span>Hot Reload:</span> Enabled (Vite HMR)</li>
          </ul>
        </div>

        <!-- Backend Card -->
        <div class="card status-card">
          <div class="card-header">
            <div class="card-icon django-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <span class="badge" :class="backendStatus === 'connected' ? 'badge-success' : backendStatus === 'checking' ? 'badge-warning' : 'badge-danger'">
              {{ backendStatus === 'connected' ? 'Online' : backendStatus === 'checking' ? 'Checking' : 'Offline' }}
            </span>
          </div>
          <h3 class="card-title">Django Backend</h3>
          <p class="card-subtitle">Django REST Framework &bull; Port 8000</p>
          <ul class="meta-list">
            <li><span>API Endpoint:</span> <code>{{ API_BASE }}/health/</code></li>
            <li><span>CORS:</span> Configured for localhost:5173</li>
            <li><span>Latency:</span> <strong>{{ latency !== null ? `${latency} ms` : 'N/A' }}</strong></li>
          </ul>
        </div>

        <!-- Database Card -->
        <div class="card status-card">
          <div class="card-header">
            <div class="card-icon mysql-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
            </div>
            <span class="badge" :class="backendData?.database?.status === 'connected' ? 'badge-success' : 'badge-info'">
              {{ backendData?.database?.status || 'Configured' }}
            </span>
          </div>
          <h3 class="card-title">MySQL Database</h3>
          <p class="card-subtitle">PyMySQL &bull; Port 3306 &bull; fringeDB</p>
          <ul class="meta-list">
            <li><span>Database:</span> <code>fringeDB</code></li>
            <li><span>Host & Port:</span> <code>127.0.0.1:3306</code></li>
            <li><span>User:</span> <code>root</code></li>
          </ul>
        </div>
      </section>

      <!-- Live API Diagnostic Inspector -->
      <section class="card inspector-card">
        <div class="inspector-header">
          <div>
            <h3 class="inspector-title">Live API Health & Diagnostics</h3>
            <p class="inspector-subtitle">Real-time telemetry and database connection handshake</p>
          </div>
          <div class="tab-pills">
            <button class="tab-btn" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">Overview</button>
            <button class="tab-btn" :class="{ active: activeTab === 'json' }" @click="activeTab = 'json'">Raw JSON</button>
          </div>
        </div>

        <div v-if="backendStatus === 'connected' && backendData">
          <div v-if="activeTab === 'overview'" class="diagnostics-grid">
            <div class="diag-item">
              <span class="diag-label">System Title</span>
              <span class="diag-value text-accent">{{ backendData.system }}</span>
            </div>
            <div class="diag-item">
              <span class="diag-label">Scope</span>
              <span class="diag-value">{{ backendData.description }}</span>
            </div>
            <div class="diag-item">
              <span class="diag-label">Database Connection</span>
              <span class="diag-value text-success">
                &bull; Connected to {{ backendData.database?.name }} (MySQL)
              </span>
            </div>
            <div class="diag-item">
              <span class="diag-label">Backend Engine</span>
              <span class="diag-value">{{ backendData.backend?.framework }} + {{ backendData.backend?.rest_framework }}</span>
            </div>
          </div>

          <div v-else class="code-viewer">
            <pre><code>{{ JSON.stringify(backendData, null, 2) }}</code></pre>
          </div>
        </div>

        <div v-else-if="backendStatus === 'checking'" class="loading-state">
          <div class="spinner"></div>
          <p>Connecting to Django API and querying MySQL database...</p>
        </div>

        <div v-else class="error-banner">
          <div class="error-icon">!</div>
          <div>
            <p class="error-title">Django backend is currently not running.</p>
            <p class="error-desc">Run <code>backend\.venv\Scripts\python.exe backend\manage.py runserver</code> in the project directory to launch the server.</p>
          </div>
        </div>
      </section>

      <!-- Business Modules Blueprint -->
      <section class="modules-section">
        <div class="section-header">
          <h3 class="section-title">Core Business Modules to Implement</h3>
          <p class="section-desc">Multi-tenant architecture designed for simultaneous Bar and Stationery operations.</p>
        </div>

        <div class="grid grid-3">
          <div class="card module-card">
            <div class="module-number">01</div>
            <h4 class="module-title">🍸 Bar & Lounge Operations</h4>
            <p class="module-text">
              High-speed touch ordering, table tracking, beverage recipe inventory deduction, 
              tab splitting, and quick settlement receipts.
            </p>
            <div class="module-tags">
              <span>Drink Catalog</span>
              <span>Open Tabs</span>
              <span>Stock Control</span>
            </div>
          </div>

          <div class="card module-card">
            <div class="module-number">02</div>
            <h4 class="module-title">📚 Stationery & Retail Store</h4>
            <p class="module-text">
              Barcode scanning, multi-unit packaging (units, packs, reams), batch tracking, 
              low-stock alerts, and custom receipt printing.
            </p>
            <div class="module-tags">
              <span>Barcode Ready</span>
              <span>Ream / Unit Conversion</span>
              <span>Reorder Alerts</span>
            </div>
          </div>

          <div class="card module-card">
            <div class="module-number">03</div>
            <h4 class="module-title">🏢 Multi-Tenant Architecture</h4>
            <p class="module-text">
              Isolated tenant data partitions, multiple branches/stores under one company, 
              granular role-based access control (Cashier, Manager, Admin).
            </p>
            <div class="module-tags">
              <span>Tenant Isolation</span>
              <span>Multi-Branch</span>
              <span>RBAC Permissions</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Developer Cheatsheet -->
      <section class="card cheatsheet-card">
        <h4 class="cheatsheet-title">Quick Developer Commands</h4>
        <div class="commands-grid">
          <div class="cmd-box">
            <div class="cmd-label">Start Django Backend (Port 8000)</div>
            <code>backend\.venv\Scripts\python.exe backend\manage.py runserver</code>
          </div>
          <div class="cmd-box">
            <div class="cmd-label">Start Vue Frontend (Port 5173)</div>
            <code>cd frontend; npm run dev</code>
          </div>
          <div class="cmd-box">
            <div class="cmd-label">Create Django Superuser</div>
            <code>backend\.venv\Scripts\python.exe backend\manage.py createsuperuser</code>
          </div>
          <div class="cmd-box">
            <div class="cmd-label">Access MySQL Database Directly</div>
            <code>C:\xampp\mysql\bin\mysql.exe -u root fringeDB</code>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <p>Fringe Business System &bull; Powered by Vue.js 3, Django, & MySQL &bull; Ready for Development</p>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(12px);
  background: rgba(10, 14, 23, 0.75);
  position: sticky;
  top: 0;
  z-index: 50;
}
.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.logo-mark {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--gradient-brand);
  color: #fff;
  font-weight: 800;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--glow-indigo);
}
.brand-title {
  font-size: 1.35rem;
  font-weight: 700;
  background: linear-gradient(to right, #fff, #cbd5e1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.brand-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.system-status-pill {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  border-radius: 9999px;
  font-size: 0.85rem;
}
.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  transition: all 0.3s;
}
.status-dot.connected {
  background-color: var(--accent-emerald);
  box-shadow: 0 0 10px var(--accent-emerald);
}
.status-dot.checking {
  background-color: var(--accent-amber);
  animation: pulse 1.5s infinite;
}
.status-dot.error {
  background-color: var(--accent-rose);
  box-shadow: 0 0 10px var(--accent-rose);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.2); }
}

/* Main */
.main-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Hero */
.hero-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xl);
  padding: 2.5rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
}
.hero-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--gradient-brand);
}
.hero-badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}
.hero-heading {
  font-size: 2.25rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
  line-height: 1.2;
}
.hero-description {
  color: var(--text-secondary);
  font-size: 1.05rem;
  max-width: 780px;
  margin-bottom: 2rem;
}
.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all 0.2s ease;
}
.btn-primary {
  background: var(--gradient-brand);
  color: #fff;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}
.btn-icon {
  width: 18px;
  height: 18px;
}

/* Grid & Cards */
.grid {
  display: grid;
  gap: 1.5rem;
}
.grid-3 {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.card {
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 1.75rem;
  transition: all 0.3s ease;
}
.card:hover {
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.status-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}
.card-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}
.vue-icon {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}
.django-icon {
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
}
.mysql-icon {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}
.card-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
}

.meta-list {
  list-style: none;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.meta-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-secondary);
}
code {
  font-family: monospace;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 0.82rem;
}

/* Badges */
.badge {
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge-success {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.badge-warning {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.badge-danger {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.3);
}
.badge-info {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

/* Inspector */
.inspector-card {
  padding: 2rem;
}
.inspector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.inspector-title {
  font-size: 1.25rem;
  font-weight: 700;
}
.inspector-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
}
.tab-pills {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}
.tab-btn {
  padding: 0.4rem 0.9rem;
  font-size: 0.85rem;
  background: transparent;
  color: var(--text-muted);
  border-radius: 6px;
  transition: all 0.2s;
}
.tab-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.diagnostics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
}
.diag-item {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
  padding: 1.25rem;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.diag-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.diag-value {
  font-size: 0.95rem;
  font-weight: 600;
}
.text-accent { color: #a5b4fc; }
.text-success { color: #34d399; }

.code-viewer pre {
  background: #06090e;
  border: 1px solid var(--border-color);
  padding: 1.25rem;
  border-radius: var(--radius-md);
  overflow-x: auto;
  font-size: 0.85rem;
  color: #38bdf8;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2.5rem;
  color: var(--text-secondary);
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--accent-indigo);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.25);
  border-radius: var(--radius-md);
  align-items: flex-start;
}
.error-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-rose);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}
.error-title {
  font-weight: 600;
  color: #fb7185;
  margin-bottom: 0.25rem;
}
.error-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Business Modules */
.modules-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.section-title {
  font-size: 1.4rem;
  font-weight: 700;
}
.section-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
}
.module-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.module-number {
  font-size: 1.75rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.08);
  margin-bottom: 0.75rem;
  font-family: var(--font-family-heading);
}
.module-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 0.6rem;
}
.module-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 1.25rem;
}
.module-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.module-tags span {
  font-size: 0.72rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  color: var(--text-muted);
}

/* Cheatsheet */
.cheatsheet-card {
  background: rgba(15, 23, 42, 0.5);
}
.cheatsheet-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
}
.commands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}
.cmd-box {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  padding: 1rem;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.cmd-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
}
.cmd-box code {
  font-size: 0.85rem;
  color: #38bdf8;
  padding: 0.4rem 0.6rem;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  word-break: break-all;
}

/* Footer */
.footer {
  text-align: center;
  padding: 2rem;
  border-top: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.85rem;
  background: rgba(10, 14, 23, 0.8);
}
</style>
