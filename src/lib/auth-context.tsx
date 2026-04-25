'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

type User = {
  id: string
  email: string
  name?: string
  nameKana?: string
  phone?: string
  mobilePhone?: string
  postalCode?: string
  prefecture?: string
  addressLine1?: string
  addressLine2?: string
  defaultAddress?: string
  points: number
  role: 'admin' | 'customer'
  requirePasswordChange?: boolean
}

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

type AuthContextType = {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
  refreshUser: () => Promise<void>
  authFetch: AuthFetch
}

type RegisterData = {
  email: string
  password: string
  name: string
  phone?: string
  defaultAddress?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_STORAGE_KEY = 'uballoon-auth-token'

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredToken(token: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  } catch {
    // localStorage unavailable (private mode, quota exceeded) — fall back silently
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // token を state + localStorage の両方に同期
  const setToken = useCallback((next: string | null) => {
    setTokenState(next)
    writeStoredToken(next)
  }, [])

  // token は ref でも保持して、authFetch 内で最新値を参照する
  // (state 更新前のクロージャからも最新 token を読みたいため)
  const tokenRef = useRef<string | null>(null)
  useEffect(() => {
    tokenRef.current = token
  }, [token])

  // 認証付き fetch wrapper: cookie + Authorization JWT 両方を送る
  const authFetch = useCallback<AuthFetch>(async (input, init = {}) => {
    const headers = new Headers(init.headers || {})
    const currentToken = tokenRef.current
    if (currentToken && !headers.has('Authorization')) {
      headers.set('Authorization', `JWT ${currentToken}`)
    }
    return fetch(input, {
      ...init,
      credentials: init.credentials ?? 'include',
      headers,
    })
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const res = await authFetch('/api/users/me')
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            nameKana: data.user.nameKana,
            phone: data.user.phone,
            mobilePhone: data.user.mobilePhone,
            postalCode: data.user.postalCode,
            prefecture: data.user.prefecture,
            addressLine1: data.user.addressLine1,
            addressLine2: data.user.addressLine2,
            defaultAddress: data.user.defaultAddress,
            points: data.user.points ?? 0,
            role: data.user.role,
            requirePasswordChange: !!data.user.legacyData?.requirePasswordChange,
          })
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    }
  }, [authFetch])

  // 初期マウント時: localStorage から token を復元 → /api/users/me でセッション解決
  useEffect(() => {
    const stored = readStoredToken()
    if (stored) {
      tokenRef.current = stored
      setTokenState(stored)
    }
    refreshUser().finally(() => setIsLoading(false))
    // refreshUser は authFetch 依存だが、authFetch は token を ref から読むため、依存配列は空で OK
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.errors?.[0]?.message || 'ログインに失敗しました')
    }
    const data = await res.json()
    if (data.token) {
      // ref を即時更新して、直後の authFetch 呼び出しで最新 token が使えるようにする
      tokenRef.current = data.token
      setToken(data.token)
    }
    setUser({
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      nameKana: data.user.nameKana,
      phone: data.user.phone,
      mobilePhone: data.user.mobilePhone,
      postalCode: data.user.postalCode,
      prefecture: data.user.prefecture,
      addressLine1: data.user.addressLine1,
      addressLine2: data.user.addressLine2,
      defaultAddress: data.user.defaultAddress,
      points: data.user.points ?? 0,
      role: data.user.role,
      requirePasswordChange: !!data.user.legacyData?.requirePasswordChange,
    })
  }

  const logout = async () => {
    await authFetch('/api/users/logout', { method: 'POST' })
    tokenRef.current = null
    setToken(null)
    setUser(null)
  }

  const register = async (data: RegisterData) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        name: data.name,
        phone: data.phone || undefined,
        defaultAddress: data.defaultAddress || undefined,
        role: 'customer',
      }),
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.errors?.[0]?.message || '登録に失敗しました')
    }
    // Auto-login after registration
    await login(data.email, data.password)
  }

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, logout, register, refreshUser, authFetch }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
