import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["framer-motion", "clsx", "react-hot-toast"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
          viz: ["d3", "recharts"],
          webgl: ["ogl"]
        }
      }
    }
  }
});
