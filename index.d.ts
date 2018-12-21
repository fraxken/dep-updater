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
        updateTo?: string;
        kind?: "Dependencies" | "DevDependencies";
    }
}

export as namespace Depup;
export = Depup;
