import { RESP } from '../resp';
import { store } from "../stores/store";

export function lrangeCommand(args: string[]): string {
  if(args.length !== 3) {
    return RESP.encode.error(`ERR wrong number of arguments for 'lrange' command`);
  }
  const key = args[0];
  const start = parseInt(args[1]);
  const stop = parseInt(args[2]);

  if(isNaN(start) || isNaN(stop)) {
    return RESP.encode.error(`ERR value is not an integer or out of range`);
  }

  try {
    const elements = store.lrange(key, start, stop);
    return RESP.encode.array(elements);
  }catch(error) {
    if (error instanceof Error) {
      return RESP.encode.error(error.message);
    }
    return RESP.encode.error(`ERR internal error`);
  }
}