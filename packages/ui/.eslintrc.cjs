module.exports = {
  root: true,
  extends: ['@quran-project/eslint-config'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname
  }
};
