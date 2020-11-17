"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.getEmptyProfile = exports.getEmptyThread = exports.getEmptyJsTracerTable = exports.getDefaultCategories = exports.getEmptyExtensions = exports.$Exact = exports.resourceTypes = exports.getResourceTypes = exports.shallowCloneRawMarkerTable = exports.getEmptyBalancedNativeAllocationsTable = exports.getEmptyUnbalancedNativeAllocationsTable = exports.getEmptyJsAllocationsTable = exports.getEmptyRawMarkerTable = exports.getEmptyResourceTable = exports.shallowCloneFuncTable = exports.getEmptyFuncTable = exports.shallowCloneFrameTable = exports.getEmptyFrameTable = exports.getEmptySamplesTableWithResponsiveness = exports.getEmptySamplesTableWithEventDelay = exports.getEmptyStackTable = void 0;
var unique_string_array_1 = require("../utils/unique-string-array");
var constants_1 = require("../app-logic/constants");
/**
 * This module collects all of the creation of new empty profile data structures.
 */
function getEmptyStackTable() {
    return {
        // Important!
        // If modifying this structure, please update all callers of this function to ensure
        // that they are pushing on correctly to the data structure. These pushes may not
        // be caught by the type system.
        frame: [],
        prefix: [],
        category: [],
        subcategory: [],
        length: 0
    };
}
exports.getEmptyStackTable = getEmptyStackTable;
/**
 * Returns an empty samples table with eventDelay field instead of responsiveness.
 * eventDelay is a new field and it replaced responsiveness. We should still
 * account for older profiles and use both of the flavors if needed.
 */
function getEmptySamplesTableWithEventDelay() {
    return {
        // Important!
        // If modifying this structure, please update all callers of this function to ensure
        // that they are pushing on correctly to the data structure. These pushes may not
        // be caught by the type system.
        weightType: 'samples',
        weight: null,
        eventDelay: [],
        stack: [],
        time: [],
        length: 0
    };
}
exports.getEmptySamplesTableWithEventDelay = getEmptySamplesTableWithEventDelay;
/**
 * Returns an empty samples table with responsiveness field instead of eventDelay.
 * responsiveness is the older field and replaced with eventDelay. We should
 * account for older profiles and use both of the flavors if needed.
 */
function getEmptySamplesTableWithResponsiveness() {
    return {
        // Important!
        // If modifying this structure, please update all callers of this function to ensure
        // that they are pushing on correctly to the data structure. These pushes may not
        // be caught by the type system.
        weightType: 'samples',
        weight: null,
        responsiveness: [],
        stack: [],
        time: [],
        length: 0
    };
}
exports.getEmptySamplesTableWithResponsiveness = getEmptySamplesTableWithResponsiveness;
function getEmptyFrameTable() {
    return {
        // Important!
        // If modifying this structure, please update all callers of this function to ensure
        // that they are pushing on correctly to the data structure. These pushes may not
        // be caught by the type system.
        address: [],
        category: [],
        subcategory: [],
        func: [],
        innerWindowID: [],
        implementation: [],
        line: [],
        column: [],
        optimizations: [],
        length: 0
    };
}
exports.getEmptyFrameTable = getEmptyFrameTable;
function shallowCloneFrameTable(frameTable) {
    return {
        // Important!
        // If modifying this structure, please update all callers of this function to ensure
        // that they are pushing on correctly to the data structure. These pushes may not
        // be caught by the type system.
        address: frameTable.address.slice(),
        category: frameTable.category.slice(),
        subcategory: frameTable.subcategory.slice(),
        func: frameTable.func.slice(),
        innerWindowID: frameTable.innerWindowID.slice(),
        implementation: frameTable.implementation.slice(),
        line: frameTable.line.slice(),
        column: frameTable.column.slice(),
        optimizations: frameTable.optimizations.slice(),
        length: frameTable.length
    };
}
exports.shallowCloneFrameTable = shallowCloneFrameTable;
function getEmptyFuncTable() {
    return {
        // Important!
        // If modifying this structure, please update all callers of this function to ensure
        // that they are pushing on correctly to the data structure. These pushes may not
        // be caught by the type system.
        address: [],
        isJS: [],
        relevantForJS: [],
        name: [],
        resource: [],
        fileName: [],
        lineNumber: [],
        columnNumber: [],
        length: 0
    };
}
exports.getEmptyFuncTable = getEmptyFuncTable;
function shallowCloneFuncTable(funcTable) {
    return {
        // Important!
        // If modifying this structure, please update all callers of this function to ensure
        // that they are pushing on correctly to the data structure. These pushes may not
        // be caught by the type system.
        address: funcTable.address.slice(),
        isJS: funcTable.isJS.slice(),
        relevantForJS: funcTable.relevantForJS.slice(),
        name: funcTable.name.slice(),
        resource: funcTable.resource.slice(),
        fileName: funcTable.fileName.slice(),
        lineNumber: funcTable.lineNumber.slice(),
        columnNumber: funcTable.columnNumber.slice(),
        length: funcTable.length
    };
}
exports.shallowCloneFuncTable = shallowCloneFuncTable;
function getEmptyResourceTable() {
    return {
        // Important!
        // If modifying this structure, please update all callers of this function to ensure
        // that they are pushing on correctly to the data structure. These pushes may not
        // be caught by the type system.
        lib: [],
        name: [],
        host: [],
        type: [],
        length: 0
    };
}
exports.getEmptyResourceTable = getEmptyResourceTable;
function getEmptyRawMarkerTable() {
    // Important!
    // If modifying this structure, please update all callers of this function to ensure
    // that they are pushing on correctly to the data structure. These pushes may not
    // be caught by the type system.
    return {
        data: [],
        name: [],
        startTime: [],
        endTime: [],
        phase: [],
        category: [],
        length: 0
    };
}
exports.getEmptyRawMarkerTable = getEmptyRawMarkerTable;
function getEmptyJsAllocationsTable() {
    // Important!
    // If modifying this structure, please update all callers of this function to ensure
    // that they are pushing on correctly to the data structure. These pushes may not
    // be caught by the type system.
    return {
        time: [],
        className: [],
        typeName: [],
        coarseType: [],
        weight: [],
        weightType: 'bytes',
        inNursery: [],
        stack: [],
        length: 0
    };
}
exports.getEmptyJsAllocationsTable = getEmptyJsAllocationsTable;
/**
 * The native allocation tables come in two varieties. Get one of the members of the
 * union.
 */
function getEmptyUnbalancedNativeAllocationsTable() {
    // Important!
    // If modifying this structure, please update all callers of this function to ensure
    // that they are pushing on correctly to the data structure. These pushes may not
    // be caught by the type system.
    return {
        time: [],
        weight: [],
        weightType: 'bytes',
        stack: [],
        length: 0
    };
}
exports.getEmptyUnbalancedNativeAllocationsTable = getEmptyUnbalancedNativeAllocationsTable;
/**
 * The native allocation tables come in two varieties. Get one of the members of the
 * union.
 */
function getEmptyBalancedNativeAllocationsTable() {
    // Important!
    // If modifying this structure, please update all callers of this function to ensure
    // that they are pushing on correctly to the data structure. These pushes may not
    // be caught by the type system.
    return {
        time: [],
        weight: [],
        weightType: 'bytes',
        stack: [],
        memoryAddress: [],
        threadId: [],
        length: 0
    };
}
exports.getEmptyBalancedNativeAllocationsTable = getEmptyBalancedNativeAllocationsTable;
function shallowCloneRawMarkerTable(markerTable) {
    return {
        // Important!
        // If modifying this structure, please update all callers of this function to ensure
        // that they are pushing on correctly to the data structure. These pushes may not
        // be caught by the type system.
        data: markerTable.data.slice(),
        name: markerTable.name.slice(),
        startTime: markerTable.startTime.slice(),
        endTime: markerTable.endTime.slice(),
        phase: markerTable.phase.slice(),
        category: markerTable.category.slice(),
        length: markerTable.length
    };
}
exports.shallowCloneRawMarkerTable = shallowCloneRawMarkerTable;
function getResourceTypes() {
    return {
        unknown: 0,
        library: 1,
        addon: 2,
        webhost: 3,
        otherhost: 4,
        url: 5
    };
}
exports.getResourceTypes = getResourceTypes;
/**
 * Export a read-only copy of the resource types.
 */
exports.resourceTypes = (getResourceTypes());
;
;
function getEmptyExtensions() {
    return {
        // Important!
        // If modifying this structure, please update all callers of this function to ensure
        // that they are pushing on correctly to the data structure. These pushes may not
        // be caught by the type system.
        id: [],
        name: [],
        baseURL: [],
        length: 0
    };
}
exports.getEmptyExtensions = getEmptyExtensions;
function getDefaultCategories() {
    return [
        { name: 'Idle', color: 'transparent', subcategories: ['Other'] },
        { name: 'Other', color: 'grey', subcategories: ['Other'] },
        { name: 'Layout', color: 'purple', subcategories: ['Other'] },
        { name: 'JavaScript', color: 'yellow', subcategories: ['Other'] },
        { name: 'GC / CC', color: 'orange', subcategories: ['Other'] },
        { name: 'Network', color: 'lightblue', subcategories: ['Other'] },
        { name: 'Graphics', color: 'green', subcategories: ['Other'] },
        { name: 'DOM', color: 'blue', subcategories: ['Other'] },
    ];
}
exports.getDefaultCategories = getDefaultCategories;
function getEmptyJsTracerTable() {
    return {
        // Important!
        // If modifying this structure, please update all callers of this function to ensure
        // that they are pushing on correctly to the data structure. These pushes may not
        // be caught by the type system.
        events: [],
        timestamps: [],
        durations: [],
        line: [],
        column: [],
        length: 0
    };
}
exports.getEmptyJsTracerTable = getEmptyJsTracerTable;
function getEmptyThread(overrides) {
    var defaultThread = {
        processType: 'default',
        processStartupTime: 0,
        processShutdownTime: null,
        registerTime: 0,
        unregisterTime: null,
        pausedRanges: [],
        name: 'Empty',
        pid: 0,
        tid: 0,
        // Creating samples with event delay since it's the new samples table.
        samples: getEmptySamplesTableWithEventDelay(),
        markers: getEmptyRawMarkerTable(),
        stackTable: getEmptyStackTable(),
        frameTable: getEmptyFrameTable(),
        stringTable: new unique_string_array_1.UniqueStringArray(),
        libs: [],
        funcTable: getEmptyFuncTable(),
        resourceTable: getEmptyResourceTable()
    };
    return __assign(__assign({}, defaultThread), overrides);
}
exports.getEmptyThread = getEmptyThread;
function getEmptyProfile() {
    return {
        meta: {
            interval: 1,
            startTime: 0,
            abi: '',
            misc: '',
            oscpu: '',
            platform: '',
            processType: 0,
            extensions: getEmptyExtensions(),
            categories: getDefaultCategories(),
            product: 'Firefox',
            stackwalk: 0,
            toolkit: '',
            version: constants_1.GECKO_PROFILE_VERSION,
            preprocessedProfileVersion: constants_1.PROCESSED_PROFILE_VERSION,
            appBuildID: '',
            sourceURL: '',
            physicalCPUs: 0,
            logicalCPUs: 0,
            symbolicated: true,
            markerSchema: []
        },
        pages: [],
        threads: []
    };
}
exports.getEmptyProfile = getEmptyProfile;
