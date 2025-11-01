[![progress-banner](https://backend.codecrafters.io/progress/redis/b7cbb691-4fdf-4052-8178-d8cec10067f4)](https://app.codecrafters.io/users/codecrafters-bot?r=2qF)

# Redis Clone in TypeScript

**RediTS** is a Redis server implementation in TypeScript, built to understand Redis internals and protocol design. Implements core Redis functionality, including data structures, replication, transactions, persistence, pub/sub, and geospatial commands.

## Project Structure

```
.
├── app/
│   ├── main.ts                      # Server entry point
│   ├── router.ts                    # Command routing and execution
│   │
│   ├── commands/                    # Command handlers
│   │
│   ├── stores/                      # Data storage
│   │   ├── store.ts                 # String & List key-value store
│   │   ├── stream.ts                # Stream data structure
│   │   └── sortedSetStore.ts        # Sorted set store (for Z* and GEO* commands)
│   │
│   ├── queue/                      # blocking queues
│   │   ├── blockingQueue.ts        # List blocking queue
│   │   └── streamQueue.ts          # Stream blocking queue
│   │
│   ├── replication/                 # Master-replica replication
│   │   ├── config.ts                # Replication configuration
│   │   ├── handshake.ts             # Replica handshake process
│   │   ├── master.ts                # Master command handling
│   │   ├── offset.ts                # Replica offset tracking
│   │   ├── propagation.ts           # Command propagation to replicas
│   │   ├── rdb.ts                   # RDB file generation
│   │   └── rdbReader.ts             # RDB file parsing
│   │
│   ├── pubsub/                      # Publish/Subscribe
│   │   └── manager.ts               # Subscription and message delivery
│   │
│   ├── transaction/                 # MULTI/EXEC transactions
│   │   └── transactionManager.ts
│   │
│   ├── resp/                        # Redis Serialization Protocol
│   │   ├── encoder.ts               # RESP encoding
│   │   └── decoder.ts               # RESP decoding
│   │
│   └── utils/
│       └── geo.ts                   # Geospatial encoding/decoding
```

## Using TypeScript?

While Redis is traditionally implemented in C for performance, TypeScript offers interesting tradeoffs for a lazy implementation while understanding system design:

- **Event-driven I/O**: Node.js's non-blocking I/O model maps well to Redis's event loop architecture
- **Type safety**: TypeScript catches protocol encoding errors at compile time

The main challenge is handling binary protocols. The RDB file format requires careful buffer manipulation, which TypeScript handles through Node's `Buffer` API.

## Replication: Distributing Data Across Nodes

### Architecture Overview

Redis replication follows a master-replica model. The master handles all writes and forwards them to replicas. Replicas maintain read-only copies of the master's dataset. The system supports multiple replicas per master, but no cascading replication (replicas can't have their own replicas in this implementation).

The replication flow has two phases: initial synchronization and continuous replication.

### Initial Synchronization: The Handshake

When a replica starts, it initiates a TCP connection to the master and performs a handshake. This multi-step process establishes the replication relationship

### RDB Snapshot Transfer

After the handshake, the master generates an RDB file, a point-in-time snapshot of all data, and sends it over the TCP connection. The RDB arrives as a RESP bulk string: `$<byte_count>\r\n<binary_data>`.

The critical implementation detail: new write commands may arrive in the same TCP packet as the RDB file. The replica must parse the bulk string length, consume exactly that many bytes as RDB data, then treat any remaining bytes as RESP commands, getting this wrong means commands get interpreted as RDB data or vice versa, corrupting the replication stream.

### RDB File Format

RDB files use a custom binary format with variable-length encoding. [learn more about RDB format](https://rdb.fnordig.de/)

The parser handles:

- Mixed endianness (big-endian for lengths in some contexts, little-endian for stored integers)
- Variable-length encoding where the first two bits of a byte determine how to read the next bytes
- Type markers for strings, integers, hash tables, and expiry timestamps
- Database selectors and resize hints for optimization

### Continuous Replication & Commands Propagation

After the RDB transfer, the master streams all write commands to replicas as they occur. Each replica tracks a replication offset, the total byte count of all commands received.

## Pub/Sub: Messaging Paradigm

The pub/sub system stores subscriptions as a map of the subscribed channel as key, and set of subscribers sockets as value `Map<channel, Set<Socket>>`. When a message is published, it's immediately written to all subscriber sockets. This is push-based, with no polling loop checking if messages arrived.

Clients in "subscribed mode" can only execute a small set of commands. The command router checks if a socket is subscribed before allowing command execution, rejecting anything that isn't `SUBSCRIBE`, `UNSUBSCRIBE`, `PING`, or `QUIT`.

## Geospatial: Abusing Sorted Sets

Redis's geo commands don't use a separate data structure; they're just sorted sets where the score is a geohash. A geohash encodes latitude/longitude into a single 52-bit integer by interleaving bits.

Distance calculations use the haversine formula with Earth's radius hardcoded to 6372797.560856 meters. The implementation is a direct port of Redis's C code, trigonometry, and all.

## Limitations

- **Blocking commands** use polling at fixed intervals. `BLPOP` checks every 100ms if data arrived, which is inefficient. A proper implementation would use event emitters or condition variables to wake blocked clients immediately when data is pushed. This project uses polling because it's simpler to reason about.

- **Command coverage** is limited to commonly-used operations. Redis has 200+ commands; this implementation covers the essential subset needed for typical applications. Advanced features like Lua scripting, modules, and cluster-specific commands aren't included.

- **No clustering or sharding**. Single-node only. Real Redis uses consistent hashing and the Raft protocol for distributed deployments.

- **RDB-only persistence**. AOF (Append-Only File) provides better durability but adds complexity around log compaction and rewriting.

## Running

```bash
# Start as master
./your_program.sh --port 6379

# Start as a replica
./your_program.sh --port 6380 --replicaof "localhost 6379"

# Load RDB file
./your_program.sh --dir /tmp --dbfilename dump.rdb
```

---

This implementation focuses on understanding how Redis works internally rather than matching its performance. The goal is learning the protocol details, replication semantics, and data structure choices that make Redis what it is.
