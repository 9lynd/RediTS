import * as fs from 'fs';
import * as path from 'path';
import { store } from '../stores/store';

export class RDBReader {
  public async loadRDB(dir: string, filename: string): Promise<void> {
    const filepath = path.join(dir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      console.log(`RDB file not found: ${filepath}`);
      return;
    }
    
    try {
      const data = fs.readFileSync(filepath);
      console.log(`Loading RDB file: ${filepath} (${data.length} bytes)`);
      
      this.parseRDB(data);
      console.log('RDB file loaded successfully');
    } catch (error) {
      console.error('Error loading RDB file:', error);
    }
  }
  
  private parseRDB(data: Buffer): void {
    let pos = 0;
    
    // Check magic string "REDIS"
    const magic = data.slice(pos, pos + 5).toString();
    if (magic !== 'REDIS') {
      throw new Error('Invalid RDB file: missing REDIS magic string');
    }
    pos += 5;
    
    // Read version (4 bytes)
    const version = data.slice(pos, pos + 4).toString();
    console.log(`RDB Version: ${version}`);
    pos += 4;
    
    // Parse sections
    while (pos < data.length) {
      const opcode = data[pos];
      pos++;
      
      if (opcode === 0xFF) {
        // EOF marker
        console.log('Reached EOF marker');
        break;
      } else if (opcode === 0xFE) {
        // Database selector
        const dbNum = this.readLength(data, pos);
        pos = dbNum.newPos;
        console.log(`Database selector: ${dbNum.value}`);
      } else if (opcode === 0xFB) {
        // Hash table size info
        const tableSize = this.readLength(data, pos);
        pos = tableSize.newPos;
        const expirySize = this.readLength(data, pos);
        pos = expirySize.newPos;
        console.log(`Hash table sizes: ${tableSize.value}, ${expirySize.value}`);
      } else if (opcode === 0xFD) {
        // Expiry time in seconds
        const expirySeconds = data.readUInt32LE(pos);
        pos += 4;
        const expiryMs = expirySeconds * 1000;
        
        // Read value type and key-value
        const valueType = data[pos];
        pos++;
        const result = this.readKeyValue(data, pos, valueType, new Date(expiryMs));
        pos = result.newPos;
      } else if (opcode === 0xFC) {
        // Expiry time in milliseconds
        const expiryMs = Number(data.readBigUInt64LE(pos));
        pos += 8;
        
        // Read value type and key-value
        const valueType = data[pos];
        pos++;
        const result = this.readKeyValue(data, pos, valueType, new Date(expiryMs));
        pos = result.newPos;
      } else if (opcode === 0xFA) {
        // Auxiliary field
        const key = this.readString(data, pos);
        pos = key.newPos;
        const value = this.readString(data, pos);
        pos = value.newPos;
        console.log(`Auxiliary: ${key.value} = ${value.value}`);
      } else {
        // Value type (0 = string)
        const result = this.readKeyValue(data, pos, opcode, undefined);
        pos = result.newPos;
      }
    }
  }
  
  private readKeyValue(data: Buffer, pos: number, valueType: number, expiresAt?: Date): { newPos: number } {
    // Read key
    const key = this.readString(data, pos);
    pos = key.newPos;
    
    // Read value based on type
    if (valueType === 0) {
      // String encoding
      const value = this.readString(data, pos);
      pos = value.newPos;
      
      console.log(`Key: ${key.value}, Value: ${value.value}, Expires: ${expiresAt?.toISOString() || 'never'}`);
      
      // Store in memory
      store.set(key.value, value.value, expiresAt);
    } else {
      console.log(`Unsupported value type: ${valueType}`);
    }
    
    return { newPos: pos };
  }
  
  private readLength(data: Buffer, pos: number): { value: number; newPos: number } {
    const firstByte = data[pos];
    const type = (firstByte & 0xC0) >> 6;
    
    if (type === 0) {
      // 6-bit length
      return { value: firstByte & 0x3F, newPos: pos + 1 };
    } else if (type === 1) {
      // 14-bit length
      const value = ((firstByte & 0x3F) << 8) | data[pos + 1];
      return { value, newPos: pos + 2 };
    } else if (type === 2) {
      // 32-bit length
      const value = data.readUInt32BE(pos + 1);
      return { value, newPos: pos + 5 };
    } else {
      // Special encoding
      const encoding = firstByte & 0x3F;
      if (encoding === 0) {
        // 8-bit integer
        return { value: data[pos + 1], newPos: pos + 2 };
      } else if (encoding === 1) {
        // 16-bit integer
        return { value: data.readUInt16LE(pos + 1), newPos: pos + 3 };
      } else if (encoding === 2) {
        // 32-bit integer
        return { value: data.readUInt32LE(pos + 1), newPos: pos + 5 };
      }
      throw new Error(`Unsupported special encoding: ${encoding}`);
    }
  }
  
  private readString(data: Buffer, pos: number): { value: string; newPos: number } {
    const length = this.readLength(data, pos);
    pos = length.newPos;
    
    const value = data.slice(pos, pos + length.value).toString();
    return { value, newPos: pos + length.value };
  }
}

export const rdbReader = new RDBReader();