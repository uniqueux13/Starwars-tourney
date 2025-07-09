// src/hooks/useTeams.ts
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Firestore, 
  doc, 
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  onSnapshot, // Import the real-time listener
  Unsubscribe
} from 'firebase/firestore';
import { UserProfile } from './useUserProfile';
import { Tournament } from './useTournament';

// Define the structure of a team member
export interface TeamMember {
    uid: string;
    username: string;
    photoURL: string | null;
}

// Define the structure of a Team
export interface Team {
  id: string; // Corresponds to the captain's UID
  name: string;
  captainId: string;
  members: TeamMember[];
  tournamentId: string;
  color: string;
}

export const useTeams = (user: User | null, userProfile: UserProfile | null, db: Firestore | null, activeTournament: Tournament | null) => {
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);

  // Effect to listen for real-time updates on the user's team
  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    const setupTeamListener = async () => {
      if (!db || !user || !activeTournament || activeTournament.type !== '4v4 HvV') {
        setMyTeam(null);
        setIsLoadingTeam(false);
        return;
      }
      
      setIsLoadingTeam(true);

      // Find the team the user is a part of
      const team = activeTournament.players.find(p => 'members' in p && p.members.some(m => m.uid === user.uid)) as Team | undefined;

      if (team) {
        const teamDocRef = doc(db, 'tournaments', activeTournament.id, 'teams', team.id);
        
        // Listen for real-time changes to the team document
        unsubscribe = onSnapshot(teamDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setMyTeam(docSnap.data() as Team);
          } else {
            setMyTeam(null);
          }
          setIsLoadingTeam(false);
        });
      } else {
        setMyTeam(null);
        setIsLoadingTeam(false);
      }
    };

    setupTeamListener();

    // Cleanup the listener when the component unmounts or dependencies change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, db, activeTournament, userProfile]);

  const invitePlayerToTeam = async (playerToInvite: UserProfile) => {
    if (!db || !myTeam || myTeam.members.length >= 4) return;

    const teamDocRef = doc(db, 'tournaments', myTeam.tournamentId, 'teams', myTeam.id);
    const newMember: TeamMember = {
        uid: playerToInvite.uid,
        username: playerToInvite.username,
        photoURL: playerToInvite.photoURL ?? null
    };

    await updateDoc(teamDocRef, {
        members: arrayUnion(newMember)
    });
    // No need to set local state, onSnapshot will handle it.
  };

  const removeMemberFromTeam = async (memberId: string) => {
    if (!db || !myTeam) return;
    
    const memberToRemove = myTeam.members.find(m => m.uid === memberId);
    if (!memberToRemove) return;

    const teamDocRef = doc(db, 'tournaments', myTeam.tournamentId, 'teams', myTeam.id);
    await updateDoc(teamDocRef, {
        members: arrayRemove(memberToRemove)
    });
    // No need to set local state, onSnapshot will handle it.
  };

  const leaveOrDisbandTeam = async () => {
    if (!db || !user || !myTeam || !activeTournament) return;

    const isCaptain = myTeam.captainId === user.uid;
    const teamDocRef = doc(db, 'tournaments', myTeam.tournamentId, 'teams', myTeam.id);
    const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
    const userDocRef = doc(db, 'users', user.uid);
    
    const batch = writeBatch(db);

    if (isCaptain) {
      // Captain disbands the team
      batch.delete(teamDocRef);
      // Also remove the team from the tournament's main player list
      batch.update(tournamentDocRef, { players: arrayRemove(myTeam) });
    } else {
      // Member leaves the team
      const memberToRemove = myTeam.members.find(m => m.uid === user.uid);
      if (memberToRemove) {
        batch.update(teamDocRef, { members: arrayRemove(memberToRemove) });
      }
    }
    
    // The user is no longer in this tournament
    batch.update(userDocRef, { activeTournamentId: null });
    await batch.commit();
    // No need to set local state, onSnapshot will handle it.
  };

  const searchUsers = async (usernameQuery: string): Promise<UserProfile[]> => {
    if (!db || !usernameQuery) return [];

    const usersCol = collection(db, 'users');
    const q = query(usersCol, where("username", ">=", usernameQuery.toLowerCase()), where("username", "<=", usernameQuery.toLowerCase() + '\uf8ff'));
    
    const querySnapshot = await getDocs(q);
    const users: UserProfile[] = [];
    querySnapshot.forEach(doc => {
        users.push(doc.data() as UserProfile);
    });
    return users;
  };

  return {
    myTeam,
    isLoadingTeam,
    invitePlayerToTeam,
    removeMemberFromTeam,
    leaveOrDisbandTeam,
    searchUsers
  };
};
