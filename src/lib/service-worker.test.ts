import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('service worker replaces old caches and only falls back for offline navigations', async () => {
  type Event = { request?: { mode: string; url: string }; waitUntil?: (promise: Promise<unknown>) => void; respondWith?: (promise: Promise<unknown>) => void };
  const handlers: Record<string, (event: Event) => void> = {};
  const removed: string[] = [];
  const cached: string[] = [];
  let offline = false;
  let waiting: Promise<unknown> | undefined;
  let response: Promise<unknown> | undefined;
  const fallback = { page: 'offline' };
  const online = { page: 'network' };
  runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), {
    URL,
    self: { location: { origin: 'https://game.test' },
      addEventListener: (name: string, callback: (event: Event) => void) => { handlers[name] = callback; },
      skipWaiting: async () => {}, clients: { claim: async () => {} } },
    caches: {
      open: async () => ({ addAll: async (urls: string[]) => { cached.push(...urls); } }),
      keys: async () => ['workbox-precache-v1', 'undercover-old', 'undercover-offline-v2', 'other-app'],
      delete: async (key: string) => { removed.push(key); },
      match: async () => fallback,
    },
    fetch: async () => { if (offline) throw new Error('offline'); return online; },
  });
  const waitUntil = (promise: Promise<unknown>) => { waiting = promise; };
  handlers.install({ waitUntil });
  await waiting;
  assert.deepEqual(cached, ['/offline.html', '/icon.svg']);
  handlers.activate({ waitUntil });
  await waiting;
  assert.deepEqual(removed, ['workbox-precache-v1', 'undercover-old']);
  const respondWith = (promise: Promise<unknown>) => { response = promise; };
  const request = { mode: 'navigate', url: 'https://game.test/room/test-room' };
  handlers.fetch({ request, respondWith });
  assert.equal(await response, online);
  offline = true;
  handlers.fetch({ request, respondWith });
  assert.equal(await response, fallback);
  response = undefined;
  handlers.fetch({ request: { ...request, mode: 'cors' }, respondWith });
  assert.equal(response, undefined);
  handlers.fetch({ request: { ...request, url: 'https://other.test/' }, respondWith });
  assert.equal(response, undefined);
});
