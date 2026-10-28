import { badgeTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/badgeTest';
import { currencyPickerTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/currencyPickerTest';
import { dropdownTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/dropdownTest';
import { phoneCountryPickerTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/phoneCountryPickerTest';
import { phoneCountryPickerTriggerTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/phoneCountryPickerTriggerTest';
import { breadcrumbTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/breadcrumbTest';
import { imageInputTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/imageInputTest';
import { overflowingListApiTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/overflowingListApiTest';
import { overflowingListEventIsolationTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/overflowingListEventIsolationTest';
import { overflowingListGeometryTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/overflowingListGeometryTest';
import { overflowingListPopupTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/overflowingListPopupTest';
import { jsonTreeTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/jsonTreeTest';
import { inlineBannerTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/inlineBannerTest';
import { themeTokenTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/themeTokenTest';
import { tintedIconTileTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/tintedIconTileTest';
import { animatedIconCrossfadeTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/animatedIconCrossfadeTest';
import { progressTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/progressTest';
import { inputTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/inputTest';
import { numberStepperTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/numberStepperTest';
import { numberStepperSelectionTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/numberStepperSelectionTest';
import { numberFieldTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/numberFieldTest';
import { settingsRowTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/settingsRowTest';
import { layoutTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/layoutTest';
import { listItemTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/listItemTest';
import { resizeHandlePanelTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/resizeHandlePanelTest';
import { pickerListItemsTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/pickerListItemsTest';
import { iconButtonElevatedTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/iconButtonElevatedTest';
import { buttonContractsTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/buttonContractsTest';
import { buttonControlsTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/buttonControlsTest';
import { navigationControlsTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/navigationControlsTest';
import { responsiveHooksTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/responsiveHooksTest';
import { RESPONSIVE_HOOKS_WIDGET_SIZING } from '@/__stories__/kovaa-lab-ui-gallery/constants/RESPONSIVE_HOOKS_WIDGET_SIZING';
import { dialogTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/dialogTest';
import { toastCountdownTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/toastCountdownTest';
import { type Meta } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import {
  FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  errorHandler,
  resetFrontComponentStoryMocks,
} from '@/__stories__/shared/test-utils/createFrontComponentStoryMeta';
import { MOUNT_TIMEOUT } from '@/__stories__/shared/test-utils/timeouts';
import { type KovaaLab CRMUiGalleryPlayFunction } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryPlayFunction';
import { type KovaaLab CRMUiGalleryStory as Story } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryStory';
import { statusControlsTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/statusControlsTest';
import { tagControlsTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/tagControlsTest';
import { PortalBoundsDecorator } from '@/__stories__/kovaa-lab-ui-gallery/components/PortalBoundsDecorator';
import { OverflowingListInstancesDecorator } from '@/__stories__/kovaa-lab-ui-gallery/components/OverflowingListInstancesDecorator';
import { portalBoundsTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/portalBoundsTest';

import { createGalleryStory } from '@/__stories__/kovaa-lab-ui-gallery/utils/createGalleryStory';
import { typographyTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/typographyTest';
import {
  codeEditorTest,
  displayHelpersTest,
  galleryRenderTest,
} from '@/__stories__/kovaa-lab-ui-gallery/utils/galleryRenderTests';
import { popoverTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/popoverTest';
import { selectTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/selectTest';
import { switchTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/switchTest';
import { tabsTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/tabsTest';
import { FrontComponentRenderer } from '@/host/components/FrontComponentRenderer';
import { tooltipEscapeDismissalTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/tooltipEscapeDismissalTest';
import { radioCardTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/radioCardTest';
import { checkboxTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/checkboxTest';
import { fieldControlsTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/fieldControlsTest';
import { radioGroupTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/radioGroupTest';
import { segmentedControlTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/segmentedControlTest';
import { sliderRangeTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/sliderRangeTest';
import { sliderTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/sliderTest';
import { sliderHiddenEdgeThumbTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/sliderHiddenEdgeThumbTest';
import { toastTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/toastTest';
import { avatarImageTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/avatarImageTest';
import { avatarControlsTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/avatarControlsTest';
import { commandBlockTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/commandBlockTest';
import { calloutTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/calloutTest';
import { chipControlsTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/chipControlsTest';
import { cardCompositionTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/cardCompositionTest';

const meta: Meta<typeof FrontComponentRenderer> = {
  title: 'FrontComponent/KovaaLab CRM UI Gallery',
  component: FrontComponentRenderer,
  parameters: {
    layout: 'centered',
  },
  args: FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  beforeEach: resetFrontComponentStoryMocks,
};

export default meta;

export const DataDisplayReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-data-display-gallery',
  runtime: 'react',
  play: commandBlockTest,
});
export const DataDisplayPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-data-display-gallery',
  runtime: 'preact',
  play: commandBlockTest,
});

export const BadgeReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-badge',
  runtime: 'react',
  play: badgeTest,
});

export const BadgePreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-badge',
  runtime: 'preact',
  play: badgeTest,
});

export const FeedbackReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-feedback-gallery',
  runtime: 'react',
  play: calloutTest,
});
export const FeedbackPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-feedback-gallery',
  runtime: 'preact',
  play: calloutTest,
});

export const ProgressReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-progress',
  runtime: 'react',
  play: progressTest,
});

export const ProgressPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-progress',
  runtime: 'preact',
  play: progressTest,
});

export const IconReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-icon-gallery',
  runtime: 'react',
  play: galleryRenderTest,
});
export const IconPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-icon-gallery',
  runtime: 'preact',
  play: galleryRenderTest,
});

export const InputReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-input-gallery',
  runtime: 'react',
  play: inputTest,
});
export const InputPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-input-gallery',
  runtime: 'preact',
  play: inputTest,
});

export const NumberStepperReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-number-stepper',
  runtime: 'react',
  play: numberStepperTest,
});

export const NumberStepperPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-number-stepper',
  runtime: 'preact',
  play: numberStepperTest,
});

export const NumberStepperSelectionReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-number-stepper',
  runtime: 'react',
  play: numberStepperSelectionTest,
});

export const NumberStepperSelectionPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-number-stepper',
  runtime: 'preact',
  play: numberStepperSelectionTest,
});

export const NumberFieldReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-number-field',
  runtime: 'react',
  play: numberFieldTest,
});

export const NumberFieldPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-number-field',
  runtime: 'preact',
  play: numberFieldTest,
});

export const JsonVisualizerReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-json-visualizer-gallery',
  runtime: 'react',
  play: jsonTreeTest,
});
export const JsonVisualizerPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-json-visualizer-gallery',
  runtime: 'preact',
  play: jsonTreeTest,
});

export const LayoutReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-layout-gallery',
  runtime: 'react',
  play: layoutTest,
});
export const LayoutPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-layout-gallery',
  runtime: 'preact',
  play: layoutTest,
});

export const ResizeHandleReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-resize-handle',
  runtime: 'react',
  play: resizeHandlePanelTest,
});

export const ResizeHandlePreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-resize-handle',
  runtime: 'preact',
  play: resizeHandlePanelTest,
});

export const NavigationReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-navigation-gallery',
  runtime: 'react',
  play: navigationControlsTest,
});
export const NavigationPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-navigation-gallery',
  runtime: 'preact',
  play: navigationControlsTest,
});

export const SurfacesReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-surfaces-gallery',
  runtime: 'react',
  play: galleryRenderTest,
});
export const SurfacesPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-surfaces-gallery',
  runtime: 'preact',
  play: galleryRenderTest,
});

export const CardCompositionReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-card-composition',
  runtime: 'react',
  play: cardCompositionTest,
});
export const CardCompositionPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-card-composition',
  runtime: 'preact',
  play: cardCompositionTest,
});

export const DialogReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-dialog',
  runtime: 'react',
  play: dialogTest,
});
export const DialogPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-dialog',
  runtime: 'preact',
  play: dialogTest,
});

export const CodeEditorReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-code-editor-gallery',
  runtime: 'react',
  play: codeEditorTest,
});
export const CodeEditorPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-code-editor-gallery',
  runtime: 'preact',
  play: codeEditorTest,
});

export const TypographyReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-typography-gallery',
  runtime: 'react',
  play: typographyTest,
});
export const TypographyPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-typography-gallery',
  runtime: 'preact',
  play: typographyTest,
});

export const ThemeTokensReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-theme-tokens',
  runtime: 'react',
  play: themeTokenTest,
});
export const ThemeTokensPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-theme-tokens',
  runtime: 'preact',
  play: themeTokenTest,
});

export const FieldControlsReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-field-controls',
  runtime: 'react',
  play: fieldControlsTest,
});
export const FieldControlsPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-field-controls',
  runtime: 'preact',
  play: fieldControlsTest,
});

export const DisplayHelpersReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-display-helpers',
  runtime: 'react',
  play: displayHelpersTest,
});
export const DisplayHelpersPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-display-helpers',
  runtime: 'preact',
  play: displayHelpersTest,
});

export const BreadcrumbReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-breadcrumb',
  runtime: 'react',
  play: breadcrumbTest,
});

export const BreadcrumbPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-breadcrumb',
  runtime: 'preact',
  play: breadcrumbTest,
});

export const ListItemReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-list-item',
  runtime: 'react',
  play: listItemTest,
});
export const ListItemPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-list-item',
  runtime: 'preact',
  play: listItemTest,
});

export const PickerListItemsReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-picker-list-items',
  runtime: 'react',
  play: pickerListItemsTest,
});

export const PickerListItemsPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-picker-list-items',
  runtime: 'preact',
  play: pickerListItemsTest,
});

export const SettingsRowReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-settings-row',
  runtime: 'react',
  play: settingsRowTest,
});

export const SettingsRowPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-settings-row',
  runtime: 'preact',
  play: settingsRowTest,
});

export const TabsReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-tabs',
  runtime: 'react',
  play: tabsTest,
});
export const TabsPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-tabs',
  runtime: 'preact',
  play: tabsTest,
});

export const PopoverReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-popover',
  runtime: 'react',
  play: popoverTest,
});
export const PopoverPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-popover',
  runtime: 'preact',
  play: popoverTest,
});

export const TooltipReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-tooltip',
  runtime: 'react',
  play: tooltipEscapeDismissalTest,
});

export const TooltipPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-tooltip',
  runtime: 'preact',
  play: tooltipEscapeDismissalTest,
});

export const PortalBoundsReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-portals',
  runtime: 'react',
  decorators: [PortalBoundsDecorator],
  play: portalBoundsTest,
});

export const PortalBoundsPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-portals',
  runtime: 'preact',
  decorators: [PortalBoundsDecorator],
  play: portalBoundsTest,
});

export const DropdownReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-dropdown',
  runtime: 'react',
  play: dropdownTest,
});

export const DropdownPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-dropdown',
  runtime: 'preact',
  play: dropdownTest,
});

export const PhoneCountryPickerTriggersReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-phone-country-picker',
  runtime: 'react',
  play: phoneCountryPickerTriggerTest,
});

export const PhoneCountryPickerTriggersPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-phone-country-picker',
  runtime: 'preact',
  play: phoneCountryPickerTriggerTest,
});

export const PhoneCountryPickerReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-phone-country-picker',
  runtime: 'react',
  play: phoneCountryPickerTest,
});

export const PhoneCountryPickerPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-phone-country-picker',
  runtime: 'preact',
  play: phoneCountryPickerTest,
});

export const SelectReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-select',
  runtime: 'react',
  play: selectTest,
});
export const SelectPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-select',
  runtime: 'preact',
  play: selectTest,
});

export const ToastReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-toast',
  runtime: 'react',
  play: toastTest,
});
export const ToastPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-toast',
  runtime: 'preact',
  play: toastTest,
});

export const ToastCountdownReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-toast-countdown',
  runtime: 'react',
  play: toastCountdownTest,
});

export const ToastCountdownPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-toast-countdown',
  runtime: 'preact',
  play: toastCountdownTest,
});

export const SwitchReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-switch',
  runtime: 'react',
  play: switchTest,
});
export const SwitchPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-switch',
  runtime: 'preact',
  play: switchTest,
});

export const CheckboxReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-checkbox',
  runtime: 'react',
  play: checkboxTest,
});
export const CheckboxPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-checkbox',
  runtime: 'preact',
  play: checkboxTest,
});

export const SliderReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-slider',
  runtime: 'react',
  play: sliderHiddenEdgeThumbTest,
});
export const SliderPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-slider',
  runtime: 'preact',
  play: sliderTest,
});

export const SliderRangeReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-slider-range',
  runtime: 'react',
  play: sliderRangeTest,
});
export const SliderRangePreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-slider-range',
  runtime: 'preact',
  play: sliderRangeTest,
});

export const RadioGroupReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-radio-group',
  runtime: 'react',
  play: radioGroupTest,
});
export const RadioGroupPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-radio-group',
  runtime: 'preact',
  play: radioGroupTest,
});

export const RadioCardReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-radio-group',
  runtime: 'react',
  play: radioCardTest,
});
export const RadioCardPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-radio-group',
  runtime: 'preact',
  play: radioCardTest,
});

export const SegmentedControlReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-radio-group',
  runtime: 'react',
  play: segmentedControlTest,
});
export const SegmentedControlPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-radio-group',
  runtime: 'preact',
  play: segmentedControlTest,
});

export const StatusControlsReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-status-controls',
  runtime: 'react',
  play: statusControlsTest,
});

export const StatusControlsPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-status-controls',
  runtime: 'preact',
  play: statusControlsTest,
});

export const TagControlsReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-tag-controls',
  runtime: 'react',
  play: tagControlsTest,
});

export const TagControlsPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-tag-controls',
  runtime: 'preact',
  play: tagControlsTest,
});

export const ButtonContractsReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-button-contracts',
  runtime: 'react',
  play: buttonContractsTest,
});

export const ButtonContractsPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-button-contracts',
  runtime: 'preact',
  play: buttonContractsTest,
});

export const ButtonControlsReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-button-controls',
  runtime: 'react',
  play: buttonControlsTest,
});

export const ButtonControlsPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-button-controls',
  runtime: 'preact',
  play: buttonControlsTest,
});

const RESPONSIVE_HOOKS_DECORATORS: Story['decorators'] = [
  (Story) => (
    <div
      data-testid={RESPONSIVE_HOOKS_WIDGET_SIZING.containerTestId}
      style={{ width: RESPONSIVE_HOOKS_WIDGET_SIZING.desktopWidth }}
    >
      <Story />
    </div>
  ),
];

export const ResponsiveHooksReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-responsive-hooks',
  runtime: 'react',
  play: responsiveHooksTest,
  decorators: RESPONSIVE_HOOKS_DECORATORS,
});

export const ResponsiveHooksPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-responsive-hooks',
  runtime: 'preact',
  play: responsiveHooksTest,
  decorators: RESPONSIVE_HOOKS_DECORATORS,
});

export const AvatarControlsReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-avatar-controls',
  runtime: 'react',
  play: avatarControlsTest,
});

export const AvatarControlsPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-avatar-controls',
  runtime: 'preact',
  play: avatarControlsTest,
});

export const AvatarImageReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-avatar-image',
  runtime: 'react',
  play: avatarImageTest,
});

export const AvatarImagePreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-avatar-image',
  runtime: 'preact',
  play: avatarImageTest,
});

export const ChipControlsReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-chip-controls',
  runtime: 'react',
  play: chipControlsTest,
});

export const ChipControlsPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-chip-controls',
  runtime: 'preact',
  play: chipControlsTest,
});

export const IconButtonElevatedReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-icon-button-elevated',
  runtime: 'react',
  play: iconButtonElevatedTest,
});

export const IconButtonElevatedPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-icon-button-elevated',
  runtime: 'preact',
  play: iconButtonElevatedTest,
});

export const InlineBannerReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-inline-banner',
  runtime: 'react',
  play: inlineBannerTest,
});

export const InlineBannerPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-inline-banner',
  runtime: 'preact',
  play: inlineBannerTest,
});

export const OverflowingListApiReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-overflowing-list-api',
  runtime: 'react',
  play: overflowingListApiTest,
});

export const OverflowingListApiPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-overflowing-list-api',
  runtime: 'preact',
  play: overflowingListApiTest,
});

export const OverflowingListPopupReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-overflowing-list',
  runtime: 'react',
  play: overflowingListPopupTest,
});

export const OverflowingListPopupPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-overflowing-list',
  runtime: 'preact',
  play: overflowingListPopupTest,
});

export const OverflowingListGeometryReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-overflowing-list',
  runtime: 'react',
  play: overflowingListGeometryTest,
});

export const OverflowingListGeometryPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-overflowing-list',
  runtime: 'preact',
  play: overflowingListGeometryTest,
});

export const OverflowingListEventIsolationReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-overflowing-list',
  runtime: 'react',
  play: overflowingListEventIsolationTest,
});

export const OverflowingListEventIsolationPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-overflowing-list',
  runtime: 'preact',
  play: overflowingListEventIsolationTest,
});

export const ImageInputReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-image-input',
  runtime: 'react',
  play: imageInputTest,
});

export const ImageInputPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-image-input',
  runtime: 'preact',
  play: imageInputTest,
});

export const CurrencyPickerReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-currency-picker',
  runtime: 'react',
  play: currencyPickerTest,
});

export const CurrencyPickerPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-currency-picker',
  runtime: 'preact',
  play: currencyPickerTest,
});

export const TintedIconTileReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-data-display-gallery',
  runtime: 'react',
  play: tintedIconTileTest,
});

export const TintedIconTilePreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-data-display-gallery',
  runtime: 'preact',
  play: tintedIconTileTest,
});

export const AnimatedIconCrossfadeReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-layout-gallery',
  runtime: 'react',
  play: animatedIconCrossfadeTest,
});

export const AnimatedIconCrossfadePreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-layout-gallery',
  runtime: 'preact',
  play: animatedIconCrossfadeTest,
});

const createMountOnlyPlay =
  ({
    testId,
    expectedCount = 1,
  }: {
    testId: string;
    expectedCount?: number;
  }): KovaaLab CRMUiGalleryPlayFunction =>
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      () => {
        const mountedComponents = canvas.getAllByTestId(testId);

        expect(mountedComponents).toHaveLength(expectedCount);
        for (const mountedComponent of mountedComponents) {
          expect(mountedComponent).toBeVisible();
        }
      },
      { timeout: MOUNT_TIMEOUT },
    );
    expect(errorHandler).not.toHaveBeenCalled();
  };

const galleryMountOnlyPlay = createMountOnlyPlay({
  testId: 'front-component-mounted',
});
const geometryMountOnlyPlay = createMountOnlyPlay({
  testId: 'geometry-measure-component',
});
const galleryInstancesMountOnlyPlay = createMountOnlyPlay({
  testId: 'front-component-mounted',
  expectedCount: 2,
});

export const ResizeHandleGesturesReact: Story = {
  ...ResizeHandleReact,
  play: galleryMountOnlyPlay,
};
export const ResizeHandleGesturesPreact: Story = {
  ...ResizeHandlePreact,
  play: galleryMountOnlyPlay,
};
export const SliderGesturesReact: Story = {
  ...SliderReact,
  play: galleryMountOnlyPlay,
};
export const SliderGesturesPreact: Story = {
  ...SliderPreact,
  play: galleryMountOnlyPlay,
};
export const SliderRangeGesturesReact: Story = {
  ...SliderRangeReact,
  play: galleryMountOnlyPlay,
};
export const SliderRangeGesturesPreact: Story = {
  ...SliderRangePreact,
  play: galleryMountOnlyPlay,
};

export const PortalGeometryReact: Story = {
  ...PortalBoundsReact,
  play: galleryMountOnlyPlay,
};
export const PortalGeometryPreact: Story = {
  ...PortalBoundsPreact,
  play: galleryMountOnlyPlay,
};

export const LayoutMeasurementsReact: Story = createGalleryStory({
  frontComponentBundleName: 'geometry-measure',
  runtime: 'react',
  play: geometryMountOnlyPlay,
});
export const LayoutMeasurementsPreact: Story = createGalleryStory({
  frontComponentBundleName: 'geometry-measure',
  runtime: 'preact',
  play: geometryMountOnlyPlay,
});

export const OverflowingListInstancesReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-overflowing-list',
  runtime: 'react',
  decorators: [OverflowingListInstancesDecorator],
  play: galleryInstancesMountOnlyPlay,
});

export const OverflowingListInstancesPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-overflowing-list',
  runtime: 'preact',
  decorators: [OverflowingListInstancesDecorator],
  play: galleryInstancesMountOnlyPlay,
});
