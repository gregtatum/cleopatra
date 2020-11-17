"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
+type;
'focus-subtree',
    +callNodePath;
CallNodePath,
    +implementation;
ImplementationFilter,
    +inverted;
boolean,
;
/**
 * This is the same operation as the FocusSubtree, but it is performed on each usage
 * of the function across the tree, node just the one usage in a call tree.
 *
 *            A:3,0                        X:3,0
 *            /    \                         |
 *           v      v        Focus X         v
 *      X:1,0      B:2,0       ->          Y:3,0
 *        |          |                    /     \
 *        v          v                   v       v
 *      Y:1,0      X:2,0              C:1,1      X:2,0
 *        |          |                             |
 *        v          v                             v
 *      C:1,1      Y:2,0                         Y:2,0
 *                   |                             |
 *                   v                             v
 *                 X:2,0                         D:2,2
 *                   |
 *                   v
 *                 Y:2,0
 *                   |
 *                   v
 *                 D:2,2
 */
'focus-function';
{
     |
        +type;
    'focus-function',
        +funcIndex;
    IndexIntoFuncTable,
    ;
}
/**
 * The MergeCallNode transform represents merging a CallNode into the parent CallNode. The
 * CallNode must match the given CallNodePath. In the call tree below, if the CallNode
 * at path [A, B, C] is removed, then the `D` and `F` CallNodes are re-assigned to `B`.
 * No self time in this case would change, as `C` was not a leaf CallNode, but the
 * structure of the tree was changed slightly. The merging work is done by transforming
 * an existing thread's stackTable.
 *
 *                 A:3,0                              A:3,0
 *                   |                                  |
 *                   v                                  v
 *                 B:3,0        Merge CallNode        B:3,0
 *                 /    \        [A, B, C]         /    |    \
 *                v      v          -->           v     v     v
 *            C:2,0     H:1,0                 D:1,0   F:1,0    H:1,0
 *           /      \         \                 |       |        |
 *          v        v         v                v       v        v
 *        D:1,0     F:1,0     F:1,1          E:1,1    G:1,1    F:1,1
 *        |           |
 *        v           v
 *      E:1,1       G:1,1
 *
 *
 * When a leaf CallNode is merged, the self time for that CallNode is assigned to the
 * parent CallNode. Here the leaf CallNode `E` is merged. `D` goes from having a self
 * time of 0 to 1.
 *                A:3,0                              A:3,0
 *                  |                                  |
 *                  v                                  v
 *                B:3,0        Merge CallNode         B:3,0
 *                /    \      [A, B, C, D, E]        /    \
 *               v      v           -->             v      v
 *           C:2,0     H:1,0                    C:2,0     H:1,0
 *          /      \         \                 /      \         \
 *         v        v         v               v        v         v
 *       D:1,0     F:1,0     F:1,1          D:1,1     F:1,0     F:1,1
 *       |           |                                  |
 *       v           v                                  v
 *     E:1,1       G:1,1                              G:1,1
 *
 * This same operation is not applied to an inverted call stack as it has been deemed
 * not particularly useful, and prone to not give the expected results.
 */
'merge-call-node';
{
     |
        +type;
    'merge-call-node',
        +callNodePath;
    CallNodePath,
        +implementation;
    ImplementationFilter,
    ;
}
/**
 * The MergeFunctions transform is similar to the MergeCallNode, except it merges a single
 * function across the entire call tree, regardless of its location in the tree. It is not
 * depended on any particular CallNodePath.
 *
 *                 A:3,0                              A:3,0
 *                   |                                  |
 *                   v                                  v
 *                 B:3,0                              B:3,0
 *                 /    \       Merge Func C       /    |    \
 *                v      v           -->          v     v     v
 *            C:2,0     H:1,0                 D:1,0   F:1,0    H:1,1
 *           /      \         \                 |       |
 *          v        v         v                v       v
 *        D:1,0     F:1,0     C:1,1          E:1,1    G:1,1
 *        |           |
 *        v           v
 *      E:1,1       G:1,1
 */
'merge-function';
{
     |
        +type;
    'merge-function',
        +funcIndex;
    IndexIntoFuncTable,
    ;
}
/**
 * The DropFunction transform removes samples from the thread that have a function
 * somewhere in its stack.
 *
 *                 A:4,0                              A:1,0
 *                 /    \        Drop Func C            |
 *                v      v           -->                v
 *            B:3,0     C:1,0                         B:1,0
 *           /      \                                   |
 *          v        v                                  v
 *        C:2,1     D:1,1                             D:1,1
 *        |
 *        v
 *      D:1,1
 */
'drop-function';
{
     |
        +type;
    'drop-function',
        +funcIndex;
    IndexIntoFuncTable,
    ;
}
/**
 * Collapse resource takes CallNodes that are of a consecutive library, and collapses
 * them into a new collapsed pseudo-stack. Given a call tree like below, where each node
 * is defined by either "function_name" or "function_name:library_name":
 *
 *               A                                   A
 *             /   \                                 |
 *            v     v        Collapse firefox        v
 *    B:firefox    E:firefox       ->             firefox
 *        |            |                         /       \
 *        v            v                        D        F
 *    C:firefox        F
 *        |
 *        v
 *        D
 */
'collapse-resource';
{
     |
        +type;
    'collapse-resource',
        +resourceIndex;
    IndexIntoResourceTable,
        // This is the index of the newly created function that represents the collapsed stack.
        +collapsedFuncIndex;
    IndexIntoFuncTable,
        +implementation;
    ImplementationFilter,
    ;
}
/**
 * Collapse direct recursion takes a function that calls itself recursively and collapses
 * it into a single stack.
 *
 *      A                                 A
 *      ↓    Collapse direct recursion    ↓
 *      B          function B             B
 *      ↓              ->                 ↓
 *      B                                 C
 *      ↓
 *      B
 *      ↓
 *      B
 *      ↓
 *      C
 */
'collapse-direction-recursion';
{
     |
        +type;
    'collapse-direct-recursion',
        +funcIndex;
    IndexIntoFuncTable,
        +implementation;
    ImplementationFilter,
    ;
}
/**
 * Collapse the subtree of a function into that function across the entire tree.
 *
 *                  A:4,0                             A:4,0
 *                    |                                 |
 *                    v                                 v
 *                  B:4,0                             B:4,0
 *                  /    \     Collapse subtree C    /     \
 *                 v      v           -->           v       v
 *             C:2,0     H:2,0                    C:2,2     H:2,0
 *            /      \         \                              |
 *           v        v         v                             v
 *         D:1,0     F:1,0     C:2,0                        C:2,2
 *         /          /        /   \
 *        v          v        v     v
 *      E:1,1     G:1,1    I:1,1    J:1,1
 */
'collapse-function-subtree';
{
     |
        +type;
    'collapse-function-subtree',
        +funcIndex;
    IndexIntoFuncTable,
    ;
}
;
+type;
T;
 > (transform);
S;
T;
