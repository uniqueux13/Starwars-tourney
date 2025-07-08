// src/components/RosterModal/RosterModal.tsx
import React from 'react';
import styles from './RosterModal.module.css';
import { Tournament } from '../../hooks/useTournament';
import { Player } from '../../types';

interface RosterModalProps {
  tournament: Tournament;
  onClose: () => void;
  onViewProfile: (profileId: string) => void;
}

const RosterModal: React.FC<RosterModalProps> = ({ tournament, onClose, onViewProfile }) => {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.title}>{tournament.name} Roster</h3>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          {tournament.players.length > 0 ? (
            <ul className={styles.playerList}>
              {tournament.players.map((player: Player) => (
                <li key={player.id} className={styles.playerTag}>
                  <button className={styles.playerNameButton} onClick={() => onViewProfile(player.id)}>
                    {player.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.noPlayersText}>No players have registered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RosterModal;
