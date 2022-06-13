// vite.config.ts
import path from "path";

const name = 'fetch-cloud-config';

export default {
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name,
      fileName: format => `${name}.${format}.js`
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      // external: ["vue"],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        // globals: {
        //   vue: "Vue",
        // },
      }
    }
  }
};
