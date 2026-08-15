import type { ExtensionRequest } from "../shared/models";
import { handleRequest, initializeState } from "./handlers";
import { processActivity } from "./tracking";

const activityTransition = () => {
  void processActivity(true);
};

const ensureReconciliationAlarm = async () => {
  const existing = await chrome.alarms.get("daylight:reconcile");
  if (!existing) await chrome.alarms.create("daylight:reconcile", { periodInMinutes: 1 });
};

chrome.runtime.onInstalled.addListener((details) => {
  void initializeState().then(async () => {
    await ensureReconciliationAlarm();
    if (details.reason === "install") await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    await processActivity(true);
  });
});

chrome.runtime.onStartup.addListener(() => {
  void initializeState().then(async () => {
    await ensureReconciliationAlarm();
    await processActivity(false);
  });
});

chrome.tabs.onActivated.addListener(activityTransition);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "complete") activityTransition();
});
chrome.tabs.onRemoved.addListener(activityTransition);
chrome.windows.onFocusChanged.addListener(activityTransition);
chrome.idle.onStateChanged.addListener(activityTransition);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "daylight:reconcile" || alarm.name === "daylight:boundary") void processActivity(false);
});

chrome.notifications.onClicked.addListener(() => {
  void chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

chrome.runtime.onMessage.addListener((request: ExtensionRequest, _sender, sendResponse) => {
  void handleRequest(request).then(sendResponse);
  return true;
});

void initializeState().then(async () => {
  await ensureReconciliationAlarm();
  await processActivity(false);
});
