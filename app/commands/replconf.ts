import { RESP } from "../resp";

export function replconfCommand(args: string[]): string {
  return RESP.encode.simpleString("OK");
}