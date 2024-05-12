import * as Utils from "../utils";

export enum StatusEffect {
  NONE,
  POISON,
  TOXIC,
  PARALYSIS,
  SLEEP,
  FREEZE,
  BURN,
  FAINT
}

export class Status {
  public effect: StatusEffect;
  public turnCount: integer;
  public cureTurn: integer;

  constructor(effect: StatusEffect, turnCount: integer = 0, cureTurn?: integer) {
    this.effect = effect;
    this.turnCount = turnCount === undefined ? 0 : turnCount;
    this.cureTurn = cureTurn;
  }

  incrementTurn(): void {
    this.turnCount++;
  }

  isPostTurn(): boolean {
    return this.effect === StatusEffect.POISON || this.effect === StatusEffect.TOXIC || this.effect === StatusEffect.BURN;
  }
}

export function getStatusEffectObtainText(statusEffect: StatusEffect, sourceText?: string): string {
  const sourceClause = sourceText ? ` ${statusEffect !== StatusEffect.SLEEP ? 'by' : 'from'} ${sourceText}` : '';
  switch (statusEffect) {
    case StatusEffect.POISON:
      return `\n中毒了${sourceClause}！`;
    case StatusEffect.TOXIC:
      return `\n中了剧毒${sourceClause}！`;
    case StatusEffect.PARALYSIS:
      return `陷入麻痹状态了${sourceClause}！\n它可能无法动弹！`;
    case StatusEffect.SLEEP:
      return `\n睡着了${sourceClause}！`;
    case StatusEffect.FREEZE:
      return `\n被冻住了${sourceClause}！`;
    case StatusEffect.BURN:
      return `\n被烧伤了${sourceClause}！`;
  }

  return '';
}

export function getStatusEffectActivationText(statusEffect: StatusEffect): string {
  switch (statusEffect) {
    case StatusEffect.POISON:
    case StatusEffect.TOXIC:
      return '中毒了！';
    case StatusEffect.PARALYSIS:
      return '麻痹了！\n它不能动了！';
    case StatusEffect.SLEEP:
      return '睡着了。';
    case StatusEffect.FREEZE:
      return '冰冻了！';
    case StatusEffect.BURN:
      return '被灼伤了！';
  }

  return '';
}

export function getStatusEffectOverlapText(statusEffect: StatusEffect): string {
  switch (statusEffect) {
    case StatusEffect.POISON:
    case StatusEffect.TOXIC:
      return '\n已经中毒了！';
    case StatusEffect.PARALYSIS:
      return '\n已经麻痹了！';
    case StatusEffect.SLEEP:
      return '\n已经睡着了！';
    case StatusEffect.FREEZE:
      return '\n已经冰冻了！';
    case StatusEffect.BURN:
      return '\n已经烧伤了！';
  }

  return '';
}

export function getStatusEffectHealText(statusEffect: StatusEffect): string {
  switch (statusEffect) {
    case StatusEffect.POISON:
    case StatusEffect.TOXIC:
      return '\n解毒成功！';
    case StatusEffect.PARALYSIS:
      return '\n麻痹治好了！';
    case StatusEffect.SLEEP:
      return '\n醒过来了！';
    case StatusEffect.FREEZE:
      return '\n解冻了！';
    case StatusEffect.BURN:
      return '\n烧伤治好了！';
  }

  return '';
}

export function getStatusEffectDescriptor(statusEffect: StatusEffect): string {
  switch (statusEffect) {
    case StatusEffect.POISON:
    case StatusEffect.TOXIC:
      return 'poisoning';
    case StatusEffect.PARALYSIS:
      return 'paralysis';
    case StatusEffect.SLEEP:
      return 'sleep';
    case StatusEffect.FREEZE:
      return 'freezing';
    case StatusEffect.BURN:
      return 'burn';
  }
}

export function getStatusEffectCatchRateMultiplier(statusEffect: StatusEffect): number {
  switch (statusEffect) {
    case StatusEffect.POISON:
    case StatusEffect.TOXIC:
    case StatusEffect.PARALYSIS:
    case StatusEffect.BURN:
      return 1.5;
    case StatusEffect.SLEEP:
    case StatusEffect.FREEZE:
      return 2.5;
  }

  return 1;
}

/**
* Returns a random non-volatile StatusEffect
*/
export function generateRandomStatusEffect(): StatusEffect {
  return Utils.randIntRange(1, 6);
}

/**
* Returns a random non-volatile StatusEffect between the two provided
* @param statusEffectA The first StatusEffect
* @param statusEffectA The second StatusEffect
*/
export function getRandomStatusEffect(statusEffectA: StatusEffect, statusEffectB: StatusEffect): StatusEffect {
  if (statusEffectA === StatusEffect.NONE || statusEffectA === StatusEffect.FAINT) {
    return statusEffectB;
  }
  if (statusEffectB === StatusEffect.NONE || statusEffectB === StatusEffect.FAINT) {
    return statusEffectA;
  }

  return Utils.randIntRange(0, 2) ? statusEffectA : statusEffectB;
}

/**
* Returns a random non-volatile StatusEffect between the two provided
* @param statusA The first Status
* @param statusB The second Status
*/
export function getRandomStatus(statusA: Status, statusB: Status): Status {  
  if (statusA === undefined || statusA.effect === StatusEffect.NONE || statusA.effect === StatusEffect.FAINT) {
    return statusB;
  }
  if (statusB === undefined || statusB.effect === StatusEffect.NONE || statusB.effect === StatusEffect.FAINT) {
    return statusA;
  }
  

  return Utils.randIntRange(0, 2) ? statusA : statusB;
}