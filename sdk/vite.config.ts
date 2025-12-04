import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        dts({
            insertTypesEntry: true,
        }),
    ],
    build: {
        lib: {
            entry: resolve(process.cwd(), 'src/index.ts'),
            name: 'ShopWithFriends',
            formats: ['es', 'umd'],
            fileName: (format) => `shop-with-friends.${format === 'es' ? 'js' : 'umd.cjs'}`
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
