import {
  CONTENT_SECURITY_POLICY,
  FRAME_ANCESTORS,
  X_FRAME_OPTIONS,
} from '../src';

test('constants ESM imports work', () => {
  expect({ CONTENT_SECURITY_POLICY, FRAME_ANCESTORS, X_FRAME_OPTIONS }).deep.eq(
    {
      CONTENT_SECURITY_POLICY: 'content-security-policy',
      FRAME_ANCESTORS: 'frame-ancestors',
      X_FRAME_OPTIONS: 'x-frame-options',
    }
  );
});
