import type { Network } from './graph'

export interface VariantProps {
  network: Network
  centralId: string
  onCentralChange: (id: string) => void
}
