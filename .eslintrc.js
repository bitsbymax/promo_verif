module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: ['eslint:recommended'],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
    },
    rules: {
        // Scope-related rules
        'no-undef': 'error',
        'no-unused-vars': ['error', { 
            "vars": "all",
            "args": "after-used",
            "ignoreRestSiblings": false
        }],
        'no-use-before-define': ['error', { 
            "functions": false, 
            "classes": true, 
            "variables": true 
        }],
        'block-scoped-var': 'error',
        'no-shadow': 'error',
        'no-var': 'error',
        'prefer-const': 'error',
        'no-undefined': 'error',
        'init-declarations': ['error', 'always'],
    }
};