module.exports = {
    root: true,
    extends: ['plugin:prettier/recommended', 'eslint:recommended'],
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 13,
    },
    env: {
        browser: false,
        es2022: true,
        node: true,
    },
    rules: {
        'no-extra-boolean-cast': 'off',
        'no-empty': 'off',
        'no-async-promise-executor': 'off',
        'no-irregular-whitespace': 'off',
        'prefer-const': 'error',
        'prettier/prettier': [
            'error',
            {
                endOfLine: 'auto',
                usePrettierrc: true,
            },
        ],
    },
};
