export function getTimedOutTransactionHash(err: unknown): `0x${string}` | null {
  if (!(err instanceof Error)) return null;
  const isReceiptTimeout =
    err.name === "WaitForTransactionReceiptTimeoutError" ||
    err.message.includes("WaitForTransactionReceiptTimeoutError") ||
    err.message.includes("Timed out while waiting for transaction");
  if (!isReceiptTimeout) return null;

  const match = err.message.match(/hash "([^"]+)"/);
  const hash = match?.[1];
  return hash?.startsWith("0x") ? (hash as `0x${string}`) : null;
}

export function getTransactionErrorMessage(err: unknown): string {
  const timedOutHash = getTimedOutTransactionHash(err);
  if (timedOutHash) {
    return "Transaction was submitted but the RPC timed out before confirmation. Check the explorer link; refresh this page after it confirms.";
  }

  return err instanceof Error ? err.message : "Transaction failed";
}
