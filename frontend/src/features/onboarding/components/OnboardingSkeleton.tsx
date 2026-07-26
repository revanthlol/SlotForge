import { motion, useReducedMotion } from 'motion/react';

export function OnboardingSkeleton() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={reduceMotion ? undefined : { opacity: 1 }} className="onboarding-screen">
      <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0 }} transition={{ duration: .35, delay: .05 }} className="onboarding-loading-card">
        <div className="h-12 w-12 rounded-2xl bg-accent-soft onboarding-skeleton" />
        <div className="mt-7 h-5 w-36 rounded-full bg-surface-container onboarding-skeleton" />
        <div className="mt-4 h-4 w-64 rounded-full bg-surface-container onboarding-skeleton" />
        <div className="mt-8 h-2 w-48 rounded-full bg-surface-container onboarding-skeleton" />
      </motion.div>
    </motion.div>
  );
}
