import { RESP } from "../resp";
import { store } from "../stores/store";

export function llenCommand(args: string[]): string {
  if (args.length !== 1){
    return RESP.encode.error("Wrong number of arguments for 'LLEN' command");
  }

  const key = args[0];

  try {
    const length = store.llen(key);
    return RESP.encode.integer(length);
  }
  catch (error) {
    if (error instanceof Error){
      return RESP.encode.error(error.message);
    }
    return RESP.encode.error("ERR internal error");
  }
}