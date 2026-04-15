'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ===== TYPES =====
interface Habit {
  id: string
  name: string
  emoji: string
  color: string
  frequency: 'daily' | 'weekly'
  weeklyTarget: number
  streak: number
  bestStreak: number
  completions: Record<string, boolean>
  skippedDays: Record<string, boolean>
  createdAt: string
  xpPerCompletion: number
}

interface JournalEntry {
  mood: string
  text: string
}

interface UserData {
  habits: Habit[]
  totalXP: number
  streakFreezes: number
  maxStreakFreezes: number
  notificationEnabled: boolean
  morningReminderTime: string
  eveningReminderTime: string
  lastActiveDate: string
  onboardingComplete: boolean
  globalStreak: number
  bestGlobalStreak: number
  lastStreakDate: string
  streakFreezeUsed: Record<string, boolean>
  journalEntries: Record<string, JournalEntry>
  swRegistered: boolean
}

type Tab = 'home' | 'insights' | 'settings'

// ===== CONSTANTS =====
const DUO_GREEN = '#58CC02'
const DUO_GREEN_DARK = '#46A302'
const DUO_ORANGE = '#FF9600'
const DUO_YELLOW = '#FFC800'
const DUO_RED = '#FF4B4B'
const DUO_BLUE = '#1CB0F6'
const DUO_PURPLE = '#CE82FF'
const DUO_PINK = '#FF86D0'

const STORAGE_KEY = 'habitduo-data'

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DAY_NAMES_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// ===== DUOLINGO-STYLE NOTIFICATION MESSAGES =====
const MORNING_MESSAGES = [
  { title: 'HabitDuo ☀️', body: '¡Buenos días! Tus hábitos te esperan. ¡No los defraudes! 💪' },
  { title: '🔥 Tu racha te extraña', body: '¡Levantate y completá tus hábitos! Solo toma 5 minutos.' },
  { title: 'HabitDuo 🌅', body: 'Un nuevo día, una nueva oportunidad de ser mejor. ¡Vamos!' },
  { title: '💪 ¡Es hora!', body: 'Tus hábitos no se van a hacer solos. ¡Dale que dale!' },
  { title: 'HabitDuo 🎯', body: '¡Hoy es el día perfecto para cumplir todos tus hábitos!' },
  { title: '⏰ Recordá...', body: 'Los que tienen racha larga empezaron con un día. ¡Empezá hoy!' },
  { title: '🔥 La racha espera', body: '¡Cada día sin completar es un día perdido! Vamos 💪' },
  { title: 'HabitDuo 🏆', body: '¡Los campeones se entrenan cuando nadie los ve! Hacé tus hábitos.' },
]

const EVENING_MESSAGES = [
  { title: '⚠️ ¡Cuidado con la racha!', body: '¡Todavía tenés hábitos pendientes! No dejes que se apague el fuego 🔥' },
  { title: '🔥 Se apaga la racha...', body: '¡Quedan hábitos por completar! ¡Salvala ahora!' },
  { title: 'HabitDuo 🌙', body: '¡No te vayas a dormir sin completar! Tu yo del futuro te lo agradece.' },
  { title: '😰 Tu racha está en peligro', body: '¡Quedan pocos hábitos! Hacelos ahora, toma 2 minutos.' },
  { title: 'HabitDuo 🛡️', body: '¡No pierdas lo que construiste! Completá tus hábitos antes de dormir.' },
  { title: '⏰ Última chance', body: '¡El día se acaba y tus hábitos te esperan! ¡Dale! 💪' },
  { title: '🌙 ¿Ya completaste todo?', body: '¡Revisá tus hábitos! No quieras dormir con culpa 😤' },
  { title: '🔥 La racha no perdona', body: '¡Si no completás hoy, mañana empezás de cero! Vamos 💪' },
]

const URGENT_MESSAGES = [
  { title: '🚨 ¡ÚLTIMA CHANCE!', body: '¡Tu racha va a MORIR si no completás ahora! ¡No seas vago! 😤🔥' },
  { title: '💀 ¡SE ACABA EL TIEMPO!', body: '¡Completá tus hábitos AHORA o perdés tu racha de fuego! 🔥' },
  { title: '⚠️ ¡EMERGENCIA!', body: '¡Quedan minutos! ¡Tus hábitos te necesitan! ¡MOVERSE! 🏃💨' },
]

function getRandomMessage(messages: { title: string; body: string }[]): { title: string; body: string } {
  return messages[Math.floor(Math.random() * messages.length)]
}

// ===== UTILITY FUNCTIONS =====
function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
}

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getYesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return getDateStr(d)
}

function getWeekDates(): string[] {
  return getWeekDatesForDate(new Date())
}

function getWeekDatesForDate(date: Date): string[] {
  const dayOfWeek = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((dayOfWeek + 6) % 7))
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(getDateStr(d))
  }
  return dates
}

function getLast7Days(): string[] {
  const dates: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(getDateStr(d))
  }
  return dates
}

function getLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 50))
}

function getXPForLevel(level: number): number {
  return level * level * 50
}

// ===== SMART STREAK HELPERS =====

// Calculate remaining days in the week AFTER a given date (not including that date)
function getDaysRemainingInWeek(dateStr: string): number {
  const date = new Date(dateStr + 'T12:00:00')
  const dayOfWeek = date.getDay() // 0=Sun, 1=Mon, ...
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
  return daysUntilSunday
}

// Can a weekly habit be deferred ("Lo hago mañana") for a given date?
function canDeferHabit(habit: Habit, dateStr: string): boolean {
  if (habit.frequency !== 'weekly') return false
  if (habit.completions[dateStr]) return false // Already completed today
  const date = new Date(dateStr + 'T12:00:00')
  const weekDates = getWeekDatesForDate(date)
  const weekCompletions = weekDates.filter((d) => habit.completions[d]).length
  if (weekCompletions >= habit.weeklyTarget) return false // Target already met
  const remainingNeeded = habit.weeklyTarget - weekCompletions
  const daysRemaining = getDaysRemainingInWeek(dateStr) // Days AFTER today
  return remainingNeeded <= daysRemaining
}

// A weekly habit is "satisfied" for a day if: completed, target met, OR still has margin to complete
function isHabitSatisfiedForDay(habit: Habit, dateStr: string): boolean {
  if (habit.frequency === 'daily') {
    return !!habit.completions[dateStr]
  }
  // Weekly: satisfied if completed today
  if (habit.completions[dateStr]) return true
  // Weekly: satisfied if target already met this week
  const date = new Date(dateStr + 'T12:00:00')
  const weekDates = getWeekDatesForDate(date)
  const weekCompletions = weekDates.filter((d) => habit.completions[d]).length
  if (weekCompletions >= habit.weeklyTarget) return true
  // Weekly: satisfied if still has margin (remaining needed <= remaining days including today)
  const remainingNeeded = habit.weeklyTarget - weekCompletions
  const daysRemainingIncludingToday = getDaysRemainingInWeek(dateStr) + 1
  return remainingNeeded <= daysRemainingIncludingToday
}

// A day is "complete" for streak purposes if all habits are satisfied
function isDayCompleteForStreak(habits: Habit[], dateStr: string): boolean {
  if (habits.length === 0) return false
  return habits.every((h) => isHabitSatisfiedForDay(h, dateStr))
}

function getXPProgress(totalXP: number): number {
  const level = getLevel(totalXP)
  const currentLevelXP = getXPForLevel(level)
  const nextLevelXP = getXPForLevel(level + 1)
  if (nextLevelXP === currentLevelXP) return 100
  return Math.min(100, ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)
}

// ===== DEFAULT HABITS =====
function getDefaultHabits(): Habit[] {
  return [
    {
      id: generateId(),
      name: 'Correr',
      emoji: '🏃',
      color: DUO_ORANGE,
      frequency: 'weekly',
      weeklyTarget: 3,
      streak: 0,
      bestStreak: 0,
      completions: {},
      skippedDays: {},
      createdAt: getTodayStr(),
      xpPerCompletion: 25,
    },
    {
      id: generateId(),
      name: 'Gimnasio',
      emoji: '🏋️',
      color: DUO_BLUE,
      frequency: 'weekly',
      weeklyTarget: 3,
      streak: 0,
      bestStreak: 0,
      completions: {},
      skippedDays: {},
      createdAt: getTodayStr(),
      xpPerCompletion: 25,
    },
    {
      id: generateId(),
      name: 'Meditar',
      emoji: '🧘',
      color: DUO_PURPLE,
      frequency: 'daily',
      weeklyTarget: 7,
      streak: 0,
      bestStreak: 0,
      completions: {},
      skippedDays: {},
      createdAt: getTodayStr(),
      xpPerCompletion: 10,
    },
    {
      id: generateId(),
      name: 'Series en inglés',
      emoji: '📺',
      color: DUO_PINK,
      frequency: 'daily',
      weeklyTarget: 7,
      streak: 0,
      bestStreak: 0,
      completions: {},
      skippedDays: {},
      createdAt: getTodayStr(),
      xpPerCompletion: 10,
    },
  ]
}

function getDefaultUserData(): UserData {
  return {
    habits: getDefaultHabits(),
    totalXP: 0,
    streakFreezes: 0,
    maxStreakFreezes: 2,
    notificationEnabled: false,
    morningReminderTime: '09:00',
    eveningReminderTime: '20:00',
    lastActiveDate: getTodayStr(),
    onboardingComplete: false,
    globalStreak: 0,
    bestGlobalStreak: 0,
    lastStreakDate: '',
    streakFreezeUsed: {},
    journalEntries: {},
    swRegistered: false,
  }
}

// ===== LOCALSTORAGE =====
function loadData(): UserData {
  if (typeof window === 'undefined') return getDefaultUserData()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultUserData()
    const data = JSON.parse(raw) as UserData
    // Merge with defaults for any missing fields
    const defaults = getDefaultUserData()
    return {
      ...defaults,
      ...data,
      habits: (data.habits || defaults.habits).map((h) => ({
        ...defaults.habits[0],
        skippedDays: {},
        ...h,
        skippedDays: h.skippedDays || {},
      })),
      streakFreezeUsed: data.streakFreezeUsed || {},
      journalEntries: data.journalEntries || {},
      swRegistered: data.swRegistered || false,
    }
  } catch {
    return getDefaultUserData()
  }
}

function saveData(data: UserData) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Silently fail
  }
}

// ===== CONFETTI COMPONENT =====
function Confetti() {
  const colors = [DUO_GREEN, DUO_ORANGE, DUO_YELLOW, DUO_RED, DUO_BLUE, DUO_PURPLE, DUO_PINK]
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 1,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }))

  return (
    <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle absolute"
          style={{
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}

// ===== XP POPUP =====
function XPPopup({ xp, onDone }: { xp: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="animate-xp-float absolute -top-2 right-2 text-lg font-black text-duo-green z-10 pointer-events-none">
      +{xp} XP ⚡
    </div>
  )
}

// ===== STREAK TIMELINE =====
function StreakTimeline({ days, completions }: { days: string[]; completions: Record<string, boolean> }) {
  const today = getTodayStr()
  return (
    <div className="flex items-center gap-1">
      {days.map((day, i) => {
        const done = !!completions[day]
        const isFuture = day > today
        return (
          <div key={day} className="flex flex-col items-center gap-0.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                done
                  ? 'bg-duo-green text-white animate-dot-fill'
                  : isFuture
                  ? 'bg-gray-200 text-gray-400'
                  : 'bg-gray-300 text-gray-500'
              }`}
            >
              {done ? '✓' : ''}
            </div>
            <span className="text-[9px] text-gray-400 font-medium">{DAY_NAMES[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

// ===== HABIT CARD =====
function HabitCard({
  habit,
  todayStr,
  onComplete,
  onSkip,
  isCompleted,
  isSkipped,
  celebratingId,
}: {
  habit: Habit
  todayStr: string
  onComplete: (id: string) => void
  onSkip: (id: string) => void
  isCompleted: boolean
  isSkipped: boolean
  celebratingId: string | null
}) {
  const weekDates = getWeekDates()
  const weekCompletions = weekDates.filter((d) => habit.completions[d]).length
  const isCelebrating = celebratingId === habit.id

  // Smart streak: is this habit "needed" today for the streak?
  const isWeeklyTargetMet = habit.frequency === 'weekly' && weekCompletions >= habit.weeklyTarget
  const canDefer = canDeferHabit(habit, todayStr)
  const isUrgent = habit.frequency === 'weekly' && !isCompleted && !isWeeklyTargetMet && !canDefer
  // Has margin: weekly, not completed, target not met, but can still defer
  const hasMargin = habit.frequency === 'weekly' && !isCompleted && !isWeeklyTargetMet && canDefer
  const isOptionalToday = habit.frequency === 'weekly' && isWeeklyTargetMet && !isCompleted

  // Urgency indicator for weekly habits
  const remainingNeeded = habit.frequency === 'weekly' ? habit.weeklyTarget - weekCompletions : 0
  const daysLeftInWeek = (() => {
    const dayOfWeek = new Date(todayStr + 'T12:00:00').getDay()
    return dayOfWeek === 0 ? 0 : 7 - dayOfWeek // days AFTER today
  })()

  return (
    <div
      className={`animate-slide-up rounded-2xl bg-white shadow-md border overflow-hidden transition-all duration-300 ${
        isSkipped ? 'border-gray-200 opacity-75' : isUrgent ? 'border-orange-200' : 'border-gray-100'
      }`}
      style={{ animationDelay: `${Math.random() * 0.15}s` }}
    >
      {/* Color accent bar */}
      <div className="h-1.5" style={{ backgroundColor: isSkipped ? '#D1D5DB' : habit.color }} />

      <div className="p-4">
        {/* Header: emoji + name + streak */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className={`text-3xl transition-all ${isSkipped ? 'grayscale opacity-50' : ''}`} role="img" aria-label={habit.name}>
              {habit.emoji}
            </span>
            <div>
              <h3 className={`font-bold text-base ${isSkipped ? 'text-gray-400' : 'text-gray-800'}`}>{habit.name}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-gray-400">
                  {habit.frequency === 'daily' ? 'Todos los días' : `Mín. ${habit.weeklyTarget}/semana`}
                </p>
                {isSkipped && (
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    → Mañana
                  </span>
                )}
                {isOptionalToday && (
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                    ✓ Meta cumplida
                  </span>
                )}
                {isUrgent && (
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full animate-pulse">
                    ⚠️ Urgente hoy
                  </span>
                )}
                {hasMargin && !isSkipped && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                    {remainingNeeded} en {daysLeftInWeek + 1} días
                  </span>
                )}
                {!isCompleted && habit.frequency === 'daily' && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                    Necesario hoy
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-full">
            <span className="text-sm" aria-hidden="true">🔥</span>
            <span className="text-sm font-black text-orange-500">{habit.streak}</span>
          </div>
        </div>

        {/* Weekly progress dots */}
        <div className="mb-3">
          <StreakTimeline days={weekDates} completions={habit.completions} />
        </div>

        {/* Progress bar for weekly */}
        {habit.frequency === 'weekly' && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progreso semanal</span>
              <span className="font-bold" style={{ color: weekCompletions >= habit.weeklyTarget ? DUO_GREEN : isUrgent ? DUO_RED : habit.color }}>
                {weekCompletions}/{habit.weeklyTarget} {weekCompletions >= habit.weeklyTarget ? '✓' : ''}
              </span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(100, (weekCompletions / habit.weeklyTarget) * 100)}%`,
                  backgroundColor: weekCompletions >= habit.weeklyTarget ? DUO_GREEN : isUrgent ? DUO_RED : habit.color,
                }}
              />
            </div>
            {isUrgent && (
              <p className="text-[10px] text-red-500 font-bold mt-1">
                ¡Te quedan {daysLeftInWeek + 1} día{daysLeftInWeek + 1 !== 1 ? 's' : ''} y necesitás {remainingNeeded}!
              </p>
            )}
            {weekCompletions >= habit.weeklyTarget && (
              <p className="text-[10px] text-duo-green font-bold mt-1">
                {weekCompletions === habit.weeklyTarget ? '¡Meta alcanzada!' : `¡${weekCompletions - habit.weeklyTarget} extra! 🌟`}
              </p>
            )}
          </div>
        )}

        {/* Buttons */}
        {isSkipped ? (
          <div className="flex gap-2">
            <button
              onClick={() => onComplete(habit.id)}
              className="flex-1 py-3 rounded-xl font-bold text-base transition-all duration-200 active:scale-95 text-white shadow-lg hover:shadow-xl"
              style={{
                backgroundColor: habit.color,
                boxShadow: `0 4px 0 ${habit.color}dd, 0 6px 12px ${habit.color}33`,
              }}
              aria-label={`Completar ${habit.name}`}
            >
              COMPLETAR
            </button>
            <div className="flex items-center justify-center px-4 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium">
              → Mañana
            </div>
          </div>
        ) : isCompleted ? (
          <div className="relative">
            {isCelebrating && <XPPopup xp={habit.xpPerCompletion} onDone={() => {}} />}
            <button
              className="w-full py-3 rounded-xl font-bold text-base bg-duo-green/10 text-duo-green border-2 border-duo-green/30"
              disabled
              aria-label={`${habit.name} completado`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="animate-bounce-in inline-block">✓</span>
                ¡Completado!
              </span>
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onComplete(habit.id)}
              className="flex-1 py-3 rounded-xl font-bold text-base transition-all duration-200 active:scale-95 text-white shadow-lg hover:shadow-xl active:shadow-md"
              style={{
                backgroundColor: habit.color,
                boxShadow: `0 4px 0 ${habit.color}dd, 0 6px 12px ${habit.color}33`,
              }}
              aria-label={`Completar ${habit.name}`}
            >
              COMPLETAR
            </button>
            {canDefer && (
              <button
                onClick={() => onSkip(habit.id)}
                className="py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200"
                aria-label={`Posponer ${habit.name} para mañana`}
              >
                → Mañana
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== WEEKLY OVERVIEW =====
function WeeklyOverview({ habits }: { habits: Habit[] }) {
  const weekDates = getWeekDates()
  const today = getTodayStr()

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
      <h3 className="font-bold text-gray-700 mb-3 text-sm">📅 Resumen de la semana</h3>
      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map((day, i) => {
          const isCurrentDay = day === today
          // Smart logic: count habits that are actually completed vs satisfied for streak
          const completedCount = habits.filter((h) => h.completions[day]).length
          const satisfiedCount = habits.filter((h) => isHabitSatisfiedForDay(h, day)).length
          const totalForDay = habits.length
          // A day is "all done" when all habits are satisfied (smart streak logic)
          const allSatisfied = satisfiedCount === totalForDay && totalForDay > 0
          const allActuallyCompleted = completedCount === totalForDay && totalForDay > 0
          const someSatisfied = satisfiedCount > 0 && !allSatisfied
          const isFuture = day > today

          let bgColor = 'bg-gray-200'
          let textColor = 'text-gray-400'
          if (!isFuture) {
            if (allActuallyCompleted) { bgColor = 'bg-duo-green'; textColor = 'text-white' }
            else if (allSatisfied) { bgColor = 'bg-emerald-400'; textColor = 'text-white' }
            else if (someSatisfied) { bgColor = 'bg-duo-yellow'; textColor = 'text-yellow-800' }
            else { bgColor = 'bg-red-100'; textColor = 'text-red-400' }
          }

          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-medium ${isCurrentDay ? 'text-duo-green font-bold' : 'text-gray-400'}`}>
                {DAY_NAMES[i]}
              </span>
              <div
                className={`w-9 h-9 ${bgColor} rounded-xl flex items-center justify-center text-xs font-bold ${textColor} transition-all duration-300 ${
                  isCurrentDay ? 'ring-2 ring-duo-green ring-offset-1' : ''
                }`}
              >
                {allActuallyCompleted && !isFuture ? '✓' : allSatisfied && !isFuture ? '✓' : someSatisfied ? `${satisfiedCount}` : isFuture ? '' : '·'}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[9px] text-gray-400 mt-2 text-center">
        ✓ = Día al día (diarios + semanales con margen o cumplidos)
      </p>
    </div>
  )
}

// ===== JOURNAL CARD =====
const MOODS = [
  { emoji: '🤩', label: 'Increíble', color: '#FFD700' },
  { emoji: '😊', label: 'Bien', color: DUO_GREEN },
  { emoji: '😐', label: 'Normal', color: DUO_YELLOW },
  { emoji: '😔', label: 'Mal', color: DUO_ORANGE },
  { emoji: '😡', label: 'Terrible', color: DUO_RED },
]

function JournalCard({
  todayStr,
  entry,
  onSave,
}: {
  todayStr: string
  entry: JournalEntry | undefined
  onSave: (date: string, entry: JournalEntry) => void
}) {
  const [isEditing, setIsEditing] = useState(!entry?.text && !entry?.mood)
  const [selectedMood, setSelectedMood] = useState(entry?.mood || '')
  const [text, setText] = useState(entry?.text || '')

  const currentMood = MOODS.find((m) => m.emoji === selectedMood)

  const handleSave = () => {
    if (!selectedMood && !text.trim()) return
    onSave(todayStr, { mood: selectedMood, text: text.trim() })
    setIsEditing(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-slide-up">
      <div className="h-1.5 bg-gradient-to-r from-purple-400 to-pink-400" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-700 text-sm">📝 ¿Cómo te sentiste hoy?</h3>
          {!isEditing && entry && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Editar
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            {/* Mood selector */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Tu estado de ánimo</p>
              <div className="flex gap-2 justify-center">
                {MOODS.map((m) => (
                  <button
                    key={m.emoji}
                    onClick={() => setSelectedMood(m.emoji)}
                    className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all active:scale-90 ${
                      selectedMood === m.emoji
                        ? 'bg-purple-50 ring-2 ring-purple-300 scale-110'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className={`text-[9px] font-medium ${selectedMood === m.emoji ? 'text-purple-600' : 'text-gray-400'}`}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Text input */}
            <div>
              <p className="text-xs text-gray-400 mb-1">Notas del día (opcional)</p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="¿Qué pasó hoy? ¿Cómo te fue con tus hábitos?"
                className="w-full px-3 py-2.5 rounded-xl bg-gray-100 border-0 text-gray-700 text-sm font-medium focus:ring-2 focus:ring-purple-300 focus:bg-white transition-all resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-[10px] text-gray-300 text-right mt-0.5">{text.length}/500</p>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!selectedMood && !text.trim()}
              className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                selectedMood || text.trim()
                  ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Guardar
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Display saved entry */}
            <div className="flex items-center gap-3">
              {currentMood && (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: currentMood.color + '20' }}
                >
                  {selectedMood}
                </div>
              )}
              <div className="flex-1">
                {currentMood && (
                  <p className="font-bold text-sm text-gray-700">{currentMood.label}</p>
                )}
                {entry?.text ? (
                  <p className="text-xs text-gray-500 line-clamp-2">{entry.text}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic">Sin notas</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== JOURNAL HISTORY =====
function JournalHistory({ journalEntries }: { journalEntries: Record<string, JournalEntry> }) {
  const sortedEntries = Object.entries(journalEntries)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)

  if (sortedEntries.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100 text-center">
        <p className="text-3xl mb-2">📝</p>
        <p className="text-sm text-gray-400">Aún no tienes entradas en tu diario</p>
        <p className="text-xs text-gray-300 mt-1">Registra cómo te sientes cada día desde la pantalla de inicio</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
      <h3 className="font-bold text-gray-700 mb-3 text-sm">📝 Diario reciente</h3>
      <div className="space-y-2">
        {sortedEntries.map(([date, entry]) => {
          const moodObj = MOODS.find((m) => m.emoji === entry.mood)
          const d = new Date(date + 'T12:00:00')
          const dayLabel = DAY_NAMES_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1]
          const dayNum = d.getDate()
          const monthLabel = MONTH_NAMES[d.getMonth()]
          return (
            <div key={date} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: moodObj ? moodObj.color + '20' : '#f3f4f6' }}
              >
                {entry.mood || '📝'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium">
                  {dayLabel} {dayNum} de {monthLabel}
                </p>
                {entry.text ? (
                  <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{entry.text}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic mt-0.5">{moodObj?.label || 'Sin notas'}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===== INSIGHTS SCREEN =====
function InsightsScreen({ userData }: { userData: UserData }) {
  const last7Days = getLast7Days()
  const level = getLevel(userData.totalXP)
  const completionRates = last7Days.map((day) => {
    const total = userData.habits.length
    if (total === 0) return 0
    const completed = userData.habits.filter((h) => h.completions[day]).length
    return Math.round((completed / total) * 100)
  })

  // Last 30 days
  const last30Days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    last30Days.push(getDateStr(d))
  }
  const totalPossible = last30Days.length * userData.habits.length
  const totalCompleted30 = last30Days.reduce((acc, day) => {
    return acc + userData.habits.filter((h) => h.completions[day]).length
  }, 0)
  const completionRate30 = totalPossible > 0 ? Math.round((totalCompleted30 / totalPossible) * 100) : 0

  // === NEW ANALYTICS ===

  // a) Hábito más difícil / más fácil
  const habitRates = userData.habits.map((habit) => {
    const completed = last30Days.filter((d) => habit.completions[d]).length
    const rate = last30Days.length > 0 ? Math.round((completed / last30Days.length) * 100) : 0
    return { habit, rate, completed }
  })
  const hardestHabit = habitRates.length > 0 ? habitRates.reduce((a, b) => a.rate <= b.rate ? a : b) : null
  const easiestHabit = habitRates.length > 0 ? habitRates.reduce((a, b) => a.rate >= b.rate ? a : b) : null

  // b) Tendencia semanal
  const getWeekCompletionRate = (weekOffset: number) => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayThisWeek = new Date(today)
    mondayThisWeek.setDate(today.getDate() - ((dayOfWeek + 6) % 7))
    const mondayTarget = new Date(mondayThisWeek)
    mondayTarget.setDate(mondayThisWeek.getDate() + weekOffset * 7)
    const weekDates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayTarget)
      d.setDate(mondayTarget.getDate() + i)
      if (d <= new Date()) {
        weekDates.push(getDateStr(d))
      }
    }
    if (weekDates.length === 0 || userData.habits.length === 0) return 0
    const completed = weekDates.reduce((acc, day) => {
      return acc + userData.habits.filter((h) => h.completions[day]).length
    }, 0)
    const total = weekDates.length * userData.habits.length
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }
  const thisWeekRate = getWeekCompletionRate(0)
  const lastWeekRate = getWeekCompletionRate(-1)
  const weekDiff = thisWeekRate - lastWeekRate

  // c) Tu mejor día
  const dayCompletionRates = [0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
    const datesForDay = last30Days.filter((d) => {
      const date = new Date(d + 'T12:00:00')
      const jsDay = date.getDay()
      return (jsDay === 0 ? 6 : jsDay - 1) === dayIdx
    })
    if (datesForDay.length === 0 || userData.habits.length === 0) return { dayIdx, rate: 0, count: 0 }
    const completed = datesForDay.reduce((acc, day) => {
      return acc + userData.habits.filter((h) => h.completions[day]).length
    }, 0)
    const total = datesForDay.length * userData.habits.length
    return { dayIdx, rate: Math.round((completed / total) * 100), count: datesForDay.length }
  })
  const bestDay = dayCompletionRates.reduce((a, b) => a.rate >= b.rate ? a : b)

  // d) Correlación ánimo-hábitos
  const goodMoods = ['🤩', '😊']
  const badMoods = ['😔', '😡']
  const journalDates = Object.keys(userData.journalEntries)
  const goodMoodDates = journalDates.filter((d) => goodMoods.includes(userData.journalEntries[d].mood))
  const badMoodDates = journalDates.filter((d) => badMoods.includes(userData.journalEntries[d].mood))

  const calcMoodCompletionRate = (dates: string[]) => {
    if (dates.length === 0 || userData.habits.length === 0) return 0
    const completed = dates.reduce((acc, day) => {
      return acc + userData.habits.filter((h) => h.completions[day]).length
    }, 0)
    const total = dates.length * userData.habits.length
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }
  const goodMoodRate = calcMoodCompletionRate(goodMoodDates)
  const badMoodRate = calcMoodCompletionRate(badMoodDates)

  // e) Racha sin fallar (consecutive days where all required habits satisfied)
  const calculatePerfectStreak = () => {
    if (userData.habits.length === 0) return 0
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = getDateStr(d)
      const dayComplete = isDayCompleteForStreak(userData.habits, dateStr)
      if (dayComplete) {
        streak++
      } else {
        // If today and not all completed yet, don't break — check yesterday
        if (i === 0) continue
        break
      }
    }
    return streak
  }
  const perfectStreak = calculatePerfectStreak()

  // f) Last 8 weeks trend chart
  const weeklyTrendData: { label: string; rate: number }[] = []
  for (let w = 7; w >= 0; w--) {
    const rate = getWeekCompletionRate(-w)
    weeklyTrendData.push({ label: `Sem ${8 - w}`, rate })
  }

  const getBarColor = (rate: number) => {
    if (rate >= 80) return DUO_GREEN
    if (rate >= 50) return DUO_YELLOW
    if (rate >= 25) return DUO_ORANGE
    if (rate > 0) return DUO_RED
    return '#E5E5E5'
  }

  return (
    <div className="animate-tab-enter space-y-4 pb-6">

      {/* ===== NEW ANALYTICS SECTION ===== */}

      {/* a) Hábito más difícil / más fácil */}
      {hardestHabit && easiestHabit && userData.habits.length > 1 && (
        <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-3 text-sm">🎯 Dificultad de hábitos</h3>
          <p className="text-xs text-gray-400 mb-3">Tasa de completado en los últimos 30 días</p>
          <div className="space-y-3">
            {hardestHabit && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔴</span>
                    <span className="text-sm font-bold text-gray-700">Más difícil</span>
                  </div>
                  <span className="text-sm font-black text-red-500">{hardestHabit.rate}%</span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span>{hardestHabit.habit.emoji}</span>
                  <span className="text-sm text-gray-600">{hardestHabit.habit.name}</span>
                </div>
                <div className="h-2.5 bg-red-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, hardestHabit.rate)}%`, backgroundColor: DUO_RED }}
                  />
                </div>
              </div>
            )}
            {easiestHabit && (
              <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🟢</span>
                    <span className="text-sm font-bold text-gray-700">Más fácil</span>
                  </div>
                  <span className="text-sm font-black text-duo-green">{easiestHabit.rate}%</span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span>{easiestHabit.habit.emoji}</span>
                  <span className="text-sm text-gray-600">{easiestHabit.habit.name}</span>
                </div>
                <div className="h-2.5 bg-green-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, easiestHabit.rate)}%`, backgroundColor: DUO_GREEN }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* b) Tendencia semanal */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-1 text-sm">📈 Tendencia semanal</h3>
        <p className="text-xs text-gray-400 mb-3">Comparación con la semana pasada</p>
        <div className="flex items-center justify-center gap-3 py-2">
          <div className="text-center">
            <p className="text-3xl font-black text-gray-800">{thisWeekRate}%</p>
            <p className="text-xs text-gray-400">Esta semana</p>
          </div>
          <div className="flex flex-col items-center">
            {weekDiff > 0 ? (
              <span className="text-2xl font-black text-duo-green">↑ {weekDiff}%</span>
            ) : weekDiff < 0 ? (
              <span className="text-2xl font-black text-red-500">↓ {Math.abs(weekDiff)}%</span>
            ) : (
              <span className="text-2xl font-black text-gray-400">= 0%</span>
            )}
            <p className="text-[10px] text-gray-400">vs semana pasada</p>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="flex-1 p-2 rounded-xl bg-gray-50 text-center">
            <p className="text-lg font-bold text-gray-600">{lastWeekRate}%</p>
            <p className="text-[10px] text-gray-400">Semana pasada</p>
          </div>
          <div className="flex-1 p-2 rounded-xl bg-duo-green/10 text-center">
            <p className="text-lg font-bold text-duo-green">{thisWeekRate}%</p>
            <p className="text-[10px] text-gray-400">Esta semana</p>
          </div>
        </div>
      </div>

      {/* c) Tu mejor día */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-1 text-sm">🌟 Tu mejor día</h3>
        <p className="text-xs text-gray-400 mb-3">Día de la semana con mayor tasa de completado (últimos 30 días)</p>
        <div className="flex items-center gap-3 justify-center py-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md"
            style={{ backgroundColor: DUO_GREEN }}
          >
            {DAY_NAMES[bestDay.dayIdx]}
          </div>
          <div>
            <p className="text-2xl font-black text-gray-800">{DAY_NAMES_FULL[bestDay.dayIdx]}</p>
            <p className="text-sm text-gray-400">
              Promedio: <span className="font-bold text-duo-green">{bestDay.rate}%</span>
            </p>
          </div>
        </div>
      </div>

      {/* d) Correlación ánimo-hábitos */}
      {journalDates.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-1 text-sm">🧠 Ánimo y hábitos</h3>
          <p className="text-xs text-gray-400 mb-3">¿Cómo afecta tu ánimo a tus hábitos?</p>
          <div className="flex gap-3">
            <div className="flex-1 p-3 rounded-xl bg-green-50 border border-green-100 text-center">
              <div className="text-2xl mb-1">😊</div>
              <p className="text-xs text-gray-500 mb-1">Buen ánimo</p>
              <p className="text-xl font-black text-duo-green">{goodMoodRate}%</p>
              <p className="text-[10px] text-gray-400">{goodMoodDates.length} días</p>
              <div className="h-2 bg-green-100 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(4, goodMoodRate)}%`, backgroundColor: DUO_GREEN }}
                />
              </div>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-red-50 border border-red-100 text-center">
              <div className="text-2xl mb-1">😔</div>
              <p className="text-xs text-gray-500 mb-1">Mal ánimo</p>
              <p className="text-xl font-black text-red-500">{badMoodRate}%</p>
              <p className="text-[10px] text-gray-400">{badMoodDates.length} días</p>
              <div className="h-2 bg-red-100 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(4, badMoodRate)}%`, backgroundColor: DUO_RED }}
                />
              </div>
            </div>
          </div>
          {goodMoodRate > 0 && badMoodRate > 0 && goodMoodRate - badMoodRate > 10 && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              💡 Completas <span className="font-bold text-duo-green">{goodMoodRate - badMoodRate}% más</span> cuando estás de buen ánimo
            </p>
          )}
        </div>
      )}

      {/* e) Racha sin fallar */}
      <div className="bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium">RACHA PERFECTA</p>
            <p className="text-4xl font-black">{perfectStreak}</p>
            <p className="text-white/70 text-xs">días sin fallar ningún hábito</p>
          </div>
          <div className="text-5xl animate-fire-dance">💎</div>
        </div>
        {perfectStreak >= 7 && (
          <div className="mt-3 flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
            <span>🏆</span>
            <span className="text-sm font-medium">
              {perfectStreak >= 30 ? '¡Un mes perfecto!' : perfectStreak >= 14 ? '¡Dos semanas perfectas!' : '¡Una semana perfecta!'}
            </span>
          </div>
        )}
      </div>

      {/* f) Weekly Trend Chart - Last 8 weeks */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-1 text-sm">📊 Tendencia semanal</h3>
        <p className="text-xs text-gray-400 mb-3">Últimas 8 semanas</p>
        <div className="flex items-end gap-1.5" style={{ height: '140px' }}>
          {weeklyTrendData.map((week, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-gray-500">{week.rate}%</span>
              <div className="w-full relative" style={{ height: '100px' }}>
                <div
                  className="absolute bottom-0 w-full rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${Math.max(4, week.rate)}%`,
                    backgroundColor: getBarColor(week.rate),
                    minHeight: '4px',
                  }}
                />
              </div>
              <span className="text-[8px] font-medium text-gray-400">{week.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DUO_GREEN }} />
            <span className="text-[9px] text-gray-400">≥80%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DUO_YELLOW }} />
            <span className="text-[9px] text-gray-400">≥50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DUO_ORANGE }} />
            <span className="text-[9px] text-gray-400">≥25%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DUO_RED }} />
            <span className="text-[9px] text-gray-400">&lt;25%</span>
          </div>
        </div>
      </div>

      {/* ===== EXISTING STATS (kept from original) ===== */}

      {/* Level & XP Card */}
      <div className="bg-gradient-to-br from-duo-green to-green-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-black">
              {level}
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium">NIVEL</p>
              <p className="text-lg font-black">{userData.totalXP} XP total</p>
            </div>
          </div>
          <div className="text-3xl animate-fire-dance">⚡</div>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-white/70 mb-1">
            <span>Nivel {level}</span>
            <span>Nivel {level + 1}</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-500"
              style={{ width: `${getXPProgress(userData.totalXP)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Streak Card */}
      <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium">RACHA ACTUAL</p>
            <p className="text-4xl font-black">{userData.globalStreak}</p>
            <p className="text-white/70 text-xs">días cumpliendo lo necesario</p>
            <p className="text-white/50 text-[10px] mt-0.5">Diarios: cada día · Semanales: con margen o cumplidos</p>
          </div>
          <div className="text-5xl animate-fire-dance">🔥</div>
          <div className="text-right">
            <p className="text-white/70 text-xs font-medium">MEJOR RACHA</p>
            <p className="text-2xl font-black">{userData.bestGlobalStreak}</p>
            <p className="text-white/70 text-xs">días</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
          <span>🧊</span>
          <span className="text-sm font-medium">
            {userData.streakFreezes} de {userData.maxStreakFreezes} protecciones
          </span>
        </div>
      </div>

      {/* Completion Rate */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-1 text-sm">📈 Tasa de completado</h3>
        <p className="text-xs text-gray-400 mb-3">Últimos 30 días</p>
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#E5E5E5"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={DUO_GREEN}
                strokeWidth="3"
                strokeDasharray={`${completionRate30}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-gray-700">
              {completionRate30}%
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              <span className="font-bold text-duo-green">{totalCompleted30}</span> de {totalPossible} hábitos completados
            </p>
          </div>
        </div>
      </div>

      {/* Last 7 Days Bar Chart */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-3 text-sm">📊 Últimos 7 días</h3>
        <div className="flex items-end gap-2 h-32">
          {completionRates.map((rate, i) => {
            const isToday = i === completionRates.length - 1
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-gray-500">{rate}%</span>
                <div
                  className="w-full rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${Math.max(4, rate)}%`,
                    backgroundColor: isToday ? DUO_GREEN : rate >= 80 ? DUO_GREEN : rate >= 50 ? DUO_YELLOW : rate > 0 ? DUO_ORANGE : '#E5E5E5',
                    minHeight: '4px',
                  }}
                />
                <span className={`text-[10px] font-medium ${isToday ? 'text-duo-green font-bold' : 'text-gray-400'}`}>
                  {DAY_NAMES[new Date().getDay() === 0 ? 6 : new Date().getDay() - 6 + i] || DAY_NAMES[(i + new Date().getDay()) % 7]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-habit stats */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-3 text-sm">🎯 Estadísticas por hábito</h3>
        <div className="space-y-3">
          {userData.habits.map((habit) => {
            const totalCompletions = Object.keys(habit.completions).length
            const habit30Days = last30Days.filter((d) => habit.completions[d]).length
            const rate = last30Days.length > 0 ? Math.round((habit30Days / last30Days.length) * 100) : 0
            return (
              <div key={habit.id} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50">
                <span className="text-2xl">{habit.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-700">{habit.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>🔥 {habit.streak} racha</span>
                    <span>⭐ {habit.bestStreak} mejor</span>
                    <span>✅ {totalCompletions} total</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold" style={{ color: habit.color }}>{rate}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ===== DATA IMPORT BUTTON =====
function DataImportButton({ setUserData }: { setUserData: React.Dispatch<React.SetStateAction<UserData>> }) {
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateUserData = (data: unknown): data is UserData => {
    if (!data || typeof data !== 'object') return false
    const d = data as Record<string, unknown>
    if (!Array.isArray(d.habits)) return false
    if (typeof d.totalXP !== 'number') return false
    // Basic structure check
    return true
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (!validateUserData(parsed)) {
          setImportError('El archivo no tiene el formato correcto de HabitDuo')
          setShowImportConfirm(false)
          return
        }
        // Store parsed data for confirmation
        setShowImportConfirm(true)
        ;(window as unknown as Record<string, unknown>).__habitduoImportData = parsed
      } catch {
        setImportError('No se pudo leer el archivo. Asegúrate de que es un JSON válido.')
        setShowImportConfirm(false)
      }
    }
    reader.readAsText(file)
    // Reset file input so the same file can be selected again
    e.target.value = ''
  }

  const confirmImport = () => {
    const importData = (window as unknown as Record<string, unknown>).__habitduoImportData as UserData
    if (!importData) return
    // Merge with defaults for any missing fields
    const defaults = getDefaultUserData()
    const merged: UserData = {
      ...defaults,
      ...importData,
      habits: importData.habits || defaults.habits,
      streakFreezeUsed: importData.streakFreezeUsed || {},
      journalEntries: importData.journalEntries || {},
    }
    saveData(merged)
    setUserData(merged)
    setShowImportConfirm(false)
    // Reload page so data takes effect everywhere
    setTimeout(() => window.location.reload(), 300)
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Seleccionar archivo de respaldo"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-3 rounded-xl bg-duo-blue text-white font-bold text-sm transition-all active:scale-95 hover:bg-duo-blue/90"
        style={{ boxShadow: '0 4px 0 #1890d0' }}
      >
        📥 Importar datos
      </button>
      {importError && (
        <p className="text-xs text-red-500 mt-1">{importError}</p>
      )}

      {/* Import confirmation dialog */}
      {showImportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={() => setShowImportConfirm(false)}>
          <div
            className="bg-white rounded-3xl p-6 text-center animate-bounce-in max-w-xs w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-lg font-black text-gray-800 mb-2">¿Importar datos?</h2>
            <p className="text-sm text-gray-500 mb-4">
              Esto reemplazará todos tus datos actuales con los del archivo importado. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowImportConfirm(false)
                  ;(window as unknown as Record<string, unknown>).__habitduoImportData = null
                }}
                className="flex-1 py-2.5 rounded-xl bg-gray-200 text-gray-600 font-bold text-sm active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmImport}
                className="flex-1 py-2.5 rounded-xl bg-duo-blue text-white font-bold text-sm active:scale-95 transition-all"
              >
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ===== SETTINGS SCREEN =====
function SettingsScreen({
  userData,
  setUserData,
  onAddHabit,
  onEditHabit,
  onDeleteHabit,
  onResetData,
  onRequestNotification,
}: {
  userData: UserData
  setUserData: React.Dispatch<React.SetStateAction<UserData>>
  onAddHabit: () => void
  onEditHabit: (habit: Habit) => void
  onDeleteHabit: (id: string) => void
  onResetData: () => void
  onRequestNotification: () => void
}) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  return (
    <div className="animate-tab-enter space-y-4 pb-6">
      {/* Notifications */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-3 text-sm">🔔 Notificaciones estilo Duolingo</h3>
        <p className="text-xs text-gray-400 mb-3">Recordatorios intensos para que no escapes de tus hábitos</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Activar notificaciones</p>
              <p className="text-xs text-gray-400">Mañana, noche y urgente antes de medianoche</p>
            </div>
            <button
              onClick={onRequestNotification}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                userData.notificationEnabled
                  ? 'bg-duo-green text-white'
                  : 'bg-orange-400 text-white shadow-md'
              }`}
            >
              {userData.notificationEnabled ? '✓ Activado' : '🔔 Activar'}
            </button>
          </div>

          {userData.notificationEnabled && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">☀️ Recordatorio mañana</p>
                  <p className="text-xs text-gray-400">Empezá el día bien</p>
                </div>
                <input
                  type="time"
                  value={userData.morningReminderTime}
                  onChange={(e) => {
                    setUserData((prev) => {
                      const next = { ...prev, morningReminderTime: e.target.value }
                      saveData(next)
                      return next
                    })
                  }}
                  className="bg-gray-100 rounded-lg px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-duo-green"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">🌙 Recordatorio noche</p>
                  <p className="text-xs text-gray-400">Antes de que se acabe el día</p>
                </div>
                <input
                  type="time"
                  value={userData.eveningReminderTime}
                  onChange={(e) => {
                    setUserData((prev) => {
                      const next = { ...prev, eveningReminderTime: e.target.value }
                      saveData(next)
                      return next
                    })
                  }}
                  className="bg-gray-100 rounded-lg px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-duo-green"
                />
              </div>
              <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">🚨</span>
                  <p className="text-xs font-bold text-orange-600">Recordatorio urgente: 23:30</p>
                </div>
                <p className="text-[10px] text-orange-400">Si te quedan hábitos pendientes a las 23:30, te mandamos una notificación intensa. No vas a poder ignorarla.</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">💪</span>
                  <p className="text-xs font-bold text-blue-600">Nudge cada 45 min</p>
                </div>
                <p className="text-[10px] text-blue-400">Si ya completaste algunos pero faltan otros, te recordamos los que quedan. Como Duolingo, pero para hábitos.</p>
              </div>
            </>
          )}

          {!userData.notificationEnabled && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100">
              <p className="text-xs text-red-600 font-bold">⚠️ Sin notificaciones vas a perder la racha</p>
              <p className="text-[10px] text-red-400 mt-1">Las notificaciones son la clave para mantener hábitos. Duolingo lo sabe, por eso son tan intensas.</p>
            </div>
          )}

          {userData.swRegistered && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-duo-green font-bold">✓ Service Worker activo</span>
              <span className="text-[10px] text-gray-300">|</span>
              <span className="text-[10px] text-gray-400">Notificaciones funcionan en segundo plano</span>
            </div>
          )}
        </div>
      </div>

      {/* Manage habits */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-3 text-sm">🎯 Gestionar hábitos</h3>
        <div className="space-y-2">
          {userData.habits.map((habit) => (
            <div key={habit.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 group">
              <span className="text-xl">{habit.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-700">{habit.name}</p>
                <p className="text-xs text-gray-400">
                  {habit.frequency === 'daily' ? 'Diario' : `Mín. ${habit.weeklyTarget}/semana`} · {habit.xpPerCompletion} XP
                </p>
              </div>
              <button
                onClick={() => onEditHabit(habit)}
                className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-400"
                aria-label={`Editar ${habit.name}`}
              >
                ✏️
              </button>
              <button
                onClick={() => onDeleteHabit(habit.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500"
                aria-label={`Eliminar ${habit.name}`}
              >
                🗑️
              </button>
            </div>
          ))}
          <button
            onClick={onAddHabit}
            className="w-full py-3 rounded-xl border-2 border-dashed border-duo-green text-duo-green font-bold text-sm transition-all hover:bg-duo-green/5 active:scale-95"
          >
            + Añadir hábito
          </button>
        </div>
      </div>

      {/* Streak freezes */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-2 text-sm">🧊 Protecciones de racha</h3>
        <p className="text-xs text-gray-400 mb-3">
          Completa todos tus hábitos del día para ganar una protección. Máximo {userData.maxStreakFreezes}.
        </p>
        <div className="flex items-center gap-2">
          {Array.from({ length: userData.maxStreakFreezes }).map((_, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                i < userData.streakFreezes
                  ? 'bg-blue-50 animate-bounce-in'
                  : 'bg-gray-100 grayscale opacity-40'
              }`}
            >
              🧊
            </div>
          ))}
        </div>
      </div>

      {/* Data Backup */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-2 text-sm">💾 Respaldo de datos</h3>
        <p className="text-xs text-gray-400 mb-3">
          Exporta tus datos para respaldarlos o impórtalos para restaurarlos en otro dispositivo.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => {
              const dataStr = JSON.stringify(userData, null, 2)
              const blob = new Blob([dataStr], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              const today = getTodayStr()
              a.href = url
              a.download = `habitduo-backup-${today}.json`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }}
            className="w-full py-3 rounded-xl bg-duo-green text-white font-bold text-sm transition-all active:scale-95 hover:bg-duo-green/90"
            style={{ boxShadow: `0 4px 0 ${DUO_GREEN_DARK}` }}
          >
            📤 Exportar datos
          </button>
          <DataImportButton setUserData={setUserData} />
        </div>
      </div>

      {/* Reset */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-2 text-sm">⚠️ Zona peligrosa</h3>
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-3 rounded-xl border-2 border-red-200 text-red-400 font-bold text-sm hover:bg-red-50 transition-all active:scale-95"
          >
            Reiniciar todos los datos
          </button>
        ) : (
          <div className="space-y-2 animate-fade-in">
            <p className="text-sm text-red-500 font-medium">¿Estás seguro? Se perderán todos los datos.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-gray-200 text-gray-600 font-bold text-sm active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={onResetData}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white font-bold text-sm active:scale-95"
              >
                Borrar todo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* About */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100 text-center">
        <p className="text-2xl mb-1">🔥</p>
        <p className="font-bold text-gray-700">HabitDuo</p>
        <p className="text-xs text-gray-400">Tu rastreador de hábitos gamificado</p>
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-300">v1.3.0</p>
          <p className="text-[10px] text-gray-400 mt-1">💾 Tus datos se guardan localmente en este navegador (localStorage). Si borras los datos del navegador se perderán.</p>
        </div>
      </div>
    </div>
  )
}

// ===== HABIT FORM MODAL =====
function HabitFormModalInner({
  isOpen,
  onClose,
  onSave,
  editHabit,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (habit: Partial<Habit>) => void
  editHabit: Habit | null
}) {
  const [name, setName] = useState(editHabit?.name || '')
  const [emoji, setEmoji] = useState(editHabit?.emoji || '💪')
  const [color, setColor] = useState(editHabit?.color || DUO_GREEN)
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>(editHabit?.frequency || 'daily')
  const [weeklyTarget, setWeeklyTarget] = useState(editHabit?.weeklyTarget || 7)

  const COLORS = [DUO_GREEN, DUO_ORANGE, DUO_YELLOW, DUO_RED, DUO_BLUE, DUO_PURPLE, DUO_PINK]
  const EMOJIS = ['💪', '🏃', '🏋️', '🧘', '📺', '📚', '💧', '🍎', '😴', '✍️', '🎵', '🧹', '💊', '🚶', '🎨', '🌱']

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div
        className="relative bg-white w-full max-w-md rounded-t-3xl p-5 animate-slide-up max-h-[85vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-black text-gray-800 mb-4">
          {editHabit ? 'Editar hábito' : 'Nuevo hábito'}
        </h2>

        {/* Name */}
        <div className="mb-4">
          <label className="text-sm font-bold text-gray-600 mb-1 block">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del hábito"
            className="w-full px-4 py-3 rounded-xl bg-gray-100 border-0 text-gray-800 font-medium focus:ring-2 focus:ring-duo-green focus:bg-white transition-all"
            maxLength={30}
          />
        </div>

        {/* Emoji */}
        <div className="mb-4">
          <label className="text-sm font-bold text-gray-600 mb-1 block">Icono</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all active:scale-90 ${
                  emoji === e ? 'bg-duo-green/10 ring-2 ring-duo-green scale-110' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div className="mb-4">
          <label className="text-sm font-bold text-gray-600 mb-1 block">Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-10 h-10 rounded-xl transition-all active:scale-90 ${
                  color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Frequency */}
        <div className="mb-4">
          <label className="text-sm font-bold text-gray-600 mb-1 block">Frecuencia</label>
          <div className="flex gap-2">
            <button
              onClick={() => { setFrequency('daily'); setWeeklyTarget(7) }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                frequency === 'daily'
                  ? 'bg-duo-green text-white shadow-md'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              📅 Todos los días
            </button>
            <button
              onClick={() => { setFrequency('weekly'); setWeeklyTarget(3) }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                frequency === 'weekly'
                  ? 'bg-duo-blue text-white shadow-md'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              📊 Por semana
            </button>
          </div>
        </div>

        {/* Weekly target (if weekly) */}
        {frequency === 'weekly' && (
          <div className="mb-5">
            <label className="text-sm font-bold text-gray-600 mb-1 block">
              Mínimo por semana: {weeklyTarget}
            </label>
            <input
              type="range"
              min={1}
              max={6}
              value={weeklyTarget}
              onChange={(e) => setWeeklyTarget(Number(e.target.value))}
              className="w-full accent-duo-blue"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-600 font-bold text-sm active:scale-95 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!name.trim()) return
              onSave({
                id: editHabit?.id,
                name: name.trim(),
                emoji,
                color,
                frequency,
                weeklyTarget,
                xpPerCompletion: frequency === 'daily' ? 10 : 25,
              })
              onClose()
            }}
            disabled={!name.trim()}
            className={`flex-1 py-3 rounded-xl font-bold text-sm text-white active:scale-95 transition-all ${
              name.trim()
                ? 'bg-duo-green shadow-lg active:shadow-md'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {editHabit ? 'Guardar' : 'Crear hábito'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Wrapper that uses key to force remount when editHabit changes
function HabitFormModal(props: {
  isOpen: boolean
  onClose: () => void
  onSave: (habit: Partial<Habit>) => void
  editHabit: Habit | null
}) {
  return <HabitFormModalInner key={props.editHabit?.id || 'new'} {...props} />
}

// ===== ONBOARDING SCREEN =====
function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)

  const steps = [
    {
      emoji: '🔥',
      title: '¡Bienvenido a HabitDuo!',
      desc: 'Rastrea tus hábitos, mantén tu racha y sube de nivel. ¡Como tu juego favorito pero para la vida real!',
      color: DUO_ORANGE,
    },
    {
      emoji: '🎯',
      title: 'Completa hábitos cada día',
      desc: 'Tus hábitos están listos. Completa cada uno para ganar XP y mantener tu racha. ¡No rompas la cadena!',
      color: DUO_GREEN,
    },
    {
      emoji: '⚡',
      title: 'Sube de nivel',
      desc: 'Gana XP por cada hábito completado. Los diarios dan 10 XP y los semanales 25 XP. ¡Llega al máximo nivel!',
      color: DUO_BLUE,
    },
    {
      emoji: '🧊',
      title: 'Protege tu racha',
      desc: 'Completa todos los hábitos del día para ganar una protección. Úsala si un día no puedes completar. ¡Máximo 2!',
      color: DUO_PURPLE,
    },
  ]

  const current = steps[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-400 via-emerald-400 to-teal-500 p-6">
      <div className="w-full max-w-sm">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-white' : i < step ? 'w-2 bg-white/80' : 'w-2 bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-center animate-celebrate">
          <div
            className="w-24 h-24 rounded-3xl mx-auto mb-5 flex items-center justify-center text-5xl"
            style={{ backgroundColor: current.color + '20' }}
          >
            {current.emoji}
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-3">{current.title}</h1>
          <p className="text-gray-500 text-sm leading-relaxed">{current.desc}</p>
        </div>

        {/* Button */}
        <button
          onClick={() => {
            if (step < steps.length - 1) {
              setStep(step + 1)
            } else {
              onComplete()
            }
          }}
          className="w-full mt-6 py-4 rounded-2xl bg-white text-duo-green font-black text-lg shadow-xl active:scale-95 transition-all"
          style={{ boxShadow: '0 4px 0 rgba(0,0,0,0.1), 0 8px 20px rgba(0,0,0,0.1)' }}
        >
          {step < steps.length - 1 ? 'Siguiente →' : '¡Empezar! 🚀'}
        </button>
      </div>
    </div>
  )
}

// Process streak logic for loaded data
function processStreakOnLoad(data: UserData): UserData {
  const today = getTodayStr()
  const yesterday = getYesterdayStr()
  let next = { ...data }

  // If we haven't processed today yet
  if (data.lastActiveDate !== today) {
    // Check if yesterday was missed (smart streak: weekly habits with met targets don't break streak)
    if (data.lastActiveDate && data.lastActiveDate !== yesterday && data.lastActiveDate !== today) {
      // There's a gap - check if streak freeze is available
      const daysSinceLastActive = Math.round(
        (new Date(today).getTime() - new Date(data.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysSinceLastActive === 1) {
        // Only missed one day - check if the day was actually "complete" using smart logic
        const missedDate = data.lastActiveDate
        const dayWasComplete = isDayCompleteForStreak(data.habits, missedDate)
        if (dayWasComplete) {
          // Day was complete, no need for freeze
        } else if (data.streakFreezes > 0 && !data.streakFreezeUsed[yesterday]) {
          next.streakFreezes -= 1
          next.streakFreezeUsed = { ...data.streakFreezeUsed, [yesterday]: true }
        } else {
          next.globalStreak = 0
        }
      } else if (daysSinceLastActive > 1) {
        // Missed multiple days - check each day
        let streakBroken = false
        for (let i = 1; i < daysSinceLastActive; i++) {
          const d = new Date(data.lastActiveDate)
          d.setDate(d.getDate() + i)
          const dateStr = getDateStr(d)
          if (!isDayCompleteForStreak(data.habits, dateStr)) {
            // Try streak freeze for the first missed day only
            if (!streakBroken && data.streakFreezes > 0 && !data.streakFreezeUsed[dateStr]) {
              next.streakFreezes -= 1
              next.streakFreezeUsed = { ...data.streakFreezeUsed, [dateStr]: true }
            } else {
              streakBroken = true
              next.globalStreak = 0
              break
            }
          }
        }
      }

      // Also update individual habit streaks
      next.habits = next.habits.map((h) => {
        let habitStreak = h.streak
        for (let d = new Date(data.lastActiveDate); d < new Date(today); d.setDate(d.getDate() + 1)) {
          const dateStr = getDateStr(d)
          if (!h.completions[dateStr]) {
            if (h.frequency === 'daily') {
              habitStreak = 0
            }
          }
        }
        return { ...h, streak: habitStreak }
      })
    }

    next.lastActiveDate = today
    saveData(next)
  }

  return next
}

// Initialize data from localStorage
function initializeData(): { data: UserData; showOnboarding: boolean } {
  const raw = loadData()
  const processed = processStreakOnLoad(raw)
  return { data: processed, showOnboarding: !processed.onboardingComplete }
}

// ===== MAIN APP =====
export default function Home() {
  const [userData, setUserData] = useState<UserData>(() => {
    if (typeof window === 'undefined') return getDefaultUserData()
    return initializeData().data
  })
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [showConfetti, setShowConfetti] = useState(false)
  const [celebratingId, setCelebratingId] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return true
    return initializeData().showOnboarding
  })
  const [showHabitForm, setShowHabitForm] = useState(false)
  const [editHabit, setEditHabit] = useState<Habit | null>(null)
  const [streakMilestone, setStreakMilestone] = useState<number | null>(null)
  const notificationTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Save data whenever userData changes
  useEffect(() => {
    saveData(userData)
  }, [userData])

  // ===== SERVICE WORKER REGISTRATION =====
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('✅ Service Worker registered:', reg.scope)
        setUserData((prev) => {
          if (prev.swRegistered) return prev
          const next = { ...prev, swRegistered: true }
          saveData(next)
          return next
        })
      }).catch((err) => {
        console.log('⚠️ Service Worker registration failed:', err)
      })
    }
  }, [])

  // ===== SMART NOTIFICATION SYSTEM =====
  const sendNotification = useCallback((title: string, body: string, tag: string, urgent = false) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const options: NotificationOptions = {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      renotify: true,
      requireInteraction: urgent,
      vibrate: urgent ? [300, 100, 300, 100, 300, 100, 300] : [200, 100, 200],
      silent: false,
      data: { url: '/' },
    }

    // Try Service Worker notification (works when app is in background)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, options)
      })
    } else {
      // Fallback to regular notification
      new Notification(title, options)
    }

    // Also try to vibrate the device directly
    if ('vibrate' in navigator) {
      navigator.vibrate(urgent ? [300, 100, 300, 100, 300] : [200, 100, 200])
    }
  }, [])

  // Schedule all notification timers
  useEffect(() => {
    // Clear all existing timers
    notificationTimersRef.current.forEach((t) => clearTimeout(t))
    notificationTimersRef.current = []

    if (!userData.notificationEnabled) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const now = new Date()
    const today = getTodayStr()
    const pendingHabits = userData.habits.filter((h) => !h.completions[today])
    const pendingCount = pendingHabits.length
    if (pendingCount === 0) return

    // ===== MORNING REMINDER =====
    const [mH, mM] = userData.morningReminderTime.split(':').map(Number)
    const morningTime = new Date()
    morningTime.setHours(mH, mM, 0, 0)

    if (now < morningTime) {
      const delay = morningTime.getTime() - now.getTime()
      const timer = setTimeout(() => {
        const msg = getRandomMessage(MORNING_MESSAGES)
        const pendingNow = userData.habits.filter((h) => !h.completions[getTodayStr()]).length
        if (pendingNow > 0) {
          sendNotification(
            msg.title,
            `${msg.body} (${pendingNow} pendiente${pendingNow > 1 ? 's' : ''})`,
            'habitduo-morning'
          )
        }
      }, delay)
      notificationTimersRef.current.push(timer)
    }

    // ===== EVENING REMINDER =====
    const [eH, eM] = userData.eveningReminderTime.split(':').map(Number)
    const eveningTime = new Date()
    eveningTime.setHours(eH, eM, 0, 0)

    if (now < eveningTime) {
      const delay = eveningTime.getTime() - now.getTime()
      const timer = setTimeout(() => {
        const msg = getRandomMessage(EVENING_MESSAGES)
        const pendingNow = userData.habits.filter((h) => !h.completions[getTodayStr()]).length
        if (pendingNow > 0) {
          sendNotification(
            msg.title,
            `${msg.body} (${pendingNow} pendiente${pendingNow > 1 ? 's' : ''})`,
            'habitduo-evening'
          )
        }
      }, delay)
      notificationTimersRef.current.push(timer)
    }

    // ===== URGENT REMINDER (30 min before midnight) =====
    const almostMidnight = new Date()
    almostMidnight.setHours(23, 30, 0, 0)

    if (now < almostMidnight) {
      const delay = almostMidnight.getTime() - now.getTime()
      const timer = setTimeout(() => {
        const pendingNow = userData.habits.filter((h) => !h.completions[getTodayStr()])
        if (pendingNow.length > 0) {
          const msg = getRandomMessage(URGENT_MESSAGES)
          sendNotification(
            msg.title,
            msg.body,
            'habitduo-urgent',
            true // urgent = requireInteraction
          )
        }
      }, delay)
      notificationTimersRef.current.push(timer)
    }

    // ===== NUDGE: If app is open and habits are still pending, remind periodically =====
    const nudgeInterval = 45 * 60 * 1000 // 45 minutes
    const nudgeTimer = setInterval(() => {
      const pendingNow = userData.habits.filter((h) => !h.completions[getTodayStr()])
      if (pendingNow.length > 0 && pendingNow.length < userData.habits.length) {
        // Only nudge if SOME are done (don't spam if none done)
        const habitNames = pendingNow.slice(0, 2).map((h) => h.name).join(' y ')
        sendNotification(
          '💪 ¡Quedan pocos!',
          `Solo falta ${habitNames}${pendingNow.length > 2 ? ` y ${pendingNow.length - 2} más` : ''}. ¡Ya casi!`,
          'habitduo-nudge'
        )
      }
    }, nudgeInterval)
    notificationTimersRef.current.push(nudgeTimer as unknown as ReturnType<typeof setTimeout>)

    return () => {
      notificationTimersRef.current.forEach((t) => clearTimeout(t))
      notificationTimersRef.current = []
    }
  }, [userData.notificationEnabled, userData.morningReminderTime, userData.eveningReminderTime, userData.habits, sendNotification])

  // Request notification permission (with Service Worker)
  const requestNotification = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones. Probá agregar la app a tu pantalla de inicio.')
      return
    }

    // First ensure service worker is registered
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js')
      } catch {
        // Continue even if SW registration fails
      }
    }

    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      // Send a test notification to confirm it works
      setTimeout(() => {
        sendNotification(
          '🎉 ¡Notificaciones activadas!',
          'A partir de ahora te vamos a recordar tus hábitos. ¡No vas a poder escapar! 💪🔥',
          'habitduo-welcome'
        )
      }, 500)
    } else if (permission === 'denied') {
      alert('Bloqueaste las notificaciones. Para activarlas:\n\n1. Tocá el ícono de candado/candado en la barra de direcciones\n2. Cambiá "Notificaciones" a "Permitir"\n3. Recargá la página')
    }

    setUserData((prev) => {
      const next = { ...prev, notificationEnabled: permission === 'granted' }
      saveData(next)
      return next
    })
  }, [sendNotification])

  // Complete a habit
  const completeHabit = useCallback((habitId: string) => {
    setUserData((prev) => {
      const today = getTodayStr()
      const habitIndex = prev.habits.findIndex((h) => h.id === habitId)
      if (habitIndex === -1) return prev
      const habit = prev.habits[habitIndex]

      // Already completed today
      if (habit.completions[today]) return prev

      // Mark completed (and remove skip if it was skipped)
      const newCompletions = { ...habit.completions, [today]: true }
      const newSkippedDays = { ...habit.skippedDays }
      delete newSkippedDays[today]

      // Calculate new streak
      let newStreak = habit.streak + 1
      // Check consecutive days for daily habits
      if (habit.frequency === 'daily') {
        let streak = 0
        const checkDate = new Date()
        while (true) {
          const dateStr = getDateStr(checkDate)
          if (newCompletions[dateStr]) {
            streak++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            break
          }
        }
        newStreak = streak
      } else {
        // Weekly: check consecutive weeks
        newStreak = habit.streak + 1
      }

      const newBestStreak = Math.max(newStreak, habit.bestStreak)
      const updatedHabit = {
        ...habit,
        completions: newCompletions,
        skippedDays: newSkippedDays,
        streak: newStreak,
        bestStreak: newBestStreak,
      }

      const newHabits = [...prev.habits]
      newHabits[habitIndex] = updatedHabit

      // Add XP
      const newTotalXP = prev.totalXP + habit.xpPerCompletion

      // Smart streak: check if all habits are satisfied for today
      // Daily habits: must be completed today
      // Weekly habits: completed today OR weekly target already met
      const dayComplete = isDayCompleteForStreak(newHabits, today)
      const allActuallyCompleted = newHabits.every((h) => h.completions[today])

      // Earn streak freeze only when ALL habits are actually completed today (even optional ones)
      let newStreakFreezes = prev.streakFreezes
      if (allActuallyCompleted && prev.streakFreezes < prev.maxStreakFreezes) {
        newStreakFreezes = prev.streakFreezes + 1
      }

      // Update global streak (smart logic: weekly habits with met targets don't break streak)
      const yesterday = getYesterdayStr()
      let newGlobalStreak = prev.globalStreak
      if (dayComplete) {
        if (prev.lastStreakDate === yesterday || prev.lastStreakDate === today) {
          if (prev.lastStreakDate !== today) {
            newGlobalStreak = prev.globalStreak + 1
          }
        } else if (prev.lastStreakDate === '') {
          newGlobalStreak = 1
        } else {
          newGlobalStreak = 1
        }
      }

      // Check for streak milestones
      const milestones = [7, 30, 100]
      if (milestones.includes(newGlobalStreak)) {
        setTimeout(() => setStreakMilestone(newGlobalStreak), 500)
      }

      const newBestGlobalStreak = Math.max(newBestStreak, prev.bestGlobalStreak, newGlobalStreak)

      const next: UserData = {
        ...prev,
        habits: newHabits,
        totalXP: newTotalXP,
        streakFreezes: newStreakFreezes,
        globalStreak: newGlobalStreak,
        bestGlobalStreak: newBestGlobalStreak,
        lastStreakDate: dayComplete ? today : prev.lastStreakDate,
      }

      return next
    })

    // Show celebration
    setCelebratingId(habitId)
    setShowConfetti(true)
    setTimeout(() => {
      setShowConfetti(false)
      setCelebratingId(null)
    }, 1500)
  }, [])

  // Skip a weekly habit for today ("Lo hago mañana")
  const skipHabit = useCallback((habitId: string) => {
    setUserData((prev) => {
      const today = getTodayStr()
      const habitIndex = prev.habits.findIndex((h) => h.id === habitId)
      if (habitIndex === -1) return prev
      const habit = prev.habits[habitIndex]

      // Only weekly habits can be skipped, and only if they can be deferred
      if (habit.frequency !== 'weekly') return prev
      if (!canDeferHabit(habit, today)) return prev
      if (habit.completions[today]) return prev // Already completed
      if (habit.skippedDays[today]) return prev // Already skipped

      const newHabits = [...prev.habits]
      newHabits[habitIndex] = {
        ...habit,
        skippedDays: { ...habit.skippedDays, [today]: true },
      }

      // Smart streak: check if all habits are satisfied after skip
      const dayComplete = isDayCompleteForStreak(newHabits, today)
      const yesterday = getYesterdayStr()
      let newGlobalStreak = prev.globalStreak
      if (dayComplete) {
        if (prev.lastStreakDate === yesterday || prev.lastStreakDate === today) {
          if (prev.lastStreakDate !== today) {
            newGlobalStreak = prev.globalStreak + 1
          }
        } else if (prev.lastStreakDate === '') {
          newGlobalStreak = 1
        } else {
          newGlobalStreak = 1
        }
      }

      const next: UserData = {
        ...prev,
        habits: newHabits,
        globalStreak: newGlobalStreak,
        bestGlobalStreak: Math.max(prev.bestGlobalStreak, newGlobalStreak),
        lastStreakDate: dayComplete ? today : prev.lastStreakDate,
      }

      return next
    })
  }, [])

  // Add habit
  const addHabit = useCallback((habitData: Partial<Habit>) => {
    setUserData((prev) => {
      const newHabit: Habit = {
        id: generateId(),
        name: habitData.name || 'Nuevo hábito',
        emoji: habitData.emoji || '💪',
        color: habitData.color || DUO_GREEN,
        frequency: habitData.frequency || 'daily',
        weeklyTarget: habitData.weeklyTarget || 7,
        streak: 0,
        bestStreak: 0,
        completions: {},
        skippedDays: {},
        createdAt: getTodayStr(),
        xpPerCompletion: habitData.xpPerCompletion || 10,
      }
      const next = { ...prev, habits: [...prev.habits, newHabit] }
      saveData(next)
      return next
    })
  }, [])

  // Edit habit
  const saveEditHabit = useCallback((habitData: Partial<Habit>) => {
    if (!habitData.id) return
    setUserData((prev) => {
      const next = {
        ...prev,
        habits: prev.habits.map((h) =>
          h.id === habitData.id
            ? {
                ...h,
                name: habitData.name || h.name,
                emoji: habitData.emoji || h.emoji,
                color: habitData.color || h.color,
                frequency: habitData.frequency || h.frequency,
                weeklyTarget: habitData.weeklyTarget || h.weeklyTarget,
                xpPerCompletion: habitData.xpPerCompletion || h.xpPerCompletion,
              }
            : h
        ),
      }
      saveData(next)
      return next
    })
  }, [])

  // Save journal entry
  const saveJournal = useCallback((date: string, entry: JournalEntry) => {
    setUserData((prev) => {
      const next = { ...prev, journalEntries: { ...prev.journalEntries, [date]: entry } }
      saveData(next)
      return next
    })
  }, [])

  // Delete habit
  const deleteHabit = useCallback((id: string) => {
    setUserData((prev) => {
      const next = { ...prev, habits: prev.habits.filter((h) => h.id !== id) }
      saveData(next)
      return next
    })
  }, [])

  // Reset data
  const resetData = useCallback(() => {
    const defaults = getDefaultUserData()
    defaults.onboardingComplete = true
    setUserData(defaults)
    saveData(defaults)
  }, [])

  // Complete onboarding
  const completeOnboarding = useCallback(() => {
    setUserData((prev) => {
      const next = { ...prev, onboardingComplete: true }
      saveData(next)
      return next
    })
    setShowOnboarding(false)
    // Request notification after onboarding
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => requestNotification(), 500)
    }
  }, [requestNotification])

  const today = getTodayStr()
  const level = getLevel(userData.totalXP)
  const todayDate = new Date()
  const dayName = DAY_NAMES_FULL[todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1]
  const monthDay = todayDate.getDate()
  const monthName = MONTH_NAMES[todayDate.getMonth()]

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col max-w-md mx-auto relative">
      {/* Onboarding */}
      {showOnboarding && <OnboardingScreen onComplete={completeOnboarding} />}

      {/* Confetti */}
      {showConfetti && <Confetti />}

      {/* Streak Milestone Modal */}
      {streakMilestone !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={() => setStreakMilestone(null)}>
          <div
            className="bg-white rounded-3xl p-8 text-center animate-bounce-in max-w-xs w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl mb-4 animate-fire-dance">🔥</div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">¡{streakMilestone} días!</h2>
            <p className="text-gray-500 text-sm mb-4">
              {streakMilestone === 7
                ? '¡Una semana completa! Estás en llamas 🔥'
                : streakMilestone === 30
                ? '¡Un mes entero! Eres imparable 💪'
                : '¡100 DÍAS! Eres una leyenda 👑'}
            </p>
            <button
              onClick={() => setStreakMilestone(null)}
              className="w-full py-3 rounded-2xl bg-duo-green text-white font-black text-base active:scale-95 transition-all"
              style={{ boxShadow: `0 4px 0 ${DUO_GREEN_DARK}` }}
            >
              ¡Genial! 🎉
            </button>
          </div>
        </div>
      )}

      {/* ===== TOP BAR ===== */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Level badge */}
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm animate-level-glow"
              style={{ backgroundColor: DUO_GREEN }}
            >
              {level}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 font-medium leading-none">NIVEL</p>
              <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-duo-green rounded-full transition-all duration-700"
                  style={{ width: `${getXPProgress(userData.totalXP)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Streak counter */}
          <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full">
            <span className="text-xl animate-fire-dance" aria-hidden="true">🔥</span>
            <span className="text-xl font-black text-orange-500 animate-glow-pulse">
              {userData.globalStreak}
            </span>
          </div>

          {/* Settings icon */}
          <button
            onClick={() => setActiveTab('settings')}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors active:scale-90"
            aria-label="Ajustes"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto custom-scrollbar">
        {activeTab === 'home' && (
          <div className="animate-tab-enter space-y-4">
            {/* Date header */}
            <div>
              <h2 className="text-2xl font-black text-gray-800">Hoy</h2>
              <p className="text-sm text-gray-400">
                {dayName}, {monthDay} de {monthName}
              </p>
            </div>

            {/* Streak Freeze indicator */}
            {userData.streakFreezes > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2 animate-fade-in">
                <span className="text-lg">🧊</span>
                <span className="text-xs text-blue-600 font-medium">
                  Tienes {userData.streakFreezes} protección{userData.streakFreezes > 1 ? 'es' : ''} de racha
                </span>
              </div>
            )}

            {/* Smart streak progress: how many needed habits are done */}
            {(() => {
              const todayStr = today
              const neededHabits = userData.habits.filter((h) => {
                if (h.frequency === 'daily') return true
                const weekD = getWeekDates()
                const wc = weekD.filter((d) => h.completions[d]).length
                return wc < h.weeklyTarget
              })
              const neededDone = neededHabits.filter((h) => h.completions[todayStr]).length
              const allNeededDone = neededHabits.length > 0 && neededDone === neededHabits.length
              if (neededHabits.length === 0) return null
              return (
                <div className={`rounded-2xl p-3 border ${allNeededDone ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{allNeededDone ? '🔥' : '🎯'}</span>
                      <span className={`text-sm font-bold ${allNeededDone ? 'text-green-700' : 'text-gray-600'}`}>
                        {allNeededDone ? '¡Racha asegurada hoy!' : 'Progreso del día para tu racha'}
                      </span>
                    </div>
                    <span className={`text-sm font-black ${allNeededDone ? 'text-green-600' : 'text-gray-500'}`}>
                      {neededDone}/{neededHabits.length}
                    </span>
                  </div>
                  <div className="h-2 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${neededHabits.length > 0 ? (neededDone / neededHabits.length) * 100 : 0}%`,
                        backgroundColor: allNeededDone ? DUO_GREEN : DUO_ORANGE,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {allNeededDone
                      ? 'Los hábitos semanales con meta cumplida son opcionales'
                      : `${neededHabits.length - neededDone} hábito${neededHabits.length - neededDone !== 1 ? 's' : ''} necesario${neededHabits.length - neededDone !== 1 ? 's' : ''} para mantener tu racha`}
                  </p>
                </div>
              )
            })()}

            {/* Today's habits */}
            <div className="space-y-3">
              {userData.habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  todayStr={today}
                  onComplete={completeHabit}
                  onSkip={skipHabit}
                  isCompleted={!!habit.completions[today]}
                  isSkipped={!!habit.skippedDays?.[today]}
                  celebratingId={celebratingId}
                />
              ))}
            </div>

            {/* Empty state */}
            {userData.habits.length === 0 && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">No tienes hábitos aún</h3>
                <p className="text-sm text-gray-400 mb-4">Añade tu primer hábito para empezar</p>
                <button
                  onClick={() => {
                    setEditHabit(null)
                    setShowHabitForm(true)
                  }}
                  className="px-6 py-3 rounded-xl bg-duo-green text-white font-bold active:scale-95 transition-all"
                >
                  + Añadir hábito
                </button>
              </div>
            )}

            {/* Journal / Mood */}
            <JournalCard
              todayStr={today}
              entry={userData.journalEntries[today]}
              onSave={saveJournal}
            />

            {/* Weekly Overview */}
            {userData.habits.length > 0 && <WeeklyOverview habits={userData.habits} />}

            {/* XP Summary */}
            <div className="bg-gradient-to-r from-duo-green/10 to-emerald-50 rounded-2xl p-4 border border-duo-green/20">
              <div className="flex items-center gap-3">
                <div className="text-3xl">⚡</div>
                <div>
                  <p className="font-bold text-gray-700">{userData.totalXP} XP</p>
                  <p className="text-xs text-gray-400">
                    Nivel {level} · {getXPForLevel(level + 1) - userData.totalXP} XP para nivel {level + 1}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <>
            <InsightsScreen userData={userData} />
            <JournalHistory journalEntries={userData.journalEntries} />
          </>
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            userData={userData}
            setUserData={setUserData}
            onAddHabit={() => {
              setEditHabit(null)
              setShowHabitForm(true)
            }}
            onEditHabit={(habit) => {
              setEditHabit(habit)
              setShowHabitForm(true)
            }}
            onDeleteHabit={deleteHabit}
            onResetData={resetData}
            onRequestNotification={requestNotification}
          />
        )}
      </main>

      {/* ===== BOTTOM NAV ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 max-w-md mx-auto">
        <div className="flex items-center justify-around py-1.5 px-2">
          {([
            { id: 'home' as Tab, emoji: '🏠', label: 'Inicio' },
            { id: 'insights' as Tab, emoji: '📊', label: 'Insights' },
            { id: 'settings' as Tab, emoji: '⚙️', label: 'Ajustes' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all active:scale-90 ${
                activeTab === tab.id
                  ? 'text-duo-green'
                  : 'text-gray-400'
              }`}
              aria-label={tab.label}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className={`text-xl transition-transform duration-200 ${activeTab === tab.id ? 'scale-110' : ''}`}>
                {tab.emoji}
              </span>
              <span className={`text-[10px] font-bold ${activeTab === tab.id ? 'text-duo-green' : 'text-gray-400'}`}>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="w-1 h-1 rounded-full bg-duo-green mt-0.5" />
              )}
            </button>
          ))}
        </div>
        {/* Safe area for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* ===== HABIT FORM MODAL ===== */}
      <HabitFormModal
        isOpen={showHabitForm}
        onClose={() => {
          setShowHabitForm(false)
          setEditHabit(null)
        }}
        onSave={(habitData) => {
          if (habitData.id) {
            saveEditHabit(habitData)
          } else {
            addHabit(habitData)
          }
        }}
        editHabit={editHabit}
      />
    </div>
  )
}
