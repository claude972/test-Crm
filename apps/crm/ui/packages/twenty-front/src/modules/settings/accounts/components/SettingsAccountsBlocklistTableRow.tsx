import { type BlocklistItem } from '@/accounts/types/BlocklistItem';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { t } from '@lingui/core/macro';
import { IconButton } from 'kovaa-lab-ui/components/input';
import { OverflowingTextWithTooltip } from 'kovaa-lab-ui/primitives/typography';
import { IconX } from 'kovaa-lab-ui/icon';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { formatToHumanReadableDate } from '~/utils/date-utils';

type SettingsAccountsBlocklistTableRowProps = {
  blocklistItem: BlocklistItem;
  onRemove: (id: string) => void;
};

export const SettingsAccountsBlocklistTableRow = ({
  blocklistItem,
  onRemove,
}: SettingsAccountsBlocklistTableRowProps) => {
  return (
    <TableRow
      key={blocklistItem.id}
      gridAutoColumns="200px 1fr 20px"
      mobileGridAutoColumns="120px 1fr 20px"
    >
      <TableCell color={themeCssVariables.font.color.primary}>
        <OverflowingTextWithTooltip text={blocklistItem.handle} />
      </TableCell>
      <TableCell>
        {blocklistItem.createdAt
          ? formatToHumanReadableDate(blocklistItem.createdAt)
          : ''}
      </TableCell>
      <TableCell align="right">
        <IconButton
          aria-label={t`Remove from blocklist`}
          onClick={() => {
            onRemove(blocklistItem.id);
          }}
          variant="ghost"
          size="sm"
        >
          <IconX />
        </IconButton>
      </TableCell>
    </TableRow>
  );
};
