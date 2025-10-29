import { RESP } from "../resp";
import { pubSubManager } from "../pubsub/manager";

export function publishCommand(args: string[]): string {
  if (args.length < 2) {
    return RESP.encode.error("ERR wrong number of arguments for 'PUBLISH' command");
  }

  const channel = args[0];
  const message = args[1];
  
  const subscriberCount = pubSubManager.publish(channel, message);
  
  return RESP.encode.integer(subscriberCount);
}