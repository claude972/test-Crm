import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { LinksDisplay } from '@/ui/field/display/components/LinksDisplay';
import { ComponentDecorator } from 'kovaa-lab-ui/testing';

const meta: Meta<typeof LinksDisplay> = {
  title: 'UI/Display/LinksDisplay',
  component: LinksDisplay,
  decorators: [ComponentDecorator],
  argTypes: {
    value: {
      control: 'object',
      description:
        'The value object containing primaryLinkUrl, primaryLinkLabel, and secondaryLinks',
    },
  },
};

export default meta;

type Story = StoryObj<typeof LinksDisplay>;

export const NoLinks: Story = {
  args: {
    value: {
      primaryLinkUrl: '',
      primaryLinkLabel: '',
      secondaryLinks: [],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(canvas.queryByRole('link')).toBeNull();
    });
  },
};

export const NullLinks: Story = {
  args: {
    value: {
      primaryLinkUrl: null,
      primaryLinkLabel: 'Primary Link',
      secondaryLinks: [
        { url: null, label: 'Secondary Link' },
        { url: 'https://www.kovaa-lab.com', label: 'Valid Link' },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      const links = canvas.queryAllByRole('link');
      expect(links).toHaveLength(1);
    });

    const validLink = await canvas.findByRole('link', { name: 'Valid Link' });
    expect(validLink).toBeVisible();
    expect(validLink).toHaveAttribute('href', 'https://www.kovaa-lab.com');

    expect(canvas.queryByText('Primary Link')).not.toBeInTheDocument();
    expect(canvas.queryByText('Secondary Link')).not.toBeInTheDocument();
  },
};

export const SingleLink: Story = {
  args: {
    value: {
      primaryLinkUrl: 'https://www.kovaa-lab.com',
      primaryLinkLabel: 'KovaaLab CRM Website',
      secondaryLinks: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const link = await canvas.findByRole('link');
    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', 'https://www.kovaa-lab.com');
    expect(link).toHaveTextContent('KovaaLab CRM Website');

    await waitFor(() => {
      expect(canvas.getAllByRole('link')).toHaveLength(1);
    });
  },
};

export const MultipleLinks: Story = {
  args: {
    value: {
      primaryLinkUrl: 'https://www.kovaa-lab.com',
      primaryLinkLabel: 'KovaaLab CRM Website',
      secondaryLinks: [
        { url: 'https://docs.kovaa-lab.com', label: 'Documentation' },
        { url: 'https://blog.kovaa-lab.com', label: 'Blog' },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      const links = canvas.queryAllByRole('link');
      expect(links).toHaveLength(3);
    });

    const primaryLink = await canvas.findByRole('link', {
      name: 'KovaaLab CRM Website',
    });
    expect(primaryLink).toBeVisible();
    expect(primaryLink).toHaveAttribute('href', 'https://www.kovaa-lab.com');

    const docsLink = await canvas.findByRole('link', { name: 'Documentation' });
    expect(docsLink).toBeVisible();
    expect(docsLink).toHaveAttribute('href', 'https://docs.kovaa-lab.com');

    const blogLink = await canvas.findByRole('link', { name: 'Blog' });
    expect(blogLink).toBeVisible();
    expect(blogLink).toHaveAttribute('href', 'https://blog.kovaa-lab.com');
  },
};

export const SocialMediaLinks: Story = {
  args: {
    value: {
      primaryLinkUrl: 'https://www.linkedin.com/company/kovaa-lab',
      primaryLinkLabel: '',
      secondaryLinks: [
        { url: 'https://twitter.com/kovaa-labcrm', label: null },
        {
          url: 'https://www.instagram.com/kovaa-lab_hq',
          label: null,
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      const links = canvas.queryAllByRole('link');
      expect(links).toHaveLength(3);
    });

    const linkedinLink = await canvas.findByRole('link', { name: 'kovaa-lab' });
    expect(linkedinLink).toBeVisible();
    expect(linkedinLink).toHaveAttribute(
      'href',
      'https://www.linkedin.com/company/kovaa-lab',
    );

    const twitterLink = await canvas.findByRole('link', { name: '@kovaa-labcrm' });
    expect(twitterLink).toBeVisible();
    expect(twitterLink).toHaveAttribute(
      'href',
      'https://twitter.com/kovaa-labcrm',
    );

    const instagramLink = await canvas.findByRole('link', {
      name: '@kovaa-lab_hq',
    });
    expect(instagramLink).toBeVisible();
    expect(instagramLink).toHaveAttribute(
      'href',
      'https://www.instagram.com/kovaa-lab_hq',
    );
  },
};

export const InstagramLinks: Story = {
  args: {
    value: {
      primaryLinkUrl: 'https://www.instagram.com/kovaa-lab_hq',
      primaryLinkLabel: '',
      secondaryLinks: [
        { url: 'https://instagram.com/p/ABC123', label: null },
        { url: 'https://instagram.com/reel/XYZ789', label: null },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      const links = canvas.queryAllByRole('link');
      expect(links).toHaveLength(3);
    });

    const handleLink = await canvas.findByRole('link', { name: '@kovaa-lab_hq' });
    expect(handleLink).toBeVisible();
    expect(handleLink).toHaveAttribute(
      'href',
      'https://www.instagram.com/kovaa-lab_hq',
    );

    const fallbackLinks = await canvas.findAllByText('Instagram');
    expect(fallbackLinks).toHaveLength(2);
  },
};

export const SocialLinksWithCustomLabels: Story = {
  args: {
    value: {
      primaryLinkUrl: 'https://www.linkedin.com/company/kovaa-lab',
      primaryLinkLabel: 'KovaaLab CRM on LinkedIn',
      secondaryLinks: [
        {
          url: 'https://www.instagram.com/kovaa-lab_hq',
          label: 'KovaaLab CRM on Instagram',
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      const links = canvas.queryAllByRole('link');
      expect(links).toHaveLength(2);
    });

    const linkedinLink = await canvas.findByRole('link', {
      name: 'KovaaLab CRM on LinkedIn',
    });
    expect(linkedinLink).toBeVisible();
    expect(linkedinLink).toHaveAttribute(
      'href',
      'https://www.linkedin.com/company/kovaa-lab',
    );

    const instagramLink = await canvas.findByRole('link', {
      name: 'KovaaLab CRM on Instagram',
    });
    expect(instagramLink).toBeVisible();
    expect(instagramLink).toHaveAttribute(
      'href',
      'https://www.instagram.com/kovaa-lab_hq',
    );
  },
};

export const AutomaticLabelFromURL: Story = {
  args: {
    value: {
      primaryLinkUrl: 'https://www.example.com',
      primaryLinkLabel: '',
      secondaryLinks: [{ url: 'https://test.example.com', label: null }],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      const links = canvas.queryAllByRole('link');
      expect(links).toHaveLength(2);
    });

    const primaryLink = await canvas.findByRole('link', {
      name: 'www.example.com',
    });
    expect(primaryLink).toBeVisible();
    expect(primaryLink).toHaveAttribute('href', 'https://www.example.com');

    const secondaryLink = await canvas.findByRole('link', {
      name: 'test.example.com',
    });
    expect(secondaryLink).toBeVisible();
    expect(secondaryLink).toHaveAttribute('href', 'https://test.example.com');
  },
};

export const InvalidLinks: Story = {
  args: {
    value: {
      primaryLinkUrl: 'wikipedia',
      primaryLinkLabel: 'Invalid URL',
      secondaryLinks: [{ url: 'lydia,com', label: 'Invalid URL with comma' }],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(canvas.queryByRole('link')).toBeNull();
    });

    expect(canvas.queryByText('Invalid URL')).not.toBeInTheDocument();
    expect(
      canvas.queryByText('Invalid URL with comma'),
    ).not.toBeInTheDocument();
  },
};
