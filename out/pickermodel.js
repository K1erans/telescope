"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPickerModel = createPickerModel;
const fuzzy_1 = require("./fuzzy");
function createPickerModel(files) {
    const inventory = buildInventoryIndex(files);
    const directoryRowsByScope = new Map();
    const emptyRows = Object.freeze([]);
    return {
        update(input, maxResults) {
            const limit = Math.max(0, Math.floor(maxResults));
            if (limit === 0) {
                return emptyRows;
            }
            const scope = parseScope(input, inventory.validDirectories);
            const candidates = inventory.filesByScope.get(scope.prefix) ?? [];
            if (candidates.length === 0) {
                return Object.freeze([Object.freeze({
                        kind: 'info',
                        message: scope.prefix
                            ? `No files in scope: ${scope.prefix}`
                            : 'No files found in workspace.',
                    })]);
            }
            if (scope.query.length === 0) {
                if (scope.prefix.length > 0) {
                    let rows = directoryRowsByScope.get(scope.prefix);
                    if (!rows) {
                        rows = buildDirectoryRows(candidates, scope.prefix);
                        directoryRowsByScope.set(scope.prefix, rows);
                    }
                    return Object.freeze(rows.slice(0, limit));
                }
                return Object.freeze(inventory.rootAlphabetical
                    .slice(0, limit)
                    .map(file => toFileRow(file, '')));
            }
            return Object.freeze(rankFiles(candidates, scope, limit)
                .map(({ file }) => toFileRow(file, scope.prefix)));
        },
    };
}
function buildInventoryIndex(files) {
    const filesByScope = new Map();
    filesByScope.set('', []);
    const validDirectories = new Set();
    for (const source of files) {
        const relativePath = normalizePath(source.relativePath);
        const file = Object.freeze({
            relativePath,
            filename: source.filename,
            lowerRelativePath: relativePath.toLowerCase(),
            lowerFilename: source.filename.toLowerCase(),
        });
        filesByScope.get('').push(file);
        let slashIndex = relativePath.indexOf('/');
        while (slashIndex !== -1) {
            const prefix = relativePath.slice(0, slashIndex + 1);
            validDirectories.add(prefix);
            let scopedFiles = filesByScope.get(prefix);
            if (!scopedFiles) {
                scopedFiles = [];
                filesByScope.set(prefix, scopedFiles);
            }
            scopedFiles.push(file);
            slashIndex = relativePath.indexOf('/', slashIndex + 1);
        }
    }
    for (const scopedFiles of filesByScope.values()) {
        Object.freeze(scopedFiles);
    }
    const rootAlphabetical = Object.freeze([...filesByScope.get('')].sort(compareFiles));
    return {
        validDirectories,
        filesByScope,
        rootAlphabetical,
    };
}
function parseScope(input, validDirectories) {
    const normalized = normalizePath(input);
    let slashIndex = normalized.lastIndexOf('/');
    while (slashIndex !== -1) {
        const prefix = normalized.slice(0, slashIndex + 1);
        if (!prefix.includes('../') && validDirectories.has(prefix)) {
            return {
                prefix,
                query: normalized.slice(prefix.length),
            };
        }
        slashIndex = normalized.lastIndexOf('/', slashIndex - 1);
    }
    return { prefix: '', query: normalized };
}
function buildDirectoryRows(candidates, scopePrefix) {
    const subdirectories = new Set();
    const directFiles = [];
    const deepFiles = [];
    for (const file of candidates) {
        const relativeToScope = file.relativePath.slice(scopePrefix.length);
        const slashIndex = relativeToScope.indexOf('/');
        if (slashIndex === -1) {
            directFiles.push(file);
        }
        else {
            subdirectories.add(relativeToScope.slice(0, slashIndex));
            deepFiles.push(file);
        }
    }
    const rows = [];
    for (const name of [...subdirectories].sort()) {
        rows.push(Object.freeze({
            kind: 'directory',
            name,
            scopePrefix,
            drillPath: `${scopePrefix}${name}/`,
        }));
    }
    directFiles.sort(compareFiles);
    for (const file of directFiles) {
        rows.push(toFileRow(file, scopePrefix));
    }
    deepFiles.sort((left, right) => {
        const leftPath = left.relativePath.slice(scopePrefix.length);
        const rightPath = right.relativePath.slice(scopePrefix.length);
        return leftPath.localeCompare(rightPath);
    });
    for (const file of deepFiles) {
        rows.push(toFileRow(file, scopePrefix));
    }
    return Object.freeze(rows);
}
function rankFiles(candidates, scope, maxResults) {
    const heap = [];
    const scoreFile = (0, fuzzy_1.createFileScorer)(scope.query);
    for (const file of candidates) {
        const pathInScope = scope.prefix
            ? file.relativePath.slice(scope.prefix.length)
            : file.relativePath;
        const lowerPathInScope = scope.prefix
            ? file.lowerRelativePath.slice(scope.prefix.length)
            : file.lowerRelativePath;
        const score = scoreFile(pathInScope, lowerPathInScope, file.filename, file.lowerFilename);
        if (score === null) {
            continue;
        }
        const ranked = { file, score };
        if (heap.length < maxResults) {
            heapPush(heap, ranked);
        }
        else if (isBetter(ranked, heap[0])) {
            heap[0] = ranked;
            heapSiftDown(heap, 0);
        }
    }
    return heap.sort((left, right) => {
        const scoreDifference = right.score - left.score;
        return scoreDifference !== 0
            ? scoreDifference
            : compareFiles(left.file, right.file);
    });
}
function heapPush(heap, item) {
    heap.push(item);
    let index = heap.length - 1;
    while (index > 0) {
        const parentIndex = Math.floor((index - 1) / 2);
        if (!isWorse(heap[index], heap[parentIndex])) {
            break;
        }
        [heap[index], heap[parentIndex]] = [heap[parentIndex], heap[index]];
        index = parentIndex;
    }
}
function heapSiftDown(heap, startIndex) {
    let index = startIndex;
    while (true) {
        const leftIndex = index * 2 + 1;
        const rightIndex = leftIndex + 1;
        let worseIndex = index;
        if (leftIndex < heap.length && isWorse(heap[leftIndex], heap[worseIndex])) {
            worseIndex = leftIndex;
        }
        if (rightIndex < heap.length && isWorse(heap[rightIndex], heap[worseIndex])) {
            worseIndex = rightIndex;
        }
        if (worseIndex === index) {
            return;
        }
        [heap[index], heap[worseIndex]] = [heap[worseIndex], heap[index]];
        index = worseIndex;
    }
}
function isBetter(left, right) {
    return left.score > right.score
        || (left.score === right.score && compareFiles(left.file, right.file) < 0);
}
function isWorse(left, right) {
    return left.score < right.score
        || (left.score === right.score && compareFiles(left.file, right.file) > 0);
}
function toFileRow(file, scopePrefix) {
    const pathInScope = scopePrefix
        ? file.relativePath.slice(scopePrefix.length)
        : file.relativePath;
    const slashIndex = pathInScope.lastIndexOf('/');
    const directory = slashIndex === -1 ? '' : pathInScope.slice(0, slashIndex + 1);
    return Object.freeze({
        kind: 'file',
        relativePath: file.relativePath,
        filename: file.filename,
        description: `${scopePrefix}${directory}`,
    });
}
function compareFiles(left, right) {
    return left.relativePath.localeCompare(right.relativePath);
}
function normalizePath(value) {
    return value.includes('\\') ? value.replace(/\\/g, '/') : value;
}
//# sourceMappingURL=pickermodel.js.map