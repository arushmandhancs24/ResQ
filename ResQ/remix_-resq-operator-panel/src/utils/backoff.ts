export function computeBackoff(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 16000);
}
