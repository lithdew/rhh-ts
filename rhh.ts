// Author: Kenta Iwasaki
// % bun run index.ts

// A simple robin-hood hash map implementation using open addressing and linear probing.
// All keys and values are strings. The map has a fixed capacity and does not support resizing.
// All entries are stored in a single array. The array is divided into two parts: the main part and the overflow part.
// The main part is used for storing the entries. The overflow part is used for storing entries that have been shifted to make room for new entries.
// All entries are naturally sorted by their keys. This is done by using a hash function that converts the first 8 bytes of the key to a 64-bit big-endian unsigned integer.
// Robin hood hashing is used to ensure that the entries are sorted by their hash, which in turn means that this map has its entries sorted by their keys.

// An optimization may be done to speed up scanning the entries when the hash map is not close to reaching its capacity.
// This can be done by storing the index of the first entry that is not empty.

// Caveat: Keys must comprise of characters that do not contain \xff.
// This is because \xff is used as a sentinel value to indicate that an entry is empty.

export const CAPACITY = 1 << 24; // The capacity must be a power-of-two.

const SHIFT = 31 - Math.floor(Math.log2(CAPACITY)) + 1;
const OVERFLOW = (CAPACITY / 10 + (31 - SHIFT + 1)) << 1;
const EMPTY_KEY = "\xff\xff\xff\xff";

type Entry = { key: string; value?: string };

const entries: Entry[] = Array.from(
  { length: CAPACITY + OVERFLOW },
  (_, i) => ({ key: EMPTY_KEY })
);

export let len = 0;

// Convert first 8 bytes of the key to a 64-bit big-endian unsigned integer.
// If the key is shorter than 8 bytes, pad it with 0x00.
// This hash function will make it so that 'AA' < 'AB'. 'A' < 'B'.
export function hash(key: string) {
  return (
    ((key.charCodeAt(0) | 0) << 24) |
    ((key.charCodeAt(1) | 0) << 16) |
    ((key.charCodeAt(2) | 0) << 8) |
    (key.charCodeAt(0) | 0)
  );
}

export function hashToIndex(hash: number) {
  return hash >> SHIFT;
}

export function get(key: string) {
  const h = hash(key);
  let i = hashToIndex(h);

  while (true) {
    const entry = entries[i];
    if (entry.key >= key) {
      if (entry.key === key) {
        return entry.value;
      }
      return null;
    }
    i++;
  }
}

export function put(key: string, value: string) {
  const { index } = getOrPut(key);
  entries[index].key = key;
  entries[index].value = value;
}

export function getOrPut(key: string) {
  if (len >= CAPACITY) {
    throw new Error("The map is full.");
  }

  let it: Entry = { key };
  let i = hashToIndex(hash(key));
  let insertedAt: number | undefined = undefined;

  while (true) {
    const entry = entries[i];

    if (entry.key >= key) {
      // If we found an existing entry, return it.
      if (entry.key === key) {
        return { exists: true, index: i } as const;
      }

      // If the entry is occupied, we need to shift it to make room for the new entry.
      entries[i] = it;

      // If we have a previous entry, we need to shift it to make room for the new entry.
      if (entry.key === EMPTY_KEY) {
        len += 1;
        return {
          exists: false,
          index: insertedAt !== undefined ? insertedAt : i,
        } as const;
      }
      if (insertedAt === undefined) {
        insertedAt = i;
      }

      // Continue with the shifted entry.
      it = entry;
    }

    i++;
  }
}

export function del(key: string) {
  const h = hash(key);
  let i = hashToIndex(h);

  // Find the entry to delete.

  while (true) {
    const entry = entries[i];
    if (entry.key >= key) {
      if (entry.key !== key) {
        return null;
      }
      break;
    }
    i++;
  }

  const value = entries[i].value;

  // Perform backwards shift deletion to fill the gap.
  // This is done to ensure that the entries are sorted by hash.

  while (true) {
    const j = hashToIndex(hash(entries[i + 1].key));
    if (i < j || entries[i + 1].key === EMPTY_KEY) {
      entries[i] = entries[i + 1];
      break;
    }

    entries[i] = entries[i + 1];
    i++;
  }

  entries[i] = { key: EMPTY_KEY };
  len -= 1;

  return value;
}

export function* scanAscending() {
  for (const entry of entries) {
    if (entry.key !== EMPTY_KEY) {
      yield entry;
    }
  }
}

export function* scanDescending() {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.key !== EMPTY_KEY) {
      yield entry;
    }
  }
}
