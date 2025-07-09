// src/hooks/useTournament.ts
import { useState, useEffect, useCallback } from 'react';
import { Player, Match } from '../types';
import { User } from 'firebase/auth';
import { 
  Firestore, 
  doc, 
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  increment,
  onSnapshot, // Import the real-time listener
  Unsubscribe
} from 'firebase/firestore';
import { UserProfile } from './useUserProfile';
import { TournamentRules } from '../components/TournamentSettings/TournamentSettings';

export interface Tournament {
  id: string;
  name: string;
  organizerId: string;
  organizerUsername: string;
  createdAt: Date;
  status: 'setup' | 'in_progress' | 'completed';
  players: Player[];
  matches: Match[];
  isBracketGenerated: boolean;
  tournamentWinner: Player | null;
  inviteToken?: string;
  rules?: TournamentRules;
}

export const useTournament = (user: User | null, userProfile: UserProfile | null, db: Firestore | null, inviteToken: string | null) => {
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [openTournaments, setOpenTournaments] = useState<Tournament[]>([]);
  const [myPlayers, setMyPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isKickingPlayerId, setIsKickingPlayerId] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // --- REAL-TIME LISTENERS ---
  useEffect(() => {
    if (!db) return;

    // Listener for the list of open tournaments
    const tournamentsCol = collection(db, 'tournaments');
    const q = query(tournamentsCol, where("status", "==", "setup"));
    const unsubscribeOpenTournaments = onSnapshot(q, (querySnapshot) => {
      const tournaments: Tournament[] = [];
      querySnapshot.forEach((doc) => {
        tournaments.push({ id: doc.id, ...doc.data() } as Tournament);
      });
      setOpenTournaments(tournaments);
    });

    // This cleanup function will run when the component unmounts
    return () => {
      unsubscribeOpenTournaments();
    };
  }, [db]);


  useEffect(() => {
    // This effect manages the active tournament and user-specific data
    let unsubscribeUser: Unsubscribe | undefined;
    let unsubscribeActiveTournament: Unsubscribe | undefined;

    const setupListeners = async () => {
        if (!user || !db || !userProfile) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // Listener for the user's own document
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeUser = onSnapshot(userDocRef, async (userDocSnap) => {
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                setMyPlayers(userData.myPlayers || []);

                const activeId = userData.activeTournamentId;

                // If the active tournament changes, update the listener
                if (activeId) {
                    const tournamentDocRef = doc(db, 'tournaments', activeId);
                    
                    // Unsubscribe from the old tournament listener if it exists
                    if (unsubscribeActiveTournament) unsubscribeActiveTournament();

                    unsubscribeActiveTournament = onSnapshot(tournamentDocRef, (tournamentDocSnap) => {
                        if (tournamentDocSnap.exists()) {
                            setActiveTournament({ id: activeId, ...tournamentDocSnap.data() } as Tournament);
                        } else {
                            // The tournament was deleted, so clear the active state
                            setActiveTournament(null);
                        }
                    });
                } else {
                    // No active tournament, clear state and any existing listener
                    if (unsubscribeActiveTournament) unsubscribeActiveTournament();
                    setActiveTournament(null);
                }
            }
        });

        // Handle initial invite token check after main listeners are set up
        if (inviteToken) {
            await joinTournamentByInvite(inviteToken);
        }

        setIsLoading(false);
    };

    setupListeners();

    // Cleanup function for all listeners in this effect
    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeActiveTournament) unsubscribeActiveTournament();
    };
  }, [user, db, userProfile, inviteToken]);


  // --- MODIFIED FUNCTIONS (Simpler due to real-time listeners) ---

  const joinTournament = useCallback(async (id: string) => {
    if (!db || !user || !userProfile) return;
    setIsJoining(id);
    try {
      const tournamentDocRef = doc(db, 'tournaments', id);
      const playerToAdd: Player = { id: user.uid, name: userProfile.username, userId: user.uid };
      await updateDoc(tournamentDocRef, { players: arrayUnion(playerToAdd) });
      // No need to manually refresh, the onSnapshot listener will do it.
    } catch (error) {
      console.error("Error joining tournament:", error);
    } finally {
      setIsJoining(null);
    }
  }, [db, user, userProfile]);

  const joinTournamentByInvite = useCallback(async (token: string) => {
    if (!db || !user || !userProfile) return;
    setIsJoining('invite');
    try {
        const tournamentsCol = collection(db, 'tournaments');
        const q = query(tournamentsCol, where("inviteToken", "==", token), where("status", "==", "setup"));
        const querySnapshot = await getDocs(q); // getDocs is fine here, it's a one-time check
        if (querySnapshot.empty) {
            alert("This invitation is invalid or has expired.");
            return;
        }
        const tournamentDoc = querySnapshot.docs[0];
        await joinTournament(tournamentDoc.id);
    } catch (error) {
        console.error("Error joining by invite:", error);
    } finally {
        setIsJoining(null);
    }
  }, [db, user, userProfile, joinTournament]);


  const manageTournament = async (id: string) => {
    if (!db || !user) return;
    const userDocRef = doc(db, 'users', user.uid);
    // Just update the user's active ID. The listener will do the rest.
    await updateDoc(userDocRef, { activeTournamentId: id });
  };

  const leaveTournament = async () => {
    if (!db || !user || !activeTournament) return;
    
    // If user is a player in setup, remove them from the roster
    if (activeTournament.status === 'setup' && activeTournament.players.some(p => p.id === user.uid)) {
        const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
        const playerToRemove = activeTournament.players.find(p => p.id === user.uid);
        if (playerToRemove) {
            await updateDoc(tournamentDocRef, { players: arrayRemove(playerToRemove) });
        }
    }

    // Clear the active tournament link from the user's profile. The listener will handle the state change.
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { activeTournamentId: null });
  };


  // --- UNCHANGED FUNCTIONS (Logic remains the same) ---

  const saveTournamentSettings = async (settings: TournamentRules) => {
    if (!db || !activeTournament) return;
    setIsSavingSettings(true);
    try {
      const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
      await updateDoc(tournamentDocRef, { rules: settings });
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const generateInviteLink = async (): Promise<string | null> => {
    if (!db || !activeTournament) return null;
    try {
        const token = crypto.randomUUID().slice(0, 8);
        const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
        await updateDoc(tournamentDocRef, { inviteToken: token });
        return `${window.location.origin}?invite=${token}`;
    } catch (error) {
        console.error("Error generating invite link:", error);
        return null;
    }
  };
  
  const kickPlayer = async (playerToKick: Player) => {
    if (!db || !activeTournament || activeTournament.status !== 'setup') return;
    setIsKickingPlayerId(playerToKick.id);
    try {
      const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
      await updateDoc(tournamentDocRef, { players: arrayRemove(playerToKick) });
      const kickedUserDocRef = doc(db, 'users', playerToKick.id);
      const kickedUserDocSnap = await getDoc(kickedUserDocRef);
      if (kickedUserDocSnap.exists() && kickedUserDocSnap.data().activeTournamentId === activeTournament.id) {
          await updateDoc(kickedUserDocRef, { activeTournamentId: null });
      }
    } catch (error) {
      console.error("Error kicking player:", error);
    } finally {
      setIsKickingPlayerId(null);
    }
  };

  const startTournament = async () => {
    if (!activeTournament || activeTournament.players.length < 2 || !db) return;
    setIsStarting(true);
    try {
      const { players, id: tournamentId } = activeTournament;
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      const numPlayers = shuffledPlayers.length;
      const bracketSize = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
      const roundOnePlayers: (Player | null)[] = [];
      for (let i = 0; i < bracketSize / 2; i++) {
        roundOnePlayers.push(shuffledPlayers[i] || null);
      }
      for (let i = bracketSize / 2; i < numPlayers; i++) {
        const insertIndex = (i - bracketSize / 2) * 2 + 1;
        roundOnePlayers.splice(insertIndex, 0, shuffledPlayers[i]);
      }
      let allMatches: Match[] = [];
      let matchIdCounter = 0;
      for (let i = 0; i < roundOnePlayers.length; i += 2) {
        const p1 = roundOnePlayers[i];
        const p2 = roundOnePlayers[i + 1] || { id: 'BYE', name: 'BYE' };
        allMatches.push({ id: matchIdCounter++, round: 1, matchInRound: i / 2, players: [p1, p2], winner: p2.id === 'BYE' ? p1 : null });
      }
      let currentRound = 1;
      let matchesInCurrentRound = allMatches.length;
      while (matchesInCurrentRound > 1) {
        const matchesInNextRound = matchesInCurrentRound / 2;
        for (let i = 0; i < matchesInNextRound; i++) {
          allMatches.push({ id: matchIdCounter++, round: currentRound + 1, matchInRound: i, players: [null, null], winner: null });
        }
        matchesInCurrentRound = matchesInNextRound;
        currentRound++;
      }
      const finalMatches = [...allMatches];
      finalMatches.filter((m) => m.round === 1 && m.winner).forEach((match) => {
        const nextRound = match.round + 1;
        const nextMatchInRound = Math.floor(match.matchInRound / 2);
        const playerSlot = match.matchInRound % 2;
        const nextMatch = finalMatches.find((m) => m.round === nextRound && m.matchInRound === nextMatchInRound);
        if (nextMatch) {
          nextMatch.players[playerSlot] = match.winner;
        }
      });
      const tournamentDocRef = doc(db, 'tournaments', tournamentId);
      const batch = writeBatch(db);
      batch.update(tournamentDocRef, { matches: finalMatches, isBracketGenerated: true, status: 'in_progress' });
      players.forEach(player => {
        const playerDocRef = doc(db, 'users', player.id);
        batch.update(playerDocRef, { activeTournamentId: tournamentId });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error starting tournament:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const deleteTournament = async () => {
    if (!db || !user || !activeTournament) return;
    setIsDeleting(true);
    try {
      const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
      const userDocRef = doc(db, 'users', user.uid);
      const batch = writeBatch(db);
      batch.delete(tournamentDocRef);
      batch.update(userDocRef, { activeTournamentId: null });
      await batch.commit();
    } catch (error) {
      console.error("Error deleting tournament:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const createTournament = async (name: string) => {
    if (!db || !user || !userProfile) return;
    setIsLoading(true);
    const newTournamentId = crypto.randomUUID();
    const tournamentDocRef = doc(db, 'tournaments', newTournamentId);
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const organizerAsPlayer: Player = { id: user.uid, name: userProfile.username, userId: user.uid };
      const newTournamentData: Omit<Tournament, 'id'> = {
        name: name,
        organizerId: user.uid,
        organizerUsername: userProfile.username,
        createdAt: new Date(),
        status: 'setup',
        players: [organizerAsPlayer],
        matches: [],
        isBracketGenerated: false,
        tournamentWinner: null,
        rules: { description: '', schedule: '', bannedItems: [] }
      };
      const batch = writeBatch(db);
      batch.set(tournamentDocRef, newTournamentData);
      batch.set(userDocRef, { activeTournamentId: newTournamentId }, { merge: true });
      batch.update(userDocRef, { 'stats.tournamentsHosted': increment(1) });
      await batch.commit();
    } catch (error) {
      console.error("Error creating tournament:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const setWinner = async (matchId: number, winner: Player) => {
    if (!activeTournament || !db) return;
    let nextMatches = [...activeTournament.matches];
    const matchIndex = nextMatches.findIndex((m) => m.id === matchId);
    if (matchIndex === -1) return;
    nextMatches[matchIndex].winner = winner;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(activeTournament.players.length)));
    const totalRounds = Math.log2(bracketSize);
    const currentMatch = nextMatches[matchIndex];
    let finalWinner: Player | null = null;
    let newStatus = activeTournament.status;
    if (currentMatch.round === totalRounds) {
      finalWinner = winner;
      newStatus = 'completed';
      const batch = writeBatch(db);
      const winnerStatsRef = doc(db, 'users', winner.id);
      batch.update(winnerStatsRef, { 'stats.tournamentsWon': increment(1) });
      activeTournament.players.forEach(player => {
        if (player) {
            const playerStatsRef = doc(db, 'users', player.id);
            batch.update(playerStatsRef, { 'stats.tournamentsPlayed': increment(1) });
        }
      });
      await batch.commit();
    } else {
      const nextRound = currentMatch.round + 1;
      const nextMatchInRound = Math.floor(currentMatch.matchInRound / 2);
      const nextMatchIndex = nextMatches.findIndex((m) => m.round === nextRound && m.matchInRound === nextMatchInRound);
      if (nextMatchIndex !== -1) {
        const playerSlot = currentMatch.matchInRound % 2;
        nextMatches[nextMatchIndex].players[playerSlot] = winner;
      }
    }
    const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
    await updateDoc(tournamentDocRef, {
        matches: nextMatches,
        tournamentWinner: finalWinner,
        status: newStatus
    });
  };

  return {
    activeTournament,
    openTournaments,
    myPlayers,
    isLoading,
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
  };
};
