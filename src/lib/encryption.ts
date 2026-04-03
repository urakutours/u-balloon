/**
 * AES-256-GCM encryption utility for tenant secrets stored in the DB.
 *
 * Design:
 *   - Single master key from env var `ENCRYPTION_KEY` (32 bytes = 64 hex chars)
 *   - Random IV per encryption (12 bytes)
 *   - Stored format: `aes256gcm:<iv_hex>:<auth_tag_hex>:<cipher_hex>`
 *   - Graceful fallback: if value doesn't start with the prefix, it's
 *     returned as-is (supports pre-encryption migration data).
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const PREFIX = 'aes256gcm:'

// ---------------------------------------------------------------------------
// Master key
// ---------------------------------------------------------------------------

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    )
  }
  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be 64 hex characters (32 bytes). ' + 'Current length: ' + key.length,
    )
  }
  return Buffer.from(key, 'hex')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Encrypt a plaintext string → stored format. */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag().toString('hex')
  return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`
}

/** Decrypt a stored format string → plaintext. Non-encrypted values pass through. */
export function decrypt(encryptedStr: string): string {
  if (!encryptedStr.startsWith(PREFIX)) {
    // Not encrypted (pre-migration data) → return as-is
    return encryptedStr
  }

  const key = getEncryptionKey()
  const parts = encryptedStr.slice(PREFIX.length).split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format')
  }

  const [ivHex, authTagHex, cipherHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(cipherHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/** Check whether a value is already encrypted. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX)
}

/** Mask a secret for admin UI display — show only last 4 chars. */
export function maskSecret(value: string): string {
  if (!value || value.length <= 4) return '••••'
  return '••••••••' + value.slice(-4)
}
