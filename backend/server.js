const { fork } = require("child_process");
const path = require("path");
const app = require("./src/app");

const PORT = process.env.PORT || 8040;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // The queue worker runs in-process by default (convenient for single-process
  // local dev). When a dedicated queue-worker service/container runs beside the
  // API, set RUN_QUEUE_WORKER=false here to avoid running two workers.
  if (process.env.RUN_QUEUE_WORKER === "false") {
    console.log("[server] RUN_QUEUE_WORKER=false — queue worker runs as a separate service");
    return;
  }

  const worker = fork(path.join(__dirname, "src", "worker", "queue.worker.js"));
  worker.on("exit", (code) => {
    if (code !== 0) {
      console.warn(`[server] queue worker exited with code ${code}, restarting in 5s...`);
      setTimeout(() => {
        fork(path.join(__dirname, "src", "worker", "queue.worker.js"));
      }, 5000);
    }
  });
});