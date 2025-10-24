import { RESP } from "../resp";
import { replicationConfig } from "../replication/config";

export function infoCommand(args: string[]): string {
  const section = args[0]?.toLowerCase() || 'all';

  let response = '';

  if (section === 'replication' || section === 'all') {
    response += '# Replication\r\n';
    response += `role:${replicationConfig.role}\r\n`

    if(replicationConfig.isMaster()) {
      response += `master_replid:${replicationConfig.replId}\r\n`;
      response += `master_repl_offset:${replicationConfig.replOffset}\r\n`;
    }
  }
  return RESP.encode.bulkString(response);
}