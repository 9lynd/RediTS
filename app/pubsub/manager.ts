import { Socket } from "net";
import { RESP } from "../resp";

interface ClientSubscription {
  socket: Socket;
  channels: Set<string>;
}

export class PubSubManager {
  // Map of channel name -> Set of subscriber sockets
  private subscriptions: Map<string, Set<Socket>>;
  
  // Map of socket -> client subscription info
  private clients: Map<Socket, ClientSubscription>;

  constructor() {
    this.subscriptions = new Map();
    this.clients = new Map();
  }

  public subscribe(socket: Socket, channel: string): number {
    // Get or create client subscription
    let client = this.clients.get(socket);
    if (!client) {
      client = { socket, channels: new Set() };
      this.clients.set(socket, client);
      
      // Clean up when socket closes
      socket.on('close', () => {
        this.removeClient(socket);
      });
    }

    // Add channel to client's subscriptions
    client.channels.add(channel);

    // Add client to channel's subscribers
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(socket);

    console.log(`Client subscribed to '${channel}', total channels: ${client.channels.size}`);
    
    // Return the count of channels this client is subscribed to
    return client.channels.size;
  }

  public unsubscribe(socket: Socket, channel: string): number {
    const client = this.clients.get(socket);
    if (!client) {
      return 0;
    }

    // Remove channel from client's subscriptions
    client.channels.delete(channel);

    // Remove client from channel's subscribers
    const channelSubs = this.subscriptions.get(channel);
    if (channelSubs) {
      channelSubs.delete(socket);
      
      // Clean up empty channel
      if (channelSubs.size === 0) {
        this.subscriptions.delete(channel);
      }
    }

    console.log(`Client unsubscribed from '${channel}', remaining channels: ${client.channels.size}`);
    
    return client.channels.size;
  }

  public publish(channel: string, message: string): number {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers || subscribers.size === 0) {
      return 0;
    }

    // Prepare the message once
    const messageArray = RESP.encode.array(['message', channel, message]);
    
    // Push to all subscribers immediately
    let deliveredCount = 0;
    for (const socket of subscribers) {
      try {
        socket.write(messageArray);
        deliveredCount++;
      } catch (error) {
        console.error('Error delivering message to subscriber:', error);
      }
    }

    console.log(`Published to '${channel}': delivered to ${deliveredCount} subscriber(s)`);
    return deliveredCount;
  }

  public isSubscribed(socket: Socket): boolean {
    const client = this.clients.get(socket);
    return client !== undefined && client.channels.size > 0;
  }

  public getSubscriptionCount(socket: Socket): number {
    const client = this.clients.get(socket);
    return client ? client.channels.size : 0;
  }

  private removeClient(socket: Socket): void {
    const client = this.clients.get(socket);
    if (!client) return;

    // Remove from all channel subscriptions
    for (const channel of client.channels) {
      const channelSubs = this.subscriptions.get(channel);
      if (channelSubs) {
        channelSubs.delete(socket);
        if (channelSubs.size === 0) {
          this.subscriptions.delete(channel);
        }
      }
    }

    this.clients.delete(socket);
    console.log('Client removed from pub/sub');
  }
}

export const pubSubManager = new PubSubManager();