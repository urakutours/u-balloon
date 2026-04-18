'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

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

type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
  refreshUser: () => Promise<void>
}

type RegisterData = {
  email: string
  password: string
  name: string
  phone?: string
  defaultAddress?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { credentials: 'include' })
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
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false))
  }, [refreshUser])

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
    await fetch('/api/users/logout', {
      method: 'POST',
      credentials: 'include',
    })
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
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
