import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface SoundContextType {
  soundEnabled: boolean;
  toggleSound: () => void;
  playClick: () => void;
  playTap: () => void;
  playPop: () => void;
  playWhoosh: () => void;
  playNotification: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

const STORAGE_KEY = 'swiftgrowth-sound-enabled';
const VOLUME = 0.12; // 12% volume - subtle but audible

// Web Audio API sound generators
const createAudioContext = () => {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
};

const playTone = (
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = VOLUME,
  fadeOut: boolean = true
) => {
  try {
    const audioContext = createAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    
    if (fadeOut) {
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    }

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);

    // Clean up
    setTimeout(() => {
      audioContext.close();
    }, duration * 1000 + 100);
  } catch (e) {
    // Silently fail if audio context isn't available
    console.log('Audio context not available');
  }
};

// Soft confirmation click - warm, satisfying
const playClickSound = () => {
  playTone(800, 0.08, 'sine', VOLUME * 0.8);
  setTimeout(() => playTone(1000, 0.06, 'sine', VOLUME * 0.5), 30);
};

// Light tap - quick and subtle
const playTapSound = () => {
  playTone(600, 0.05, 'sine', VOLUME * 0.6);
};

// Gentle pop - for opening
const playPopSound = () => {
  playTone(400, 0.1, 'sine', VOLUME * 0.7);
  setTimeout(() => playTone(600, 0.08, 'sine', VOLUME * 0.5), 40);
};

// Whoosh - for closing (descending)
const playWhooshSound = () => {
  playTone(500, 0.12, 'sine', VOLUME * 0.6);
  setTimeout(() => playTone(350, 0.1, 'sine', VOLUME * 0.4), 50);
};

// Notification - friendly double-chime for bot responses
const playNotificationSound = () => {
  playTone(880, 0.1, 'sine', VOLUME * 0.7);
  setTimeout(() => playTone(1100, 0.12, 'sine', VOLUME * 0.6), 100);
};

export function SoundProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Load preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setSoundEnabled(true);
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      
      // Play a confirmation sound when enabling
      if (newValue) {
        setTimeout(() => playTapSound(), 100);
      }
      
      return newValue;
    });
  }, []);

  const playClick = useCallback(() => {
    if (soundEnabled) playClickSound();
  }, [soundEnabled]);

  const playTap = useCallback(() => {
    if (soundEnabled) playTapSound();
  }, [soundEnabled]);

  const playPop = useCallback(() => {
    if (soundEnabled) playPopSound();
  }, [soundEnabled]);

  const playWhoosh = useCallback(() => {
    if (soundEnabled) playWhooshSound();
  }, [soundEnabled]);

  const playNotification = useCallback(() => {
    if (soundEnabled) playNotificationSound();
  }, [soundEnabled]);

  return (
    <SoundContext.Provider value={{
      soundEnabled,
      toggleSound,
      playClick,
      playTap,
      playPop,
      playWhoosh,
      playNotification,
    }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}
