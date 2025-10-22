import * as net from "net";
import { RESP } from "./resp";
import { CommandRouter } from "./router";
import { transactionManger } from "./transaction/transactionManager";

console.log("Logs from your program will appear here!");

const router = new CommandRouter();

const server: net.Server = net.createServer((connection: net.Socket) => {
  // Handle connection
  connection.on("data", (data: Buffer) => {
  (async () => {
  try {
    const decoded = RESP.decode(data);

    const command = Array.isArray(decoded[0]) ?
    (decoded[0] as string[])
    : (decoded as string[]);

    const response = await router.execute(command, connection);
    
    connection.write(response);

  }catch (error) {
    connection.write(RESP.encode.error(`Internal server error`));
  }
})();
  });

  connection.on("end", () => {
    transactionManger.cleanupConnection(connection);
  })
});

server.listen(6379, "127.0.0.1");
