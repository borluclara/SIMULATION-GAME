const getTimestamp = () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
  ? performance.now()
  : Date.now())

const hasWindow = typeof window !== 'undefined'
const requestFrame = hasWindow && typeof window.requestAnimationFrame === 'function'
  ? (cb) => window.requestAnimationFrame(cb)
  : (cb) => setTimeout(() => cb(getTimestamp()), 16)
const cancelFrame = hasWindow && typeof window.cancelAnimationFrame === 'function'
  ? (id) => window.cancelAnimationFrame(id)
  : (id) => clearTimeout(id)

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

const computeDuration = (event) => {
  if (!event) return 0
  const animationDuration = event.animationFrames?.length
    ? event.animationFrames[event.animationFrames.length - 1].t
    : 0
  const physicsDuration = event.physicsFrames?.length
    ? event.physicsFrames[event.physicsFrames.length - 1].t
    : 0
  return Math.max(event.durationMs || 0, animationDuration, physicsDuration)
}

class ReplayEngine {
  constructor() {
    this.replayData = null
    this.playback = null
    this.status = 'idle'
    this.progress = 0
    this.handlers = {}
    this.rafId = null
    this.runLoop = this.runLoop.bind(this)
  }

  configureHandlers(handlers = {}) {
    this.handlers = { ...this.handlers, ...handlers }
  }

  clearHandlers() {
    this.handlers = {}
  }

  setStatus(nextStatus) {
    if (this.status === nextStatus) return
    this.status = nextStatus
    this.handlers.onStatusChange?.(nextStatus)
  }

  setProgress(value) {
    const clamped = Math.max(0, Math.min(1, value || 0))
    this.progress = clamped
    this.handlers.onProgress?.(clamped)
  }

  loadReplay(replayData) {
    if (!replayData) {
      this.replayData = null
      this.playback = null
      this.setStatus('idle')
      this.setProgress(0)
      this.handlers.onEventChange?.({ event: null, index: null })
      return
    }
    this.replayData = replayData
  }

  hasReplay() {
    const replay = this.replayData
    return Boolean(replay && Array.isArray(replay.events) && replay.events.length > 0)
  }

  getStatus() {
    return this.status
  }

  getCurrentEvent() {
    return this.playback?.event || null
  }

  cancelRaf() {
    if (!this.rafId) return
    cancelFrame(this.rafId)
    this.rafId = null
  }

  async startReplay({ eventIndex } = {}) {
    if (!this.hasReplay()) {
      return false
    }

    const replay = this.replayData
    const targetIndex = typeof eventIndex === 'number' ? eventIndex : replay.events.length - 1
    const event = replay.events[targetIndex]
    if (!event) {
      return false
    }

    this.cancelRaf()

    this.playback = {
      event,
      animationIndex: 0,
      physicsIndex: 0,
      elapsed: 0,
      elapsedOffset: 0,
      startTime: null,
      duration: Math.max(1, computeDuration(event)),
      status: 'preparing'
    }

    this.setProgress(0)
    this.setStatus('preparing')
    this.handlers.onEventChange?.({ event, index: targetIndex })

    const gridSnapshot = event.gridBeforeSnapshot || replay.initialGrid || null
    if (gridSnapshot && this.handlers.rebuildGridFromSnapshot) {
      try {
        const restoredGrid = await this.handlers.rebuildGridFromSnapshot({ grid: gridSnapshot })
        this.handlers.onReplayGrid?.(restoredGrid)
      } catch (error) {
        console.error('ReplayEngine failed to rebuild grid snapshot:', error)
        this.stopReplay()
        return false
      }
    }

    this.handlers.onAnimationFrame?.(null)
    this.handlers.onPhysicsFrame?.([])
    this.handlers.onCameraShake?.({ x: 0, y: 0 })

    this.playback.status = 'playing'
    this.playback.elapsedOffset = 0
    this.playback.startTime = null
    this.setStatus('playing')
    this.rafId = requestFrame(this.runLoop)
    return true
  }

  pauseReplay() {
    const playback = this.playback
    if (!playback || this.status !== 'playing') return

    playback.status = 'paused'
    playback.elapsedOffset = playback.elapsed || playback.elapsedOffset || 0
    playback.startTime = null
    this.cancelRaf()
    this.setStatus('paused')
  }

  resumeReplay() {
    const playback = this.playback
    if (!playback || this.status !== 'paused') return

    playback.status = 'playing'
    playback.startTime = null
    this.setStatus('playing')
    this.rafId = requestFrame(this.runLoop)
  }

  stepReplay(stepMs = 33) {
    const playback = this.playback
    if (!playback) return

    this.cancelRaf()
    const currentElapsed = playback.elapsed || 0
    const nextElapsed = Math.min(playback.duration, currentElapsed + stepMs)
    playback.elapsedOffset = nextElapsed
    playback.startTime = null
    playback.status = 'paused'
    this.setStatus('paused')
    this.applyFramesUntil(nextElapsed)

    if (nextElapsed >= playback.duration) {
      this.handleReplayComplete()
    }
  }

  stopReplay() {
    this.cancelRaf()
    this.playback = null
    this.setProgress(0)
    this.handlers.onEventChange?.({ event: null, index: null })
    this.setStatus('idle')
  }

  runLoop(timestamp) {
    const playback = this.playback
    if (!playback || playback.status !== 'playing') {
      return
    }

    if (!playback.startTime) {
      playback.startTime = timestamp
    }

    const elapsed = playback.elapsedOffset + (timestamp - playback.startTime)
    this.applyFramesUntil(elapsed)

    if (elapsed >= playback.duration) {
      this.handleReplayComplete()
      return
    }

    this.rafId = requestFrame(this.runLoop)
  }

  applyFramesUntil(elapsed) {
    const playback = this.playback
    if (!playback) return

    const event = playback.event
    playback.elapsed = elapsed

    const animationFrames = event.animationFrames || []
    while (playback.animationIndex < animationFrames.length && animationFrames[playback.animationIndex].t <= elapsed) {
      const frame = animationFrames[playback.animationIndex]
      this.handlers.onAnimationFrame?.(frame?.state || null)
      this.handlers.onCameraShake?.(frame?.cameraShake || { x: 0, y: 0 })
      playback.animationIndex += 1
    }

    const physicsFrames = event.physicsFrames || []
    while (playback.physicsIndex < physicsFrames.length && physicsFrames[playback.physicsIndex].t <= elapsed) {
      playback.physicsIndex += 1
    }

    this.applyInterpolatedPhysicsFrame(elapsed)

    const duration = playback.duration || 1
    this.setProgress(Math.min(1, elapsed / duration))
  }

  applyInterpolatedPhysicsFrame(elapsed) {
    const playback = this.playback
    if (!playback) return

    const frames = playback.event?.physicsFrames || []
    if (frames.length === 0) {
      this.handlers.onPhysicsFrame?.([])
      return
    }

    if (frames.length === 1) {
      this.handlers.onPhysicsFrame?.(frames[0].debris || [])
      return
    }

    const prevIndex = Math.max(0, Math.min(frames.length - 1, playback.physicsIndex - 1))
    const nextIndex = Math.max(prevIndex, Math.min(frames.length - 1, playback.physicsIndex))
    const prevFrame = frames[prevIndex]
    const nextFrame = frames[nextIndex]

    if (!prevFrame) {
      this.handlers.onPhysicsFrame?.([])
      return
    }
    if (!nextFrame || nextFrame.t === prevFrame.t || nextFrame === prevFrame) {
      this.handlers.onPhysicsFrame?.(prevFrame.debris || [])
      return
    }

    const clampedElapsed = Math.min(Math.max(elapsed, prevFrame.t), nextFrame.t)
    const factor = (clampedElapsed - prevFrame.t) / (nextFrame.t - prevFrame.t)
    const interpolated = interpolateDebrisParticles(prevFrame.debris || [], nextFrame.debris || [], factor)
    this.handlers.onPhysicsFrame?.(interpolated)
  }

  handleReplayComplete() {
    this.cancelRaf()
    this.setProgress(1)
    this.playback = null
    this.handlers.onEventChange?.({ event: null, index: null })
    this.setStatus('idle')
    this.handlers.onComplete?.()
  }
}

export default ReplayEngine
