// src/components/TournamentManagement/TournamentManagement.tsx
import React, { useState } from 'react';
import styles from './TournamentManagement.module.css';
import { Tournament } from '../../hooks/useTournament';
import { Player } from '../../types';
import { User } from 'firebase/auth';
import TournamentSettings, { TournamentRules } from '../TournamentSettings/TournamentSettings';

interface TournamentManagementProps {
  tournament: Tournament;
  currentUser: User;
  onStartTournament: () => Promise<void>;
  onDeleteTournament: () => Promise<void>;
  onKickPlayer: (playerToKick: Player) => Promise<void>;
  onGenerateInvite: () => Promise<string | null>;
  onSaveSettings: (settings: TournamentRules) => Promise<void>;
  isStarting: boolean;
  isDeleting: boolean;
  isKickingPlayerId: string | null;
  isSavingSettings: boolean;
}

const TournamentManagement: React.FC<TournamentManagementProps> = ({
  tournament,
  currentUser,
  onStartTournament,
  onDeleteTournament,
  onKickPlayer,
  onGenerateInvite,
  onSaveSettings,
  isStarting,
  isDeleting,
  isKickingPlayerId,
  isSavingSettings,
}) => {
  const [view, setView] = useState<'roster' | 'settings'>('roster');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const canStart = tournament.players.length >= 2;

  const handleDeleteClick = () => {
    if (window.confirm(`Are you sure you want to delete the tournament "${tournament.name}"? This action cannot be undone.`)) {
      onDeleteTournament();
    }
  };

  const handleInviteClick = async () => {
    setIsGeneratingLink(true);
    const link = await onGenerateInvite();
    if (link) {
      setInviteLink(link);
      navigator.clipboard.writeText(link).then(() => {
        alert("Invite link copied to clipboard!");
      }, () => {
        alert("Could not copy link automatically. Please copy it manually.");
      });
    } else {
      alert("Failed to generate an invite link.");
    }
    setIsGeneratingLink(false);
  };

  return (
    <div className={styles.managementContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>{tournament.name}</h2>
        <p className={styles.subtitle}>Tournament Control Panel</p>
      </div>

      {/* Tab Navigation */}
      <div className={styles.navTabs}>
        <button 
          onClick={() => setView('roster')}
          className={`${styles.navButton} ${view === 'roster' ? styles.navButtonActive : ''}`}
        >
          Roster & Invites
        </button>
        <button 
          onClick={() => setView('settings')}
          className={`${styles.navButton} ${view === 'settings' ? styles.navButtonActive : ''}`}
        >
          Settings
        </button>
      </div>

      {/* Conditional Content based on selected view */}
      {view === 'roster' && (
        <div className={styles.contentSection}>
            <div className={styles.inviteSection}>
                <h3 className={styles.sectionTitle}>Invite Players</h3>
                <button 
                    className={styles.inviteButton}
                    onClick={handleInviteClick}
                    disabled={isGeneratingLink}
                >
                    {isGeneratingLink ? 'Generating...' : 'Generate Invite Link'}
                </button>
                {inviteLink && (
                    <div className={styles.inviteLinkContainer}>
                        <p>Share this link with players to have them automatically join:</p>
                        <input type="text" readOnly value={inviteLink} className={styles.inviteInput} />
                    </div>
                )}
            </div>

            <div className={styles.playerListSection}>
                <h3 className={styles.sectionTitle}>Registered Players ({tournament.players.length})</h3>
                {tournament.players.length > 0 ? (
                <ul className={styles.playerList}>
                    {tournament.players.map((player: Player) => (
                    <li key={player.id} className={styles.playerTag}>
                        <span>{player.name}</span>
                        {player.id !== currentUser.uid && (
                            <button 
                                className={styles.kickButton}
                                onClick={() => onKickPlayer(player)}
                                disabled={!!isKickingPlayerId}
                            >
                                {isKickingPlayerId === player.id ? '...' : 'Kick'}
                            </button>
                        )}
                    </li>
                    ))}
                </ul>
                ) : (
                <p className={styles.noPlayersText}>No players have registered yet.</p>
                )}
            </div>
        </div>
      )}
      
      {view === 'settings' && (
        <div className={styles.contentSection}>
            <TournamentSettings 
                tournament={tournament}
                onSaveSettings={onSaveSettings}
                isSaving={isSavingSettings}
            />
        </div>
      )}


      <div className={styles.actionsSection}>
        <h3 className={styles.sectionTitle}>Final Actions</h3>
        <div className={styles.buttonGroup}>
          <button
            onClick={onStartTournament}
            className={styles.startButton}
            disabled={!canStart || isStarting || isDeleting}
          >
            {isStarting ? 'Starting...' : 'Start Tournament'}
          </button>
          <button
            onClick={handleDeleteClick}
            className={styles.deleteButton}
            disabled={isStarting || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Tournament'}
          </button>
        </div>
        {!canStart && <p className={styles.noteText}>You need at least 2 players to start the tournament.</p>}
      </div>
    </div>
  );
};

export default TournamentManagement;
