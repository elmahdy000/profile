import { Client } from "ssh2";

const conn = new Client();

const runCommand = (cmd: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    let output = "";
    conn.on("ready", () => {
      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        stream
          .on("close", (code, signal) => {
            conn.end();
            resolve(output);
          })
          .on("data", (data) => {
            output += data.toString();
          })
          .stderr.on("data", (data) => {
            output += data.toString();
          });
      });
    }).connect({
      host: "72.62.27.196",
      port: 22,
      username: "root",
      password: "e#LWhcSAa6B&R8s",
      readyTimeout: 10000,
    });
  });
};

const cmd = process.argv[2] || "pm2 list; echo '--- nginx sites ---'; ls /etc/nginx/sites-enabled/";
runCommand(cmd)
  .then((out) => {
    console.log("=== SSH OUTPUT ===");
    console.log(out);
  })
  .catch((err) => {
    console.error("=== SSH ERROR ===");
    console.error(err);
  });
