import { CommonAnim, CommonBattleAnim } from "./battle-anims";
import { CommonAnimPhase, MoveEffectPhase, MovePhase, PokemonHealPhase, ShowAbilityPhase, StatChangePhase } from "../phases";
import { getPokemonMessage, getPokemonPrefix } from "../messages";
import Pokemon, { MoveResult, HitResult } from "../field/pokemon";
import { Stat, getStatName } from "./pokemon-stat";
import { StatusEffect } from "./status-effect";
import * as Utils from "../utils";
import { Moves } from "./enums/moves";
import { ChargeAttr, MoveFlags, allMoves } from "./move";
import { Type } from "./type";
import { BlockNonDirectDamageAbAttr, FlinchEffectAbAttr, ReverseDrainAbAttr, applyAbAttrs } from "./ability";
import { Abilities } from "./enums/abilities";
import { BattlerTagType } from "./enums/battler-tag-type";
import { TerrainType } from "./terrain";
import { WeatherType } from "./weather";
import { BattleStat } from "./battle-stat";
import { allAbilities } from "./ability";

export enum BattlerTagLapseType {
  FAINT,
  MOVE,
  PRE_MOVE,
  AFTER_MOVE,
  MOVE_EFFECT,
  TURN_END,
  CUSTOM
}

export class BattlerTag {
  public tagType: BattlerTagType;
  public lapseType: BattlerTagLapseType;
  public turnCount: integer;
  public sourceMove: Moves;
  public sourceId?: integer;

  constructor(tagType: BattlerTagType, lapseType: BattlerTagLapseType, turnCount: integer, sourceMove: Moves, sourceId?: integer) {
    this.tagType = tagType;
    this.lapseType = lapseType;
    this.turnCount = turnCount;
    this.sourceMove = sourceMove;
    this.sourceId = sourceId;
  }

  canAdd(pokemon: Pokemon): boolean {
    return true;
  }

  onAdd(pokemon: Pokemon): void { }

  onRemove(pokemon: Pokemon): void { }

  onOverlap(pokemon: Pokemon): void { }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    return --this.turnCount > 0;
  }

  getDescriptor(): string {
    return '';
  }

  isSourceLinked(): boolean {
    return false;
  }

  getMoveName(): string {
    return this.sourceMove
      ? allMoves[this.sourceMove].name
      : null;
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * This is meant to be inherited from by any battler tag with custom attributes
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    this.turnCount = source.turnCount;
    this.sourceMove = source.sourceMove;
    this.sourceId = source.sourceId;
  }
}

export interface WeatherBattlerTag {
  weatherTypes: WeatherType[];
}

export interface TerrainBattlerTag {
  terrainTypes: TerrainType[];
}

export class RechargingTag extends BattlerTag {
  constructor(sourceMove: Moves) {
    super(BattlerTagType.RECHARGING, BattlerTagLapseType.PRE_MOVE, 1, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.getMoveQueue().push({ move: Moves.NONE, targets: [] })
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    super.lapse(pokemon, lapseType);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '必须充电！'));
    (pokemon.scene.getCurrentPhase() as MovePhase).cancel();
    pokemon.getMoveQueue().shift();
    
    return true;
  }
}

export class TrappedTag extends BattlerTag {
  constructor(tagType: BattlerTagType, lapseType: BattlerTagLapseType, turnCount: integer, sourceMove: Moves, sourceId: integer) {
    super(tagType, lapseType, turnCount, sourceMove, sourceId);
  }
  
  canAdd(pokemon: Pokemon): boolean {
    const isGhost = pokemon.isOfType(Type.GHOST);
    const isTrapped = pokemon.getTag(BattlerTagType.TRAPPED);

    return !isTrapped && !isGhost;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(this.getTrapMessage(pokemon));
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, `从${this.getMoveName()}中解放了！`));
  }

  getDescriptor(): string {
    return 'trapping';
  }

  isSourceLinked(): boolean {
    return true;
  }

  getTrapMessage(pokemon: Pokemon): string {
    return getPokemonMessage(pokemon, '无法逃脱了！');
  }
}

export class FlinchedTag extends BattlerTag {
  constructor(sourceMove: Moves) {
    super(BattlerTagType.FLINCHED, BattlerTagLapseType.PRE_MOVE, 0, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    applyAbAttrs(FlinchEffectAbAttr, pokemon, null);
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isMax();
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    super.lapse(pokemon, lapseType);

    (pokemon.scene.getCurrentPhase() as MovePhase).cancel();
    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '畏缩了！'));

    return true;
  }

  getDescriptor(): string {
    return 'flinching';
  }
}

export class InterruptedTag extends BattlerTag {
  constructor(sourceMove: Moves){
    super(BattlerTagType.INTERRUPTED, BattlerTagLapseType.PRE_MOVE, 0, sourceMove)
  }

  canAdd(pokemon: Pokemon): boolean {
    return !!pokemon.getTag(BattlerTagType.FLYING)
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.getMoveQueue().shift()
    pokemon.pushMoveHistory({move: Moves.NONE, result: MoveResult.OTHER})
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    super.lapse(pokemon, lapseType);
    (pokemon.scene.getCurrentPhase() as MovePhase).cancel();
    return true 
  }
}

export class ConfusedTag extends BattlerTag {
  constructor(turnCount: integer, sourceMove: Moves) {
    super(BattlerTagType.CONFUSED, BattlerTagLapseType.MOVE, turnCount, sourceMove);
  }

  canAdd(pokemon: Pokemon): boolean {
    return pokemon.scene.arena.terrain?.terrainType !== TerrainType.MISTY || !pokemon.isGrounded();
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    
    pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), undefined, CommonAnim.CONFUSION));
    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '陷入了混乱！'));
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
    
    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '从混乱中清醒了过来！'));
  }

  onOverlap(pokemon: Pokemon): void {
    super.onOverlap(pokemon);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '已经处于混乱状态！'));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM && super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.queueMessage(getPokemonMessage(pokemon, '陷入了混乱！'));
      pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), undefined, CommonAnim.CONFUSION));

      if (pokemon.randSeedInt(3)) {
        const atk = pokemon.getBattleStat(Stat.ATK);
        const def = pokemon.getBattleStat(Stat.DEF);
        const damage = Math.ceil(((((2 * pokemon.level / 5 + 2) * 40 * atk / def) / 50) + 2) * (pokemon.randSeedInt(15, 85) / 100));
        pokemon.scene.queueMessage('它在混乱中伤害了自己！');
        pokemon.damageAndUpdate(damage);
        pokemon.battleData.hitCount++;
        (pokemon.scene.getCurrentPhase() as MovePhase).cancel();
      }
    }
    
    return ret;
  }

  getDescriptor(): string {
    return 'confusion';
  }
}

export class InfatuatedTag extends BattlerTag {
  constructor(sourceMove: integer, sourceId: integer) {
    super(BattlerTagType.INFATUATED, BattlerTagLapseType.MOVE, 1, sourceMove, sourceId);
  }

  canAdd(pokemon: Pokemon): boolean {
    return pokemon.isOppositeGender(pokemon.scene.getPokemonById(this.sourceId));
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    
    pokemon.scene.queueMessage(getPokemonMessage(pokemon, `爱上了${pokemon.scene.getPokemonById(this.sourceId).name}！`));
  }

  onOverlap(pokemon: Pokemon): void {
    super.onOverlap(pokemon);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '已经坠入爱河！'));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.queueMessage(getPokemonMessage(pokemon, `爱上了${pokemon.scene.getPokemonById(this.sourceId).name}！`));
      pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), undefined, CommonAnim.ATTRACT));

      if (pokemon.randSeedInt(2)) {
        pokemon.scene.queueMessage(getPokemonMessage(pokemon, '因爱而无法动弹！'));
        (pokemon.scene.getCurrentPhase() as MovePhase).cancel();
      }
    }
    
    return ret;
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '从迷恋中清醒了过来。'));
  }

  isSourceLinked(): boolean {
    return true;
  }

  getDescriptor(): string {
    return 'infatuation';
  }
}

export class SeedTag extends BattlerTag {
  private sourceIndex: integer;

  constructor(sourceId: integer) {
    super(BattlerTagType.SEEDED, BattlerTagLapseType.TURN_END, 1, Moves.LEECH_SEED, sourceId);
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.sourceIndex = source.sourceIndex;
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isOfType(Type.GRASS);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    
    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '被播种了！'));
    this.sourceIndex = pokemon.scene.getPokemonById(this.sourceId).getBattlerIndex();
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      const source = pokemon.getOpponents().find(o => o.getBattlerIndex() === this.sourceIndex);
      if (source) {
        const cancelled = new Utils.BooleanHolder(false);
        applyAbAttrs(BlockNonDirectDamageAbAttr, pokemon, cancelled);

        if (!cancelled.value) {
          pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, source.getBattlerIndex(), pokemon.getBattlerIndex(), CommonAnim.LEECH_SEED));

          const damage = pokemon.damageAndUpdate(Math.max(Math.floor(pokemon.getMaxHp() / 8), 1));
          const reverseDrain = pokemon.hasAbilityWithAttr(ReverseDrainAbAttr);
          pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, source.getBattlerIndex(),
            !reverseDrain ? damage : damage * -1,
            !reverseDrain ? getPokemonMessage(pokemon, '被寄生种子吸取了体力！') : getPokemonMessage(source, '的寄生种子吸收了液体毒素！'),
            false, true));
        }
      }
    }
    
    return ret;
  }

  getDescriptor(): string {
    return 'seeding';
  }
}

export class NightmareTag extends BattlerTag {
  constructor() {
    super(BattlerTagType.NIGHTMARE, BattlerTagLapseType.AFTER_MOVE, 1, Moves.NIGHTMARE);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    
    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '陷入了噩梦！'));
  }

  onOverlap(pokemon: Pokemon): void {
    super.onOverlap(pokemon);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '已经深陷噩梦！'));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.queueMessage(getPokemonMessage(pokemon, '深陷噩梦！'));
      pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), undefined, CommonAnim.CURSE)); // TODO: Update animation type

      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(BlockNonDirectDamageAbAttr, pokemon, cancelled);

      if (!cancelled.value)
        pokemon.damageAndUpdate(Math.ceil(pokemon.getMaxHp() / 4));
    }
    
    return ret;
  }

  getDescriptor(): string {
    return 'nightmares';
  }
}

export class FrenzyTag extends BattlerTag {
  constructor(sourceMove: Moves, sourceId: integer) {
    super(BattlerTagType.FRENZY, BattlerTagLapseType.CUSTOM, 1, sourceMove, sourceId);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.addTag(BattlerTagType.CONFUSED, pokemon.randSeedIntRange(2, 4));
  }
}

export class ChargingTag extends BattlerTag {
  constructor(sourceMove: Moves, sourceId: integer) {
    super(BattlerTagType.CHARGING, BattlerTagLapseType.CUSTOM, 1, sourceMove, sourceId);
  }
}

export class EncoreTag extends BattlerTag {
  public moveId: Moves;

  constructor(sourceId: integer) {
    super(BattlerTagType.ENCORE, BattlerTagLapseType.AFTER_MOVE, 3, Moves.ENCORE, sourceId);
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.moveId = source.moveId as Moves;
  }

  canAdd(pokemon: Pokemon): boolean {
    if (pokemon.isMax())
      return false;
    
    const lastMoves = pokemon.getLastXMoves(1);
    if (!lastMoves.length)
      return false;
  
    const repeatableMove = lastMoves[0];

    if (!repeatableMove.move || repeatableMove.virtual)
      return false;

    switch (repeatableMove.move) {
      case Moves.MIMIC:
      case Moves.MIRROR_MOVE:
      case Moves.TRANSFORM:
      case Moves.STRUGGLE:
      case Moves.SKETCH:
      case Moves.SLEEP_TALK:
      case Moves.ENCORE:
        return false;
    }
  
    if (allMoves[repeatableMove.move].getAttrs(ChargeAttr).length && repeatableMove.result === MoveResult.OTHER)
      return false;

    this.moveId = repeatableMove.move;

    return true;
  }

  onAdd(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '的“再来一次”发动！'));

    const movePhase = pokemon.scene.findPhase(m => m instanceof MovePhase && m.pokemon === pokemon);
    if (movePhase) {
      const movesetMove = pokemon.getMoveset().find(m => m.moveId === this.moveId);
      if (movesetMove) {
        const lastMove = pokemon.getLastXMoves(1)[0];
        pokemon.scene.tryReplacePhase((m => m instanceof MovePhase && m.pokemon === pokemon),
          new MovePhase(pokemon.scene, pokemon, lastMove.targets, movesetMove));
      }
    }
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '的“再来一次”\n结束了！'));
  }
}

export class HelpingHandTag extends BattlerTag {
  constructor(sourceId: integer) {
    super(BattlerTagType.HELPING_HAND, BattlerTagLapseType.TURN_END, 1, Moves.HELPING_HAND, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    pokemon.scene.queueMessage(getPokemonMessage(pokemon.scene.getPokemonById(this.sourceId), `准备帮助${pokemon.name}！`));
  }
}

/**
 * Applies the Ingrain tag to a pokemon
 * @extends TrappedTag
 */
export class IngrainTag extends TrappedTag {
  constructor(sourceId: integer) {
    super(BattlerTagType.INGRAIN, BattlerTagLapseType.TURN_END, 1, Moves.INGRAIN, sourceId);
  }

  /**
   * Check if the Ingrain tag can be added to the pokemon
   * @param pokemon {@linkcode Pokemon} The pokemon to check if the tag can be added to
   * @returns boolean True if the tag can be added, false otherwise
   */
  canAdd(pokemon: Pokemon): boolean {
    const isTrapped = pokemon.getTag(BattlerTagType.TRAPPED);

    return !isTrapped;
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret)
      pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(), Math.floor(pokemon.getMaxHp() / 16),
        getPokemonMessage(pokemon, `用根\n吸收了养分！`), true));
    
    return ret;
  }

  getTrapMessage(pokemon: Pokemon): string {
    return getPokemonMessage(pokemon, '扎根！');
  }

  getDescriptor(): string {
    return 'roots';
  }
}

export class AquaRingTag extends BattlerTag {
  constructor() {
    super(BattlerTagType.AQUA_RING, BattlerTagLapseType.TURN_END, 1, Moves.AQUA_RING, undefined);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    
    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '用水幕\n包围了自己！'));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret)
      pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(),
        Math.floor(pokemon.getMaxHp() / 16), `${this.getMoveName()}恢复了\n${pokemon.name}的HP！`, true));
    
    return ret;
  }
}

/** Tag used to allow moves that interact with {@link Moves.MINIMIZE} to function */
export class MinimizeTag extends BattlerTag {
  constructor() {
    super(BattlerTagType.MINIMIZED, BattlerTagLapseType.TURN_END, 1, Moves.MINIMIZE, undefined);
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isMax();
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    //If a pokemon dynamaxes they lose minimized status
    if(pokemon.isMax()){
      return false
    }
    return lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
  }
}

export class DrowsyTag extends BattlerTag {
  constructor() {
    super(BattlerTagType.DROWSY, BattlerTagLapseType.TURN_END, 2, Moves.YAWN);
  }

  canAdd(pokemon: Pokemon): boolean {
    return pokemon.scene.arena.terrain?.terrainType !== TerrainType.ELECTRIC || !pokemon.isGrounded();
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '开始昏昏欲睡！'));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (!super.lapse(pokemon, lapseType)) {
      pokemon.trySetStatus(StatusEffect.SLEEP, true);
      return false;
    }

    return true;
  }

  getDescriptor(): string {
    return 'drowsiness';
  }
}

export abstract class DamagingTrapTag extends TrappedTag {
  private commonAnim: CommonAnim;

  constructor(tagType: BattlerTagType, commonAnim: CommonAnim, turnCount: integer, sourceMove: Moves, sourceId: integer) {
    super(tagType, BattlerTagLapseType.TURN_END, turnCount, sourceMove, sourceId);

    this.commonAnim = commonAnim;
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.commonAnim = source.commonAnim as CommonAnim;
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isOfType(Type.GHOST) && !pokemon.findTag(t => t instanceof DamagingTrapTag);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.queueMessage(getPokemonMessage(pokemon, `被\n${this.getMoveName()}击中了！`));
      pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), undefined, this.commonAnim));

      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(BlockNonDirectDamageAbAttr, pokemon, cancelled);

      if (!cancelled.value)
        pokemon.damageAndUpdate(Math.ceil(pokemon.getMaxHp() / 8))
    }

    return ret;
  }
}

export class BindTag extends DamagingTrapTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(BattlerTagType.BIND, CommonAnim.BIND, turnCount, Moves.BIND, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return getPokemonMessage(pokemon, `被${pokemon.scene.getPokemonById(this.sourceId).name}的${this.getMoveName()}挤压！`);
  }
}

export class WrapTag extends DamagingTrapTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(BattlerTagType.WRAP, CommonAnim.WRAP, turnCount, Moves.WRAP, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return getPokemonMessage(pokemon, `被${pokemon.scene.getPokemonById(this.sourceId).name}的捆绑捆住了！`);
  }
}

export abstract class VortexTrapTag extends DamagingTrapTag {
  constructor(tagType: BattlerTagType, commonAnim: CommonAnim, turnCount: integer, sourceMove: Moves, sourceId: integer) {
    super(tagType, commonAnim, turnCount, sourceMove, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return getPokemonMessage(pokemon, '被困在\n漩涡里了！');
  }
}

export class FireSpinTag extends VortexTrapTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(BattlerTagType.FIRE_SPIN, CommonAnim.FIRE_SPIN, turnCount, Moves.FIRE_SPIN, sourceId);
  }
}

export class WhirlpoolTag extends VortexTrapTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(BattlerTagType.WHIRLPOOL, CommonAnim.WHIRLPOOL, turnCount, Moves.WHIRLPOOL, sourceId);
  }
}

export class ClampTag extends DamagingTrapTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(BattlerTagType.CLAMP, CommonAnim.CLAMP, turnCount, Moves.CLAMP, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return getPokemonMessage(pokemon.scene.getPokemonById(this.sourceId), `紧紧地缠住了${pokemon.name}！`);
  }
}

export class SandTombTag extends DamagingTrapTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(BattlerTagType.SAND_TOMB, CommonAnim.SAND_TOMB, turnCount, Moves.SAND_TOMB, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return getPokemonMessage(pokemon, `被${this.getMoveName()}困住了！`);
  }
}

export class MagmaStormTag extends DamagingTrapTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(BattlerTagType.MAGMA_STORM, CommonAnim.MAGMA_STORM, turnCount, Moves.MAGMA_STORM, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return getPokemonMessage(pokemon, `被滚烫的岩浆困住了！`);
  }
}

export class SnapTrapTag extends DamagingTrapTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(BattlerTagType.SNAP_TRAP, CommonAnim.SNAP_TRAP, turnCount, Moves.SNAP_TRAP, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return getPokemonMessage(pokemon, `被捕兽夹夹住了！`);
  }
}

export class ThunderCageTag extends DamagingTrapTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(BattlerTagType.THUNDER_CAGE, CommonAnim.THUNDER_CAGE, turnCount, Moves.THUNDER_CAGE, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return getPokemonMessage(pokemon.scene.getPokemonById(this.sourceId), `困住了${getPokemonPrefix(pokemon).toLowerCase()}${pokemon.name}！`);
  }
}

export class InfestationTag extends DamagingTrapTag {
  constructor(turnCount: integer, sourceId: integer) {
    super(BattlerTagType.INFESTATION, CommonAnim.INFESTATION, turnCount, Moves.INFESTATION, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return getPokemonMessage(pokemon, `被${getPokemonPrefix(pokemon.scene.getPokemonById(this.sourceId))}${pokemon.scene.getPokemonById(this.sourceId).name}寄生了！`);
  }
}


export class ProtectedTag extends BattlerTag {
  constructor(sourceMove: Moves, tagType: BattlerTagType = BattlerTagType.PROTECTED) {
    super(tagType, BattlerTagLapseType.CUSTOM, 0, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '\n保护了自己！'));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.CUSTOM) {
      new CommonBattleAnim(CommonAnim.PROTECT, pokemon).play(pokemon.scene);
      pokemon.scene.queueMessage(getPokemonMessage(pokemon, '\n保护了自己！'));
      return true;
    }

    return super.lapse(pokemon, lapseType);
  }
}

export class ContactDamageProtectedTag extends ProtectedTag {
  private damageRatio: integer;

  constructor(sourceMove: Moves, damageRatio: integer) {
    super(sourceMove, BattlerTagType.SPIKY_SHIELD);

    this.damageRatio = damageRatio;
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.damageRatio = source.damageRatio;
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (lapseType === BattlerTagLapseType.CUSTOM) {
      const effectPhase = pokemon.scene.getCurrentPhase();
      if (effectPhase instanceof MoveEffectPhase && effectPhase.move.getMove().hasFlag(MoveFlags.MAKES_CONTACT)) {
        const attacker = effectPhase.getPokemon();
        attacker.damageAndUpdate(Math.ceil(attacker.getMaxHp() * (1 / this.damageRatio)), HitResult.OTHER);
      }
    }

    return ret;
  }
}

export class ContactStatChangeProtectedTag extends ProtectedTag {
  private stat: BattleStat;
  private levels: integer;

  constructor(sourceMove: Moves, tagType: BattlerTagType, stat: BattleStat, levels: integer) {
    super(sourceMove, tagType);

    this.stat = stat;
    this.levels = levels;
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.stat = source.stat as BattleStat;
    this.levels = source.levels;
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (lapseType === BattlerTagLapseType.CUSTOM) {
      const effectPhase = pokemon.scene.getCurrentPhase();
      if (effectPhase instanceof MoveEffectPhase && effectPhase.move.getMove().hasFlag(MoveFlags.MAKES_CONTACT)) {
        const attacker = effectPhase.getPokemon();
        pokemon.scene.unshiftPhase(new StatChangePhase(pokemon.scene, attacker.getBattlerIndex(), true, [ this.stat ], this.levels));
      }
    }

    return ret;
  }
}

export class ContactPoisonProtectedTag extends ProtectedTag {
  constructor(sourceMove: Moves) {
    super(sourceMove, BattlerTagType.BANEFUL_BUNKER);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (lapseType === BattlerTagLapseType.CUSTOM) {
      const effectPhase = pokemon.scene.getCurrentPhase();
      if (effectPhase instanceof MoveEffectPhase && effectPhase.move.getMove().hasFlag(MoveFlags.MAKES_CONTACT)) {
        const attacker = effectPhase.getPokemon();
        attacker.trySetStatus(StatusEffect.POISON, true, pokemon);
      }
    }

    return ret;
  }
}

export class ContactBurnProtectedTag extends ProtectedTag {
  constructor(sourceMove: Moves) {
    super(sourceMove, BattlerTagType.BURNING_BULWARK);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (lapseType === BattlerTagLapseType.CUSTOM) {
      const effectPhase = pokemon.scene.getCurrentPhase();
      if (effectPhase instanceof MoveEffectPhase && effectPhase.move.getMove().hasFlag(MoveFlags.MAKES_CONTACT)) {
        const attacker = effectPhase.getPokemon();
        attacker.trySetStatus(StatusEffect.BURN, true);
      }
    }

    return ret;
  }
}

export class EnduringTag extends BattlerTag {
  constructor(sourceMove: Moves) {
    super(BattlerTagType.ENDURING, BattlerTagLapseType.TURN_END, 0, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '摆出了架势！'));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.CUSTOM) {
      pokemon.scene.queueMessage(getPokemonMessage(pokemon, '承受住了攻击！'));
      return true;
    }

    return super.lapse(pokemon, lapseType);
  }
}

export class SturdyTag extends BattlerTag {
  constructor(sourceMove: Moves) {
    super(BattlerTagType.STURDY, BattlerTagLapseType.TURN_END, 0, sourceMove);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.CUSTOM) {
      pokemon.scene.queueMessage(getPokemonMessage(pokemon, '承受住了攻击！'));
      return true;
    }

    return super.lapse(pokemon, lapseType);
  }
}

export class PerishSongTag extends BattlerTag {
  constructor(turnCount: integer) {
    super(BattlerTagType.PERISH_SONG, BattlerTagLapseType.TURN_END, turnCount, Moves.PERISH_SONG);
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isBossImmune();
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (ret)
      pokemon.scene.queueMessage(getPokemonMessage(pokemon, `的灭亡倒计时来到了 ${this.turnCount} 回合。`));
    else
      pokemon.damageAndUpdate(pokemon.hp, HitResult.ONE_HIT_KO, false, true, true);

    return ret;
  }
}

export class AbilityBattlerTag extends BattlerTag {
  public ability: Abilities;

  constructor(tagType: BattlerTagType, ability: Abilities, lapseType: BattlerTagLapseType, turnCount: integer) {
    super(tagType, lapseType, turnCount, undefined);

    this.ability = ability;
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.ability = source.ability as Abilities;
  }
}

export class TruantTag extends AbilityBattlerTag {
  constructor() {
    super(BattlerTagType.TRUANT, Abilities.TRUANT, BattlerTagLapseType.MOVE, 1);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (!pokemon.hasAbility(Abilities.TRUANT))
      return super.lapse(pokemon, lapseType);
    const passive = pokemon.getAbility().id !== Abilities.TRUANT;

    const lastMove = pokemon.getLastXMoves().find(() => true);

    if (lastMove && lastMove.move !== Moves.NONE) {
      (pokemon.scene.getCurrentPhase() as MovePhase).cancel();
      pokemon.scene.unshiftPhase(new ShowAbilityPhase(pokemon.scene, pokemon.id, passive));
      pokemon.scene.queueMessage(getPokemonMessage(pokemon, '在偷懒！'));
    }

    return true;
  }
}

export class SlowStartTag extends AbilityBattlerTag {
  constructor() {
    super(BattlerTagType.SLOW_START, Abilities.SLOW_START, BattlerTagLapseType.TURN_END, 5);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    
    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '提不起劲！'), null, false, null, true);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (!pokemon.hasAbility(this.ability))
      this.turnCount = 1;

    return super.lapse(pokemon, lapseType);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '终于振作起来了！'), null, false, null);
  }
}

export class HighestStatBoostTag extends AbilityBattlerTag {
  public stat: Stat;
  public multiplier: number;

  constructor(tagType: BattlerTagType, ability: Abilities) {
    super(tagType, ability, BattlerTagLapseType.CUSTOM, 1);
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.stat = source.stat as Stat;
    this.multiplier = source.multiplier;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    const stats = [ Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD ];
    let highestStat: Stat;
    stats.map(s => pokemon.getBattleStat(s)).reduce((highestValue: integer, value: integer, i: integer) => {
      if (value > highestValue) {
        highestStat = stats[i];
        return value;
      }
      return highestValue;
    }, 0);

    this.stat = highestStat;

    switch (this.stat) {
      case Stat.SPD:
        this.multiplier = 1.5;
        break;
      default:
        this.multiplier = 1.3;
        break;
    }
    
    pokemon.scene.queueMessage(getPokemonMessage(pokemon, `的 ${getStatName(highestStat)} 提高了！`), null, false, null, true);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(`${getPokemonMessage(pokemon, `的\n${allAbilities[this.ability].name}消失了！`)}`);
  }
}

export class WeatherHighestStatBoostTag extends HighestStatBoostTag implements WeatherBattlerTag {
  public weatherTypes: WeatherType[];

  constructor(tagType: BattlerTagType, ability: Abilities, ...weatherTypes: WeatherType[]) {
    super(tagType, ability);
    this.weatherTypes = weatherTypes;
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.weatherTypes = source.weatherTypes.map(w => w as WeatherType);
  }
}

export class TerrainHighestStatBoostTag extends HighestStatBoostTag implements TerrainBattlerTag {
  public terrainTypes: TerrainType[];

  constructor(tagType: BattlerTagType, ability: Abilities, ...terrainTypes: TerrainType[]) {
    super(tagType, ability);
    this.terrainTypes = terrainTypes;
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.terrainTypes = source.terrainTypes.map(w => w as TerrainType);
  }
}

export class HideSpriteTag extends BattlerTag {
  constructor(tagType: BattlerTagType, turnCount: integer, sourceMove: Moves) {
    super(tagType, BattlerTagLapseType.MOVE_EFFECT, turnCount, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    
    pokemon.setVisible(false);
  }

  onRemove(pokemon: Pokemon): void {
    // Wait 2 frames before setting visible for battle animations that don't immediately show the sprite invisible
    pokemon.scene.tweens.addCounter({
      duration: Utils.getFrameMs(2),
      onComplete: () => pokemon.setVisible(true)
    });
  }
}

export class TypeImmuneTag extends BattlerTag {
  public immuneType: Type;
  constructor(tagType: BattlerTagType, sourceMove: Moves, immuneType: Type, length: number) {
    super(tagType, BattlerTagLapseType.TURN_END, 1, sourceMove);
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.immuneType = source.immuneType as Type;
  }
}

export class MagnetRisenTag extends TypeImmuneTag {
  constructor(tagType: BattlerTagType, sourceMove: Moves) {
    super(tagType, sourceMove, Type.GROUND, 5);
  }
}

export class TypeBoostTag extends BattlerTag {
  public boostedType: Type;
  public boostValue: number;
  public oneUse: boolean;

  constructor(tagType: BattlerTagType, sourceMove: Moves, boostedType: Type, boostValue: number, oneUse: boolean) {
    super(tagType, BattlerTagLapseType.TURN_END, 1, sourceMove);

    this.boostedType = boostedType;
    this.boostValue = boostValue;
    this.oneUse = oneUse;
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.boostedType = source.boostedType as Type;
    this.boostValue = source.boostValue;
    this.oneUse = source.oneUse;
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    return lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
  }
}

export class CritBoostTag extends BattlerTag {
  constructor(tagType: BattlerTagType, sourceMove: Moves) {
    super(tagType, BattlerTagLapseType.TURN_END, 1, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '斗志昂扬!'));
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    return lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '放松下来。'));
  }
}

export class AlwaysCritTag extends BattlerTag {
  constructor(sourceMove: Moves) {
    super(BattlerTagType.ALWAYS_CRIT, BattlerTagLapseType.TURN_END, 2, sourceMove);
  }
}

export class IgnoreAccuracyTag extends BattlerTag {
  constructor(sourceMove: Moves) {
    super(BattlerTagType.IGNORE_ACCURACY, BattlerTagLapseType.TURN_END, 2, sourceMove);
  }
}

export class SaltCuredTag extends BattlerTag {
  private sourceIndex: integer;

  constructor(sourceId: integer) {
    super(BattlerTagType.SALT_CURED, BattlerTagLapseType.TURN_END, 1, Moves.SALT_CURE, sourceId);
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.sourceIndex = source.sourceIndex;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    
    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '被盐腌了！'));
    this.sourceIndex = pokemon.scene.getPokemonById(this.sourceId).getBattlerIndex();
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), pokemon.getBattlerIndex(), CommonAnim.SALT_CURE));

      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(BlockNonDirectDamageAbAttr, pokemon, cancelled);

      if (!cancelled.value) {
        const pokemonSteelOrWater = pokemon.isOfType(Type.STEEL) || pokemon.isOfType(Type.WATER);
        pokemon.damageAndUpdate(Math.max(Math.floor(pokemonSteelOrWater ? pokemon.getMaxHp() / 4 : pokemon.getMaxHp() / 8), 1));

        pokemon.scene.queueMessage(getPokemonMessage(pokemon, `被${this.getMoveName()}击中了！`));
      }
    }
    
    return ret;
  }
}

export class CursedTag extends BattlerTag {
  private sourceIndex: integer;

  constructor(sourceId: integer) {
    super(BattlerTagType.CURSED, BattlerTagLapseType.TURN_END, 1, Moves.CURSE, sourceId);
  }

  /**
  * When given a battler tag or json representing one, load the data for it.
  * @param {BattlerTag | any} source A battler tag
  */
  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.sourceIndex = source.sourceIndex;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    
    pokemon.scene.queueMessage(getPokemonMessage(pokemon, '被诅咒了！'));
    this.sourceIndex = pokemon.scene.getPokemonById(this.sourceId).getBattlerIndex();
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      pokemon.scene.unshiftPhase(new CommonAnimPhase(pokemon.scene, pokemon.getBattlerIndex(), pokemon.getBattlerIndex(), CommonAnim.SALT_CURE));

      const cancelled = new Utils.BooleanHolder(false);
      applyAbAttrs(BlockNonDirectDamageAbAttr, pokemon, cancelled);

      if (!cancelled.value) {
        pokemon.damageAndUpdate(Math.floor(pokemon.getMaxHp() / 4));
        pokemon.scene.queueMessage(getPokemonMessage(pokemon, `被${this.getMoveName()}击中了！`));
      }
    }
    
    return ret;
  }
}

export function getBattlerTag(tagType: BattlerTagType, turnCount: integer, sourceMove: Moves, sourceId: integer): BattlerTag {
  switch (tagType) {
    case BattlerTagType.RECHARGING:
      return new RechargingTag(sourceMove);
    case BattlerTagType.FLINCHED:
      return new FlinchedTag(sourceMove);
    case BattlerTagType.INTERRUPTED:
      return new InterruptedTag(sourceMove);
    case BattlerTagType.CONFUSED:
      return new ConfusedTag(turnCount, sourceMove);
    case BattlerTagType.INFATUATED:
      return new InfatuatedTag(sourceMove, sourceId);
    case BattlerTagType.SEEDED:
      return new SeedTag(sourceId);
    case BattlerTagType.NIGHTMARE:
      return new NightmareTag();
    case BattlerTagType.FRENZY:
      return new FrenzyTag(sourceMove, sourceId);
    case BattlerTagType.CHARGING:
      return new ChargingTag(sourceMove, sourceId);
    case BattlerTagType.ENCORE:
      return new EncoreTag(sourceId);
    case BattlerTagType.HELPING_HAND:
      return new HelpingHandTag(sourceId);
    case BattlerTagType.INGRAIN:
      return new IngrainTag(sourceId);
    case BattlerTagType.AQUA_RING:
      return new AquaRingTag();
    case BattlerTagType.DROWSY:
      return new DrowsyTag();
    case BattlerTagType.TRAPPED:
      return new TrappedTag(tagType, BattlerTagLapseType.CUSTOM, turnCount, sourceMove, sourceId);
    case BattlerTagType.BIND:
      return new BindTag(turnCount, sourceId);
    case BattlerTagType.WRAP:
      return new WrapTag(turnCount, sourceId);
    case BattlerTagType.FIRE_SPIN:
      return new FireSpinTag(turnCount, sourceId);
    case BattlerTagType.WHIRLPOOL:
      return new WhirlpoolTag(turnCount, sourceId);
    case BattlerTagType.CLAMP:
      return new ClampTag(turnCount, sourceId);
    case BattlerTagType.SAND_TOMB:
      return new SandTombTag(turnCount, sourceId);
    case BattlerTagType.MAGMA_STORM:
      return new MagmaStormTag(turnCount, sourceId);
    case BattlerTagType.SNAP_TRAP:
      return new SnapTrapTag(turnCount, sourceId);
    case BattlerTagType.THUNDER_CAGE:
      return new ThunderCageTag(turnCount, sourceId);
    case BattlerTagType.INFESTATION:
      return new InfestationTag(turnCount, sourceId);
    case BattlerTagType.PROTECTED:
      return new ProtectedTag(sourceMove);
    case BattlerTagType.SPIKY_SHIELD:
      return new ContactDamageProtectedTag(sourceMove, 8);
    case BattlerTagType.KINGS_SHIELD:
      return new ContactStatChangeProtectedTag(sourceMove, tagType, BattleStat.ATK, -1);
    case BattlerTagType.OBSTRUCT:
      return new ContactStatChangeProtectedTag(sourceMove, tagType, BattleStat.DEF, -2);
    case BattlerTagType.SILK_TRAP:
      return new ContactStatChangeProtectedTag(sourceMove, tagType, BattleStat.SPD, -1);
    case BattlerTagType.BANEFUL_BUNKER:
      return new ContactPoisonProtectedTag(sourceMove);
    case BattlerTagType.BURNING_BULWARK:
      return new ContactBurnProtectedTag(sourceMove);
    case BattlerTagType.ENDURING:
      return new EnduringTag(sourceMove);
    case BattlerTagType.STURDY:
      return new SturdyTag(sourceMove);
    case BattlerTagType.PERISH_SONG:
      return new PerishSongTag(turnCount);
    case BattlerTagType.TRUANT:
      return new TruantTag();
    case BattlerTagType.SLOW_START:
      return new SlowStartTag();
    case BattlerTagType.PROTOSYNTHESIS:
      return new WeatherHighestStatBoostTag(tagType, Abilities.PROTOSYNTHESIS, WeatherType.SUNNY, WeatherType.HARSH_SUN);
    case BattlerTagType.QUARK_DRIVE:
      return new TerrainHighestStatBoostTag(tagType, Abilities.QUARK_DRIVE, TerrainType.ELECTRIC);
    case BattlerTagType.FLYING:
    case BattlerTagType.UNDERGROUND:
    case BattlerTagType.UNDERWATER:
    case BattlerTagType.HIDDEN:
      return new HideSpriteTag(tagType, turnCount, sourceMove);
    case BattlerTagType.FIRE_BOOST:
      return new TypeBoostTag(tagType, sourceMove, Type.FIRE, 1.5, false);
    case BattlerTagType.CRIT_BOOST:
      return new CritBoostTag(tagType, sourceMove);
    case BattlerTagType.ALWAYS_CRIT:
      return new AlwaysCritTag(sourceMove);
    case BattlerTagType.NO_CRIT:
      return new BattlerTag(tagType, BattlerTagLapseType.AFTER_MOVE, turnCount, sourceMove);
    case BattlerTagType.IGNORE_ACCURACY:
      return new IgnoreAccuracyTag(sourceMove);
    case BattlerTagType.BYPASS_SLEEP:
      return new BattlerTag(BattlerTagType.BYPASS_SLEEP, BattlerTagLapseType.TURN_END, turnCount, sourceMove);
    case BattlerTagType.IGNORE_FLYING:
      return new BattlerTag(tagType, BattlerTagLapseType.TURN_END, turnCount, sourceMove);
    case BattlerTagType.GROUNDED:
      return new BattlerTag(tagType, BattlerTagLapseType.TURN_END, turnCount - 1, sourceMove);
    case BattlerTagType.SALT_CURED:
      return new SaltCuredTag(sourceId);
    case BattlerTagType.CURSED:
      return new CursedTag(sourceId);
    case BattlerTagType.CHARGED:
      return new TypeBoostTag(tagType, sourceMove, Type.ELECTRIC, 2, true);
    case BattlerTagType.MAGNET_RISEN:
      return new MagnetRisenTag(tagType, sourceMove);
    case BattlerTagType.MINIMIZED:
      return new MinimizeTag();
    case BattlerTagType.NONE:
    default:
        return new BattlerTag(tagType, BattlerTagLapseType.CUSTOM, turnCount, sourceMove, sourceId);
  }
}

/**
* When given a battler tag or json representing one, creates an actual BattlerTag object with the same data.
* @param {BattlerTag | any} source A battler tag
* @return {BattlerTag} The valid battler tag
*/
export function loadBattlerTag(source: BattlerTag | any): BattlerTag {
  const tag = getBattlerTag(source.tagType, source.turnCount, source.sourceMove, source.sourceId);
  tag.loadTag(source);
  return tag;
}

