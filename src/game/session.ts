import { GameSession } from './GameSession';

let instance: GameSession | null = null;

export function getGameSession(): GameSession {
  if (!instance) instance = new GameSession();
  return instance;
}
