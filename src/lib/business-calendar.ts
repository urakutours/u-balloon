import type { Payload } from 'payload'

// ─── Types ───────────────────────────────────────────────────────────────

export type CalendarEntry = {
  isHoliday: boolean
  shippingAvailable: boolean
}

/** YYYY-MM-DD → CalendarEntry の Map */
export type CalendarMap = Map<string, CalendarEntry>

// ─── 内部ユーティリティ ────────────────────────────────────────────────

/**
 * Date を YYYY-MM-DD 文字列に変換する（ローカル日付ベース）。
 * ISO 変換を経由しないため UTC/JST のズレが起きない。
 */
export function formatDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── 1. Payload からカレンダーデータを取得 ────────────────────────────

/**
 * Payload Local API を使って business-calendar コレクションから
 * 指定期間のレコードを取得し CalendarMap を返す。
 *
 * - BusinessCalendar に登録のない日は Map に含まれない。
 * - date フィールドは Payload が ISO 文字列で返すため substring(0, 10) で YYYY-MM-DD に変換する。
 *
 * @example
 * const map = await fetchBusinessCalendarMap(payload, '2025-01-01', '2025-03-31')
 */
export async function fetchBusinessCalendarMap(
  payload: Payload,
  from: string,
  to: string,
): Promise<CalendarMap> {
  const entries = await payload.find({
    collection: 'business-calendar',
    where: {
      date: {
        greater_than_equal: from,
        less_than_equal: to,
      },
    },
    limit: 500,
    sort: 'date',
  })

  const map: CalendarMap = new Map()
  for (const entry of entries.docs) {
    // date フィールドは ISO 文字列 "2025-01-01T00:00:00.000Z" 等で返るため先頭10文字を使う
    const dateStr = (entry.date as string).substring(0, 10)
    map.set(dateStr, {
      isHoliday: entry.isHoliday as boolean,
      shippingAvailable: entry.shippingAvailable as boolean,
    })
  }

  return map
}

// ─── 2. 営業日判定 ────────────────────────────────────────────────────

/**
 * 指定日が営業日（発送可能日）かどうかを判定する。
 *
 * 判定ルール:
 * - CalendarMap に登録なし → 営業日扱い（既存挙動と一致）
 * - shippingAvailable === false → 非営業日
 * - それ以外 → 営業日
 *
 * 曜日による自動休業判定は行わない。BusinessCalendar レコードへの登録に委ねる。
 *
 * @example
 * isBusinessDay('2025-01-01', map) // 元旦がカレンダー登録済みなら false
 */
export function isBusinessDay(dateStr: string, calendarMap: CalendarMap): boolean {
  const entry = calendarMap.get(dateStr)
  if (!entry) return true // 登録なし = 営業日
  return entry.shippingAvailable !== false
}

// ─── 3. 正方向: N 営業日後 ─────────────────────────────────────────────

/**
 * baseDate から数えて N 営業日後の Date を返す（正方向）。
 * 銀行振込期限などで「発送予定日から○日後」を求める用途に使う。
 *
 * - baseDate 当日は 0 日目としてカウントしない（翌日から数える）
 * - days === 0 の場合は baseDate 自身を返す
 *
 * @example
 * addBusinessDays(new Date('2025-01-10'), 3, map)
 * // → 1/11, 1/12, 1/13 がそれぞれ営業日なら 2025-01-13 に相当する Date
 */
export function addBusinessDays(baseDate: Date, days: number, calendarMap: CalendarMap): Date {
  if (days === 0) return new Date(baseDate)
  let count = 0
  const current = new Date(baseDate)

  while (count < days) {
    current.setDate(current.getDate() + 1)
    if (isBusinessDay(formatDateStr(current), calendarMap)) {
      count++
    }
  }

  return current
}

// ─── 4. 逆方向: N 営業日前 ─────────────────────────────────────────────

/**
 * baseDate から遡って N 営業日前の Date を返す（逆方向）。
 * 「発送予定日 − N 営業日 = 銀行振込期限」の計算に使う。
 *
 * - baseDate 当日は 0 日目としてカウントしない（前日から遡る）
 * - days === 0 の場合は baseDate 自身を返す
 *
 * @example
 * subtractBusinessDays(new Date('2025-01-15'), 3, map)
 * // → 1/14, 1/13, 1/12 が営業日なら 2025-01-12 に相当する Date
 */
export function subtractBusinessDays(baseDate: Date, days: number, calendarMap: CalendarMap): Date {
  if (days === 0) return new Date(baseDate)
  let count = 0
  const current = new Date(baseDate)

  while (count < days) {
    current.setDate(current.getDate() - 1)
    if (isBusinessDay(formatDateStr(current), calendarMap)) {
      count++
    }
  }

  return current
}

// ─── 5. 非営業日なら翌営業日へ寄せる ────────────────────────────────

/**
 * date が営業日なら date をそのまま返し、
 * 非営業日なら次の営業日を返す（未来方向）。
 *
 * 最大 365 日先まで探索する。それ以上見つからない場合は元の date を返す。
 *
 * @example
 * nextBusinessDay(new Date('2025-01-01'), map)
 * // 元旦が非営業日なら 2025-01-02（またはその翌営業日）を返す
 */
export function nextBusinessDay(date: Date, calendarMap: CalendarMap): Date {
  const current = new Date(date)
  for (let i = 0; i < 365; i++) {
    if (isBusinessDay(formatDateStr(current), calendarMap)) {
      return current
    }
    current.setDate(current.getDate() + 1)
  }
  return new Date(date) // fallback: 見つからなければ元の日付
}

// ─── 6. 非営業日なら直前の営業日へ寄せる ─────────────────────────────

/**
 * date が営業日なら date をそのまま返し、
 * 非営業日なら直前の営業日を返す（過去方向）。
 *
 * 到着希望日から発送予定日を逆算し、発送予定日が非営業日だった場合に
 * 直前の営業日に寄せるための関数（T1.2 の scheduledShipDate 計算用）。
 *
 * 最大 365 日遡る。それ以上見つからない場合は元の date を返す。
 *
 * @example
 * previousBusinessDay(new Date('2025-01-13'), map)
 * // 1/13（月）が休業日なら 2025-01-10（金）を返す
 */
export function previousBusinessDay(date: Date, calendarMap: CalendarMap): Date {
  const current = new Date(date)
  for (let i = 0; i < 365; i++) {
    if (isBusinessDay(formatDateStr(current), calendarMap)) {
      return current
    }
    current.setDate(current.getDate() - 1)
  }
  return new Date(date) // fallback: 見つからなければ元の日付
}
