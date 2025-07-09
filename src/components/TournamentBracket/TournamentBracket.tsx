// src/components/TournamentBracket/TournamentBracket.tsx
import React, { useMemo } from 'react';
import { Match, Player } from '../../types';
import { Team } from '../../hooks/useTeams'; // Import the Team type
import MatchCard from '../MatchCard/MatchCard';
import styles from './TournamentBracket.module.css';

interface TournamentBracketProps {
  matches: Match[];
  organizerId: string;
  currentUserId: string;
  onSetWinner: (matchId: number, winner: Player | Team) => void; // Update to accept Player or Team
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ matches, organizerId, currentUserId, onSetWinner }) => {
  const rounds = useMemo<Match[][]>(() => {
    if (!matches.length) return [];
    const groupedByRound = matches.reduce((acc: Record<number, Match[]>, match) => {
      (acc[match.round] = acc[match.round] || []).push(match);
      return acc;
    }, {} as Record<number, Match[]>);
    return Object.values(groupedByRound).map((round) =>
      round.sort((a, b) => a.matchInRound - b.matchInRound)
    );
  }, [matches]);

  if (!rounds || rounds.length === 0) {
    return (
        <div className={styles.noMatches}>
            <p>The bracket has not been generated yet.</p>
        </div>
    );
  }

  return (
    <div className={styles.bracketContainer}>
      <div className={styles.bracket}>
        {rounds.map((roundMatches, roundIndex) => (
          <div key={roundIndex} className={styles.round}>
            <h3 className={styles.roundTitle}>Round {roundIndex + 1}</h3>
            {roundMatches.map((match) => (
              <MatchCard 
                key={match.id} 
                match={match} 
                organizerId={organizerId}
                currentUserId={currentUserId}
                onSetWinner={onSetWinner} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TournamentBracket;
