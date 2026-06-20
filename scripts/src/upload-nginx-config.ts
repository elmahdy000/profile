import { Client } from "ssh2";
import fs from "fs";

const conn = new Client();
const configContent = fs.readFileSync("c:\\Users\\engel\\Desktop\\profile\\artifacts\\drelmahdy_nginx.conf", "utf8");
const base64Content = Buffer.from(configContent).toString("base64");

conn.on("ready", () => {
  const uploadCmd = `echo "${base64Content}" | base64 -d > /etc/nginx/sites-available/drelmahdy`;
  conn.exec(uploadCmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("close", () => {
      // now test and reload nginx
      conn.exec("nginx -t && systemctl reload nginx && echo 'NGINX_OK'", (_err2, stream2) => {
        if (_err2) { console.error(_err2); conn.end(); return; }
        stream2.on("close", () => { console.log(out); conn.end(); })
          .on("data", (d: Buffer) => { out += d.toString(); })
          .stderr.on("data", (d: Buffer) => { out += d.toString(); });
      });
    }).on("data", (d: Buffer) => { out += d.toString(); })
      .stderr.on("data", (d: Buffer) => { out += d.toString(); });
  });
}).connect({
  host: "72.62.27.196",
  port: 22,
  username: "root",
  password: "e#LWhcSAa6B&R8s",
});
