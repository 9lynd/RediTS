import { RESP } from "../resp";
import { store } from "../stores/store";

export function setCommand(args: string[]): string {

  if(args.length < 2 || args.length > 4) {
    return RESP.encode.error(`ERR: wrong number of arguments for set: ${args.length}`);
  }

  const key = args[0];
  const value = args[1];

  if(args[2] && args[3]) {
    const option = args[2].toUpperCase();  
    const expire = parseInt(args[3]);
    store.set(key, value, new Date(Date.now() + expire));

    if(isNaN(expire)) {
      return RESP.encode.error((`ERR: invalid expire time -> ${args[3]}`));
    }

    if (option === 'PX') {
      store.set(key, value, new Date(Date.now() + expire));
    }else if(option === 'EX') {
      store.set(key, value, new Date(Date.now() + expire * 1000));
    }
    
  } else {
    store.set(key, value);
  }

  return RESP.encode.simpleString("OK");
}