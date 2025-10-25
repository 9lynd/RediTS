import * as net from "net";
import { RESP } from "../resp";
import { replicationConfig } from "./config";
import { handleMasterCommands } from "./master";

export async function performHandshake(): Promise<void> {
  if(!replicationConfig.isReplica()) return;

  const { masterHost, masterPort, port } = replicationConfig;
  if(!masterHost || !masterPort) {
    console.error("Master host/port not configured");
    return;
  }
  console.log(`connecting to master at ${masterHost}:${masterPort}`);

  const connection = net.createConnection({ host: masterHost, port: masterPort }, () => {
    console.log("connected to master, handshaking...");
    startHandshake(connection, port);
  })

  connection.on("error", (err) => {
    console.error("connection to master failed: ", err);
  });

}

function startHandshake(connection: net.Socket, replicaPort: number): void {
  let step = 0;

  const nextCommand = () => {
    step++;

    switch (step) {
      case 1:
        // Step 1: Send PING
        console.log("Sending PING...");
        const ping = RESP.encode.array(["PING"]);
        connection.write(ping);
        break;

      case 2:
        // Step 2: Send REPLCONF listening-port
        console.log(`Sending REPLCONF listening-port ${replicaPort}...`);
        const replconf1 = RESP.encode.array(["REPLCONF", "listening-port", replicaPort.toString()]);
        connection.write(replconf1);
        break;

      case 3:
        // Step 3: Send REPLCONF capa psync2
        console.log("Sending REPLCONF capa psync2...");
        const replconf2 = RESP.encode.array(["REPLCONF", "capa", "psync2"]);
        connection.write(replconf2);
        break;

      case 4:
        // Step 4: Send PSYNC ? -1
        console.log("Sending PSYNC ? -1...");
        const psync = RESP.encode.array(["PSYNC", "?", "-1"]);
        connection.write(psync);
        break;

      default:
        console.log("Handshake complete!");
        // Keep connection open to receive replication stream
        break;
    }
  };

  // Handle responses from master
  connection.on("data", (data: Buffer) => {
    console.log("Received from master:", data.toString());

    if(step >= 4) {
      handleMasterCommands(data, connection);
      return;
    }
    
    // After each response, send the next command
    if (step < 4) {
      nextCommand();
    }
  });

  // Start the handshake
  nextCommand();
}