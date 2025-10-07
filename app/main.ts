import * as net from "net";
import { RESP } from "./resp";
import { CommandRouter } from "./router";

console.log("Logs from your program will appear here!");

const router = new CommandRouter();

const server: net.Server = net.createServer((connection: net.Socket) => {
  // Handle connection
  connection.on("data", (data: Buffer) => {
  try {
    const decoded = RESP.decode(data);

    const command = Array.isArray(decoded[0]) ?
    (decoded[0] as string[])
    : (decoded as string[]);

    const response = router.execute(command);
    
    connection.write(response);

  }catch (error) {
    connection.write(RESP.encode.error(`Internal server error`));
  }
  });
});

server.listen(6379, "127.0.0.1");
