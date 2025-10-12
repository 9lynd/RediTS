import { RESP } from '../resp';
import { store } from '../store';

export function lpushCommand(args: string[]): string {
  if (args.length < 2) {
    return RESP.encode.error(`ERR wrong number of arguments for 'LPUSH' command`);
  }

  const key = args[0];
  const values = args.slice(1);

  try {
    const length = store.lpush(key, ...values);
    return RESP.encode.integer(length);
  }catch (error) {
    if (error instanceof Error) {
      return RESP.encode.error(error.message);
    }
    return RESP.encode.error("ERR internal error");
  }
}