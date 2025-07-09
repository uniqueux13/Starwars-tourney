// src/components/WinnerDisplay/WinnerDisplay.tsx
import React from 'react';
import { Player } from '../../types';
import styles from './WinnerDisplay.module.css';

interface WinnerDisplayProps {
  winner: Player;
  onClose: () => void;
}

const WinnerDisplay: React.FC<WinnerDisplayProps> = ({ winner, onClose }) => {
  const photoURL = winner.photoURL || `https://placehold.co/128x128/1a1a2e/feda4a?text=${winner.name.charAt(0).toUpperCase()}`;

  return (
    <div className={styles.winnerOverlay}>
        <div className={styles.winnerModal}>
            <h1 className={styles.victoryTitle}>VICTORY</h1>
            <img src={photoURL} alt={winner.name} className={styles.winnerImage} />
            <h2 className={styles.winnerName}>{winner.name}</h2>
            <button onClick={onClose} className={styles.closeButton}>
                Back to Dashboard
            </button>
        </div>
    </div>
  );
};

export default WinnerDisplay;
