import { useState, useEffect, useRef } from 'react'
import { Lock, X, Delete } from 'lucide-react'
import { useAdminAuthStore } from './admin-auth-store'

interface AdminPinModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AdminPinModal({ isOpen, onClose, onSuccess }: AdminPinModalProps) {
  const [pinInput, setPinInput] = useState('')
  const [error, setError] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const login = useAdminAuthStore((state) => state.login)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      setPinInput('')
      setError(false)
      setIsShaking(false)
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        handleDigit(event.key)
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        handleBackspace()
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (pinInput.length > 0) {
          validateAndSubmit(pinInput)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, pinInput])

  if (!isOpen) return null

  const validateAndSubmit = (code: string) => {
    const success = login(code)
    if (success) {
      onClose()
      onSuccess?.()
    } else {
      setError(true)
      setIsShaking(true)

      // Hardware haptic vibration for mobile/iPad touchscreen devices
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.([60, 40, 60])
        } catch { /* ignore */ }
      }

      setTimeout(() => {
        setIsShaking(false)
        setPinInput('')
      }, 500)
    }
  }

  const handleDigit = (digit: string) => {
    if (isShaking || pinInput.length >= 4) return
    setError(false)
    const next = pinInput + digit
    setPinInput(next)

    // Auto-enter saat mencapai 4 digit
    if (next.length === 4) {
      validateAndSubmit(next)
    }
  }

  const handleBackspace = () => {
    if (isShaking) return
    setError(false)
    setPinInput((prev) => prev.slice(0, -1))
  }

  const handleSubmit = () => {
    if (!pinInput || isShaking) return
    validateAndSubmit(pinInput)
  }

  return (
    <div
      className="admin-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-pin-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={modalRef} className={`admin-pin-dialog ${isShaking ? 'is-shaking' : ''}`}>
        <div className="admin-pin-header">
          <div className="admin-pin-title">
            <Lock aria-hidden="true" size={22} />
            <h2 id="admin-pin-title">Akses Khusus Admin</h2>
          </div>
          <button
            type="button"
            className="admin-pin-close"
            onClick={onClose}
            aria-label="Tutup dialog PIN"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <p className="admin-pin-desc">
          Masukkan 4 digit PIN Admin untuk mengunggah template greenscreen kustom dan mengelola sistem.
        </p>

        <div className="admin-pin-display" aria-label="Indikator PIN">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={`admin-pin-dot ${i < pinInput.length ? 'is-filled' : ''}`}
            />
          ))}
        </div>

        {error && (
          <p className="admin-pin-error" role="alert">
            PIN salah. Silakan coba lagi.
          </p>
        )}

        <div className="admin-keypad" role="group" aria-label="Papan angka PIN">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              className="admin-keypad-btn"
              onClick={() => handleDigit(String(num))}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            className="admin-keypad-btn action-btn"
            onClick={handleBackspace}
            aria-label="Hapus satu angka"
          >
            <Delete aria-hidden="true" size={22} />
          </button>
          <button
            type="button"
            className="admin-keypad-btn"
            onClick={() => handleDigit('0')}
          >
            0
          </button>
          <button
            type="button"
            className="admin-keypad-btn ok-btn"
            onClick={handleSubmit}
            aria-label="Konfirmasi PIN"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
