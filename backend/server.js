const { fork } = require("child_process");
const path = require("path");
const app = require("./src/app");

const PORT = process.env.PORT || 8040;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

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