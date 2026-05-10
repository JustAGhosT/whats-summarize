/**
 * Supabase Browser Client
 *
 * POC Implementation - BUG-1 Fix
 * Creates a Supabase client for browser/client-side authentication
 *
 * TODO: Production Hardening
 * - Add connection retry logic
 * - Implement client-side session caching
 * - Add request timeout configuration
 *
 * Future Enhancements:
 * - Real-time subscription helpers
 * - Offline support with local-first sync
 */

import { createBrowserClient } from '@supabase/ssr'

/**
 * Validates that Supabase environment variables are configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Creates a Supabase client for browser usage
 * Includes graceful fallback for development without Supabase
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Development warning - helps developers identify configuration issues
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Supabase] Missing environment variables.\n' +
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local\n' +
        'Using mock client for development.'
      )
    }
    return createMockBrowserClient()
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Mock browser client for development without Supabase
 *
 * WARNING: Development only - provides realistic API surface
 * TODO: Add build-time flag to exclude from production builds
 */
function createMockBrowserClient() {
  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() + 3600000,
    user: {
      id: 'mock-user-id',
      email: 'dev@convolens.local',
      user_metadata: { name: 'Development User' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    }
  }

  let currentSession: typeof mockSession | null = null

  return {
    auth: {
      getSession: async () => ({
        data: { session: currentSession },
        error: null
      }),
      getUser: async () => ({
        data: { user: currentSession?.user ?? null },
        error: null
      }),
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        // Simulate basic validation
        if (!email || !password) {
          return {
            data: { user: null, session: null },
            error: { message: 'Email and password are required', status: 400 }
          }
        }
        // In mock mode, accept any valid-looking credentials
        currentSession = {
          ...mockSession,
          user: { ...mockSession.user, email }
        }
        console.info('[MockSupabase] Signed in as:', email)
        return {
          data: { user: currentSession.user, session: currentSession },
          error: null
        }
      },
      signUp: async ({ email, password, options }: {
        email: string
        password: string
        options?: { data?: { name?: string } }
      }) => {
        if (!email || !password) {
          return {
            data: { user: null, session: null },
            error: { message: 'Email and password are required', status: 400 }
          }
        }
        if (password.length < 6) {
          return {
            data: { user: null, session: null },
            error: { message: 'Password must be at least 6 characters', status: 400 }
          }
        }
        currentSession = {
          ...mockSession,
          user: {
            ...mockSession.user,
            email,
            user_metadata: { name: options?.data?.name || 'New User' }
          }
        }
        console.info('[MockSupabase] Signed up as:', email)
        return {
          data: { user: currentSession.user, session: currentSession },
          error: null
        }
      },
      signOut: async () => {
        currentSession = null
        console.info('[MockSupabase] Signed out')
        return { error: null }
      },
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        // Immediately call with current state
        setTimeout(() => {
          callback(currentSession ? 'SIGNED_IN' : 'SIGNED_OUT', currentSession)
        }, 0)
        return {
          data: {
            subscription: {
              id: 'mock-subscription',
              unsubscribe: () => {}
            }
          }
        }
      },
      signInWithOAuth: async ({ provider }: { provider: string }) => {
        console.warn(`[MockSupabase] OAuth (${provider}) requires Supabase configuration`)
        return {
          data: { url: null, provider },
          error: { message: `OAuth provider '${provider}' not available in development mode` }
        }
      },
      resetPasswordForEmail: async (email: string) => {
        console.info('[MockSupabase] Password reset requested for:', email)
        return { data: {}, error: null }
      }
    },
    from: (table: string) => createMockQueryBuilder(table)
  } as any
}

/**
 * Mock query builder for database operations
 */
function createMockQueryBuilder(table: string) {
  const builder = {
    select: (columns = '*') => {
      console.debug(`[MockSupabase] SELECT ${columns} FROM ${table}`)
      return { ...builder, data: [], error: null }
    },
    insert: (data: any) => {
      console.debug(`[MockSupabase] INSERT INTO ${table}`, data)
      return { ...builder, data: { id: 'mock-id', ...data }, error: null }
    },
    update: (data: any) => {
      console.debug(`[MockSupabase] UPDATE ${table}`, data)
      return { ...builder, data, error: null }
    },
    delete: () => {
      console.debug(`[MockSupabase] DELETE FROM ${table}`)
      return { ...builder, data: null, error: null }
    },
    eq: (column: string, value: any) => builder,
    neq: (column: string, value: any) => builder,
    order: (column: string, options?: any) => builder,
    limit: (count: number) => builder,
    single: () => ({ data: null, error: null }),
    maybeSingle: () => ({ data: null, error: null })
  }
  return builder
}

export type SupabaseClient = ReturnType<typeof createClient>
