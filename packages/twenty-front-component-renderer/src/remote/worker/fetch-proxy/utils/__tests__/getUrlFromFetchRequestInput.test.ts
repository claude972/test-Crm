import { getUrlFromFetchRequestInput } from '../getUrlFromFetchRequestInput';

describe('getUrlFromFetchRequestInput', () => {
  it('should return the string when input is a string', () => {
    expect(getUrlFromFetchRequestInput('https://api.kovaa-lab.test/graphql')).toBe(
      'https://api.kovaa-lab.test/graphql',
    );
  });

  it('should return the href when input is a URL instance', () => {
    expect(
      getUrlFromFetchRequestInput(new URL('https://api.kovaa-lab.test/graphql')),
    ).toBe('https://api.kovaa-lab.test/graphql');
  });

  it('should return the url property when input is a Request object', () => {
    const request = {
      url: 'https://api.kovaa-lab.test/graphql',
    } as unknown as Request;

    expect(getUrlFromFetchRequestInput(request)).toBe(
      'https://api.kovaa-lab.test/graphql',
    );
  });
});
