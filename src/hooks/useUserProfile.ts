// src/hooks/useUserProfile.ts
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Firestore, doc, getDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Define the structure of a user's profile, now with photoURL
export interface UserProfile {
  uid: string;
  username: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null; // Added photoURL
  createdAt: Date;
  stats: {
    tournamentsHosted: number;
    tournamentsPlayed: number;
    tournamentsWon: number;
  };
}

export const useUserProfile = (user: User | null, db: Firestore | null) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Effect to load the user's profile from Firestore
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user || !db) {
        setUserProfile(null);
        setIsLoadingProfile(false);
        return;
      }

      setIsLoadingProfile(true);
      const profileDocRef = doc(db, 'users', user.uid);
      const profileDocSnap = await getDoc(profileDocRef);

      if (profileDocSnap.exists()) {
        setUserProfile(profileDocSnap.data() as UserProfile);
      } else {
        setUserProfile(null);
      }
      setIsLoadingProfile(false);
    };

    fetchUserProfile();
  }, [user, db]);

  const createUserProfile = async (username: string): Promise<{ success: boolean; message: string }> => {
    if (!user || !db) {
      return { success: false, message: 'User not authenticated.' };
    }

    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (sanitizedUsername.length < 3) {
      return { success: false, message: 'Username must be at least 3 valid characters.' };
    }

    const userDocRef = doc(db, 'users', user.uid);
    const usernameDocRef = doc(db, 'usernames', sanitizedUsername);

    try {
      const batch = writeBatch(db);

      const usernameDoc = await getDoc(usernameDocRef);
      if (usernameDoc.exists()) {
        return { success: false, message: 'Username is already taken.' };
      }

      const newProfile: UserProfile = {
        uid: user.uid,
        username: sanitizedUsername,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL, // Save the photoURL on creation
        createdAt: new Date(),
        stats: {
          tournamentsHosted: 0,
          tournamentsPlayed: 0,
          tournamentsWon: 0,
        }
      };

      batch.set(userDocRef, newProfile);
      batch.set(usernameDocRef, { uid: user.uid });

      await batch.commit();
      
      setUserProfile(newProfile);
      return { success: true, message: 'Profile created successfully!' };
    } catch (error) {
      console.error("Error creating user profile:", error);
      return { success: false, message: 'An error occurred. Please try again.' };
    }
  };

  // Function to upload the profile picture
  const saveProfilePicture = async (image: Blob) => {
    if (!user || !db) return;

    setIsUploading(true);
    try {
      const storage = getStorage();
      const filePath = `profile-pictures/${user.uid}.jpg`;
      const storageRef = ref(storage, filePath);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, image);
      // Get the public URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Save the URL to the user's profile document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { photoURL: downloadURL });

      // Update the local state to reflect the change immediately
      setUserProfile(prev => prev ? { ...prev, photoURL: downloadURL } : null);

    } catch (error) {
      console.error("Error uploading profile picture:", error);
      alert("Failed to upload picture. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return { userProfile, isLoadingProfile, isUploading, createUserProfile, saveProfilePicture };
};
