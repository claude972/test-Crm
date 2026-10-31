import express from 'express';
import request from 'supertest';
import { isDefined } from 'kovaa-lab-shared/utils';
import { ApiPath } from 'kovaa-lab-shared/types';

import { isFrontendDocumentRequest } from 'src/engine/core-modules/frontend/utils/is-frontend-document-request.util';

describe('isFrontendDocumentRequest', () => {
  const app = express();

  app.use((request, response) => {
    response.status(isFrontendDocumentRequest(request) ? 200 : 404).end();
  });

  it.each([undefined, '*/*', 'text/*', 'text/html', 'text/html;q=0.5'])(
    'accepts document routes with Accept: %s',
    async (accept) => {
      for (const pathname of [
        '/',
        '/index.html',
        '/objects/people',
        '/invite/apple.dev-token',
      ]) {
        const response = request(app).get(pathname);

        if (isDefined(accept)) {
          response.set('Accept', accept);
        }

        await response.expect(200);
      }
    },
  );

  it.each([
    'application/json',
    'image/png',
    'text/html;q=0',
    'text/html;q=0,*/*;q=1',
  ])('does not serve HTML when Accept excludes it: %s', async (accept) => {
    await request(app).get('/').set('Accept', accept).expect(404);
  });

  it.each(['document', 'iframe', 'frame'])(
    'accepts a %s navigation with a wildcard',
    async (destination) => {
      await request(app)
        .get('/invite/apple.dev-token')
        .set('Accept', '*/*')
        .set('Sec-Fetch-Dest', destination)
        .expect(200);
    },
  );

  it.each(['script', 'style', 'image', 'font', 'empty'])(
    'does not turn a missing %s resource into HTML',
    async (destination) => {
      await request(app)
        .get('/new-asset-directory/missing')
        .set('Accept', '*/*')
        .set('Sec-Fetch-Dest', destination)
        .expect(404);
    },
  );

  it.each([
    '/graphql',
    '/graphql/missing',
    '/rest/missing',
    '/auth/missing',
    '/.well-known/missing',
  ])('keeps API path %s out of the document fallback', async (pathname) => {
    await request(app).get(pathname).set('Accept', '*/*').expect(404);
  });

  it.each(['/', '/objects/people', '/settings/structures'])(
    'accepts service-worker-forwarded HTML navigation to %s',
    async (pathname) => {
      await request(app)
        .get(pathname)
        .set(
          'Accept',
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        )
        .set('Sec-Fetch-Dest', 'empty')
        .set('Sec-Fetch-Mode', 'navigate')
        .expect(200);
    },
  );

  it.each(['text/html;q=0.5,*/*;q=0.1', 'text/html;q=1'])(
    'accepts an explicit HTML media range on forwarded navigation: %s',
    async (accept) => {
      await request(app)
        .get('/objects/people')
        .set('Accept', accept)
        .set('Sec-Fetch-Dest', 'empty')
        .set('Sec-Fetch-Mode', 'navigate')
        .expect(200);
    },
  );

  it.each([
    undefined,
    '*/*',
    'text/*',
    'application/json',
    'image/png',
    'text/html;q=0',
    'text/html;q=0,*/*;q=1',
  ])(
    'rejects forwarded navigation without positively accepted explicit HTML: %s',
    async (accept) => {
      const response = request(app)
        .get('/objects/people')
        .set('Sec-Fetch-Dest', 'empty')
        .set('Sec-Fetch-Mode', 'navigate');
      if (isDefined(accept)) response.set('Accept', accept);
      await response.expect(404);
    },
  );

  it.each([undefined, 'cors', 'same-origin', 'no-cors', 'websocket'])(
    'rejects an empty destination with non-navigation mode %s',
    async (mode) => {
      const response = request(app)
        .get('/objects/people')
        .set('Accept', 'text/html')
        .set('Sec-Fetch-Dest', 'empty');
      if (isDefined(mode)) response.set('Sec-Fetch-Mode', mode);
      await response.expect(404);
    },
  );

  it.each(['script', 'style', 'image', 'font'])(
    'rejects %s assets even with navigation mode and explicit HTML',
    async (destination) => {
      await request(app)
        .get('/new-asset-directory/missing')
        .set('Accept', 'text/html')
        .set('Sec-Fetch-Dest', destination)
        .set('Sec-Fetch-Mode', 'navigate')
        .expect(404);
    },
  );

  it.each(Object.values(ApiPath))(
    'keeps the %s API prefix out of forwarded HTML navigation',
    async (prefix) => {
      for (const pathname of [`/${prefix}`, `/${prefix}/missing`]) {
        await request(app)
          .get(pathname)
          .set('Accept', 'text/html')
          .set('Sec-Fetch-Dest', 'empty')
          .set('Sec-Fetch-Mode', 'navigate')
          .expect(404);
      }
    },
  );

  it.each(['post', 'put', 'patch', 'delete', 'options'] as const)(
    'rejects forwarded navigation with method %s',
    async (method) => {
      await request(app)
        [method]('/objects/people')
        .set('Accept', 'text/html')
        .set('Sec-Fetch-Dest', 'empty')
        .set('Sec-Fetch-Mode', 'navigate')
        .expect(404);
    },
  );

  it('accepts HEAD without an Accept header', async () => {
    await request(app).head('/').expect(200);
  });

  it('does not serve HTML for POST', async () => {
    await request(app).post('/').set('Accept', '*/*').expect(404);
  });
});
