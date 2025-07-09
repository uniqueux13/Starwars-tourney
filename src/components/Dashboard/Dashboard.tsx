// src/components/Dashboard/Dashboard.tsx
import React, { useState } from 'react';
import styles from './Dashboard.module.css';
import TournamentList from '../TournamentList/TournamentList';
import CreateTournamentModal, { TournamentType } from '../CreateTournamentModal/CreateTournamentModal';
import { Tournament } from '../../hooks/useTournament';
import { User } from 'firebase/auth';

interface DashboardProps {
  username: string;
  currentUser: User;
  activeTournament: Tournament | null;
  openTournaments: Tournament[];
  isJoining: string | null;
  joinTournament: (tournamentId: string) => Promise<void>;
  manageTournament: (tournamentId: string) => Promise<void>;
  createTournament: (name: string, type: TournamentType, participate: boolean) => Promise<void>; // Update to accept 'participate'
  leaveTournament: () => Promise<void>;
  onViewProfile: (profileId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  username,
  currentUser,
  activeTournament,
  openTournaments,
  isJoining,
  joinTournament,
  manageTournament,
  createTournament,
  leaveTournament,
  onViewProfile,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTournament = async (name: string, type: TournamentType, participate: boolean) => {
    setIsCreating(true);
    await createTournament(name, type, participate); // Pass the 'participate' value
    setIsCreating(false);
    setIsCreateModalOpen(false);
  };

  const isOrganizer = activeTournament?.organizerId === currentUser.uid;

  return (
    <>
      {isCreateModalOpen && (
        <CreateTournamentModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateTournament}
          isCreating={isCreating}
        />
      )}

      <div className={styles.dashboardContainer}>
        <h2 className={styles.welcomeTitle}>Welcome, {username}</h2>

        {activeTournament ? (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>My Current Tournament</h3>
            <div className={styles.activeTournamentCard}>
              <div className={styles.tournamentInfo}>
                <p className={styles.activeName}>{activeTournament.name}</p>
                <p className={styles.activeStatus}>Status: <span>{activeTournament.status}</span></p>
              </div>
              <div className={styles.activeActions}>
                {isOrganizer && activeTournament.status === 'setup' && (
                  <button onClick={() => manageTournament(activeTournament.id)} className={styles.actionButton}>Manage</button>
                )}
                {activeTournament.status === 'in_progress' && (
                  <button onClick={() => manageTournament(activeTournament.id)} className={styles.actionButton}>View Bracket</button>
                )}
                {activeTournament.status === 'completed' && (
                  <button onClick={() => manageTournament(activeTournament.id)} className={styles.actionButton}>View Results</button>
                )}
                <button onClick={leaveTournament} className={styles.leaveButton}>Leave</button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.createContainer}>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className={styles.createButton}
            >
              Create New Tournament
            </button>
          </div>
        )}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Open Tournaments</h3>
          <TournamentList
            tournaments={openTournaments}
            currentUser={currentUser}
            onJoinTournament={joinTournament}
            onManageTournament={manageTournament}
            onViewProfile={onViewProfile}
            isJoining={isJoining}
          />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
