'use client';

import { useCallback, useState } from 'react';
import type { AyahRecord, SurahSummary } from '../lib/types';
import { TeacherPanel } from './TeacherPanel';
import { RecorderPanel } from './RecorderPanel';
import styles from '../styles/practice.module.css';

type Props = {
  surah: SurahSummary;
  ayah: AyahRecord;
};

export function PracticeClient({ surah, ayah }: Props) {
  // Bumping pauseSignal causes TeacherPanel to pause. Used when recording starts.
  const [pauseSignal, setPauseSignal] = useState(0);

  const handleRecordingStart = useCallback(() => {
    setPauseSignal((n) => n + 1);
  }, []);

  return (
    <div className={styles.panels}>
      <TeacherPanel
        surahId={Number(surah.id)}
        ayahNumber={ayah.ayahNumber}
        pauseSignal={pauseSignal}
      />
      <RecorderPanel surah={surah} ayah={ayah} onRecordingStart={handleRecordingStart} />
    </div>
  );
}
