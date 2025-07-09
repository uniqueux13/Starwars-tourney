// src/components/TournamentList/TournamentList.tsx
import React, { useState } from 'react';
import styles from './TournamentList.module.css';
import { Tournament } from '../../hooks/useTournament';
import { User } from 'firebase/auth';
import TournamentDetailsModal from '../TournamentDetailsModal/TournamentDetailsModal';
import RosterModal from '../RosterModal/RosterModal';
import { Team } from '../../hooks/useTeams';

// Type guard to check if a participant is a Team
function isTeam(participant: any): participant is Team {
  return (participant as Team).captainId !== undefined;
}

interface TournamentListProps {
  tournaments: Tournament[];
  currentUser: User;
  onJoinTournament: (tournamentId: string) => Promise<void>;
  onManageTournament: (tournamentId: string) => Promise<void>;
  onViewProfile: (profileId: string) => void;
  isJoining: string | null;
}

const TournamentList: React.FC<TournamentListProps> = ({ 
  tournaments, 
  currentUser, 
  onJoinTournament, 
  onManageTournament,
  onViewProfile,
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
          
          // --- THE FIX: More robust check for player/team membership ---
          const isPlayer = tournament.players.some(p => {
            if (isTeam(p)) {
              // Check if the user is a member of any team in the tournament
              return p.members.some(member => member.uid === currentUser.uid);
            }
            // Check if the user is an individual player
            return p.id === currentUser.uid;
          });

          return (
            <div key={tournament.id} className={styles.tournamentCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.tournamentName}>{tournament.name}</h3>
                  <span className={styles.organizer}>
                    Organized by: <button className={styles.organizerButton} onClick={() => onViewProfile(tournament.organizerId)}>{tournament.organizerUsername}</button>
                  </span>
                </div>
                <div className={styles.typeBadge}>{tournament.type}</div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.detail}>
                  <span className={styles.detailLabel}>
                    {tournament.type === '4v4 HvV' ? 'Teams' : 'Players'}
                  </span>
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
