import { useState } from 'react'
import { useNavigate } from 'react-router'
import { startWorkout } from '../../db/workouts'

/** Starts (or resumes) a workout and opens the live workout screen. */
export function useStartWorkout() {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const start = async (splitDayId: string | null) => {
    if (starting) return
    setStarting(true)
    try {
      const id = await startWorkout(splitDayId)
      navigate(`/workout/${id}`)
    } finally {
      setStarting(false)
    }
  }
  return { start, starting }
}
