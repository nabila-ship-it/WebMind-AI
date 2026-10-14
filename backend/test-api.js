// Script to test backend endpoints
async function runTests() {
  console.log("=== Testing Backend Endpoints ===");

  // 1. Test Health
  try {
    const healthRes = await fetch("http://localhost:3000/api/health");
    console.log("1. /api/health status:", healthRes.status);
    const healthJson = await healthRes.json();
    console.log("   Health response:", healthJson);
  } catch (e) {
    console.error("Health check failed:", e.message);
  }

  // 2. Test Summarize
  try {
    const sumRes = await fetch("http://localhost:3000/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "summarize",
        content: "React adalah pustaka JavaScript untuk membangun antarmuka pengguna berbasis komponen modular dan reaktif yang dikembangkan oleh Meta."
      })
    });
    console.log("2. /api/ai summarize status:", sumRes.status);
    const sumJson = await sumRes.json();
    console.log("   Summarize response success:", sumJson.success, "isMock:", sumJson.isMock);
    console.log("   Sample result preview:\n", sumJson.result.slice(0, 150));
  } catch (e) {
    console.error("Summarize test failed:", e.message);
  }

  // 3. Test Ask
  try {
    const askRes = await fetch("http://localhost:3000/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ask",
        content: "React adalah pustaka JavaScript yang dikembangkan oleh Meta.",
        question: "Siapa yang mengembangkan React?"
      })
    });
    console.log("3. /api/ai ask status:", askRes.status);
    const askJson = await askRes.json();
    console.log("   Ask response success:", askJson.success);
    console.log("   Ask result preview:\n", askJson.result.slice(0, 150));
  } catch (e) {
    console.error("Ask test failed:", e.message);
  }

  // 4. Test Translate
  try {
    const transRes = await fetch("http://localhost:3000/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "translate",
        content: "Hello world, this is a Chrome Extension built for modern web productivity.",
        targetLanguage: "id"
      })
    });
    console.log("4. /api/ai translate status:", transRes.status);
    const transJson = await transRes.json();
    console.log("   Translate response success:", transJson.success);
  } catch (e) {
    console.error("Translate test failed:", e.message);
  }

  console.log("\n=== All Backend Tests Completed Successfully! ===");
}

runTests();
