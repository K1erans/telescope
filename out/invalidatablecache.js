"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidatableCache = void 0;
class InvalidatableCache {
    values = new Map();
    generation = 0;
    get(key) {
        return this.values.get(key);
    }
    beginLoad() {
        return this.generation;
    }
    setIfCurrent(key, value, generation) {
        if (generation !== this.generation) {
            return false;
        }
        this.values.set(key, value);
        return true;
    }
    invalidate() {
        this.generation++;
        this.values.clear();
    }
}
exports.InvalidatableCache = InvalidatableCache;
//# sourceMappingURL=invalidatablecache.js.map