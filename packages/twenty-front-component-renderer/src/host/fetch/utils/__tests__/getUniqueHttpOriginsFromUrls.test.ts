import { getUniqueHttpOriginsFromUrls } from '../getUniqueHttpOriginsFromUrls';

describe('getUniqueHttpOriginsFromUrls', () => {
  it('should reduce urls to their origins', () => {
    expect(
      getUniqueHttpOriginsFromUrls([
        'https://api.kovaa-lab.test/graphql',
        'http://functions.kovaa-lab.test/base/path',
      ]),
    ).toEqual(['https://api.kovaa-lab.test', 'http://functions.kovaa-lab.test']);
  });

  it('should deduplicate identical origins', () => {
    expect(
      getUniqueHttpOriginsFromUrls([
        'https://api.kovaa-lab.test/graphql',
        'https://api.kovaa-lab.test/rest/front-components/id',
      ]),
    ).toEqual(['https://api.kovaa-lab.test']);
  });

  it('should drop undefined urls', () => {
    expect(
      getUniqueHttpOriginsFromUrls([undefined, 'https://api.kovaa-lab.test']),
    ).toEqual(['https://api.kovaa-lab.test']);
  });

  it('should drop malformed urls', () => {
    expect(
      getUniqueHttpOriginsFromUrls(['not a url', 'https://api.kovaa-lab.test']),
    ).toEqual(['https://api.kovaa-lab.test']);
  });

  it('should drop urls with non http schemes', () => {
    expect(
      getUniqueHttpOriginsFromUrls([
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'blob:https://api.kovaa-lab.test/id',
        'https://api.kovaa-lab.test',
      ]),
    ).toEqual(['https://api.kovaa-lab.test']);
  });
});
