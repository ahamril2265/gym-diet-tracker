import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import { IconButton } from '../../components/Button'
import { ComingSoon } from '../../components/ComingSoon'

export default function WorkoutScreen() {
  const navigate = useNavigate()
  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
      <IconButton label="Back" variant="ghost" onClick={() => navigate(-1)} className="-ml-2 mb-2">
        <ChevronLeft size={24} aria-hidden="true" />
      </IconButton>
      <ComingSoon eyebrow="Live workout" title="Workout" phase={2} what="Live logging with rest timer, previous-session prefill, PR badges and a finish summary." />
    </div>
  )
}
