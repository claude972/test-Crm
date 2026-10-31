import ReactDOM from 'react-dom/client';

import { App } from '@/app/components/App';
import '@/app/utils/setupMonacoEnvironment';
import { hydrateMetadataStore } from '@/metadata-store/storage/metadataStoreStorage';
import { registerHermesServiceWorker } from '@/hermes-pwa/utils/registerHermesServiceWorker';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import 'kovaa-lab-ui/style.css';
import 'kovaa-lab-ui/theme-light.css';
import 'kovaa-lab-ui/theme-dark.css';
import './index.css';

const renderApp = () => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') ?? document.body,
  );

  root.render(<App />);
};

// Registered after the app is on screen, so a worker failure can never
// delay or block the first render. It no-ops in development.
hydrateMetadataStore()
  .then(renderApp, renderApp)
  .finally(() => {
    void registerHermesServiceWorker();
  });
