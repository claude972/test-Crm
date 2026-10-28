import { i18n } from '../../shared/i18n';

export class KovaaLab CRMRequestError extends Error {
  constructor(
    readonly status: number,
    url: string,
  ) {
    const path = new URL(url).pathname;
    super(
      status === 401
        ? i18n._(
            'KovaaLab CRM returned {status} for {path}. Reconnect your workspace.',
            { status, path },
          )
        : i18n._('KovaaLab CRM returned {status} for {path}. Please try again.', {
            status,
            path,
          }),
    );
    this.name = 'KovaaLab CRMRequestError';
  }
}
