import { motion, useReducedMotion } from 'motion/react';

export default function LoadingScreen({ label = 'Restoring your workspace' }: { label?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={reduceMotion ? undefined : { opacity: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }} transition={{ duration: .22 }} className="loading-screen" role="status" aria-live="polite">
      <motion.div initial={reduceMotion ? false : { opacity: 0, y: 10, scale: .98 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }} transition={{ duration: .38, delay: .06 }} className="loading-screen__inner">
        <img src="/logo/logo.svg" alt="SlotForge" className="h-14 w-14 object-contain" />
        <div className="newtons-cradle" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => <span className="newtons-cradle__dot" key={index} />)}
        </div>
        <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>{label}</p>
      </motion.div>
    </motion.div>
  );
}
