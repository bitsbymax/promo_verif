module.exports = {
	root: true,
	env: {
		browser: true,
		es2021: true,
		node: true,
	},
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2021,
		sourceType: 'module',
	},
	plugins: ['@typescript-eslint', 'prettier'],
	rules: {
		'prettier/prettier': 'error',
		'no-console': ['warn', { allow: ['warn', 'error'] }],
		'no-unused-vars': 'warn',
		'no-undef': 'error',
		'no-var': 'error',
		'prefer-const': 'error',
		eqeqeq: ['error', 'always'],
		'no-multiple-empty-lines': ['error', { max: 2 }],
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
	},
};
