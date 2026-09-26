import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconButton } from './Button'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Modal bottom sheet on the native <dialog> element: focus trapping, Esc to close and an inert
 * background come from the browser. Tapping the backdrop closes it. Content only mounts while open.
 */
export function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      document.documentElement.style.overflow = 'hidden'
    } else if (!open && d.open) {
      d.close()
    }
    return () => {
      if (!open) document.documentElement.style.overflow = ''
    }
  }, [open])

  useEffect(
    () => () => {
      document.documentElement.style.overflow = ''
    },
    [],
  )

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="sheet"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClose={() => {
        document.documentElement.style.overflow = ''
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="flex max-h-[88dvh] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-divider py-2 pl-5 pr-2">
            <h2 id={titleId} className="h-display truncate text-[26px]">
              {title}
            </h2>
            <IconButton label="Close" variant="ghost" onClick={onClose}>
              <X size={22} aria-hidden="true" />
            </IconButton>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer && <div className="pb-safe border-t border-divider px-4 pt-3 [&>*]:mb-3">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
