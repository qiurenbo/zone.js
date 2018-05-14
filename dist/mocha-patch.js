/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (global) {
    var isNode = (typeof global.process !== 'undefined' &&
        {}.toString.call(global.process) === '[object process]');
    if (isNode && global && !global.Mocha) {
        try {
            var module_1 = 'mocha';
            // to prevent systemjs to preload the require module
            // which will cause error.
            global.Mocha = require('' + module_1);
        }
        catch (err) {
        }
    }
}(typeof window === 'undefined' ? global : window));

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Zone.__load_patch('Mocha', function (global, Zone, api) {
    var Mocha = global.Mocha;
    var jasmine = global.jasmine;
    if (typeof Mocha === 'undefined') {
        return;
    }
    if (Mocha['__zone_symbol__isBridge']) {
        return;
    }
    if (jasmine && !jasmine['__zone_symbol__isBridge']) {
        return;
    }
    if (typeof Zone === 'undefined') {
        throw new Error('Missing Zone.js');
    }
    var ProxyZoneSpec = Zone['ProxyZoneSpec'];
    var SyncTestZoneSpec = Zone['SyncTestZoneSpec'];
    var FakeAsyncTestZoneSpec = Zone['FakeAsyncTestZoneSpec'];
    if (!ProxyZoneSpec) {
        throw new Error('Missing ProxyZoneSpec');
    }
    if (Mocha['__zone_patch__']) {
        throw new Error('"Mocha" has already been patched with "Zone".');
    }
    Mocha['__zone_patch__'] = true;
    var rootZone = Zone.current;
    var syncZone = rootZone.fork(new SyncTestZoneSpec('Mocha.describe'));
    var testZone = null;
    var testZoneSpec = null;
    var suiteZoneSpec = new ProxyZoneSpec();
    var suiteZone = rootZone.fork(suiteZoneSpec);
    var mochaOriginal = {
        after: Mocha.after,
        afterEach: Mocha.afterEach,
        before: Mocha.before,
        beforeEach: Mocha.beforeEach,
        describe: Mocha.describe,
        it: Mocha.it
    };
    function modifyArguments(args, syncTest, asyncTest) {
        var _loop_1 = function (i) {
            var arg = args[i];
            if (typeof arg === 'function') {
                // The `done` callback is only passed through if the function expects at
                // least one argument.
                // Note we have to make a function with correct number of arguments,
                // otherwise mocha will
                // think that all functions are sync or async.
                args[i] = (arg.length === 0) ? syncTest(arg) : asyncTest(arg);
                // Mocha uses toString to view the test body in the result list, make sure we return the
                // correct function body
                args[i].toString = function () {
                    return arg.toString();
                };
            }
        };
        for (var i = 0; i < args.length; i++) {
            _loop_1(i);
        }
        return args;
    }
    function wrapDescribeInZone(args) {
        var syncTest = function (fn) {
            return function () {
                var _this = this;
                if (this && this instanceof Mocha.Suite) {
                    // add an afterAll hook to clear spies.
                    this.afterAll('afterAll clear spies', function () {
                        Mocha.clearSpies(_this);
                    });
                    this.afterEach('afterEach clear spies', function () {
                        var _this = this;
                        if (this.test && this.test.ctx && this.test.currentTest) {
                            Mocha.clearSpies(this.test.ctx.currentTest);
                            if (Mocha.__zone_symbol__afterEach) {
                                Mocha.__zone_symbol__afterEach.forEach(function (afterEachCallback) {
                                    afterEachCallback(_this.test.ctx.currentTest);
                                });
                            }
                        }
                    });
                    Mocha.__zone_symbol__suite = this;
                }
                return syncZone.run(fn, this, arguments);
            };
        };
        return modifyArguments(args, syncTest);
    }
    function beforeTest(ctx, testBody) {
        registerCurrentTestBeforeTest(ctx);
        checkTimeout(ctx && ctx.test);
        return checkIsFakeAsync(testBody);
    }
    function checkTimeout(test) {
        if (test && typeof test.timeout === 'function' &&
            typeof Mocha.__zone_symbol__TIMEOUT === 'number') {
            test.timeout(Mocha.__zone_symbol__TIMEOUT);
            // clear timeout, until user set jasmine.DEFAULT_TIMEOUT_INTERVAL again
            Mocha.__zone_symbol__TIMEOUT = null;
        }
    }
    function registerCurrentTestBeforeTest(ctx) {
        Mocha.__zone_symbol__current_ctx = ctx;
        if (ctx && ctx.test && ctx.test.ctx && ctx.test.ctx.currentTest) {
            Mocha.__zone_symbol__test = ctx.test.ctx.currentTest;
        }
    }
    function checkIsFakeAsync(testBody) {
        var jasmine = global.jasmine;
        var isClockInstalled = jasmine && !!jasmine[api.symbol('clockInstalled')];
        if (isClockInstalled) {
            // auto run a fakeAsync
            var fakeAsyncModule = Zone[api.symbol('fakeAsyncTest')];
            if (fakeAsyncModule && typeof fakeAsyncModule.fakeAsync === 'function') {
                testBody = fakeAsyncModule.fakeAsync(testBody, { checkNested: false, checkRemainingMacrotasks: false });
            }
        }
        return testBody;
    }
    function wrapTestInZone(args) {
        var timeoutArgs = args.length > 0 ? args[args.length - 1] : null;
        var asyncTest = function (fn) {
            return function (done) {
                if (this && typeof this.timeout === 'function' && typeof timeoutArgs === 'number') {
                    this.timeout(timeoutArgs);
                }
                fn = beforeTest(this, fn);
                return testZone.run(fn, this, [done]);
            };
        };
        var syncTest = function (fn) {
            return function () {
                fn = beforeTest(this, fn);
                return testZone.run(fn, this);
            };
        };
        return modifyArguments(args, syncTest, asyncTest);
    }
    function wrapSuiteInZone(args) {
        var asyncTest = function (fn) {
            return function (done) {
                fn = beforeTest(this, fn);
                return suiteZone.run(fn, this, [done]);
            };
        };
        var syncTest = function (fn) {
            return function () {
                fn = beforeTest(this, fn);
                return suiteZone.run(fn, this);
            };
        };
        return modifyArguments(args, syncTest, asyncTest);
    }
    Mocha.getCurrentTestInfo = function () {
        return { suite: Mocha.__zone_symbol__suite, test: Mocha.__zone_symbol__test };
    };
    Mocha.clearSpies = function () { };
    global.describe = global.suite = Mocha.describe = function () {
        return mochaOriginal.describe.apply(this, wrapDescribeInZone(arguments));
    };
    global.xdescribe = global.suite.skip = Mocha.describe.skip = function () {
        return mochaOriginal.describe.skip.apply(this, wrapDescribeInZone(arguments));
    };
    global.describe.only = global.suite.only = Mocha.describe.only = function () {
        return mochaOriginal.describe.only.apply(this, wrapDescribeInZone(arguments));
    };
    global.it = global.specify = global.test = Mocha.it = function () {
        return mochaOriginal.it.apply(this, wrapTestInZone(arguments));
    };
    global.xit = global.xspecify = Mocha.it.skip = function () {
        return mochaOriginal.it.skip.apply(this, wrapTestInZone(arguments));
    };
    global.it.only = global.test.only = Mocha.it.only = function () {
        return mochaOriginal.it.only.apply(this, wrapTestInZone(arguments));
    };
    global.after = global.suiteTeardown = Mocha.after = function () {
        return mochaOriginal.after.apply(this, wrapSuiteInZone(arguments));
    };
    global.afterEach = global.teardown = Mocha.afterEach = function () {
        return mochaOriginal.afterEach.apply(this, wrapTestInZone(arguments));
    };
    global.before = global.suiteSetup = Mocha.before = function () {
        return mochaOriginal.before.apply(this, wrapSuiteInZone(arguments));
    };
    global.beforeEach = global.setup = Mocha.beforeEach = function () {
        return mochaOriginal.beforeEach.apply(this, wrapTestInZone(arguments));
    };
    (function (originalRunTest, originalRun) {
        Mocha.Runner.prototype.runTest = function (fn) {
            var _this = this;
            Zone.current.scheduleMicroTask('mocha.forceTask', function () {
                originalRunTest.call(_this, fn);
            });
        };
        Mocha.Runner.prototype.run = function (fn) {
            this.on('test', function (e) {
                testZoneSpec = new ProxyZoneSpec();
                testZone = rootZone.fork(testZoneSpec);
            });
            this.on('fail', function (test, err) {
                var proxyZoneSpec = testZone && testZone.get('ProxyZoneSpec');
                if (proxyZoneSpec && err) {
                    err.message += proxyZoneSpec.getAndClearPendingTasksInfo();
                }
            });
            return originalRun.call(this, fn);
        };
    })(Mocha.Runner.prototype.runTest, Mocha.Runner.prototype.run);
});

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function mappingBDD(jasmine, Mocha, global) {
    var mappings = [
        { jasmine: 'beforeAll', Mocha: 'before' }, { jasmine: 'afterAll', Mocha: 'after' },
        { jasmine: 'xdescribe', Mocha: 'describe.skip' }, { jasmine: 'fdescribe', Mocha: 'describe.only' },
        { jasmine: 'xit', Mocha: 'it.skip' }, { jasmine: 'fit', Mocha: 'it.only' }
    ];
    mappings.forEach(function (map) {
        if (!global[map.jasmine]) {
            var mocha = map.Mocha;
            var chains = mocha.split('.');
            var mochaMethod_1 = null;
            for (var i = 0; i < chains.length; i++) {
                mochaMethod_1 = mochaMethod_1 ? mochaMethod_1[chains[i]] : global[chains[i]];
            }
            global[map.jasmine] = jasmine[map.jasmine] = function () {
                var args = Array.prototype.slice.call(arguments);
                if (args.length > 0 && typeof args[args.length - 1] === 'number') {
                    // get a timeout
                    var timeout = args[args.length - 1];
                    if (this && typeof this.timeout === 'function') {
                        this.timeout(timeout);
                    }
                }
                return mochaMethod_1.apply(this, args);
            };
        }
    });
    if (!global['pending']) {
        global['pending'] = function () {
            var ctx = Mocha.__zone_symbol__current_ctx;
            if (ctx && typeof ctx.skip === 'function') {
                ctx.skip();
            }
        };
    }
    if (!global['fail']) {
        global['fail'] = function (error) {
            var err = error ? error : new Error();
            throw err;
        };
    }
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// need to patch jasmine.clock().mockDate and jasmine.clock().tick() so
// they can work properly in FakeAsyncTest
function patchJasmineClock(jasmine, global) {
    var symbol = Zone.__symbol__;
    var originalClockFn = (jasmine[symbol('clock')] = jasmine['clock']);
    jasmine['clock'] = function () {
        var clock = originalClockFn.apply(this, arguments);
        if (!clock[symbol('patched')]) {
            clock[symbol('patched')] = symbol('patched');
            var originalTick_1 = (clock[symbol('tick')] = clock.tick);
            clock.tick = function () {
                var fakeAsyncZoneSpec = Zone.current.get('FakeAsyncTestZoneSpec');
                if (fakeAsyncZoneSpec) {
                    return fakeAsyncZoneSpec.tick.apply(fakeAsyncZoneSpec, arguments);
                }
                return originalTick_1.apply(this, arguments);
            };
            var originalMockDate_1 = (clock[symbol('mockDate')] = clock.mockDate);
            clock.mockDate = function () {
                var fakeAsyncZoneSpec = Zone.current.get('FakeAsyncTestZoneSpec');
                if (fakeAsyncZoneSpec) {
                    var dateTime = arguments.length > 0 ? arguments[0] : new Date();
                    return fakeAsyncZoneSpec.setCurrentRealTime.apply(fakeAsyncZoneSpec, dateTime && typeof dateTime.getTime === 'function' ? [dateTime.getTime()] :
                        arguments);
                }
                return originalMockDate_1.apply(this, arguments);
            };
            // for auto go into fakeAsync feature, we need the flag to enable it
            ['install', 'uninstall'].forEach(function (methodName) {
                var originalClockFn = (clock[symbol(methodName)] = clock[methodName]);
                clock[methodName] = function () {
                    var enableClockPatch = global[symbol('fakeAsyncPatchLock')] === true;
                    var FakeAsyncTestZoneSpec = Zone['FakeAsyncTestZoneSpec'];
                    if (enableClockPatch && FakeAsyncTestZoneSpec) {
                        jasmine[symbol('clockInstalled')] = 'install' === methodName;
                        return;
                    }
                    return originalClockFn.apply(this, arguments);
                };
            });
        }
        return clock;
    };
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function addJasmineClock(jasmine, global) {
    jasmine.clock = function () {
        return {
            tick: function () { },
            install: function () { },
            uninstall: function () { },
            mockDate: function () { }
        };
    };
    patchJasmineClock(jasmine, global);
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function argsToArray(args) {
    var arrayOfArgs = [];
    for (var i = 0; i < args.length; i++) {
        arrayOfArgs.push(args[i]);
    }
    return arrayOfArgs;
}

function clone(obj) {
    if (Object.prototype.toString.apply(obj) === '[object Array]') {
        return obj.slice();
    }
    var cloned = {};
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            cloned[prop] = obj[prop];
        }
    }
    return cloned;
}

var primitives = /^\[object (Boolean|String|RegExp|Number)/;
function cloneArgs(args) {
    var clonedArgs = [];
    var argsAsArray = argsToArray(args);
    for (var i = 0; i < argsAsArray.length; i++) {
        var str = Object.prototype.toString.apply(argsAsArray[i]);
        // All falsey values are either primitives, `null`, or `undefined.
        if (!argsAsArray[i] || str.match(primitives)) {
            clonedArgs.push(argsAsArray[i]);
        }
        else {
            clonedArgs.push(clone(argsAsArray[i]));
        }
    }
    return clonedArgs;
}

var Any = /** @class */ (function () {
    function Any(expectedObject) {
        this.expectedObject = expectedObject;
    }
    Any.prototype.eq = function (other) {
        if (this.expectedObject == String) {
            return typeof other == 'string' || other instanceof String;
        }
        if (this.expectedObject == Number) {
            return typeof other == 'number' || other instanceof Number;
        }
        if (this.expectedObject == Function) {
            return typeof other == 'function' || other instanceof Function;
        }
        if (this.expectedObject == Object) {
            return other !== null && typeof other == 'object';
        }
        if (this.expectedObject == Boolean) {
            return typeof other == 'boolean';
        }
        return other instanceof this.expectedObject;
    };
    return Any;
}());
var ObjectContaining = /** @class */ (function () {
    function ObjectContaining(expectedObject) {
        this.expectedObject = expectedObject;
    }
    ObjectContaining.prototype.match = function (other) {
        for (var prop in this.expectedObject) {
            if (this.expectedObject.hasOwnProperty(prop)) {
                if (!eq(this.expectedObject[prop], other[prop])) {
                    return false;
                }
            }
        }
        return true;
    };
    return ObjectContaining;
}());
var customEqualityTesters = [];
function addCustomEqualityTester(jasmine) {
    jasmine.addCustomEqualityTester = function (customEqualityTester) {
        customEqualityTesters.push(customEqualityTester);
    };
}
function getErrorMessage(error) {
    return error.message || error.description;
}
function eq(a, b) {
    for (var i = 0; i < customEqualityTesters.length; i++) {
        var result = customEqualityTesters[i](a, b);
        if (result === true || result === false) {
            return result;
        }
    }
    if (a === b) {
        return true;
    }
    else if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        var isEqual = true;
        for (var prop in a) {
            if (a.hasOwnProperty(prop)) {
                if (!eq(a[prop], b[prop])) {
                    isEqual = false;
                    break;
                }
            }
        }
        return isEqual;
    }
    else if (typeof a === 'object' && typeof b === 'object') {
        if (a instanceof Any) {
            return a.eq(b);
        }
        else if (b instanceof Any) {
            return b.eq(a);
        }
        if (b instanceof ObjectContaining) {
            return b.match(a);
        }
        if (a instanceof Error && b instanceof Error) {
            return getErrorMessage(a) === getErrorMessage(b) ||
                toMatch(getErrorMessage(a), getErrorMessage(b));
        }
        if (Object.keys(a).length !== Object.keys(b).length) {
            return false;
        }
        var isEqual = true;
        for (var prop in a) {
            if (a.hasOwnProperty(prop)) {
                if (!eq(a[prop], b[prop])) {
                    isEqual = false;
                    break;
                }
            }
        }
        return isEqual;
    }
    if (a instanceof Any) {
        return a.eq(b);
    }
    else if (b instanceof Any) {
        return b.eq(a);
    }
    if (a instanceof Error) {
        return eq(getErrorMessage(a), b) || toMatch(getErrorMessage(a), b);
    }
    if (b instanceof Error) {
        return eq(a, getErrorMessage(b)) || toMatch(a, getErrorMessage(b));
    }
    return false;
}
function toMatch(actual, expected) {
    var regExp = expected instanceof RegExp ? expected : new RegExp(expected);
    return regExp.test(actual);
}
var Mocha = typeof window === 'undefined' ? global.Mocha : window.Mocha;
function formatObject(obj) {
    var stringify = Mocha.utils && Mocha.utils.stringify;
    return stringify(obj);
}
function buildFailureMessage(matcherName, isNot, actual) {
    var expected = [];
    for (var _i = 3; _i < arguments.length; _i++) {
        expected[_i - 3] = arguments[_i];
    }
    var englishyPredicate = matcherName.replace(/[A-Z]/g, function (s) {
        return ' ' + s.toLowerCase();
    });
    var message = 'Expected ' + formatObject(actual) + (isNot ? ' not ' : ' ') + englishyPredicate;
    if (expected.length > 0) {
        for (var i = 0; i < expected.length; i++) {
            if (i > 0) {
                message += ',';
            }
            message += ' ' + formatObject(expected[i]);
        }
    }
    return message + '.';
}

var __read = (undefined && undefined.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (undefined && undefined.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function addJasmineExpect(jasmine, global) {
    jasmine['__zone_symbol__customMatchers'] = [];
    addExpect(global, jasmine);
    addAny(jasmine);
    addObjectContaining(jasmine);
    addCustomEqualityTester(jasmine);
    addCustomMatchers(jasmine, global);
}
function addAny(jasmine) {
    jasmine.any = function (expected) {
        return new Any(expected);
    };
}
function addObjectContaining(jasmine) {
    jasmine.objectContaining = function (expected) {
        return new ObjectContaining(expected);
    };
}
function addCustomMatchers(jasmine, global) {
    jasmine.addMatchers = function (customMatcher) {
        var customMatchers = getCustomMatchers(jasmine);
        customMatchers.push(customMatcher);
    };
}
function getCustomMatchers(jasmine) {
    return jasmine['__zone_symbol__customMatchers'];
}
function buildCustomMatchers(jasmine, actual) {
    var matchers = { not: {} };
    var util = { equals: eq, toMatch: toMatch, buildFailureMessage: buildFailureMessage };
    var customMatchers = getCustomMatchers(jasmine);
    customMatchers.forEach(function (matcher) {
        Object.keys(matcher).forEach(function (key) {
            if (matcher.hasOwnProperty(key)) {
                var customMatcher_1 = matcher[key](util, customEqualityTesters);
                matchers[key] = function () {
                    var expects = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        expects[_i] = arguments[_i];
                    }
                    var args = expects ? __spread(expects) : [];
                    args.unshift(actual);
                    var result = customMatcher_1.compare.apply(null, args);
                    if (!result.pass) {
                        var message = result.messge || util.buildFailureMessage(key, false, actual, expects);
                        throw new Error(message);
                    }
                };
                matchers['not'][key] = function () {
                    var expects = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        expects[_i] = arguments[_i];
                    }
                    var args = expects ? __spread(expects) : [];
                    args.unshift(actual);
                    var result = customMatcher_1.compare.apply(null, args);
                    if (result.pass) {
                        var message = result.messge || util.buildFailureMessage(key, true, actual, expects);
                        throw new Error(message);
                    }
                };
            }
        });
    });
    return matchers;
}
function getMatchers() {
    return {
        nothing: function () {
            return { compare: function (actual) { return ({ pass: true }); } };
        },
        toBe: function () {
            return { compare: function (actual, expected) { return ({ pass: actual === expected }); } };
        },
        toBeCloseTo: function () {
            return {
                compare: function (actual, expected, precision) {
                    if (precision !== 0) {
                        precision = precision || 2;
                    }
                    var pow = Math.pow(10, precision + 1);
                    var delta = Math.abs(expected - actual);
                    var maxDelta = Math.pow(10, -precision) / 2;
                    return { pass: Math.round(delta * pow) / pow <= maxDelta };
                }
            };
        },
        toEqual: function () {
            return { compare: function (actual, expected) { return ({ pass: eq(actual, expected) }); } };
        },
        toBeGreaterThan: function () {
            return { compare: function (actual, expected) { return ({ pass: actual > expected }); } };
        },
        toBeGreaterThanOrEqual: function () {
            return { compare: function (actual, expected) { return ({ pass: actual >= expected }); } };
        },
        toBeLessThan: function () {
            return { compare: function (actual, expected) { return ({ pass: actual < expected }); } };
        },
        toBeLessThanOrEqual: function () {
            return { compare: function (actual, expected) { return ({ pass: actual <= expected }); } };
        },
        toBeDefined: function () {
            return { compare: function (actual) { return ({ pass: actual !== undefined }); } };
        },
        toBeNaN: function () {
            return { compare: function (actual) { return ({ pass: actual !== actual }); } };
        },
        toBeNegativeInfinity: function () {
            return { compare: function (actual) { return ({ pass: actual === Number.NEGATIVE_INFINITY }); } };
        },
        toBeNull: function () {
            return { compare: function (actual) { return ({ pass: actual === null }); } };
        },
        toBePositiveInfinity: function () {
            return { compare: function (actual) { return ({ pass: actual === Number.POSITIVE_INFINITY }); } };
        },
        toBeUndefined: function () {
            return { compare: function (actual) { return ({ pass: actual === undefined }); } };
        },
        toThrow: function () {
            return {
                compare: function (actual, expected) {
                    var pass = false;
                    try {
                        if (typeof actual === 'function') {
                            actual();
                        }
                        else {
                            pass = (!expected && actual instanceof Error) || eq(actual, expected);
                        }
                    }
                    catch (error) {
                        pass = !expected || eq(error, expected);
                    }
                    return { pass: pass };
                }
            };
        },
        toThrowError: function () {
            return {
                compare: function (actual) {
                    var pass = false;
                    try {
                        if (typeof actual === 'function') {
                            actual();
                        }
                        else {
                            pass = actual instanceof Error;
                        }
                    }
                    catch (error) {
                        pass = true;
                    }
                    return { pass: pass };
                }
            };
        },
        toBeTruthy: function () {
            return { compare: function (actual) { return ({ pass: !!actual }); } };
        },
        toBeFalsy: function () {
            return { compare: function (actual) { return ({ pass: !actual }); } };
        },
        toContain: function () {
            return { compare: function (actual, expected) { return ({ pass: actual.indexOf(expected) !== -1 }); } };
        },
        toBeCalled: function () {
            return { compare: function (actual) { return ({ pass: actual.calls.count() > 0 }); } };
        },
        toHaveBeenCalled: function () {
            return { compare: function (actual) { return ({ pass: actual.calls.count() > 0 }); } };
        },
        toBeCalledWith: function () {
            return {
                compare: function (actual) {
                    var expected = [];
                    for (var _i = 1; _i < arguments.length; _i++) {
                        expected[_i - 1] = arguments[_i];
                    }
                    return ({ pass: actual.calls.allArgs().filter(function (args) { return eq(args, expected); }).length > 0 });
                }
            };
        },
        toHaveBeenCalledWith: function () {
            return {
                compare: function (actual) {
                    var expected = [];
                    for (var _i = 1; _i < arguments.length; _i++) {
                        expected[_i - 1] = arguments[_i];
                    }
                    return ({ pass: actual.calls.allArgs().filter(function (args) { return eq(args, expected); }).length > 0 });
                }
            };
        },
        toMatch: function () {
            return { compare: function (actual, expected) { return ({ pass: toMatch(actual, expected) }); } };
        }
    };
}
function buildResolveRejects(key, matchers, actual, isNot) {
    if (isNot === void 0) { isNot = false; }
    var resolveFnFactory = function (isNot) {
        if (isNot === void 0) { isNot = false; }
        return function () {
            var self = this;
            var args = Array.prototype.slice.call(arguments);
            return actual.then(function (value) {
                var newMatchers = buildCustomMatchers(jasmine, value);
                return isNot ? newMatchers.not[key].apply(self, args) :
                    newMatchers[key].apply(self, args);
            }, function (error) {
                throw error;
            });
        };
    };
    if (isNot) {
        matchers.resolves.not[key] = resolveFnFactory(true);
    }
    else {
        matchers.resolves[key] = resolveFnFactory();
    }
    var rejectFnFactory = function (isNot) {
        if (isNot === void 0) { isNot = false; }
        return function () {
            var self = this;
            var args = Array.prototype.slice.call(arguments);
            return actual.then(function (value) { }, function (error) {
                var newMatchers = buildCustomMatchers(jasmine, error);
                return isNot ? newMatchers.not[key].apply(self, args) : newMatchers[key].apply(self, args);
            });
        };
    };
    if (isNot) {
        matchers.rejects.not[key] = rejectFnFactory(true);
    }
    else {
        matchers.rejects[key] = rejectFnFactory();
    }
}
function addExpect(global, jasmine) {
    jasmine.__zone_symbol__expect_assertions = 0;
    var builtinMatchers = getMatchers();
    var customMatchers = getCustomMatchers(jasmine);
    customMatchers.unshift(builtinMatchers);
    global['expect'] = jasmine['__zone_symbol__expect'] = function (actual) {
        jasmine.__zone_symbol__expect_assertions++;
        var matchers = buildCustomMatchers(jasmine, actual);
        if (actual && typeof actual.then === 'function') {
            // expected maybe a promise
            matchers.resolves = { not: {} };
            matchers.rejects = { not: {} };
            Object.keys(matchers).forEach(function (key) {
                if (matchers.hasOwnProperty(key)) {
                    buildResolveRejects(key, matchers, actual);
                }
            });
            Object.keys(matchers.not).forEach(function (key) {
                if (matchers.not.hasOwnProperty(key)) {
                    buildResolveRejects(key, matchers, actual, true);
                }
            });
        }
        return matchers;
    };
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// a simple version of jasmine spy
function addJasmineSpy(jasmine, Mocha, global) {
    var order = 0;
    function nextOrder() {
        return order++;
    }
    var CallTracker = /** @class */ (function () {
        function CallTracker() {
            this.calls = [];
            this.opts = {};
        }
        CallTracker.prototype.track = function (context) {
            if (this.opts.cloneArgs) {
                context.args = cloneArgs(context.args);
            }
            this.calls.push(context);
        };
        CallTracker.prototype.any = function () {
            return !!this.calls.length;
        };
        CallTracker.prototype.count = function () {
            return this.calls.length;
        };
        CallTracker.prototype.argsFor = function (index) {
            var call = this.calls[index];
            return call ? call.args : [];
        };
        
        CallTracker.prototype.all = function () {
            return this.calls;
        };
        CallTracker.prototype.allArgs = function () {
            return this.calls.map(function (call) { return call.args; });
        };
        CallTracker.prototype.first = function () {
            return this.calls[0];
        };
        CallTracker.prototype.mostRecent = function () {
            return this.calls[this.calls.length - 1];
        };
        CallTracker.prototype.reset = function () {
            this.calls = [];
        };
        CallTracker.prototype.saveArgumentsByValue = function () {
            this.opts.cloneArgs = true;
        };
        return CallTracker;
    }());
    var SpyStrategy = /** @class */ (function () {
        function SpyStrategy(options) {
            if (options === void 0) { options = {}; }
            this.options = options;
            this.identity = this.options.identity || 'unknown';
            this.originalFn = this.options.originalFn || function () { };
            this.options.getSpy = this.options.getSpy || function () { };
            this.plan = this._defaultPlan = this.options.plan || function () { };
            if (this.options.customStrategies) {
                var _loop_1 = function (k) {
                    if (this_1[k]) {
                        return "continue";
                    }
                    var factory = this_1.options.customStrategies[k];
                    this_1[k] = function () {
                        var plan = factory.apply(null, arguments);
                        this.plan = plan;
                        return this.getSpy();
                    };
                };
                var this_1 = this;
                for (var k in this.options.customStrategies) {
                    _loop_1(k);
                }
            }
        }
        SpyStrategy.prototype.exec = function (context, args) {
            return this.plan.apply(context, args);
        };
        SpyStrategy.prototype.getSpy = function () {
            return this.options.getSpy();
        };
        SpyStrategy.prototype.callThrough = function () {
            this.plan = this.originalFn;
            return this.getSpy();
        };
        SpyStrategy.prototype.returnValue = function (value) {
            this.plan = function () {
                return value;
            };
            return this.getSpy();
        };
        
        SpyStrategy.prototype.returnValues = function () {
            var values = Array.prototype.slice.call(arguments);
            this.plan = function () {
                return values.shift();
            };
            return this.getSpy();
        };
        
        SpyStrategy.prototype.throwError = function (something) {
            var error = (something instanceof Error) ? something : new Error(something);
            this.plan = function () {
                throw error;
            };
            return this.getSpy();
        };
        
        SpyStrategy.prototype.callFake = function (fn) {
            this.plan = fn;
            return this.getSpy();
        };
        
        SpyStrategy.prototype.stub = function (fn) {
            this.plan = function () { };
            return this.getSpy();
        };
        
        SpyStrategy.prototype.isConfigured = function () {
            return this.plan !== this._defaultPlan;
        };
        
        return SpyStrategy;
    }());
    var SpyStrategyDispatcher = /** @class */ (function () {
        function SpyStrategyDispatcher(args) {
            this.args = args;
            this.baseStrategy = new SpyStrategy(args);
            this.and = this.baseStrategy;
            this.strategyDict = new SpyStrategyDict(function () {
                return new SpyStrategy(args);
            });
            var self = this;
            this.withArgs = function () {
                return { and: self.strategyDict.getOrCreate(Array.prototype.slice.call(arguments)) };
            };
        }
        SpyStrategyDispatcher.prototype.updateArgs = function (newArgs) {
            if (newArgs.identity) {
                this.args.identity = newArgs.identity;
                this.baseStrategy.identity = newArgs.identity;
                this.and.identity = newArgs.identity;
            }
            if (newArgs.originalFn) {
                this.args.originalFn = newArgs.originalFn;
                this.baseStrategy.originalFn = newArgs.originalFn;
                this.and.originalFn = newArgs.originalFn;
            }
        };
        SpyStrategyDispatcher.prototype.exec = function (spy, args) {
            var strategy = this.strategyDict.get(args);
            if (!strategy) {
                strategy = this.baseStrategy;
            }
            return strategy.exec(spy, args);
        };
        return SpyStrategyDispatcher;
    }());
    var SpyStrategyDict = /** @class */ (function () {
        function SpyStrategyDict(strategyFactory) {
            this.strategyFactory = strategyFactory;
            this.strategies = [];
        }
        SpyStrategyDict.prototype.any = function () {
            return this.strategies.length > 0;
        };
        SpyStrategyDict.prototype.get = function (args) {
            for (var i = 0; i < this.strategies.length; i++) {
                var dictArgs = this.strategies[i].args;
                if (eq(dictArgs, args)) {
                    return this.strategies[i].strategy;
                }
            }
        };
        SpyStrategyDict.prototype.getOrCreate = function (args) {
            var strategy = this.get(args);
            if (!strategy) {
                strategy = this.strategyFactory();
                this.strategies.push({ args: args, strategy: strategy });
            }
            return strategy;
        };
        return SpyStrategyDict;
    }());
    function Spy(name, originalFn, customStrategies) {
        var calls = new CallTracker();
        var spyStrategyDispatcher = new SpyStrategyDispatcher({ identity: name, originalFn: originalFn, getSpy: function () { return wrapper; }, customStrategies: customStrategies });
        var spy = function () {
            var callContext = {
                object: this,
                invocationOrder: nextOrder(),
                args: Array.prototype.slice.call(arguments)
            };
            calls.track(callContext);
            var returnValue = spyStrategyDispatcher.exec(this, arguments);
            callContext.returnValue = returnValue;
            return returnValue;
        };
        var wrapper = function () {
            return spy.apply(this, arguments);
        };
        if (originalFn) {
            for (var prop in originalFn) {
                wrapper[prop] = originalFn[prop];
            }
        }
        wrapper.calls = calls;
        wrapper.and = spyStrategyDispatcher.and;
        wrapper.withArgs = function () {
            return spyStrategyDispatcher.withArgs.apply(spyStrategyDispatcher, arguments);
        };
        wrapper.updateArgs = function (newArgs) {
            spyStrategyDispatcher.updateArgs(newArgs);
        };
        return wrapper;
    }
    var SpyRegistry = /** @class */ (function () {
        function SpyRegistry() {
            this.registeredSpies = [];
        }
        SpyRegistry.prototype.register = function (spy, unRegister) {
            var currentTestInfo = Mocha.getCurrentTestInfo();
            this.registeredSpies.push({
                suite: currentTestInfo.suite,
                test: currentTestInfo.test,
                spy: spy,
                unRegister: unRegister
            });
        };
        SpyRegistry.prototype.clearAllSpies = function () {
            if (this.registeredSpies.length === 0) {
                return;
            }
            this.registeredSpies.forEach(function (spy) { return spy.unRegister(); });
            this.registeredSpies.length = 0;
        };
        SpyRegistry.prototype.clearSpies = function (testInfo) {
            if (this.registeredSpies.length === 0) {
                return;
            }
            var isSuite = false;
            if (testInfo instanceof Mocha.Suite) {
                isSuite = true;
            }
            for (var i = this.registeredSpies.length - 1; i--; i >= 0) {
                var registerSpy = this.registeredSpies[i];
                if ((isSuite && registerSpy.suite === testInfo) ||
                    (!isSuite && registerSpy.test === testInfo)) {
                    registerSpy.unRegister();
                    this.registeredSpies.splice(i, 1);
                }
            }
        };
        return SpyRegistry;
    }());
    var spyRegistry = new SpyRegistry();
    Mocha.clearSpies = function (testInfo) {
        spyRegistry.clearSpies(testInfo);
    };
    Mocha.clearAllSpies = function () {
        spyRegistry.clearAllSpies();
    };
    jasmine.createSpy = function (spyName, originalFn) {
        if (typeof spyName === 'function') {
            originalFn = spyName;
            spyName = spyName.name;
        }
        return Spy(spyName, originalFn);
    };
    jasmine.createSpyObj = function (baseName, methodNames) {
        if (typeof baseName !== 'string' && !methodNames) {
            methodNames = baseName;
            baseName = 'unknown';
        }
        var obj = {};
        if (Array.isArray(methodNames)) {
            methodNames.forEach(function (methodName) {
                obj[methodName] = jasmine.createSpy(baseName + '.' + methodName);
            });
        }
        else {
            for (var key in methodNames) {
                if (methodNames.hasOwnProperty(key)) {
                    obj[key] = jasmine.createSpy(baseName + '.' + key);
                    obj[key].and.returnValue(methodNames[key]);
                }
            }
        }
        return obj;
    };
    global['spyOn'] = jasmine.spyOn = function (obj, methodName) {
        if (!obj || !methodName || !obj[methodName]) {
            throw new Error("Can not find a valid object " + obj + " or a method name " + methodName + " to spy on.");
        }
        var originalMethod = obj[methodName];
        var spiedMethod = jasmine.createSpy(methodName, originalMethod);
        spyRegistry.register(spiedMethod, function () {
            obj[methodName] = originalMethod;
        });
        obj[methodName] = spiedMethod;
        return spiedMethod;
    };
    global['spyOnProperty'] =
        jasmine.spyOnProperty = function (obj, propertyName, accessType) {
            if (!obj || !propertyName || !obj[propertyName]) {
                throw new Error("Can not find a valid object " + obj + " or a property name " + propertyName + " to spy on.");
            }
            var originalDesc = Object.getOwnPropertyDescriptor(obj, propertyName);
            var originalAccess = originalDesc[accessType];
            var spiedAccess = jasmine.createSpy(propertyName, originalDesc[accessType]);
            spyRegistry.register(spiedAccess, function () {
                orientation[accessType] = originalAccess;
            });
            originalDesc[accessType] = spiedAccess;
            return spiedAccess;
        };
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Zone.__load_patch('jasmine2mocha', function (global) {
    if (typeof global.Mocha === 'undefined') {
        // not using mocha, just return
        return;
    }
    var jasmine = global['jasmine'];
    if (typeof jasmine !== 'undefined') {
        // jasmine already loaded, just return
        return;
    }
    // create a jasmine global object
    jasmine = global['jasmine'] = {};
    jasmine['__zone_symbol__isBridge'] = true;
    // BDD mapping
    mappingBDD(jasmine, global.Mocha, global);
    // Mocha don't have a built in assert implementation
    // add expect functionality
    addJasmineExpect(jasmine, global);
    // Mocha don't have a built in spy implementation
    // add spy functionality
    addJasmineSpy(jasmine, global.Mocha, global);
    // Add jasmine clock functionality
    addJasmineClock(jasmine, global);
    Object.defineProperty(jasmine, 'DEFAULT_TIMEOUT_INTERVAL', {
        configurable: true,
        enumerable: true,
        get: function () {
            return jasmine.__zone_symbol__TIMEOUT || 2000;
        },
        set: function (newValue) {
            jasmine.__zone_symbol__TIMEOUT = newValue;
            global.Mocha.__zone_symbol__TIMEOUT = newValue;
        }
    });
    jasmine.pp = function (obj) {
        return formatObject(obj);
    };
});

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function mappingBDD$1(jest, Mocha, global) {
    var mappings = [
        // other Jest APIs has already mapping in jasmine2mocha patch
        { jest: 'test', Mocha: 'it' }
    ];
    mappings.forEach(function (map) {
        if (!global[map.jest]) {
            var mocha = map.Mocha;
            var chains = mocha.split('.');
            var mochaMethod = null;
            for (var i = 0; i < chains.length; i++) {
                mochaMethod = mochaMethod ? mochaMethod[chains[i]] : global[chains[i]];
            }
            global[map.jest] = jest[map.jest] = mochaMethod;
        }
    });
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function addJestTimer(jest, global) {
    var _a = Zone[Zone.__symbol__('fakeAsyncTest')], resetFakeAsyncZone = _a.resetFakeAsyncZone, flushMicrotasks = _a.flushMicrotasks, discardPeriodicTasks = _a.discardPeriodicTasks, tick = _a.tick, flush = _a.flush, fakeAsync = _a.fakeAsync;
    var FakeAsyncTestZoneSpec = Zone['FakeAsyncTestZoneSpec'];
    var ProxyZoneSpec = Zone['ProxyZoneSpec'];
    function getFakeAsyncTestZoneSpec() {
        return Zone.current.get('FakeAsyncTestZoneSpec');
    }
    jest.clearAllTimers = function () {
        clearAllMacrotasks();
    };
    jest.runAllTimers = function () {
        var zs = getFakeAsyncTestZoneSpec();
        if (!zs) {
            return;
        }
        if (zs.pendingPeriodicTimers.length > 0) {
            throw new Error('Can not runAllTimers when having interval timers.');
        }
        // flush non-perodic-tasks with 10000 maxTurns
        flush(10000);
    };
    jest.runOnlyPendingTimers = function () {
        var zs = getFakeAsyncTestZoneSpec();
        if (!zs) {
            return;
        }
        // flush both periodic tasks and non-perodic-tasks
        flush(10000, true);
    };
    jest.advanceTimersByTime = function (msToRun, doTick) {
        var zs = getFakeAsyncTestZoneSpec();
        if (!zs) {
            return;
        }
        tick(msToRun, doTick);
    };
    jest.runAllTicks = function () {
        var zs = getFakeAsyncTestZoneSpec();
        if (!zs) {
            return;
        }
        flushMicrotasks();
    };
    jest.useFakeTimers = function () {
        var zs = getFakeAsyncTestZoneSpec();
        if (zs) {
            return;
        }
        /**
         * a wrapper of jasmine.clock().install()
         */
        global['__zone_symbol__originFakeAsyncPatchLock'] = global['__zone_symbol__fakeAsyncPatchLock'];
        global['__zone_symbol__fakeAsyncPatchLock'] = true;
        global.jasmine && global.jasmine.clock().install();
    };
    jest.useRealTimers = function () {
        global['__zone_symbol__fakeAsyncPatchLock'] = global['__zone_symbol__originFakeAsyncPatchLock'];
        global.jasmine && global.jasmine.clock().uninstall();
    };
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function expandExpect(global) {
    var jasmine = global.jasmine;
    var expect = global.expect;
    var Anything = /** @class */ (function () {
        function Anything() {
        }
        return Anything;
    }());
    expect.anything = function () {
        return new Anything();
    };
    expect.any = function (obj) {
        return new Any(obj);
    };
    var ArrayContaining = /** @class */ (function () {
        function ArrayContaining(expectedArray) {
            this.expectedArray = expectedArray;
        }
        return ArrayContaining;
    }());
    expect.arrayContaining = function (expectedArray) {
        return new ArrayContaining(expectedArray);
    };
    var ObjectContaining$$1 = /** @class */ (function () {
        function ObjectContaining$$1(expectedObject) {
            this.expectedObject = expectedObject;
        }
        return ObjectContaining$$1;
    }());
    expect.objectContaining = function (expectedObject) {
        return new ObjectContaining$$1(expectedObject);
    };
    var StringContaining = /** @class */ (function () {
        function StringContaining(expectedString) {
            this.expectedString = expectedString;
        }
        return StringContaining;
    }());
    expect.stringContaining = function (expectedString) {
        return new StringContaining(expectedString);
    };
    var StringMatching = /** @class */ (function () {
        function StringMatching(expectedMatcher) {
            this.expectedMatcher = expectedMatcher;
        }
        return StringMatching;
    }());
    expect.stringMatching = function (expectedMatcher) {
        return new StringMatching(expectedMatcher);
    };
    var assertions = expect.__zone_symbol__assertionsMap =
        [];
    jasmine.addCustomEqualityTester(function (a, b) {
        if (b instanceof Anything) {
            if (a === null || a === undefined) {
                return false;
            }
            return true;
        }
        if (b instanceof Any) {
            return b.eq(a);
        }
        if (b instanceof ArrayContaining && Array.isArray(a)) {
            for (var i = 0; i < b.expectedArray.length; i++) {
                var found = false;
                var bitem = b.expectedArray[i];
                for (var j = 0; j < a.length; j++) {
                    if (eq(a[j], bitem)) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return false;
                }
            }
            return true;
        }
        if (b instanceof ObjectContaining$$1) {
            Object.keys(b.expectedObject).forEach(function (key) {
                if (b.expectedObject.hasOwnProperty(key)) {
                    if (!eq(a[key], b.expectedObject[key]) || !toMatch(a[key], b.expectedObject[key])) {
                        return false;
                    }
                }
            });
            return true;
        }
        if (b instanceof StringContaining) {
            var astr = a;
            if (typeof a !== 'string') {
                astr = Object.prototype.toString.call(a);
            }
            if (!astr) {
                return false;
            }
            return astr.indexOf(b.expectedString) !== -1;
        }
        if (b instanceof StringMatching) {
            var astr = a;
            if (typeof a !== 'string') {
                astr = Object.prototype.toString.call(a);
            }
            return toMatch(astr, b.expectedMatcher);
        }
    });
    expect.extend = function (extendedMatchers) {
        var jasmineMatchers = {};
        Object.keys(extendedMatchers).forEach(function (key) {
            if (extendedMatchers.hasOwnProperty(key)) {
                var matcher_1 = extendedMatchers[key];
                jasmineMatchers[key] = function (util, customEqualityTester) {
                    return {
                        compare: function (actual, expected) {
                            return matcher_1(actual, expected);
                        }
                    };
                };
            }
        });
        jasmine.addMatchers(jasmineMatchers);
    };
    jasmine.addMatchers({
        toHaveBeenCalledTimes: function (util, customEqualityTester) {
            return {
                compare: function (actual, expected) {
                    return { pass: actual.calls.count() === expected };
                }
            };
        },
        lastCalledWith: function (util, customEqualityTester) {
            return {
                compare: function (actual, expected) {
                    return { pass: util.equals(actual.calls.last().args, expected) };
                }
            };
        },
        toHaveBeenLastCalledWith: function (util, customEqualityTester) {
            return {
                compare: function (actual, expected) {
                    return { pass: util.equals(actual.calls.last().args, expected) };
                }
            };
        },
        toBeInstanceOf: function (util, customEqualityTester) {
            return {
                compare: function (actual, expected) {
                    return { pass: actual instanceof expected };
                }
            };
        },
        toContainEqual: function (util, customEqualityTester) {
            return {
                compare: function (actual, expected) {
                    if (!Array.isArray(actual)) {
                        return { pass: false };
                    }
                    return { pass: actual.filter(function (a) { return util.equals(a, expected); }).length > 0 };
                }
            };
        },
        toHaveLength: function (util, customEqualityTester) {
            return {
                compare: function (actual, expected) {
                    return { pass: actual.length === expected };
                }
            };
        },
        toHaveProperty: function (util, customEqualityTester) {
            return {
                compare: function (actual, expected, expectedValue) {
                    var split = Array.isArray(expected) ? expected : expected.split('.');
                    var value = null;
                    var hasKey = false;
                    var _loop_1 = function (i) {
                        var prop = split[i];
                        var isIndex = typeof prop === 'number';
                        if (value) {
                            hasKey = isIndex ? Array.isArray(value) && value.length > prop :
                                Object.keys(value).filter(function (a) { return util.equals(a, prop); }).length > 0;
                            value = value[prop];
                        }
                        else {
                            hasKey = isIndex ? Array.isArray(actual) && actual.length > prop :
                                Object.keys(actual).filter(function (a) { return util.equals(a, prop); }).length > 0;
                            value = actual[prop];
                        }
                        if (!hasKey) {
                            return { value: { pass: false } };
                        }
                    };
                    for (var i = 0; i < split.length; i++) {
                        var state_1 = _loop_1(i);
                        if (typeof state_1 === "object")
                            return state_1.value;
                    }
                    if (expectedValue !== undefined) {
                        return { pass: util.equals(expectedValue, value) };
                    }
                    else {
                        return { pass: true };
                    }
                }
            };
        },
        toMatchObject: function (util, customEqualityTester) {
            return {
                compare: function (actual, expected) {
                    Object.keys(expected).forEach(function (key) {
                        if (expected.hasOwnProperty(key)) {
                            if (!util.equals(actual[key], expected[key]) &&
                                !util.toMatch(actual[key], expected[key])) {
                                return { pass: false };
                            }
                        }
                    });
                    return { pass: true };
                }
            };
        },
    });
    expect.assertions = function (numbers) {
        if (typeof numbers !== 'number') {
            return;
        }
        var currentTest = global.Mocha.__zone_symbol__test;
        assertions.push({ test: currentTest, numbers: numbers });
    };
    expect.hasAssertions = function () {
        var currentTest = global.Mocha.__zone_symbol__test;
        assertions.push({ test: currentTest, numbers: 1 });
    };
    if (!global.Mocha.__zone_symbol__afterEach) {
        global.Mocha.__zone_symbol__afterEach = [];
    }
    global.Mocha.__zone_symbol__afterEach.push(function (test) {
        // check assertions
        for (var i = 0; i < assertions.length; i++) {
            var ass = assertions[i];
            if (ass.test === test) {
                assertions.splice(i, 1);
                var actual = jasmine.__zone_symbol__expect_assertions;
                jasmine.__zone_symbol__expect_assertions = 0;
                if (ass.numbers != actual) {
                    throw new Error("Assertions failed, expect should be called " + ass.numbers + " times, it was actual called " + actual + " times.");
                }
                return;
            }
        }
    });
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function mappingSpy(jest, jasmine, global) {
    jest.__zone_symbol__mocks = [];
    function createSpy(spyFactory, implFn) {
        var spy = spyFactory(implFn);
        spy.defaultFn = implFn;
        var instances = [];
        var mockFn = function MockFn() {
            if (this instanceof MockFn) {
                instances.push(this);
            }
            else {
                var fn = spy.defaultFn;
                if (spy.onceFns && spy.onceFns.length > 0) {
                    fn = spy.onceFns.shift();
                }
                var args = Array.prototype.slice.call(arguments);
                if (fn) {
                    return spy.and.callFake(fn).apply(this, args);
                }
                else {
                    return spy.and.callThrough().apply(this, args);
                }
            }
        };
        mockFn.getMockName = function () {
            return spy.mockName || 'jestSpy';
        };
        mockFn.mockName = function (name) {
            spy.updateArgs({ identity: name });
            spy.mockName = name;
            return this;
        };
        mockFn.mock = { instances: instances };
        Object.defineProperty(mockFn.mock, 'calls', {
            configurable: true,
            enumerable: true,
            get: function () {
                return spy.calls.allArgs();
            }
        });
        Object.defineProperty(mockFn, 'calls', {
            configurable: true,
            enumerable: true,
            get: function () {
                return spy.calls;
            }
        });
        mockFn.mockClear = function () {
            spy.calls.length = 0;
            instances.length = 0;
            return this;
        };
        mockFn.mockReset = function () {
            spy.calls.length = 0;
            instances.length = 0;
            return this;
        };
        mockFn.mockImplementation = function (fn) {
            spy.defaultFn = fn;
            return this;
        };
        mockFn.mockImplementationOnce = function (fn) {
            if (!spy.onceFns) {
                spy.onceFns = [];
            }
            spy.onceFns.push(fn);
            return this;
        };
        mockFn.mockReturnThis = function () {
            return mockFn.mockImplementation(function () {
                return this;
            });
        };
        mockFn.mockReturnValue = function (value) {
            return mockFn.mockImplementation(function () {
                return value;
            });
        };
        mockFn.mockReturnValueOnce = function (value) {
            return mockFn.mockImplementationOnce(function () {
                return value;
            });
        };
        mockFn.mockResolvedValue = function (value) {
            return mockFn.mockReturnValue(Promise.resolve(value));
        };
        mockFn.mockResolvedValueOnce = function (value) {
            return mockFn.mockReturnValueOnce(Promise.resolve(value));
        };
        mockFn.mockRejectedValue = function (value) {
            return mockFn.mockReturnValue(Promise.reject(value));
        };
        mockFn.mockRejectedValueOnce = function (value) {
            return mockFn.mockReturnValueOnce(Promise.reject(value));
        };
        mockFn.mockRestore = function () {
            global.Mocha.clearSpies(global.Mocha.__zone_symbol__current_ctx);
        };
        jest.__zone_symbol__mocks.push(mockFn);
        return mockFn;
    }
    jest.fn = function (implFn) {
        return createSpy(function (implFn) { return jasmine.createSpy('jestSpy', implFn); }, implFn);
    };
    jest.spyOn = function (obj, methodName, accessType) {
        return accessType ? createSpy(function () { return global['spyOnProperty'](obj, methodName, accessType); }) :
            createSpy(function () { return global['spyOn'](obj, methodName); });
    };
    jest.clearAllMocks = function () {
        jest.__zone_symbol__mocks.forEach(function (mock) {
            mock.mockClear();
        });
        return jest;
    };
    jest.resetAllMocks = function () {
        jest.__zone_symbol__mocks.forEach(function (mock) {
            mock.mockReset();
        });
        return jest;
    };
    jest.restoreAllMocks = function () {
        global.Mocha.clearAllSpies();
        return jest;
    };
    jest.isMockFunction = function (fn) {
        return jest.__zone_symbol__mocks.filter(function (m) { return m === fn; }).length > 0;
    };
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Zone.__load_patch('jest2mocha', function (global) {
    var jest = global['jest'];
    if (typeof jest !== 'undefined') {
        // jasmine already loaded, just return
        return;
    }
    // TODO: @JiaLiPassion, now we only support jest in Mocha runner
    // support jasmine later.
    if (!global.Mocha || global.Mocha['__zone_symbol__isBridge']) {
        return;
    }
    if (global.jasmine && !global.jasmine['__zone_symbol__isBridge']) {
        // real jasmine is loaded
        return;
    }
    // create a jasmine global object
    jest = global['jest'] = {};
    jest['__zone_symbol__isBridge'] = true;
    // BDD mapping
    mappingBDD$1(jest, global.Mocha, global);
    expandExpect(global);
    mappingSpy(jest, jasmine, global);
    addJestTimer(jest, global);
    jest.setTimeout = function (timeout) {
        var ctx = global.Mocha.__zone_symbol__current_ctx;
        if (ctx && typeof ctx.timeout === 'function') {
            ctx.timeout(timeout);
        }
    };
});

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

})));
