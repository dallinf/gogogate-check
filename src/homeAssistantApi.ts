import axios from "axios";

export async function getHomeAssistantStates(): Promise<any> {
    try {
        const response = await axios.get(
            `${process.env.HOME_ASSISTANT_BASE_URL}/api/states`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.HOME_ASSISTANT_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );
        return response.data;
    } catch (error: any) {
        console.error("Error calling Home Assistant API:", error.message);
        throw error;
    }
}

export async function sendPushNotification({
    message,
    title,
}: {
    message: string;
    title?: string;
    service?: string;
}): Promise<any> {
    try {
        const service = process.env.HOME_ASSISTANT_PUSH_NOTIFICATION_SERVICE;
        const response = await axios.post(
            `${process.env.HOME_ASSISTANT_BASE_URL}/api/services/notify/${service}`,
            {
                message,
                ...(title ? { title } : {}),
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.HOME_ASSISTANT_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );
        return response.data;
    } catch (error: any) {
        console.error("Error sending push notification:", error.message);
        throw error;
    }
}
