// src/types.ts

export interface Player {
  id: string;
  name: string;
  userId?: string;
  photoURL?: string | null; // Add optional photoURL
}

export interface Match {
  id: number;
  round: number;
  matchInRound: number;
  players: (Player | null)[];
  winner: Player | null;
}
