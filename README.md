# Microsoft Teams Theme for SillyTavern

A SillyTavern extension that makes the whole app look and work like Microsoft Teams: the title bar with search, the app rail down the left, the Chat list, the chat header, Teams message bubbles and the compose box. It comes in light and dark, and switches to Teams mobile on phones.

![Desktop, light](.github/desktop-light.jpg)

![Desktop, dark](.github/desktop-dark.jpg)

<p>
  <img src=".github/phone-list.jpg" width="260" alt="Phone: the chat list with the app bar">
  <img src=".github/phone-chat.jpg" width="260" alt="Phone: an open chat">
</p>

## What it changes

- **Title bar.** Search filters the chat list by name or message. Your persona's picture sits on the right and opens Persona Management.
- **App rail.** SillyTavern's menu buttons become Teams apps with labels: Chat, Characters, Personas, Lore, Generation, Formatting, API, Wallpaper, Extensions and Settings. Each menu opens as a panel in the chat list's place.
- **Chat list.** Your recent chats, with Pinned and Recent sections like Teams. It uses SillyTavern's own recent chats and pins, so pinning a chat on the welcome screen pins it here too. The pen button starts a new chat from the character list.
- **Chat header.** The character's picture and name, which opens their card, a Chat tab, and buttons for chat history, a new chat and closing the chat.
- **Messages.** Everyone else's messages sit on the left with their picture, name and time. Yours sit on the right in Teams lavender. Times read the Teams way: `10:42 AM`, `Yesterday 10:42 AM` or `10/21 3:15 PM`. Message actions appear as a toolbar when you hover a message, and swipes become a small pager under the last reply.
- **Compose box.** "Type a message" with the tools on the right and the purple send arrow.
- **Controls.** Buttons, fields, checkboxes, sliders, menus, dialogs and toasts follow Fluent 2.
- **Phones.** One pane at a time: the chat list with an app bar along the bottom, or the open chat with a back arrow.

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
| Appearance | Light, Dark, or follow the system. |
| Show the chat list | Hides the list on desktop so the chat gets the room. |
| Show characters as Available | The green presence badge on pictures. |
| Teams-style message times | Short times in place of SillyTavern's full dates. |
| Chats in the list | How many recent chats to load (5 to 500). |

## Notes

- Needs SillyTavern 1.19.0 or newer.
- Every rule is scoped under `body.ms-teams`, so your own Custom CSS can still override it.
- The font is Segoe UI where it's installed (Windows), falling back to the system font elsewhere.
- This is an unofficial look-alike theme. It isn't made by or affiliated with Microsoft. Microsoft Teams is a trademark of Microsoft.

## License

MIT
