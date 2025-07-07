// src/components/PlayerManager/PlayerManager.tsx
import React, { useState } from 'react';
import { Player } from '../../types';
import styles from './PlayerManager.module.css';

interface PlayerManagerProps {
  players: Player[];
  myPlayers: Player[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  addPlayerToMyList: (name: string) => void;
  removePlayerFromMyList: (player: Player) => void;
  addPlayerFromMyListToTournament: (player: Player) => void;
  onGenerate: () => void;
  onReset: () => void;
}

const PlayerManager: React.FC<PlayerManagerProps> = ({
  players,
  myPlayers,
  onAddPlayer,
  onRemovePlayer,
  addPlayerToMyList,
  removePlayerFromMyList,
  addPlayerFromMyListToTournament,
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

  const handleAddToMyListClick = () => {
    if (newPlayerName.trim()) {
      addPlayerToMyList(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  return (
    <div className={styles.controls}>
      {/* Section for current tournament players */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Tournament Roster</h3>
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Enter player name..."
            className={styles.input}
          />
          <button onClick={handleAddClick} className={styles.button}>
            Add to Tournament
          </button>
          <button onClick={handleAddToMyListClick} className={styles.buttonSecondary}>
            Save to My Players
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
      </div>

      {/* Section for user's saved players */}
      {myPlayers.length > 0 && (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>My Saved Players</h3>
            <ul className={styles.playerList}>
                {myPlayers.map((p) => (
                    <li key={p.id} className={styles.myPlayerTag}>
                        <span>{p.name}</span>
                        <div className={styles.myPlayerActions}>
                            <button onClick={() => addPlayerFromMyListToTournament(p)} className={styles.addFromListBtn}>+</button>
                            <button onClick={() => removePlayerFromMyList(p)} className={styles.playerDelete}>&times;</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
      )}

      {/* Main action buttons */}
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
