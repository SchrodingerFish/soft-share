import db from "../db/index.js";

/**
 * Checks a single URL to see if it's still accessible.
 * We use a HEAD request to minimize bandwidth.
 */
async function checkUrl(url: string): Promise<"valid" | "broken"> {
  try {
    const response = await fetch(url, { 
      method: "HEAD",
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return response.ok ? "valid" : "broken";
  } catch (error) {
    // If HEAD fails, try a GET with a small range or just a regular GET
    try {
      const response = await fetch(url, { 
        method: "GET",
        headers: { Range: "bytes=0-0" },
        signal: AbortSignal.timeout(5000)
      });
      return response.ok ? "valid" : "broken";
    } catch (e) {
      return "broken";
    }
  }
}

/**
 * Iterates through all software entries and updates their link_status.
 */
export async function checkAllLinks() {
  console.log("[LinkChecker] Starting automated link check...");
  try {
    const result = await db.execute("SELECT id, download_url FROM software");
    const software = result.rows;

    for (const item of software) {
      const status = await checkUrl(item.download_url);
      await db.execute({
        sql: "UPDATE software SET link_status = ? WHERE id = ?",
        args: [status, item.id]
      });
      console.log(`[LinkChecker] Software ID ${item.id}: ${status}`);
    }
    console.log("[LinkChecker] Automated link check completed.");
  } catch (error) {
    console.error("[LinkChecker] Error during link check:", error);
  }
}

/**
 * Starts the background task for link checking.
 * Default interval: 24 hours.
 */
export function startLinkCheckerTask(intervalMs: number = 24 * 60 * 60 * 1000) {
  // Run once on startup
  setTimeout(checkAllLinks, 5000); // Wait 5s for DB to be fully ready
  
  // Schedule recurring task
  setInterval(checkAllLinks, intervalMs);
}
