// src/hooks/useInviteHandler.ts
import { useState, useEffect } from 'react';
import { useTournament } from './useTournament';
import { UserProfile } from './useUserProfile';
import { User } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

export const useInviteHandler = (
    user: User | null, 
    userProfile: UserProfile | null, 
    db: Firestore | null
) => {
    const [inviteToken, setInviteToken] = useState<string | null>(null);
    
    const tournamentHook = useTournament(user, userProfile, db, inviteToken);

    useEffect(() => {
        // This effect runs only once on initial load to check for an invite token in the URL.
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('invite');
        if (token) {
            setInviteToken(token);
            // Clean the URL so the token isn't sitting there on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []); // Empty dependency array ensures this runs only once.

    return tournamentHook;
};
