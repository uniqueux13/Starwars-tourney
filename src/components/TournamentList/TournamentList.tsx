// src/components/TournamentList/TournamentList.tsx
import React, { useState } from 'react';
import styles from './TournamentList.module.css';
import { Tournament } from '../../hooks/useTournament';
import { User } from 'firebase/auth';
import TournamentDetailsModal from '../TournamentDetailsModal/TournamentDetailsModal';
import RosterModal from '../RosterModal/RosterModal'; // Import the new RosterModal

interface TournamentListProps {
  tournaments: Tournament[];
  currentUser: User;
  onJoinTournament: (tournamentId: string) => Promise<void>;
  onManageTournament: (tournamentId: string) => Promise<void>;
  onViewProfile: (profileId: string) => void; // Add onViewProfile prop
  isJoining: string | null;
}

const TournamentList: React.FC<TournamentListProps> = ({ 
  tournaments, 
  currentUser, 
  onJoinTournament, 
  onManageTournament,
  onViewProfile, // Destructure the new prop
  isJoining 
}) => {
  const [viewingDetails, setViewingDetails] = useState<Tournament | null>(null);
  const [viewingRoster, setViewingRoster] = useState<Tournament | null>(null);

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
      {/* Conditionally render the modals */}
      {viewingDetails && (
        <TournamentDetailsModal 
          tournament={viewingDetails} 
          onClose={() => setViewingDetails(null)} 
        />
      )}
      {viewingRoster && (
        <RosterModal
          tournament={viewingRoster}
          onClose={() => setViewingRoster(null)}
          onViewProfile={onViewProfile}
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
                  Organized by: <button className={styles.organizerButton} onClick={() => onViewProfile(tournament.organizerId)}>{tournament.organizerUsername}</button>
                </span>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.detail}>
                  <span className={styles.detailLabel}>Players</span>
                  {/* Make the player count a clickable button to view the roster */}
                  <button className={styles.rosterButton} onClick={() => setViewingRoster(tournament)}>
                    {tournament.players.length}
                  </button>
                </div>
                <div className={styles.detail}>
                    <span className={styles.detailLabel}>Schedule</span>
                    <span className={styles.detailValueSmall}>{tournament.rules?.schedule || 'TBD'}</span>
                </div>
              </div>
              <div className={styles.cardFooter}>
                <button 
                  onClick={() => setViewingDetails(tournament)}
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
