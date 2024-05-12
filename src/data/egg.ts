import { Type } from "./type";
import * as Utils from "../utils";
import BattleScene from "../battle-scene";
import { Species } from "./enums/species";
import { getPokemonSpecies, speciesStarters } from "./pokemon-species";
import { EggTier } from "./enums/egg-type";

export const EGG_SEED = 1073741824;

export enum GachaType {
  MOVE,
  LEGENDARY,
  SHINY
}

export class Egg {
  public id: integer;
  public tier: EggTier;
  public gachaType: GachaType;
  public hatchWaves: integer;
  public timestamp: integer;

  constructor(id: integer, gachaType: GachaType, hatchWaves: integer, timestamp: integer) {
    this.id = id;
    this.tier = Math.floor(id / EGG_SEED);
    this.gachaType = gachaType;
    this.hatchWaves = hatchWaves;
    this.timestamp = timestamp;
  }

  isManaphyEgg(): boolean {
    return this.tier === EggTier.COMMON && !(this.id % 255);
  }

  getKey(): string {
    if (this.isManaphyEgg())
      return 'manaphy';
    return this.tier.toString();
  }
}

export function getEggTierDefaultHatchWaves(tier: EggTier): integer {
  switch (tier) {
    case EggTier.COMMON:
      return 10;
    case EggTier.GREAT:
      return 25;
    case EggTier.ULTRA:
      return 50;
  }
  return 100;
}

export function getEggDescriptor(egg: Egg): string {
  if (egg.isManaphyEgg())
    return 'Manaphy';
  switch (egg.tier) {
    case EggTier.GREAT:
      return '稀有';
    case EggTier.ULTRA:
      return '史诗';
    case EggTier.MASTER:
      return '传说';
    default:
      return '普通';
  }  
}

export function getEggHatchWavesMessage(hatchWaves: integer): string {
  if (hatchWaves <= 5) {
    return '可以听到里面传来的声音！很快就会孵化！';
  } else if (hatchWaves <= 15) {
    return '它似乎偶尔会动。可能快要孵化了。';
  } else if (hatchWaves <= 50) {
    return '会从里面孵出什么？它看起来离孵化还很远。';
  } else {
    return '看起来这颗蛋需要很长时间才能孵化。';
  }
}

export function getEggGachaTypeDescriptor(scene: BattleScene, egg: Egg): string {
  switch (egg.gachaType) {
    case GachaType.LEGENDARY:
      return `传说宝可梦概率提升（${getPokemonSpecies(getLegendaryGachaSpeciesForTimestamp(scene, egg.timestamp)).getName()}）`;
    case GachaType.MOVE:
      return '稀有招式概率提升';
    case GachaType.SHINY:
      return '闪光宝可梦概率提升';
  }
}

export function getLegendaryGachaSpeciesForTimestamp(scene: BattleScene, timestamp: integer): Species {
  const legendarySpecies = Object.entries(speciesStarters)
    .filter(s => s[1] >= 8 && s[1] <= 9)
    .map(s => parseInt(s[0]))
    .filter(s => getPokemonSpecies(s).isObtainable());

  let ret: Species;

  scene.executeWithSeedOffset(() => {
    ret = Utils.randSeedItem(legendarySpecies);
  }, Utils.getSunday(new Date(timestamp)).getTime(), EGG_SEED.toString());

  return ret;
}