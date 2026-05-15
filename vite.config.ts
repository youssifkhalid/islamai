import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "src/server" },
  },
  vite: {
    ssr: {
      external: ["@supabase/supabase-js"]
    },
    server: {
      proxy: {
        '/api-audio': {
          target: 'https://cdn.islamic.network',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-audio/, ''),
        },
      },
    },
  },
});
