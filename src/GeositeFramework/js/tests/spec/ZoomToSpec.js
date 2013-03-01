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
            esri = {};
            esri.SpatialReference = function () { return {} };
            spyOn(uiInput, 'geocodeAddress');
        });

        // spy on ajax and make send back some dummy response.
        it('Calls geocodeAddress after the input is set', function () {
            expect(uiInput.geocodeAddress).not.toHaveBeenCalled();
            uiInput.set('inputValue', "Philadelphia");
            expect(uiInput.geocodeAddress).toHaveBeenCalled();
        });

        it('Forces the UI to stay expanded when there is an input value', function () {
            expect(uiInput.get('showingInput')).toBe(false);
            expect(uiInput.get('showingLocationBox')).toBe(false);

            uiInput.set('inputValue', "search query");

            expect(uiInput.get('showingInput')).toBe(true);
            expect(uiInput.get('showingLocationBox')).toBe(true);
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
});
