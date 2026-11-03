import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('BroadcastChannel', undefined);
});
afterEach(() => vi.unstubAllGlobals());
describe('HTTP failures keep financial outcomes explicit', () => {
  it('classifies an HTML gateway failure without exposing raw parser errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>Gateway unavailable</html>', { status: 503 })),
    );
    const { api, ApiError } = await import('../client/src/api');
    try {
      await api('/dashboard');
      throw new Error('Expected error');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as InstanceType<typeof ApiError>).status).toBe(503);
      expect((error as Error).message).toContain('unexpected response');
    }
  });
  it('keeps a write unconfirmed when its successful response cannot be decoded', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: { token: 'synthetic-csrf-token' } }))
      .mockResolvedValueOnce(new Response('truncated', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const { api } = await import('../client/src/api');
    await expect(
      api('/transactions', {
        method: 'POST',
        body: { amountMinor: 1 },
        key: 'synthetic-operation',
      }),
    ).rejects.toMatchObject({ status: 0, code: 'UNCONFIRMED_RESPONSE' });
    expect(fetch.mock.calls[1][1].headers['Idempotency-Key']).toBe('synthetic-operation');
  });
  it('preserves the caller operation key across explicit timeout retries', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: { token: 'synthetic-csrf-token' } }))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(Response.json({ data: { id: 'confirmed' } }));
    vi.stubGlobal('fetch', fetch);
    const { api } = await import('../client/src/api');
    const options = { method: 'POST', body: { amountMinor: 1 }, key: 'same-operation' };
    await expect(api('/transactions', options)).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
    await expect(api('/transactions', options)).resolves.toEqual({ id: 'confirmed' });
    expect(fetch.mock.calls[1][1].headers['Idempotency-Key']).toBe(
      fetch.mock.calls[2][1].headers['Idempotency-Key'],
    );
  });
});
