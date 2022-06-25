// SEE: http://eslint.org/docs/user-guide/configuring
module.exports = {
  root: true,
  env: {
    mocha: true,
    node: true
  },
  extends: ['standard', 'prettier'],
  plugins: ['import', 'prettier'],
  parserOptions: {
    sourceType: 'module'
  },
  rules: {
    'prettier/prettier': 'error'
  },
  globals: {
    assert: true,
    baseUrl: true,
    expect: true,
    guest: true,
    helper: true,
    app: true,
    path: true
  }
}
