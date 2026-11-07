import { store } from './store'

let lastActivity = Date.now()
let checkInterval = null
const WARNING_DURATION_SECONDS = 30

/**
 * Initializes global user activity listeners and periodic idle checker.
 */
export function initIdleTracker() {
  if (typeof window === 'undefined') return

  const recordActivity = () => {
    lastActivity = Date.now()
    if (store.isIdleWarningActive) {
      store.isIdleWarningActive = false
    }
  }

  // Throttle event handling to avoid performance cost
  let lastEventRecorded = 0
  const throttledActivity = () => {
    const now = Date.now()
    if (now - lastEventRecorded > 1000) {
      lastEventRecorded = now
      recordActivity()
    }
  }

  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
  events.forEach((ev) => {
    window.addEventListener(ev, throttledActivity, { passive: true })
  })

  // Heartbeat check every second
  if (checkInterval) clearInterval(checkInterval)
  checkInterval = setInterval(() => {
    // Only monitor if the user is authenticated and idle timeout is active (> 0)
    if (!store.isAuthenticated || store.idleTimeoutMinutes <= 0) {
      if (store.isIdleWarningActive) {
        store.isIdleWarningActive = false
      }
      return
    }

    const timeoutMs = store.idleTimeoutMinutes * 60 * 1000
    const warningMs = WARNING_DURATION_SECONDS * 1000
    const idleTime = Date.now() - lastActivity

    if (idleTime >= timeoutMs) {
      // Auto-logout triggered!
      store.isIdleWarningActive = false
      lastActivity = Date.now()
      store.logout('idle_timeout')
    } else if (idleTime >= (timeoutMs - warningMs)) {
      // Within warning threshold (30 seconds before logout)
      const remainingSec = Math.max(0, Math.ceil((timeoutMs - idleTime) / 1000))
      store.idleCountdownSeconds = remainingSec
      store.isIdleWarningActive = true
    } else {
      if (store.isIdleWarningActive) {
        store.isIdleWarningActive = false
      }
    }
  }, 1000)
}

/**
 * Resets user activity timestamp and dismisses any active warning dialog.
 */
export function resetIdleActivity() {
  lastActivity = Date.now()
  store.isIdleWarningActive = false
}

export default {
  initIdleTracker,
  resetIdleActivity
}

