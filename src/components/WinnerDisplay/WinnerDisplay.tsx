// src/components/WinnerDisplay/WinnerDisplay.tsx
import React from 'react';
import { Player } from '../../types';
import { Team } from '../../hooks/useTeams'; // Import the Team type
import styles from './WinnerDisplay.module.css';

// Type guard to check if the winner is a Team
function isTeam(winner: Player | Team): winner is Team {
  return (winner as Team).captainId !== undefined;
}

interface WinnerDisplayProps {
  winner: Player | Team; // Update prop to accept Player or Team
  onClose: () => void;
}

const WinnerDisplay: React.FC<WinnerDisplayProps> = ({ winner, onClose }) => {
  const name = winner.name;
  let imageUrl: string;
  let imageAlt: string = name;

  if (isTeam(winner)) {
    // For a team, we can use a placeholder or the captain's image if available
    const captain = winner.members.find(m => m.uid === winner.captainId);
    imageUrl = captain?.photoURL || `https://placehold.co/128x128/${winner.color.substring(1)}/ffffff?text=T`;
  } else {
    imageUrl = winner.photoURL || `https://placehold.co/128x128/1a1a2e/feda4a?text=${name.charAt(0).toUpperCase()}`;
  }

  return (
    <div className={styles.winnerOverlay}>
        <div className={styles.winnerModal}>
            <h1 className={styles.victoryTitle}>VICTORY</h1>
            <img src={imageUrl} alt={imageAlt} className={styles.winnerImage} />
            <h2 className={styles.winnerName}>{name}</h2>
            {isTeam(winner) && <p className={styles.teamText}>Team</p>}
            <button onClick={onClose} className={styles.closeButton}>
                Back to Dashboard
            </button>
        </div>
    </div>
  );
};

export default WinnerDisplay;
