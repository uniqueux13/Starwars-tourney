// src/types.ts
import { Team } from './hooks/useTeams';

export interface Player {
  id: string;
  name: string;
  userId?: string;
  photoURL?: string | null;
}

export interface Match {
  id: number;
  round: number;
  matchInRound: number;
  players: (Player | Team | null)[]; // Participants can be Player, Team, or null
  winner: Player | Team | null; // Winner can also be a Player or a Team
}
