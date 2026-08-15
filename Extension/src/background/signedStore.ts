import { createDefaultState } from "../shared/constants";
import type { AppState } from "../shared/models";

type SignedEnvelope = {
  payload: string;
  signature: string;
};

const stateKey = "daylight:signed-state";
const integrityKey = "daylight:integrity-key";

const bytesToBase64 = (bytes: Uint8Array) => {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
};

const base64ToBytes = (value: string) => {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
};

export class SignedStore {
  private queue: Promise<unknown> = Promise.resolve();

  private async getCryptoKey() {
    const stored = await chrome.storage.local.get(integrityKey);
    let encoded = stored[integrityKey] as string | undefined;
    if (!encoded) {
      encoded = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
      await chrome.storage.local.set({ [integrityKey]: encoded });
    }
    return crypto.subtle.importKey(
      "raw",
      base64ToBytes(encoded),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }

  private async sign(payload: string) {
    const key = await this.getCryptoKey();
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    return bytesToBase64(new Uint8Array(signature));
  }

  private async verify(payload: string, signature: string) {
    const key = await this.getCryptoKey();
    return crypto.subtle.verify(
      "HMAC",
      key,
      base64ToBytes(signature),
      new TextEncoder().encode(payload)
    );
  }

  async get() {
    const stored = await chrome.storage.local.get(stateKey);
    const envelope = stored[stateKey] as SignedEnvelope | undefined;
    if (!envelope) {
      const initial = createDefaultState();
      await this.write(initial);
      return initial;
    }
    const valid = await this.verify(envelope.payload, envelope.signature);
    if (!valid) throw new Error("Stored data failed its integrity check");
    const state = JSON.parse(envelope.payload) as AppState;
    state.settings = { ...createDefaultState().settings, ...state.settings };
    return state;
  }

  async write(state: AppState) {
    const payload = JSON.stringify(state);
    const signature = await this.sign(payload);
    await chrome.storage.local.set({ [stateKey]: { payload, signature } satisfies SignedEnvelope });
  }

  update<T>(mutate: (state: AppState) => T | Promise<T>) {
    const operation = this.queue.then(async () => {
      const state = await this.get();
      const result = await mutate(state);
      await this.write(state);
      return result;
    });
    this.queue = operation.then(
      () => undefined,
      () => undefined
    );
    return operation;
  }

  async reset() {
    await this.write(createDefaultState());
  }
}

export const store = new SignedStore();
