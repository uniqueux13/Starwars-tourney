// src/components/CreateTournamentModal/CreateTournamentModal.tsx
import React, { useState } from 'react';
import styles from './CreateTournamentModal.module.css';

export type TournamentType = '1v1 Duel' | '4v4 HvV' | 'Free-for-All';

const TOURNAMENT_TYPES: TournamentType[] = ['1v1 Duel', '4v4 HvV', 'Free-for-All'];

interface CreateTournamentModalProps {
  onClose: () => void;
  onCreate: (name: string, type: TournamentType, participate: boolean) => Promise<void>;
  isCreating: boolean;
}

const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({ onClose, onCreate, isCreating }) => {
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentType, setTournamentType] = useState<TournamentType>('1v1 Duel');
  const [willParticipate, setWillParticipate] = useState(true); // Default to participating

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentName.trim()) {
      alert('Please enter a name for your tournament.');
      return;
    }
    onCreate(tournamentName, tournamentType, willParticipate);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Create New Tournament</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="tournament-name">Tournament Name</label>
            <input
              id="tournament-name"
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="Enter a name..."
              className={styles.input}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Tournament Type</label>
            <div className={styles.typeSelector}>
              {TOURNAMENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`${styles.typeButton} ${tournamentType === type ? styles.typeButtonActive : ''}`}
                  onClick={() => setTournamentType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          {/* New Checkbox for Participation */}
          <div className={styles.checkboxGroup}>
            <input 
              type="checkbox"
              id="participate-checkbox"
              checked={willParticipate}
              onChange={(e) => setWillParticipate(e.target.checked)}
            />
            <label htmlFor="participate-checkbox">I want to participate in this tournament</label>
          </div>
          <button type="submit" className={styles.submitButton} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Tournament'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateTournamentModal;
