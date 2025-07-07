// src/components/WinnerDisplay/WinnerDisplay.tsx
import React from 'react';
import { Player } from '../../types';
import styles from './WinnerDisplay.module.css';

interface WinnerDisplayProps {
  winner: Player;
  onClose: () => void;
}

const WinnerDisplay: React.FC<WinnerDisplayProps> = ({ winner, onClose }) => {
  return (
    <div className={styles.winnerOverlay}>
      <div className={styles.winnerModal}>
        <h1 className={styles.victoryTitle}>VICTORY</h1>
        <h2 className={styles.winnerName}>{winner.name}</h2>
        <button onClick={onClose} className={styles.closeButton}>
          New Tournament
        </button>
      </div>
    </div>
  );
};

export default WinnerDisplay;
