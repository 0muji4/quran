package domain

import "errors"

// Not-found sentinels.
var (
	ErrAyahNotFound       = errors.New("ayah not found")
	ErrScoringJobNotFound = errors.New("scoring job not found")
)
