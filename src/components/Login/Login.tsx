// src/components/Login/Login.tsx
import React, { useState } from 'react';
import styles from './Login.module.css';

interface LoginProps {
  onGoogleLogin: () => void;
  onEmailLogin: (email: string, password: string) => Promise<void>;
  onEmailSignUp: (email: string, password: string) => Promise<void>;
  authError: string | null;
}

const Login: React.FC<LoginProps> = ({ onGoogleLogin, onEmailLogin, onEmailSignUp, authError }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isLoginView) {
        await onEmailLogin(email, password);
      } else {
        await onEmailSignUp(email, password);
      }
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <h2 className={styles.title}>{isLoginView ? 'Login' : 'Create Account'}</h2>
      
      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          className={styles.input}
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className={styles.input}
          required
        />
        {authError && <p className={styles.errorText}>{authError}</p>}
        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : (isLoginView ? 'Login' : 'Sign Up')}
        </button>
      </form>

      {/* Toggle between Login and Sign Up */}
      <button onClick={() => setIsLoginView(!isLoginView)} className={styles.toggleButton}>
        {isLoginView ? 'Need an account? Sign Up' : 'Already have an account? Login'}
      </button>

      <div className={styles.divider}>
        <span>OR</span>
      </div>

      {/* Google Sign-In Button */}
      <button onClick={onGoogleLogin} className={styles.googleButton}>
        Sign In with Google
      </button>
    </div>
  );
};

export default Login;
