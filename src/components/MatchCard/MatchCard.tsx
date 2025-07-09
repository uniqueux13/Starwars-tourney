// src/components/MatchCard/MatchCard.tsx
import React from 'react';
import { Match, Player } from '../../types';
import { Team } from '../../hooks/useTeams';
import styles from './MatchCard.module.css';

// Type guard to check if a participant is a Team
function isTeam(participant: Player | Team): participant is Team {
  return (participant as Team).captainId !== undefined;
}

interface MatchCardProps {
  match: Match;
  organizerId: string;
  currentUserId: string;
  onSetWinner: (matchId: number, winner: Player | Team) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, organizerId, currentUserId, onSetWinner }) => {
  const canSetWinner = 
    match.players.every((p) => p && (p as any).id !== 'BYE') && 
    !match.winner &&
    currentUserId === organizerId;

  const PlayerDisplay: React.FC<{ participant: Player | Team | null; isWinner: boolean }> = ({
    participant,
    isWinner,
  }) => {
    if (!participant) return <div className={`${styles.playerSlot} ${styles.tbd}`}>TBD</div>;
    if ('id' in participant && participant.id === 'BYE') return <div className={`${styles.playerSlot} ${styles.bye}`}>BYE</div>;

    const name = participant.name;
    const photoURL = (participant as Player).photoURL;
    const teamColor = isTeam(participant) ? participant.color : undefined;

    return (
      <div className={`${styles.playerSlot} ${isWinner ? styles.winner : ''}`}>
        <div className={styles.playerInfo}>
            {isTeam(participant) ? (
                <div className={styles.teamIndicator} style={{ backgroundColor: teamColor }}>T</div>
            ) : (
                <img src={photoURL || `https://placehold.co/32x32/2a2a4e/e0e0ff?text=${name.charAt(0)}`} alt={name} className={styles.playerImage} />
            )}
            <span className={styles.playerName}>{name}</span>
        </div>
        {canSetWinner && (
          <button
            className={styles.winButton}
            onClick={() => onSetWinner(match.id, participant)}
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
        participant={match.players[0]}
        isWinner={match.winner?.id === match.players[0]?.id}
      />
      <div className={styles.vs}>VS</div>
      <PlayerDisplay
        participant={match.players[1]}
        isWinner={match.winner?.id === match.players[1]?.id}
      />
    </div>
  );
};

export default MatchCard;
