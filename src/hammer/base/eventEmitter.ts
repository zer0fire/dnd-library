//  - https://github.com/documentcloud/backbone/blob/master/backbone.js
//  - https://github.com/joyent/node/blob/master/lib/events.js

type HandelType = (...args: unknown[]) => void;
type FnListType = (HandelType | unknown)[];

const eventSplitter = /\s+/;

export default class EventEmitter {
    private events: Map<string, FnListType> = new Map();
    private flags: Record<string, boolean> = Object.create(null);
    private isEmitting = false;

    public on<T>(
        events: string,
        callback: (this: T | undefined, ...args: never[]) => void,
        context?: T
    ): EventEmitter {
        const cache = this.events;
        const eventArray = events.split(eventSplitter);

        let event: string;
        let list: FnListType | undefined;
        for (let i = 0, { length } = eventArray; i < length; i++) {
            // Copy callback lists to prevent modification.
            event = eventArray[i];
            list = cache.get(event);
            if (!list) {
                cache.set(event, (list = []));
            }
            list.push(callback, context);
        }

        return this;
    }

    public once<T>(
        events: string,
        callback: (this: T | undefined, ...args: never[]) => void,
        context?: T
    ): EventEmitter {
        const onceCallback = (...args: never[]): void => {
            this.off(events, onceCallback, context);
            execFnEfficient(callback, args, context);
        };

        this.on(events, onceCallback, context);

        return this;
    }

    public off<T>(
        events: string,
        callback?: (this: T | undefined, ...args: never[]) => void,
        context?: T
    ): EventEmitter {
        if (!events) {
            return this;
        }

        const cache = this.events;
        const eventArray = events.split(eventSplitter);

        const { flags } = this;
        let event: string;
        let list: FnListType | undefined;
        for (let i = 0, { length } = eventArray; i < length; i++) {
            // Copy callback lists to prevent modification.
            event = eventArray[i];
            list = cache.get(event);
            if (!list) {
                continue;
            }

            if (!callback) {
                cache.delete(event);
                continue;
            }

            if (flags[event]) {
                list = list.slice();
            }

            for (let j = list.length - 2; j >= 0; j -= 2) {
                if (list[j] === callback && list[j + 1] === context) {
                    list.splice(j, 2);
                }
            }

            cache.set(event, list);
        }

        return this;
    }

    public offAll(): EventEmitter {
        this.clear();
        return this;
    }

    public clear(): EventEmitter {
        if (this.isEmitting) {
            this.events = new Map();
        } else {
            this.events.clear();
        }
        return this;
    }

    public trigger(events: string, ...args: unknown[]): void {
        this._trigger(events, args);
    }

    public emit(events: string, ...args: unknown[]): void {
        this._trigger(events, args);
    }

    private _trigger(events: string, args: unknown[]): void {
        const cache = this.events;
        if (cache.size === 0) {
            return;
        }

        const { flags } = this;
        const eventArray = events.split(eventSplitter);
        let event: string;
        let list: FnListType | undefined;
        // For each event, walk through the list of callbacks twice, first to
        // trigger the event
        for (let i = 0, { length } = eventArray; i < length; i++) {
            // Copy callback lists to prevent modification.
            event = eventArray[i];
            list = cache.get(event);
            if (!list) {
                continue;
            }
            // Execute event callbacks
            this.isEmitting = true;

            flags[event] = true;
            triggerEvents(list, args, this);
            flags[event] = false;
        }

        this.isEmitting = false;
    }
}

function triggerEvents(
    list: FnListType,
    args: unknown[],
    context?: unknown
): void {
    let a1: unknown;
    let a2: unknown;
    let a3: unknown;
    const l = list.length;

    // http://blog.csdn.net/zhengyinhui100/article/details/7837127
    let i = 0;
    switch (args.length) {
        case 0:
            for (; i < l; i += 2) {
                (list[i] as HandelType).call(list[i + 1] || context);
            }
            break;
        case 1: {
            a1 = args[0];
            for (; i < l; i += 2) {
                (list[i] as HandelType).call(list[i + 1] || context, a1);
            }
            break;
        }
        case 2: {
            a1 = args[0];
            a2 = args[1];
            for (; i < l; i += 2) {
                (list[i] as HandelType).call(list[i + 1] || context, a1, a2);
            }
            break;
        }
        case 3: {
            a1 = args[0];
            a2 = args[1];
            a3 = args[2];
            for (; i < l; i += 2) {
                (list[i] as HandelType).call(
                    list[i + 1] || context,
                    a1,
                    a2,
                    a3
                );
            }
            break;
        }
        default:
            for (; i < l; i += 2) {
                (list[i] as HandelType).apply(list[i + 1] || context, args);
            }
    }
}

function execFnEfficient<T, K, P>(
    fn: (this: P | undefined, ...args: K[]) => T,
    args: K[],
    context?: P
): T {
    switch (args.length) {
        case 0:
            return fn.call(context);
        case 1:
            return fn.call(context, args[0]);
        case 2:
            return fn.call(context, args[0], args[1]);
        case 3:
            return fn.call(context, args[0], args[1], args[2]);
        default:
            return fn.apply(context, args);
    }
}
