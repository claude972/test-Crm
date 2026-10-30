import { useLingui } from '@lingui/react/macro';

import { readHermesWaByteSize } from '@/hermes-wa-ui/utils/readHermesWaByteSize';

type HermesWaByteSizeLabelProps = {
  byteSize: number | null | undefined;
};

// A file size, or nothing at all: a size nobody reported must not appear as
// "0 KB", which reads as an empty or broken file.
export const HermesWaByteSizeLabel = ({
  byteSize,
}: HermesWaByteSizeLabelProps) => {
  const { t, i18n } = useLingui();

  const read = readHermesWaByteSize(byteSize);

  if (read.kind === 'absent') {
    return null;
  }

  const amount = i18n.number(read.amount);

  return (
    <>
      {read.unit === 'byte'
        ? t`${amount} bytes`
        : read.unit === 'kilobyte'
          ? t`${amount} KB`
          : t`${amount} MB`}
    </>
  );
};
