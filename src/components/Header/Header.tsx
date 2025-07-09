// src/components/Header/Header.tsx
import React from 'react';
import styles from './Header.module.css';
import { User } from 'firebase/auth';
import { UserProfile } from '../../hooks/useUserProfile';

interface HeaderProps {
  user: User | null;
  userProfile: UserProfile | null;
  onViewProfile: (profileId: string) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, userProfile, onViewProfile, onLogout }) => {
  const displayName = userProfile?.username || user?.displayName || 'Pilot';
  const photoURL = userProfile?.photoURL || 'https://placehold.co/40x40/2a2a4e/e0e0ff?text=P';

  return (
    <header className={styles.header}>
      <div className={styles.userInfo}>
        {user && userProfile && (
          <>
            <img src={photoURL} alt="Profile" className={styles.profileImage} />
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
