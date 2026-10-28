import { NavigationMenuItemType } from 'kovaa-lab-shared/types';

import { buildCreateNavigationMenuItemInput } from '@/navigation-menu-item/common/utils/buildCreateNavigationMenuItemInput';

describe('buildCreateNavigationMenuItemInput', () => {
  it('preserves standalone page identity and presentation when saving into a folder', () => {
    const input = buildCreateNavigationMenuItemInput(
      {
        id: 'navigation-item',
        type: NavigationMenuItemType.PAGE_LAYOUT,
        pageLayoutId: 'standalone-page',
        name: 'Team overview',
        icon: 'IconPerspective',
        color: 'blue',
        folderId: 'draft-folder',
        position: 0,
        createdAt: '',
        updatedAt: '',
      },
      () => 'saved-folder',
    );

    expect(input).toEqual({
      id: 'navigation-item',
      type: NavigationMenuItemType.PAGE_LAYOUT,
      pageLayoutId: 'standalone-page',
      name: 'Team overview',
      icon: 'IconPerspective',
      color: 'blue',
      folderId: 'saved-folder',
      position: 0,
    });
  });

  it.each([
    ['/workflows', '/workflows'],
    ['kovaa-lab.com', 'https://kovaa-lab.com'],
  ])('saves the link %s as %s', (link, expectedLink) => {
    const input = buildCreateNavigationMenuItemInput(
      {
        id: 'navigation-item',
        type: NavigationMenuItemType.LINK,
        name: 'Link',
        link,
        position: 0,
        createdAt: '',
        updatedAt: '',
      },
      () => 'saved-folder',
    );

    expect(input.link).toBe(expectedLink);
  });
});
