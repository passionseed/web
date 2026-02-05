/**
 * Discord notification utility for sending DMs to mentors
 * Uses Discord Bot API to send direct messages
 */

/**
 * Fetch with automatic retry on rate limits (429)
 * Respects Discord's Retry-After header
 */
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            // If rate limited, wait and retry
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;

                console.warn(`Rate limited by Discord. Waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            return response;
        } catch (error) {
            lastError = error as Error;
            console.error(`Fetch attempt ${attempt + 1} failed:`, error);

            // Exponential backoff on network errors
            if (attempt < maxRetries - 1) {
                const waitTime = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError || new Error('Max retries exceeded');
}

interface MentorSessionDetails {
    studentName: string;
    studentEmail: string;
    seedTitle: string;
    roomCode: string;
    scheduledDate: string;
    scheduledTime: string;
}

/**
 * Send a Discord DM to a mentor about a new session booking
 * Includes rate limit handling and retry logic
 */
export async function notifyMentorOnDiscord(
    mentorDiscordUid: string,
    sessionDetails: MentorSessionDetails
): Promise<{ success: boolean; error?: string }> {
    try {
        const botToken = process.env.DISCORD_BOT_TOKEN;

        if (!botToken) {
            console.error('DISCORD_BOT_TOKEN is not set in environment variables');
            return { success: false, error: 'Discord bot not configured' };
        }

        // Step 1: Create a DM channel with the mentor (with retry logic)
        const dmChannelResponse = await fetchWithRetry('https://discord.com/api/v10/users/@me/channels', {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipient_id: mentorDiscordUid,
            }),
        });

        if (!dmChannelResponse.ok) {
            const error = await dmChannelResponse.text();
            console.error('Failed to create DM channel:', error);

            // Handle specific Discord errors
            if (dmChannelResponse.status === 403) {
                return { success: false, error: 'Cannot send DM - user has DMs disabled or blocked the bot' };
            }
            if (dmChannelResponse.status === 404) {
                return { success: false, error: 'User not found on Discord' };
            }

            return { success: false, error: 'Failed to create DM channel' };
        }

        const dmChannel = await dmChannelResponse.json();

        // Step 2: Send the message to the DM channel (with retry logic)
        const message = `📞 **New Mentor Session Requested**\n\n` +
            `**Student:** ${sessionDetails.studentName}\n` +
            `**Email:** ${sessionDetails.studentEmail}\n` +
            `**Seed:** ${sessionDetails.seedTitle}\n` +
            `**Room Code:** ${sessionDetails.roomCode}\n` +
            `**Date:** ${sessionDetails.scheduledDate}\n` +
            `**Time:** ${sessionDetails.scheduledTime}\n\n` +
            `Please confirm or reschedule this session.`;

        const sendMessageResponse = await fetchWithRetry(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: message,
            }),
        });

        if (!sendMessageResponse.ok) {
            const error = await sendMessageResponse.text();
            console.error('Failed to send message:', error);
            return { success: false, error: 'Failed to send message' };
        }

        console.log(`✅ Discord notification sent to mentor ${mentorDiscordUid}`);

        return { success: true };
    } catch (error) {
        console.error('Error notifying mentor on Discord:', error);
        return { success: false, error: 'Unexpected error occurred' };
    }
}

/**
 * Format date for display
 */
export function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Format time for display
 */
export function formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Send a generic Discord DM notification
 */
async function sendDiscordDM(
    userDiscordUid: string,
    message: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const botToken = process.env.DISCORD_BOT_TOKEN;

        if (!botToken) {
            console.error('DISCORD_BOT_TOKEN is not set in environment variables');
            return { success: false, error: 'Discord bot not configured' };
        }

        // Step 1: Create a DM channel
        const dmChannelResponse = await fetchWithRetry('https://discord.com/api/v10/users/@me/channels', {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipient_id: userDiscordUid,
            }),
        });

        if (!dmChannelResponse.ok) {
            const error = await dmChannelResponse.text();
            console.error('Failed to create DM channel:', error);
            if (dmChannelResponse.status === 403) {
                return { success: false, error: 'Cannot send DM - user has DMs disabled or blocked the bot' };
            }
            if (dmChannelResponse.status === 404) {
                return { success: false, error: 'User not found on Discord' };
            }
            return { success: false, error: 'Failed to create DM channel' };
        }

        const dmChannel = await dmChannelResponse.json();

        // Step 2: Send the message
        const sendMessageResponse = await fetchWithRetry(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: message,
            }),
        });

        if (!sendMessageResponse.ok) {
            const error = await sendMessageResponse.text();
            console.error('Failed to send message:', error);
            return { success: false, error: 'Failed to send message' };
        }

        console.log(`✅ Discord notification sent to user ${userDiscordUid}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending Discord DM:', error);
        return { success: false, error: 'Unexpected error occurred' };
    }
}

interface RequestNotificationDetails {
    requestTitle: string;
    requestingProject: string;
    receivingProject: string;
    dateNeeded: string;
    priority: string;
}

/**
 * Notify user about a new incoming request
 */
export async function notifyUserNewRequest(
    userDiscordUid: string,
    details: RequestNotificationDetails
): Promise<{ success: boolean; error?: string }> {
    console.log("[Discord] 📥 Preparing to send NEW REQUEST notification to", userDiscordUid);
    console.log("[Discord] Request:", details.requestTitle, "Priority:", details.priority);

    const message = `📥 **New Request Received**\n\n` +
        `**Request:** ${details.requestTitle}\n` +
        `**From:** ${details.requestingProject}\n` +
        `**To:** ${details.receivingProject}\n` +
        `**Needed by:** ${details.dateNeeded}\n` +
        `**Priority:** ${details.priority}\n\n` +
        `Check your projects page to review and assign this request.`;

    const result = await sendDiscordDM(userDiscordUid, message);
    console.log("[Discord] Notification send result:", result);
    return result;
}

interface TaskAssignmentDetails {
    taskTitle: string;
    projectName: string;
    dueDate?: string;
    assignedBy: string;
}

/**
 * Notify user when they are assigned a task
 */
export async function notifyUserTaskAssignment(
    userDiscordUid: string,
    details: TaskAssignmentDetails
): Promise<{ success: boolean; error?: string }> {
    const dueDateText = details.dueDate ? `**Due:** ${details.dueDate}\n` : '';

    const message = `✅ **New Task Assigned to You**\n\n` +
        `**Task:** ${details.taskTitle}\n` +
        `**Project:** ${details.projectName}\n` +
        dueDateText +
        `**Assigned by:** ${details.assignedBy}\n\n` +
        `Check your calendar to see this task.`;

    return sendDiscordDM(userDiscordUid, message);
}

interface RequestAssignmentDetails {
    requestTitle: string;
    projectName: string;
    dateNeeded: string;
    assignedBy: string;
}

/**
 * Notify user when they are assigned a request
 */
export async function notifyUserRequestAssignment(
    userDiscordUid: string,
    details: RequestAssignmentDetails
): Promise<{ success: boolean; error?: string }> {
    const message = `📌 **Request Assigned to You**\n\n` +
        `**Request:** ${details.requestTitle}\n` +
        `**Project:** ${details.projectName}\n` +
        `**Needed by:** ${details.dateNeeded}\n` +
        `**Assigned by:** ${details.assignedBy}\n\n` +
        `Check the project page to view this request.`;

    return sendDiscordDM(userDiscordUid, message);
}

interface RequestAcceptedDetails {
    requestTitle: string;
    acceptedByProject: string;
    acceptedByUser: string;
    dateNeeded: string;
}

/**
 * Notify the requester when their request is accepted
 */
export async function notifyRequesterRequestAccepted(
    userDiscordUid: string,
    details: RequestAcceptedDetails
): Promise<{ success: boolean; error?: string }> {
    const message = `🎉 **Request Accepted!**\n\n` +
        `**Request:** ${details.requestTitle}\n` +
        `**Accepted by:** ${details.acceptedByUser} (${details.acceptedByProject})\n` +
        `**Date Confirm:** ${details.dateNeeded}\n\n` +
        `The team has accepted your request and will start working on it.`;

    return sendDiscordDM(userDiscordUid, message);
}
