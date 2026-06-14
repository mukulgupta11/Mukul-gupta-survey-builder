import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  type Variants,
} from 'motion/react'
import { type ReactNode, useEffect, useState } from 'react'

export const easeOut = [0.22, 1, 0.36, 1] as const

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10, filter: 'blur(6px)' },
  enter: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.45, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -6,
    filter: 'blur(4px)',
    transition: { duration: 0.18, ease: 'easeIn' },
  },
}

export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.08,
      staggerChildren: 0.07,
    },
  },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.65, ease: easeOut },
  },
}

export function Reveal({
  children,
  className,
  delay = 0,
  amount = 0.2,
}: {
  children: ReactNode
  className?: string
  delay?: number
  amount?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.65, delay, ease: easeOut }}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const reducedMotion = useReducedMotion()
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 90, damping: 24, mass: 0.8 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    motionValue.set(value)
  }, [motionValue, value])

  useMotionValueEvent(spring, 'change', (latest) => setDisplay(latest))

  return <>{(reducedMotion ? value : display).toFixed(decimals)}</>
}

export const hoverLift = {
  y: -6,
  transition: { type: 'spring', stiffness: 340, damping: 24 },
} as const

export const tapPress = {
  scale: 0.98,
  transition: { duration: 0.1 },
} as const
