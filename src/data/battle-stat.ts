export enum BattleStat {
  ATK,
  DEF,
  SPATK,
  SPDEF,
  SPD,
  ACC,
  EVA,
  RAND
}

export function getBattleStatName(stat: BattleStat) {
  switch (stat) {
    case BattleStat.ATK:
      return '攻击';
    case BattleStat.DEF:
      return '防御';
    case BattleStat.SPATK:
      return '特攻';
    case BattleStat.SPDEF:
      return '特防';
    case BattleStat.SPD:
      return '速度';
    case BattleStat.ACC:
      return '命中率';
    case BattleStat.EVA:
      return '闪避';
    default:
      return '???';
  }
}

export function getBattleStatLevelChangeDescription(levels: integer, up: boolean) {
  if (up) {
    switch (levels) {
      case 1:
        return '提升了';
      case 2:
        return '大幅提升了';
      case 3:
      case 4:
      case 5:
      case 6:
        return '剧烈提升了'; 
      default:
        return '不能再提升了';
    }
  } else {
    switch (levels) {
      case 1:
        return '降低了';
      case 2:
        return '大幅降低了';
      case 3:
      case 4:
      case 5:
      case 6:
        return '剧烈降低了';
      default:
        return '不能再降低了';
    }
  }
}