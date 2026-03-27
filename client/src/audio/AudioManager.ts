import Phaser from "phaser";
import type { OptionalAudioAsset } from "../assets/optionalAudio";

type MusicKey = "music_game" | "music_frenzy";

export type VolumeLevel = "normal" | "medio" | "bajo" | "mute";

const VOLUME_FACTORS: Record<VolumeLevel, number> = {
  normal: 1.0,
  medio:  0.6,
  bajo:   0.3,
  mute:   0.0,
};

export class AudioManager {
  private scene: Phaser.Scene;
  private config: Map<string, OptionalAudioAsset>;
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private currentMusicKey: MusicKey | null = null;
  private volumeLevel: VolumeLevel = "normal";
  /** Key queued while browser audio context is still locked. */
  private pendingMusicKey: MusicKey | null = null;

  constructor(scene: Phaser.Scene, assets: OptionalAudioAsset[]) {
    this.scene = scene;
    this.config = new Map(assets.map((a) => [a.key, a]));

    // When the browser finally allows audio (first user gesture on the canvas),
    // play whatever track was requested while locked.
    this.scene.sound.once("unlocked", () => {
      if (this.pendingMusicKey) {
        const key = this.pendingMusicKey;
        this.pendingMusicKey = null;
        this.playMusic(key);
      }
    });
  }

  /** Returns true if the key was loaded successfully by Phaser. */
  private hasSound(key: string): boolean {
    return this.scene.cache.audio.has(key);
  }

  private effectiveVolume(baseVolume: number): number {
    return baseVolume * VOLUME_FACTORS[this.volumeLevel];
  }

  /**
   * Starts background music. If the same track is already playing, does nothing.
   * If the browser audio context is still locked, queues the key for when it unlocks.
   * Crossfades from the previous track when switching.
   */
  playMusic(key: MusicKey): void {
    if (this.currentMusicKey === key && this.currentMusic?.isPlaying) return;
    if (!this.hasSound(key)) return;

    // Browser autoplay policy: audio context may be locked until first user gesture
    if (this.scene.sound.locked) {
      this.pendingMusicKey = key;
      return;
    }

    const cfg = this.config.get(key);
    const baseVolume = cfg?.volume ?? 0.5;

    if (this.currentMusic) {
      // Fade out current then start new
      const old = this.currentMusic;
      this.scene.tweens.add({
        targets: old,
        volume: 0,
        duration: 600,
        onComplete: () => old.destroy(),
      });
    }

    const music = this.scene.sound.add(key, {
      loop: true,
      volume: this.effectiveVolume(baseVolume),
    });
    music.play();
    this.currentMusic = music;
    this.currentMusicKey = key;
  }

  /** Switches to frenzy music with a crossfade. */
  playFrenzyMusic(): void {
    this.playMusic("music_frenzy");
  }

  /** Stops current music with a short fade out. */
  stopMusic(): void {
    if (!this.currentMusic) return;
    const old = this.currentMusic;
    this.currentMusic = null;
    this.currentMusicKey = null;
    this.scene.tweens.add({
      targets: old,
      volume: 0,
      duration: 400,
      onComplete: () => old.destroy(),
    });
  }

  /** Plays a one-shot SFX. Does nothing silently if the asset wasn't loaded. */
  playSfx(key: string): void {
    if (this.volumeLevel === "mute") return;
    if (!this.hasSound(key)) return;
    const cfg = this.config.get(key);
    this.scene.sound.play(key, { volume: this.effectiveVolume(cfg?.volume ?? 0.8) });
  }

  /** Sets the volume level and applies it immediately to current music. */
  setVolumeLevel(level: VolumeLevel): void {
    this.volumeLevel = level;
    if (this.currentMusic) {
      const cfg = this.config.get(this.currentMusicKey ?? "");
      const baseVol = cfg?.volume ?? 0.5;
      (this.currentMusic as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound)
        .setVolume(this.effectiveVolume(baseVol));
    }
    // Changing volume away from mute is a user gesture — unlock pending music
    if (level !== "mute" && this.pendingMusicKey) {
      const key = this.pendingMusicKey;
      this.pendingMusicKey = null;
      this.playMusic(key);
    }
  }

  /** Convenience wrapper kept for backward compatibility. */
  setMuted(muted: boolean): void {
    this.setVolumeLevel(muted ? "mute" : "normal");
  }

  get isMuted(): boolean {
    return this.volumeLevel === "mute";
  }

  get currentVolumeLevel(): VolumeLevel {
    return this.volumeLevel;
  }
}
