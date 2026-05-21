import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
    ...options,
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(date))
}

export function formatPrice(amount: number, currency = 'JPY') {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat('ja-JP').format(num)
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateSlug(name: string) {
  const base = slugify(name)
  const random = Math.random().toString(36).substring(2, 6)
  return `${base || 'org'}-${random}`
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str
  return str.substring(0, length) + '...'
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export const ROLE_LABELS: Record<string, string> = {
  owner: 'オーナー',
  admin: '管理者',
  editor: '編集者',
  viewer: '閲覧者',
}

export const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-800',
  basic: 'bg-blue-100 text-blue-800',
  pro: 'bg-purple-100 text-purple-800',
  enterprise: 'bg-amber-100 text-amber-800',
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  seminar: 'セミナー',
  workshop: 'ワークショップ',
  course: '講座',
  other: 'その他',
}

export const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  active: '公開中',
  closed: '終了',
  archived: 'アーカイブ',
}

export const EVENT_VISIBILITY_LABELS: Record<string, string> = {
  public: "一般公開",
  unlisted: "限定公開",
  draft: "下書き",
}

export const SURVEY_CATEGORY_LABELS: Record<string, string> = {
  general: "一般",
  registration: "申し込み",
  pre_event: "事前",
  post_event: "事後",
}
