import { THEME_COMMON } from 'kovaa-lab-ui/theme';

// Product layout facts the mockup mirrors that aren't part of kovaa-lab-ui's
// theme. The spacing base and nav-item height derive from kovaa-lab-ui's spacing
// unit; the header height, drawer width and record-table row height are
// kovaa-lab-front layout constants (AppHeaderHeight / NavigationDrawerConstraints
// / RecordTableRowHeight).
export const APP_PREVIEW_CHROME = {
  spacingBasePx: THEME_COMMON.spacingMultiplicator,
  appHeaderHeightPx: 48,
  navigationItemHeightPx: THEME_COMMON.spacingMultiplicator * 7,
  navigationDrawerWidthPx: 220,
  navigationDrawerPaddingPx: THEME_COMMON.spacingMultiplicator * 2,
  recordTableRowHeightPx: 32,
};
