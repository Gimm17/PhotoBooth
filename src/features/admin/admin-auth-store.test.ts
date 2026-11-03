import { describe, it, expect, beforeEach } from 'vitest'
import { useAdminAuthStore, DEFAULT_ADMIN_PIN } from './admin-auth-store'

describe('admin-auth-store', () => {
  beforeEach(() => {
    useAdminAuthStore.setState({
      isAdmin: false,
      pin: DEFAULT_ADMIN_PIN,
    })
  })

  it('initializes in locked mode', () => {
    expect(DEFAULT_ADMIN_PIN).toBe('0417')
    expect(useAdminAuthStore.getState().isAdmin).toBe(false)
    expect(useAdminAuthStore.getState().pin).toBe('0417')
  })

  it('rejects incorrect PIN', () => {
    const success = useAdminAuthStore.getState().login('0000')
    expect(success).toBe(false)
    expect(useAdminAuthStore.getState().isAdmin).toBe(false)
  })

  it('logs in with correct default PIN', () => {
    const success = useAdminAuthStore.getState().login(DEFAULT_ADMIN_PIN)
    expect(success).toBe(true)
    expect(useAdminAuthStore.getState().isAdmin).toBe(true)
  })

  it('allows logging out', () => {
    useAdminAuthStore.getState().login(DEFAULT_ADMIN_PIN)
    expect(useAdminAuthStore.getState().isAdmin).toBe(true)
    useAdminAuthStore.getState().logout()
    expect(useAdminAuthStore.getState().isAdmin).toBe(false)
  })

  it('allows changing PIN with current PIN', () => {
    const failed = useAdminAuthStore.getState().changePin('wrong', '9999')
    expect(failed).toBe(false)

    const success = useAdminAuthStore.getState().changePin(DEFAULT_ADMIN_PIN, '9999')
    expect(success).toBe(true)
    expect(useAdminAuthStore.getState().pin).toBe('9999')

    expect(useAdminAuthStore.getState().login('9999')).toBe(true)
  })
})
