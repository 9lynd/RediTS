import * as net from "net";
import { RESP } from "./resp";
import { CommandRouter } from "./router";
import { transactionManger } from "./transaction/transactionManager";
import { replicationConfig } from "./replication/config";
import { performHandshake } from "./replication/handshake";
import { rdbReader } from "./replication/rdbReader";

console.log("Logs from your program will appear here!");

const router = new CommandRouter();

replicationConfig.parseArgs(process.argv.slice(2));
console.log(`starting Redis Server on port ${replicationConfig.port} with ${replicationConfig.role} role`);

// Load RDB file
await rdbReader.loadRDB(replicationConfig.dir, replicationConfig.dbfilename);

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

server.listen(replicationConfig.port, "127.0.0.1", () => {
  if(replicationConfig.isReplica()) {
    performHandshake().catch((err) => {
      console.error("Handshake failed:", err);
    });
  }
});
