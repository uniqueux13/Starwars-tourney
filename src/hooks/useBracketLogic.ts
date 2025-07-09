// src/hooks/useBracketLogic.ts
import { Player, Match } from '../types';
import { Team } from './useTeams';

// This function now lives in its own file, dedicated to bracket logic.
export const generateBracket = (participants: (Player | Team)[]): Match[] => {
  const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
  const numParticipants = shuffledParticipants.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numParticipants)));

  const roundOneParticipants: ((Player | Team) | null)[] = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    roundOneParticipants.push(shuffledParticipants[i] || null);
  }
  for (let i = bracketSize / 2; i < numParticipants; i++) {
    const insertIndex = (i - bracketSize / 2) * 2 + 1;
    roundOneParticipants.splice(insertIndex, 0, shuffledParticipants[i]);
  }

  let allMatches: Match[] = [];
  let matchIdCounter = 0;

  for (let i = 0; i < roundOneParticipants.length; i += 2) {
    const p1 = roundOneParticipants[i];
    // Create a 'BYE' object that conforms to the Player type for consistency
    const p2 = roundOneParticipants[i + 1] || { id: 'BYE', name: 'BYE' };
    
    const winner = p2.id === 'BYE' ? p1 : null;

    allMatches.push({
      id: matchIdCounter++,
      round: 1,
      matchInRound: i / 2,
      players: [p1, p2 as Player], // It's safe to cast BYE as a Player here
      winner: winner,
    });
  }

  let currentRound = 1;
  let matchesInCurrentRound = allMatches.length;
  while (matchesInCurrentRound > 1) {
    const matchesInNextRound = matchesInCurrentRound / 2;
    for (let i = 0; i < matchesInNextRound; i++) {
      allMatches.push({
        id: matchIdCounter++,
        round: currentRound + 1,
        matchInRound: i,
        players: [null, null],
        winner: null,
      });
    }
    matchesInCurrentRound = matchesInNextRound;
    currentRound++;
  }

  const finalMatches = [...allMatches];
  finalMatches
    .filter((m) => m.round === 1 && m.winner)
    .forEach((match) => {
      const nextRound = match.round + 1;
      const nextMatchInRound = Math.floor(match.matchInRound / 2);
      const playerSlot = match.matchInRound % 2;
      const nextMatch = finalMatches.find(
        (m) => m.round === nextRound && m.matchInRound === nextMatchInRound
      );
      if (nextMatch) {
        nextMatch.players[playerSlot] = match.winner;
      }
    });

  return finalMatches;
};
