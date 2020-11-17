"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.procureInitialInterestingExpandedNodes = exports.ZipFileTree = exports.getZipFileMaxDepth = exports.createZipTable = void 0;
var flow_1 = require("../utils/flow");
Array < IndexIntoZipFileTable | null > ,
    path;
string[], // e.g. "profile_tresize/tresize/cycle_0.profile"
    partName;
string[], // e.g. "cycle_0.profile" or "tresize"
    file;
Array < JSZipFile | null > ,
    depth;
number[],
    length;
number,
;
;
+name;
string,
    +url;
null | string,
    +zipTableIndex;
IndexIntoZipFileTable,
;
;
function createZipTable(zipEntries) {
    var fullPaths = flow_1.objectEntries(zipEntries.files)
        .filter(function (_a) {
        var _fileName = _a[0], file = _a[1];
        return !file.dir;
    })
        .map(function (_a) {
        var fileName = _a[0], _file = _a[1];
        return fileName;
    });
    var pathToFilesTableIndex = new Map();
    var filesTable = {
        prefix: [],
        path: [],
        partName: [],
        file: [],
        depth: [],
        length: 0
    };
    for (var _i = 0, fullPaths_1 = fullPaths; _i < fullPaths_1.length; _i++) {
        var fullPath = fullPaths_1[_i];
        // fullPath: 'profile_tresize/tresize/cycle_0.profile'
        var pathParts = fullPath
            .split('/')
            // Prevent any empty strings from double // or trailing slashes.
            .filter(function (part) { return part; });
        // pathParts: ['profile_tresize', 'tresize', 'cycle_0.profile']
        var path = '';
        var prefixIndex = null;
        for (var i = 0; i < pathParts.length; i++) {
            // Go through each path part to assemble the table
            var pathPart = pathParts[i];
            // Add the path part to the path.
            if (path) {
                path += '/' + pathPart;
            }
            else {
                path = pathPart;
            }
            // This part of the path may already exist.
            var existingIndex = pathToFilesTableIndex.get(path);
            if (existingIndex !== undefined) {
                // This folder was already added, so skip it, but remember the prefix.
                prefixIndex = existingIndex;
                continue;
            }
            var index = filesTable.length++;
            filesTable.prefix[index] = prefixIndex;
            filesTable.path[index] = path;
            filesTable.partName[index] = pathPart;
            filesTable.depth[index] = i;
            filesTable.file[index] =
                i + 1 === pathParts.length ? zipEntries.files[fullPath] : null;
            pathToFilesTableIndex.set(path, index);
            // Remember this index as the prefix.
            prefixIndex = index;
        }
    }
    return filesTable;
}
exports.createZipTable = createZipTable;
function getZipFileMaxDepth(zipFileTable) {
    if (!zipFileTable) {
        return 0;
    }
    var maxDepth = 0;
    for (var i = 0; i < zipFileTable.length; i++) {
        maxDepth = Math.max(maxDepth, zipFileTable.depth[i]);
    }
    return maxDepth;
}
exports.getZipFileMaxDepth = getZipFileMaxDepth;
var ZipFileTree = /** @class */ (function () {
    function ZipFileTree(zipFileTable, zipFileUrl) {
        this._zipFileTable = zipFileTable;
        this._zipFileUrl = zipFileUrl;
        this._displayDataByIndex = new Map();
        this._parentToChildren = new Map();
        // null IndexIntoZipFileTable have no children
        this._parentToChildren.set(null, this._computeChildrenArray(null));
    }
    ZipFileTree.prototype.getRoots = function () {
        return this.getChildren(null);
    };
    ZipFileTree.prototype.getChildren = function (zipTableIndex) {
        var children = this._parentToChildren.get(zipTableIndex);
        if (!children) {
            children = this._computeChildrenArray(zipTableIndex);
            this._parentToChildren.set(zipTableIndex, children);
        }
        return children;
    };
    ZipFileTree.prototype._computeChildrenArray = function (parentIndex) {
        var children = [];
        for (var childIndex = 0; childIndex < this._zipFileTable.length; childIndex++) {
            if (this._zipFileTable.prefix[childIndex] === parentIndex) {
                children.push(childIndex);
            }
        }
        return children;
    };
    ZipFileTree.prototype.hasChildren = function (zipTableIndex) {
        return this.getChildren(zipTableIndex).length > 0;
    };
    ZipFileTree.prototype.getAllDescendants = function (zipTableIndex) {
        var result = new Set();
        for (var _i = 0, _a = this.getChildren(zipTableIndex); _i < _a.length; _i++) {
            var child = _a[_i];
            result.add(child);
            for (var _b = 0, _c = this.getAllDescendants(child); _b < _c.length; _b++) {
                var descendant = _c[_b];
                result.add(descendant);
            }
        }
        return result;
    };
    ZipFileTree.prototype.getParent = function (zipTableIndex) {
        var prefix = this._zipFileTable.prefix[zipTableIndex];
        // This returns -1 to support the CallTree interface.
        return prefix === null ? -1 : prefix;
    };
    ZipFileTree.prototype.getDepth = function (zipTableIndex) {
        return this._zipFileTable.depth[zipTableIndex];
    };
    ZipFileTree.prototype.hasSameNodeIds = function (tree) {
        return this._zipFileTable === tree._zipFileTable;
    };
    ZipFileTree.prototype.getDisplayData = function (zipTableIndex) {
        var displayData = this._displayDataByIndex.get(zipTableIndex);
        if (displayData === undefined) {
            var url = null;
            // Build up a URL for the profile.
            if (!this.hasChildren(zipTableIndex)) {
                url =
                    window.location.origin +
                        '/from-url/' +
                        encodeURIComponent(this._zipFileUrl) +
                        '/' +
                        // Type check the slug:
                        flow_1.ensureIsValidTabSlug('calltree') +
                        '/?file=' +
                        encodeURIComponent(this._zipFileTable.path[zipTableIndex]);
            }
            displayData = {
                name: this._zipFileTable.partName[zipTableIndex],
                url: url,
                zipTableIndex: zipTableIndex
            };
            this._displayDataByIndex.set(zipTableIndex, displayData);
        }
        return displayData;
    };
    return ZipFileTree;
}());
exports.ZipFileTree = ZipFileTree;
/**
 * Try and display a nice amount of files in a zip file initially for a user. The amount
 * is an arbitrary choice really.
 */
function procureInitialInterestingExpandedNodes(zipFileTree, maxExpandedNodes) {
    if (maxExpandedNodes === void 0) { maxExpandedNodes = 30; }
    var roots = zipFileTree.getRoots();
    // Get a list of all of the root node's children.
    var children = [];
    for (var _i = 0, roots_1 = roots; _i < roots_1.length; _i++) {
        var index = roots_1[_i];
        for (var _a = 0, _b = zipFileTree.getChildren(index); _a < _b.length; _a++) {
            var childIndex = _b[_a];
            children.push(childIndex);
        }
    }
    // Try to expand as many of these as needed to show more expanded nodes.
    var nodeCount = roots.length + children.length;
    var expansions = __spreadArrays(roots);
    for (var _c = 0, children_1 = children; _c < children_1.length; _c++) {
        var childIndex = children_1[_c];
        if (nodeCount >= maxExpandedNodes) {
            break;
        }
        var subChildren = zipFileTree.getChildren(childIndex);
        if (subChildren.length > 0) {
            expansions.push(childIndex);
            nodeCount += subChildren.length;
        }
    }
    return expansions;
}
exports.procureInitialInterestingExpandedNodes = procureInitialInterestingExpandedNodes;
