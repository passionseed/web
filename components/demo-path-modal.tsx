"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DemoPath, getPathContent } from "./landing-demo-paths";
import { useLanguage } from "@/lib/i18n/language-context";

interface DemoPathModalProps {
  path: DemoPath | null;
  isOpen: boolean;
  onClose: () => void;
}

const content = {
  en: {
    close: "Close",
  },
  th: {
    close: "ปิด",
  },
};

export function DemoPathModal({ path, isOpen, onClose }: DemoPathModalProps) {
  const { language } = useLanguage();
  const t = content[language];

  if (!path) return null;

  const pathContent = getPathContent(path.id, language);
  const Icon = path.icon;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg max-h-[85vh] overflow-auto rounded-2xl bg-[#1a1a1a] border border-white/10 p-6 focus:outline-none"
              >
                <Dialog.Close asChild>
                  <button
                    className="absolute right-4 top-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    aria-label={t.close}
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </Dialog.Close>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl ${path.bgColor} border ${path.borderColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${path.color}`} />
                  </div>
                  <div>
                    <Dialog.Title className="text-xl font-bold text-white">
                      {pathContent.title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-400">
                      {pathContent.tagline}
                    </Dialog.Description>
                  </div>
                </div>

                {/* Days */}
                <div className="space-y-4">
                  {pathContent.days.map((day, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <h4 className="font-semibold text-white mb-1.5">
                        {day.title}
                      </h4>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {day.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}