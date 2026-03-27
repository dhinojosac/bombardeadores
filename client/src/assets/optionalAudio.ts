import { resolvePublicAsset } from "./optionalAssets";

export type OptionalAudioAsset = {
  key: string;
  /** Multiple URLs: Phaser picks the first format the browser supports. */
  urls: string[];
  loop: boolean;
  volume: number;
};

function audioUrls(name: string): string[] {
  return [
    resolvePublicAsset(`assets/audio/${name}.mp3`),
    resolvePublicAsset(`assets/audio/${name}.wav`),
    resolvePublicAsset(`assets/audio/${name}.ogg`),
  ];
}

export const OPTIONAL_AUDIO_ASSETS: OptionalAudioAsset[] = [
  { key: "music_game",     urls: audioUrls("music_game"),     loop: true,  volume: 0.5 },
  { key: "music_frenzy",   urls: audioUrls("music_frenzy"),   loop: true,  volume: 0.65 },
  { key: "sfx_bomb_place", urls: audioUrls("sfx_bomb_place"), loop: false, volume: 0.7 },
  { key: "sfx_explosion",  urls: audioUrls("sfx_explosion"),  loop: false, volume: 0.8 },
  { key: "sfx_powerup",    urls: audioUrls("sfx_powerup"),    loop: false, volume: 0.9 },
  { key: "sfx_death",      urls: audioUrls("sfx_death"),      loop: false, volume: 0.8 },
  { key: "sfx_victory",    urls: audioUrls("sfx_victory"),    loop: false, volume: 0.8 },
];
