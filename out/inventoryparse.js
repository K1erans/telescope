"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRipgrepPaths = parseRipgrepPaths;
function parseRipgrepPaths(stdout) {
    const entries = [];
    let lineStart = 0;
    for (let index = 0; index <= stdout.length; index++) {
        if (index < stdout.length && stdout.charCodeAt(index) !== 10) {
            continue;
        }
        const line = stdout.slice(lineStart, index).trim();
        lineStart = index + 1;
        if (line.length === 0) {
            continue;
        }
        const relativePath = normalizePath(line);
        const slashIndex = relativePath.lastIndexOf('/');
        entries.push(Object.freeze({
            relativePath,
            filename: relativePath.slice(slashIndex + 1),
        }));
    }
    return Object.freeze(entries);
}
function normalizePath(value) {
    return value.includes('\\') ? value.replace(/\\/g, '/') : value;
}
//# sourceMappingURL=inventoryparse.js.map