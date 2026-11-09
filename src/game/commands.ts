import type { AbilityId, TargetMode } from '../core/types';

export type GameCommand =
  | { type: 'buyUpgrade'; id: string }
  | { type: 'startWave' }
  | { type: 'restartRun' }
  | { type: 'togglePause' }
  | { type: 'setSpeed'; speed: number }
  | { type: 'purchaseProduct'; id: string }
  | { type: 'exchangeGems' }
  | { type: 'setTargetMode'; mode: TargetMode }
  | { type: 'useAbility'; id: AbilityId }
  | { type: 'equipAbility'; slot: number; id: AbilityId }
  | { type: 'buyPrestigeNode'; id: string }
  | { type: 'claimContract'; id: string }
  | { type: 'setPlayerName'; name: string }
  | { type: 'useNova' }
  | { type: 'chooseBanner'; id: string }
  | { type: 'prestige' };

type CommandHandler = (command: GameCommand) => void;

let handler: CommandHandler | null = null;

export function setCommandHandler(nextHandler: CommandHandler | null): void {
  handler = nextHandler;
}

export function dispatchCommand(command: GameCommand): void {
  handler?.(command);
}
