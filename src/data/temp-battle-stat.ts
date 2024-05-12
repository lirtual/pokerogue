import { BattleStat, getBattleStatName } from "./battle-stat";

export enum TempBattleStat {
  ATK,
  DEF,
  SPATK,
  SPDEF,
  SPD,
  ACC,
  CRIT
}

export function getTempBattleStatName(tempBattleStat: TempBattleStat) {
  if (tempBattleStat === TempBattleStat.CRIT)
    return '暴击率';
  return getBattleStatName(tempBattleStat as integer as BattleStat);
}

export function getTempBattleStatBoosterItemName(tempBattleStat: TempBattleStat) {
  switch (tempBattleStat) {
    case TempBattleStat.ATK:
      return '力量强化';
    case TempBattleStat.DEF:
      return '防御强化';
    case TempBattleStat.SPATK:
      return '特攻强化';
    case TempBattleStat.SPDEF:
      return '特防强化';
    case TempBattleStat.SPD:
      return '速度强化';
    case TempBattleStat.ACC:
      return '命中强化';
    case TempBattleStat.CRIT:
      return '要害攻击';
  }
}