import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const bytemdJs = fileURLToPath(new URL('./node_modules/bytemd/dist/index.mjs', import.meta.url));

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	server: {
		host: '127.0.0.1',
		port: 3460,
		strictPort: true
	},
	preview: {
		host: '127.0.0.1',
		port: 3460,
		strictPort: true
	},
	resolve: {
		alias: [{ find: /^bytemd$/, replacement: bytemdJs }]
	},
	ssr: {
		external: ['bun:sqlite', 'bytemd', '@bytemd/plugin-gfm', '@bytemd/plugin-highlight']
	}
});
