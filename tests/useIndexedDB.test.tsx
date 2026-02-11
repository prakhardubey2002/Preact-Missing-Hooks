/**
 * @jest-environment jsdom
 * Polyfill IndexedDB for Node/jsdom (must run before hook code).
 */
import 'fake-indexeddb/auto';

/** @jsx h */
import { h } from 'preact';
import { render, waitFor } from '@testing-library/preact';
import '@testing-library/jest-dom';
import { useIndexedDB } from '@/useIndexedDB';

const DB_NAME = 'test-db-' + Math.random().toString(36).slice(2);
const DB_VERSION = 1;
const config = {
  name: DB_NAME,
  version: DB_VERSION,
  tables: {
    users: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: ['email'],
    },
    settings: {
      keyPath: 'key',
    },
  },
};

describe('useIndexedDB', () => {
  it('opens database and sets isReady', async () => {
    let dbRef: ReturnType<typeof useIndexedDB>['db'] = null;
    function TestComponent() {
      const result = useIndexedDB(config);
      dbRef = result.db;
      return (
        <div>
          <span data-testid="ready">{String(result.isReady)}</span>
          <span data-testid="error">{result.error?.message ?? 'none'}</span>
        </div>
      );
    }
    render(<TestComponent />);
    expect(dbRef).toBeNull();
    await waitFor(() => {
      expect(dbRef).not.toBeNull();
    });
    const readyEl = document.querySelector('[data-testid="ready"]');
    expect(readyEl?.textContent).toBe('true');
  });

  it('hasTable returns true for defined tables', async () => {
    let dbRef: ReturnType<typeof useIndexedDB>['db'] = null;
    function TestComponent() {
      const result = useIndexedDB(config);
      dbRef = result.db;
      return <div data-testid="ready">{String(result.isReady)}</div>;
    }
    render(<TestComponent />);
    await waitFor(() => expect(dbRef).not.toBeNull());
    expect(dbRef!.hasTable('users')).toBe(true);
    expect(dbRef!.hasTable('settings')).toBe(true);
    expect(dbRef!.hasTable('nonexistent')).toBe(false);
  });

  it('table insert and count', async () => {
    let dbRef: ReturnType<typeof useIndexedDB>['db'] = null;
    function TestComponent() {
      const result = useIndexedDB(config);
      dbRef = result.db;
      return <div>{String(result.isReady)}</div>;
    }
    render(<TestComponent />);
    await waitFor(() => expect(dbRef).not.toBeNull());
    const users = dbRef!.table('users');
    const key = await users.insert({ email: 'a@b.com', name: 'Alice' });
    expect(key).toBe(1);
    const n = await users.count();
    expect(n).toBe(1);
  });

  it('table query with filter', async () => {
    let dbRef: ReturnType<typeof useIndexedDB>['db'] = null;
    function TestComponent() {
      const result = useIndexedDB(config);
      dbRef = result.db;
      return <div>{String(result.isReady)}</div>;
    }
    render(<TestComponent />);
    await waitFor(() => expect(dbRef).not.toBeNull());
    const users = dbRef!.table('users');
    await users.clear();
    await users.insert({ email: 'a@b.com' });
    await users.insert({ email: 'b@b.com' });
    await users.insert({ email: 'a@c.com' });
    const found = await users.query((item: { email: string }) => item.email.startsWith('a@'));
    expect(found).toHaveLength(2);
    const emails = found.map((x: { email: string }) => x.email).sort();
    expect(emails).toEqual(['a@b.com', 'a@c.com']);
  });

  it('table exists, update, delete', async () => {
    let dbRef: ReturnType<typeof useIndexedDB>['db'] = null;
    function TestComponent() {
      const result = useIndexedDB(config);
      dbRef = result.db;
      return <div>{String(result.isReady)}</div>;
    }
    render(<TestComponent />);
    await waitFor(() => expect(dbRef).not.toBeNull());
    const users = dbRef!.table('users');
    await users.clear();
    const key = await users.insert({ email: 'x@b.com', name: 'X' });
    let ok = await users.exists(key);
    expect(ok).toBe(true);
    await users.update(key, { name: 'X Updated' });
    await users.delete(key);
    ok = await users.exists(key);
    expect(ok).toBe(false);
  });

  it('table upsert and bulkInsert', async () => {
    let dbRef: ReturnType<typeof useIndexedDB>['db'] = null;
    function TestComponent() {
      const result = useIndexedDB(config);
      dbRef = result.db;
      return <div>{String(result.isReady)}</div>;
    }
    render(<TestComponent />);
    await waitFor(() => expect(dbRef).not.toBeNull());
    const settings = dbRef!.table('settings');
    await settings.clear();
    await settings.upsert({ key: 'theme', value: 'dark' });
    let n = await settings.count();
    expect(n).toBe(1);
    await settings.upsert({ key: 'theme', value: 'light' });
    n = await settings.count();
    expect(n).toBe(1);
    const keys = await settings.bulkInsert([
      { key: 'a', value: 1 },
      { key: 'b', value: 2 },
    ]);
    expect(keys).toHaveLength(2);
    n = await settings.count();
    expect(n).toBe(3);
  });

  it('table clear', async () => {
    let dbRef: ReturnType<typeof useIndexedDB>['db'] = null;
    function TestComponent() {
      const result = useIndexedDB(config);
      dbRef = result.db;
      return <div>{String(result.isReady)}</div>;
    }
    render(<TestComponent />);
    await waitFor(() => expect(dbRef).not.toBeNull());
    const settings = dbRef!.table('settings');
    await settings.upsert({ key: 'toClear', value: 1 });
    await settings.clear();
    const n = await settings.count();
    expect(n).toBe(0);
  });

  it('optional onSuccess and onError callbacks', async () => {
    let dbRef: ReturnType<typeof useIndexedDB>['db'] = null;
    function TestComponent() {
      const result = useIndexedDB(config);
      dbRef = result.db;
      return <div>{String(result.isReady)}</div>;
    }
    render(<TestComponent />);
    await waitFor(() => expect(dbRef).not.toBeNull());
    const users = dbRef!.table('users');
    let onSuccessCalled = false;
    await users.insert({ email: 'cb@b.com' }, {
      onSuccess: () => { onSuccessCalled = true; },
    });
    expect(onSuccessCalled).toBe(true);
    let onErrorCalled = false;
    await users.update(99999, { email: 'x' }, {
      onError: () => { onErrorCalled = true; },
    }).catch(() => { });
    expect(onErrorCalled).toBe(true);
  });

  it('transaction runs and commits', async () => {
    let dbRef: ReturnType<typeof useIndexedDB>['db'] = null;
    function TestComponent() {
      const result = useIndexedDB(config);
      dbRef = result.db;
      return <div>{String(result.isReady)}</div>;
    }
    render(<TestComponent />);
    await waitFor(() => expect(dbRef).not.toBeNull());
    await dbRef!.transaction(['users', 'settings'], 'readwrite', async (tx) => {
      await tx.table('users').insert({ email: 'tx@b.com' });
      await tx.table('settings').upsert({ key: 'fromTx', value: true });
    });
    const users = dbRef!.table('users');
    const found = await users.query((item: { email: string }) => item.email === 'tx@b.com');
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found.some((x: { email: string }) => x.email === 'tx@b.com')).toBe(true);
    const settings = dbRef!.table('settings');
    const fromTx = await settings.query((item: { key: string }) => item.key === 'fromTx');
    expect(fromTx).toHaveLength(1);
    expect((fromTx[0] as { value: boolean }).value).toBe(true);
  });
});
