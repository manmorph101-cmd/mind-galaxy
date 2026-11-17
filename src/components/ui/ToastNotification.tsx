'use client'

import { useGalaxyStore } from '@/store/galaxyStore'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Flame, CheckCircle2, X } from 'lucide-react'

export default function ToastNotification() {
  const { toasts, removeToast } = useGalaxyStore()

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-black/90 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.8)] text-white text-xs select-none"
          >
            <div className="shrink-0">
              {toast.type === 'streak' && <Flame size={14} className="text-emerald-400" />}
              {toast.type === 'success' && <Sparkles size={14} className="text-cyan-400" />}
              {(!toast.type || toast.type === 'info') && <CheckCircle2 size={14} className="text-white/70" />}
            </div>
            <span className="flex-1 font-medium text-[11px] leading-snug">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/30 hover:text-white transition-colors cursor-pointer p-0.5 ml-1"
            >
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
