import { PokemonHealPhase, StatChangePhase } from "../phases";
import { getPokemonMessage } from "../messages";
import Pokemon, { HitResult } from "../field/pokemon";
import { getBattleStatName } from "./battle-stat";
import { BattleStat } from "./battle-stat";
import { BattlerTagType } from "./enums/battler-tag-type";
import { getStatusEffectHealText } from "./status-effect";
import * as Utils from "../utils";
import { DoubleBerryEffectAbAttr, ReduceBerryUseThresholdAbAttr, applyAbAttrs } from "./ability";

export enum BerryType {
  SITRUS,
  LUM,
  ENIGMA,
  LIECHI,
  GANLON,
  PETAYA,
  APICOT,
  SALAC,
  LANSAT,
  STARF,
  LEPPA
}

// 定义一个映射表，将枚举值映射到对应的中文值
const berryTypeMap = {
  [BerryType.SITRUS]: '柑果',
  [BerryType.LUM]: '亮光果',
  [BerryType.ENIGMA]: '神秘果',
  [BerryType.LIECHI]: '荔枝果',
  [BerryType.GANLON]: '龙睛果',
  [BerryType.PETAYA]: '火龙果',
  [BerryType.APICOT]: '杏仔果',
  [BerryType.SALAC]: '沙鳞果',
  [BerryType.LANSAT]: '蓝橘果',
  [BerryType.STARF]: '星桃果',
  [BerryType.LEPPA]: '零余果'
};

// 获取对应枚举值的中文值
function getBerryTypeChineseValue(berryType) {
  return berryTypeMap[berryType];
}

export function getBerryName(berryType: BerryType) {
  return getBerryTypeChineseValue(berryType);
}

export function getBerryEffectDescription(berryType: BerryType) {
  switch (berryType) {
    case BerryType.SITRUS:
      return '当宝可梦的HP低于50%时，恢复25%的HP。';
    case BerryType.LUM:
      return '治疗任何非永久性状态异常和混乱状态。';
    case BerryType.ENIGMA:
      return '如果受到超级有效的招式攻击，则恢复25%的HP。';
    case BerryType.LIECHI:
    case BerryType.GANLON:
    case BerryType.PETAYA:
    case BerryType.APICOT:
    case BerryType.SALAC:
      const stat = (berryType - BerryType.LIECHI) as BattleStat;
      return `如果宝可梦的HP低于25%，则提升 ${getBattleStatName(stat)}。`;
    case BerryType.LANSAT:
      return '如果宝可梦的HP低于25%，则提升其击中要害率。';
    case BerryType.STARF:
      return '如果生命值低于25%，则大幅提升一项随机属性';
    case BerryType.LEPPA:
      return '如果招式PP值降为0，则恢复该招式10PP值';
  }
}

export type BerryPredicate = (pokemon: Pokemon) => boolean;

export function getBerryPredicate(berryType: BerryType): BerryPredicate {
  switch (berryType) {
    case BerryType.SITRUS:
      return (pokemon: Pokemon) => pokemon.getHpRatio() < 0.5;
    case BerryType.LUM:
      return (pokemon: Pokemon) => !!pokemon.status || !!pokemon.getTag(BattlerTagType.CONFUSED);
    case BerryType.ENIGMA:
      return (pokemon: Pokemon) => !!pokemon.turnData.attacksReceived.filter(a => a.result === HitResult.SUPER_EFFECTIVE).length;
    case BerryType.LIECHI:
    case BerryType.GANLON:
    case BerryType.PETAYA:
    case BerryType.APICOT:
     case BerryType.SALAC:
      return (pokemon: Pokemon) => {
        const threshold = new Utils.NumberHolder(0.25);
        const battleStat = (berryType - BerryType.LIECHI) as BattleStat;
        applyAbAttrs(ReduceBerryUseThresholdAbAttr, pokemon, null, threshold);
        return pokemon.getHpRatio() < threshold.value && pokemon.summonData.battleStats[battleStat] < 6;
      };
    case BerryType.LANSAT:
      return (pokemon: Pokemon) => {
        const threshold = new Utils.NumberHolder(0.25);
        applyAbAttrs(ReduceBerryUseThresholdAbAttr, pokemon, null, threshold);
        return pokemon.getHpRatio() < 0.25 && !pokemon.getTag(BattlerTagType.CRIT_BOOST);
      };
    case BerryType.STARF:
      return (pokemon: Pokemon) => {
        const threshold = new Utils.NumberHolder(0.25);
        applyAbAttrs(ReduceBerryUseThresholdAbAttr, pokemon, null, threshold);
        return pokemon.getHpRatio() < 0.25;
      };
    case BerryType.LEPPA:
      return (pokemon: Pokemon) => {
        const threshold = new Utils.NumberHolder(0.25);
        applyAbAttrs(ReduceBerryUseThresholdAbAttr, pokemon, null, threshold);
        return !!pokemon.getMoveset().find(m => !m.getPpRatio());
      };
  }
}

export type BerryEffectFunc = (pokemon: Pokemon) => void;

export function getBerryEffectFunc(berryType: BerryType): BerryEffectFunc {
  switch (berryType) {
    case BerryType.SITRUS:
    case BerryType.ENIGMA:
      return (pokemon: Pokemon) => {
        if (pokemon.battleData)
          pokemon.battleData.berriesEaten.push(berryType);
        const hpHealed = new Utils.NumberHolder(Math.floor(pokemon.getMaxHp() / 4));
        applyAbAttrs(DoubleBerryEffectAbAttr, pokemon, null, hpHealed);
        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(),
          hpHealed.value, getPokemonMessage(pokemon, `的${getBerryName(berryType)}恢复了体力！`), true));
      };
    case BerryType.LUM:
      return (pokemon: Pokemon) => {
        if (pokemon.battleData)
          pokemon.battleData.berriesEaten.push(berryType);
        if (pokemon.status) {
          pokemon.scene.queueMessage(getPokemonMessage(pokemon, getStatusEffectHealText(pokemon.status.effect)));
          pokemon.resetStatus();
          pokemon.updateInfo();
        } 
        if (pokemon.getTag(BattlerTagType.CONFUSED))
          pokemon.lapseTag(BattlerTagType.CONFUSED);
      };
    case BerryType.LIECHI:
    case BerryType.GANLON:
    case BerryType.PETAYA:
    case BerryType.APICOT:
    case BerryType.SALAC:
      return (pokemon: Pokemon) => {
        if (pokemon.battleData)
          pokemon.battleData.berriesEaten.push(berryType);
        const battleStat = (berryType - BerryType.LIECHI) as BattleStat;
        const statLevels = new Utils.NumberHolder(1);
        applyAbAttrs(DoubleBerryEffectAbAttr, pokemon, null, statLevels);
        pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [ battleStat ], statLevels.value));
      };
    case BerryType.LANSAT:
      return (pokemon: Pokemon) => {
        if (pokemon.battleData)
          pokemon.battleData.berriesEaten.push(berryType);
        pokemon.addTag(BattlerTagType.CRIT_BOOST);
      };
    case BerryType.STARF:
      return (pokemon: Pokemon) => {
        if (pokemon.battleData)
          pokemon.battleData.berriesEaten.push(berryType);
        const statLevels = new Utils.NumberHolder(2);
        applyAbAttrs(DoubleBerryEffectAbAttr, pokemon, null, statLevels);
        pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), true, [ BattleStat.RAND ], statLevels.value));
      };
    case BerryType.LEPPA:
      return (pokemon: Pokemon) => {
        if (pokemon.battleData)
          pokemon.battleData.berriesEaten.push(berryType);
        const ppRestoreMove = pokemon.getMoveset().find(m => !m.getPpRatio());
        ppRestoreMove.ppUsed = Math.max(ppRestoreMove.ppUsed - 10, 0);
        pokemon.scene.queueMessage(getPokemonMessage(pokemon, `使用${getBerryName(berryType)}恢复了${ppRestoreMove.getName()}的PP！`));
      };
  }
}