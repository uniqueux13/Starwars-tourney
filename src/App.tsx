import React, { useState, useEffect } from "react";

// Firebase Imports
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { getFirestore, Firestore, doc, getDoc } from "firebase/firestore";

// Component Imports
import Header from "./components/Header/Header";
import TournamentBracket from "./components/TournamentBracket/TournamentBracket";
import WinnerDisplay from "./components/WinnerDisplay/WinnerDisplay";
import Login from "./components/Login/Login";
import ProfileSetup from "./components/ProfileSetup/ProfileSetup";
import Dashboard from "./components/Dashboard/Dashboard";
import TournamentManagement from "./components/TournamentManagement/TournamentManagement";
import ProfilePage from "./components/ProfilePage/ProfilePage";

// Hook Imports
import { useInviteHandler } from "./hooks/useInviteHandler";
import { useUserProfile, UserProfile } from "./hooks/useUserProfile";

// --- STYLES ---
import styles from "./app.module.css";

// --- Firebase Config Validation (Vite) ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID
};

const isFirebaseConfigValid = 
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId;

// --- MAIN APP COMPONENT ---
export default function App() {
  // Firebase State
  const [auth, setAuth] = useState<ReturnType<typeof getAuth> | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // View-management state
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);

  // Custom Hooks
  const { userProfile, isLoadingProfile, createUserProfile } = useUserProfile(user, db);
  const {
    activeTournament,
    openTournaments,
    isLoading: isLoadingTournament,
    isJoining,
    isStarting,
    isDeleting,
    isKickingPlayerId,
    isSavingSettings,
    createTournament,
    joinTournament,
    startTournament,
    deleteTournament,
    kickPlayer,
    manageTournament,
    generateInviteLink,
    saveTournamentSettings,
    setWinner,
    leaveTournament
  } = useInviteHandler(user, userProfile, db);

  // --- FIREBASE SETUP ---
  useEffect(() => {
    if (isFirebaseConfigValid) {
      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);

      setAuth(authInstance);
      setDb(dbInstance); 

      const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
        setUser(currentUser);
        setIsLoadingAuth(false);
      });

      return () => unsubscribe();
    } else {
        setIsLoadingAuth(false);
    }
  }, []);

  const handleLogin = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during sign-in:", error);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await leaveTournament();
      await auth.signOut();
    }
  };

  // --- Navigation Logic ---
  const handleViewProfile = async (profileId: string) => {
    if (!db) return;
    const profileDocRef = doc(db, 'users', profileId);
    const profileDocSnap = await getDoc(profileDocRef);
    if (profileDocSnap.exists()) {
      setViewingProfile(profileDocSnap.data() as UserProfile);
    } else {
      alert("Could not find this user's profile.");
    }
  };

  const handleBackToDashboard = () => {
    setViewingProfile(null);
  };

  // --- RENDER LOGIC ---
  const isLoading = isLoadingAuth || isLoadingProfile || isLoadingTournament;

  const renderContent = () => {
    if (isLoading) {
      return <div className={styles.loading}>Loading Transmission...</div>;
    }

    if (!user) {
      return <Login onLogin={handleLogin} />;
    }

    if (!userProfile) {
      return <ProfileSetup onCreateProfile={createUserProfile} />;
    }

    if (viewingProfile) {
      return <ProfilePage profile={viewingProfile} onBack={handleBackToDashboard} />;
    }

    if (activeTournament) {
      const isOrganizer = activeTournament.organizerId === user.uid;

      if (isOrganizer && activeTournament.status === 'setup') {
        return (
          <TournamentManagement
            tournament={activeTournament}
            currentUser={user}
            onStartTournament={startTournament}
            onDeleteTournament={deleteTournament}
            onKickPlayer={kickPlayer}
            onGenerateInvite={generateInviteLink}
            onSaveSettings={saveTournamentSettings}
            onViewProfile={handleViewProfile}
            isStarting={isStarting}
            isDeleting={isDeleting}
            isKickingPlayerId={isKickingPlayerId}
            isSavingSettings={isSavingSettings}
          />
        );
      }
      
      return (
        <div className={styles.bracketViewContainer}>
          <h2 className={styles.tournamentTitle}>{activeTournament.name}</h2>
          {activeTournament.status === 'completed' && activeTournament.tournamentWinner && (
             <WinnerDisplay winner={activeTournament.tournamentWinner} onClose={leaveTournament} />
          )}
          <TournamentBracket
            matches={activeTournament.matches}
            onSetWinner={setWinner}
          />
          <div className={styles.leaveButtonContainer}>
              <button onClick={leaveTournament} className={styles.leaveButton}>
                {isOrganizer ? 'End & Leave' : 'Leave Tournament'}
              </button>
          </div>
        </div>
      );
    }

    return (
      <Dashboard
        username={userProfile.username}
        currentUser={user}
        activeTournament={activeTournament}
        openTournaments={openTournaments}
        isJoining={isJoining}
        joinTournament={joinTournament}
        manageTournament={manageTournament}
        createTournament={createTournament}
        leaveTournament={leaveTournament}
        onViewProfile={handleViewProfile}
      />
    );
  };

  if (!isFirebaseConfigValid && !isLoading) {
      return (
          <div className={styles.errorContainer}>
              <h1>Configuration Error</h1>
              <p>Firebase configuration is missing or incomplete.</p>
              <p>Please ensure your <code>.env</code> file is set up correctly with the <code>VITE_</code> prefix for local development, or that environment variables are set on your deployment server.</p>
          </div>
      )
  }

  return (
    <div className={styles.app}>
      <Header user={user} userProfile={userProfile} onViewProfile={handleViewProfile} onLogout={handleLogout} />
      <div className={styles.content}>
        {renderContent()}
      </div>
    </div>
  );
}
