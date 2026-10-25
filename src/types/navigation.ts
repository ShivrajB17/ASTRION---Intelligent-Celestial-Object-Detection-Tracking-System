export type AppViewMode = 'landing' | 'workspace'

export type NavigationRoute =
  | 'mission-control'
  | 'observation-explorer'
  | 'detection-lab'
  | 'tracking-studio'
  | 'candidate-intelligence'
  | 'scientific-reports'
  | 'data-sources'
  | 'settings'

export interface NavItem {
  id: NavigationRoute
  label: string
  iconName: string
  badge?: string
  description: string
}
