import { defaultAvatarConfigFor } from '../src/avatar/defaultAvatar';
import { normaliseConfig } from '../src/avatar/resolveConfig';
import { getBaseById } from '../src/avatar/registry';

describe('default avatar', () => {
  it('gives female accounts the female character and everyone else the male one', () => {
    expect(getBaseById(defaultAvatarConfigFor('Female').base)?.target).toBe('female');
    for (const gender of ['Male', 'Other', '', null, undefined]) {
      expect(getBaseById(defaultAvatarConfigFor(gender).base)?.target).toBe('male');
    }
  });

  // A part the bundle does not know would be dropped, leaving the default
  // half-dressed with nothing to say why.
  it.each(['Female', 'Male'])('draws the %s look entirely from bundled artwork', (gender) => {
    const config = defaultAvatarConfigFor(gender);
    expect(normaliseConfig(config)).toEqual(config);
  });
});
