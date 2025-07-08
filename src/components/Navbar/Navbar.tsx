// src/components/Navbar/Navbar.tsx
import React from 'react';
import styles from './Navbar.module.css';
import { UserProfile } from '../../hooks/useUserProfile';

interface NavbarProps {
  userProfile: UserProfile;
  onNavigate: (view: 'dashboard' | 'profile', profileId?: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ userProfile, onNavigate }) => {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navLinks}>
        <button onClick={() => onNavigate('dashboard')} className={styles.navButton}>
          Dashboard
        </button>
        <button onClick={() => onNavigate('profile', userProfile.uid)} className={styles.navButton}>
          My Profile
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
