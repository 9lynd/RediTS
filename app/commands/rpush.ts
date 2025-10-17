import { RESP } from '../resp';
import { store } from "../stores/store";

export function rpushCommand(args: string[]): string {
  if (args.length < 2) {
    return RESP.encode.error(`ERR wrong number of arguments for 'rpush' command`);
  }

  const key = args[0];
  const values = args.slice(1);

  try {
    const length = store.rpush(key, ...values);
    return RESP.encode.integer(length);
  }catch (error) {
    if (error instanceof Error){
      return RESP.encode.error(error.message);
    }
    return RESP.encode.error(`ERR internal error`);
  }
}