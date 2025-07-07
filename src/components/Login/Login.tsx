// src/components/Login/Login.tsx
import React from 'react';
import styles from './Login.module.css'

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    return (
        <div className={styles.loginContainer}>
            <h2 className={styles.title}>Authentication Required</h2>
            <p className={styles.subtitle}>Please log in to access the Tournament Hub.</p>
            <button onClick={onLogin} className={styles.loginButton}>
                Sign In with Google
            </button>
        </div>
    );
};

export default Login;
