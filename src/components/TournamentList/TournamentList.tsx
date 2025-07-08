// src/components/TournamentList/TournamentList.tsx
import React from 'react';
import styles from './TournamentList.module.css';
import { Tournament } from '../../hooks/useTournament';
import { User } from 'firebase/auth';

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
  if (tournaments.length === 0) {
    return (
      <div className={styles.noTournaments}>
        <h3>No Open Tournaments</h3>
        <p>There are currently no open tournaments. Why not create one?</p>
      </div>
    );
  }

  return (
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
                <span className={styles.detailLabel}>Status</span>
                <span className={styles.detailValue}>{tournament.status}</span>
              </div>
            </div>
            <div className={styles.cardFooter}>
              {isOrganizer ? (
                <button
                  onClick={() => onManageTournament(tournament.id)}
                  className={styles.manageButton}
                >
                  Manage Tournament
                </button>
              ) : isPlayer ? (
                 <span className={styles.registeredText}>You are registered!</span>
              ) : (
                <button
                  onClick={() => onJoinTournament(tournament.id)}
                  className={styles.joinButton}
                  disabled={isJoining === tournament.id}
                >
                  {isJoining === tournament.id ? 'Joining...' : 'Join Tournament'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TournamentList;
