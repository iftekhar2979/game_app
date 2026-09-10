import { Platform } from 'react-native';
import Sound from 'react-native-sound';
import { trigger } from 'react-native-haptic-feedback';
import type { Feedback, HapticName, SoundName } from './reactionFeedback';

/**
 * Small haptics and short sounds, fail-soft.
 *
 * Feedback is decoration. A device with no vibration motor, a sound that failed
 * to load, or a native module missing from an old build must never throw into
 * the tap handler that called it - so every entry point catches.
 *
 * Haptics use the library's default of respecting the system haptics setting:
 * someone who turned vibration off for the whole phone meant this app too.
 *
 * Sounds live in `android/app/src/main/res/raw` (and the iOS bundle). This
 * version of react-native-sound cannot load a JS `require()` asset, so they are
 * native resources addressed by name.
 */

const SOUND_VOLUME = 0.55;

const sounds = new Map<SoundName, Sound>();
const loaded = new Set<SoundName>();
let audioReady = false;

function prepareAudio() {
  if (audioReady) return;
  audioReady = true;
  try {
    // iOS: "Ambient" obeys the silent switch and mixes with the user's music
    // rather than pausing it. A reaction must not stop someone's playlist.
    Sound.setCategory('Ambient', true);
  } catch {
    // Android has no audio session category.
  }
}

function load(name: SoundName, playWhenReady = false): Sound | null {
  prepareAudio();

  const existing = sounds.get(name);
  if (existing) return existing;

  try {
    const sound = new Sound(`${name}.wav`, Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        sounds.delete(name);
        return;
      }
      loaded.add(name);
      // Deferred: the callback can fire before the constructor has returned,
      // and touching `sound` then would read it before it is assigned.
      setTimeout(() => {
        const ready = sounds.get(name);
        ready?.setVolume(SOUND_VOLUME);
        if (playWhenReady) ready?.play();
      }, 0);
    });
    sounds.set(name, sound);
    return sound;
  } catch {
    return null;
  }
}

/** Load every sound up front so the first tap is not the one that waits. */
export function preloadFeedbackSounds() {
  const all: SoundName[] = [
    'reaction_like',
    'reaction_love',
    'reaction_haha',
    'reaction_wow',
    'reaction_cry',
    'reaction_angry',
    'chat_send',
    'chat_react',
  ];
  all.forEach((name) => load(name));
}

export function playSound(name: SoundName) {
  try {
    const sound = sounds.get(name);

    if (!sound || !loaded.has(name)) {
      load(name, true);
      return;
    }

    // Restart rather than overlap: two quick taps should not stack two copies.
    sound.stop(() => sound.play());
  } catch {
    // Decoration only.
  }
}

export function haptic(name: HapticName) {
  try {
    // Android's `soft` is weak on many devices; `selection` is the closest
    // dependable light tick there.
    const type = Platform.OS === 'android' && name === 'soft' ? 'selection' : name;
    trigger(type);
  } catch {
    // Decoration only.
  }
}

export function giveFeedback(feedback: Feedback) {
  haptic(feedback.haptic);
  if (feedback.sound) playSound(feedback.sound);
}
