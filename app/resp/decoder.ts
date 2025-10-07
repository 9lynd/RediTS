type RESPValue = string | number | RESPValue[] | null;

export class RESPDecoder {
  private buffer: string = "";
  private position: number = 0;
  private CRLFBytes = '\r\n';

  decode(data: Buffer): RESPValue[] {
    this.buffer = data.toString();
    this.position = 0;
    const results: RESPValue[] = [];

    while(this.position < this.buffer.length) {
      const value = this.decodeValue();
      if(value !== null) {
        results.push(value);
      }
    }
    return results;
}

private decodeValue(): RESPValue {

  // extract type indicator (first character)
  const type = this.buffer[this.position];
  this.position++;

  switch(type) {
    case '+': 
      return this.decodeSimpleString();
    
    case '-':
      return this.decodeSimpleString();

    case ':':
      return this.decodeInteger();
    
    case '$':
      return this.decodeBulkString();
    
    case '*':
      return this.decodeArray();
    
    default:
      throw new Error(`Unkown RESP Type: ${type}`);
  }
}

// decode simple string -> format: +STRING\r\n
private decodeSimpleString(): string{

  const end = this.buffer.indexOf(this.CRLFBytes, this.position);
  // Extract the string between type indicator and \r\n
  const value = this.buffer.substring(this.position, end);
  // Move Position past \r\n
  this.position = end + 2;
  return value;
}

// decode bulk string -> format: $LENGTH\r\nSTRING\r\n
private decodeBulkString(): string | null{
  // read the length of the string
  const end = this.buffer.indexOf(this.CRLFBytes, this.position);
  const length = parseInt(this.buffer.substring(this.position, end));
  this.position = end + 2;

  if (length === -1) {
    return null;
  }

  // Read string with the exact length
  const value = this.buffer.substring(this.position, this.position + length);
  this.position += length + 2;
  return value;
}

// decode an integer -> format: (:NUMBER\r\n)
private decodeInteger(): number {
  const end = this.buffer.indexOf(this.CRLFBytes, this.position);
  const value = parseInt(this.buffer.substring(this.position, end));
  this.position = end + 2;
  return value;
}

// decode an array -> format: (*COUNT\r\n...elements...)
private decodeArray (): RESPValue[] {
  const end = this.buffer.indexOf('\r\n', this.position);
  const length = parseInt(this.buffer.substring(this.position, end));
  this.position = end + 2;

  if (length === -1) {
    return [];
  }

  const array: RESPValue[] = [];

  for (let i = 0; i < length; i++){
    array.push(this.decodeValue());
  }

  return array;

}

}