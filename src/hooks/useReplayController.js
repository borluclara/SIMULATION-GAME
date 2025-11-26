import { useCallback, useRef, useState } from 'react'
import replayManager from '../utils/ReplayManager'

const applyAnimationFrame = (frame, setAnimationState, setCameraShake) => {
  if (!frame) return
  setAnimationState(frame.state)
  setCameraShake(frame.cameraShake || { x: 0, y: 0 })
}

const applyPhysicsFrame = (frameOrDebris, setPhysicsDebris) => {
  if (!frameOrDebris) return
  const debris = Array.isArray(frameOrDebris)
    ? frameOrDebris
    : frameOrDebris.debris || []
  setPhysicsDebris(debris)
}

const lerp = (start = 0, end = 0, factor = 0) => start + (end - start) * factor

const interpolateDebrisParticles = (fromParticles = [], toParticles = [], factor = 0) => {
  const maxLength = Math.max(fromParticles.length, toParticles.length)
  if (maxLength === 0) return []

  const result = []
  for (let i = 0; i < maxLength; i += 1) {
    const startParticle = fromParticles[i] || toParticles[i]
    const endParticle = toParticles[i] || fromParticles[i] || startParticle
    if (!startParticle && !endParticle) continue

    const interpolated = {
      ...startParticle,
      x: lerp(startParticle?.x ?? 0, endParticle?.x ?? startParticle?.x ?? 0, factor),
      y: lerp(startParticle?.y ?? 0, endParticle?.y ?? startParticle?.y ?? 0, factor),
      angle: lerp(startParticle?.angle ?? 0, endParticle?.angle ?? startParticle?.angle ?? 0, factor),
      size: lerp(startParticle?.size ?? 0, endParticle?.size ?? startParticle?.size ?? 0, factor)
    }

    // Preserve color/material from the end state for visual consistency
    if (endParticle?.color) {
      interpolated.color = endParticle.color
    }
    if (endParticle?.material) {
      interpolated.material = endParticle.material
    }

    result.push(interpolated)
  }

  return result
}

const applyInterpolatedPhysicsFrame = (playback, setPhysicsDebris, elapsed) => {
  const frames = playback.event?.physicsFrames || []
  if (frames.length === 0) return

  if (frames.length === 1) {
    applyPhysicsFrame(frames[0], setPhysicsDebris)
    return
  }

  const prevIndex = Math.max(0, Math.min(frames.length - 1, playback.physicsIndex - 1))
  const nextIndex = Math.max(prevIndex, Math.min(frames.length - 1, playback.physicsIndex))
  const prevFrame = frames[prevIndex]
  const nextFrame = frames[nextIndex]

  if (!prevFrame) return
  if (!nextFrame || nextFrame.t === prevFrame.t || nextFrame === prevFrame) {
    applyPhysicsFrame(prevFrame, setPhysicsDebris)
    return
  }

  const clampedElapsed = Math.min(Math.max(elapsed, prevFrame.t), nextFrame.t)
  const factor = (clampedElapsed - prevFrame.t) / (nextFrame.t - prevFrame.t)
  const interpolatedDebris = interpolateDebrisParticles(prevFrame.debris || [], nextFrame.debris || [], factor)
  applyPhysicsFrame(interpolatedDebris, setPhysicsDebris)
}

const computeDuration = (event) => {
  const animationDuration = event?.animationFrames?.length
    ? event.animationFrames[event.animationFrames.length - 1].t
    : 0
  const physicsDuration = event?.physicsFrames?.length
    ? event.physicsFrames[event.physicsFrames.length - 1].t
    : 0
  return Math.max(event?.durationMs || 0, animationDuration, physicsDuration)
}

export const useReplayController = ({
  rebuildGridFromSnapshot,
  setReplayGrid,
  setAnimationState,
  setPhysicsDebris,
  setCameraShake
}) => {
  const [status, setStatus] = useState('idle') // idle | playing | paused
  const [currentEventIndex, setCurrentEventIndex] = useState(null)
  const [progress, setProgress] = useState(0)
  const [activeEvent, setActiveEvent] = useState(null)
  const rafRef = useRef(null)
  const playbackRef = useRef(null)

  const clearRaf = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const cleanupReplayView = useCallback(() => {
    setAnimationState(null)
    setPhysicsDebris([])
    setCameraShake({ x: 0, y: 0 })
    setReplayGrid(null)
  }, [setAnimationState, setCameraShake, setPhysicsDebris, setReplayGrid])

  const applyFramesUntil = useCallback((elapsed) => {
    const playback = playbackRef.current
    if (!playback) return

    const event = playback.event
    playback.elapsed = elapsed

    const animationFrames = event.animationFrames || []
    while (playback.animationIndex < animationFrames.length && animationFrames[playback.animationIndex].t <= elapsed) {
      applyAnimationFrame(animationFrames[playback.animationIndex], setAnimationState, setCameraShake)
      playback.animationIndex += 1
    }

    const physicsFrames = event.physicsFrames || []
    while (playback.physicsIndex < physicsFrames.length && physicsFrames[playback.physicsIndex].t <= elapsed) {
      playback.physicsIndex += 1
    }

    applyInterpolatedPhysicsFrame(playback, setPhysicsDebris, elapsed)

    const duration = playback.duration || 1
    setProgress(Math.min(1, elapsed / duration))
  }, [setAnimationState, setCameraShake, setPhysicsDebris])

  const handleReplayComplete = useCallback(() => {
    const playback = playbackRef.current
    if (!playback) return

    clearRaf()
    setStatus('idle')
    setProgress(1)
    setCurrentEventIndex(null)
    setActiveEvent(null)
    cleanupReplayView()
    playbackRef.current = null
  }, [cleanupReplayView])

  const runPlayback = useCallback((timestamp) => {
    const playback = playbackRef.current
    if (!playback || playback.status !== 'playing') return

    if (!playback.startTime) {
      playback.startTime = timestamp
    }

    const elapsed = playback.elapsedOffset + (timestamp - playback.startTime)
    applyFramesUntil(elapsed)

    if (elapsed >= playback.duration) {
      handleReplayComplete()
      return
    }

    rafRef.current = requestAnimationFrame(runPlayback)
  }, [applyFramesUntil, handleReplayComplete])

  const startReplay = useCallback(async ({ eventIndex } = {}) => {
    const replay = replayManager.getReplayData()
    if (!replay || !replay.events || replay.events.length === 0) {
      return false
    }

    const targetIndex = typeof eventIndex === 'number' ? eventIndex : replay.events.length - 1
    const event = replay.events[targetIndex]
    if (!event) return false

    clearRaf()

    // Prepare playback state
    playbackRef.current = {
      event,
      animationIndex: 0,
      physicsIndex: 0,
      elapsed: 0,
      elapsedOffset: 0,
      startTime: null,
      duration: Math.max(1, computeDuration(event)),
      status: 'playing'
    }

    setStatus('preparing')
    setCurrentEventIndex(targetIndex)
    setActiveEvent(event)
    setProgress(0)

    const gridSnapshot = event.gridBeforeSnapshot || replay.initialGrid || null
    if (gridSnapshot) {
      try {
        const restoredGrid = await rebuildGridFromSnapshot({ grid: gridSnapshot })
        setReplayGrid(restoredGrid)
      } catch (error) {
        console.error('Failed to reconstruct grid for replay:', error)
        playbackRef.current = null
        setStatus('idle')
        setCurrentEventIndex(null)
        setActiveEvent(null)
        cleanupReplayView()
        return false
      }
    }

    setAnimationState(null)
    setPhysicsDebris([])
    setCameraShake({ x: 0, y: 0 })

    setStatus('playing')
    playbackRef.current.status = 'playing'
    playbackRef.current.elapsedOffset = 0
    playbackRef.current.startTime = null

    rafRef.current = requestAnimationFrame(runPlayback)
    return true
  }, [cleanupReplayView, rebuildGridFromSnapshot, runPlayback, setAnimationState, setCameraShake, setPhysicsDebris, setReplayGrid])

  const pauseReplay = useCallback(() => {
    const playback = playbackRef.current
    if (!playback || playback.status !== 'playing') return

    playback.status = 'paused'
    playback.elapsedOffset = playback.elapsed || playback.elapsedOffset || 0
    playback.startTime = null
    setStatus('paused')
    clearRaf()
  }, [])

  const resumeReplay = useCallback(() => {
    const playback = playbackRef.current
    if (!playback || playback.status !== 'paused') return

    playback.status = 'playing'
    playback.startTime = null
    setStatus('playing')
    rafRef.current = requestAnimationFrame(runPlayback)
  }, [runPlayback])

  const stepReplay = useCallback((stepMs = 33) => {
    const playback = playbackRef.current
    if (!playback || playback.status === 'idle') return

    const currentElapsed = playback.elapsed || 0
    const nextElapsed = Math.min(playback.duration, currentElapsed + stepMs)
    playback.elapsedOffset = nextElapsed
    playback.startTime = null
    playback.status = 'paused'
    setStatus('paused')
    applyFramesUntil(nextElapsed)

    if (nextElapsed >= playback.duration) {
      handleReplayComplete()
    }
  }, [applyFramesUntil, handleReplayComplete])

  const stopReplay = useCallback(() => {
    const playback = playbackRef.current
    if (!playback) return

    clearRaf()
    setStatus('idle')
    setProgress(0)
    setCurrentEventIndex(null)
    setActiveEvent(null)
    playbackRef.current = null
    cleanupReplayView()
  }, [cleanupReplayView])

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
