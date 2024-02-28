export type ListenerType = (...args: unknown[]) => unknown;
export type unsubscribe = () => void;

export default class Subscription {
    private listeners: ListenerType[] = [];
    private isPublishing = false;

    public subscribe(listener: ListenerType): unsubscribe {
        const { listeners } = this;

        let isSubscribed = true;
        listeners.push(listener);

        return (): void => {
            if (!isSubscribed) {
                return;
            }
            isSubscribed = false;

            let { listeners } = this;
            if (this.isPublishing) {
                listeners = listeners.slice();
            }

            listeners.splice(listeners.indexOf(listener), 1);
            this.listeners = listeners;
        };
    }

    public publish(...args: unknown[]): void {
        const { listeners } = this;
        this.isPublishing = true;
        for (let i = 0, { length } = listeners; i < length; i++) {
            execFnEfficient(listeners[i], args);
        }
        this.isPublishing = false;
    }
}

function execFnEfficient<T, K>(fn: (...args: K[]) => T, args: K[]): T {
    return fn(...args);
}
