beforeEach(function() {
    this.addMatchers({
        toBeAFunction: function() {
            return ((typeof this.actual) === 'function');
        },
        toBeADate: function() {
            return (this.actual.constructor === (new Date).constructor);
        }
    });
});

