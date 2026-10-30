import {
  formatHermesMailboxAddress,
  isHermesMailboxAddressUsable,
  normalizeHermesMailboxEmail,
  parseHermesMailboxAddress,
  splitHermesMailboxAddressList,
} from '@/hermes-mailbox-ui/utils/parseHermesMailboxAddress';

describe('parseHermesMailboxAddress', () => {
  it('should split a display name from its address', () => {
    expect(parseHermesMailboxAddress('Claire Morel <claire@client.example>')).toEqual(
      {
        display: 'Claire Morel',
        email: 'claire@client.example',
        raw: 'Claire Morel <claire@client.example>',
      },
    );
  });

  it('should drop the quotes around a display name that holds a comma', () => {
    const parsed = parseHermesMailboxAddress(
      '"Morel, Claire" <claire@client.example>',
    );

    expect(parsed?.display).toBe('Morel, Claire');
    expect(parsed?.email).toBe('claire@client.example');
  });

  it('should read a bare address', () => {
    expect(parseHermesMailboxAddress('claire@client.example')?.email).toBe(
      'claire@client.example',
    );
  });

  // A header this client cannot resolve stays visible and stays un-repliable.
  it('should keep an unresolvable header as a display name with no address', () => {
    const parsed = parseHermesMailboxAddress('Accounting Department');

    expect(parsed?.display).toBe('Accounting Department');
    expect(parsed?.email).toBeNull();
  });

  it('should leave the address null when the brackets hold nothing usable', () => {
    const parsed = parseHermesMailboxAddress('Claire <not an address>');

    expect(parsed?.display).toBe('Claire');
    expect(parsed?.email).toBeNull();
  });

  it('should return nothing for an absent or blank header', () => {
    expect(parseHermesMailboxAddress(null)).toBeNull();
    expect(parseHermesMailboxAddress('   ')).toBeNull();
  });
});

describe('normalizeHermesMailboxEmail', () => {
  it('should fold case and trim, so our own addresses always match', () => {
    expect(normalizeHermesMailboxEmail('  VENTES@KovaaLab.example ')).toBe(
      'ventes@kovaalab.example',
    );
  });

  it('should return nothing for a blank value', () => {
    expect(normalizeHermesMailboxEmail(null)).toBeNull();
    expect(normalizeHermesMailboxEmail('  ')).toBeNull();
  });
});

describe('splitHermesMailboxAddressList', () => {
  it('should split on commas and drop the blanks', () => {
    expect(
      splitHermesMailboxAddressList(' a@b.example , , c@d.example '),
    ).toEqual(['a@b.example', 'c@d.example']);
  });

  it('should return nothing for an empty field', () => {
    expect(splitHermesMailboxAddressList('')).toEqual([]);
  });
});

describe('isHermesMailboxAddressUsable', () => {
  it('should accept an ordinary address', () => {
    expect(isHermesMailboxAddressUsable('claire@client.example')).toBe(true);
  });

  it('should refuse what a provider would refuse', () => {
    expect(isHermesMailboxAddressUsable('claire')).toBe(false);
    expect(isHermesMailboxAddressUsable('claire@client')).toBe(false);
    expect(isHermesMailboxAddressUsable('claire at client.example')).toBe(false);
  });
});

describe('formatHermesMailboxAddress', () => {
  // A display name is attacker-controlled in received mail, so the address is
  // shown next to it rather than standing behind it.
  it('should show the address alongside the display name', () => {
    expect(
      formatHermesMailboxAddress({
        display: 'Service client',
        email: 'claire@client.example',
        raw: 'Service client <claire@client.example>',
      }),
    ).toBe('Service client <claire@client.example>');
  });

  it('should fall back to the address, then to the display name', () => {
    expect(
      formatHermesMailboxAddress({
        display: null,
        email: 'claire@client.example',
        raw: 'claire@client.example',
      }),
    ).toBe('claire@client.example');

    expect(
      formatHermesMailboxAddress({
        display: 'Accounting',
        email: null,
        raw: 'Accounting',
      }),
    ).toBe('Accounting');
  });
});
