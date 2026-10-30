import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

import { HermesWaMediaComposer } from '@/hermes-wa-ui/components/HermesWaMediaComposer';
import { type HermesWaCapability } from '@/hermes-wa-ui/types/HermesWaCapability';
import { type HermesWaMediaLimits } from '@/hermes-wa-ui/utils/judgeHermesWaMediaSelection';

const OPEN: HermesWaCapability = { kind: 'available' };

const KNOWN_LIMITS: HermesWaMediaLimits = {
  maxByteSize: 16 * 1024 * 1024,
  acceptedMimeTypes: ['image/png', 'application/pdf'],
  maxByteSizeByMimeType: null,
};

// A File whose reported size is set explicitly: jsdom computes `size` from
// the parts, and a 24 MB string in a test would be absurd.
const buildFile = ({
  name = 'plan.png',
  type = 'image/png',
  size = 2 * 1024 * 1024,
}: { name?: string; type?: string; size?: number } = {}) => {
  const file = new File(['x'], name, { type });

  Object.defineProperty(file, 'size', { value: size });

  return file;
};

const renderComposer = (node: ReactNode) =>
  render(<I18nProvider i18n={i18n}>{node}</I18nProvider>);

// `accept` is a hint the picker applies; these tests have to be able to choose
// a file the hint excludes, because the verdict — not the attribute — is what
// the component is being tested on.
const chooseFile = async (file: File) => {
  const user = userEvent.setup({ applyAccept: false });

  await user.upload(screen.getByLabelText(/choose a file/i), file);
};

// jsdom has no object URL support. The stubs stay in place for the whole file:
// restoring them per test would break React's unmount cleanup, which runs
// after the test's own hooks.
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
});

afterAll(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

describe('HermesWaMediaComposer', () => {
  beforeEach(() => {
    jest.mocked(URL.createObjectURL).mockClear();
    jest.mocked(URL.revokeObjectURL).mockClear();
  });

  it('starts empty and says so', () => {
    renderComposer(
      <HermesWaMediaComposer
        limits={KNOWN_LIMITS}
        sendCapability={OPEN}
        onSubmitRequested={jest.fn()}
      />,
    );

    expect(screen.getByText(/no file chosen yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /send this attachment/i }),
    ).toBeDisabled();
  });

  it('states the limits before anything is chosen', () => {
    renderComposer(
      <HermesWaMediaComposer limits={KNOWN_LIMITS} sendCapability={OPEN} onSubmitRequested={jest.fn()} />,
    );

    expect(screen.getByText(/16 MB/)).toBeInTheDocument();
    expect(
      screen.getByText(/image\/png, application\/pdf/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/server checks again and can still refuse/i),
    ).toBeInTheDocument();
  });

  it('previews a chosen image and reports its name, size and type', async () => {
    renderComposer(
      <HermesWaMediaComposer limits={KNOWN_LIMITS} sendCapability={OPEN} onSubmitRequested={jest.fn()} />,
    );

    await chooseFile(buildFile());

    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:preview');
    expect(screen.getByText('plan.png')).toBeInTheDocument();
    expect(screen.getByText('image/png')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /send this attachment/i }),
    ).toBeEnabled();
  });

  it('refuses a file over the limit and puts both numbers in the refusal', async () => {
    const onSubmitRequested = jest.fn();

    renderComposer(
      <HermesWaMediaComposer
        limits={KNOWN_LIMITS}
        sendCapability={OPEN}
        onSubmitRequested={onSubmitRequested}
      />,
    );

    await chooseFile(buildFile({ size: Math.round(24.3 * 1024 * 1024) }));

    expect(screen.getByRole('alert')).toHaveTextContent(/too large/i);
    expect(
      screen.getByText(
        (_, element) =>
          (element?.textContent ?? '').replace(/\s+/g, ' ').trim() ===
          '24.3 MB · limit 16 MB',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /send this attachment/i }),
    ).toBeDisabled();
    expect(onSubmitRequested).not.toHaveBeenCalled();
  });

  it('refuses a type outside the accepted list', async () => {
    renderComposer(
      <HermesWaMediaComposer limits={KNOWN_LIMITS} sendCapability={OPEN} onSubmitRequested={jest.fn()} />,
    );

    await chooseFile(buildFile({ name: 'archive.zip', type: 'application/zip' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      /file type is not accepted/i,
    );
    expect(
      screen.getByRole('button', { name: /send this attachment/i }),
    ).toBeDisabled();
  });

  it('refuses an empty file', async () => {
    renderComposer(
      <HermesWaMediaComposer limits={KNOWN_LIMITS} sendCapability={OPEN} onSubmitRequested={jest.fn()} />,
    );

    await chooseFile(buildFile({ size: 0 }));

    expect(screen.getByRole('alert')).toHaveTextContent(/empty/i);
  });

  it('keeps sending closed when a limit is unknown, instead of treating it as unlimited', async () => {
    renderComposer(
      <HermesWaMediaComposer
        limits={{
          maxByteSize: null,
          acceptedMimeTypes: ['image/png'],
          maxByteSizeByMimeType: null,
        }}
        sendCapability={OPEN}
        onSubmitRequested={jest.fn()}
      />,
    );

    expect(
      screen.getByText(/size limit for this channel is not known/i),
    ).toBeInTheDocument();

    await chooseFile(buildFile());

    expect(screen.getByRole('alert')).toHaveTextContent(
      /size limit is unknown/i,
    );
    expect(
      screen.getByRole('button', { name: /send this attachment/i }),
    ).toBeDisabled();
  });

  it('keeps sending closed when the accepted types are unknown', async () => {
    renderComposer(
      <HermesWaMediaComposer
        limits={{
          maxByteSize: 16 * 1024 * 1024,
          acceptedMimeTypes: null,
          maxByteSizeByMimeType: null,
        }}
        sendCapability={OPEN}
        onSubmitRequested={jest.fn()}
      />,
    );

    await chooseFile(buildFile());

    expect(screen.getByRole('alert')).toHaveTextContent(
      /accepted file types are unknown/i,
    );
    expect(
      screen.getByRole('button', { name: /send this attachment/i }),
    ).toBeDisabled();
  });

  it('hands the file to the parent only on the send press', async () => {
    const onSubmitRequested = jest.fn();

    renderComposer(
      <HermesWaMediaComposer
        limits={KNOWN_LIMITS}
        sendCapability={OPEN}
        onSubmitRequested={onSubmitRequested}
      />,
    );

    await chooseFile(buildFile());

    expect(onSubmitRequested).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('button', { name: /send this attachment/i }),
    );

    expect(onSubmitRequested).toHaveBeenCalledTimes(1);
    expect(onSubmitRequested.mock.calls[0][0].name).toBe('plan.png');
  });

  it('offers no send button at all when the parent gave no send handler', async () => {
    renderComposer(<HermesWaMediaComposer limits={KNOWN_LIMITS} sendCapability={OPEN} />);

    await chooseFile(buildFile());

    expect(
      screen.queryByRole('button', { name: /send this attachment/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/sending is not available on this screen/i),
    ).toBeInTheDocument();
  });

  it('cancels the selection and releases the preview URL', async () => {
    const onCancelled = jest.fn();
    const onFileSelected = jest.fn();

    renderComposer(
      <HermesWaMediaComposer
        limits={KNOWN_LIMITS}
        sendCapability={OPEN}
        onSubmitRequested={jest.fn()}
        onCancelled={onCancelled}
        onFileSelected={onFileSelected}
      />,
    );

    await chooseFile(buildFile());

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect(onFileSelected).toHaveBeenLastCalledWith(null);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(screen.getByText(/no file chosen yet/i)).toBeInTheDocument();
  });

  it('says why sending is closed rather than greying the button out in silence', async () => {
    renderComposer(
      <HermesWaMediaComposer
        limits={KNOWN_LIMITS}
        sendCapability={{
          kind: 'unavailable',
          reason: 'This conversation is read-only.',
        }}
        onSubmitRequested={jest.fn()}
      />,
    );

    await chooseFile(buildFile());

    expect(
      screen.getByRole('button', { name: /send this attachment/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/this conversation is read-only/i),
    ).toBeInTheDocument();
  });

  it('is readable and closed when no provider is configured, which is the default', async () => {
    renderComposer(
      <HermesWaMediaComposer
        limits={KNOWN_LIMITS}
        onSubmitRequested={jest.fn()}
      />,
    );

    expect(
      screen.getByText(/no whatsapp provider is configured/i),
    ).toBeInTheDocument();

    await chooseFile(buildFile());

    // The file is still described in full: the panel stays usable.
    expect(screen.getByText('plan.png')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /send this attachment/i }),
    ).toBeDisabled();
  });
});
