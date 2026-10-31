import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { type Editor } from '@tiptap/core';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  parseCanonicalEmailDocument,
  parseJson,
} from 'kovaa-lab-shared/utils';

import { HermesCampaignContentSection } from '@/hermes-campaigns-ui/components/HermesCampaignContentSection';
// {{fullName}} and {{personId}} are native campaign variables, published by
// useCampaignEmailEditorVariables. Nothing here invents a token.
const PERSONALISED_BODY = 'Bonjour {{fullName}}, dossier {{personId}}.';
import { type HermesCampaignContent } from '@/hermes-campaigns-ui/types/HermesCampaignContent';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <JotaiProvider store={jotaiStore}>
      <MemoryRouter>{children}</MemoryRouter>
    </JotaiProvider>
  </I18nProvider>
);

// Shaped exactly like the persistence the screen uses: whatever the content
// section emits as `body` is written to `bodyTemplate` with no serialisation
// of its own. That is the path the send side then has to parse.
const buildPersistence = () => {
  const written: { bodyTemplate: string }[] = [];

  return {
    written,
    saveContent: (content: HermesCampaignContent) => {
      written.push({ bodyTemplate: content.body });
    },
  };
};

const ControlledSection = ({
  initialContent,
  onContentChange,
  // Empty by default: that is what buildRuntimeAudience publishes today, and
  // an empty list must not be read as "no variable is allowed".
  declaredVariables = [],
}: {
  initialContent: HermesCampaignContent;
  onContentChange: (content: HermesCampaignContent) => void;
  declaredVariables?: { name: string; label: string }[];
}) => {
  const [content, setContent] = useState(initialContent);

  return (
    <HermesCampaignContentSection
      content={content}
      onContentChange={(nextContent) => {
        setContent(nextContent);
        onContentChange(nextContent);
      }}
      declaredVariables={declaredVariables}
      previewState={{ kind: 'idle' }}
      isEditable={true}
    />
  );
};

// The native canvas renders a ProseMirror contenteditable, not a textbox.
const getEditor = (container: HTMLElement): HTMLElement => {
  const editors = container.querySelectorAll<HTMLElement>(
    '.tiptap[contenteditable="true"]',
  );
  const editor = editors[editors.length - 1];

  if (editor === undefined) {
    throw new Error('The campaign body editor did not render.');
  }

  return editor;
};

// The real TipTap instance the canvas mounted, which the editor publishes on
// its own DOM node. Driving it runs the same transaction a keystroke runs,
// which jsdom cannot deliver because ProseMirror needs layout it has none of.
const getTipTapEditor = (container: HTMLElement): Editor => {
  const { editor } = getEditor(container) as unknown as { editor?: Editor };

  if (editor === undefined) {
    throw new Error('The campaign body editor exposed no TipTap instance.');
  }

  return editor;
};

// jsdom has no layout, so ProseMirror's coordinate lookup has nothing to
// read. Only the stand-in is faked here; every assertion runs the real editor.
beforeAll(() => {
  document.elementFromPoint = () => null;
});

describe('HermesCampaignContentSection body round trip', () => {
  it('writes a bodyTemplate the send path can parse as an email document', async () => {
    const persistence = buildPersistence();

    const { container } = render(
      <ControlledSection
        initialContent={{ subject: 'Sujet', body: '' }}
        onContentChange={persistence.saveContent}
      />,
      { wrapper: Wrapper },
    );

    await act(async () => {
      getTipTapEditor(container).commands.insertContent(PERSONALISED_BODY);
    });

    await waitFor(() => {
      expect(persistence.written.length).toBeGreaterThan(0);
    });

    const bodyTemplate =
      persistence.written[persistence.written.length - 1].bodyTemplate;

    // Typing prose used to persist that prose verbatim, which the send path
    // cannot parse. The field now emits the native editor's own document.
    expect(bodyTemplate).not.toBe(PERSONALISED_BODY);

    // The exact gate compileCampaignEmailContent applies to bodyTemplate
    // before rendering a campaign: parseCanonicalEmailDocument(parseJson(...)).
    const gate = parseCanonicalEmailDocument(
      parseJson<unknown>(bodyTemplate),
    );

    expect(gate).toEqual(expect.objectContaining({ success: true }));

    // The personalisation survives the round trip: a document that compiles
    // but carries no variable would pass a static test and fail a real send.
    expect(bodyTemplate).toContain('{{fullName}}');
    expect(bodyTemplate).toContain('{{personId}}');
  });

  it('does not reject a native variable against an empty audience list', async () => {
    const { container } = render(
      <ControlledSection
        initialContent={{ subject: 'Sujet', body: '' }}
        onContentChange={() => undefined}
      />,
      { wrapper: Wrapper },
    );

    await act(async () => {
      getTipTapEditor(container).commands.insertContent(PERSONALISED_BODY);
    });

    // buildRuntimeAudience publishes variables: [] today. Judging tokens
    // against that empty list would block every legitimate personalisation.
    expect(screen.queryByText(/is not declared by the audience/)).toBeNull();
  });

  it('still reports a variable the audience did declare a list without', async () => {
    const { container } = render(
      <ControlledSection
        initialContent={{ subject: 'Sujet', body: '' }}
        onContentChange={() => undefined}
        declaredVariables={[{ name: 'fullName', label: 'Full name' }]}
      />,
      { wrapper: Wrapper },
    );

    await act(async () => {
      getTipTapEditor(container).commands.insertContent('Bonjour {{nope}}');
    });

    await waitFor(() => {
      expect(
        screen.getByText(/is not declared by the audience/),
      ).toBeVisible();
    });
  });

  it('reads a stored document back into the field without showing raw JSON', async () => {
    const persistence = buildPersistence();
    const storedDocument = JSON.stringify({
      type: 'doc',
      attrs: { schemaVersion: 1 },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Bonjour {{firstName}}' }],
        },
      ],
    });

    const { container } = render(
      <ControlledSection
        initialContent={{ subject: 'Sujet', body: storedDocument }}
        onContentChange={persistence.saveContent}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(getEditor(container)).toHaveTextContent('Bonjour {{firstName}}');
    });

    expect(getEditor(container)).not.toHaveTextContent('schemaVersion');
    expect(getEditor(container)).not.toHaveTextContent('"type":"doc"');
  });

  it('keeps a stored document byte for byte when nothing is typed', async () => {
    const persistence = buildPersistence();
    const storedDocument = JSON.stringify({
      type: 'doc',
      attrs: { schemaVersion: 1 },
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'center' },
          content: [{ type: 'text', text: 'Deja ecrit' }],
        },
      ],
    });

    const { container } = render(
      <ControlledSection
        initialContent={{ subject: 'Sujet', body: storedDocument }}
        onContentChange={persistence.saveContent}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(getEditor(container)).toHaveTextContent('Deja ecrit');
    });

    // Reading a document must not rewrite it: an unedited campaign emits
    // nothing, so no round trip can degrade what the editor produced.
    expect(persistence.written).toEqual([]);
  });

  it('reports an empty message instead of counting the serialised envelope', async () => {
    const { container } = render(
      <ControlledSection
        initialContent={{ subject: 'Sujet', body: '' }}
        onContentChange={() => undefined}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(getEditor(container)).toBeVisible();
    });

    // An empty document serialises to a non-empty JSON string. Counting that
    // string instead of the prose would hide a campaign with no message.
    expect(screen.getByText('Write the message.')).toBeVisible();
  });
});
