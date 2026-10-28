import { type KovaaLab CRMClientRunAs } from './kovaa-lab-client-run-as.type';

export type KovaaLab CRMClientOptions = Omit<RequestInit, 'body' | 'headers'> & {
  url?: string;
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  fetcher?: (
    operation: Record<string, unknown> | Record<string, unknown>[],
  ) => Promise<unknown>;
  fetch?: typeof globalThis.fetch;
  batch?: unknown;
  runAs?: KovaaLab CRMClientRunAs;
};
