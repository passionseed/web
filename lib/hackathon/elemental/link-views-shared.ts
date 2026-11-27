/** Share links that count devices: ?src=share-<code> (students) and ?src=t-<code> (teachers). Safe to import in the browser. */
export const TRACKED_SOURCE_RE = /^(share|t)-[a-z0-9_-]{1,40}$/;

/** Devices one network address can add to one link. A home or a classroom wifi can have a few real phones. */
export const PER_NETWORK_CAP = 5;
