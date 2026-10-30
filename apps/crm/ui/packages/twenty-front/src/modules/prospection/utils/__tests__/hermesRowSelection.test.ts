import { type HermesImportRow } from '@/prospection/types/HermesImportBatch';
import {
  isHermesRowQualifiable,
  isHermesRowSelectable,
} from '@/prospection/utils/hermesRowSelection';

const buildRow = (row: Partial<HermesImportRow>): HermesImportRow => ({
  id: 'row-1',
  status: 'pending',
  unknownStatus: null,
  errors: [],
  email: 'someone@example.com',
  companyName: 'Example',
  firstName: null,
  lastName: null,
  jobTitle: null,
  website: null,
  phone: null,
  personId: null,
  companyId: null,
  hasQualification: false,
  ...row,
});

describe('hermesRowSelection', () => {
  it('offers the two statuses the server acts on', () => {
    expect(isHermesRowSelectable(buildRow({ status: 'pending' }))).toBe(true);
    expect(isHermesRowSelectable(buildRow({ status: 'qualified' }))).toBe(true);
  });

  // The defect this replaces: these three were selectable, and the server
  // skips them, so the screen promised work that would never happen.
  it.each(['invalid', 'duplicate', 'conflict'] as const)(
    'does not offer a %s row, which the server skips',
    (status) => {
      expect(isHermesRowSelectable(buildRow({ status }))).toBe(false);
    },
  );

  it('never offers a suppressed row', () => {
    expect(isHermesRowSelectable(buildRow({ status: 'suppressed' }))).toBe(
      false,
    );
  });

  it('never offers a row whose status is outside the contract', () => {
    expect(
      isHermesRowSelectable(
        buildRow({ status: null, unknownStatus: 'CONNECTED' }),
      ),
    ).toBe(false);
  });

  it('qualifies a staged row only', () => {
    expect(isHermesRowQualifiable(buildRow({ status: 'pending' }))).toBe(true);
  });

  it('does not qualify an already qualified row, though it stays selectable for a draft', () => {
    const qualified = buildRow({ status: 'qualified' });

    expect(isHermesRowQualifiable(qualified)).toBe(false);
    expect(isHermesRowSelectable(qualified)).toBe(true);
  });

  it('keeps every qualifiable row selectable, so no selection can carry a row qualification would drop', () => {
    const statuses = [
      'pending',
      'invalid',
      'duplicate',
      'suppressed',
      'qualified',
      'conflict',
    ] as const;

    for (const status of statuses) {
      const row = buildRow({ status });

      if (isHermesRowQualifiable(row)) {
        expect(isHermesRowSelectable(row)).toBe(true);
      }
    }
  });
});
