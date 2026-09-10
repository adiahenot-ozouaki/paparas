export type AdPlacementId =
  | 'home-banner-top'
  | 'home-banner-bottom'
  | 'home-rail'
  | 'mode-banner'
  | 'tournaments-banner'
  | 'leaderboard-banner'

export type AdSize = 'banner' | 'leaderboard' | 'rectangle' | 'rail'

export interface AdPlacementConfig {
  id: AdPlacementId
  size: AdSize
  label: string
}

export const AD_PLACEMENTS: Record<AdPlacementId, AdPlacementConfig> = {
  'home-banner-top': { id: 'home-banner-top', size: 'banner', label: 'Accueil \u00b7 haut' },
  'home-banner-bottom': { id: 'home-banner-bottom', size: 'banner', label: 'Accueil \u00b7 bas' },
  'home-rail': { id: 'home-rail', size: 'rail', label: 'Accueil \u00b7 rail desktop' },
  'mode-banner': { id: 'mode-banner', size: 'banner', label: 'Mode de jeu' },
  'tournaments-banner': { id: 'tournaments-banner', size: 'leaderboard', label: 'Tournois' },
  'leaderboard-banner': { id: 'leaderboard-banner', size: 'banner', label: 'Classement' },
}
