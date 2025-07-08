// src/hooks/useUserProfile.ts
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Firestore, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';

// Define the structure of a user's profile
export interface UserProfile {
  uid: string;
  username: string;
  displayName: string | null;
  email: string | null;
  createdAt: Date;
}

export const useUserProfile = (user: User | null, db: Firestore | null) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Effect to load the user's profile from Firestore
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user || !db) {
        // If there's no user, there's no profile to load.
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
        // User is authenticated but has no profile document yet.
        setUserProfile(null);
      }
      setIsLoadingProfile(false);
    };

    fetchUserProfile();
  }, [user, db]);

  // Function to create a new user profile with a unique username
  const createUserProfile = async (username: string): Promise<{ success: boolean; message: string }> => {
    if (!user || !db) {
      return { success: false, message: 'User not authenticated.' };
    }

    // Sanitize username: lowercase and remove invalid characters
    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (sanitizedUsername.length < 3) {
      return { success: false, message: 'Username must be at least 3 valid characters.' };
    }

    const userDocRef = doc(db, 'users', user.uid);
    const usernameDocRef = doc(db, 'usernames', sanitizedUsername);

    try {
      // Use a batch write to ensure both documents are created or neither are.
      const batch = writeBatch(db);

      // Check if username is already taken
      const usernameDoc = await getDoc(usernameDocRef);
      if (usernameDoc.exists()) {
        return { success: false, message: 'Username is already taken.' };
      }

      const newProfile: UserProfile = {
        uid: user.uid,
        username: sanitizedUsername,
        displayName: user.displayName,
        email: user.email,
        createdAt: new Date(),
      };

      // Set the main user profile document
      batch.set(userDocRef, newProfile);
      // Set the username lookup document to reserve the name
      batch.set(usernameDocRef, { uid: user.uid });

      await batch.commit();
      
      setUserProfile(newProfile); // Update local state
      return { success: true, message: 'Profile created successfully!' };
    } catch (error) {
      console.error("Error creating user profile:", error);
      return { success: false, message: 'An error occurred. Please try again.' };
    }
  };

  return { userProfile, isLoadingProfile, createUserProfile };
};
