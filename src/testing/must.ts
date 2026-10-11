export default function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error("Missing element");
  }
  return value;
}
