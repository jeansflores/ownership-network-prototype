// Tiny name-based icon wrapper so the variants read the same as the original prototype.
import {
  IconAffiliate,
  IconAlertTriangleFilled,
  IconArrowLeft,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconBan,
  IconBuilding,
  IconBuildingCastle,
  IconChevronLeft,
  IconChevronRight,
  IconCrown,
  IconFocusCentered,
  IconGavel,
  IconHome,
  IconInfoCircle,
  IconRoute,
  IconSearch,
  IconUser,
  IconX,
} from '@tabler/icons-react'
import type { FC } from 'react'

const icons = {
  IconAffiliate,
  IconAlertTriangleFilled,
  IconArrowLeft,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconBan,
  IconBuilding,
  IconBuildingCastle,
  IconChevronLeft,
  IconChevronRight,
  IconCrown,
  IconFocusCentered,
  IconGavel,
  IconHome,
  IconInfoCircle,
  IconRoute,
  IconSearch,
  IconUser,
  IconX,
}

export type IconName = keyof typeof icons

export const Icon: FC<{ name: IconName; size?: number }> = ({ name, size }) => {
  const Component = icons[name]
  return <Component size={size ?? '1em'} stroke={1.5} style={{ verticalAlign: '-0.125em' }} />
}
