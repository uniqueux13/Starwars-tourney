// src/components/PlayerManager/PlayerManager.tsx
import React, { useState } from 'react';
import { Player } from '../../types';
import styles from './PlayerManager.module.css';

interface PlayerManagerProps {
  players: Player[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onGenerate: () => void;
  onReset: () => void;
}

const PlayerManager: React.FC<PlayerManagerProps> = ({
  players,
  onAddPlayer,
  onRemovePlayer,
  onGenerate,
  onReset,
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAddClick = () => {
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  return (
    <div className={styles.controls}>
      <div className={styles.inputGroup}>
        <input
          type="text"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddClick()}
          placeholder="Enter player name..."
          className={styles.input}
        />
        <button onClick={handleAddClick} className={styles.button}>
          Add Player
        </button>
      </div>
      {players.length > 0 && (
        <ul className={styles.playerList}>
          {players.map((p) => (
            <li key={p.id} className={styles.playerTag}>
              <span>{p.name}</span>
              <button
                onClick={() => onRemovePlayer(p.id)}
                className={styles.playerDelete}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.actionButtons}>
        <button
          onClick={onGenerate}
          disabled={players.length < 2}
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
          Generate Bracket
        </button>
        <button onClick={onReset} className={styles.button}>
          Reset All
        </button>
      </div>
    </div>
  );
};

export default PlayerManager;
