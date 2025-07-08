// src/components/TournamentDetailsModal/TournamentDetailsModal.tsx
import React from 'react';
import styles from './TournamentDetailsModal.module.css';
import { Tournament } from '../../hooks/useTournament';

interface TournamentDetailsModalProps {
  tournament: Tournament;
  onClose: () => void;
}

const TournamentDetailsModal: React.FC<TournamentDetailsModalProps> = ({ tournament, onClose }) => {
  // Ensure we have rules to display, otherwise provide default text.
  const rules = tournament.rules || {
    schedule: 'Not specified',
    description: 'No description provided.',
    bannedItems: [],
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{tournament.name}</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.detailSection}>
            <h4 className={styles.sectionTitle}>Schedule</h4>
            <p>{rules.schedule || 'Not specified'}</p>
          </div>
          <div className={styles.detailSection}>
            <h4 className={styles.sectionTitle}>Description & Rules</h4>
            <p className={styles.descriptionText}>{rules.description || 'No description provided.'}</p>
          </div>
          <div className={styles.detailSection}>
            <h4 className={styles.sectionTitle}>Banned Items</h4>
            {rules.bannedItems && rules.bannedItems.length > 0 ? (
              <ul className={styles.bannedItemsList}>
                {rules.bannedItems.map(item => (
                  <li key={item} className={styles.bannedItemTag}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>None</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentDetailsModal;
