import { RESP } from "../resp";
import { streamStore } from "../stores/stream";

export function xaddCommand(args: string[]): string {
  if (args.length < 4) {
    return RESP.encode.error("ERR wrong number of arguments for 'XADD' command");
  }

  const key = args[0];
  const id = args[1];
  const fieldArgs = args.slice(2);

  if (fieldArgs.length % 2 !== 0) {
    return RESP.encode.error("ERR wrong number of arguments for 'XADD' command");
  }

  const fields = new Map<string,string>();
  for (let i = 0; i < fieldArgs.length; i += 2) {
    const field = fieldArgs[i];
    const value = fieldArgs[i+1];
    fields.set(field, value);
  }

  try {
    const entryId = streamStore.xadd(key, id, fields);
    return RESP.encode.bulkString(entryId);
  } catch (error) {
    if (error instanceof Error) {
      return RESP.encode.error(error.message);
    }
    return RESP.encode.error("ERR internal error");
  }
}