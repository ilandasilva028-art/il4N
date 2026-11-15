import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detecterLangue, estNonFrancais } from '../lib/langue.mjs';

test('phrases longues', () => {
  assert.equal(detecterLangue('Nous livrons partout au Québec en moins de trois jours ouvrables.'), 'fra');
  assert.equal(detecterLangue('We ship everywhere in Quebec in less than three business days.'), 'eng');
});

test('textes courts', () => {
  assert.equal(detecterLangue('Add to cart'), 'eng');
  assert.equal(detecterLangue('Ajouter au panier'), 'fra');
  assert.equal(detecterLangue('Sign in'), 'eng');
  assert.equal(detecterLangue('Connexion'), 'fra');
  assert.equal(detecterLangue('Livraison gratuite'), 'fra');
  assert.equal(detecterLangue('Products'), 'eng');
  assert.equal(detecterLangue('Produits'), 'fra');
});

test('indéterminé', () => {
  assert.equal(detecterLangue('123 456'), 'und');
  assert.equal(detecterLangue('Acme'), 'und');
  assert.equal(estNonFrancais('Acme'), false);
});
