import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  optimizeDeps: {
    include: [
      "@base-ui/react/button",
      "@base-ui/react/dialog",
      "@base-ui/react/input",
      "@base-ui/react/merge-props",
      "@base-ui/react/separator",
      "@base-ui/react/use-render",
      "class-variance-authority",
      "cn",
      "lucide-react",
    ],
  },
  resolve: {
    tsconfigPaths: true,
  },
});
