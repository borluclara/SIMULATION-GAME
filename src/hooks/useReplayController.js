import { useCallback, useRef, useState, useEffect } from 'react'
import replayManager from '../utils/ReplayManager'
import ReplayEngine from '../utils/ReplayEngine'

export const useReplayController = ({
  rebuildGridFromSnapshot,
  setReplayGrid,
  setAnimationState,
  setPhysicsDebris,
  setCameraShake
}) => {
  const engineRef = useRef(null)
  if (!engineRef.current) {
    engineRef.current = new ReplayEngine()
  }

  const [status, setStatus] = useState('idle')
  const [currentEventIndex, setCurrentEventIndex] = useState(null)
  const [progress, setProgress] = useState(0)
  const [activeEvent, setActiveEvent] = useState(null)

  const cleanupReplayView = useCallback(() => {
    setAnimationState(null)
    setPhysicsDebris([])
    setCameraShake({ x: 0, y: 0 })
    setReplayGrid(null)
  }, [setAnimationState, setCameraShake, setPhysicsDebris, setReplayGrid])

  useEffect(() => {
    const engine = engineRef.current

    engine.configureHandlers({
      rebuildGridFromSnapshot,
      onReplayGrid: setReplayGrid,
      onAnimationFrame: (state) => setAnimationState(state),
      onCameraShake: (shake) => setCameraShake(shake || { x: 0, y: 0 }),
      onPhysicsFrame: (debris) => setPhysicsDebris(debris || []),
      onProgress: (value) => setProgress(value),
      onStatusChange: (nextStatus) => {
        setStatus(nextStatus)
        if (nextStatus === 'idle') {
          cleanupReplayView()
        }
      },
      onEventChange: ({ event, index }) => {
        setActiveEvent(event)
        setCurrentEventIndex(typeof index === 'number' ? index : null)
      },
      onComplete: () => {
        setActiveEvent(null)
        setCurrentEventIndex(null)
      }
    })

    return () => {
      engine.stopReplay()
      engine.clearHandlers()
    }
  }, [cleanupReplayView, rebuildGridFromSnapshot, setAnimationState, setCameraShake, setPhysicsDebris, setReplayGrid])

  const startReplay = useCallback(async ({ eventIndex } = {}) => {
    const engine = engineRef.current
    const replayData = replayManager.getReplayData()
    if (!replayData) {
      return false
    }

    engine.loadReplay(replayData)
    return engine.startReplay({ eventIndex })
  }, [])

  const pauseReplay = useCallback(() => {
    engineRef.current.pauseReplay()
  }, [])

  const resumeReplay = useCallback(() => {
    engineRef.current.resumeReplay()
  }, [])

  const stepReplay = useCallback((stepMs = 33) => {
    engineRef.current.stepReplay(stepMs)
  }, [])

  const stopReplay = useCallback(() => {
    engineRef.current.stopReplay()
  }, [])

  const hasReplay = replayManager.hasReplay()

  return {
    status,
    progress,
    currentEventIndex,
    currentEvent: activeEvent,
    canReplay: hasReplay,
    startReplay,
    pauseReplay,
    resumeReplay,
    stepReplay,
    stopReplay
  }
}

export default useReplayController
