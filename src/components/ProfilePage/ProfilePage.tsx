// src/components/ProfilePage/ProfilePage.tsx
import React from 'react';
import styles from './ProfilePage.module.css';
import { UserProfile } from '../../hooks/useUserProfile';

interface ProfilePageProps {
  profile: UserProfile;
  onBack: () => void; // Function to go back to the previous view
}

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, onBack }) => {
  const winRate = profile.stats.tournamentsPlayed > 0
    ? ((profile.stats.tournamentsWon / profile.stats.tournamentsPlayed) * 100).toFixed(1)
    : '0.0';

  return (
    <div className={styles.profileContainer}>
      <button onClick={onBack} className={styles.backButton}>&larr; Back to Dashboard</button>
      <div className={styles.profileHeader}>
        <h2 className={styles.username}>{profile.username}</h2>
        <p className={styles.joinedDate}>
          Member since: {new Date(profile.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h4>Tournaments Hosted</h4>
          <p>{profile.stats.tournamentsHosted}</p>
        </div>
        <div className={styles.statCard}>
          <h4>Tournaments Played</h4>
          <p>{profile.stats.tournamentsPlayed}</p>
        </div>
        <div className={styles.statCard}>
          <h4>Tournaments Won</h4>
          <p>{profile.stats.tournamentsWon}</p>
        </div>
        <div className={styles.statCard}>
          <h4>Win Rate</h4>
          <p>{winRate}%</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
