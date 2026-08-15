# Technical Documentation

## 1. System Overview

Nudge is a mindful browsing Chrome extension designed to help users understand how they spend their time online and how their browsing habits may affect their mood.

Users can organise websites into four categories:

- Social
- Work
- Relax
- Other

They can then set daily browsing boundaries for individual websites, categories, or their overall browsing time.

When a boundary is reached, Nudge does not block the website. Instead, it displays a non-blocking reminder encouraging the user to pause, take a configurable break and reflect on how they feel.

Nudge also provides a daily timeline of browsing activity and mood check-ins, alongside a calendar view for reviewing previous activity.


## 3. Technology Stack

| Area | Technology |
| --- | --- |
| Platform | Chrome Extension |
| Extension architecture | Manifest V3 |
| Frontend | React 19 |
| Language | TypeScript |
| Build tool | Vite 7 |
| Icons | lucide-react |
| Background logic | Manifest V3 service worker |
| In-page reminders | Vanilla JavaScript content script |
| UI isolation | Closed Shadow DOM |
| Storage | `chrome.storage.local` |
| Data integrity | Custom HMAC-signed store |
| Type checking | TypeScript Compiler |
| Build process | `tsc --noEmit` → `vite build` |

- React provides the component-based structure used to build Nudge's primary user interface.

- TypeScript adds static type checking to the application, helping identify type related errors during development.

- Vite handles the development and production build process for the React and TypeScript application.

- `lucide-react` provides the icon set used throughout the React interface.

- Manifest V3 provides the architecture through which Nudge interacts with Chrome.

- The extension uses an event-driven service worker alongside Chrome APIs to respond to browser activity.

---

## 4. Application Flow

A typical interaction with Nudge follows this process:

```text
Install Nudge
      ↓
Configure preferences
      ↓
Categorise websites
      ↓
Set browsing boundaries
      ↓
Browse normally
      ↓
Nudge records eligible activity
      ↓
Boundary reached
      ↓
Non-blocking reminder displayed
      ↓
Pause / reflect / take a break
      ↓
Continue browsing
      ↓
Review activity and reflections
```

Nudge is designed to operate alongside normal browsing rather than requiring constant interaction from the user.

---

## 5. Website Classification

Nudge organises websites into four categories:

- Social
- Work
- Relax
- Other

Rather than storing the complete URL of a webpage, Nudge records its hostname.

For example:

```text
Full URL:
https://www.youtube.com/watch?v=example

Recorded:
youtube.com
```

Each browsing segment is associated with the website's assigned category.

Conceptually:

```text
Active webpage
      ↓
Identify hostname
      ↓
Determine assigned category
      ↓
Associate activity with category
      ↓
Record eligible browsing time
      ↓
Evaluate relevant boundaries
```

This allows Nudge to distinguish between different types of browsing activity while avoiding the collection of unnecessary information about the exact pages users visit.

---

## 6. Activity Tracking

Nudge does not assume that an open browser tab means the user is actively using that website.

Before recording activity, Nudge checks that:

- Chrome considers the user active
- A normal Chrome window is focused
- The active tab uses HTTP or HTTPS
- Tracking is enabled
- Tracking is not paused

This helps prevent inactive or irrelevant browser time from being included in the user's activity history.

### Browsing Segments

Each browsing segment records:

- Hostname
- Assigned category
- Start time
- Last-confirmed time
- Tab identifier
- Window identifier
- Personal-day key

The personal-day key is based on the user's selected reset time.

### Browser Events

The service worker reacts to changes in browser state.

For example:

```text
User changes tab
       ↓
Chrome produces tab event
       ↓
Service worker responds
       ↓
Previous activity reconciled
       ↓
New active tab evaluated
       ↓
Tracking continues if eligible
```

Similar activity evaluation occurs when browser window focus changes, tabs close, navigation occurs, Chrome's idle state changes or scheduled reconciliation takes place.

---

## 7. Timer and Boundary System

Nudge allows users to establish daily browsing boundaries.

Boundaries can apply to:

- Individual websites
- Website categories
- Overall browsing time

As eligible browsing activity is recorded, the appropriate usage totals can be evaluated against the user's configured boundaries.

```text
Eligible browsing
       ↓
Activity recorded
       ↓
Website usage
       ↓
Category usage
       ↓
Overall usage
       ↓
Check configured boundary
       ↓
    Reached?
    /     \
   No     Yes
   ↓       ↓
Continue  Trigger Nudge
```

### Non-Blocking Behaviour

Reaching a boundary does not cause Nudge to block the current website. Instead, a non-blocking action sheet is displayed. The reminder encourages the user to pause and potentially take a configurable break while still allowing them to decide whether they want to continue browsing. This is a deliberate design decision. Nudge aims to encourage intentional browsing rather than enforce restrictions.

---

## 8. Mood and Reflection

Nudge connects browsing awareness with personal reflection. When prompted, users can reflect on how they feel rather than only being shown statistics about the amount of time they have spent online. Mood check-ins can then be viewed alongside browsing activity within the daily timeline. this allows Nudge to present browsing behaviour within a wider wellbeing context.

---

## 9. Activity History

Nudge provides users with a historical view of their browsing behaviour.

The daily view combines:

- Browsing activity
- Website/category information
- Mood check-ins
- Daily reflection

A calendar interface allows users to review patterns across the previous seven days or up to a month.

The purpose of this feature is to help users identify patterns rather than simply showing a single daily usage total.

---

## 10. Data and Privacy

Because Nudge monitors browsing activity, privacy was an important consideration when designing the extension.

### Data Nudge Records

Nudge records information required for its core functionality, including:

- Website hostname
- Assigned category
- Browsing segment times
- Tab and window identifiers
- Personal-day information

The application also stores information required for user configuration and wellbeing functionality, such as boundaries, categories and reflections.

### Data Nudge Does Not Record

Nudge deliberately does not store:

- Full URLs
- Page titles
- Search queries
- Page content

For example, Nudge may record:

```text
youtube.com
```

but does not need to record which individual YouTube video the user is watching.

This follows a data minimisation approach: Nudge stores the information required to provide its functionality without unnecessarily recording detailed browsing content.

### Local Storage

Application data is stored using:

```text
chrome.storage.local
```

Browsing information therefore remains within local extension storage.

Users can also export and import their Nudge data.

---

## 11. Data Integrity

Nudge's local storage is wrapped in a custom HMAC-signed store. The HMAC mechanism forms part of the application's data-integrity layer. It is important to distinguish integrity protection from encryption. The HMAC-signed store should not be described as encrypting the user's browsing data unless encryption is implemented separately.

---

## 12. Key System Responsibilities


- Determines whether current browsing activity is eligible to be recorded.

- Represents periods of browsing activity and associates them with the appropriate hostname, category, tab, window and personal day.

- Associates website hostnames with their assigned categories.

- Evaluates browsing activity against website, category and overall boundaries.

- Coordinates the presentation of non-blocking reminders when configured boundaries are reached.

- Displays Nudge's reminder interface within the currently active webpage.

- Allows mood information and reflections to be associated with the user's browsing activity.

- Helps maintain accurate activity information within Chrome's event driven Manifest V3 environment.

- Handles the local persistence of application settings, activity and reflection information.

---

## 13. Design Decisions

1. One of Nudge's central design decisions is not to block websites.

The intended interaction is:

```text
Automatic browsing
       ↓
Boundary reached
       ↓
Gentle interruption
       ↓
Reflection
       ↓
Intentional decision
      / \
     /   \
Take a   Continue
 break   browsing
```

The purpose of the reminder is to introduce a moment of reflection rather than make the decision on the user's behalf.


2. Nudge stores hostnames instead of complete URLs and avoids collecting page content, search queries and page titles.

This reduces the amount of detailed browsing information required by the application.


3. The reminder uses a closed Shadow DOM so that it can appear consistently across different websites without CSS conflicts.

3. The application works within Manifest V3's event driven service worker architecture rather than depending on a continuously running background page.

---

## 14. Build Process

Nudge's build process begins with TypeScript type checking:

```bash
tsc --noEmit
```

The `--noEmit` option checks the TypeScript project for type errors without generating JavaScript output.

Once type checking succeeds, Vite performs the application build:

```bash
vite build
```

Conceptually:

```text
Source Code
    ↓
TypeScript Type Check
    ↓
tsc --noEmit
    ↓
Vite Build
    ↓
Production Extension
```

This helps catch TypeScript issues before the final extension build is generated.

---

## 15. Current Limitations

- The current implementation targets Google Chrome and Manifest V3.
Additional development and testing would be required for wider browser support.

- Nudge currently follows a local storage approach, meaning browsing information is not automatically synchronised between devices.

- The current system uses the Social, Work, Relax and Other categories. Greater customisation could be introduced in future versions.

- The existing activity history could be expanded with more detailed long term insights and pattern analysis.

---

## 16. Future Development

- Cross-browser support
- More detailed daily insights
- More detailed monthly insights
- Optional synchronisation across devices
- More customisable website categories
- Additional reflection prompts
- Continued accessibility improvements
- Performance optimisation
- Further interface polish


