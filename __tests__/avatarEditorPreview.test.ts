import {
  previewPartsOf,
  resolveEditorPart,
} from '../src/avatar/editorSelection';
import { AvatarAsset, AvatarConfig } from '../src/avatar/types';

const asset = (id: string): AvatarAsset => ({
  id,
  target: 'female',
  source: 1,
});

const savedConfig: AvatarConfig = {
  version: 1,
  base: 'base_avatar_3',
  parts: { hair: 'saved_hair', outfit: 'saved_outfit' },
  hairColor: null,
};

describe('avatar editor initial preview', () => {
  const previewParts = previewPartsOf([
    { slot: 'outfit', key: 'preview_outfit' },
    { slot: 'hair', key: 'preview_hair' },
  ]);

  it('uses the exact layers advertised on the Explore card', () => {
    expect(previewParts).toEqual({
      outfit: 'preview_outfit',
      hair: 'preview_hair',
    });
  });

  it('shows the dressed preview while the scoped wardrobe is loading', () => {
    expect(
      resolveEditorPart({
        slot: 'hair',
        choices: {},
        previewParts,
        options: [],
        canValidate: false,
        fallbackToFirst: true,
      }),
    ).toBe('preview_hair');
  });

  it('keeps a valid preview default after the wardrobe arrives', () => {
    expect(
      resolveEditorPart({
        slot: 'hair',
        choices: {},
        previewParts,
        options: [asset('other_hair'), asset('preview_hair')],
        canValidate: true,
        fallbackToFirst: true,
      }),
    ).toBe('preview_hair');
  });

  it('falls back to the first assigned part when no valid preview was configured', () => {
    expect(
      resolveEditorPart({
        slot: 'hair',
        choices: {},
        previewParts: { hair: 'unassigned_hair' },
        options: [asset('first_hair')],
        canValidate: true,
        fallbackToFirst: true,
      }),
    ).toBe('first_hair');
  });

  it('never overwrites a user choice when asynchronous defaults resolve', () => {
    expect(
      resolveEditorPart({
        slot: 'hair',
        choices: { hair: 'chosen_hair' },
        previewParts,
        options: [asset('preview_hair'), asset('chosen_hair')],
        canValidate: true,
        fallbackToFirst: true,
      }),
    ).toBe('chosen_hair');

    expect(
      resolveEditorPart({
        slot: 'hair',
        choices: { hair: null },
        previewParts,
        options: [asset('preview_hair')],
        canValidate: true,
        fallbackToFirst: true,
      }),
    ).toBeNull();
  });

  it('reopens a saved look instead of replacing it with card defaults', () => {
    expect(
      resolveEditorPart({
        slot: 'hair',
        choices: {},
        savedConfig,
        previewParts,
        options: [asset('saved_hair'), asset('preview_hair')],
        canValidate: true,
        fallbackToFirst: true,
      }),
    ).toBe('saved_hair');
  });
});
