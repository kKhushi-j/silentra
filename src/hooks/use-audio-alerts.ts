'use client';

import { useRef, useCallback } from 'react';

type AlertType = 'beep' | 'chime' | 'voice' | 'none';

export const useAudioAlerts = () => {
    const audioContextRef = useRef<AudioContext>();

    const getAudioContext = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
             audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    const playBeep = useCallback(() => {
        const context = getAudioContext();
        if (!context) return;
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        gainNode.gain.setValueAtTime(0.5, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5);
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.5);
    }, [getAudioContext]);

    const playChime = useCallback(() => {
        const context = getAudioContext();
        if (!context) return;
        const play = (freq: number, delay: number) => {
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, context.currentTime + delay);
            gainNode.gain.setValueAtTime(0.3, context.currentTime + delay);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.8);
            oscillator.start(context.currentTime + delay);
            oscillator.stop(context.currentTime + delay + 1);
        };
        play(960, 0);
        play(1200, 0.1);
    }, [getAudioContext]);

    const playVoice = useCallback((message: string) => {
        if ('speechSynthesis' in window && message) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(message);
            window.speechSynthesis.speak(utterance);
        }
    }, []);

    const playAlert = useCallback((type: AlertType, message?: string) => {
        if (type === 'none') return;
        
        switch (type) {
            case 'beep':
                playBeep();
                break;
            case 'chime':
                playChime();
                break;
            case 'voice':
                playVoice(message || '');
                break;
        }
    }, [playBeep, playChime, playVoice]);

    return { playAlert };
};
