import { OreGrid as OreGridClass, OreBlock } from './OreGrid'
import { materialPropertyHandler } from './MaterialPropertyHandler'

const DEFAULT_WIDTH = 1
const DEFAULT_HEIGHT = 1

const sanitizeBlockValue = (value, fallback = null) => (value !== undefined ? value : fallback)

const inferDimensions = (snapshot) => {
  if (!snapshot) {
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
  }

  const blocks = snapshot.blocks || snapshot.data || []
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return {
      width: snapshot.width || DEFAULT_WIDTH,
      height: snapshot.height || DEFAULT_HEIGHT
    }
  }

  const inferredWidth = snapshot.width ?? (Math.max(...blocks.map(block => block?.x ?? 0)) + 1)
  const inferredHeight = snapshot.height ?? (Math.max(...blocks.map(block => block?.y ?? 0)) + 1)

  return {
    width: Math.max(DEFAULT_WIDTH, inferredWidth || 0),
    height: Math.max(DEFAULT_HEIGHT, inferredHeight || 0)
  }
}

const serializeBlock = (block) => {
  if (!block) return null

  return {
    x: block.x,
    y: block.y,
    oreType: block.oreType || block.material || block.type || 'stone',
    material: block.material || block.oreType || block.type || 'stone',
    hardness: sanitizeBlockValue(block.hardness, 100),
    maxHealth: sanitizeBlockValue(block.maxHealth, block.hardness ?? 100),
    health: sanitizeBlockValue(block.health, block.maxHealth ?? block.hardness ?? 100),
    value: sanitizeBlockValue(block.value, block.game_value ?? 10),
    damage: sanitizeBlockValue(block.damage, 0),
    isDestroyed: Boolean(block.isDestroyed),
    recentlyDisplaced: Boolean(block.recentlyDisplaced),
    isDisplaced: Boolean(block.isDisplaced),
    isBlasted: Boolean(block.isBlasted),
    animatedX: sanitizeBlockValue(block.animatedX, block.x),
    animatedY: sanitizeBlockValue(block.animatedY, block.y),
    crackLevel: sanitizeBlockValue(block.crackLevel, 0),
    crackPatterns: block.crackPatterns || null,
    fragmentationData: block.fragmentationData || null
  }
}

export const serializeGrid = (grid) => {
  if (!grid) return null

  const blocks = typeof grid.getAllBlocks === 'function'
    ? grid.getAllBlocks()
    : Array.isArray(grid.blocks)
      ? grid.blocks.flat()
      : Array.isArray(grid.data)
        ? grid.data.flat()
        : []

  const serializedBlocks = blocks
    .filter(Boolean)
    .map(serializeBlock)

  const width = grid.width ?? (grid.data ? grid.data[0]?.length : DEFAULT_WIDTH)
  const height = grid.height ?? (grid.data ? grid.data.length : DEFAULT_HEIGHT)

  return {
    width: Math.max(DEFAULT_WIDTH, width || DEFAULT_WIDTH),
    height: Math.max(DEFAULT_HEIGHT, height || DEFAULT_HEIGHT),
    blocks: serializedBlocks
  }
}

export const deserializeGrid = (snapshot) => {
  if (!snapshot) {
    throw new Error('Cannot deserialize grid: snapshot is missing')
  }

  const { width, height } = inferDimensions(snapshot)
  const blockSnapshots = snapshot.blocks || snapshot.data || []

  const grid = new OreGridClass(width, height)
  grid.grid = Array.from({ length: height }, () => Array(width).fill(null))

  blockSnapshots.forEach((blockData) => {
    if (typeof blockData?.x !== 'number' || typeof blockData?.y !== 'number') {
      return
    }

    const oreType = blockData.oreType || blockData.material || blockData.type || 'stone'
    const hardness = blockData.maxHealth ?? blockData.hardness ?? blockData.hardness_mohs ?? 100
    const value = blockData.value ?? blockData.game_value ?? 10
    const materialProps = materialPropertyHandler.getMaterialProperties(oreType)

    const oreBlock = new OreBlock(blockData.x, blockData.y, oreType, hardness, value, materialProps)
    oreBlock.maxHealth = blockData.maxHealth ?? hardness
    oreBlock.health = blockData.health ?? oreBlock.maxHealth
    oreBlock.damage = blockData.damage ?? (oreBlock.maxHealth - oreBlock.health)
    oreBlock.isDestroyed = Boolean(blockData.isDestroyed)
    oreBlock.recentlyDisplaced = Boolean(blockData.recentlyDisplaced)
    oreBlock.isDisplaced = Boolean(blockData.isDisplaced)
    oreBlock.isBlasted = Boolean(blockData.isBlasted)
    oreBlock.animatedX = blockData.animatedX ?? oreBlock.x
    oreBlock.animatedY = blockData.animatedY ?? oreBlock.y
    oreBlock.crackLevel = blockData.crackLevel ?? oreBlock.crackLevel
    oreBlock.crackPatterns = blockData.crackPatterns || oreBlock.crackPatterns
    oreBlock.fragmentationData = blockData.fragmentationData || null

    grid.setBlock(oreBlock.x, oreBlock.y, oreBlock)
  })

  return grid
}
