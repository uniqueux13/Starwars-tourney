// src/components/RosterModal/RosterModal.tsx
import React from 'react';
import styles from './RosterModal.module.css';
import { Tournament } from '../../hooks/useTournament';
import { Player } from '../../types';
import { Team } from '../../hooks/useTeams';

// Type guard to check if a participant is a Team
function isTeam(participant: Player | Team): participant is Team {
  return (participant as Team).captainId !== undefined;
}

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
              {tournament.players.map((participant) => {
                const participantId = isTeam(participant) ? participant.captainId : participant.id;
                const name = participant.name;
                const photoURL = !isTeam(participant) ? participant.photoURL : null;
                const teamColor = isTeam(participant) ? participant.color : undefined;

                return (
                  <li key={participant.id} className={styles.playerTag}>
                    <div className={styles.playerInfo}>
                      {isTeam(participant) ? (
                        <div className={styles.teamIndicator} style={{ backgroundColor: teamColor }}>T</div>
                      ) : (
                        <img 
                          src={photoURL || `https://placehold.co/32x32/2a2a4e/e0e0ff?text=${name.charAt(0)}`} 
                          alt={name} 
                          className={styles.playerImage} 
                        />
                      )}
                      <button className={styles.playerNameButton} onClick={() => onViewProfile(participantId)}>
                        {name}
                      </button>
                    </div>
                  </li>
                );
              })}
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
