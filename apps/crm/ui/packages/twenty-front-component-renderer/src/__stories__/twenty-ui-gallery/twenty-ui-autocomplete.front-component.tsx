import { useState } from 'react';
import { defineFrontComponent } from 'kovaa-lab-sdk/define';
import { Autocomplete, Button } from 'kovaa-lab-ui/primitives/input';
import { Text } from 'kovaa-lab-ui/primitives/typography';
import { ThemeProvider } from 'kovaa-lab-ui/theme';

import { KovaaLab CRMUiGalleryCard } from '@/__stories__/shared/front-components/kovaa-lab-ui-gallery-card';

const FRUITS = ['Apple', 'Banana', 'Cherry', 'かき'];

const AutocompleteExample = () => {
  const [query, setQuery] = useState('Apple');
  const [changes, setChanges] = useState(0);
  const [submissions, setSubmissions] = useState(0);
  const [composingConfirmations, setComposingConfirmations] = useState(0);
  const [selectedFruit, setSelectedFruit] = useState('None');
  const [selections, setSelections] = useState(0);
  const [isFruitAutocompleteMounted, setIsFruitAutocompleteMounted] =
    useState(true);

  return (
    <KovaaLab CRMUiGalleryCard title="Autocomplete">
      <ThemeProvider colorScheme="light" applyToRoot={false}>
        <form
          aria-label="Fruit search"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmissions((count) => count + 1);
          }}
        >
          {isFruitAutocompleteMounted && (
            <Autocomplete.Root
              inline
              open
              items={FRUITS}
              autoHighlight="always"
              value={query}
              onValueChange={(value) => {
                setQuery(value);
                setChanges((count) => count + 1);
              }}
            >
              <Autocomplete.Input
                aria-label="Fruit"
                onKeyUp={(event) => {
                  if (event.key === 'Enter' && event.nativeEvent.isComposing) {
                    setComposingConfirmations((count) => count + 1);
                  }
                }}
              />
              <Autocomplete.Empty aria-label="Matching fruits">
                <Text>No matching fruits.</Text>
              </Autocomplete.Empty>
              <Autocomplete.List aria-label="Fruits">
                {(fruit: string) => (
                  <Autocomplete.Item
                    key={fruit}
                    value={fruit}
                    onClick={() => {
                      setSelectedFruit(fruit);
                      setSelections((count) => count + 1);
                    }}
                  >
                    {fruit}
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Root>
          )}
          <Autocomplete.Root disabled items={FRUITS} defaultValue="Cherry">
            <Autocomplete.Input aria-label="Disabled fruit" />
          </Autocomplete.Root>
          <Button type="button" onClick={() => setQuery('')}>
            Reset search
          </Button>
          <Button
            type="button"
            onClick={() => setIsFruitAutocompleteMounted(false)}
          >
            Remove autocomplete
          </Button>
          <Text role="status" aria-label="Autocomplete state">
            Query: {query || 'empty'}; Changes: {changes}; Submissions:{' '}
            {submissions}
          </Text>
          <Text role="status" aria-label="Composition confirmations">
            {composingConfirmations}
          </Text>
          <Text role="status" aria-label="Selected fruit">
            {selectedFruit}; Selections: {selections}
          </Text>
        </form>
        <Autocomplete.Root inline open items={[]}>
          <Autocomplete.Empty aria-label="Empty announcement">
            <Text>
              No <Text>matching</Text> fruits.
            </Text>
            <Text>Try another search.</Text>
          </Autocomplete.Empty>
        </Autocomplete.Root>
      </ThemeProvider>
    </KovaaLab CRMUiGalleryCard>
  );
};

export default defineFrontComponent({
  universalIdentifier: 'c6782912-3d64-47ec-a19b-f2ea293196b0',
  name: 'kovaa-lab-ui-autocomplete',
  description: 'Autocomplete input selection, composition and empty results',
  component: AutocompleteExample,
});
