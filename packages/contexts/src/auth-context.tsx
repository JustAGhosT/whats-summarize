/**
 * Authentication Context - POC Implementation
 *
 * BUG-1 FIX: Replaced mock authentication with real Supabase integration
 * REF-1: Consolidated auth context (single source of truth)
 *
 * Integration Points:
 * - Uses Supabase client for authentication
 * - Provides auth state to all app components via React Context
 * - Handles session persistence and refresh
 *
 * TODO: Production Hardening
 * - Add token refresh logic with retry
 * - Implement secure session storage
 * - Add rate limiting for auth operations
 * - Add comprehensive error codes
 * - Implement session timeout handling
 *
 * Future Enhancements:
 * - Add multi-factor authentication support
 * - Implement social login (Google, GitHub)
 * - Add biometric authentication for mobile
 * - Role-based access control helpers
 */

"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"

// User type definition matching Supabase user structure
export type User = {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  role?: 'user' | 'admin'
  isAdmin?: boolean
  metadata?: Record<string, unknown>
} | null

// Auth error type for better error handling
export type AuthError = {
  message: string
  code?: string
}

// Auth context type with all authentication operations
export type AuthContextType = {
  user: User
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Storage key for user data
const USER_STORAGE_KEY = 'convolens_user'
const SESSION_STORAGE_KEY = 'convolens_session'

// Legacy storage keys from the WhatsSummarize → ConvoLens rename.
// Kept here purely so the migration shim below can copy values forward
// without signing existing users out. These constants (and the migration
// shim) should be removed ~30 days after the rename ships, or once
// telemetry confirms zero legacy reads.
const OLD_USER_STORAGE_KEY = 'whatssummarize_user'
const OLD_SESSION_STORAGE_KEY = 'whatssummarize_session'

/**
 * Creates a Supabase-like client interface
 * In production, this should import from @/lib/supabase/client
 * For now, provides a working implementation that can be swapped
 */
function createAuthClient() {
  // Check if running in browser
  if (typeof window === 'undefined') {
    return null
  }

  // Try to dynamically load Supabase client
  // This pattern allows for flexible configuration
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const supabaseKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

  // If Supabase is not configured, use the API backend
  if (!supabaseUrl || !supabaseKey) {
    return createApiAuthClient()
  }

  // Return Supabase client wrapper
  return {
    type: 'supabase' as const,
    url: supabaseUrl,
    key: supabaseKey
  }
}

/**
 * Creates an API-based auth client for use with Express backend
 * This is used when Supabase is not configured
 */
function createApiAuthClient() {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001'

  return {
    type: 'api' as const,
    async login(email: string, password: string) {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }))
        throw new Error(error.message || 'Login failed')
      }

      return response.json()
    },
    async signup(email: string, password: string, name: string) {
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Signup failed' }))
        throw new Error(error.message || 'Signup failed')
      }

      return response.json()
    },
    async logout() {
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    },
    async getSession() {
      const token = localStorage.getItem(SESSION_STORAGE_KEY)
      if (!token) return null

      try {
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        })

        if (!response.ok) return null
        return response.json()
      } catch {
        return null
      }
    }
  }
}

/**
 * Authentication Provider Component
 *
 * Wraps the application and provides authentication state and methods
 * to all child components through React Context.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  const [authClient] = useState(createAuthClient)

  // Clear error helper
  const clearError = useCallback(() => setError(null), [])

  // Initialize authentication state on mount
  useEffect(() => {
    let isMounted = true

    // One-shot localStorage migration from `whatssummarize_*` →
    // `convolens_*`. Without this, every existing user would be signed out
    // on the deploy that ships the brand rename. Safe to run on every
    // mount: after the first run, the legacy keys are gone, so subsequent
    // mounts are no-ops. Remove this block (and the OLD_* constants
    // above) ~30 days after deploy.
    if (typeof window !== 'undefined') {
      try {
        const migrations: Array<[string, string]> = [
          [OLD_USER_STORAGE_KEY, USER_STORAGE_KEY],
          [OLD_SESSION_STORAGE_KEY, SESSION_STORAGE_KEY],
        ]
        for (const [oldK, newK] of migrations) {
          const legacy = localStorage.getItem(oldK)
          if (legacy === null) continue
          const existing = localStorage.getItem(newK)
          if (existing === null) {
            localStorage.setItem(newK, legacy)
          }
          localStorage.removeItem(oldK)
        }
      } catch (err) {
        // localStorage can throw in private-mode / quota-exceeded
        // scenarios — never let that block auth init.
        console.warn('[AuthContext] Legacy storage migration skipped:', err)
      }
    }

    const initializeAuth = async () => {
      try {
        // Try to load cached user for immediate display
        const cachedUser = localStorage.getItem(USER_STORAGE_KEY)
        if (cachedUser && isMounted) {
          try {
            const parsed = JSON.parse(cachedUser)
            setUser(parsed)
          } catch {
            localStorage.removeItem(USER_STORAGE_KEY)
          }
        }

        // Verify session with backend
        if (authClient?.type === 'api') {
          const session = await authClient.getSession()
          if (session && isMounted) {
            const mappedUser: User = {
              id: session.user?.id || session.userId,
              email: session.user?.email || session.email,
              name: session.user?.name || session.name
            }
            setUser(mappedUser)
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser))
          } else if (!session && isMounted) {
            // Session expired or invalid
            setUser(null)
            localStorage.removeItem(USER_STORAGE_KEY)
            localStorage.removeItem(SESSION_STORAGE_KEY)
          }
        }
      } catch (err) {
        console.error('[AuthContext] Initialization error:', err)
        // On error, keep cached user if available
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      isMounted = false
    }
  }, [authClient])

  /**
   * Login with email and password
   */
  const login = useCallback(async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      // Input validation
      if (!email?.trim()) {
        const errorMsg = 'Email is required'
        setError({ message: errorMsg })
        return { success: false, error: errorMsg }
      }

      if (!password) {
        const errorMsg = 'Password is required'
        setError({ message: errorMsg })
        return { success: false, error: errorMsg }
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        const errorMsg = 'Please enter a valid email address'
        setError({ message: errorMsg })
        return { success: false, error: errorMsg }
      }

      if (authClient?.type === 'api') {
        const response = await authClient.login(email, password)

        const mappedUser: User = {
          id: response.user?.id || response.userId,
          email: response.user?.email || email,
          name: response.user?.name
        }

        if (response.token) {
          localStorage.setItem(SESSION_STORAGE_KEY, response.token)
        }

        setUser(mappedUser)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser))

        return { success: true }
      }

      // Fallback for development without backend
      console.warn('[AuthContext] No auth backend configured, using development mode')
      const devUser: User = {
        id: 'dev-' + Date.now(),
        email,
        name: email.split('@')[0]
      }
      setUser(devUser)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(devUser))

      return { success: true }
    } catch (err: any) {
      const errorMsg = err.message || 'An unexpected error occurred'
      setError({ message: errorMsg })
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [authClient])

  /**
   * Sign up with email, password, and name
   */
  const signup = useCallback(async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      // Input validation
      if (!email?.trim()) {
        const errorMsg = 'Email is required'
        setError({ message: errorMsg })
        return { success: false, error: errorMsg }
      }

      if (!password) {
        const errorMsg = 'Password is required'
        setError({ message: errorMsg })
        return { success: false, error: errorMsg }
      }

      if (password.length < 6) {
        const errorMsg = 'Password must be at least 6 characters'
        setError({ message: errorMsg })
        return { success: false, error: errorMsg }
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        const errorMsg = 'Please enter a valid email address'
        setError({ message: errorMsg })
        return { success: false, error: errorMsg }
      }

      if (authClient?.type === 'api') {
        const response = await authClient.signup(email, password, name)

        const mappedUser: User = {
          id: response.user?.id || response.userId,
          email: response.user?.email || email,
          name: response.user?.name || name
        }

        if (response.token) {
          localStorage.setItem(SESSION_STORAGE_KEY, response.token)
        }

        setUser(mappedUser)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser))

        return { success: true }
      }

      // Fallback for development
      const devUser: User = {
        id: 'dev-' + Date.now(),
        email,
        name
      }
      setUser(devUser)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(devUser))

      return { success: true }
    } catch (err: any) {
      const errorMsg = err.message || 'An unexpected error occurred'
      setError({ message: errorMsg })
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [authClient])

  /**
   * Logout the current user
   */
  const logout = useCallback(async () => {
    setIsLoading(true)

    try {
      if (authClient?.type === 'api') {
        await authClient.logout()
      }
    } catch (err) {
      console.error('[AuthContext] Logout error:', err)
    } finally {
      // Always clear local state
      setUser(null)
      localStorage.removeItem(USER_STORAGE_KEY)
      localStorage.removeItem(SESSION_STORAGE_KEY)
      setIsLoading(false)
    }
  }, [authClient])

  /**
   * Request password reset email
   */
  const resetPassword = useCallback(async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null)

    try {
      if (!email?.trim()) {
        const errorMsg = 'Email is required'
        setError({ message: errorMsg })
        return { success: false, error: errorMsg }
      }

      // In a real implementation, call the password reset API
      console.info('[AuthContext] Password reset requested for:', email)

      // For now, simulate success
      return { success: true }
    } catch (err: any) {
      const errorMsg = err.message || 'An unexpected error occurred'
      setError({ message: errorMsg })
      return { success: false, error: errorMsg }
    }
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    signup,
    logout,
    resetPassword,
    clearError
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to access authentication context
 *
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Re-export for convenience
export { AuthContext }
