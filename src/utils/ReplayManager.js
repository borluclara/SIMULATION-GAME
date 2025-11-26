import { serializeGrid } from './GridSerializer'

const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())
const DEFAULT_FRAME_SAMPLE_MS = 16
const DEFAULT_PHYSICS_SAMPLE_MS = 33

const clampParticles = (debris) => {
  if (!Array.isArray(debris)) return []
  return debris.map((particle) => ({
    x: particle?.body?.position?.x ?? particle?.x ?? 0,
    y: particle?.body?.position?.y ?? particle?.y ?? 0,
    angle: particle?.body?.angle ?? particle?.angle ?? 0,
    size: particle?.size ?? 4,
    color: particle?.color ?? '#ffffff',
    material: particle?.material || 'stone'
  }))
}

const serializeShockwaves = (shockwaves = []) => shockwaves.map((wave) => ({
  id: wave.id,
  x: wave.x,
  y: wave.y,
  radius: wave.radius,
  opacity: wave.opacity,
  lineWidth: wave.lineWidth,
  type: wave.type
}))

const serializeBlockTransitions = (transitions = []) => transitions.map((transition) => ({
  id: transition.id,
  originalX: transition.originalX,
  originalY: transition.originalY,
  currentX: transition.currentX,
  currentY: transition.currentY,
  targetX: transition.targetX,
  targetY: transition.targetY,
  rotation: transition.rotation,
  scale: transition.scale,
  opacity: transition.opacity,
  material: transition.material,
  progress: transition.progress
}))

const serializeActiveAnimations = (animations = []) => animations.map((anim) => ({
  id: anim.id,
  type: anim.type,
  x: anim.x,
  y: anim.y,
  intensity: anim.intensity,
  scale: anim.scale,
  opacity: anim.opacity,
  lineWidth: anim.lineWidth,
  radius: anim.radius,
  color: anim.color
}))

const sanitizeAnimationState = (state) => {
  if (!state) {
    return {
      shockwaves: [],
      blockTransitions: [],
      animations: []
    }
  }

  return {
    shockwaves: serializeShockwaves(state.shockwaves),
    blockTransitions: serializeBlockTransitions(state.blockTransitions),
    animations: serializeActiveAnimations(state.animations)
  }
}

class ReplayManager {
  constructor() {
    this.reset()
  }

  reset() {
    this.currentSession = null
    this.loadedReplay = null
    this.currentEvent = null
  }

  startSession(metadata = {}) {
    this.currentSession = {
      metadata: {
        ...metadata,
        startedAt: new Date().toISOString()
      },
      initialGrid: null,
      events: []
    }
    this.loadedReplay = null
    this.currentEvent = null
  }

  setInitialGrid(gridInstance) {
    if (!gridInstance) return
    if (this.hasLoadedReplay()) {
      return
    }
    if (!this.currentSession) {
      this.startSession()
    }
    this.currentSession.initialGrid = serializeGrid(gridInstance)
  }

  beginEvent(eventMeta = {}) {
    if (!this.currentSession) {
      this.startSession()
    }

    const event = {
      id: `event_${Date.now()}_${this.currentSession.events.length}`,
      startedAt: nowMs(),
      timestamp: new Date().toISOString(),
      blastPower: eventMeta.blastPower,
      blastDirection: eventMeta.blastDirection,
      blasts: eventMeta.blasts || [],
      blastResultSummary: eventMeta.blastResultSummary || null,
      scoreBefore: eventMeta.scoreBefore ?? 0,
      gridBeforeSnapshot: eventMeta.gridSnapshotBefore || null,
      highlights: eventMeta.highlights || null,
      animationFrames: [],
      physicsFrames: [],
      annotations: eventMeta.annotations || null,
      durationMs: 0,
      scoreAfter: eventMeta.scoreBefore ?? 0,
      gridAfterSnapshot: null,
      autoSaveRound: eventMeta.autoSaveRound || null,
      sampleRate: {
        animationMs: eventMeta.animationSampleMs || DEFAULT_FRAME_SAMPLE_MS,
        physicsMs: eventMeta.physicsSampleMs || DEFAULT_PHYSICS_SAMPLE_MS
      },
      _lastAnimationCapture: 0,
      _lastPhysicsCapture: 0
    }

    this.currentSession.events.push(event)
    if (!this.currentSession.initialGrid && event.gridBeforeSnapshot) {
      this.currentSession.initialGrid = event.gridBeforeSnapshot
    }
    this.currentEvent = event
    return event
  }

  recordAnimationFrame(animState, cameraShake = { x: 0, y: 0 }, eventRef = null) {
    const targetEvent = eventRef || this.currentEvent
    if (!targetEvent) return

    const elapsed = nowMs() - targetEvent.startedAt
    if (elapsed - targetEvent._lastAnimationCapture < targetEvent.sampleRate.animationMs) {
      return
    }

    targetEvent._lastAnimationCapture = elapsed
    targetEvent.animationFrames.push({
      t: elapsed,
      cameraShake: { x: cameraShake.x || 0, y: cameraShake.y || 0 },
      state: sanitizeAnimationState(animState)
    })
  }

  recordPhysicsFrame(debrisState, eventRef = null) {
    const targetEvent = eventRef || this.currentEvent
    if (!targetEvent) return

    const elapsed = nowMs() - targetEvent.startedAt
    if (elapsed - targetEvent._lastPhysicsCapture < targetEvent.sampleRate.physicsMs) {
      return
    }

    targetEvent._lastPhysicsCapture = elapsed
    targetEvent.physicsFrames.push({
      t: elapsed,
      debris: clampParticles(debrisState)
    })
  }

  endEvent(eventMeta = {}) {
    const targetEvent = eventMeta.eventRef || this.currentEvent
    if (!targetEvent) return

    targetEvent.durationMs = nowMs() - targetEvent.startedAt
    targetEvent.scoreAfter = eventMeta.scoreAfter ?? targetEvent.scoreBefore
    targetEvent.scoreDelta = targetEvent.scoreAfter - targetEvent.scoreBefore
    targetEvent.gridAfterSnapshot = eventMeta.gridSnapshotAfter || null
    targetEvent.summary = eventMeta.summary || null
    targetEvent.autoSaveReference = eventMeta.autoSaveReference || null

    this.currentEvent = null
    return targetEvent
  }

  exportReplayData() {
    if (!this.currentSession) {
      return null
    }
    return {
      ...this.currentSession,
      exportedAt: new Date().toISOString()
    }
  }

  loadReplay(replayData) {
    if (!replayData) {
      this.loadedReplay = null
      return null
    }
    this.loadedReplay = replayData
    return this.loadedReplay
  }

  getReplayData() {
    return this.loadedReplay || this.currentSession || null
  }

  hasReplay() {
    const replay = this.getReplayData()
    return Boolean(replay && replay.events && replay.events.length > 0)
  }

  hasLoadedReplay() {
    return Boolean(this.loadedReplay)
  }

  getLatestEvent() {
    const replay = this.getReplayData()
    if (!replay || !replay.events || replay.events.length === 0) {
      return null
    }
    return replay.events[replay.events.length - 1]
  }
}

const replayManager = new ReplayManager()
export default replayManager
export { ReplayManager }
