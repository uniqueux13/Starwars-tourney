// src/components/ProfilePage/ProfilePage.tsx
import React, { useState, useRef } from 'react';
import styles from './ProfilePage.module.css';
import { UserProfile } from '../../hooks/useUserProfile';
import ProfilePictureEditor from '../ProfilePictureEditor/ProfilePictureEditor';

interface ProfilePageProps {
  profile: UserProfile;
  isCurrentUser: boolean; // To know if we should show the edit button
  onBack: () => void;
  onSaveProfilePicture: (image: Blob) => Promise<void>; // Function to handle the upload
  isUploading: boolean;
}

const ProfilePage: React.FC<ProfilePageProps> = ({
  profile,
  isCurrentUser,
  onBack,
  onSaveProfilePicture,
  isUploading,
}) => {
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const winRate = profile.stats.tournamentsPlayed > 0
    ? ((profile.stats.tournamentsWon / profile.stats.tournamentsPlayed) * 100).toFixed(1)
    : '0.0';
  
  const photoURL = profile.photoURL || `https://placehold.co/128x128/1a1a2e/feda4a?text=${profile.username.charAt(0).toUpperCase()}`;
  
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        if (typeof reader.result === 'string') {
          setImageToCrop(reader.result);
        }
      });
      reader.readAsDataURL(e.target.files[0]);
      // Reset the input value to allow re-selecting the same file
      e.target.value = '';
    }
  };

  const handleSaveCrop = async (image: Blob) => {
    await onSaveProfilePicture(image);
    setImageToCrop(null); // Close the editor on save
  };

  return (
    <>
      {imageToCrop && (
        <ProfilePictureEditor 
          imageSrc={imageToCrop}
          onSave={handleSaveCrop}
          onCancel={() => setImageToCrop(null)}
          isUploading={isUploading}
        />
      )}

      <div className={styles.profileContainer}>
        <button onClick={onBack} className={styles.backButton}>&larr; Back to Dashboard</button>
        <div className={styles.profileHeader}>
          <div className={styles.imageContainer}>
            <img src={photoURL} alt={profile.username} className={styles.profileImage} />
            {isCurrentUser && (
              <button 
                className={styles.changePictureButton} 
                onClick={() => fileInputRef.current?.click()}
                title="Change Profile Picture"
              >
                📷
              </button>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={onFileChange} 
            style={{ display: 'none' }} 
            accept="image/png, image/jpeg"
          />
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
    </>
  );
};

export default ProfilePage;
