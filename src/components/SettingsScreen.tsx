// src/components/SettingsScreen.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { colors, fonts } from '../theme';
import { useSettingsStore } from '../settings-store';
import { useRunStore } from '../store';

interface Props {
  onClose: () => void;
}

function ToggleRow({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <Pressable style={styles.toggleRow} onPress={onToggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, enabled && styles.toggleTrackOn]}>
        <View style={[styles.toggleThumb, enabled && styles.toggleThumbOn]} />
      </View>
    </Pressable>
  );
}

export function SettingsScreen({ onClose }: Props) {
  const musicEnabled = useSettingsStore(s => s.musicEnabled);
  const sfxEnabled = useSettingsStore(s => s.sfxEnabled);
  const toggleMusic = useSettingsStore(s => s.toggleMusic);
  const toggleSfx = useSettingsStore(s => s.toggleSfx);
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);

  const handleAbandon = () => {
    if (!confirmingAbandon) {
      setConfirmingAbandon(true);
      return;
    }
    setConfirmingAbandon(false);
    useRunStore.getState().abandonRun();
    onClose();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>SETTINGS</Text>

        <View style={styles.section}>
          <ToggleRow label="Music" enabled={musicEnabled} onToggle={toggleMusic} />
          <ToggleRow label="Sound Effects" enabled={sfxEnabled} onToggle={toggleSfx} />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.abandonButton,
            confirmingAbandon && styles.abandonButtonConfirm,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleAbandon}
        >
          <Text
            style={[
              styles.abandonText,
              confirmingAbandon && styles.abandonTextConfirm,
            ]}
          >
            {confirmingAbandon ? 'TAP AGAIN TO CONFIRM' : 'ABANDON RUN'}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}
          onPress={() => {
            setConfirmingAbandon(false);
            onClose();
          }}
        >
          <Text style={styles.closeText}>CLOSE</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6,6,20,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 24,
    minWidth: 260,
    maxWidth: 320,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 0 30px rgba(0,229,255,0.15), 0 0 60px rgba(0,229,255,0.05)`,
    } as any : {}),
  },
  title: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 20,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 24,
    ...(Platform.OS === 'web' ? {
      textShadow: `0 0 12px rgba(0,229,255,0.4)`,
    } as any : {}),
  },
  section: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    letterSpacing: 1,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textDim,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackOn: {
    borderColor: colors.gold,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 0 8px rgba(255,215,0,0.3)`,
    } as any : {}),
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textDim,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.gold,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 0 6px rgba(255,215,0,0.5)`,
    } as any : {}),
  },
  abandonButton: {
    borderWidth: 1,
    borderColor: colors.respin,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
    minWidth: 220,
    alignItems: 'center',
  },
  abandonButtonConfirm: {
    backgroundColor: colors.respinTint,
    borderColor: colors.pink,
  },
  abandonText: {
    color: colors.respin,
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  abandonTextConfirm: {
    color: colors.pink,
  },
  closeButton: {
    borderWidth: 1,
    borderColor: colors.indigo,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  closeText: {
    color: colors.indigo,
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
