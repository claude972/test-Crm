import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DoubleTextInput } from '@/ui/field/input/components/DoubleTextInput';

it('replaces the full label and URL when clicking into either field', async () => {
  const user = userEvent.setup();
  render(
    <DoubleTextInput
      instanceId="link-text-selection-test"
      firstValue="Eurosport"
      secondValue="https://eurosport.fr"
      firstValuePlaceholder="Link label"
      secondValuePlaceholder="URL"
      selectOnFocus
      onEnter={jest.fn()}
      onEscape={jest.fn()}
      onClickOutside={jest.fn()}
    />,
  );

  const label = screen.getByPlaceholderText('Link label');
  const url = screen.getByPlaceholderText('URL');

  await user.click(label);
  await user.keyboard('KovaaLab CRM');
  expect(label).toHaveValue('KovaaLab CRM');

  await user.click(label);
  await user.keyboard('KovaaLab CRM CRM');
  expect(label).toHaveValue('KovaaLab CRM CRM');

  await user.click(url);
  await user.keyboard('https://kovaa-lab.com');
  expect(url).toHaveValue('https://kovaa-lab.com');

  await user.tab({ shift: true });
  await user.keyboard('Updated label');
  expect(label).toHaveValue('Updated label');
});
