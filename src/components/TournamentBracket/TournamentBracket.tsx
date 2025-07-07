// src/components/TournamentBracket/TournamentBracket.tsx
import React, { useMemo } from 'react';
import { Match, Player } from '../../types';
import MatchCard from '../MatchCard/MatchCard';
import styles from './TournamentBracket.module.css';

interface TournamentBracketProps {
  matches: Match[];
  onSetWinner: (matchId: number, winner: Player) => void;
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ matches, onSetWinner }) => {
  const rounds = useMemo<Match[][]>(() => {
    if (!matches.length) return [];
    const groupedByRound = matches.reduce((acc: Record<number, Match[]>, match) => {
      (acc[match.round] = acc[match.round] || []).push(match);
      return acc;
    }, {} as Record<number, Match[]>);
    // Sort rounds by round number and matches by their position in the round
    return Object.values(groupedByRound).map((round) =>
      round.sort((a, b) => a.matchInRound - b.matchInRound)
    );
  }, [matches]);

  if (!rounds.length) {
    return null;
  }

  return (
    <div className={styles.bracketContainer}>
      <div className={styles.bracket}>
        {rounds.map((roundMatches, roundIndex) => (
          <div key={roundIndex} className={styles.round}>
            <h3 className={styles.roundTitle}>Round {roundIndex + 1}</h3>
            {roundMatches.map((match) => (
              <MatchCard key={match.id} match={match} onSetWinner={onSetWinner} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TournamentBracket;
