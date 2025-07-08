// src/components/ProfileSetup/ProfileSetup.tsx
import React, { useState } from 'react';
import styles from './ProfileSetup.module.css';

interface ProfileSetupProps {
  onCreateProfile: (username: string) => Promise<{ success: boolean; message: string }>;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ onCreateProfile }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const result = await onCreateProfile(username);
    
    if (!result.success) {
      setError(result.message);
      setIsSubmitting(false);
    }
    // On success, the parent component will detect the profile change and unmount this component.
  };

  return (
    <div className={styles.setupContainer}>
      <h2 className={styles.title}>Complete Your Profile</h2>
      <p className={styles.subtitle}>Choose a unique username to join the ranks.</p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username..."
          className={styles.input}
          disabled={isSubmitting}
        />
        <button type="submit" className={styles.button} disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Profile'}
        </button>
        {error && <p className={styles.errorText}>{error}</p>}
      </form>
    </div>
  );
};

export default ProfileSetup;
