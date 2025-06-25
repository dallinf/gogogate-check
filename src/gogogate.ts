import "dotenv/config";
import {
    getHomeAssistantStates,
    sendPushNotification,
} from "./homeAssistantApi";
import { promises as fs } from "fs";

const GARAGE_DOOR_2_CAR = "cover.2_car";
const GARAGE_DOOR_3_CAR = "cover.3_car";
const OPEN_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const STATE_FILE = "garage_state.json";

type DoorState = {
    openSince: number | null;
    lastNotified: number | null;
    lastState: string | null;
};

const doorStates: Record<string, DoorState> = {
    [GARAGE_DOOR_2_CAR]: {
        openSince: null,
        lastNotified: null,
        lastState: null,
    },
    [GARAGE_DOOR_3_CAR]: {
        openSince: null,
        lastNotified: null,
        lastState: null,
    },
};

async function loadState() {
    try {
        const data = await fs.readFile(STATE_FILE, "utf-8");
        const parsed = JSON.parse(data);
        for (const key of Object.keys(doorStates)) {
            if (parsed[key]) {
                doorStates[key] = parsed[key];
            }
        }
    } catch (err) {
        // File may not exist on first run; that's fine
    }
}

async function saveState() {
    await fs.writeFile(
        STATE_FILE,
        JSON.stringify(doorStates, null, 2),
        "utf-8"
    );
}

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
            if (state.lastState === "open") {
                await sendPushNotification({
                    message: `The garage door ${entityId} has been closed!`,
                    title: "Garage Door Alert",
                });
            }
            state.openSince = null;
            state.lastNotified = null;
        }
        state.lastState = garage.state;
    } catch (err) {
        console.error(`Error in checkGarageDoor for ${entityId}:`, err);
    }
}

async function main() {
    await loadState();
    for (const entityId of [GARAGE_DOOR_2_CAR, GARAGE_DOOR_3_CAR]) {
        await checkGarageDoor(entityId);
    }
    await saveState();
}

main();
