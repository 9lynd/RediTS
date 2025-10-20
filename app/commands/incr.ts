import { RESP } from "../resp";
import { store } from "../stores/store";

export function incrCommand(args: string[]): string {

  if (args.length !== 1) {
    return RESP.encode.error("ERR wrong number of argument for 'INCR' command");
  }

  const key = args[0];
  const currentValue = store.get(key);

  if (currentValue === null) {
    store.set(key, "1");
    return RESP.encode.integer(1);
  }

  const parsedValue = parseInt(currentValue);

  if (isNaN(parsedValue)) {
    return RESP.encode.error("ERR value is not an integer or out of range")
  }

  if (parsedValue.toString() !== currentValue.trim()) {
    return RESP.encode.error("ERR value is not an integer or out of range");
  }

  const newValue = parsedValue + 1;
  store.set(key, newValue.toString());
  
  return RESP.encode.integer(newValue);
}