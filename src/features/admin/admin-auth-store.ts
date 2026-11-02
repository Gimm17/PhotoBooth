import { create } from 'zustand'

const ADMIN_PIN_STORAGE_KEY = 'photobooth_admin_pin'
const ADMIN_SESSION_STORAGE_KEY = 'photobooth_admin_logged_in'
export const DEFAULT_ADMIN_PIN = '1708'

const isBrowser = () => typeof window !== 'undefined'
const isTestEnv = () => typeof (globalThis as Record<string, unknown>).vi !== 'undefined' || import.meta.env?.MODE === 'test'

const readSavedPin = (): string => {
  if (!isBrowser() || isTestEnv()) return DEFAULT_ADMIN_PIN
  try {
    return window.localStorage.getItem(ADMIN_PIN_STORAGE_KEY) || DEFAULT_ADMIN_PIN
  } catch {
    return DEFAULT_ADMIN_PIN
  }
}

const readSavedSession = (): boolean => {
  if (!isBrowser() || isTestEnv()) return false
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

interface AdminAuthState {
  isAdmin: boolean
  pin: string
  login: (enteredPin: string) => boolean
  logout: () => void
  changePin: (currentPin: string, newPin: string) => boolean
}

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
  isAdmin: readSavedSession(),
  pin: readSavedPin(),
  login: (enteredPin: string) => {
    const currentPin = get().pin
    if (enteredPin.trim() === currentPin.trim()) {
      if (isBrowser() && !isTestEnv()) {
        try {
          window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true')
        } catch { /* ignore */ }
      }
      set({ isAdmin: true })
      return true
    }
    return false
  },
  logout: () => {
    if (isBrowser() && !isTestEnv()) {
      try {
        window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY)
      } catch { /* ignore */ }
    }
    set({ isAdmin: false })
  },
  changePin: (currentPin: string, newPin: string) => {
    if (currentPin.trim() !== get().pin.trim()) return false
    const sanitized = newPin.trim()
    if (sanitized.length < 4) return false
    if (isBrowser() && !isTestEnv()) {
      try {
        window.localStorage.setItem(ADMIN_PIN_STORAGE_KEY, sanitized)
      } catch { /* ignore */ }
    }
    set({ pin: sanitized })
    return true
  },
}))
