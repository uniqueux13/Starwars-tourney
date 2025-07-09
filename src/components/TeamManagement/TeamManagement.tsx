// src/components/TeamManagement/TeamManagement.tsx
import React, { useState } from 'react';
import styles from './TeamManagement.module.css';
import { UserProfile } from '../../hooks/useUserProfile';
import { Team } from '../../hooks/useTeams';

interface TeamManagementProps {
  team: Team;
  onSearchUsers: (query: string) => Promise<UserProfile[]>;
  onInvitePlayer: (playerToInvite: UserProfile) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
  onLeaveTeam: () => Promise<void>;
  onViewProfile: (profileId: string) => void; // Add onViewProfile prop
  isCaptain: boolean;
}

const TeamManagement: React.FC<TeamManagementProps> = ({
  team,
  onSearchUsers,
  onInvitePlayer,
  onRemoveMember,
  onLeaveTeam,
  onViewProfile, // Destructure the new prop
  isCaptain,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await onSearchUsers(searchQuery);
    // Filter out players already on the team from the search results
    const teamMemberIds = team.members.map(m => m.uid);
    setSearchResults(results.filter(r => !teamMemberIds.includes(r.uid)));
    setIsSearching(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.teamName}>{team.name}</h2>
        <p>Team Management</p>
      </div>

      {/* Team Roster Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Current Roster ({team.members.length} / 4)</h3>
        <ul className={styles.memberList}>
          {team.members.map(member => (
            <li key={member.uid} className={styles.memberTag}>
              <div className={styles.memberInfo}>
                <img src={member.photoURL || `https://placehold.co/32x32/2a2a4e/e0e0ff?text=${member.username.charAt(0)}`} alt={member.username} className={styles.memberImage} />
                {/* Make the username a clickable button to view their profile */}
                <button className={styles.memberNameButton} onClick={() => onViewProfile(member.uid)}>
                  {member.username} {member.uid === team.captainId && '(C)'}
                </button>
              </div>
              {isCaptain && member.uid !== team.captainId && (
                <button onClick={() => onRemoveMember(member.uid)} className={styles.removeButton}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Invite Players Section (Only for Captains) */}
      {isCaptain && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Invite Players</h3>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username..."
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton} disabled={isSearching}>
              {isSearching ? '...' : 'Search'}
            </button>
          </form>
          {searchResults.length > 0 && (
            <ul className={styles.resultsList}>
              {searchResults.map(user => (
                <li key={user.uid} className={styles.resultItem}>
                   <div className={styles.memberInfo}>
                    <img src={user.photoURL || `https://placehold.co/32x32/2a2a4e/e0e0ff?text=${user.username.charAt(0)}`} alt={user.username} className={styles.memberImage} />
                    <span>{user.username}</span>
                  </div>
                  <button onClick={() => onInvitePlayer(user)} className={styles.inviteButton}>Invite</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      <div className={styles.footer}>
        <button onClick={onLeaveTeam} className={styles.leaveButton}>
          {isCaptain ? 'Disband Team' : 'Leave Team'}
        </button>
      </div>
    </div>
  );
};

export default TeamManagement;
