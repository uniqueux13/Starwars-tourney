// src/types.ts

export interface Player {
  id: string;
  name: string;
  // Added to associate player with a user account
  userId?: string; 
}

export interface Match {
  id: number;
  round: number;
  matchInRound: number;
  players: (Player | null)[];
  winner: Player | null;
}
