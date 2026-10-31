// Assertion sur la SOURCE de l'environnement de la session jetable, pas sur un
// runtime : le script s'auto-contrôle à l'import (GITHUB_ACTIONS) et ne peut pas
// être instancié ici. Pin la configuration, pas le comportement du serveur.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));

const read = (name) =>
  readFileSync(path.join(scriptsDirectory, name), 'utf8');

test('la session jetable démarre le serveur en français par défaut', () => {
  const source = read('preview-backend-session-p0.mjs');

  // Sans cette ligne la variable serveur existe mais la preview ne s'en sert
  // pas : une deuxième société y repartirait en anglais.
  assert.match(source, /DEFAULT_LOCALE: 'fr-FR'/);

  const environmentBlock = source.slice(
    source.indexOf('const env = {'),
    source.indexOf('const delay = ()'),
  );
  assert.match(environmentBlock, /DEFAULT_LOCALE: 'fr-FR'/);
});

test('la locale par défaut reste une variable d\'environnement, sans fichier ni secret', () => {
  const source = read('preview-backend-session-p0.mjs');

  // Les réglages voisins sont env-only ; celui-ci ne doit pas introduire un
  // fichier de configuration ni un secret.
  assert.doesNotMatch(source, /DEFAULT_LOCALE[^\n]*(writeFile|secrets\.|\.json)/);
});
