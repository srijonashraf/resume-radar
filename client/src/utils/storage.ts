import { AnalysisHistoryEntry } from '../state/useStore';

export const STORAGE_KEY = 'resume_analyzer_history';

export const saveAnalysisHistory = (history: AnalysisHistoryEntry[]): void => {
  try {
    const serializedHistory = JSON.stringify(history.map(entry => ({
      ...entry,
      date: entry.date.toISOString(),
      resumeData: {
        ...entry.resumeData,
        file: null // We can't serialize File objects
      }
    })));
    localStorage.setItem(STORAGE_KEY, serializedHistory);
  } catch (error) {
    console.error('Error saving analysis history:', error);
  }
};

export const loadAnalysisHistory = (): AnalysisHistoryEntry[] => {
  try {
    const serializedHistory = localStorage.getItem(STORAGE_KEY);
    if (!serializedHistory) return [];
    
    const parsedHistory = JSON.parse(serializedHistory);
    return parsedHistory.map((entry: any) => ({
      ...entry,
      date: new Date(entry.date)
    }));
  } catch (error) {
    console.error('Error loading analysis history:', error);
    return [];
  }
};
