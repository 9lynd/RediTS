import { RESP } from "../resp";
import { store } from "../store";

export function lpopCommand(args: string[]): string {
  if (args.length < 1 || args.length > 2) {
    return RESP.encode.error("ERR wrong number of arguments for 'LPOP' command");
  }

  const key = args[0];
  let count = 1;
  if (args.length === 2) {
    count = parseInt(args[1]);
  }

  if (isNaN(count) || count <= 0) {
    return RESP.encode.error("ERR value is not an integer or out of range");
  }

  try {
    const result = store.lpop(key, count);
    if (result === null) {
      return RESP.encode.null();
    }
    if (typeof result === 'string') {
      return RESP.encode.bulkString(result);
    }
    return RESP.encode.array(result);
  }
  catch (error) {
    if (error instanceof Error) {
      return RESP.encode.error(error.message);
    }
    return RESP.encode.error("ERR internal error");
  }
}