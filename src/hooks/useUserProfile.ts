// src/hooks/useUserProfile.ts
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Firestore, doc, getDoc, writeBatch, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Define the structure of a user's profile, now with photoURL
export interface UserProfile {
  uid: string;
  username: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
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

  // Effect to listen for real-time updates on the user's profile
  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (user && db) {
      setIsLoadingProfile(true);
      const profileDocRef = doc(db, 'users', user.uid);
      
      // Set up the real-time listener
      unsubscribe = onSnapshot(profileDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          setUserProfile(null);
        }
        setIsLoadingProfile(false);
      }, (error) => {
        console.error("Error listening to user profile:", error);
        setIsLoadingProfile(false);
      });

    } else {
      // No user, so no profile to load.
      setUserProfile(null);
      setIsLoadingProfile(false);
    }
    
    // Cleanup function to unsubscribe from the listener when the component unmounts or user changes
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
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
        photoURL: user.photoURL,
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
      
      // No need to call setUserProfile here, the onSnapshot listener will handle it automatically.
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

      const snapshot = await uploadBytes(storageRef, image);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { photoURL: downloadURL });

      // No need to call setUserProfile here, the onSnapshot listener will handle it automatically.

    } catch (error) {
      console.error("Error uploading profile picture:", error);
      alert("Failed to upload picture. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return { userProfile, isLoadingProfile, isUploading, createUserProfile, saveProfilePicture };
};
