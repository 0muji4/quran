// Mock for the `server-only` package so server actions can be unit-tested.
// It is only ever imported for its side effect (`import 'server-only'`), so it
// needs no exports — the empty `export` just marks the file as an ES module.
export {};
