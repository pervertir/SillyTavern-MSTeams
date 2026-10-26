# Microsoft Teams Theme for SillyTavern

A SillyTavern extension that makes the whole app look and work like Microsoft Teams: the title bar with search, the app rail down the left, the Chat list, the chat header, Teams message bubbles and the compose box. It comes in light and dark, and switches to Teams mobile on phones.

![Desktop, light](.github/desktop-light.jpg)

![Desktop, dark](.github/desktop-dark.jpg)

<p>
  <img src=".github/phone-list.jpg" width="260" alt="Phone: the chat list with the app bar">
  <img src=".github/phone-chat.jpg" width="260" alt="Phone: an open chat">
</p>

## What it changes

- **Title bar.** The button at the far left hides or shows the app rail, and the arrows go back and forward between the chats you've opened, as in Teams. Search filters the chat list by name or message. On the right, your persona shows as a Teams monogram of its name (or its picture, if you turn that on) and opens Persona Management.
- **App rail.** The Teams rail, with Teams' icons on SillyTavern's menus in SillyTavern's own order:

  | Rail icon | Opens |
  |---|---|
  | Activity (bell) | AI Response Configuration |
  | Chat | The chat list |
  | Calendar | API Connections |
  | Calls (phone) | AI Response Formatting |
  | OneDrive (cloud) | World Info |
  | Copilot | User Settings |
  | More (…) | Backgrounds, Persona Management and Character Management |
  | Apps (+ in a box), at the bottom | Extensions |

  Tooltips give the Teams name and shortcut, so the table above is the key to what each icon opens. App names under the icons are off by default, as in Teams, and can be turned on in the settings.

  Each app looks like its Teams screen while doing its own job:
  - **Activity** is a pane beside the open chat, like Teams' feed.
  - **Calendar** shows this work week with the current time line; your API connection is today's meeting (red when disconnected), and the connection settings sit on the right like the meeting's details. Today and the arrows move the week.
  - **Calls** has Teams' dial pad and speed dial on the left, with the formatting settings beside it.
  - **OneDrive** keeps your lorebooks in My files as Word documents down the left; New document creates one, Upload imports one. The open lorebook is a Word page with a ribbon (New paragraph, Expand/Collapse all, Rename, Save a copy, Download, Delete): each entry reads as a heading with its keywords and text, and the ¶ Entry settings button shows each entry's matching options.
  - **Copilot** greets your persona by name, and its "Message Copilot" box searches the settings.
  - **Apps** is the app store: each extension is a card, the search box filters them, and the side menu opens Manage your apps and Get more apps (install).
- **Chat list.** Laid out like Teams: **Favorites** (SillyTavern's pinned chats, so pinning a chat on the welcome screen adds it here), **Chats** with your recent one-on-one chats, and **Teams and channels**, where each group chat is a team with a square monogram and each of its chats is a channel under it. Teams collapse and remember it. The pen button starts a new chat.
- **Chat header.** The character's picture and name, which open their card, Teams' Chat, Shared and + tabs, and the video, call and … buttons: video starts a new chat, call opens the chat history, and … has those plus View profile and Close chat.
- **Messages.** Everyone else's messages sit on the left with their picture, name and time. Yours sit on the right in Teams lavender. Times read the Teams way: `10:42 AM`, `Yesterday 10:42 AM` or `10/21 3:15 PM`. Message actions appear as a toolbar when you hover a message, and swipes become a small pager under the last reply.
- **Compose box.** "Type a message" with Teams' emoji (extensions menu) and + (chat options) buttons and the send arrow on the right.
- **Controls.** Buttons, fields, checkboxes, sliders, menus, dialogs and toasts follow Fluent 2.
- **Phones.** One pane at a time: the chat list with an app bar along the bottom, or the open chat with a back arrow.

- **Keyboard shortcuts.** Teams' web shortcuts work and show in tooltips the way your OS writes them (`⌘⇧2` on a Mac, `Ctrl+Shift+2` on Windows): `Mod+Shift+1`…`8` open the rail apps top to bottom, `Mod+Alt+E` goes to Search, `Mod+Alt+N` starts a new chat, `Alt+←`/`Alt+→` go back and forward, and `Mod+.` shows the full list, as does **…** → Keyboard shortcuts in the title bar.
- **No trace of SillyTavern.** While the theme is on, the browser tab reads like a Teams tab (`Chat | Name | Microsoft Teams`) with Teams' own icon (linked from teams.microsoft.com, not copied into the theme), the message box says "Type a message", the welcome screen gives way to a Teams-style empty pane, and the version number is hidden. Turning the theme off puts all of it back. SillyTavern's loading screen still shows for a moment before extensions load, and some of its own menus mention it by name.

SillyTavern's background image is hidden while the theme is on.

## Install

1. In SillyTavern, open **Extensions** → **Install extension**.
2. Paste `https://github.com/pervertir/SillyTavern-MSTeams` and install.
3. Turn off any other UI theme extension (such as Moonlit Echoes) so the two don't fight.

## Settings

Find them under **Extensions** → **Microsoft Teams Theme**:

| Setting | What it does |
|---|---|
| Enable theme | Turns the whole look on or off. Off leaves SillyTavern exactly as it was. |
| Appearance | Light, Dark, or follow the system. The title bar's … menu also has Switch to dark/light theme. |
| Show the chat list | Hides the list on desktop so the chat gets the room. |
| Show app names under the rail icons | Off by default. Phones always show them, as Teams mobile does. |
| Show your persona's picture instead of its initials | Off by default, so you get a Teams monogram. |
| Show characters as Available | The green presence badge on pictures. |
| Teams-style message times | Short times in place of SillyTavern's full dates. |
| Chats in the list | How many recent chats to load (5 to 500). |

## Notes

- Needs SillyTavern 1.19.0 or newer.
- Every rule is scoped under `body.ms-teams`, so your own Custom CSS can still override it.
- The font is Segoe UI, as in Teams. Windows uses its installed copy; on macOS and elsewhere the theme loads it from Microsoft's font CDN (the same files Fluent UI web apps use), only while the theme is on.
- This is an unofficial look-alike theme. It isn't made by or affiliated with Microsoft. Microsoft Teams is a trademark of Microsoft.

## License

MIT
