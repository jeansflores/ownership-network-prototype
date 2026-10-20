// Graph model and traversal helpers shared by the three map variants.

export type EntityKind = 'company' | 'person'
export type EntityRole = 'own' | 'analyzed' | 'other'
export type RegistrationStatus = 'Ativa' | 'Baixada' | 'Inapta'
export type LinkRelation = 'partner' | 'administrator' | 'related'

export interface NetworkEntity {
  id: string
  kind: EntityKind
  name: string
  document: string
  role: EntityRole
  registrationStatus?: RegistrationStatus
  restrictedLists: string[]
  pep: boolean
  title?: string
}

export interface NetworkLink {
  id: string
  from: string
  to: string
  relation: LinkRelation
  share?: number
  active: boolean
}

export interface Network {
  entities: NetworkEntity[]
  links: NetworkLink[]
  ownId: string
  centralId: string
  conflictIds: Set<string>
}

export type NetworkSize = 'small' | 'medium'

/** A conflict is a person shared between our own house and an analysed house, or any entity on a restriction list. */
export function computeConflicts(network: Network): Set<string> {
  const conflicts = new Set<string>()
  const adjacency = buildAdjacency(network)
  const analyzedIds = new Set(network.entities.filter(e => e.role === 'analyzed').map(e => e.id))

  for (const entity of network.entities) {
    if (entity.restrictedLists.length > 0) conflicts.add(entity.id)
    if (entity.kind !== 'person') continue
    const neighbors = adjacency.get(entity.id) ?? []
    const linkedToOwn = neighbors.some(n => n.otherId === network.ownId)
    const linkedToAnalyzed = neighbors.some(n => analyzedIds.has(n.otherId))
    if (linkedToOwn && linkedToAnalyzed) conflicts.add(entity.id)
  }
  return conflicts
}

export interface AdjacencyEntry {
  link: NetworkLink
  otherId: string
}

export type Adjacency = Map<string, AdjacencyEntry[]>

export function buildAdjacency(network: Network): Adjacency {
  const adjacency: Adjacency = new Map()
  const push = (id: string, entry: AdjacencyEntry) => {
    const list = adjacency.get(id)
    if (list) list.push(entry)
    else adjacency.set(id, [entry])
  }
  for (const link of network.links) {
    push(link.from, { link, otherId: link.to })
    push(link.to, { link, otherId: link.from })
  }
  return adjacency
}

/** Breadth-first depth of every reachable entity from the given roots. Unreachable ones are absent. */
export function bfsDepths(adjacency: Adjacency, roots: string[]): Map<string, number> {
  const depths = new Map<string, number>()
  const queue: string[] = []
  for (const root of roots) {
    depths.set(root, 0)
    queue.push(root)
  }
  while (queue.length > 0) {
    const current = queue.shift() as string
    const depth = depths.get(current) as number
    for (const { otherId } of adjacency.get(current) ?? []) {
      if (depths.has(otherId)) continue
      depths.set(otherId, depth + 1)
      queue.push(otherId)
    }
  }
  return depths
}

/** Breadth-first tree: parent of every reachable entity, roots excluded. */
export function bfsParents(adjacency: Adjacency, root: string): Map<string, string> {
  const parents = new Map<string, string>()
  const seen = new Set<string>([root])
  const queue = [root]
  while (queue.length > 0) {
    const current = queue.shift() as string
    for (const { otherId } of adjacency.get(current) ?? []) {
      if (seen.has(otherId)) continue
      seen.add(otherId)
      parents.set(otherId, current)
      queue.push(otherId)
    }
  }
  return parents
}

export function shortestPath(adjacency: Adjacency, from: string, to: string): string[] | null {
  if (from === to) return [from]
  const parents = bfsParents(adjacency, from)
  if (!parents.has(to)) return null
  const path = [to]
  let cursor = to
  while (cursor !== from) {
    cursor = parents.get(cursor) as string
    path.unshift(cursor)
  }
  return path
}

export function entityById(network: Network): Map<string, NetworkEntity> {
  return new Map(network.entities.map(e => [e.id, e]))
}

export const RELATION_LABEL: Record<LinkRelation, string> = {
  partner: 'Sócio',
  administrator: 'Administrador',
  related: 'Relacionada',
}
