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
  increment,
  onSnapshot,
  Unsubscribe,
  FirestoreError // FIX: Changed FirebaseError to FirestoreError
} from 'firebase/firestore';
import { UserProfile } from './useUserProfile';
import { TournamentRules } from '../components/TournamentSettings/TournamentSettings';

export interface Tournament {
  id: string;
  name: string;
  organizerId: string;
  organizerUsername: string;
  organizerPhotoURL?: string | null;
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

  const fetchOpenTournaments = useCallback(async () => {
    if (!db) return;
    const tournamentsCol = collection(db, 'tournaments');
    const q = query(tournamentsCol, where("status", "==", "setup"));
    const querySnapshot = await getDocs(q);
    const tournaments: Tournament[] = [];
    querySnapshot.forEach((doc) => {
      tournaments.push({ id: doc.id, ...doc.data() } as Tournament);
    });
    setOpenTournaments(tournaments);
  }, [db]);

  const joinTournament = useCallback(async (id: string) => {
    if (!db || !user || !userProfile) return;
    setIsJoining(id);
    try {
      const tournamentDocRef = doc(db, 'tournaments', id);
      
      const tournamentSnap = await getDoc(tournamentDocRef);
      if (!tournamentSnap.exists()) {
          alert("This tournament no longer exists.");
          setIsJoining(null);
          return;
      }
      const tournamentData = tournamentSnap.data() as Tournament;
      
      if (tournamentData.players && tournamentData.players.some(p => p.id === user.uid)) {
          alert("You are already registered for this tournament.");
          setIsJoining(null);
          return;
      }

      const playerToAdd: Player = { 
        id: user.uid, 
        name: userProfile.username, 
        userId: user.uid,
        photoURL: userProfile.photoURL ?? null
      };
      await updateDoc(tournamentDocRef, { players: arrayUnion(playerToAdd) });
      await fetchOpenTournaments();
    } catch (error) {
      console.error("Error joining tournament:", error);
      // FIX: Check for FirestoreError instead of FirebaseError
      if (error instanceof FirestoreError && error.code === 'permission-denied') {
        alert("You do not have permission to join this tournament. Please check Firestore security rules.");
      } else {
        alert("An unexpected error occurred while trying to join. Please check the console for details.");
      }
    } finally {
      setIsJoining(null);
    }
  }, [db, user, userProfile, fetchOpenTournaments]);

  const joinTournamentByInvite = useCallback(async (token: string) => {
    if (!db || !user || !userProfile) return;
    setIsJoining('invite');
    try {
        const tournamentsCol = collection(db, 'tournaments');
        const q = query(tournamentsCol, where("inviteToken", "==", token), where("status", "==", "setup"));
        const querySnapshot = await getDocs(q);
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

  // --- REAL-TIME LISTENERS ---
  useEffect(() => {
    if (!db) return;
    const tournamentsCol = collection(db, 'tournaments');
    const q = query(tournamentsCol, where("status", "==", "setup"));
    const unsubscribeOpenTournaments = onSnapshot(q, (querySnapshot) => {
      const tournaments: Tournament[] = [];
      querySnapshot.forEach((doc) => {
        tournaments.push({ id: doc.id, ...doc.data() } as Tournament);
      });
      setOpenTournaments(tournaments);
    });
    return () => unsubscribeOpenTournaments();
  }, [db]);

  useEffect(() => {
    let unsubscribeUser: Unsubscribe | undefined;
    let unsubscribeActiveTournament: Unsubscribe | undefined;
    const setupListeners = async () => {
        if (!user || !db || !userProfile) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeUser = onSnapshot(userDocRef, async (userDocSnap) => {
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                setMyPlayers(userData.myPlayers || []);
                const activeId = userData.activeTournamentId;
                if (activeId) {
                    const tournamentDocRef = doc(db, 'tournaments', activeId);
                    if (unsubscribeActiveTournament) unsubscribeActiveTournament();
                    unsubscribeActiveTournament = onSnapshot(tournamentDocRef, (tournamentDocSnap) => {
                        if (tournamentDocSnap.exists()) {
                            setActiveTournament({ id: activeId, ...tournamentDocSnap.data() } as Tournament);
                        } else {
                            setActiveTournament(null);
                        }
                    });
                } else {
                    if (unsubscribeActiveTournament) unsubscribeActiveTournament();
                    setActiveTournament(null);
                }
            }
        });
        if (inviteToken) {
            await joinTournamentByInvite(inviteToken);
        }
        setIsLoading(false);
    };
    setupListeners();
    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeActiveTournament) unsubscribeActiveTournament();
    };
  }, [user, db, userProfile, inviteToken, joinTournamentByInvite]);

  const manageTournament = async (id: string) => {
    if (!db || !user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { activeTournamentId: id });
  };

  const leaveTournament = async () => {
    if (!db || !user || !activeTournament) return;
    const batch = writeBatch(db);
    const userDocRef = doc(db, 'users', user.uid);
    if (activeTournament.organizerId === user.uid && activeTournament.status === 'completed') {
        activeTournament.players.forEach(player => {
            if (player) {
                const playerDocRef = doc(db, 'users', player.id);
                batch.update(playerDocRef, { activeTournamentId: null });
            }
        });
    } 
    else if (activeTournament.status === 'setup' && activeTournament.players.some(p => p.id === user.uid)) {
        const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
        const playerToRemove = activeTournament.players.find(p => p.id === user.uid);
        if (playerToRemove) {
            batch.update(tournamentDocRef, { players: arrayRemove(playerToRemove) });
        }
        batch.update(userDocRef, { activeTournamentId: null });
    } 
    else {
        batch.update(userDocRef, { activeTournamentId: null });
    }
    await batch.commit();
  };

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
      const organizerAsPlayer: Player = { 
        id: user.uid, 
        name: userProfile.username, 
        userId: user.uid,
        photoURL: userProfile.photoURL ?? null
      };
      const newTournamentData: Omit<Tournament, 'id'> = {
        name: name,
        organizerId: user.uid,
        organizerUsername: userProfile.username,
        organizerPhotoURL: userProfile.photoURL ?? null,
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
