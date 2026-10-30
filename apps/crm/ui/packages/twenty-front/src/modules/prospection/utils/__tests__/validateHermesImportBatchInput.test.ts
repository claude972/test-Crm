import { validateHermesImportBatchInput } from '@/prospection/utils/validateHermesImportBatchInput';

const buildForm = (overrides: Partial<Parameters<typeof validateHermesImportBatchInput>[0]> = {}) => ({
  externalBatchId: 'paris-2026-10',
  name: 'Paris trade show, October',
  sourceUrl: 'https://example.com/list',
  collectedAtLocal: '2026-10-29T08:30',
  rowsText: JSON.stringify([
    { email: 'someone@example.com', companyName: 'Example' },
  ]),
  ...overrides,
});

const codesOf = (issues: { code: string }[]) => issues.map((issue) => issue.code);

describe('validateHermesImportBatchInput', () => {
  it('accepts a complete batch', () => {
    const { input, issues } = validateHermesImportBatchInput(buildForm());

    expect(issues).toEqual([]);
    expect(input?.rows).toEqual([
      { email: 'someone@example.com', companyName: 'Example' },
    ]);
  });

  // The defect this replaces: an empty email was refused client-side, which
  // hid a row the server would have staged and marked invalid. The contract is
  // explicit that rows are staged even when their email validation fails.
  it('stages a row with an empty email instead of blocking the batch', () => {
    const { input, issues } = validateHermesImportBatchInput(
      buildForm({
        rowsText: JSON.stringify([{ email: '', companyName: 'Example' }]),
      }),
    );

    expect(issues).toEqual([]);
    expect(input?.rows).toEqual([{ email: '', companyName: 'Example' }]);
  });

  it('still requires a company name, which the review did not question', () => {
    const { input, issues } = validateHermesImportBatchInput(
      buildForm({
        rowsText: JSON.stringify([{ email: 'someone@example.com' }]),
      }),
    );

    expect(input).toBeNull();
    expect(codesOf(issues)).toContain('row-company-required');
  });

  it('refuses a source URL carrying credentials', () => {
    const { issues } = validateHermesImportBatchInput(
      buildForm({ sourceUrl: 'https://user:pass@example.com/list' }),
    );

    expect(codesOf(issues)).toContain('source-url-has-credentials');
  });

  it('refuses a source URL that is neither http nor https', () => {
    const { issues } = validateHermesImportBatchInput(
      buildForm({ sourceUrl: 'ftp://example.com/list' }),
    );

    expect(codesOf(issues)).toContain('source-url-not-http');
  });

  it('refuses a field the input type does not declare, rather than dropping it', () => {
    const { input, issues } = validateHermesImportBatchInput(
      buildForm({
        rowsText: JSON.stringify([
          {
            email: 'someone@example.com',
            companyName: 'Example',
            linkedinUrl: 'https://example.com/in/someone',
          },
        ]),
      }),
    );

    expect(input).toBeNull();
    expect(codesOf(issues)).toContain('row-unknown-field');
  });

  it('refuses more rows than the contract accepts', () => {
    const { issues } = validateHermesImportBatchInput(
      buildForm({
        rowsText: JSON.stringify(
          Array.from({ length: 101 }, (_, index) => ({
            email: `someone${index}@example.com`,
            companyName: 'Example',
          })),
        ),
      }),
    );

    expect(codesOf(issues)).toContain('rows-too-many');
  });

  // The server budgets 2_000_000 bytes, not 2 MiB: a payload between the two
  // used to pass here and be refused there.
  it('refuses a payload over the server budget rather than letting it through', () => {
    const padding = 'a'.repeat(30_000);
    const { issues } = validateHermesImportBatchInput(
      buildForm({
        rowsText: JSON.stringify(
          Array.from({ length: 100 }, (_, index) => ({
            email: `someone${index}@example.com`,
            companyName: padding,
          })),
        ),
      }),
    );

    expect(codesOf(issues)).toContain('state-too-large');
  });

  it('reports unparseable rows as such rather than sending nothing silently', () => {
    const { input, issues } = validateHermesImportBatchInput(
      buildForm({ rowsText: '{not json' }),
    );

    expect(input).toBeNull();
    expect(codesOf(issues)).toContain('rows-not-json');
  });
});
