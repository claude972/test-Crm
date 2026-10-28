# Changelog

All notable changes to the [KovaaLab CRM SDK](https://www.npmjs.com/package/kovaa-lab-sdk) are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking Changes

- **`MetadataApiClient.uploadFile` in `kovaa-lab-client-sdk` takes one object and no longer accepts a content type.** The file now goes straight to KovaaLab CRM's file storage (the API issues an upload target, the client sends the bytes there, then the API confirms the upload) instead of being streamed through the GraphQL API, and the MIME type is detected from the bytes on completion. Update every call:

  ```diff
  - const uploaded = await metadataClient.uploadFile(
  -   fileBuffer,
  -   'invoice.pdf',
  -   'application/pdf',
  -   FIELD_UNIVERSAL_IDENTIFIER,
  - );
  + const uploaded = await metadataClient.uploadFile({
  +   fileBuffer,
  +   filename: 'invoice.pdf',
  +   fieldMetadataUniversalIdentifier: FIELD_UNIVERSAL_IDENTIFIER,
  + });
  ```

  The returned `{ id, path, size, createdAt, url }` is unchanged. `uploadFile` now requires a KovaaLab CRM server that exposes the `createFileUpload` and `completeFileUpload` mutations.

### Removed

- **The per-file multipart fallback in `kovaa-lab app deploy` and `kovaa-lab app dev`.** Application files are only uploaded straight to file storage now (`createApplicationFileUploads`, PUT, `completeApplicationFileUploads`). The CLI no longer falls back to the `uploadApplicationFile` mutation on a server that lacks the batch mutations, so deploying to a server older than the direct upload fails instead of degrading.

### Added

- **`useSelectedRecordsFilter` in `kovaa-lab-sdk/front-component`.** Returns a record filter matching exactly the records the user selected, or `null` when there is no selection context. Under Select all, `useSelectedRecordIds()` is empty because the selection is defined by the view's filters, search and unticked rows; query the records with this filter, or pass it to a logic function. KovaaLab CRM servers that predate it return `null`.

  ```tsx
  import { useSelectedRecordsFilter } from 'kovaa-lab-sdk/front-component';

  const selectedRecordsFilter = useSelectedRecordsFilter();
  ```

- **`enqueueJobs` in `kovaa-lab-sdk/logic-function`.** Enqueues one run per payload of a single logic function in one call (up to 200 payloads per batch). `retryLimit` and `delayMs` apply to every run in the batch.

  ```ts
  import { enqueueJobs } from 'kovaa-lab-sdk/logic-function';

  await enqueueJobs({
    logicFunctionUniversalIdentifier: PROCESS_BATCH,
    payloads: batches.map((batch, batchIndex) => ({ batchIndex })),
  });
  ```

- **`useSelectedObjectMetadata` in `kovaa-lab-sdk/front-component`.** Returns the `id`, `nameSingular` and `namePlural` of the object a front component runs against, such as the object of the current record page, or `null` when there is none. KovaaLab CRM servers that predate it also return `null`. The return type is exported as `FrontComponentSelectedObjectMetadata`.

  ```tsx
  import { useSelectedObjectMetadata } from 'kovaa-lab-sdk/front-component';

  const objectMetadata = useSelectedObjectMetadata();
  ```

### Deprecated

- **`enqueueJob` in `kovaa-lab-sdk/logic-function`.** Use `enqueueJobs` with a one-element `payloads` list instead. `enqueueJob` keeps working for now and will be removed in a future major version.

### Changed

- **`kovaa-lab app deploy` sends the tarball straight to file storage.** The CLI reserves an upload with `createFileUpload`, PUTs the archive to storage and registers it with `completeAppTarballUpload`, so the tarball no longer transits through the API process. Deploying to a server that predates these mutations fails instead of falling back to the multipart `uploadAppTarball` mutation.
- **`kovaa-lab-client-sdk` should now be a dev dependency too.** Although app code imports it (`CoreApiClient`, `MetadataApiClient`, `RestApiClient`), KovaaLab CRM provides it at runtime — logic functions get it from a generated SDK layer and front components resolve it from server-served modules — so the installed copy is only needed for typechecking and the deploy-time build. Newly scaffolded apps now place it under `devDependencies`. Moving it is recommended (not required: the server already strips it from the deployed runtime), and keeps the installed app leaner:

  ```diff
    "dependencies": {
  -   "kovaa-lab-client-sdk": "^2.13.0"
    },
    "devDependencies": {
  +   "kovaa-lab-client-sdk": "^2.13.0"
    }
  ```

  `kovaa-lab build` now also emits a warning when `kovaa-lab-client-sdk` is still listed under `dependencies`.

## [2.8.0]

### Breaking Changes

- **`kovaa-lab-sdk` must now be a dev dependency.** It ships the `kovaa-lab` CLI and the build/scaffolding tooling, which only run at development and build time — it is never imported by a published app's runtime. Newly scaffolded apps already place it under `devDependencies`. Apps created before `2.8.0` must move it when upgrading:

  ```diff
    "dependencies": {
      "kovaa-lab-client-sdk": "^2.8.0"
  -   "kovaa-lab-sdk": "^2.8.0"
    },
    "devDependencies": {
  +   "kovaa-lab-sdk": "^2.8.0"
    }
  ```

  Then reinstall with `rm -rf node_modules && yarn install`. `kovaa-lab-client-sdk` stays under `dependencies` because app code imports it at runtime.

  `kovaa-lab build` now emits a warning when `kovaa-lab-sdk` is still listed under `dependencies`, so existing apps are flagged automatically.
