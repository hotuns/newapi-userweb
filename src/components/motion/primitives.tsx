'use client'

import { type HTMLMotionProps, m, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const DEFAULT_EASE = [0.22, 1, 0.36, 1] as const
const DEFAULT_ENTER_DURATION = 0.32
const DEFAULT_HOVER_DURATION = 0.16

function useFinePointer() {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: fine)')
    const update = () => setMatches(mediaQuery.matches)

    update()

    mediaQuery.addEventListener('change', update)

    return () => {
      mediaQuery.removeEventListener('change', update)
    }
  }, [])

  return matches
}

type RevealProps = HTMLMotionProps<'div'> & {
  delay?: number
  y?: number
  duration?: number
  inView?: boolean
  once?: boolean
  amount?: number
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 12,
  duration = DEFAULT_ENTER_DURATION,
  inView = false,
  once = true,
  amount = 0.2,
  ...props
}: RevealProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <m.div
      className={cn(className)}
      initial='hidden'
      animate={inView ? undefined : 'visible'}
      whileInView={inView ? 'visible' : undefined}
      viewport={inView ? { once, amount } : undefined}
      variants={{
        hidden: {
          opacity: 0,
          y: prefersReducedMotion ? 0 : y,
        },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration,
            delay,
            ease: DEFAULT_EASE,
          },
        },
      }}
      {...props}
    >
      {children}
    </m.div>
  )
}

type StaggerGroupProps = HTMLMotionProps<'div'> & {
  delayChildren?: number
  staggerChildren?: number
  inView?: boolean
  once?: boolean
  amount?: number
}

export function StaggerGroup({
  children,
  className,
  delayChildren = 0,
  staggerChildren = 0.06,
  inView = false,
  once = true,
  amount = 0.2,
  ...props
}: StaggerGroupProps) {
  return (
    <m.div
      className={cn(className)}
      initial='hidden'
      animate={inView ? undefined : 'visible'}
      whileInView={inView ? 'visible' : undefined}
      viewport={inView ? { once, amount } : undefined}
      variants={{
        hidden: {
          opacity: 1,
        },
        visible: {
          opacity: 1,
          transition: {
            delayChildren,
            staggerChildren,
          },
        },
      }}
      {...props}
    >
      {children}
    </m.div>
  )
}

type StaggerItemProps = HTMLMotionProps<'div'> & {
  y?: number
}

export function StaggerItem({
  children,
  className,
  y = 12,
  ...props
}: StaggerItemProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <m.div
      className={cn(className)}
      variants={{
        hidden: {
          opacity: 0,
          y: prefersReducedMotion ? 0 : y,
        },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: DEFAULT_ENTER_DURATION,
            ease: DEFAULT_EASE,
          },
        },
      }}
      {...props}
    >
      {children}
    </m.div>
  )
}

type InteractiveSurfaceProps = HTMLMotionProps<'div'> & {
  hoverY?: number
  hoverScale?: number
  pressScale?: number
  hover?: boolean
  press?: boolean
}

export function InteractiveSurface({
  children,
  className,
  hoverY = -2,
  hoverScale = 1.01,
  pressScale = 0.98,
  hover = true,
  press = true,
  ...props
}: InteractiveSurfaceProps) {
  const canHover = useFinePointer()
  const prefersReducedMotion = useReducedMotion()

  return (
    <m.div
      className={cn(className)}
      whileHover={
        hover && canHover && !prefersReducedMotion
          ? {
              y: hoverY,
              scale: hoverScale,
              transition: {
                duration: DEFAULT_HOVER_DURATION,
                ease: DEFAULT_EASE,
              },
            }
          : undefined
      }
      whileTap={
        press
          ? prefersReducedMotion
            ? {
                opacity: 0.96,
                transition: {
                  duration: 0.12,
                  ease: DEFAULT_EASE,
                },
              }
            : {
                scale: pressScale,
                transition: {
                  duration: 0.12,
                  ease: DEFAULT_EASE,
                },
              }
          : undefined
      }
      {...props}
    >
      {children}
    </m.div>
  )
}
