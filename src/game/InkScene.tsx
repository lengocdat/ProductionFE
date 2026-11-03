import type { CSSProperties } from "react";
import type { BattleEvent } from "./types";
import { characterArt, monsterArt, effectArt, SpriteActor, SpriteFrames, skillVisual, statusVisual } from "./SpriteArt";
import type { SkillVisual, SpriteAsset } from "./SpriteArt";
import "./ink-scene.css";

type InkEvent = Pick<BattleEvent, "seq" | "actor" | "target" | "kind" | "damage" | "skill" | "skill_id">;
export type InkSceneProps = {
  mode: "cultivation" | "journey" | "battle";
  region?: string;
  heroPath?: string;
  bossID?: string;
  heroHP?: number;
  heroMaxHP?: number;
  foeHP?: number;
  foeMaxHP?: number;
  event?: InkEvent;
  effect?: string;
  speed?: number;
  paused?: boolean;
};

const REGIONS: Record<string, string> = {
  "thanh-van": "Thanh Vân Sơn", "van-truc": "Vạn Trúc Lâm",
  "hac-phong": "Hắc Phong Cốc", "van-tuong": "Vạn Tượng Thiên",
};
const PATHS: Record<string, string> = { sword: "Kiếm tu", body: "Thể tu", spell: "Pháp tu", hidden: "Ẩn tu" };
const BOSS_NAMES: Record<string, string> = {
  "moss-boar": "Trư Yêu Rêu Xanh", "gate-guardian": "Hộ Sơn Thạch Nhân",
  "bamboo-serpent": "Trúc Diệp Xà", "mist-hermit": "Mê Vụ Tán Nhân",
  "black-wind-wolf": "Hắc Phong Lang Vương", "bronze-general": "Đồng Giáp Tướng",
  "cloud-kirin": "Vân Hải Kỳ Lân", "void-reflection": "Hư Không Đạo Ảnh",
  "guild-earth-dragon": "Địa Mạch Cổ Long", "guild-sky-phoenix": "Thiên Hỏa Phượng Hoàng",
};
const PEOPLE: Record<string, string> = {
  "lan-chi": "Lan Chi", "mac-ngon": "Mạc Ngôn", "tram-yen": "Trầm Yên",
  "kha-phong": "Khả Phong", "to-anh": "Tố Anh", "bach-lien": "Bạch Liên",
};

export function InkPortrait({ kind, id, className = "" }: { kind: "hero" | "boss" | "npc"; id: string; className?: string }) {
  const asset = (kind === "boss" ? monsterArt : characterArt)[`${kind}-${id}`];
  const name = (kind === "boss" ? BOSS_NAMES : kind === "npc" ? PEOPLE : PATHS)[id];
  if (!asset) return null;
  const padding = asset.bodyHeight * .12;
  return <svg className={`ink-portrait ink-portrait-${kind} ${className}`} viewBox={`${asset.anchorX - asset.bodyWidth / 2 - padding} ${asset.anchorY - asset.bodyHeight - padding} ${asset.bodyWidth + padding * 2} ${asset.bodyHeight + padding * 2}`} role="img" aria-label={name}>
    <SpriteFrames asset={asset} />
  </svg>;
}

function Health({ side, hp, max, label }: { side: "hero" | "foe"; hp?: number; max?: number; label: string }) {
  if (hp === undefined || max === undefined || !Number.isFinite(hp) || !Number.isFinite(max) || max <= 0) return null;
  const value = Math.max(0, Math.min(hp, max));
  return <div className={`scene-vitals scene-vitals-${side}`} role="img" aria-label={`${label}: ${value}/${max} sinh lực`}>
    <span style={{ width: `${100 * value / max}%` }} /><small aria-hidden="true">{value} / {max}</small>
  </div>;
}

function eventVisual(event: InkEvent, effect: string): SkillVisual | undefined {
  if (event.kind === "flee") return undefined;
  if (event.kind === "guard") return "ward";
  if (event.kind === "recover") return "heal";
  if (event.kind === "stun" || event.kind === "enrage") return "lightning";
  if (event.kind === "reflect") return "impact";
  if (event.kind === "attack" && event.actor === "hero" && event.skill_id) return skillVisual(event.skill_id);
  return statusVisual(effect) ?? (event.damage > 0 ? "impact" : undefined);
}

function poseFor(side: "hero" | "foe", hp: number | undefined, event: InkEvent | undefined, visual: SkillVisual | undefined) {
  if (hp === 0) return "death";
  if (!event) return "idle";
  if (event.actor === side && event.kind === "attack") {
    return side === "hero" && visual !== "slash" ? "cast" : "attack";
  }
  if (event.target === side && event.damage > 0) return "hit";
  if (event.actor === side && (event.kind === "guard" || event.kind === "recover" || event.kind === "item")) return "cast";
  return "idle";
}

function PreloadActor({ asset }: { asset: SpriteAsset }) {
  return <>{Object.values(asset.animations).map(animation => <link key={animation.src} rel="preload" as="image" href={animation.src} />)}</>;
}

export default function InkScene({ mode, region = "thanh-van", heroPath = "sword", bossID = "moss-boar", heroHP, heroMaxHP, foeHP, foeMaxHP, event, effect = "", speed = 1, paused = false }: InkSceneProps) {
  const regionID = REGIONS[region] ? region : "thanh-van";
  const battle = mode === "battle";
  const cultivating = mode === "cultivation";
  const hero = characterArt[`hero-${heroPath}`] ?? characterArt["hero-sword"];
  const foe = monsterArt[`boss-${bossID}`];
  const visual = battle && event ? eventVisual(event, effect) : undefined;
  const fx = visual ? effectArt[`fx-${visual}`] : undefined;
  // Ward/stealth techniques prepare the caster; they are not strikes on the opponent.
  const visualTarget = event && (visual === "ward" || visual === "shadow") && event.kind === "attack" && event.actor === "hero" ? event.actor : event?.target;
  const effectStyle = { "--event-speed": speed } as CSSProperties;
  return <div className={`ink-scene ink-scene-${mode}${paused ? " ink-paused" : ""}`} style={effectStyle} role="img" aria-label={`${REGIONS[regionID]} · ${cultivating ? "Tĩnh tâm tu luyện" : battle ? `Đấu pháp với ${BOSS_NAMES[bossID] ?? "đối thủ"}` : "Hành trình tu tiên"}`}>
    <PreloadActor asset={hero} />
    {battle && foe && <PreloadActor asset={foe} />}
    {battle && Object.values(effectArt).map(asset => <link key={asset.animations.play.src} rel="preload" as="image" href={asset.animations.play.src} />)}
    <img className="scene-landscape" src={`/art/scenes/${regionID}.webp`} alt="" width={1280} height={720} />
    <div className="scene-atmosphere" aria-hidden="true" />
    <img className="scene-platform" src="/art/scenes/arena.webp" alt="" width={1100} height={712} />
    {cultivating && <div className="scene-cultivation-light" aria-hidden="true" />}
    <div className="scene-unit scene-unit-hero" data-character={`hero-${heroPath}`}>
      <div className="scene-contact-shadow" />
      <SpriteActor key={`hero-${event?.seq ?? 0}`} asset={hero} state={battle ? poseFor("hero", heroHP, event, visual) : cultivating ? "meditate" : "idle"} speed={speed} />
    </div>
    {battle && foe && <div className="scene-unit scene-unit-foe" data-character={`boss-${bossID}`}>
      <div className="scene-contact-shadow" />
      <div className="scene-face-left"><SpriteActor key={`foe-${event?.seq ?? 0}`} asset={foe} state={poseFor("foe", foeHP, event, visual)} speed={speed} /></div>
    </div>}
    {fx && event && <svg key={`effect-${event.seq}`} className={`scene-fx scene-fx-${visual} scene-fx-${visualTarget}`} viewBox={`0 0 ${fx.width} ${fx.height}`} aria-hidden="true" data-effect={visual}>
      <SpriteFrames asset={fx} state="play" animate duration={.72 / speed} />
    </svg>}
    {battle && event && event.damage > 0 && <span key={`damage-${event.seq}`} className={`scene-damage scene-damage-${event.target}`} aria-hidden="true">−{event.damage}</span>}
    {battle && <><Health side="hero" hp={heroHP} max={heroMaxHP} label="Đạo hữu" /><Health side="foe" hp={foeHP} max={foeMaxHP} label={BOSS_NAMES[bossID] ?? "Đối thủ"} /></>}
  </div>;
}
