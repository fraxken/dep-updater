/// <reference types="node" />
/// <reference types="@types/node" />

declare namespace Depup {
    interface Dependencies {
        name: string;
        current: string;
        wanted: string;
        latest: string;
        location: string;
        breaking: boolean;
    }
}

export as namespace Depup;
export = Depup;
