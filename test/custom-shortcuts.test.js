import test from 'node:test';
import assert from 'node:assert/strict';
import { installDomStub, keyEvent, setPresent } from './helpers/dom-stub.js';

installDomStub();

const { handleKeydown, resetKeybindingState, getSequenceBuffer } = await import('../src/keybindings.js');
const { VimRoamPanel, RoamBlock } = await import('../src/panel.js');
const { Mode, getMode } = await import('../src/mode.js');
const { pageHintState, hidePageHints } = await import('../src/page-hints.js');
const { searchState, resetSearch } = await import('../src/search.js');
const { HINT_CSS_CLASS, SEARCH_INPUT_ID, Selectors } = await import('../src/constants.js');
const { updateVimView } = await import('../src/view.js');
const { Mouse } = await import('../src/utils.js');

test.beforeEach(() => {
    installDomStub();
    setPresent();
    resetKeybindingState();
    hidePageHints();
    resetSearch();
});

test.afterEach(() => {
    resetKeybindingState();
    hidePageHints();
    resetSearch();
});

for (const visual of [false, true]) {
    test(`c copies a block reference in ${visual ? 'visual' : 'normal'} mode`, async t => {
        setPresent(visual ? [Selectors.highlight] : []);
        t.mock.method(VimRoamPanel, 'selected', () => ({
            selectedBlockId: 'block-input-main-abcdefghi',
        }));
        const copied = [];
        const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: async text => copied.push(text) },
        });
        t.after(() => {
            if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
            else delete navigator.clipboard;
        });

        const event = keyEvent('c');
        handleKeydown(event);
        await Promise.resolve();

        assert.equal(event.defaultPrevented, true);
        assert.deepEqual(copied, ['((abcdefghi))']);
    });
}

test('c remains ordinary text in insert mode', () => {
    document.activeElement = { tagName: 'TEXTAREA', closest: () => null };
    const event = keyEvent('c');
    handleKeydown(event);
    assert.equal(event.defaultPrevented, false);
});

test('m and b click the sixth and seventh rendered block hints', t => {
    const links = Array.from({ length: 7 }, () => ({
        classes: new Set(),
        contains: () => false,
    }));
    for (const link of links) {
        link.classList = { add: (...names) => names.forEach(name => link.classes.add(name)) };
    }
    const block = { classList: { add() {} }, querySelectorAll: () => links };
    t.mock.method(RoamBlock, 'selected', () => ({ element: block }));
    t.mock.method(document, 'querySelector', selector =>
        links.find(link => link.classes.has(selector.slice(1))) ?? null
    );
    const clicks = t.mock.method(Mouse, 'leftClick', () => {});
    updateVimView();

    handleKeydown(keyEvent('m'));
    handleKeydown(keyEvent('b'));

    assert.equal(links[5].classes.has(`${HINT_CSS_CLASS}5`), true);
    assert.equal(links[6].classes.has(`${HINT_CSS_CLASS}6`), true);
    assert.deepEqual(clicks.mock.calls.map(call => call.arguments[0]), [links[5], links[6]]);
});

test('f opens page hints instead of clicking a block hint', t => {
    const link = {
        getBoundingClientRect: () => ({ top: 10, left: 10, bottom: 30, right: 30, width: 20, height: 20 }),
    };
    t.mock.method(document, 'querySelectorAll', selector =>
        selector === `${Selectors.link}, ${Selectors.blockReference}` ? [link] : []
    );
    const clicks = t.mock.method(Mouse, 'leftClick', () => {});
    const event = keyEvent('f');
    handleKeydown(event);

    assert.equal(event.defaultPrevented, true);
    assert.equal(getMode(), Mode.HINT);
    assert.equal(pageHintState.hints[0].element, link);
    assert.equal(clicks.mock.callCount(), 0);
});

for (const mode of Object.values(Mode)) {
    test(`Alt+W closes the selected sidebar page from ${mode}`, t => {
        const closeButton = {};
        t.mock.method(RoamBlock, 'selected', () => ({
            element: { closest: () => ({ querySelector: () => closeButton }) },
        }));
        const clicks = t.mock.method(Mouse, 'leftClick', () => {});
        if (mode === Mode.INSERT) {
            document.activeElement = { tagName: 'TEXTAREA', closest: () => null };
        }
        if (mode === Mode.VISUAL) setPresent([Selectors.highlight]);
        if (mode === Mode.HINT) pageHintState.active = true;
        if (mode === Mode.SEARCH) {
            setPresent([], [SEARCH_INPUT_ID]);
            searchState.active = true;
        }
        if (mode === Mode.NORMAL) handleKeydown(keyEvent('g'));
        assert.equal(getMode(), mode);

        // macOS reports Option+W as a symbol, while retaining code KeyW.
        const event = keyEvent(mode === Mode.INSERT ? '∑' : 'w', { altKey: true, code: 'KeyW' });
        handleKeydown(event);

        assert.equal(event.defaultPrevented, true);
        assert.equal(clicks.mock.callCount(), 1);
        assert.equal(clicks.mock.calls[0].arguments[0], closeButton);
        assert.equal(getSequenceBuffer(), '');
        assert.equal(pageHintState.active, false);
        assert.equal(searchState.active, false);
    });
}

test('sidebar close does not take Ctrl+W, Cmd+W, or keys in a Roam dialog', t => {
    const clicks = t.mock.method(Mouse, 'leftClick', () => {});
    for (const modifiers of [{ ctrlKey: true }, { metaKey: true }, { altKey: true, shiftKey: true }]) {
        const event = keyEvent('w', modifiers);
        handleKeydown(event);
        assert.equal(event.defaultPrevented, false);
    }
    document.activeElement = {
        tagName: 'INPUT',
        closest: selector => selector === Selectors.roamModal ? {} : null,
    };
    const event = keyEvent('w', { altKey: true });
    handleKeydown(event);
    assert.equal(event.defaultPrevented, false);
    assert.equal(clicks.mock.callCount(), 0);
});
