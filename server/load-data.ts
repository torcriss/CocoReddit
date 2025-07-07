import { loadTestData } from "./load-test-data";

async function main() {
  try {
    console.log("Starting test data loading process...");
    const result = await loadTestData();
    console.log("Test data loaded successfully:", result);
    process.exit(0);
  } catch (error) {
    console.error("Failed to load test data:", error);
    process.exit(1);
  }
}

main();