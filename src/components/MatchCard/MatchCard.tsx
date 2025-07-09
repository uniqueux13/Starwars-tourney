// src/components/MatchCard/MatchCard.tsx
import React from 'react';
import { Match, Player } from '../../types';
import styles from './MatchCard.module.css';

interface MatchCardProps {
  match: Match;
  organizerId: string;
  currentUserId: string;
  onSetWinner: (matchId: number, winner: Player) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, organizerId, currentUserId, onSetWinner }) => {
  // The winner can be set only if the match is full, there's no winner yet, AND the current user is the organizer.
  const canSetWinner = 
    match.players.every((p) => p && p.id !== 'BYE') && 
    !match.winner &&
    currentUserId === organizerId;

  const PlayerDisplay: React.FC<{ player: Player | null; isWinner: boolean }> = ({
    player,
    isWinner,
  }) => {
    if (!player) return <div className={`${styles.playerSlot} ${styles.tbd}`}>TBD</div>;
    if (player.id === 'BYE') return <div className={`${styles.playerSlot} ${styles.bye}`}>BYE</div>;

    return (
      <div className={`${styles.playerSlot} ${isWinner ? styles.winner : ''}`}>
        <div className={styles.playerInfo}>
            <img src={player.photoURL || `https://placehold.co/32x32/2a2a4e/e0e0ff?text=${player.name.charAt(0)}`} alt={player.name} className={styles.playerImage} />
            <span className={styles.playerName}>{player.name}</span>
        </div>
        {canSetWinner && (
          <button
            className={styles.winButton}
            onClick={() => onSetWinner(match.id, player)}
          >
            Declare Winner
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={styles.matchCard}>
      <PlayerDisplay
        player={match.players[0]}
        isWinner={match.winner?.id === match.players[0]?.id}
      />
      <div className={styles.vs}>VS</div>
      <PlayerDisplay
        player={match.players[1]}
        isWinner={match.winner?.id === match.players[1]?.id}
      />
    </div>
  );
};

export default MatchCard;
