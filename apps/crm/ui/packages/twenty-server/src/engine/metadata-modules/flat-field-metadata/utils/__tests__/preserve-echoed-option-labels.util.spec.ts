import { preserveEchoedOptionLabels } from 'src/engine/metadata-modules/flat-field-metadata/utils/preserve-echoed-option-labels.util';

const SCREENING_ID = '20202020-e685-4671-ac32-26d304dacb6e';
const PROPOSAL_ID = '20202020-696e-4f6b-91bc-f413e9b2f654';

const storedOptions = [
  {
    id: SCREENING_ID,
    value: 'SCREENING',
    label: 'Screening',
    position: 1,
    color: 'purple',
  },
  {
    id: PROPOSAL_ID,
    value: 'PROPOSAL',
    label: 'Proposal',
    position: 3,
    color: 'turquoise',
  },
];

const resolveLabels = (
  updatedOptions: { id?: string; value: string; label: string }[],
) =>
  preserveEchoedOptionLabels({ storedOptions, updatedOptions }).map(
    (option) => option.label,
  );

describe('preserveEchoedOptionLabels', () => {
  it('keeps the shipped label when a client echoes back its French translation', () => {
    expect(
      resolveLabels([
        { id: SCREENING_ID, value: 'SCREENING', label: 'Présélection' },
      ]),
    ).toEqual(['Screening']);
  });

  it('keeps the shipped label for a translation in any other locale', () => {
    // de-DE and es-ES ship their own wording: a French-only guard would store these as renames
    expect(
      resolveLabels([
        { id: SCREENING_ID, value: 'SCREENING', label: 'Überprüfung' },
        { id: PROPOSAL_ID, value: 'PROPOSAL', label: 'Propuesta' },
      ]),
    ).toEqual(['Screening', 'Proposal']);
  });

  it('persists a real rename, which is what an operator typed', () => {
    expect(
      resolveLabels([
        { id: SCREENING_ID, value: 'SCREENING', label: 'Qualification' },
      ]),
    ).toEqual(['Qualification']);
  });

  it('persists a rename written in the viewer language', () => {
    expect(
      resolveLabels([
        { id: SCREENING_ID, value: 'SCREENING', label: 'Premier contact' },
      ]),
    ).toEqual(['Premier contact']);
  });

  it('leaves an already personalised label alone in both directions', () => {
    const personalised = [
      { id: SCREENING_ID, value: 'SCREENING', label: 'Premier contact' },
    ];

    expect(
      preserveEchoedOptionLabels({
        storedOptions: personalised,
        updatedOptions: [
          { id: SCREENING_ID, value: 'SCREENING', label: 'Premier contact' },
        ],
      }).map((option) => option.label),
    ).toEqual(['Premier contact']);

    expect(
      preserveEchoedOptionLabels({
        storedOptions: personalised,
        updatedOptions: [
          { id: SCREENING_ID, value: 'SCREENING', label: 'Second contact' },
        ],
      }).map((option) => option.label),
    ).toEqual(['Second contact']);
  });

  it('never touches the api value, the id, the position or the color', () => {
    expect(
      preserveEchoedOptionLabels({
        storedOptions,
        updatedOptions: [
          {
            id: SCREENING_ID,
            value: 'SCREENING',
            label: 'Présélection',
            position: 7,
            color: 'red',
          },
        ],
      }),
    ).toEqual([
      {
        id: SCREENING_ID,
        value: 'SCREENING',
        label: 'Screening',
        position: 7,
        color: 'red',
      },
    ]);
  });

  it('matches on the api value when the client sends no id', () => {
    expect(
      resolveLabels([{ value: 'SCREENING', label: 'Présélection' }]),
    ).toEqual(['Screening']);
  });

  it('passes a brand new option through untouched', () => {
    expect(
      resolveLabels([
        {
          id: '20202020-0000-4000-8000-00000000beef',
          value: 'WON',
          label: 'Gagné',
        },
      ]),
    ).toEqual(['Gagné']);
  });

  it('returns the update unchanged when the field had no options', () => {
    expect(
      preserveEchoedOptionLabels({
        storedOptions: null,
        updatedOptions: [{ value: 'SCREENING', label: 'Présélection' }],
      }),
    ).toEqual([{ value: 'SCREENING', label: 'Présélection' }]);
  });
});
