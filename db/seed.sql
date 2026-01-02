-- Seed minimal Quran data for development
-- Insert Surahs
INSERT INTO surahs (id, name_ar, name_en, revelation_place, ayah_count) VALUES
(1, 'الفاتحة', 'Al-Fatihah', 'Mecca', 7),
(2, 'البقرة', 'Al-Baqarah', 'Medina', 286)
ON CONFLICT (id) DO NOTHING;

-- Insert Ayahs (Al-Fatihah)
INSERT INTO ayahs (id, surah_id, ayah_number, text_ar) VALUES
(1, 1, 1, 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'),
(2, 1, 2, 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'),
(3, 1, 3, 'الرَّحْمَٰنِ الرَّحِيمِ'),
(4, 1, 4, 'مَالِكِ يَوْمِ الدِّينِ'),
(5, 1, 5, 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ'),
(6, 1, 6, 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ'),
(7, 1, 7, 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ')
ON CONFLICT (id) DO NOTHING;
