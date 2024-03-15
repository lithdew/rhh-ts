import BTree from "./b+tree";
import { CAPACITY, put, del } from "./rhh";

const items = Array.from({ length: Math.floor(CAPACITY * 0.7) }, (_, i) => {
  return Bun.SHA256.hash(Uint8Array.of(i), "hex").slice(0, 16);
});

const tree = new BTree(undefined, (a: string, b: string) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
});

for (let i = 0; i < 10; i++) {
  Bun.gc(true);

  const now = performance.now();

  for (const [i, item] of items.entries()) {
    put(item, String(i));
  }

  for (const item of items) {
    del(item);
  }

  const elapsed = performance.now() - now;
  console.log(`rhh (#${i + 1}): ${elapsed}ms`);
}

for (let i = 0; i < 10; i++) {
  Bun.gc(true);

  const now = performance.now();

  for (const [i, item] of items.entries()) {
    tree.set(item, String(i));
  }

  for (const item of items) {
    tree.delete(item);
  }

  const elapsed = performance.now() - now;
  console.log(`b+tree (#${i + 1}): ${elapsed}ms`);
}
