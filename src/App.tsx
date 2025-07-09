import React, { useState, useEffect, Suspense } from "react";

// Firebase Imports
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  AuthError
} from "firebase/auth";
import { getFirestore, Firestore, doc, getDoc } from "firebase/firestore";

// Component Imports
import Header from "./components/Header/Header";
import Navbar from "./components/Navbar/Navbar";
import Login from "./components/Login/Login";
import ProfileSetup from "./components/ProfileSetup/ProfileSetup";
import Dashboard from "./components/Dashboard/Dashboard";

// LAZY-LOADED COMPONENTS
const TournamentBracket = React.lazy(() => import("./components/TournamentBracket/TournamentBracket"));
const WinnerDisplay = React.lazy(() => import("./components/WinnerDisplay/WinnerDisplay"));
const TournamentManagement = React.lazy(() => import("./components/TournamentManagement/TournamentManagement"));
const ProfilePage = React.lazy(() => import("./components/ProfilePage/ProfilePage"));
const TeamManagement = React.lazy(() => import("./components/TeamManagement/TeamManagement"));


// Hook Imports
import { useInviteHandler } from "./hooks/useInviteHandler";
import { useUserProfile, UserProfile } from "./hooks/useUserProfile";
import { useTeams } from "./hooks/useTeams";

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

type AppView = 'dashboard' | 'profile';

// --- MAIN APP COMPONENT ---
export default function App() {
  // Firebase State
  const [auth, setAuth] = useState<ReturnType<typeof getAuth> | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // View-management state
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);


  // Custom Hooks
  const { userProfile, isLoadingProfile, isUploading, createUserProfile, saveProfilePicture } = useUserProfile(user, db);
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
  
  const {
    myTeam,
    isLoadingTeam,
    invitePlayerToTeam,
    removeMemberFromTeam,
    leaveOrDisbandTeam,
    searchUsers
  } = useTeams(user, userProfile, db, activeTournament);

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
        setAuthError(null);
        setIsLoadingAuth(false);
      });

      return () => unsubscribe();
    } else {
        setIsLoadingAuth(false);
    }
  }, []);

  // --- AUTHENTICATION HANDLERS ---
  const handleGoogleLogin = async () => {
    if (!auth) return;
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      setAuthError((error as AuthError).message);
    }
  };

  const handleEmailLogin = async (email: string, password: string) => {
    if (!auth) return;
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error during email sign-in:", error);
      setAuthError((error as AuthError).message);
    }
  };

  const handleEmailSignUp = async (email: string, password: string) => {
    if (!auth) return;
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error during email sign-up:", error);
      setAuthError((error as AuthError).message);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await leaveTournament();
      await auth.signOut();
    }
  };

  // --- Navigation Logic ---
  const handleNavigate = async (view: AppView, profileId?: string) => {
    if (view === 'profile' && profileId) {
        if (!db) return;
        const profileDocRef = doc(db, 'users', profileId);
        const profileDocSnap = await getDoc(profileDocRef);
        if (profileDocSnap.exists()) {
            setViewedProfile(profileDocSnap.data() as UserProfile);
            setCurrentView('profile');
        } else {
            alert("Could not find this user's profile.");
        }
    } else {
        setViewedProfile(null);
        setCurrentView(view);
    }
  };

  // --- RENDER LOGIC ---
  const isLoading = isLoadingAuth || isLoadingProfile || isLoadingTournament || isLoadingTeam;

  const renderContent = () => {
    if (isLoading) {
      return <div className={styles.loading}>Loading Transmission...</div>;
    }

    if (!user) {
      return (
        <Login 
          onGoogleLogin={handleGoogleLogin}
          onEmailLogin={handleEmailLogin}
          onEmailSignUp={handleEmailSignUp}
          authError={authError}
        />
      );
    }

    if (!userProfile) {
      return <ProfileSetup onCreateProfile={createUserProfile} />;
    }

    if (currentView === 'profile' && viewedProfile) {
        return (
            <ProfilePage 
                profile={viewedProfile} 
                isCurrentUser={viewedProfile.uid === user.uid}
                onBack={() => handleNavigate('dashboard')}
                onSaveProfilePicture={saveProfilePicture}
                isUploading={isUploading}
            />
        );
    }

    if (activeTournament) {
      const isOrganizer = activeTournament.organizerId === user.uid;

      if (activeTournament.type === '4v4 HvV' && myTeam) {
        return (
            <TeamManagement 
                team={myTeam}
                onSearchUsers={searchUsers}
                onInvitePlayer={invitePlayerToTeam}
                onRemoveMember={removeMemberFromTeam}
                onLeaveTeam={leaveOrDisbandTeam}
                isCaptain={myTeam.captainId === user.uid}
                onViewProfile={(id) => handleNavigate('profile', id)} // Pass the function here
            />
        );
      }

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
            onViewProfile={(id) => handleNavigate('profile', id)}
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
            organizerId={activeTournament.organizerId}
            currentUserId={user.uid}
          />
          <div className={styles.leaveButtonContainer}>
              <button onClick={leaveTournament} className={styles.leaveButton}>
                {isOrganizer ? 'End & Leave' : 'Leave Tournament'}
              </button>
          </div>
        </div>
      );
    }

    // Default view is the Dashboard
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
        onViewProfile={(id) => handleNavigate('profile', id)}
      />
    );
  };

  if (!isFirebaseConfigValid && !isLoading) {
      return (
          <div className={styles.errorContainer}>
              <h1>Configuration Error</h1>
              <p>Firebase configuration is missing or incomplete.</p>
          </div>
      )
  }

  return (
    <div className={styles.app}>
      <Header user={user} userProfile={userProfile} onViewProfile={(id) => handleNavigate('profile', id)} onLogout={handleLogout} />
      {user && userProfile && <Navbar userProfile={userProfile} onNavigate={handleNavigate} />}
      <div className={styles.content}>
        <Suspense fallback={<div className={styles.loading}>Loading View...</div>}>
          {renderContent()}
        </Suspense>
      </div>
    </div>
  );
}
