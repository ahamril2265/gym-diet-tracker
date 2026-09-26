import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useSettings } from '../../hooks/useAppData'
import { parseMeal, useSelectedDate } from '../../hooks/useFoodData'
import { mealForTime } from '../../lib/calc/nutrition'
import { toISODate } from '../../lib/date'
import { BarcodeScan } from './BarcodeScan'
import { MealScan } from './MealScan'
import type { ScanMode } from './ScanChrome'

/** /scan/meal and /scan/barcode: full-screen camera with a Meal | Barcode toggle. */
export default function ScanScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [date] = useSelectedDate()
  const settings = useSettings()
  const mode: ScanMode = location.pathname.endsWith('/barcode') ? 'barcode' : 'meal'
  const meal = parseMeal(params.get('meal')) ?? mealForTime()

  if (!settings) return <div className="fixed inset-0 bg-black" />

  const props = {
    meal,
    date,
    apiKey: settings.geminiApiKey,
    // Back to wherever the camera was opened from (Today, Eat…), or the food log.
    onClose: () => (location.key !== 'default' ? navigate(-1) : navigate('/eat', { replace: true })),
    onSwitch: (m: ScanMode) => navigate(`/scan/${m}${location.search}`, { replace: true }),
    onDone: (toast: string) => navigate(date === toISODate() ? '/eat' : `/eat?d=${date}`, { replace: true, state: { toast } }),
  }

  return mode === 'barcode' ? <BarcodeScan key="barcode" {...props} /> : <MealScan key="meal" {...props} />
}
