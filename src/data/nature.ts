import { Stat, getStatName } from "./pokemon-stat";
import * as Utils from "../utils";
import { TextStyle, getBBCodeFrag } from "../ui/text";
import { UiTheme } from "#app/enums/ui-theme";

export enum Nature {
  HARDY,
  LONELY,
  BRAVE,
  ADAMANT,
  NAUGHTY,
  BOLD,
  DOCILE,
  RELAXED,
  IMPISH,
  LAX,
  TIMID,
  HASTY,
  SERIOUS,
  JOLLY,
  NAIVE,
  MODEST,
  MILD,
  QUIET,
  BASHFUL,
  RASH,
  CALM,
  GENTLE,
  SASSY,
  CAREFUL,
  QUIRKY
}

// 定义一个映射表，将枚举值映射到对应的中文值
const natureMap = {
  [Nature.HARDY]: '勤奋',
  [Nature.LONELY]: '孤独',
  [Nature.BRAVE]: '勇敢',
  [Nature.ADAMANT]: '固执',
  [Nature.NAUGHTY]: '顽皮',
  [Nature.BOLD]: '大胆',
  [Nature.DOCILE]: '温顺',
  [Nature.RELAXED]: '悠闲',
  [Nature.IMPISH]: '淘气',
  [Nature.LAX]: '马虎',
  [Nature.TIMID]: '胆小',
  [Nature.HASTY]: '急躁',
  [Nature.SERIOUS]: '认真',
  [Nature.JOLLY]: '开朗',
  [Nature.NAIVE]: '天真',
  [Nature.MODEST]: '谦虚',
  [Nature.MILD]: '温和',
  [Nature.QUIET]: '安静',
  [Nature.BASHFUL]: '害羞',
  [Nature.RASH]: '鲁莽',
  [Nature.CALM]: '冷静',
  [Nature.GENTLE]: '温柔',
  [Nature.SASSY]: '自大',
  [Nature.CAREFUL]: '谨慎',
  [Nature.QUIRKY]: '古怪'
};

// 获取对应枚举值的中文值
export function getNatureChineseValue(nature: Nature) {
  return natureMap[nature];
}

export function getNatureName(nature: Nature, includeStatEffects: boolean = false, forStarterSelect: boolean = false, ignoreBBCode: boolean = false, uiTheme: UiTheme = UiTheme.DEFAULT): string {
  // let ret = Utils.toReadableString(Nature[nature]);
  let ret = getNatureChineseValue(nature);
  if (includeStatEffects) {
    const stats = Utils.getEnumValues(Stat).slice(1);
    let increasedStat: Stat = null;
    let decreasedStat: Stat = null;
    for (let stat of stats) {
      const multiplier = getNatureStatMultiplier(nature, stat);
      if (multiplier > 1)
        increasedStat = stat;
      else if (multiplier < 1)
        decreasedStat = stat;
    }
    const textStyle = forStarterSelect ? TextStyle.SUMMARY_ALT : TextStyle.WINDOW;
    const getTextFrag = !ignoreBBCode ? (text: string, style: TextStyle) => getBBCodeFrag(text, style, uiTheme) : (text: string, style: TextStyle) => text;
    if (increasedStat && decreasedStat)
      ret = `${getTextFrag(`${ret}${!forStarterSelect ? '\n' : ' '}(`, textStyle)}${getTextFrag(`+${getStatName(increasedStat, true)}`, TextStyle.SUMMARY_PINK)}${getTextFrag('/', textStyle)}${getTextFrag(`-${getStatName(decreasedStat, true)}`, TextStyle.SUMMARY_BLUE)}${getTextFrag(')', textStyle)}`;
    else
      ret = getTextFrag(`${ret}${!forStarterSelect ? '\n' : ' '}(-)`, textStyle);
  }
  return ret;
}

export function getNatureStatMultiplier(nature: Nature, stat: Stat): number {
  switch (stat) {
    case Stat.ATK:
      switch (nature) {
        case Nature.LONELY:
        case Nature.BRAVE:
        case Nature.ADAMANT:
        case Nature.NAUGHTY:
          return 1.1;
        case Nature.BOLD:
        case Nature.TIMID:
        case Nature.MODEST:
        case Nature.CALM:
          return 0.9;
      }
      break;
    case Stat.DEF:
      switch (nature) {
        case Nature.BOLD:
        case Nature.RELAXED:
        case Nature.IMPISH:
        case Nature.LAX:
          return 1.1;
        case Nature.LONELY:
        case Nature.HASTY:
        case Nature.MILD:
        case Nature.GENTLE:
          return 0.9;
      }
      break;
    case Stat.SPATK:
      switch (nature) {
        case Nature.MODEST:
        case Nature.MILD:
        case Nature.QUIET:
        case Nature.RASH:
          return 1.1;
        case Nature.ADAMANT:
        case Nature.IMPISH:
        case Nature.JOLLY:
        case Nature.CAREFUL:
          return 0.9;
      }
      break;
    case Stat.SPDEF:
      switch (nature) {
        case Nature.CALM:
        case Nature.GENTLE:
        case Nature.SASSY:
        case Nature.CAREFUL:
          return 1.1;
        case Nature.NAUGHTY:
        case Nature.LAX:
        case Nature.NAIVE:
        case Nature.RASH:
          return 0.9;
      }
      break;
    case Stat.SPD:
      switch (nature) {
        case Nature.TIMID:
        case Nature.HASTY:
        case Nature.JOLLY:
        case Nature.NAIVE:
          return 1.1;
        case Nature.BRAVE:
        case Nature.RELAXED:
        case Nature.QUIET:
        case Nature.SASSY:
          return 0.9;
      }
      break;
  }

  return 1;
}