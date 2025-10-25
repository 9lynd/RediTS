import { RESP } from "../resp";
import { replicationConfig } from "../replication/config";
import { Socket } from "net";
import { generateEmptyRDB, encodeRDB } from "../replication/rdb";
import { propagationManager } from "../replication/propagation";

export function psyncCommand(args: string[], connection?: Socket): string {
  if (args.length !== 2) {
    return RESP.encode.error("ERR wrong number of arguments for 'PSYNC' command");
  }

  const [replId, offset] = args;

  const response = `FULLRESYNC ${replicationConfig.replId} ${replicationConfig.replOffset}`;
  const fullresyncResponse = RESP.encode.simpleString(response);

  if(connection) {
    connection.write(fullresyncResponse);

    const rdb = generateEmptyRDB();
    const encodedRDB = encodeRDB(rdb);
    connection.write(encodedRDB);

    propagationManager.addReplica(connection);
    return '';
  }

  return fullresyncResponse;
}