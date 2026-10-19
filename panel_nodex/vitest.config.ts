import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // Sin variables de Firebase: las pruebas corren contra el modo demo
  test: { environment: "node", include: ["lib/**/*.test.ts"] },
});
