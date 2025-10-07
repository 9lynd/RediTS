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

  static null(): string {
    return "$-1\r\n";
  }
}