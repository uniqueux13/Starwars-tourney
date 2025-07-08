// src/components/TournamentList/TournamentList.tsx
import React, { useState } from 'react';
import styles from './TournamentList.module.css';
import { Tournament } from '../../hooks/useTournament';
import { User } from 'firebase/auth';
import TournamentDetailsModal from '../TournamentDetailsModal/TournamentDetailsModal'; // Import the new modal

interface TournamentListProps {
  tournaments: Tournament[];
  currentUser: User;
  onJoinTournament: (tournamentId: string) => Promise<void>;
  onManageTournament: (tournamentId: string) => Promise<void>;
  isJoining: string | null;
}

const TournamentList: React.FC<TournamentListProps> = ({ 
  tournaments, 
  currentUser, 
  onJoinTournament, 
  onManageTournament, 
  isJoining 
}) => {
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  if (tournaments.length === 0) {
    return (
      <div className={styles.noTournaments}>
        <h3>No Open Tournaments</h3>
        <p>There are currently no open tournaments. Why not create one?</p>
      </div>
    );
  }

  return (
    <>
      {/* Conditionally render the modal when a tournament is selected */}
      {selectedTournament && (
        <TournamentDetailsModal 
          tournament={selectedTournament} 
          onClose={() => setSelectedTournament(null)} 
        />
      )}

      <div className={styles.listContainer}>
        {tournaments.map((tournament) => {
          const isOrganizer = tournament.organizerId === currentUser.uid;
          const isPlayer = tournament.players.some(p => p.id === currentUser.uid);

          return (
            <div key={tournament.id} className={styles.tournamentCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.tournamentName}>{tournament.name}</h3>
                <span className={styles.organizer}>
                  Organized by: {tournament.organizerUsername}
                </span>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.detail}>
                  <span className={styles.detailLabel}>Players</span>
                  <span className={styles.detailValue}>{tournament.players.length}</span>
                </div>
                <div className={styles.detail}>
                    <span className={styles.detailLabel}>Schedule</span>
                    <span className={styles.detailValueSmall}>{tournament.rules?.schedule || 'TBD'}</span>
                </div>
              </div>
              <div className={styles.cardFooter}>
                <button 
                  onClick={() => setSelectedTournament(tournament)}
                  className={styles.detailsButton}
                >
                  View Details
                </button>
                {isOrganizer ? (
                  <button
                    onClick={() => onManageTournament(tournament.id)}
                    className={styles.manageButton}
                  >
                    Manage
                  </button>
                ) : isPlayer ? (
                   <span className={styles.registeredText}>You are registered!</span>
                ) : (
                  <button
                    onClick={() => onJoinTournament(tournament.id)}
                    className={styles.joinButton}
                    disabled={isJoining === tournament.id}
                  >
                    {isJoining === tournament.id ? 'Joining...' : 'Join'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default TournamentList;
