import type { CSSProperties } from "react";
import characters from "./art/characters.json";
import monsters from "./art/monsters.json";
import effects from "./art/effects.json";
import icons from "./art/icons.json";

export type SpriteAsset = {
  width: number; height: number; anchorX: number; anchorY: number;
  bodyWidth: number; bodyHeight: number;
  animations: Record<string, { src: string; frames: number }>;
};
export type SkillVisual = "slash" | "impact" | "ward" | "flame" | "frost" | "shadow" | "heal" | "lightning";
export const characterArt: Record<string, SpriteAsset> = characters;
export const monsterArt: Record<string, SpriteAsset> = monsters;
export const effectArt: Record<string, SpriteAsset> = effects;
const skillIcons: Record<string, SpriteAsset> = icons;

export function skillVisual(id: string): SkillVisual {
  if (id.startsWith("body-")) return "ward";
  if (id.startsWith("hidden-")) return "shadow";
  if (id === "spell-frost") return "frost";
  if (id === "spell-thunder") return "lightning";
  if (id.startsWith("spell-")) return "flame";
  return "slash";
}

const statusVisuals: Record<string, SkillVisual> = {
  burn: "flame", bleed: "slash", chill: "frost", stun: "lightning",
  weaken: "shadow", drain: "shadow", fortify: "ward", regen: "heal", surge: "lightning",
  heal: "heal", shield: "ward", cleanse: "heal", focus: "lightning",
};
export function statusVisual(effect: string): SkillVisual | undefined {
  return statusVisuals[effect];
}

export function SpriteFrames({ asset, state = "idle", animate = false, loop = false, duration = .72 }: {
  asset: SpriteAsset; state?: string; animate?: boolean; loop?: boolean; duration?: number;
}) {
  const animation = asset.animations[state];
  const style = {
    "--sprite-end": `${-(animation.frames - 1) * asset.width}px`,
    "--sprite-steps": Math.max(1, animation.frames - 1),
    "--sprite-duration": `${duration}s`,
    "--sprite-repeat": loop ? "infinite" : "1",
  } as CSSProperties;
  return <svg width={asset.width} height={asset.height} viewBox={`0 0 ${asset.width} ${asset.height}`} overflow="hidden" aria-hidden="true">
    <image className={`sprite-strip${animate && animation.frames > 1 ? " is-animated" : ""}`} href={animation.src} width={asset.width * animation.frames} height={asset.height} style={style} />
  </svg>;
}

export function SpriteActor({ asset, state, speed = 1 }: { asset: SpriteAsset; state: string; speed?: number }) {
  const scale = 1 / asset.bodyHeight;
  const style = {
    width: `calc(var(--actor-size) * ${asset.width * scale})`,
    height: `calc(var(--actor-size) * ${asset.height * scale})`,
    left: `calc(var(--actor-size) * ${-asset.anchorX * scale})`,
    bottom: `calc(var(--actor-size) * ${(asset.anchorY - asset.height) * scale})`,
  } as CSSProperties;
  const loop = state === "idle" || state === "meditate";
  return <svg className="sprite-actor" style={style} viewBox={`0 0 ${asset.width} ${asset.height}`} data-pose={state} aria-hidden="true">
    <SpriteFrames asset={asset} state={state} animate loop={loop} duration={loop ? 1.6 : (state === "hit" ? .4 : .72) / speed} />
  </svg>;
}

export function SkillIcon({ id }: { id: string }) {
  const art = skillIcons[skillVisual(id)];
  return <svg className="skill-art" viewBox={`0 0 ${art.width} ${art.height}`} aria-hidden="true"><SpriteFrames asset={art} /></svg>;
}
