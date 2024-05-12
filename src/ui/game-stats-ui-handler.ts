import BattleScene from "../battle-scene";
import { TextStyle, addTextObject, getTextColor } from "./text";
import { Mode } from "./ui";
import UiHandler from "./ui-handler";
import { addWindow } from "./ui-theme";
import * as Utils from "../utils";
import { DexAttr, GameData } from "../system/game-data";
import { speciesStarters } from "../data/pokemon-species";
import {Button} from "../enums/buttons";

interface DisplayStat {
  label?: string;
  sourceFunc?: (gameData: GameData) => string;
  hidden?: boolean;
}

interface DisplayStats {
  [key: string]: DisplayStat | string
}

const displayStats: DisplayStats = {
  playTime: {
    label: '游戏时长',
    sourceFunc: gameData => Utils.getPlayTimeString(gameData.gameStats.playTime)
  },
  battles: '战斗总数',
  startersUnlocked: {
    label: '初始宝可梦',
    sourceFunc: gameData => {
      const starterCount = gameData.getStarterCount(d => !!d.caughtAttr);
      return `${starterCount} (${Math.floor((starterCount / Object.keys(speciesStarters).length) * 1000) / 10}%)`;
    }
  },
  shinyStartersUnlocked: {
    label: '异色初始宝可梦',
    sourceFunc: gameData => {
      const starterCount = gameData.getStarterCount(d => !!(d.caughtAttr & DexAttr.SHINY));
      return `${starterCount} (${Math.floor((starterCount / Object.keys(speciesStarters).length) * 1000) / 10}%)`;
    }
  },
  dexSeen: {
    label: '已发现宝可梦',
    sourceFunc: gameData => {
      const seenCount = gameData.getSpeciesCount(d => !!d.seenAttr);
      return `${seenCount} (${Math.floor((seenCount / Object.keys(gameData.dexData).length) * 1000) / 10}%)`;
    }
  },
  dexCaught: {
    label: '已捕获宝可梦',
    sourceFunc: gameData => {
      const caughtCount = gameData.getSpeciesCount(d => !!d.caughtAttr);
      return `${caughtCount} (${Math.floor((caughtCount / Object.keys(gameData.dexData).length) * 1000) / 10}%)`;
    }
  },
  ribbonsOwned: '获得的缎带数量',
  classicSessionsPlayed: '经典模式游戏次数',
  sessionsWon: '经典模式胜利次数',
  dailyRunSessionsPlayed: '每日挑战尝试次数',
  dailyRunSessionsWon: '每日挑战胜利次数',
  endlessSessionsPlayed: '无尽模式游戏次数',
  highestEndlessWave: '最高波数 (无尽模式)',
  highestMoney: '最高金钱',
  highestDamage: '最高伤害',
  highestHeal: '最高生命值回复',
  pokemonSeen: '遇到的宝可梦数量',
  pokemonDefeated: '击败的宝可梦数量',
  pokemonCaught: '捕捉的宝可梦数量',
  pokemonHatched: '孵化的宝可梦数量',
  subLegendaryPokemonSeen: '遇到的准神兽数量',
  subLegendaryPokemonCaught: '捕捉的准神兽数量',
  subLegendaryPokemonHatched: '孵化的准神兽数量',
  legendaryPokemonSeen: '遇到的神兽数量',
  legendaryPokemonCaught: '捕捉的神兽数量',
  legendaryPokemonHatched: '孵化的神兽数量',
  mythicalPokemonSeen: '遇到的幻之宝可梦数量',
  mythicalPokemonCaught: '捕捉的幻之宝可梦数量',
  mythicalPokemonHatched: '孵化的幻之宝可梦数量',
  shinyPokemonSeen: '遇到的闪光宝可梦数量',
  shinyPokemonCaught: '捕捉的闪光宝可梦数量',
  shinyPokemonHatched: '孵化的闪光宝可梦数量',
  pokemonFused: '融合的宝可梦数量',
  trainersDefeated: '击败的训练家数量',
  eggsPulled: '获得的蛋数量',
  rareEggsPulled: '获得的稀有蛋数量',
  epicEggsPulled: '获得的史诗蛋数量',
  legendaryEggsPulled: '获得的传说蛋数量',
  manaphyEggsPulled: '获得的霏欧纳蛋数量'
};

export default class GameStatsUiHandler extends UiHandler {
  private gameStatsContainer: Phaser.GameObjects.Container;
  private statsContainer: Phaser.GameObjects.Container;

  private statLabels: Phaser.GameObjects.Text[];
  private statValues: Phaser.GameObjects.Text[];

  constructor(scene: BattleScene, mode?: Mode) {
    super(scene, mode);

    this.statLabels = [];
    this.statValues = [];
  }

  setup() {
    const ui = this.getUi();
    
    this.gameStatsContainer = this.scene.add.container(1, -(this.scene.game.canvas.height / 6) + 1);

    this.gameStatsContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6), Phaser.Geom.Rectangle.Contains);

    const headerBg = addWindow(this.scene, 0, 0, (this.scene.game.canvas.width / 6) - 2, 24);
    headerBg.setOrigin(0, 0);

    const headerText = addTextObject(this.scene, 0, 0, '数据统计', TextStyle.SETTINGS_LABEL);
    headerText.setOrigin(0, 0);
    headerText.setPositionRelative(headerBg, 8, 4);

    const statsBgWidth = ((this.scene.game.canvas.width / 6) - 2) / 2;
    const [ statsBgLeft, statsBgRight ] = new Array(2).fill(null).map((_, i) => {
      let width = statsBgWidth;
      if (!i)
        width += 5;
      const statsBg = addWindow(this.scene, statsBgWidth * i, headerBg.height, width, (this.scene.game.canvas.height / 6) - headerBg.height - 2, false, !!i, 2);
      statsBg.setOrigin(0, 0);
      return statsBg;
    });

    this.statsContainer = this.scene.add.container(0, 0);

    new Array(18).fill(null).map((_, s) => {
      const statLabel = addTextObject(this.scene, 8 + (s % 2 === 1 ? statsBgWidth : 0), 28 + Math.floor(s / 2) * 16, '', TextStyle.SETTINGS_LABEL);
      statLabel.setOrigin(0, 0);
      this.statsContainer.add(statLabel);
      this.statLabels.push(statLabel);

      const statValue = addTextObject(this.scene, (statsBgWidth * ((s % 2) + 1)) - 8, statLabel.y, '', TextStyle.WINDOW);
      statValue.setOrigin(1, 0);
      this.statsContainer.add(statValue);
      this.statValues.push(statValue);
    });

    this.gameStatsContainer.add(headerBg);
    this.gameStatsContainer.add(headerText);
    this.gameStatsContainer.add(statsBgLeft);
    this.gameStatsContainer.add(statsBgRight);
    this.gameStatsContainer.add(this.statsContainer);

    ui.add(this.gameStatsContainer);

    this.setCursor(0);

    this.gameStatsContainer.setVisible(false);
  }

  show(args: any[]): boolean {
    super.show(args);

    this.setCursor(0);
    
    this.updateStats();
    
    this.gameStatsContainer.setVisible(true);

    this.getUi().moveTo(this.gameStatsContainer, this.getUi().length - 1);

    this.getUi().hideTooltip();

    return true;
  }

  updateStats(): void {
    const statKeys = Object.keys(displayStats).slice(this.cursor * 2, this.cursor * 2 + 18);
    statKeys.forEach((key, s) => {
      const stat = displayStats[key] as DisplayStat;
      const value = stat.sourceFunc(this.scene.gameData);
      this.statLabels[s].setText(!stat.hidden || isNaN(parseInt(value)) || parseInt(value) ? stat.label : '???');
      this.statValues[s].setText(value);
    });
    if (statKeys.length < 18) {
      for (let s = statKeys.length; s < 18; s++) {
        this.statLabels[s].setText('');
        this.statValues[s].setText('');
      }
    }
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;

    if (button === Button.CANCEL) {
      success = true;
      this.scene.ui.revertMode();
    } else {
      switch (button) {
        case Button.UP:
          if (this.cursor)
            success = this.setCursor(this.cursor - 1);
          break;
        case Button.DOWN:
          if (this.cursor < Math.ceil((Object.keys(displayStats).length - 18) / 2))
            success = this.setCursor(this.cursor + 1);
          break;
      }
    }

    if (success)
      ui.playSelect();

    return success;
  }

  setCursor(cursor: integer): boolean {
    const ret = super.setCursor(cursor);

    if (ret)
      this.updateStats();

    return ret;
  }

  clear() {
    super.clear();
    this.gameStatsContainer.setVisible(false);
  }
}

(function () {
  const statKeys = Object.keys(displayStats);

  for (let key of statKeys) {
    if (typeof displayStats[key] === 'string') {
      let label = displayStats[key] as string;
      let hidden = false;
      if (label.endsWith('?')) {
        label = label.slice(0, -1);
        hidden = true;
      }
      displayStats[key] = {
        label: label,
        sourceFunc: gameData => gameData.gameStats[key].toString(),
        hidden: hidden
      };
    } else if (displayStats[key] === null) {
      displayStats[key] = {
        sourceFunc: gameData => gameData.gameStats[key].toString()
      };
    }
    if (!(displayStats[key] as DisplayStat).label) {
      const splittableKey = key.replace(/([a-z]{2,})([A-Z]{1}(?:[^A-Z]|$))/g, '$1_$2');
      (displayStats[key] as DisplayStat).label = Utils.toReadableString(`${splittableKey[0].toUpperCase()}${splittableKey.slice(1)}`);
    }
  }
})();