const { query } = require("./db");

(async () => {
  try {
    console.log("Probando conexión a Render...");
    const result = await query("SELECT NOW()");
    console.log("🕒 Conectado correctamente:", result.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error de conexión:", err);
    process.exit(1);
  }
})();
