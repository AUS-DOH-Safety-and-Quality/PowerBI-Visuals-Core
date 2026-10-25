import at from "../util/at";
export default function findBy<T, K extends keyof T>(items: readonly T[], key: K, value: T[K]): T | undefined {
  for (let i = 0; i < items.length; i++) {
    const item = at(items, i);
    if (item[key] === value) {
      return item;
    }
  }
  return undefined;
}
