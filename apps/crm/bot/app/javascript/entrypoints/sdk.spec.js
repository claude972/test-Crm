import Cookies from 'js-cookie';
import { IFrameHelper } from '../sdk/IFrameHelper';
import './sdk';

vi.mock('../sdk/IFrameHelper', () => ({
  IFrameHelper: {
    createFrame: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

describe('$kovaa-lab.setUser', () => {
  beforeEach(() => {
    delete window.$kovaa-lab;
    window.kovaa-labSettings = {};
    vi.spyOn(Cookies, 'get').mockReturnValue(undefined);
    vi.spyOn(Cookies, 'set').mockImplementation(() => {});

    window.kovaa-labSDK.run({
      baseUrl: 'https://app.kovaa-lab.com',
      websiteToken: 'website-token',
    });
  });

  afterEach(() => {
    delete window.$kovaa-lab;
    delete window.kovaa-labSettings;
    vi.restoreAllMocks();
  });

  it('updates the SDK identity synchronously', () => {
    const user = { name: 'Pranav' };

    const result = window.$kovaa-lab.setUser('first-user', user);

    expect(result).toBeUndefined();
    expect(window.$kovaa-lab.identifier).toBe('first-user');
    expect(window.$kovaa-lab.user).toBe(user);
    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith('set-user', {
      identifier: 'first-user',
      user,
    });
  });

  it('keeps the latest identity after consecutive calls', () => {
    const firstUser = { name: 'First user' };
    const secondUser = { name: 'Second user' };

    window.$kovaa-lab.setUser('first-user', firstUser);
    window.$kovaa-lab.setUser('second-user', secondUser);

    expect(window.$kovaa-lab.identifier).toBe('second-user');
    expect(window.$kovaa-lab.user).toBe(secondUser);
    expect(IFrameHelper.sendMessage).toHaveBeenLastCalledWith('set-user', {
      identifier: 'second-user',
      user: secondUser,
    });
  });
});
