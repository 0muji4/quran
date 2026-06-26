package domain

import "errors"

// ErrAyahNotFound is returned when a verse lookup matches no row. It lives
// in the domain so every layer — repositories returning it, use cases
// propagating it, the delivery layer mapping it to a 404 — can reference
// the same sentinel without depending on a particular adapter package.
var ErrAyahNotFound = errors.New("ayah not found")

// ErrScoringJobNotFound is returned when no scoring job exists for a
// session, so callers can map it to a 404 without depending on
// database/sql sentinels leaking through the abstraction.
var ErrScoringJobNotFound = errors.New("scoring job not found")
