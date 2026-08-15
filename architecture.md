# Nudge — System Architecture

## Architecture Diagram

```text
┌─────────────────────────────────────┐
│              Nudge UI               │
│         React + TypeScript          │
│                                     │
│   Dashboard • Popup • Settings      │
└──────────────────┬──────────────────┘
                   │
                   │ Extension communication
                   ▼
┌─────────────────────────────────────┐
│      MV3 Background Service Worker  │
│                                     │
│  • Activity tracking                │
│  • Browser event handling           │
│  • Boundary monitoring              │
│  • Reminder coordination            │
└──────────────┬──────────────┬───────┘
               │              │
               ▼              ▼
┌─────────────────────┐  ┌─────────────────────┐
│ chrome.storage.local│  │   Content Script    │
│                     │  │                     │
│ • Activity          │  │ Displays Nudge     │
│ • Settings          │  │ reminder in page   │
│ • Categories        │  └──────────┬──────────┘
│ • Boundaries        │             │
│ • Reflections       │             ▼
└─────────────────────┘  ┌─────────────────────┐
                         │  Closed Shadow DOM  │
                         │                     │
                         │ Isolated reminder   │
                         │ interface           │
                         └─────────────────────┘
```

---

## Component Responsibilities

### React User Interface

The main Nudge interface is built using **React 19 and TypeScript**.

It provides the user-facing parts of the extension, including the dashboard, popup and settings. Users interact with this layer to manage their browsing preferences, categories, and boundaries and to review their activity. Keeping the user interface separate from the background tracking logic allows each part of the extension to have a clear responsibility.

### Background Service Worker

Nudge uses a **Manifest V3 background service worker** to manage its core background functionality.

The service worker responds to browser events including:

- Active tab changes
- Page navigation and loading state
- Browser window focus changes
- Tabs being closed
- Chrome idle-state changes
- Scheduled reconciliation and boundary alarms
- Requests from the dashboard and extension popup

These events allow Nudge to respond to changes in browsing behaviour while working within Chrome's event-driven Manifest V3 architecture.

### Content Script

The content script allows Nudge to display its reminder interface directly within the webpage the user is currently viewing.

When a browsing boundary is reached, the reminder can be presented without redirecting the user away from the current website.

### Closed Shadow DOM

The in-page reminder is rendered inside a **closed Shadow DOM**.

This isolates Nudge's reminder interface from the website's existing styling. It helps prevent the website's CSS from changing the appearance of the reminder and prevents Nudge's styles from interfering with the webpage.

### Local Storage

Nudge uses `chrome.storage.local` for local data persistence.

The storage layer holds the information required by the extension, including browsing activity and user configuration.

Nudge's local storage is wrapped in a custom HMAC-signed store to provide a data-integrity mechanism.

---

## Component Communication

At a high level, the components interact as follows:

```text
                     User
                       │
                       ▼
                  React UI
                       │
                       ▼
             Background Service
                   Worker
                  ↙      ↘
                 ↙        ↘
        Local Storage    Content Script
                              │
                              ▼
                         Shadow DOM
                              │
                              ▼
                         Nudge Reminder
```

The **background service worker acts as the central background component** of the extension.

The React interface can request information from the background system when required. The service worker responds to browser activity and interacts with locally stored data. When a browsing boundary requires a reminder, the content script is used to display the reminder within the current webpage.

---

## Activity Flow

Nudge responds to browser activity rather than simply assuming that an open tab represents active browsing.

```text
Browser activity
      ↓
Service worker receives browser event
      ↓
Determine whether activity is eligible
      ↓
Record or update browsing activity
      ↓
Evaluate configured boundaries
      ↓
Boundary reached?
      ↓
Content script displays reminder
```

Before activity is recorded, Nudge checks that:

- Chrome considers the user active.
- A normal browser window is focused.
- The active tab uses HTTP or HTTPS.
- Tracking is enabled.
- Tracking has not been paused.

These checks help prevent inactive or irrelevant browser time from being included in the user's recorded activity.

---

## Reminder Flow

Nudge uses a non-blocking approach when a browsing boundary is reached.

```text
Browsing boundary reached
          ↓
Background logic identifies boundary
          ↓
Reminder requested
          ↓
Content script
          ↓
Closed Shadow DOM
          ↓
Nudge reminder displayed
          ↓
User chooses how to respond
```

The reminder does not automatically block the website. Instead, it encourages the user to pause, take a configurable break, and reflect while leaving the final decision with the user.

---

## Data Flow

Browsing information moves through the architecture as follows:

```text
Browser Activity
       ↓
Background Service Worker
       ↓
Activity Processing
       ↓
Browsing Segment
       ↓
chrome.storage.local
       ↓
Nudge Interface
       ↓
User
```

Each browsing segment records information including:

- Hostname
- Assigned category
- Start time
- Last-confirmed time
- Tab identifier
- Window identifier
- Personal-day key

Nudge stores the website hostname rather than the full URL.

For example:

```text
Stored:
youtube.com

Not stored:
https://www.youtube.com/watch?v=example
```

This allows Nudge to track website-level activity while limiting the amount of detailed browsing information it collects.


## Further Technical Information

For more detailed information about Nudge's technology stack, activity tracking, timer and boundary system, website classification, privacy, key functionality, and build process, see [`technical-documentation.md`](./technical-documentation.md).