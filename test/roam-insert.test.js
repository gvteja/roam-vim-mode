import test from 'node:test';
import assert from 'node:assert/strict';

import { installDomStub } from './helpers/dom-stub.js';

installDomStub();

const { Roam } = await import('../src/roam.js');
const { Selectors } = await import('../src/constants.js');

const UID = 'block1234';
const PARENT_UID = 'parent123';
const NEW_UID = 'newblock1';

function blockElement(viewState, windowId = 'log-outline') {
    const classes = new Set(viewState ? [`rm-block--${viewState}`] : []);
    const container = { classList: { contains: name => classes.has(name) } };
    return {
        id: `block-input-${windowId}-${UID}`,
        closest: selector => {
            assert.equal(selector, Selectors.blockContainer);
            return viewState === null ? null : container;
        },
    };
}

function installApi({ open, childCount = 2 } = {}) {
    const created = [];
    const focused = [];
    const block = {
        ':block/uid': UID,
        ':block/order': 3,
        ':block/_children': { ':block/uid': PARENT_UID },
        ':block/children': Array.from({ length: childCount }, (_, i) => ({ ':block/uid': `child${i}` })),
    };
    if (open !== undefined) block[':block/open'] = open;
    window.roamAlphaAPI = {
        pull: (pattern, lookup) => {
            assert.deepEqual(lookup, [':block/uid', UID]);
            return block;
        },
        util: { generateUID: () => NEW_UID },
        data: { block: { create: async args => created.push(args) } },
        ui: { setBlockFocusAndSelection: async args => focused.push(args) },
    };
    return { created, focused };
}

test.afterEach(() => {
    delete window.roamAlphaAPI;
});

const belowCases = [
    { name: 'folded block stays at the same level', viewState: 'closed', open: false, nest: false },
    { name: 'folded view overrides an open saved block', viewState: 'closed', open: true, nest: false },
    { name: 'folded view overrides a missing saved open value', viewState: 'closed', nest: false },
    { name: 'expanded block inserts its first child', viewState: 'open', open: true, nest: true },
    { name: 'expanded view overrides a closed saved block', viewState: 'open', open: false, nest: true },
    { name: 'expanded leaf inserts a sibling', viewState: 'open', open: true, childCount: 0, nest: false },
    { name: 'folded leaf inserts a sibling', viewState: 'closed', open: true, childCount: 0, nest: false },
    { name: 'missing container uses the saved closed state', viewState: null, open: false, nest: false },
    { name: 'missing container uses the saved open state', viewState: null, open: true, nest: true },
    { name: 'unknown markup uses the saved state', viewState: '', open: true, nest: true },
];

for (const scenario of belowCases) {
    test(`o: ${scenario.name}`, async () => {
        const { created, focused } = installApi(scenario);
        assert.equal(await Roam.createBlockBelow(blockElement(scenario.viewState)), NEW_UID);
        assert.deepEqual(created, [{
            location: { 'parent-uid': scenario.nest ? UID : PARENT_UID, order: scenario.nest ? 0 : 4 },
            block: { string: '', uid: NEW_UID },
        }]);
        assert.deepEqual(focused, [{ location: { 'block-uid': NEW_UID, 'window-id': 'log-outline' } }]);
    });
}

test('o: two views of the same block use their own fold state and retain focus in that view', async () => {
    const { created, focused } = installApi({ open: true });
    await Roam.createBlockBelow(blockElement('closed', 'sidebar-outline-page12345'));
    await Roam.createBlockBelow(blockElement('open', 'log-outline'));
    assert.deepEqual(created.map(args => args.location), [
        { 'parent-uid': PARENT_UID, order: 4 },
        { 'parent-uid': UID, order: 0 },
    ]);
    assert.deepEqual(focused.map(args => args.location['window-id']), ['sidebar-outline-page12345', 'log-outline']);
});

for (const viewState of ['open', 'closed']) {
    test(`O: inserts a sibling above the ${viewState} block`, async () => {
        const { created, focused } = installApi({ open: true });
        assert.equal(await Roam.createBlockAbove(blockElement(viewState)), NEW_UID);
        assert.deepEqual(created, [{
            location: { 'parent-uid': PARENT_UID, order: 3 },
            block: { string: '', uid: NEW_UID },
        }]);
        assert.deepEqual(focused, [{ location: { 'block-uid': NEW_UID, 'window-id': 'log-outline' } }]);
    });
}
