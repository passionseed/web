# SHIFT Discord join

Paid students use their personal `/shift/join/{token}` link to connect Discord
and receive the role matching their cohort. Supabase performs OAuth with the
`identify email guilds.join` scopes. The callback links the application and
asks the bot to add the student to the server.

## Configuration

- `DISCORD_SHIFT_GUILD_ID`: the SHIFT server ID.
- `DISCORD_SHIFT_BOT_TOKEN`: a bot token from the **same Discord application**
  configured in Supabase Auth's Discord provider. If unset, the app uses
  `DISCORD_BOT_TOKEN`. A separate SHIFT token lets other notification bots keep
  their existing configuration.
- `DISCORD_SHIFT_INVITE_URL`: a valid invite to that server, used when automatic
  joining is unavailable.
- `DISCORD_SHIFT_ROLE_IDS`: optional additional roles, separated by commas.

Configure these in the environment running the app. Never commit token values.
The bot must be in the server, have Create Instant Invite and Manage Roles
permissions, and sit above the cohort and extra roles in the role hierarchy.
Manage Nicknames is required to set the student's nickname on join.

Discord requires the OAuth access token and the bot token to belong to the same
application for [Add Guild Member](https://docs.discord.com/developers/resources/guild#add-guild-member).
Being able to read the student's identity does not prove the token can be used
by a different bot to add that student.

## Error 50025 or 50026

Discord code `50025` means the OAuth token was rejected; `50026` means a required
OAuth scope is missing. A token from a different application can be rejected
even immediately after successful sign-in.

Compare Supabase Auth's Discord Client ID with the application ID owning the
SHIFT bot token. Set `DISCORD_SHIFT_BOT_TOKEN` to the token from the OAuth app
and add that bot to the SHIFT server with the permissions above. After deploying
the configuration, the student can sign in with Discord through their existing
join link to obtain a fresh token with `guilds.join`.

The app also tries bot-only role assignment after these two OAuth errors. If
the student is already in the server, role assignment completes normally. If
the student is absent, the application is marked `not_in_server`, and their
join page offers the invite followed by the receive-role button. This retry
does not require an OAuth token. Bot permission errors, bans, rate limits, and
unexpected failures remain errors rather than being treated as successful joins.

For a student with an older stored OAuth error, ask them to accept the server
invite, reopen their personal join link, and click the receive-role button.
A successful role sync clears the stored error and records the join timestamp.
