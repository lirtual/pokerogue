import { Modifier } from "typescript";
import BattleScene from "../battle-scene";
import * as Utils from "../utils";
import { TurnHeldItemTransferModifier } from "../modifier/modifier";

export enum AchvTier {
  COMMON,
  GREAT,
  ULTRA,
  ROGUE,
  MASTER
}

export class Achv {
  public id: string;
  public name: string;
  public description: string;
  public iconImage: string;
  public score: integer;

  public secret: boolean;
  public hasParent: boolean;
  public parentId: string;

  private conditionFunc: (scene: BattleScene, args: any[]) => boolean;

  constructor(name: string, description: string, iconImage: string, score: integer, conditionFunc?: (scene: BattleScene, args: any[]) => boolean) {
    this.name = name;
    this.description = description;
    this.iconImage = iconImage;
    this.score = score;
    this.conditionFunc = conditionFunc;
  }

  getName(): string {
    return this.name;
  }

  getIconImage(): string {
    return this.iconImage;
  }

  setSecret(hasParent?: boolean): this {
    this.secret = true;
    this.hasParent = !!hasParent;
    return this;
  }

  validate(scene: BattleScene, args: any[]): boolean {
    return !this.conditionFunc || this.conditionFunc(scene, args);
  }

  getTier(): AchvTier {
    if (this.score >= 100)
      return AchvTier.MASTER;
    if (this.score >= 75)
      return AchvTier.ROGUE;
    if (this.score >= 50)
      return AchvTier.ULTRA;
    if (this.score >= 25)
      return AchvTier.GREAT;
    return AchvTier.COMMON;
  }
}

export class MoneyAchv extends Achv {
  private moneyAmount: integer;

  constructor(name: string, moneyAmount: integer, iconImage: string, score: integer) {
    super(name, `累计获得₽${moneyAmount.toLocaleString('en-US')}`, iconImage, score, (scene: BattleScene, _args: any[]) => scene.money >= this.moneyAmount);

    this.moneyAmount = moneyAmount;
  }
}

export class RibbonAchv extends Achv {
  private ribbonAmount: integer;

  constructor(name: string, ribbonAmount: integer, iconImage: string, score: integer) {
    super(name, `累计获得${ribbonAmount.toLocaleString('en-US')}个缎带勋章`, iconImage, score, (scene: BattleScene, _args: any[]) => scene.gameData.gameStats.ribbonsOwned >= this.ribbonAmount);

    this.ribbonAmount = ribbonAmount;
  }
}

export class DamageAchv extends Achv {
  private damageAmount: integer;

  constructor(name: string, damageAmount: integer, iconImage: string, score: integer) {
    super(name, `一击造成${damageAmount.toLocaleString('en-US')}伤害`, iconImage, score, (_scene: BattleScene, args: any[]) => (args[0] as Utils.NumberHolder).value >= this.damageAmount);

    this.damageAmount = damageAmount;
  }
}

export class HealAchv extends Achv {
  private healAmount: integer;

  constructor(name: string, healAmount: integer, iconImage: string, score: integer) {
    super(name, `通过招式、特性或携带道具，一次性回复 ${healAmount.toLocaleString('en-US')} 点 HP。`, iconImage, score, (_scene: BattleScene, args: any[]) => (args[0] as Utils.NumberHolder).value >= this.healAmount);

    this.healAmount = healAmount;
  }
}

export class LevelAchv extends Achv {
  private level: integer;

  constructor(name: string, level: integer, iconImage: string, score: integer) {
    super(name, `将一只宝可梦提升至 ${level} 级`, iconImage, score, (scene: BattleScene, args: any[]) => (args[0] as Utils.IntegerHolder).value >= this.level);

    this.level = level;
  }
}

export class ModifierAchv extends Achv {
  constructor(name: string, description: string, iconImage: string, score: integer, modifierFunc: (modifier: Modifier) => boolean) {
    super(name, description, iconImage, score, (_scene: BattleScene, args: any[]) => modifierFunc((args[0] as Modifier)));
  }
}

export const achvs = {
  _10K_MONEY: new MoneyAchv('小富翁', 10000, 'nugget', 10),
  _100K_MONEY: new MoneyAchv('富豪', 100000, 'big_nugget', 25).setSecret(true),
  _1M_MONEY: new MoneyAchv('百万富翁', 1000000, 'relic_gold', 50).setSecret(true),
  _10M_MONEY: new MoneyAchv('百分之一富豪', 10000000, 'coin_case', 100).setSecret(true),
  _250_DMG: new DamageAchv('重拳出击', 250, 'lucky_punch', 10),
  _1000_DMG: new DamageAchv('更重拳出击', 1000, 'lucky_punch_great', 25).setSecret(true),
  _2500_DMG: new DamageAchv('伤害爆表！', 2500, 'lucky_punch_ultra', 50).setSecret(true),
  _10000_DMG: new DamageAchv('一拳超人', 10000, 'lucky_punch_master', 100).setSecret(true),
  _250_HEAL: new HealAchv('新手治疗师', 250, 'potion', 10),
  _1000_HEAL: new HealAchv('高级治疗师', 1000, 'super_potion', 25).setSecret(true),
  _2500_HEAL: new HealAchv('牧师', 2500, 'hyper_potion', 50).setSecret(true),
  _10000_HEAL: new HealAchv('恢复大师', 10000, 'max_potion', 100).setSecret(true),
  LV_100: new LevelAchv('但这还不是全部！', 100, 'rare_candy', 25).setSecret(),
  LV_250: new LevelAchv('精英', 250, 'rarer_candy', 50).setSecret(true),
  LV_1000: new LevelAchv('超越极限', 1000, 'candy_jar', 100).setSecret(true),
  _10_RIBBONS: new RibbonAchv('宝可梦联盟冠军', 10, 'bronze_ribbon', 10),
  _25_RIBBONS: new RibbonAchv('高级联盟冠军', 25, 'great_ribbon', 25).setSecret(true),
  _50_RIBBONS: new RibbonAchv('超级联盟冠军', 50, 'ultra_ribbon', 50).setSecret(true),
  _75_RIBBONS: new RibbonAchv('大师联盟冠军', 75, 'rogue_ribbon', 75).setSecret(true),
  _100_RIBBONS: new RibbonAchv('大师联盟冠军', 100, 'master_ribbon', 100).setSecret(true),
  TRANSFER_MAX_BATTLE_STAT: new Achv('团队合作', '将至少一项属性达到最大值的宝可梦接力给另一位队友', 'stick', 20),
  MAX_FRIENDSHIP: new Achv('亲密无间', '与宝可梦达到最高亲密度', 'soothe_bell', 25),
  MEGA_EVOLVE: new Achv('超级进化', '超级进化一只宝可梦', 'mega_bracelet', 50),
  GIGANTAMAX: new Achv('庞然大物', '极巨化一只宝可梦', 'dynamax_band', 50),
  TERASTALLIZE: new Achv('属性爱好者', '太晶化一只宝可梦', 'tera_orb', 25),
  STELLAR_TERASTALLIZE: new Achv('隐藏的属性', '闪耀太晶化一只宝可梦', 'stellar_tera_shard', 25).setSecret(true),
  SPLICE: new Achv('无限融合', '使用DNA拼接器拼接两只宝可梦', 'dna_splicers', 10),
  MINI_BLACK_HOLE: new ModifierAchv('道具多多', '获得迷你黑洞', 'mini_black_hole', 25, modifier => modifier instanceof TurnHeldItemTransferModifier).setSecret(),
  CATCH_MYTHICAL: new Achv('幻之宝可梦', '捕捉一只幻之宝可梦', 'strange_ball', 50).setSecret(),
  CATCH_SUB_LEGENDARY: new Achv('准神兽', '捕捉一只准神兽', 'rb', 75).setSecret(),
  CATCH_LEGENDARY: new Achv('神兽', '捕捉一只神兽', 'mb', 100).setSecret(),
  SEE_SHINY: new Achv('闪光宝可梦', '在野外发现一只闪光宝可梦', 'pb_gold', 75),
  SHINY_PARTY: new Achv('真爱粉', '拥有一支全员闪光宝可梦的队伍', 'shiny_charm', 100).setSecret(true),
  HATCH_MYTHICAL: new Achv('幻之宝可梦蛋', '从蛋中孵化一只幻之宝可梦', 'pair_of_tickets', 75).setSecret(),
  HATCH_SUB_LEGENDARY: new Achv('准神兽蛋', '从蛋中孵化一只准神兽', 'mystic_ticket', 100).setSecret(),
  HATCH_LEGENDARY: new Achv('神兽蛋', '从蛋中孵化一只神兽', 'mystic_ticket', 125).setSecret(),
  HATCH_SHINY: new Achv('闪光宝可梦蛋', '从蛋中孵化一只闪光宝可梦', 'golden_mystic_ticket', 100).setSecret(),
  HIDDEN_ABILITY: new Achv('隐藏潜力', '捕捉一只拥有隐藏特性的宝可梦', 'ability_charm', 75),
  PERFECT_IVS: new Achv('正品证书', '获得一只宝可梦的完美个体值', 'blunder_policy', 100),
  CLASSIC_VICTORY: new Achv('不败战绩', '在经典模式下通关游戏', 'relic_crown', 150)
};

{
  (function() {
    const achvKeys = Object.keys(achvs);
    achvKeys.forEach((a: string, i: integer) => {
      achvs[a].id = a;
      if (achvs[a].hasParent)
        achvs[a].parentId = achvKeys[i - 1];
    });
  })();
}