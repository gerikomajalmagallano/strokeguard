import type { AssessmentResult, ExerciseSession } from '@/types'
import type { UserProfile } from '@/types/auth'

type RecordKind = 'assessment' | 'pending-assessment' | 'session' | 'profile'

interface EncryptedRecord {
  key: string
  userId: string
  recordId: string
  kind: RecordKind
  iv: string
  ciphertext: string
  updatedAt: string
}

const DATABASE_NAME = 'strokeguard-offline'
const DATABASE_VERSION = 1
const STORE_NAME = 'encrypted_records'
const KEY_PREFIX = 'strokeguard_cache_key_v1_'

let databasePromise: Promise<IDBDatabase> | undefined

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open offline storage.'))
    request.onblocked = () => reject(new Error('Offline storage upgrade is blocked by another open tab.'))
  })
  return databasePromise
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

async function getKey(userId: string, create = false): Promise<CryptoKey | null> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Encrypted offline storage requires a secure browser context such as HTTPS or localhost.')
  }
  const storageKey = `${KEY_PREFIX}${userId}`
  const stored = localStorage.getItem(storageKey)
  if (stored) {
    return crypto.subtle.importKey('raw', toArrayBuffer(fromBase64(stored)), 'AES-GCM', false, ['encrypt', 'decrypt'])
  }
  if (!create) return null

  if ((await getAllForUser(userId)).length) {
    throw new Error('Encrypted patient data exists but its device key is missing. The key was not replaced to avoid overwriting or losing queued data.')
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const rawKey = await crypto.subtle.exportKey('raw', key)
  localStorage.setItem(storageKey, toBase64(new Uint8Array(rawKey)))
  return key
}

async function encode<T>(userId: string, record: T): Promise<Pick<EncryptedRecord, 'iv' | 'ciphertext'>> {
  const key = await getKey(userId, true)
  if (!key) throw new Error('The offline encryption key is unavailable.')
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const bytes = new TextEncoder().encode(JSON.stringify(record))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(bytes))
  return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) }
}

async function decode<T>(record: EncryptedRecord): Promise<T> {
  const key = await getKey(record.userId)
  if (!key) throw new Error('This device session cannot unlock its cached patient data. Sign in online to continue.')
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(fromBase64(record.iv)) },
    key,
    toArrayBuffer(fromBase64(record.ciphertext))
  )
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

async function put<T>(userId: string, kind: RecordKind, recordId: string, value: T): Promise<void> {
  const encrypted = await encode(userId, value)
  const record: EncryptedRecord = {
    key: `${userId}:${kind}:${recordId}`,
    userId,
    recordId,
    kind,
    ...encrypted,
    updatedAt: new Date().toISOString()
  }
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(record)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save encrypted offline data.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Offline data save was cancelled.'))
  })
}

async function putAll(records: EncryptedRecord[]): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    for (const record of records) store.put(record)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save encrypted offline data.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Offline data save was cancelled.'))
  })
}

async function encryptRecord<T>(userId: string, kind: RecordKind, recordId: string, value: T): Promise<EncryptedRecord> {
  return {
    key: `${userId}:${kind}:${recordId}`,
    userId,
    recordId,
    kind,
    ...(await encode(userId, value)),
    updatedAt: new Date().toISOString()
  }
}

async function getAllForUser(userId: string, kinds?: RecordKind[]): Promise<EncryptedRecord[]> {
  const database = await openDatabase()
  const records = await new Promise<EncryptedRecord[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result as EncryptedRecord[])
    request.onerror = () => reject(request.error ?? new Error('Could not read offline data.'))
  })
  return records.filter(record => record.userId === userId && (!kinds || kinds.includes(record.kind)))
}

async function remove(userId: string, kind: RecordKind, recordId: string): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(`${userId}:${kind}:${recordId}`)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove offline data.'))
  })
}

export const offlineDb = {
  async initializeSession(userId: string) {
    await getKey(userId, true)
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    const record = (await getAllForUser(userId, ['profile']))[0]
    return record ? decode<UserProfile>(record) : null
  },

  cacheProfile(profile: UserProfile) {
    return put(profile.userId, 'profile', 'current', profile)
  },

  async getAssessments(userId: string): Promise<AssessmentResult[]> {
    const records = await getAllForUser(userId, ['assessment', 'pending-assessment'])
    const assessments = await Promise.all(records.map(record => decode<AssessmentResult>(record)))
    const uniqueAssessments = new Map(assessments.map(assessment => [assessment.id, assessment]))
    return [...uniqueAssessments.values()].sort((a, b) => b.date.localeCompare(a.date))
  },

  async getPendingAssessments(userId: string): Promise<AssessmentResult[]> {
    const records = await getAllForUser(userId, ['pending-assessment'])
    const assessments = await Promise.all(records.map(record => decode<AssessmentResult>(record)))
    return assessments.sort((a, b) => a.date.localeCompare(b.date))
  },

  cacheAssessment(assessment: AssessmentResult) {
    return put(assessment.patientId, 'assessment', assessment.id, assessment)
  },

  async queueAssessment(assessment: AssessmentResult) {
    const pending = { ...assessment, syncStatus: 'pending' as const }
    await putAll([
      await encryptRecord(assessment.patientId, 'assessment', assessment.id, pending),
      await encryptRecord(assessment.patientId, 'pending-assessment', assessment.id, pending)
    ])
  },

  async markAssessmentSynced(assessment: AssessmentResult) {
    await put(assessment.patientId, 'assessment', assessment.id, { ...assessment, syncStatus: 'synced' })
    await remove(assessment.patientId, 'pending-assessment', assessment.id)
  },

  async getSessions(userId: string): Promise<ExerciseSession[]> {
    const records = await getAllForUser(userId, ['session'])
    const sessions = await Promise.all(records.map(record => decode<ExerciseSession>(record)))
    return sessions.sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  },

  saveSession(session: ExerciseSession) {
    return put(session.patientId, 'session', session.id, session)
  },

  async migrateLegacySessions(patientId: string) {
    const key = `strokeguard_sessions_v3_${patientId}`
    const stored = localStorage.getItem(key)
    if (!stored) return
    const sessions = JSON.parse(stored) as ExerciseSession[]
    if (!Array.isArray(sessions) || sessions.some(session => session.patientId !== patientId || !session.id)) {
      throw new Error('Legacy exercise-session data does not match the signed-in patient and was not imported.')
    }
    for (const session of sessions) await put(patientId, 'session', session.id, session)
    localStorage.removeItem(key)
  },

  async clearPatientData(userId: string, patientId?: string) {
    const userIds = new Set([userId, patientId].filter((id): id is string => !!id))
    const database = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) return
        if (userIds.has((cursor.value as EncryptedRecord).userId)) cursor.delete()
        cursor.continue()
      }
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not clear cached patient data.'))
    })
    for (const id of userIds) localStorage.removeItem(`${KEY_PREFIX}${id}`)
  }
}
