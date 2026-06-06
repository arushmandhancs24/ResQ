import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeBackoff } from './backoff';

describe('computeBackoff', () => {
  it('Property 9: Operator Panel WebSocket reconnect backoff bound', () => {
    fc.assert(
      fc.property(fc.nat({ max: 20 }), (attempt) => {
        const expected = Math.min(1000 * Math.pow(2, attempt), 16000);
        expect(computeBackoff(attempt)).toBe(expected);
      })
    );
  });
});
