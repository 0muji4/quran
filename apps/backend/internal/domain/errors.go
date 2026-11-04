package domain

import "errors"

// Not-found sentinels.
var (
	ErrSurahNotFound      = errors.New("surah not found")
	ErrAyahNotFound       = errors.New("ayah not found")
	ErrScoringJobNotFound = errors.New("scoring job not found")
)
