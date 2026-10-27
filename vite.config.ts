import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Serves pictures from Cloudinary when VITE_CLOUDINARY_CLOUD is set (in .env).
 * Rewrites "/characters/…", "/places/…", "/home/…" in source and CSS to
 * https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,c_limit,w_1600/eoa/<same path>
 * so Cloudinary sends WebP/AVIF, compressed and resized. 3D models ("/3d models/…") stay local.
 * Without the variable, everything loads from public/ as before.
 */
function cloudinaryImages(cloud: string | undefined): Plugin {
  const base = cloud ? `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,c_limit,w_1600/eoa/` : '';
  // a path start right after a quote, backtick or url(
  const re = /(['"`]|url\()\/(characters|places|home)\//g;
  return {
    name: 'cloudinary-images',
    enforce: 'pre',
    transform(code, id) {
      if (!cloud || id.includes('node_modules') || !/\/src\/.*\.(tsx?|css)$/.test(id.replace(/\\/g, '/').split('?')[0])) return null;
      if (!re.test(code)) return null;
      re.lastIndex = 0;
      return { code: code.replace(re, (_m, q, dir) => `${q}${base}${dir}/`), map: null };
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [cloudinaryImages(env.VITE_CLOUDINARY_CLOUD), react()],
    server: {
      port: 5173,
      proxy: {
        '/socket.io': { target: 'http://localhost:3001', ws: true },
      },
    },
  };
});
