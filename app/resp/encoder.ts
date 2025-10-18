export class RESPEncoder {

  static bulkString(value: string): string {
    return `$${value.length}\r\n${value}\r\n`;
  }

  static simpleString(value: string): string {
    return `+${value}\r\n`;
  }

  static error(message: string): string {
    return `-${message}\r\n`;
  }

  static integer(value: number): string{
    return `:${value}\r\n`;
  }

  static array(values: string[]): string {
    let result = `*${values.length}\r\n`;
    for (const value of values) {
      result += this.bulkString(value);
    }

    return result;
  }

  /**
 * Encodes stream entries (nested arrays) for XRANGE/XREAD commands
 * 
 * Format: [[id, [field, value, ...]], [id, [field, value, ...]], ...]
 * RESP output:
 *   *2\r\n
 *     *2\r\n$3\r\n0-1\r\n*2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n
 *     *2\r\n$3\r\n0-2\r\n*2\r\n$3\r\nbaz\r\n$3\r\nqux\r\n
 */
static streamEntries(entries: Array<[string, string[]]>): string {
  // Outer array: number of entries
  let result = `*${entries.length}\r\n`;

  for (const [id, fields] of entries) {
    // Each entry is an array of 2 elements: [id, fields]
    result += '*2\r\n';
    result += this.bulkString(id);
    result += `*${fields.length}\r\n`;
    for (const field of fields) {
      result += this.bulkString(field);
    }
  }

  return result;
}

  static null(): string {
    return "$-1\r\n";
  }
}