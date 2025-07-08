// src/components/TournamentSettings/TournamentSettings.tsx
import React, { useState, useEffect } from 'react';
import styles from './TournamentSettings.module.css';
import { Tournament } from '../../hooks/useTournament';

// Define the structure for our new settings
export interface TournamentRules {
  description: string;
  schedule: string; // For simplicity, we'll use a string. This could be a Date object.
  bannedItems: string[];
}

interface TournamentSettingsProps {
  tournament: Tournament;
  onSaveSettings: (settings: TournamentRules) => Promise<void>;
  isSaving: boolean;
}

const TournamentSettings: React.FC<TournamentSettingsProps> = ({
  tournament,
  onSaveSettings,
  isSaving,
}) => {
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  const [bannedItems, setBannedItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

  // When the component loads, populate the form with existing settings
  useEffect(() => {
    setDescription(tournament.rules?.description || '');
    setSchedule(tournament.rules?.schedule || '');
    setBannedItems(tournament.rules?.bannedItems || []);
  }, [tournament]);

  const handleAddBannedItem = () => {
    if (newItem.trim() && !bannedItems.includes(newItem.trim())) {
      setBannedItems([...bannedItems, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveBannedItem = (itemToRemove: string) => {
    setBannedItems(bannedItems.filter(item => item !== itemToRemove));
  };

  const handleSave = () => {
    const settings: TournamentRules = {
      description,
      schedule,
      bannedItems,
    };
    onSaveSettings(settings);
  };

  return (
    <div className={styles.settingsContainer}>
      <h3 className={styles.sectionTitle}>Tournament Settings</h3>
      
      <div className={styles.formGroup}>
        <label htmlFor="schedule">Schedule / Start Time</label>
        <input
          id="schedule"
          type="text"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder="e.g., Saturday at 8:00 PM EST"
          className={styles.input}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description">Description / Rules</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter a description, ruleset, or link to an external document."
          className={styles.textarea}
          rows={5}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Banned Characters / Items</label>
        <div className={styles.bannedItemsList}>
          {bannedItems.map(item => (
            <div key={item} className={styles.bannedItemTag}>
              <span>{item}</span>
              <button onClick={() => handleRemoveBannedItem(item)}>&times;</button>
            </div>
          ))}
        </div>
        <div className={styles.addItemContainer}>
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add an item..."
            className={styles.input}
          />
          <button onClick={handleAddBannedItem} className={styles.addButton}>Add</button>
        </div>
      </div>

      <div className={styles.saveButtonContainer}>
        <button onClick={handleSave} className={styles.saveButton} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default TournamentSettings;
