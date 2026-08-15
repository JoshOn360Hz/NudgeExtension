import type { ExtensionRequest, ExtensionResponse } from "./models";

export const sendRequest = async <T>(request: ExtensionRequest) => {
  const response = (await chrome.runtime.sendMessage(request)) as ExtensionResponse<T>;
  if (!response?.ok) {
    throw new Error(response?.error ?? "The extension could not complete this request");
  }
  return response.data as T;
};
