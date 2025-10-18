import { RESP } from "../resp";
import { streamStore } from "../stores/stream";

export function xrangeCommand(args: string[]): string {

  if (args.length !== 3) {
    return RESP.encode.error("ERR wrong number of arguments for 'XRANGE' command");
  }

  const key = args[0];
  const start = args[1];
  const end = args[2];

  try {
    const entries = streamStore.xrange(key, start, end);

    const encodedEntries: Array<[string, string[]]> = entries.map(entry => {
      const fieldArray: string[] = [];
      for (const [field, value] of entry.fields) {
        fieldArray.push(field);
        fieldArray.push(value);
      }
      return [entry.id, fieldArray] as [string, string[]];
    });

    return RESP.encode.streamEntries(encodedEntries);
  } catch (error) {
    if (error instanceof Error) {
      return RESP.encode.error(error.message);
    }
    return RESP.encode.error("ERR internal error");
  }
}