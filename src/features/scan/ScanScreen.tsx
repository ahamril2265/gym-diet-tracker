import { X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { IconButton } from '../../components/Button'
import { ComingSoon } from '../../components/ComingSoon'

export default function ScanScreen() {
  const navigate = useNavigate()
  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
      <IconButton label="Close" variant="ghost" onClick={() => navigate(-1)} className="-ml-2 mb-2">
        <X size={24} aria-hidden="true" />
      </IconButton>
      <ComingSoon eyebrow="Camera" title="Scan" phase={4} what="Meal photo recognition with Gemini and barcode scanning with Open Food Facts." />
    </div>
  )
}
