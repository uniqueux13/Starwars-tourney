// src/components/Dashboard/Dashboard.tsx
import React, { useState } from 'react';
import styles from './Dashboard.module.css';
import TournamentList from '../TournamentList/TournamentList';
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
  createTournament: (tournamentName: string) => Promise<void>;
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentName.trim()) {
      alert('Please enter a name for your tournament.');
      return;
    }
    setIsSubmitting(true);
    await createTournament(tournamentName);
    setShowCreateForm(false);
    setTournamentName('');
    setIsSubmitting(false);
  };

  const isOrganizer = activeTournament?.organizerId === currentUser.uid;

  return (
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
             onClick={() => setShowCreateForm(!showCreateForm)}
             className={styles.createButton}
           >
             {showCreateForm ? 'Cancel' : 'Create New Tournament'}
           </button>
           {showCreateForm && (
             <div className={styles.createFormContainer}>
               <form onSubmit={handleCreateSubmit} className={styles.form}>
                 <input
                   type="text"
                   value={tournamentName}
                   onChange={(e) => setTournamentName(e.target.value)}
                   placeholder="Enter Tournament Name..."
                   className={styles.input}
                   disabled={isSubmitting}
                 />
                 <button type="submit" className={styles.button} disabled={isSubmitting}>
                   {isSubmitting ? 'Creating...' : 'Confirm & Create'}
                 </button>
               </form>
             </div>
           )}
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
  );
};

export default Dashboard;
