import { ScreenHeader } from '../../components/ScreenHeader'
import { ScreenSkeleton } from '../../components/Skeleton'
import { useSettings } from '../../hooks/useAppData'
import { MeasurementsCard } from '../body/MeasurementsCard'
import { PhotosCard } from '../body/PhotosCard'
import { WeightCard } from '../body/WeightCard'
import { ProgressTabs } from './ProgressTabs'

/** /progress/body — weight trend, measurements and progress photos. */
export default function BodyScreen() {
  const settings = useSettings()
  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader eyebrow="Progress" title="Body" />
      <ProgressTabs current="body" />
      {!settings ? (
        <ScreenSkeleton />
      ) : (
        <>
          <WeightCard unit={settings.weightUnit} />
          <MeasurementsCard unit={settings.lengthUnit} />
          <PhotosCard unit={settings.weightUnit} />
        </>
      )}
    </div>
  )
}
