import "dotenv/config";
import {
    getHomeAssistantStates,
    sendPushNotification,
} from "./homeAssistantApi";

const GARAGE_DOOR_2_CAR = "cover.2_car";
const GARAGE_DOOR_3_CAR = "cover.3_car";
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const OPEN_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

type DoorState = {
    openSince: number | null;
    lastNotified: number | null;
};

const doorStates: Record<string, DoorState> = {
    [GARAGE_DOOR_2_CAR]: { openSince: null, lastNotified: null },
    [GARAGE_DOOR_3_CAR]: { openSince: null, lastNotified: null },
};

async function checkGarageDoor(entityId: string) {
    try {
        const states = await getHomeAssistantStates();
        const garage = states.find((s: any) => s.entity_id === entityId);
        if (!garage) {
            console.error(`Garage door entity ${entityId} not found!`);
            return;
        }
        const isOpen = garage.state === "open";
        const now = Date.now();
        const state = doorStates[entityId];

        if (isOpen) {
            if (!state.openSince) {
                state.openSince = now;
                state.lastNotified = null;
            }
            if (
                state.openSince &&
                now - state.openSince > OPEN_THRESHOLD_MS &&
                (!state.lastNotified ||
                    now - state.lastNotified > OPEN_THRESHOLD_MS)
            ) {
                console.log(`Sending push notification for ${entityId}...`);
                await sendPushNotification({
                    message: `The garage door ${entityId} has been open for more than 10 minutes!`,
                    title: "Garage Door Alert",
                });
                state.lastNotified = now;
            }
        } else {
            state.openSince = null;
            state.lastNotified = null;
        }
    } catch (err) {
        console.error(`Error in checkGarageDoor for ${entityId}:`, err);
    }
}

console.log("Starting garage door monitors...");

sendPushNotification({
    message: "Starting garage door monitors...",
    title: "Garage Door Alert",
})
    .then(() => {
        console.log("Push notification sent successfully");
    })
    .catch((err) => {
        console.error("Error sending push notification:", err);
    });

for (const entityId of [GARAGE_DOOR_2_CAR, GARAGE_DOOR_3_CAR]) {
    checkGarageDoor(entityId);
    setInterval(() => checkGarageDoor(entityId), CHECK_INTERVAL_MS);
}
