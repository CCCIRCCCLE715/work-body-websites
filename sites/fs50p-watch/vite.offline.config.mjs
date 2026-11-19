import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const embed = (path, mime) => `data:${mime};base64,${readFileSync(resolve('public', path)).toString('base64')}`;
export default defineConfig({
  publicDir: false,
  plugins: [
    { name: 'embed-models-and-decoder', enforce: 'pre', load(id) {
      if (!id.endsWith('/src/assets.js')) return null;
      return `export const watchUrl=${JSON.stringify(embed('models/watch.glb','model/gltf-binary'))};
        export const movementModelUrl=${JSON.stringify(embed('models/movement-precision.glb','model/gltf-binary'))};
        export const studioUrl=${JSON.stringify(embed('assets/studio.exr','application/octet-stream'))};
        export const decoderPaths=${JSON.stringify({js:embed('draco/draco_wasm_wrapper.js','text/javascript'),wasm:embed('draco/draco_decoder.wasm','application/wasm')})};`;
    } },
    react(), viteSingleFile(),
  ],
  build: { outDir:'dist-offline', emptyOutDir:true, assetsInlineLimit:100000000, chunkSizeWarningLimit:15000 },
});
