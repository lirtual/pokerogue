import { Biome } from "./enums/biome";
import { getPokemonMessage } from "../messages";
import Pokemon from "../field/pokemon";
import { Type } from "./type";
import Move, { AttackMove } from "./move";
import * as Utils from "../utils";
import BattleScene from "../battle-scene";
import { SuppressWeatherEffectAbAttr } from "./ability";
import { TerrainType } from "./terrain";

export enum WeatherType {
  NONE,
  SUNNY,
  RAIN,
  SANDSTORM,
  HAIL,
  SNOW,
  FOG,
  HEAVY_RAIN,
  HARSH_SUN,
  STRONG_WINDS
}

export class Weather {
  public weatherType: WeatherType;
  public turnsLeft: integer;

  constructor(weatherType: WeatherType, turnsLeft?: integer) {
    this.weatherType = weatherType;
    this.turnsLeft = !this.isImmutable() ? turnsLeft || 0 : 0;
  }

  lapse(): boolean {
    if (this.isImmutable())
      return true;
    if (this.turnsLeft)
      return !!--this.turnsLeft;

    return true;
  }

  isImmutable(): boolean {
    switch (this.weatherType) {
      case WeatherType.HEAVY_RAIN:
      case WeatherType.HARSH_SUN:
      case WeatherType.STRONG_WINDS:
        return true;
    }

    return false;
  }

  isDamaging(): boolean {
    switch (this.weatherType) {
      case WeatherType.SANDSTORM:
      case WeatherType.HAIL:
        return true;
    }

    return false;
  }

  isTypeDamageImmune(type: Type): boolean {
    switch (this.weatherType) {
      case WeatherType.SANDSTORM:
        return type === Type.GROUND || type === Type.ROCK || type === Type.STEEL;
      case WeatherType.HAIL:
        return type === Type.ICE;
    }

    return false;
  }

  getAttackTypeMultiplier(attackType: Type): number {
    switch (this.weatherType) {
      case WeatherType.SUNNY:
      case WeatherType.HARSH_SUN:
        if (attackType === Type.FIRE)
          return 1.5;
        if (attackType === Type.WATER)
          return 0.5;
        break;
      case WeatherType.RAIN:
      case WeatherType.HEAVY_RAIN:
        if (attackType === Type.FIRE)
          return 0.5;
        if (attackType === Type.WATER)
          return 1.5;
        break;
    }

    return 1;
  }

  isMoveWeatherCancelled(move: Move): boolean {
    switch (this.weatherType) {
      case WeatherType.HARSH_SUN:
        return move instanceof AttackMove && move.type === Type.WATER;
      case WeatherType.HEAVY_RAIN:
        return move instanceof AttackMove && move.type === Type.FIRE;
    }

    return false;
  }

  isEffectSuppressed(scene: BattleScene): boolean {
    const field = scene.getField(true);

    for (let pokemon of field) {
      let suppressWeatherEffectAbAttr = pokemon.getAbility().getAttrs(SuppressWeatherEffectAbAttr).find(() => true) as SuppressWeatherEffectAbAttr;
      if (!suppressWeatherEffectAbAttr)
        suppressWeatherEffectAbAttr = pokemon.hasPassive() ? pokemon.getPassiveAbility().getAttrs(SuppressWeatherEffectAbAttr).find(() => true) as SuppressWeatherEffectAbAttr : null;
      if (suppressWeatherEffectAbAttr && (!this.isImmutable() || suppressWeatherEffectAbAttr.affectsImmutable))
        return true;
    }

    return false;
  }
}

export function getWeatherStartMessage(weatherType: WeatherType): string {
  switch (weatherType) {
    case WeatherType.SUNNY:
      return '阳光变得耀眼！';
    case WeatherType.RAIN:
      return '下起了雨！';
    case WeatherType.SANDSTORM:
      return '刮起了沙尘暴！';
    case WeatherType.HAIL:
      return '下起了冰雹！';
    case WeatherType.SNOW:
      return '下起了雪！';
    case WeatherType.FOG:
      return '出现了浓雾！';
    case WeatherType.HEAVY_RAIN:
      return '下起了倾盆大雨！';
    case WeatherType.HARSH_SUN:
      return '阳光变得灼热！';
    case WeatherType.STRONG_WINDS:
      return '刮起了强风！';
  }

  return null;
}

export function getWeatherLapseMessage(weatherType: WeatherType): string {
  switch (weatherType) {
    case WeatherType.SUNNY:
      return '阳光强烈！';
    case WeatherType.RAIN:
      return '大雨持续！';
    case WeatherType.SANDSTORM:
      return '沙暴肆虐！';
    case WeatherType.HAIL:
      return '冰雹持续落下！';
    case WeatherType.SNOW:
      return '雪花飘落！';
    case WeatherType.FOG:
      return '浓雾弥漫！';
    case WeatherType.HEAVY_RAIN:
      return '暴雨倾盆！';
    case WeatherType.HARSH_SUN:
      return '烈日炎炎！';
    case WeatherType.STRONG_WINDS:
      return '狂风呼啸！';
  }

  return null;
}

export function getWeatherDamageMessage(weatherType: WeatherType, pokemon: Pokemon): string {
  switch (weatherType) {
    case WeatherType.SANDSTORM:
      return getPokemonMessage(pokemon, '被沙暴\n吹得睁不开眼!');
    case WeatherType.HAIL:
      return getPokemonMessage(pokemon, '被冰雹\n砸得生疼!');
  }

  return null;
}

export function getWeatherClearMessage(weatherType: WeatherType): string {
  switch (weatherType) {
    case WeatherType.SUNNY:
      return '阳光消散了。';
    case WeatherType.RAIN:
      return '雨停了。';
    case WeatherType.SANDSTORM:
      return '沙暴平息了。';
    case WeatherType.HAIL:
      return '冰雹停了。';
    case WeatherType.SNOW:
      return '雪停了。';
    case WeatherType.FOG:
      return '雾散了。';
    case WeatherType.HEAVY_RAIN:
      return '暴雨停了。';
    case WeatherType.HARSH_SUN:
      return '烈日消退了。';
    case WeatherType.STRONG_WINDS:
      return '狂风止息了。';
  }

  return null;
}

export function getTerrainStartMessage(terrainType: TerrainType): string {
  switch (terrainType) {
    case TerrainType.MISTY:
      return '迷雾笼罩了整个战场！';
    case TerrainType.ELECTRIC:
      return '电流窜过战场！';
    case TerrainType.GRASSY:
      return '青草覆盖了整个战场！';
    case TerrainType.PSYCHIC:
      return '战场变得奇异起来！';
  }
}

export function getTerrainClearMessage(terrainType: TerrainType): string {
  switch (terrainType) {
    case TerrainType.MISTY:
      return '战场上的迷雾消散了。';
    case TerrainType.ELECTRIC:
      return '战场上的电流消失了。';
    case TerrainType.GRASSY:
      return '战场上的青草消失了。';
    case TerrainType.PSYCHIC:
      return '战场上的奇异现象消失了！';
  }
}

export function getTerrainBlockMessage(pokemon: Pokemon, terrainType: TerrainType): string {
  if (terrainType === TerrainType.MISTY) {
    return getPokemonMessage(pokemon, ' 身周环绕起保护性的迷雾！');
  } else {
    return getPokemonMessage(pokemon, ` 受${Utils.toReadableString(TerrainType[terrainType])}地形的保护！`);
  }  
}

interface WeatherPoolEntry {
  weatherType: WeatherType;
  weight: integer;
}

export function getRandomWeatherType(arena: any /* Importing from arena causes a circular dependency */): WeatherType {
  let weatherPool: WeatherPoolEntry[] = [];
  const hasSun = arena.getTimeOfDay() < 2;
  switch (arena.biomeType) {
    case Biome.GRASS:
      weatherPool = [
        { weatherType: WeatherType.NONE, weight: 7 }
      ];
      if (hasSun)
        weatherPool.push({ weatherType: WeatherType.SUNNY, weight: 3 });
      break;
    case Biome.TALL_GRASS:
      weatherPool = [
        { weatherType: WeatherType.NONE, weight: 8 },
        { weatherType: WeatherType.RAIN, weight: 5 },
      ];
      if (hasSun)
        weatherPool.push({ weatherType: WeatherType.SUNNY, weight: 8 });
      break;
    case Biome.FOREST:
      weatherPool = [
        { weatherType: WeatherType.NONE, weight: 8 },
        { weatherType: WeatherType.RAIN, weight: 5 }
      ];
      break;
    case Biome.SEA:
      weatherPool = [
        { weatherType: WeatherType.NONE, weight: 3 },
        { weatherType: WeatherType.RAIN, weight: 12 }
      ];
      break;
    case Biome.SWAMP:
      weatherPool = [
        { weatherType: WeatherType.NONE, weight: 3 },
        { weatherType: WeatherType.RAIN, weight: 4 },
        { weatherType: WeatherType.FOG, weight: 1 }
      ];
      break;
    case Biome.BEACH:
      weatherPool = [
        { weatherType: WeatherType.NONE, weight: 8 },
        { weatherType: WeatherType.RAIN, weight: 3 }
      ];
      if (hasSun)
        weatherPool.push({ weatherType: WeatherType.SUNNY, weight: 5 });
      break;
    case Biome.LAKE:
      weatherPool = [
        { weatherType: WeatherType.NONE, weight: 10 },
        { weatherType: WeatherType.RAIN, weight: 5 },
        { weatherType: WeatherType.FOG, weight: 1 }
      ];
      break;
    case Biome.SEABED:
      weatherPool = [
        { weatherType: WeatherType.RAIN, weight: 1 }
      ];
      break;
    case Biome.BADLANDS:
      weatherPool = [
        { weatherType: WeatherType.NONE, weight: 8 },
        { weatherType: WeatherType.SANDSTORM, weight: 2 }
      ];
      if (hasSun)
        weatherPool.push({ weatherType: WeatherType.SUNNY, weight: 5 });
      break;
    case Biome.DESERT:
      weatherPool = [
        { weatherType: WeatherType.SANDSTORM, weight: 2 }
      ];
      if (hasSun)
        weatherPool.push({ weatherType: WeatherType.SUNNY, weight: 2 });
      break;
    case Biome.ICE_CAVE:
      weatherPool = [
        { weatherType: WeatherType.NONE, weight: 3 },
        { weatherType: WeatherType.SNOW, weight: 4 },
        { weatherType: WeatherType.HAIL, weight: 1 }
      ];
      break;
    case Biome.MEADOW:
      weatherPool = [
        { weatherType: WeatherType.NONE, weight: 2 }
      ];
      if (hasSun)
        weatherPool.push({ weatherType: WeatherType.SUNNY, weight: 2 });
    case Biome.VOLCANO:
      weatherPool = [
        { weatherType: hasSun ? WeatherType.SUNNY : WeatherType.NONE, weight: 1 }
      ];
      break;
    case Biome.GRAVEYARD:
      weatherPool = [
        { weatherType: WeatherType.NONE, weight: 3 },
        { weatherType: WeatherType.FOG, weight: 1 }
      ];
      break;
    case Biome.JUNGLE:
      weatherPool = [
        { weatherType: WeatherType.NONE, weight: 8 },
        { weatherType: WeatherType.RAIN, weight: 2 }
      ];
      break;
    case Biome.SNOWY_FOREST:
      weatherPool = [
        { weatherType: WeatherType.SNOW, weight: 7 },
        { weatherType: WeatherType.HAIL, weight: 1 }
      ];
      break;
    case Biome.ISLAND:
      weatherPool = [
        { weatherType: WeatherType.NONE, weight: 5 },
        { weatherType: WeatherType.RAIN, weight: 1 },
      ];
      if (hasSun)
        weatherPool.push({ weatherType: WeatherType.SUNNY, weight: 2 });
      break;
  }

  if (weatherPool.length > 1) {
    let totalWeight = 0;
    weatherPool.forEach(w => totalWeight += w.weight);

    const rand = Utils.randSeedInt(totalWeight);
    let w = 0;
    for (let weather of weatherPool) {
      w += weather.weight;
      if (rand < w)
        return weather.weatherType;
    }
  }

  return weatherPool.length
    ? weatherPool[0].weatherType
    : WeatherType.NONE;
}