// src/components/Header/Header.tsx
import React from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../../hooks/useUserProfile'; // Import the UserProfile type
import styles from './Header.module.css';

interface HeaderProps {
  user: User | null;
  userProfile: UserProfile | null;
  onViewProfile: (profileId: string) => void; // Add the new prop here
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, userProfile, onViewProfile, onLogout }) => {
  // Determine the best name to display
  const displayName = userProfile?.username || user?.displayName || 'Pilot';

  return (
    <header className={styles.header}>
      <div className={styles.userInfo}>
        {user && userProfile && (
          <>
            <span className={styles.welcomeText}>
              Welcome, 
              <button onClick={() => onViewProfile(userProfile.uid)} className={styles.displayNameButton}>
                {displayName}
              </button>
            </span>
            <button onClick={onLogout} className={styles.logoutButton}>Logout</button>
          </>
        )}
      </div>
      <h1 className={styles.mainTitle}>KYBER TOURNAMENT HUB</h1>
      <h2 className={styles.subTitle}>Star Wars: Battlefront II</h2>
    </header>
  );
};

export default Header;
