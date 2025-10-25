import { RESP } from "../resp";
import { replicaOffsetTracker } from "./offset";
import { CommandRouter } from "../router";
import { Socket } from "net";

const router = new CommandRouter();
// handler function for commands received from master to replica
export async function handleMasterCommands(data: Buffer, connection: Socket): Promise<void> {
  // track offset
  replicaOffsetTracker.addBytes(data.length);

  try  {
    const decoded = RESP.decode(data);

    for (const item of decoded) {
      if (Array.isArray(item)) {
        const command = item as string[];
        const commandName = command[0]?.toUpperCase();

        console.log("Received command from master:", command);

        if (commandName === 'REPLCONF' && command[1]?.toUpperCase() === 'GETACK') {
          const currentCommandBytes = RESP.encode.array(command).length;
          replicaOffsetTracker.addBytes(-currentCommandBytes);

          const response = await router.executeInternal(command);
          connection.write(response);
          continue;
        }

        router.executeInternal(command);
      }
    }
  } catch (error) {
    // ignore
    console.log("Could not decode as RESP (might be RDB): ", error);
  }
}