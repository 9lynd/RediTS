import { RESP } from "../resp";
import { store } from "../stores/store";
import { blockingQueue } from "../queue/blockingQueue";

export function blpopCommand(args: string[]): Promise<string> {
  if (args.length < 2) { 
    return Promise.resolve(
      RESP.encode.error("ERR wrong number of arguments for 'BLPOP' command")
    );
  }

  const timeoutArgument = args[args.length - 1];
  const timeout = parseFloat(timeoutArgument);

  if (isNaN(timeout) || timeout < 0) {
    return Promise.resolve(
      RESP.encode.error("ERR timeout argument is not a float or out of range")
    );
  }

  // all arguments are keys except the last one
  const keys = args.slice(0, -1);
  for (const key of keys) {
    try {
      if (store.hasElements(key)) {
        const element = store.lpop(key, 1) as string;

        const response = RESP.encode.array([key, element]);
        return Promise.resolve(response);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("WRONGTYPE")) {
        return Promise.resolve(RESP.encode.error(error.message));
      }
    }
  }

  // No elements available -> block it
  const timeoutMs = timeout === 0 ? Infinity : timeout * 1000;

  return blockingQueue.blockClient(keys, timeoutMs, (key: string) => {
    try {
      if (store.hasElements(key)) {
        const element = store.lpop(key, 1);
        return typeof element === 'string' ? element : null;
      }
    } catch (error) { }
    return null;
  });
}