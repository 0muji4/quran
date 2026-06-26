package domain

import "errors"

// Not-found sentinels live in the domain so every layer can match them with
// errors.Is without importing an adapter package.
var (
	ErrAyahNotFound       = errors.New("ayah not found")
	ErrScoringJobNotFound = errors.New("scoring job not found")
)
