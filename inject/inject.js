// AntiGravity Ultimate React Hacker v6
// Pure Functional - No Visuals

(function () {
    console.log("AntiGravity: Ultimate React Hacker v6 Loaded");

    window.addEventListener("message", (event) => {
        if (event.data.type === "AG_REACT_SEARCH") {
            hackReactInput(event.data.query);
        }
    });

    async function hackReactInput(value) {
        // 1. Find the Input
        const input = findInput();

        if (!input) {
            console.error("AntiGravity: Input NOT found.");
            return;
        }

        console.log("AntiGravity: Input found. Injecting value:", value);

        // 2. Prepare - Focus & Click
        input.focus();
        input.click();

        // 3. EXECUTE INJECTION METHODS

        // Method A: execCommand (Best for simulating user typing)
        // We select all text first so we replace it
        try {
            input.select();
            input.setSelectionRange(0, 9999);
            const success = document.execCommand('insertText', false, value);
            console.log("AntiGravity: execCommand success?", success);
        } catch (e) {
            console.warn("AntiGravity: execCommand error", e);
        }

        // Method B: Native Value Setter (Fallback)
        // Always run this to ensure property is set even if execCommand failed
        setNativeValue(input, value);

        // Method C: React Fiber Injection (Deep Internal State)
        // Helps if the component listens to internal state changes/props
        injectViaReactFiber(input, value);

        // 4. TRIGGER EVENTS
        await new Promise(r => setTimeout(r, 50));

        // Trigger generic events
        ['input', 'change', 'blur'].forEach(e => {
            input.dispatchEvent(new Event(e, { bubbles: true }));
        });

        // 5. TRIGGER SEARCH ACTION
        console.log("AntiGravity: Triggering Enter/Search");
        triggerEnter(input);

        // Click Search Button if available
        await new Promise(r => setTimeout(r, 100));
        clickSearchButton(input);
    }

    function findInput() {
        // Prority 1: The main Order Search Input
        const p1 = document.querySelector('input[placeholder*="Mã đơn / Mã vận chuyển"]');
        if (p1) return p1;

        // Priority 2: Generic Ant Design Search Input
        const p2 = document.querySelector('input.ant-input[placeholder*="Mã đơn"]');
        if (p2) return p2;

        // Priority 3: Any Ant Input (Fallback)
        return document.querySelector('input.ant-input');
    }

    function setNativeValue(input, value) {
        const proto = window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(input, value);
    }

    function injectViaReactFiber(input, value) {
        try {
            const keys = Object.keys(input);
            const key = keys.find(k => k.startsWith('__reactProps') || k.startsWith('__reactEventHandlers'));
            if (key) {
                const props = input[key];
                const event = {
                    target: input,
                    currentTarget: input,
                    bubbles: true,
                    cancelable: true,
                    type: 'change',
                    nativeEvent: new Event('change')
                };
                // Force target value
                event.target.value = value;

                if (props.onChange) {
                    props.onChange(event);
                }
            }
        } catch (e) { }
    }

    function triggerEnter(input) {
        const keyboardOptions = {
            key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
            bubbles: true, cancelable: true, view: window
        };
        input.dispatchEvent(new KeyboardEvent('keydown', keyboardOptions));
        input.dispatchEvent(new KeyboardEvent('keypress', keyboardOptions));
        input.dispatchEvent(new KeyboardEvent('keyup', keyboardOptions));
    }

    function clickSearchButton(input) {
        const wrapper = input.closest('.ant-input-affix-wrapper') || input.parentElement;
        if (wrapper) {
            const icon = wrapper.querySelector('.anticon-search') || wrapper.querySelector('span[role="img"][aria-label="search"]');
            if (icon) icon.click();
        }
    }

})();
