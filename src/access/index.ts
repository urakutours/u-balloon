import type { Access, FieldAccess } from 'payload'

export const isAdmin: Access = ({ req: { user } }) => {
  return user?.role === 'admin'
}

export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { id: { equals: user.id } }
}

export const isAdminOrOwner = (userField: string = 'customer'): Access => {
  return ({ req: { user } }) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return { [userField]: { equals: user.id } }
  }
}

export const anyone: Access = () => true

export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) => {
  return user?.role === 'admin'
}
