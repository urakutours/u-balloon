type Props = {
  height?: 'sm' | 'md' | 'lg' | 'xl'
}

const heightClass = {
  sm: 'h-4',
  md: 'h-8',
  lg: 'h-16',
  xl: 'h-24',
}

export function SpacerBlockRenderer({ height = 'md' }: Props) {
  return <div className={heightClass[height]} aria-hidden="true" />
}
