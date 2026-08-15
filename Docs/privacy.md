# Data & Privacy


## What Nudge Records

To provide browsing activity tracking, Nudge records information about browsing sessions.

Each browsing segment can contain:

- Website hostname
- Assigned category
- Start time
- Last-confirmed time
- Tab identifier
- Window identifier
- Personal-day key based on the user's selected reset time

For example, Nudge may record:

```text
youtube.com
```

This allows the extension to determine how much eligible browsing time has been associated with a website and its assigned category. Nudge also stores information required to provide user-configured features such as browsing boundaries, categories, and reflections.

---

## What Nudge Does Not Record

Nudge deliberately avoids storing detailed information about the content a user views.

Nudge does **not** store:

- Full URLs
- Page titles
- Search queries
- Page content

For example:

```text
Nudge may record:

youtube.com

Nudge does not record:

https://www.youtube.com/watch?v=example
```

This allows Nudge to understand that time was spent on a particular website without needing to know the specific page or content being viewed.

---

## Why Hostnames Are Used

Nudge uses website hostnames because they provide enough information for website-level activity tracking and categorisation without requiring the complete browsing URL.

For example:

```text
https://www.reddit.com/r/example/comments/12345
```

can be represented for Nudge's purposes as:

```text
reddit.com
```

The hostname can then be associated with a category such as:

- Social
- Work
- Relax
- Other

This supports Nudge's functionality while reducing the amount of detailed browsing information stored by the extension.

---

## Local Data Storage

Nudge uses:

```text
chrome.storage.local
```

to store extension data locally.

This storage contains the information required for Nudge's functionality, including browsing activity and user configuration.

The storage layer is wrapped in a **custom HMAC-signed store**.

The HMAC mechanism forms part of Nudge's data-integrity approach. It should not be considered encryption; its purpose is related to verifying the integrity of stored data rather than making that data unreadable.

---

## Data Minimisation

Nudge follows the principle of collecting only the information required for its functionality.

For browsing tracking, Nudge needs to understand:

```text
Which website?
      ↓
What category?
      ↓
When was it being used?
      ↓
How much eligible time was spent?
```

It does not need to understand:

```text
Which exact webpage?
What was searched?
What was being read?
What was being watched?
What content appeared on the page?
```

Avoiding this information reduces the amount of detailed browsing data handled by the extension.

---

## When Browsing Activity Is Recorded

Nudge does not automatically count every open browser tab as active browsing.

Before recording activity, Nudge checks that:

- Chrome considers the user active.
- A normal browser window is focused.
- The active tab uses HTTP or HTTPS.
- Tracking is enabled.
- Tracking has not been paused.

These checks help ensure that recorded activity reflects eligible browsing rather than simply measuring how long a browser tab has remained open.

---

## User Control

Nudge is designed to give users control over both their browsing decisions and their Nudge data.

Users can configure browsing boundaries for:

- Individual websites
- Website categories
- Overall browsing time

When a boundary is reached, Nudge provides a **non-blocking reminder** rather than automatically preventing the user from accessing the website. Users can also pause or disable tracking. This approach allows Nudge to encourage more intentional browsing without removing control from the user.

---

## Data Import and Export

Nudge allows users to export and import their data. This provides users with additional control over the information stored by the extension.

---

## In-Page Reminder Privacy

Nudge uses a content script to display reminders within webpages when appropriate. The reminder interface is rendered inside a **closed Shadow DOM**.

The Shadow DOM is primarily an interface-isolation mechanism. It helps prevent the webpage's existing CSS from interfering with Nudge's reminder interface and prevents Nudge's styles from affecting the webpage.The Shadow DOM should not be considered a mechanism for encrypting or hiding browsing data.

---

## Privacy by Design

Nudge's privacy approach can be summarised as:

```text
Record what is necessary
        ↓
Prefer hostname-level information
        ↓
Avoid detailed webpage information
        ↓
Store application data locally
        ↓
Give users control over tracking
        ↓
Allow data import and export
```

The objective is to provide useful digital wellbeing features without requiring unnecessary insight into the specific content a user consumes online.

---

## Current Scope

Nudge currently uses local Chrome extension storage. Future features such as optional synchronisation across devices would introduce additional privacy considerations because data may need to move beyond the local extension environment.Any future implementation of synchronisation would therefore require additional consideration of data storage, transmission, user consent, and privacy.

---

## Privacy Summary

Nudge is designed around the following privacy principles:

| Principle | Approach |
| --- | --- |
| **Data minimisation** | Only information required for Nudge's functionality is recorded |
| **Hostname-level tracking** | Hostnames are recorded rather than complete browsing URLs |
| **No page-content collection** | Page titles, search queries, and webpage content are not stored |
| **Loca l storage** | Extension data is stored using `chrome.storage.local` |
| **User control** | Users can control and pause tracking |
| **Data portability** | Users can export and import their data |
| **Data integrity** | Local storage is wrapped in a custom HMAC-signed store |

---

