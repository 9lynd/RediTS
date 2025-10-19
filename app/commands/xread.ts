import { RESP } from "../resp";
import { streamStore } from "../stores/stream";
import { streamBlockingQueue } from "../queue/streamQueue";

/**
 * XREAD command handler
 * 
 * Reads data from one or more streams, starting after a specified entry ID (exclusive).
 * 
 * Syntax:
 *   XREAD STREAMS key1 key2 ... id1 id2 ...
 *   XREAD BLOCK milliseconds STREAMS key1 key2 ... id1 id2 ...
 * 
 * Features:
 * - Reads from multiple streams
 * - Exclusive (returns entries > specified ID, not >=)
 * - Supports "$" as ID (only new entries after this command)
 * - Supports blocking with timeout (BLOCK option)
 * 
 * Examples:
 *   XREAD STREAMS mystream 0-0 → all entries after 0-0
 *   XREAD STREAMS s1 s2 0-0 1-5 → from two streams
 *   XREAD BLOCK 1000 STREAMS mystream $ → block for new entries
 *   XREAD BLOCK 0 STREAMS mystream $ → block indefinitely
 * 
 * @param args - Command arguments
 * @returns RESP-encoded response (sync or async for blocking)
 */
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

  // Non-blocking XREAD
  if (blockMs === null) {
    try {
      const result = streamStore.xread(streamKeys, lastIds);

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
  // First check if there's already data available
  try {
    const immediateResult = streamStore.xread(streamKeys, lastIds);
    
    if (immediateResult.length > 0) {
      // Data available immediately - return it
      return RESP.encode.streams(immediateResult);
    }

    // No data yet - block and wait
    return streamBlockingQueue.blockClient(
      streamKeys,
      lastIds,
      blockMs,
      (keys, ids) => {
        // This function is called periodically to check for new data
        const newData = streamStore.xread(keys, ids);
        
        if (newData.length === 0) {
          return null; // No new data yet
        }

        // Return raw data - encoder will handle formatting
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