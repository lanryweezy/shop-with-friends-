import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(process.cwd(), 'src/index.ts'),
            name: 'ShopWithFriends',
            formats: ['es', 'umd'],
            fileName: (format) => `swf.${format === 'es' ? 'esm' : format}.js`
        },
        rollupOptions: {
            output: {
                globals: {}
            }
        },
        outDir: 'dist',
        emptyOutDir: false,
        sourcemap: true,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: false
            }
        }
    },
    resolve: {
        extensions: ['.ts', '.js']
    }
});
