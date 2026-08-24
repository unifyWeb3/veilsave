export const PUBLIC_EVENT_RANGE_SIZE = 10_000n;

export interface PublicEventLog {
  blockNumber?: bigint;
  transactionHash?: `0x${string}`;
  logIndex?: number;
  args?: Record<string, unknown>;
}

export interface PublicEventReader {
  getBlockNumber: () => Promise<bigint>;
  getContractEvents: (parameters: Record<string, unknown>) => Promise<readonly PublicEventLog[]>;
}

export type EventRangeReader<T> = (fromBlock: bigint, toBlock: bigint) => Promise<readonly T[]>;

/**
 * Read public logs in provider-sized ranges. Private handles and values are not
 * interpreted here; this helper only bounds the RPC query window.
 */
export async function readEventRanges<T>(
  fromBlock: bigint,
  toBlock: bigint,
  reader: EventRangeReader<T>,
  rangeSize: bigint = PUBLIC_EVENT_RANGE_SIZE,
): Promise<T[]> {
  if (fromBlock < 0n || toBlock < 0n) throw new Error("Event block range cannot be negative");
  if (rangeSize <= 0n) throw new Error("Event block range size must be positive");
  if (fromBlock > toBlock) return [];

  const events: T[] = [];
  for (let start = fromBlock; start <= toBlock; start += rangeSize) {
    const end = start + rangeSize - 1n < toBlock ? start + rangeSize - 1n : toBlock;
    events.push(...(await reader(start, end)));
  }
  return events;
}

export async function readContractEventsInRanges(
  client: PublicEventReader,
  parameters: {
    address: `0x${string}`;
    abi: unknown;
    eventName: string;
    args?: Record<string, unknown>;
    fromBlock: bigint;
    toBlock?: bigint;
  },
): Promise<PublicEventLog[]> {
  const toBlock = parameters.toBlock ?? (await client.getBlockNumber());
  return readEventRanges(parameters.fromBlock, toBlock, (fromBlock, rangeToBlock) =>
    client.getContractEvents({ ...parameters, fromBlock, toBlock: rangeToBlock }),
  );
}
