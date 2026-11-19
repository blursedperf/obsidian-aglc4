import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
		'test',
		'scripts',
		'sample-vault',
		'vitest.config.ts',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'manifest.json'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		// Packages and plugins must run on mobile: no Node APIs. And a package is used only through its
		// public entry point (its index.ts), never its internal files.
		files: ['packages/*/src/**/*.ts', 'plugins/*/src/**/*.ts'],
		rules: {
			'no-restricted-imports': ['error', {
				patterns: [
					{ regex: '^node:', message: 'Node APIs are not available on mobile.' },
					{ regex: '^(fs|path|os|child_process|crypto|buffer|stream|util|url|http|https|net)(/|$)', message: 'Node APIs are not available on mobile.' },
					{ regex: '^@legal-core/[^/]+/', message: 'Import a package through its entry point: @legal-core/<name>.' },
				],
			}],
			'no-restricted-globals': ['error',
				{ name: 'Buffer', message: 'Buffer is a Node API: use Uint8Array.' },
				{ name: 'process', message: 'process is a Node API.' },
				{ name: 'require', message: 'Use import.' },
			],
		},
	},
	{
		// AGLC4 Citations is standalone. It may use the Legal Core API's types (erased when compiled) to
		// talk to Legal Core when it is installed, but never import Legal Core itself.
		files: ['plugins/aglc4/src/**/*.ts'],
		rules: {
			'no-restricted-imports': ['error', {
				paths: [{ name: '@legal-core/api', allowTypeImports: true, message: 'AGLC4 must work without Legal Core: import only types from @legal-core/api.' }],
				patterns: [
					{ regex: '^@legal-core/(legal-core|legal-core-plugin|au-legal-core)', message: 'AGLC4 must work without Legal Core: never import the Legal Core plugin.' },
					{ regex: '^(\\.\\./)+legal-core/', message: 'AGLC4 must work without Legal Core: never import the Legal Core plugin.' },
					{ regex: '^node:', message: 'Node APIs are not available on mobile.' },
					{ regex: '^(fs|path|os|child_process|crypto|buffer|stream|util|url|http|https|net)(/|$)', message: 'Node APIs are not available on mobile.' },
					{ regex: '^@legal-core/[^/]+/', message: 'Import a package through its entry point: @legal-core/<name>.' },
				],
			}],
		},
	},
);
