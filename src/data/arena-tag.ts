import { Arena } from "../field/arena";
import { Type } from "./type";
import * as Utils from "../utils";
import { MoveCategory, allMoves } from "./move";
import { getPokemonMessage } from "../messages";
import Pokemon, { HitResult, PokemonMove } from "../field/pokemon";
import { MoveEffectPhase, PokemonHealPhase, StatChangePhase} from "../phases";
import { StatusEffect } from "./status-effect";
import { BattlerIndex } from "../battle";
import { Moves } from "./enums/moves";
import { ArenaTagType } from "./enums/arena-tag-type";
import { BlockNonDirectDamageAbAttr, ProtectStatAbAttr, applyAbAttrs } from "./ability";
import { BattleStat } from "./battle-stat";

export enum ArenaTagSide {
  BOTH,
  PLAYER,
  ENEMY
}

export abstract class ArenaTag {
  public tagType: ArenaTagType;
  public turnCount: integer;
  public sourceMove: Moves;
  public sourceId: integer;
  public side: ArenaTagSide;

  constructor(tagType: ArenaTagType, turnCount: integer, sourceMove: Moves, sourceId?: integer, side: ArenaTagSide = ArenaTagSide.BOTH) {
    this.tagType = tagType;
    this.turnCount = turnCount;
    this.sourceMove = sourceMove;
    this.sourceId = sourceId;
    this.side = side;
  }

  apply(arena: Arena, args: any[]): boolean {
    return true;
  }

  onAdd(arena: Arena): void { }

  onRemove(arena: Arena): void {
    arena.scene.queueMessage(`${this.getMoveName()}的效果消失了${this.side === ArenaTagSide.PLAYER ? '\n在你这边' : this.side === ArenaTagSide.ENEMY ? '\n在对手那边' : ''}。`);
  }

  onOverlap(arena: Arena): void { }

  lapse(arena: Arena): boolean {
    return this.turnCount < 1 || !!(--this.turnCount);
  }

  getMoveName(): string {
    return this.sourceMove
      ? allMoves[this.sourceMove].name
      : null;
  }
}

export class MistTag extends ArenaTag {
  constructor(turnCount: integer, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.MIST, turnCount, Moves.MIST, sourceId, side);
  }

  onAdd(arena: Arena): void {
    super.onAdd(arena);

    const source = arena.scene.getPokemonById(this.sourceId);
    arena.scene.queueMessage(getPokemonMessage(source, `的队伍被迷雾笼罩了！`));
  }

  apply(arena: Arena, args: any[]): boolean {
    (args[0] as Utils.BooleanHolder).value = true;

    arena.scene.queueMessage('迷雾阻止了能力值的降低！');
    
    return true;
  }
}

export class WeakenMoveScreenTag extends ArenaTag {
  constructor(tagType: ArenaTagType, turnCount: integer, sourceMove: Moves, sourceId: integer, side: ArenaTagSide) {
    super(tagType, turnCount, sourceMove, sourceId, side);
  }

  apply(arena: Arena, args: any[]): boolean {
    if ((args[1] as boolean)) {
      (args[2] as Utils.NumberHolder).value = 2732/4096;
    } else {
      (args[2] as Utils.NumberHolder).value = 0.5;
    }
    return true;
  }
}

class ReflectTag extends WeakenMoveScreenTag {
  constructor(turnCount: integer, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.REFLECT, turnCount, Moves.REFLECT, sourceId, side);
  }

  apply(arena: Arena, args: any[]): boolean {
    if ((args[0] as MoveCategory) === MoveCategory.PHYSICAL) {
      if ((args[1] as boolean)) {
        (args[2] as Utils.NumberHolder).value = 2732/4096;
      } else {
        (args[2] as Utils.NumberHolder).value = 0.5;
      }
      return true;
    }
    return false;
  }

  onAdd(arena: Arena): void {
    arena.scene.queueMessage(`${this.side === ArenaTagSide.PLAYER ? '我方' : this.side === ArenaTagSide.ENEMY ? '对手' : ''}的光墙减少了物理招式的伤害。`);
  }
}

class LightScreenTag extends WeakenMoveScreenTag {
  constructor(turnCount: integer, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.LIGHT_SCREEN, turnCount, Moves.LIGHT_SCREEN, sourceId, side);
  }

  apply(arena: Arena, args: any[]): boolean {
    if ((args[0] as MoveCategory) === MoveCategory.SPECIAL) {
      if ((args[1] as boolean)) {
        (args[2] as Utils.NumberHolder).value = 2732/4096;
      } else {
        (args[2] as Utils.NumberHolder).value = 0.5;
      }
      return true;
    }
    return false;
  }

  onAdd(arena: Arena): void {
    arena.scene.queueMessage(`${this.side === ArenaTagSide.PLAYER ? '我方' : this.side === ArenaTagSide.ENEMY ? '对手' : ''}的反射壁减少了特殊招式的伤害。`);
  }
}

class AuroraVeilTag extends WeakenMoveScreenTag {
  constructor(turnCount: integer, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.AURORA_VEIL, turnCount, Moves.AURORA_VEIL, sourceId, side);
  }

  onAdd(arena: Arena): void {
    arena.scene.queueMessage(`${this.side === ArenaTagSide.PLAYER ? '我方' : this.side === ArenaTagSide.ENEMY ? '对手' : ''}的光墙减少了招式的伤害。`);
  }
}

class WishTag extends ArenaTag {
  private battlerIndex: BattlerIndex;
  private triggerMessage: string;
  private healHp: number;

  constructor(turnCount: integer, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.WISH, turnCount, Moves.WISH, sourceId, side);
  }

  onAdd(arena: Arena): void {
    const user = arena.scene.getPokemonById(this.sourceId);
    this.battlerIndex = user.getBattlerIndex();
    this.triggerMessage = getPokemonMessage(user, '的愿望实现了！');
    this.healHp = Math.max(Math.floor(user.getMaxHp() / 2), 1);
  }
  
  onRemove(arena: Arena): void {
    const target = arena.scene.getField()[this.battlerIndex];
    if (target?.isActive(true)) {
      arena.scene.queueMessage(this.triggerMessage);
      arena.scene.unshiftPhase(new PokemonHealPhase(target.scene, target.getBattlerIndex(), this.healHp, null, true, false));
    }
  }
}

export class WeakenMoveTypeTag extends ArenaTag {
  private weakenedType: Type;

  constructor(tagType: ArenaTagType, turnCount: integer, type: Type, sourceMove: Moves, sourceId: integer) {
    super(tagType, turnCount, sourceMove, sourceId);

    this.weakenedType = type;
  }

  apply(arena: Arena, args: any[]): boolean {
    if ((args[0] as Type) === this.weakenedType) {
      (args[1] as Utils.NumberHolder).value *= 0.33;
      return true;
    }

    return false;
  }
}

class MudSportTag extends WeakenMoveTypeTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(ArenaTagType.MUD_SPORT, turnCount, Type.ELECTRIC, Moves.MUD_SPORT, sourceId);
  }

  onAdd(arena: Arena): void {
    arena.scene.queueMessage('电系招式的威力降低了！');
  }

  onRemove(arena: Arena): void {
    arena.scene.queueMessage('泥巴射击的效果消失了。');
  }
}

class WaterSportTag extends WeakenMoveTypeTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(ArenaTagType.WATER_SPORT, turnCount, Type.FIRE, Moves.WATER_SPORT, sourceId);
  }

  onAdd(arena: Arena): void {
    arena.scene.queueMessage('火系招式的威力降低了！');
  }

  onRemove(arena: Arena): void {
    arena.scene.queueMessage('潮湿的效果消失了。');
  }
}

export class ArenaTrapTag extends ArenaTag {
  public layers: integer;
  public maxLayers: integer;

  constructor(tagType: ArenaTagType, sourceMove: Moves, sourceId: integer, side: ArenaTagSide, maxLayers: integer) {
    super(tagType, 0, sourceMove, sourceId, side);

    this.layers = 1;
    this.maxLayers = maxLayers;
  }

  onOverlap(arena: Arena): void {
    if (this.layers < this.maxLayers) {
      this.layers++;

      this.onAdd(arena);
    }
  }

  apply(arena: Arena, args: any[]): boolean {
    const pokemon = args[0] as Pokemon;
    if (this.sourceId === pokemon.id || (this.side === ArenaTagSide.PLAYER) !== pokemon.isPlayer())
      return false;

    return this.activateTrap(pokemon);
  }

  activateTrap(pokemon: Pokemon): boolean {
    return false;
  }

  getMatchupScoreMultiplier(pokemon: Pokemon): number {
    return pokemon.isGrounded() ? 1 : Phaser.Math.Linear(0, 1 / Math.pow(2, this.layers), Math.min(pokemon.getHpRatio(), 0.5) * 2);
  }
}

class SpikesTag extends ArenaTrapTag {
  constructor(sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.SPIKES, Moves.SPIKES, sourceId, side, 3);
  }

  onAdd(arena: Arena): void {
    super.onAdd(arena);

    const source = arena.scene.getPokemonById(this.sourceId);
    arena.scene.queueMessage(`${this.getMoveName()} 四处散落\n${source.getOpponentDescriptor()} 的脚边！`);
  }

  activateTrap(pokemon: Pokemon): boolean {
    if (pokemon.isGrounded()) {
      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(BlockNonDirectDamageAbAttr, pokemon, cancelled);

      if (!cancelled.value) {
        const damageHpRatio = 1 / (10 - 2 * this.layers);
        const damage = Math.ceil(pokemon.getMaxHp() * damageHpRatio);

        pokemon.scene.queueMessage(getPokemonMessage(pokemon, '被尖刺\\n刺伤了！'));
        pokemon.damageAndUpdate(damage, HitResult.OTHER);
        if (pokemon.turnData) pokemon.turnData.damageTaken += damage;
        return true;
      }
    }

    return false;
  }
}

class ToxicSpikesTag extends ArenaTrapTag {
  private neutralized: boolean;

  constructor(sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.TOXIC_SPIKES, Moves.TOXIC_SPIKES, sourceId, side, 2);
    this.neutralized = false;
  }

  onAdd(arena: Arena): void {
    super.onAdd(arena);
    
    const source = arena.scene.getPokemonById(this.sourceId);
    arena.scene.queueMessage(`${this.getMoveName()} 四处散落\n${source.getOpponentDescriptor()} 的脚边！`);
  }

  onRemove(arena: Arena): void {
    if (!this.neutralized)
      super.onRemove(arena);
  }

  activateTrap(pokemon: Pokemon): boolean {
    if (pokemon.isGrounded()) {
      if (pokemon.isOfType(Type.POISON)) {
        this.neutralized = true;
        if (pokemon.scene.arena.removeTag(this.tagType)) {
          pokemon.scene.queueMessage(getPokemonMessage(pokemon, ` 吸收了 ${this.getMoveName()}！`));
          return true;
        }
      } else if (!pokemon.status) {
        const toxic = this.layers > 1;
        if (pokemon.trySetStatus(!toxic ? StatusEffect.POISON : StatusEffect.TOXIC, true, null, 0, `the ${this.getMoveName()}`))
          return true;      
      }
    }

    return false;
  }

  getMatchupScoreMultiplier(pokemon: Pokemon): number {
    if (pokemon.isGrounded() || !pokemon.canSetStatus(StatusEffect.POISON, true))
      return 1;
    if (pokemon.isOfType(Type.POISON))
      return 1.25;
    return super.getMatchupScoreMultiplier(pokemon);
  }
}

class DelayedAttackTag extends ArenaTag {
  public targetIndex: BattlerIndex;

  constructor(tagType: ArenaTagType, sourceMove: Moves, sourceId: integer, targetIndex: BattlerIndex) {
    super(tagType, 3, sourceMove, sourceId);

    this.targetIndex = targetIndex;
  }

  lapse(arena: Arena): boolean {
    const ret = super.lapse(arena);

    if (!ret)
      arena.scene.unshiftPhase(new MoveEffectPhase(arena.scene, this.sourceId, [ this.targetIndex ], new PokemonMove(this.sourceMove, 0, 0, true)));

    return ret;
  }

  onRemove(arena: Arena): void { }
}

class StealthRockTag extends ArenaTrapTag {
  constructor(sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.STEALTH_ROCK, Moves.STEALTH_ROCK, sourceId, side, 1);
  }

  onAdd(arena: Arena): void {
    super.onAdd(arena);

    const source = arena.scene.getPokemonById(this.sourceId);
    arena.scene.queueMessage(`尖锐的石头漂浮在空中\n${source.getOpponentDescriptor()} 的周围！`);
  }

  getDamageHpRatio(pokemon: Pokemon): number {
    const effectiveness = pokemon.getAttackTypeEffectiveness(Type.ROCK);

    let damageHpRatio: number;

    switch (effectiveness) {
      case 0:
        damageHpRatio = 0;
        break;
      case 0.25:
        damageHpRatio = 0.03125;
        break;
      case 0.5:
        damageHpRatio = 0.0625;
        break;
      case 1:
        damageHpRatio = 0.125;
        break;
      case 2:
        damageHpRatio = 0.25;
        break;
      case 4:
        damageHpRatio = 0.5;
        break;
    }

    return damageHpRatio;
  }

  activateTrap(pokemon: Pokemon): boolean {
    const cancelled = new Utils.BooleanHolder(false);
    applyAbAttrs(BlockNonDirectDamageAbAttr,  pokemon, cancelled);

    if (cancelled.value)
      return false;
    
    const damageHpRatio = this.getDamageHpRatio(pokemon);

    if (damageHpRatio) {
      const damage = Math.ceil(pokemon.getMaxHp() * damageHpRatio);
      pokemon.scene.queueMessage(`尖锐的石头刺入了\n${pokemon.name}！`);
      pokemon.damageAndUpdate(damage, HitResult.OTHER);
      if (pokemon.turnData) pokemon.turnData.damageTaken += damage;
    }

    return false;
  }

  getMatchupScoreMultiplier(pokemon: Pokemon): number {
    const damageHpRatio = this.getDamageHpRatio(pokemon);
    return Phaser.Math.Linear(super.getMatchupScoreMultiplier(pokemon), 1, 1 - Math.pow(damageHpRatio, damageHpRatio));
  }
}

class StickyWebTag extends ArenaTrapTag {
  constructor(sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.STICKY_WEB, Moves.STICKY_WEB, sourceId, side, 1);
  }

  onAdd(arena: Arena): void {
    super.onAdd(arena);
    
    const source = arena.scene.getPokemonById(this.sourceId);
    arena.scene.queueMessage(`${this.getMoveName()} 已布置在地面上，包围了对方队伍！`);
  }

  activateTrap(pokemon: Pokemon): boolean {
    if (pokemon.isGrounded()) {
      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(ProtectStatAbAttr, pokemon, cancelled);
      if (!cancelled.value) {
        pokemon.scene.queueMessage(`对方的 ${pokemon.name} 被黏糊糊的网困住了！`);
        const statLevels = new Utils.NumberHolder(-1);
        pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, pokemon.getBattlerIndex(), false, [BattleStat.SPD], statLevels.value));
      }
    }

    return false;
  }

}

export class TrickRoomTag extends ArenaTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(ArenaTagType.TRICK_ROOM, turnCount, Moves.TRICK_ROOM, sourceId);
  }

  apply(arena: Arena, args: any[]): boolean {
    const speedReversed = args[0] as Utils.BooleanHolder;
    speedReversed.value = !speedReversed.value;
    return true;
  }

  onAdd(arena: Arena): void {
    arena.scene.queueMessage(getPokemonMessage(arena.scene.getPokemonById(this.sourceId), ' 扭曲了\n维度！'));
  }

  onRemove(arena: Arena): void {
    arena.scene.queueMessage('扭曲的维度恢复了正常！');
  }
}

export class GravityTag extends ArenaTag {
  constructor(turnCount: integer) {
    super(ArenaTagType.GRAVITY, turnCount, Moves.GRAVITY);
  }

  onAdd(arena: Arena): void {
    arena.scene.queueMessage('重力增强了！');
  }

  onRemove(arena: Arena): void {
    arena.scene.queueMessage('重力恢复了正常！');
  }
}

class TailwindTag extends ArenaTag {
  constructor(turnCount: integer, sourceId: integer, side: ArenaTagSide) {
    super(ArenaTagType.TAILWIND, turnCount, Moves.TAILWIND, sourceId, side);
  }

  onAdd(arena: Arena): void {
    arena.scene.queueMessage(`顺风从${this.side === ArenaTagSide.PLAYER ? '\n你' : this.side === ArenaTagSide.ENEMY ? '\n对方' : ''}队伍的背后吹来！`);
  }

  onRemove(arena: Arena): void {
    arena.scene.queueMessage(`${this.side === ArenaTagSide.PLAYER ? '你' : this.side === ArenaTagSide.ENEMY ? '对方' : ''}队伍的顺风消失了！`);
  }
}

export function getArenaTag(tagType: ArenaTagType, turnCount: integer, sourceMove: Moves, sourceId: integer, targetIndex?: BattlerIndex, side: ArenaTagSide = ArenaTagSide.BOTH): ArenaTag {
  switch (tagType) {
    case ArenaTagType.MIST:
      return new MistTag(turnCount, sourceId, side);
    case ArenaTagType.MUD_SPORT:
      return new MudSportTag(turnCount, sourceId);
    case ArenaTagType.WATER_SPORT:
      return new WaterSportTag(turnCount, sourceId);
    case ArenaTagType.SPIKES:
      return new SpikesTag(sourceId, side);
    case ArenaTagType.TOXIC_SPIKES:
      return new ToxicSpikesTag(sourceId, side);
    case ArenaTagType.FUTURE_SIGHT:
    case ArenaTagType.DOOM_DESIRE:
      return new DelayedAttackTag(tagType, sourceMove, sourceId, targetIndex);
    case ArenaTagType.WISH:
      return new WishTag(turnCount, sourceId, side);
    case ArenaTagType.STEALTH_ROCK:
      return new StealthRockTag(sourceId, side);
    case ArenaTagType.STICKY_WEB:
      return new StickyWebTag(sourceId, side);
    case ArenaTagType.TRICK_ROOM:
      return new TrickRoomTag(turnCount, sourceId);
    case ArenaTagType.GRAVITY:
      return new GravityTag(turnCount);
    case ArenaTagType.REFLECT:
      return new ReflectTag(turnCount, sourceId, side);
    case ArenaTagType.LIGHT_SCREEN:
      return new LightScreenTag(turnCount, sourceId, side);
    case ArenaTagType.AURORA_VEIL:
      return new AuroraVeilTag(turnCount, sourceId, side);
    case ArenaTagType.TAILWIND:
      return new TailwindTag(turnCount, sourceId, side);
  }
}
