import { RESP } from "../resp";
import { streamStore } from "../stores/stream";
import { streamBlockingQueue } from "../queue/streamQueue";

export function xreadCommand(args: string[]): string | Promise<string> {
  // Parse arguments
  let blockMs: number | null = null;
  let argIndex = 0;

  // Check for BLOCK option
  if (args[argIndex]?.toUpperCase() === 'BLOCK') {
    argIndex++;
    const blockArg = args[argIndex];
    
    if (!blockArg) {
      return RESP.encode.error("ERR syntax error");
    }

    const parsedBlock = parseInt(blockArg);
    if (isNaN(parsedBlock) || parsedBlock < 0) {
      return RESP.encode.error("ERR timeout is not an integer or out of range");
    }

    blockMs = parsedBlock === 0 ? Infinity : parsedBlock;
    argIndex++;
  }

  // Next should be STREAMS keyword
  if (args[argIndex]?.toUpperCase() !== 'STREAMS') {
    return RESP.encode.error("ERR syntax error");
  }
  argIndex++;

  // Remaining args: [key1, key2, ..., id1, id2, ...]
  const remainingArgs = args.slice(argIndex);
  
  // Should have even number of args (keys + ids)
  if (remainingArgs.length === 0 || remainingArgs.length % 2 !== 0) {
    return RESP.encode.error("ERR wrong number of arguments for 'xread' command");
  }

  const numStreams = remainingArgs.length / 2;
  const streamKeys = remainingArgs.slice(0, numStreams);
  const lastIds = remainingArgs.slice(numStreams);

  const normalizedIds = lastIds.map((id, i) => {
    if (id === '$') {
      const stream = streamStore.get(streamKeys[i]);
      if (!stream || stream.entries.length === 0) {
        return '0-0'; // no entries yet
      }
      const lastEntry = stream.entries[stream.entries.length - 1];
      return lastEntry.id;
    }
    return id;
  });

  // Non-blocking XREAD
  if (blockMs === null) {
    try {
      const result = streamStore.xread(streamKeys, normalizedIds);

      if (result.length === 0) {
        return RESP.encode.nullArray();
      }
      
      return RESP.encode.streams(result);
    } catch (error) {
      if (error instanceof Error) {
        return RESP.encode.error(error.message);
      }
      return RESP.encode.error("ERR internal error");
    }
  }

  // Blocking XREAD
  try {
    const immediateResult = streamStore.xread(streamKeys, normalizedIds);
    
    if (immediateResult.length > 0) {
      return RESP.encode.streams(immediateResult);
    }

    return streamBlockingQueue.blockClient(
      streamKeys,
      normalizedIds,
      blockMs,
      (keys, ids) => {
        const newData = streamStore.xread(keys, ids);
        if (newData.length === 0) {
          return null;
        }
        return newData;
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      return Promise.resolve(RESP.encode.error(error.message));
    }
    return Promise.resolve(RESP.encode.error("ERR internal error"));
  }
}