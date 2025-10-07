import { RESPDecoder } from "./decoder";
import { RESPEncoder } from "./encoder";

export class RESP {
  public static get encode() {
    return RESPEncoder;
  }

  public static decode(data: Buffer) {
    const decoder = new RESPDecoder();
    return decoder.decode(data);
  }
}