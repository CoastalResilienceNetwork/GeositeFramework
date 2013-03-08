describe('ZoomTo', function() {
    it('Was loaded correctly', function() {
        expect(modules.ui).toBeDefined();
    });

    it('Has a uiInput model class', function() {
        expect(modules.ui.UiInput).toBeDefined();
    });

    it('Has a uiInputView view class', function() {
        expect(modules.ui.UiInputView).toBeDefined();
    });


    describe("UiInput model instance", function() {
        beforeEach(function() {
            uiInput = new modules.ui.UiInput;
            uiInput.setupLocator("", "", "", "");
            spyOn(uiInput, 'geocodeAddress');
        });

        // This test is no longer valid because the behavior has changed.
        // TODO: write a test to test the new behavior.
        // it('Calls geocodeAddress after the input is set', function () {
        //     expect(uiInput.geocodeAddress).not.toHaveBeenCalled();
        //     uiInput.set('inputValue', "Philadelphia");
        //     expect(uiInput.geocodeAddress).toHaveBeenCalled();
        // });

        it('Forces the UI to stay expanded when there is an input value', function () {
            expect(uiInput.get('showingInput')).toBe(false);
            expect(uiInput.get('showingLocationBox')).toBe(false);

            uiInput.set('inputValue', "search query");

            expect(uiInput.get('showingInput')).toBe(true);

            expect(uiInput.get('showingLocationBox')).toBe(false);
        });

        it('forces the input box to be expanded when it has the mouse', function () {
            expect(uiInput.get('showingInput')).toBe(false);
            expect(uiInput.get('hasMouse')).toBe(false);

            uiInput.set('hasMouse', true);

            expect(uiInput.get('showingInput')).toBe(true);
        });
                   
        it('forces the input box to be expanded when it has focus', function () {
            expect(uiInput.get('showingInput')).toBe(false);
            expect(uiInput.get('hasFocus')).toBe(false);

            uiInput.set('hasFocus', true);

            expect(uiInput.get('showingInput')).toBe(true);
        });

        // TODO: use mockjax to fake the ajax
        // it('Geocodes correctly', function () {
        //     uiInput.set('inputValue', "Philadelphia");
        //     expect(uiInput.get('showingInput')).toBe(true);
        //     expect(uiInput.get('addressCandidates')).toEqual([]);
        //     expect(uiInput.get('addressError')).toEqual(true);
        // });
    });

    describe("UiInputView view instance", function() {
        beforeEach(function() {
            uiInput = new modules.ui.UiInput;
            uiInput.setupLocator("",
                                 // dummy map object
                                 { centerAndZoom: function () { } },
                                 "",
                                 // dummy point function
                                 function (x, y) { return [0, 0] }
                                );

            uiInputView = new modules.ui.UiInputView({ model: uiInput });
            uiInputView.render();
            input = uiInputView.$('input');

            enterPress = $.Event("keyup", { keyCode: 13 }),
            otherPress = $.Event("keyup", { keyCode: 10 }),

            spyOn(uiInput, "geocodeAddress");
            spyOn(uiInput.locator.map, "centerAndZoom");
        });

        it('sets the inputValue attribute iff enter is pressed', function () {
            expect(uiInputView.model.get('inputValue')).toBe("");
            
            input.val("test");
            expect(uiInputView.model.get('inputValue')).not.toBe("test");

            input.trigger(enterPress);
            expect(uiInputView.model.get('inputValue')).toBe("test");
        });

        it("does set the inputValue attribute if a non-enter key is pressed", function () {
            expect(uiInputView.model.get('inputValue')).toBe("");
            
            input.val("test");
            input.trigger(otherPress);

            expect(uiInputView.model.get('inputValue')).toBe("test");
        });

        it('Changes state correctly when centerAndZoom is called.', function() {
            uiInputView.centerAndZoom();
            expect(input.val()).toBe("");
            expect(uiInputView.model.get('inputValue')).toBe("");
            expect(uiInputView.model.get('showingInput')).toBe(false);
            expect(uiInputView.model.get('showingLocationBox')).toBe(false);
        });

        // TODO: Test renderLocationBox
        // TODO: Test listens events
        // TODO: Test renders

    });
});
