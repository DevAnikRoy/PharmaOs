import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server.js';

async function load(file, mocks) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  new Function('require', 'exports', outputText)((name) => {
    if (!(name in mocks)) throw new Error(`Unmocked dependency ${name}`);
    return mocks[name];
  }, exports);
  return exports;
}
function client({ user = { id: 'owner', user_metadata: { pharmacy_name: 'My shop' } }, profile = null,
  profileError = null, rpcError = null } = {}) {
  return {
    auth: { getUser: async () => ({ data: { user } }), exchangeCodeForSession: async () => ({ error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: profileError }) }) }) }),
    rpc: async () => ({ data: 'pharmacy', error: rpcError }),
  };
}
const redirect = (path) => { throw new Error(`REDIRECT:${path}`); };

test('signed-in owner without a pharmacy is sent to setup, not signup', async () => {
  const { requirePharmacy } = await load('../lib/pharmacy.ts', {
    'next/server': { connection: async () => {} }, 'next/navigation': { redirect },
    '@/lib/i18n/get-dictionary': { getDictionary: () => ({}) },
    '@/lib/i18n/locale': { getLocale: async () => 'en' },
    '@/lib/supabase/server': { createClient: async () => client() },
  });
  await assert.rejects(requirePharmacy(), /REDIRECT:\/setup$/);
});

test('session redirects preserve refreshed auth cookies and allow setup', async () => {
  const supabase = client();
  const { updateSession } = await load('../lib/supabase/middleware.ts', {
    'next/server': { NextResponse },
    '@supabase/ssr': { createServerClient: (_url, _key, options) => {
      options.cookies.setAll([{ name: 'session', value: 'refreshed', options: { path: '/' } }]);
      return supabase;
    } },
  });
  const response = await updateSession(new NextRequest('http://localhost/signup'));
  assert.equal(response.headers.get('location'), 'http://localhost/dashboard');
  assert.equal(response.cookies.get('session')?.value, 'refreshed');
  const setup = await updateSession(new NextRequest('http://localhost/setup'));
  assert.equal(setup.headers.get('location'), null);
  supabase.auth.getUser = async () => ({ data: { user: null } });
  assert.equal((await updateSession(new NextRequest('http://localhost/setup'))).headers.get('location'), 'http://localhost/login');
});

test('callback surfaces setup failure, handles missing links, and restricts redirect destinations', async () => {
  let supabase = client({ rpcError: { message: 'Database unavailable' } });
  const { GET } = await load('../app/auth/callback/route.ts', {
    'next/server': { NextResponse }, '@/lib/supabase/server': { createClient: async () => supabase },
  });
  assert.equal((await GET(new Request('http://localhost/auth/callback'))).headers.get('location'), 'http://localhost/login?error=confirmation');
  assert.equal((await GET(new Request('http://localhost/auth/callback?code=valid'))).headers.get('location'), 'http://localhost/setup?error=setup');
  supabase = client({ profile: { id: 'owner' } });
  assert.equal((await GET(new Request('http://localhost/auth/callback?code=valid&next=https://example.com'))).headers.get('location'), 'http://localhost/dashboard');
  assert.equal((await GET(new Request('http://localhost/auth/callback?code=valid&next=/dashboard/stock'))).headers.get('location'), 'http://localhost/dashboard/stock');
});

test('a successful auth signup with failed pharmacy creation enters recovery', async () => {
  const supabase = client({ rpcError: { message: 'Retry' } });
  supabase.auth.signUp = async () => ({ data: { session: {} }, error: null });
  const { signUp } = await load('../app/actions/auth.ts', {
    'next/headers': { headers: async () => new Headers({ origin: 'http://localhost' }) },
    'next/navigation': { redirect }, '@/lib/supabase/server': { createClient: async () => supabase },
  });
  const form = new FormData();
  form.set('email', 'owner@example.com'); form.set('password', 'password'); form.set('pharmacyName', 'My shop');
  await assert.rejects(signUp(form), /REDIRECT:\/setup\?error=setup$/);
});
