'use client'

import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import type { ReactNode } from 'react'

type MotionProviderProps = {
  children: ReactNode
}

const DEFAULT_TRANSITION = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1] as const,
}

export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion='user' transition={DEFAULT_TRANSITION}>
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}
