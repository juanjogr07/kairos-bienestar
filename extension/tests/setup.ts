/**
 * Mock liviano del API `chrome.*` usado por la extensión.
 * Reemplaza a jest-chrome (incompatible con jest 29) sin dependencias.
 *
 * Cubre: chrome.storage.local (get/set/remove con un Map en memoria),
 * chrome.alarms.create/getAll/clear/onAlarm, y chrome.runtime.* básico.
 *
 * Se carga vía `setupFilesAfterEach` de jest, así que los globals
 * `beforeEach` / `jest` están disponibles.
 */
import { beforeEach, jest } from "@jest/globals"

type Listener<T extends unknown[]> = (...args: T) => void

function makeEvent<T extends unknown[]>() {
  const listeners = new Set<Listener<T>>()
  return {
    addListener: jest.fn((fn: Listener<T>) => listeners.add(fn)),
    removeListener: jest.fn((fn: Listener<T>) => listeners.delete(fn)),
    hasListener: jest.fn((fn: Listener<T>) => listeners.has(fn)),
    emit: (...args: T) => listeners.forEach((fn) => fn(...args)),
    __listeners: listeners,
  }
}

function buildStorage() {
  let store = new Map<string, unknown>()
  return {
    __reset: () => {
      store = new Map()
    },
    __snapshot: () => Object.fromEntries(store),
    set: jest.fn(
      (items: Record<string, unknown>, cb?: () => void): Promise<void> => {
        for (const [k, v] of Object.entries(items)) store.set(k, v)
        cb?.()
        return Promise.resolve()
      }
    ),
    get: jest.fn(
      (
        keys: string | string[] | Record<string, unknown> | null,
        cb?: (items: Record<string, unknown>) => void
      ): Promise<Record<string, unknown>> => {
        const out: Record<string, unknown> = {}
        if (keys === null || keys === undefined) {
          for (const [k, v] of store.entries()) out[k] = v
        } else if (typeof keys === "string") {
          if (store.has(keys)) out[keys] = store.get(keys)
        } else if (Array.isArray(keys)) {
          for (const k of keys) if (store.has(k)) out[k] = store.get(k)
        } else {
          for (const [k, defaultValue] of Object.entries(keys)) {
            out[k] = store.has(k) ? store.get(k) : defaultValue
          }
        }
        cb?.(out)
        return Promise.resolve(out)
      }
    ),
    remove: jest.fn(
      (keys: string | string[], cb?: () => void): Promise<void> => {
        const list = Array.isArray(keys) ? keys : [keys]
        list.forEach((k) => store.delete(k))
        cb?.()
        return Promise.resolve()
      }
    ),
  }
}

function buildAlarms() {
  let alarms: chrome.alarms.Alarm[] = []
  return {
    __reset: () => {
      alarms = []
    },
    create: jest.fn(
      (name: string, info: chrome.alarms.AlarmCreateInfo): Promise<void> => {
        alarms.push({
          name,
          scheduledTime: Date.now() + (info.delayInMinutes ?? 0) * 60_000,
          periodInMinutes: info.periodInMinutes,
        } as chrome.alarms.Alarm)
        return Promise.resolve()
      }
    ),
    getAll: jest.fn(
      (cb?: (alarms: chrome.alarms.Alarm[]) => void): Promise<chrome.alarms.Alarm[]> => {
        cb?.(alarms)
        return Promise.resolve(alarms)
      }
    ),
    clear: jest.fn(
      (name: string, cb?: (cleared: boolean) => void): Promise<boolean> => {
        const before = alarms.length
        alarms = alarms.filter((a) => a.name !== name)
        const cleared = alarms.length < before
        cb?.(cleared)
        return Promise.resolve(cleared)
      }
    ),
    onAlarm: makeEvent<[chrome.alarms.Alarm]>(),
  }
}

const storage = buildStorage()
const alarms = buildAlarms()

const chromeMock = {
  storage: {
    local: storage,
    onChanged: makeEvent<[Record<string, chrome.storage.StorageChange>]>(),
  },
  alarms,
  runtime: {
    onMessage: makeEvent<
      [unknown, chrome.runtime.MessageSender, (response: unknown) => void]
    >(),
    onMessageExternal: makeEvent<
      [unknown, chrome.runtime.MessageSender, (response: unknown) => void]
    >(),
    sendMessage: jest.fn(),
    lastError: undefined as chrome.runtime.LastError | undefined,
  },
  tabs: {
    get: jest.fn(),
    query: jest.fn(),
    onActivated: makeEvent<[chrome.tabs.TabActiveInfo]>(),
    onUpdated: makeEvent<[number, chrome.tabs.TabChangeInfo, chrome.tabs.Tab]>(),
    onRemoved: makeEvent<[number, chrome.tabs.TabRemoveInfo]>(),
  },
  windows: {
    WINDOW_ID_NONE: -1,
    onFocusChanged: makeEvent<[number]>(),
  },
  idle: {
    setDetectionInterval: jest.fn(),
    onStateChanged: makeEvent<[chrome.idle.IdleState]>(),
  },
}

;(globalThis as unknown as { chrome: typeof chromeMock }).chrome = chromeMock

beforeEach(() => {
  storage.__reset()
  alarms.__reset()
  jest.clearAllMocks()
})

export { chromeMock }
