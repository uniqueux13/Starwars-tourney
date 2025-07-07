// src/components/Header/Header.tsx
import React from 'react';
import { User } from 'firebase/auth';
// Adjust the path and filename to match your actual CSS module file
import styles from './Header.module.css'

interface HeaderProps {
    user: User | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
    return (
        <header className={styles.header}>
            <div className={styles.userInfo}>
                {user && (
                    <>
                        <span>Welcome, {user.displayName || 'Pilot'}</span>
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
