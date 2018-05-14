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
/**
 * @fileoverview
 * @suppress {globalThis}
 */
var NEWLINE = '\n';
var IGNORE_FRAMES = {};
var creationTrace = '__creationTrace__';
var ERROR_TAG = 'STACKTRACE TRACKING';
var SEP_TAG = '__SEP_TAG__';
var sepTemplate = SEP_TAG + '@[native]';
var LongStackTrace = /** @class */ (function () {
    function LongStackTrace() {
        this.error = getStacktrace();
        this.timestamp = new Date();
    }
    return LongStackTrace;
}());
function getStacktraceWithUncaughtError() {
    return new Error(ERROR_TAG);
}
function getStacktraceWithCaughtError() {
    try {
        throw getStacktraceWithUncaughtError();
    }
    catch (err) {
        return err;
    }
}
// Some implementations of exception handling don't create a stack trace if the exception
// isn't thrown, however it's faster not to actually throw the exception.
var error = getStacktraceWithUncaughtError();
var caughtError = getStacktraceWithCaughtError();
var getStacktrace = error.stack ?
    getStacktraceWithUncaughtError :
    (caughtError.stack ? getStacktraceWithCaughtError : getStacktraceWithUncaughtError);
function getFrames(error) {
    return error.stack ? error.stack.split(NEWLINE) : [];
}
function addErrorStack(lines, error) {
    var trace = getFrames(error);
    for (var i = 0; i < trace.length; i++) {
        var frame = trace[i];
        // Filter out the Frames which are part of stack capturing.
        if (!IGNORE_FRAMES.hasOwnProperty(frame)) {
            lines.push(trace[i]);
        }
    }
}
function renderLongStackTrace(frames, stack) {
    var longTrace = [stack ? stack.trim() : ''];
    if (frames) {
        var timestamp = new Date().getTime();
        for (var i = 0; i < frames.length; i++) {
            var traceFrames = frames[i];
            var lastTime = traceFrames.timestamp;
            var separator = "____________________Elapsed " + (timestamp - lastTime.getTime()) + " ms; At: " + lastTime;
            separator = separator.replace(/[^\w\d]/g, '_');
            longTrace.push(sepTemplate.replace(SEP_TAG, separator));
            addErrorStack(longTrace, traceFrames.error);
            timestamp = lastTime.getTime();
        }
    }
    return longTrace.join(NEWLINE);
}
Zone['longStackTraceZoneSpec'] = {
    name: 'long-stack-trace',
    longStackTraceLimit: 10,
    // add a getLongStackTrace method in spec to
    // handle handled reject promise error.
    getLongStackTrace: function (error) {
        if (!error) {
            return undefined;
        }
        var trace = error[Zone.__symbol__('currentTaskTrace')];
        if (!trace) {
            return error.stack;
        }
        return renderLongStackTrace(trace, error.stack);
    },
    onScheduleTask: function (parentZoneDelegate, currentZone, targetZone, task) {
        if (Error.stackTraceLimit > 0) {
            // if Error.stackTraceLimit is 0, means stack trace
            // is disabled, so we don't need to generate long stack trace
            // this will improve performance in some test(some test will
            // set stackTraceLimit to 0, https://github.com/angular/zone.js/issues/698
            var currentTask = Zone.currentTask;
            var trace = currentTask && currentTask.data && currentTask.data[creationTrace] || [];
            trace = [new LongStackTrace()].concat(trace);
            if (trace.length > this.longStackTraceLimit) {
                trace.length = this.longStackTraceLimit;
            }
            if (!task.data)
                task.data = {};
            task.data[creationTrace] = trace;
        }
        return parentZoneDelegate.scheduleTask(targetZone, task);
    },
    onHandleError: function (parentZoneDelegate, currentZone, targetZone, error) {
        if (Error.stackTraceLimit > 0) {
            // if Error.stackTraceLimit is 0, means stack trace
            // is disabled, so we don't need to generate long stack trace
            // this will improve performance in some test(some test will
            // set stackTraceLimit to 0, https://github.com/angular/zone.js/issues/698
            var parentTask = Zone.currentTask || error.task;
            if (error instanceof Error && parentTask) {
                var longStack = renderLongStackTrace(parentTask.data && parentTask.data[creationTrace], error.stack);
                try {
                    error.stack = error.longStack = longStack;
                }
                catch (err) {
                }
            }
        }
        return parentZoneDelegate.handleError(targetZone, error);
    }
};
function captureStackTraces(stackTraces, count) {
    if (count > 0) {
        stackTraces.push(getFrames((new LongStackTrace()).error));
        captureStackTraces(stackTraces, count - 1);
    }
}
function computeIgnoreFrames() {
    if (Error.stackTraceLimit <= 0) {
        return;
    }
    var frames = [];
    captureStackTraces(frames, 2);
    var frames1 = frames[0];
    var frames2 = frames[1];
    for (var i = 0; i < frames1.length; i++) {
        var frame1 = frames1[i];
        if (frame1.indexOf(ERROR_TAG) == -1) {
            var match = frame1.match(/^\s*at\s+/);
            if (match) {
                sepTemplate = match[0] + SEP_TAG + ' (http://localhost)';
                break;
            }
        }
    }
    for (var i = 0; i < frames1.length; i++) {
        var frame1 = frames1[i];
        var frame2 = frames2[i];
        if (frame1 === frame2) {
            IGNORE_FRAMES[frame1] = true;
        }
        else {
            break;
        }
    }
}
computeIgnoreFrames();

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var ProxyZoneSpec = /** @class */ (function () {
    function ProxyZoneSpec(defaultSpecDelegate) {
        if (defaultSpecDelegate === void 0) { defaultSpecDelegate = null; }
        this.defaultSpecDelegate = defaultSpecDelegate;
        this.name = 'ProxyZone';
        this.properties = { 'ProxyZoneSpec': this };
        this.propertyKeys = null;
        this.lastTaskState = null;
        this.isNeedToTriggerHasTask = false;
        this.tasks = [];
        this.setDelegate(defaultSpecDelegate);
    }
    ProxyZoneSpec.get = function () {
        return Zone.current.get('ProxyZoneSpec');
    };
    ProxyZoneSpec.isLoaded = function () {
        return ProxyZoneSpec.get() instanceof ProxyZoneSpec;
    };
    ProxyZoneSpec.assertPresent = function () {
        if (!ProxyZoneSpec.isLoaded()) {
            throw new Error("Expected to be running in 'ProxyZone', but it was not found.");
        }
        return ProxyZoneSpec.get();
    };
    ProxyZoneSpec.prototype.setDelegate = function (delegateSpec) {
        var _this = this;
        var isNewDelegate = this._delegateSpec !== delegateSpec;
        this._delegateSpec = delegateSpec;
        this.propertyKeys && this.propertyKeys.forEach(function (key) { return delete _this.properties[key]; });
        this.propertyKeys = null;
        if (delegateSpec && delegateSpec.properties) {
            this.propertyKeys = Object.keys(delegateSpec.properties);
            this.propertyKeys.forEach(function (k) { return _this.properties[k] = delegateSpec.properties[k]; });
        }
        // if set a new delegateSpec, shoulde check whether need to
        // trigger hasTask or not
        if (isNewDelegate && this.lastTaskState &&
            (this.lastTaskState.macroTask || this.lastTaskState.microTask)) {
            this.isNeedToTriggerHasTask = true;
        }
    };
    ProxyZoneSpec.prototype.getDelegate = function () {
        return this._delegateSpec;
    };
    ProxyZoneSpec.prototype.resetDelegate = function () {
        var delegateSpec = this.getDelegate();
        this.setDelegate(this.defaultSpecDelegate);
    };
    ProxyZoneSpec.prototype.tryTriggerHasTask = function (parentZoneDelegate, currentZone, targetZone) {
        if (this.isNeedToTriggerHasTask && this.lastTaskState) {
            // last delegateSpec has microTask or macroTask
            // should call onHasTask in current delegateSpec
            this.isNeedToTriggerHasTask = false;
            this.onHasTask(parentZoneDelegate, currentZone, targetZone, this.lastTaskState);
        }
    };
    ProxyZoneSpec.prototype.removeFromTasks = function (task) {
        if (!this.tasks) {
            return;
        }
        for (var i = 0; i < this.tasks.length; i++) {
            if (this.tasks[i] === task) {
                this.tasks.splice(i, 1);
                return;
            }
        }
    };
    ProxyZoneSpec.prototype.getAndClearPendingTasksInfo = function () {
        if (this.tasks.length === 0) {
            return '';
        }
        var taskInfo = this.tasks.map(function (task) {
            var dataInfo = task.data &&
                Object.keys(task.data)
                    .map(function (key) {
                    return key + ':' + task.data[key];
                })
                    .join(',');
            return "type: " + task.type + ", source: " + task.source + ", args: {" + dataInfo + "}";
        });
        var pendingTasksInfo = '--Pendng async tasks are: [' + taskInfo + ']';
        // clear tasks
        this.tasks = [];
        return pendingTasksInfo;
    };
    ProxyZoneSpec.prototype.onFork = function (parentZoneDelegate, currentZone, targetZone, zoneSpec) {
        if (this._delegateSpec && this._delegateSpec.onFork) {
            return this._delegateSpec.onFork(parentZoneDelegate, currentZone, targetZone, zoneSpec);
        }
        else {
            return parentZoneDelegate.fork(targetZone, zoneSpec);
        }
    };
    ProxyZoneSpec.prototype.onIntercept = function (parentZoneDelegate, currentZone, targetZone, delegate, source) {
        if (this._delegateSpec && this._delegateSpec.onIntercept) {
            return this._delegateSpec.onIntercept(parentZoneDelegate, currentZone, targetZone, delegate, source);
        }
        else {
            return parentZoneDelegate.intercept(targetZone, delegate, source);
        }
    };
    ProxyZoneSpec.prototype.onInvoke = function (parentZoneDelegate, currentZone, targetZone, delegate, applyThis, applyArgs, source) {
        this.tryTriggerHasTask(parentZoneDelegate, currentZone, targetZone);
        if (this._delegateSpec && this._delegateSpec.onInvoke) {
            return this._delegateSpec.onInvoke(parentZoneDelegate, currentZone, targetZone, delegate, applyThis, applyArgs, source);
        }
        else {
            return parentZoneDelegate.invoke(targetZone, delegate, applyThis, applyArgs, source);
        }
    };
    ProxyZoneSpec.prototype.onHandleError = function (parentZoneDelegate, currentZone, targetZone, error) {
        if (this._delegateSpec && this._delegateSpec.onHandleError) {
            return this._delegateSpec.onHandleError(parentZoneDelegate, currentZone, targetZone, error);
        }
        else {
            return parentZoneDelegate.handleError(targetZone, error);
        }
    };
    ProxyZoneSpec.prototype.onScheduleTask = function (parentZoneDelegate, currentZone, targetZone, task) {
        if (task.type !== 'eventTask') {
            this.tasks.push(task);
        }
        if (this._delegateSpec && this._delegateSpec.onScheduleTask) {
            return this._delegateSpec.onScheduleTask(parentZoneDelegate, currentZone, targetZone, task);
        }
        else {
            return parentZoneDelegate.scheduleTask(targetZone, task);
        }
    };
    ProxyZoneSpec.prototype.onInvokeTask = function (parentZoneDelegate, currentZone, targetZone, task, applyThis, applyArgs) {
        if (task.type !== 'eventTask') {
            this.removeFromTasks(task);
        }
        this.tryTriggerHasTask(parentZoneDelegate, currentZone, targetZone);
        if (this._delegateSpec && this._delegateSpec.onInvokeTask) {
            return this._delegateSpec.onInvokeTask(parentZoneDelegate, currentZone, targetZone, task, applyThis, applyArgs);
        }
        else {
            return parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs);
        }
    };
    ProxyZoneSpec.prototype.onCancelTask = function (parentZoneDelegate, currentZone, targetZone, task) {
        if (task.type !== 'eventTask') {
            this.removeFromTasks(task);
        }
        this.tryTriggerHasTask(parentZoneDelegate, currentZone, targetZone);
        if (this._delegateSpec && this._delegateSpec.onCancelTask) {
            return this._delegateSpec.onCancelTask(parentZoneDelegate, currentZone, targetZone, task);
        }
        else {
            return parentZoneDelegate.cancelTask(targetZone, task);
        }
    };
    ProxyZoneSpec.prototype.onHasTask = function (delegate, current, target, hasTaskState) {
        this.lastTaskState = hasTaskState;
        if (this._delegateSpec && this._delegateSpec.onHasTask) {
            this._delegateSpec.onHasTask(delegate, current, target, hasTaskState);
        }
        else {
            delegate.hasTask(target, hasTaskState);
        }
    };
    return ProxyZoneSpec;
}());
// Export the class so that new instances can be created with proper
// constructor params.
Zone['ProxyZoneSpec'] = ProxyZoneSpec;

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var SyncTestZoneSpec = /** @class */ (function () {
    function SyncTestZoneSpec(namePrefix) {
        this.runZone = Zone.current;
        this.name = 'syncTestZone for ' + namePrefix;
    }
    SyncTestZoneSpec.prototype.onScheduleTask = function (delegate, current, target, task) {
        switch (task.type) {
            case 'microTask':
            case 'macroTask':
                throw new Error("Cannot call " + task.source + " from within a sync test.");
            case 'eventTask':
                task = delegate.scheduleTask(target, task);
                break;
        }
        return task;
    };
    return SyncTestZoneSpec;
}());
// Export the class so that new instances can be created with proper
// constructor params.
Zone['SyncTestZoneSpec'] = SyncTestZoneSpec;

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var _global = typeof window !== 'undefined' && window || typeof self !== 'undefined' && self || global;
var AsyncTestZoneSpec = /** @class */ (function () {
    function AsyncTestZoneSpec(finishCallback, failCallback, namePrefix) {
        this.finishCallback = finishCallback;
        this.failCallback = failCallback;
        this._pendingMicroTasks = false;
        this._pendingMacroTasks = false;
        this._alreadyErrored = false;
        this._isSync = false;
        this.runZone = Zone.current;
        this.unresolvedChainedPromiseCount = 0;
        this.supportWaitUnresolvedChainedPromise = false;
        this.name = 'asyncTestZone for ' + namePrefix;
        this.properties = { 'AsyncTestZoneSpec': this };
        this.supportWaitUnresolvedChainedPromise =
            _global[Zone.__symbol__('supportWaitUnResolvedChainedPromise')] === true;
    }
    AsyncTestZoneSpec.prototype.isUnresolvedChainedPromisePending = function () {
        return this.unresolvedChainedPromiseCount > 0;
    };
    AsyncTestZoneSpec.prototype._finishCallbackIfDone = function () {
        var _this = this;
        if (!(this._pendingMicroTasks || this._pendingMacroTasks ||
            (this.supportWaitUnresolvedChainedPromise && this.isUnresolvedChainedPromisePending()))) {
            // We do this because we would like to catch unhandled rejected promises.
            this.runZone.run(function () {
                setTimeout(function () {
                    if (!_this._alreadyErrored && !(_this._pendingMicroTasks || _this._pendingMacroTasks)) {
                        _this.finishCallback();
                    }
                }, 0);
            });
        }
    };
    AsyncTestZoneSpec.prototype.patchPromiseForTest = function () {
        if (!this.supportWaitUnresolvedChainedPromise) {
            return;
        }
        var patchPromiseForTest = Promise[Zone.__symbol__('patchPromiseForTest')];
        if (patchPromiseForTest) {
            patchPromiseForTest();
        }
    };
    AsyncTestZoneSpec.prototype.unPatchPromiseForTest = function () {
        if (!this.supportWaitUnresolvedChainedPromise) {
            return;
        }
        var unPatchPromiseForTest = Promise[Zone.__symbol__('unPatchPromiseForTest')];
        if (unPatchPromiseForTest) {
            unPatchPromiseForTest();
        }
    };
    AsyncTestZoneSpec.prototype.onScheduleTask = function (delegate, current, target, task) {
        if (task.type !== 'eventTask') {
            this._isSync = false;
        }
        if (task.type === 'microTask' && task.data && task.data instanceof Promise) {
            // check whether the promise is a chained promise
            if (task.data[AsyncTestZoneSpec.symbolParentUnresolved] === true) {
                // chained promise is being scheduled
                this.unresolvedChainedPromiseCount--;
            }
        }
        return delegate.scheduleTask(target, task);
    };
    AsyncTestZoneSpec.prototype.onInvokeTask = function (delegate, current, target, task, applyThis, applyArgs) {
        if (task.type !== 'eventTask') {
            this._isSync = false;
        }
        return delegate.invokeTask(target, task, applyThis, applyArgs);
    };
    AsyncTestZoneSpec.prototype.onCancelTask = function (delegate, current, target, task) {
        if (task.type !== 'eventTask') {
            this._isSync = false;
        }
        return delegate.cancelTask(target, task);
    };
    // Note - we need to use onInvoke at the moment to call finish when a test is
    // fully synchronous. TODO(juliemr): remove this when the logic for
    // onHasTask changes and it calls whenever the task queues are dirty.
    // updated by(JiaLiPassion), only call finish callback when no task
    // was scheduled/invoked/canceled.
    AsyncTestZoneSpec.prototype.onInvoke = function (parentZoneDelegate, currentZone, targetZone, delegate, applyThis, applyArgs, source) {
        try {
            this._isSync = true;
            return parentZoneDelegate.invoke(targetZone, delegate, applyThis, applyArgs, source);
        }
        finally {
            var afterTaskCounts = parentZoneDelegate._taskCounts;
            if (this._isSync) {
                this._finishCallbackIfDone();
            }
        }
    };
    AsyncTestZoneSpec.prototype.onHandleError = function (parentZoneDelegate, currentZone, targetZone, error) {
        // Let the parent try to handle the error.
        var result = parentZoneDelegate.handleError(targetZone, error);
        if (result) {
            this.failCallback(error);
            this._alreadyErrored = true;
        }
        return false;
    };
    AsyncTestZoneSpec.prototype.onHasTask = function (delegate, current, target, hasTaskState) {
        delegate.hasTask(target, hasTaskState);
        if (hasTaskState.change == 'microTask') {
            this._pendingMicroTasks = hasTaskState.microTask;
            this._finishCallbackIfDone();
        }
        else if (hasTaskState.change == 'macroTask') {
            this._pendingMacroTasks = hasTaskState.macroTask;
            this._finishCallbackIfDone();
        }
    };
    AsyncTestZoneSpec.symbolParentUnresolved = Zone.__symbol__('parentUnresolved');
    return AsyncTestZoneSpec;
}());
// Export the class so that new instances can be created with proper
// constructor params.
Zone['AsyncTestZoneSpec'] = AsyncTestZoneSpec;

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Zone.__load_patch('asynctest', function (global, Zone, api) {
    /**
     * Wraps a test function in an asynchronous test zone. The test will automatically
     * complete when all asynchronous calls within this zone are done.
     */
    global['asyncTest'] = Zone[api.symbol('asyncTest')] = function asyncTest(fn) {
        // If we're running using the Jasmine test framework, adapt to call the 'done'
        // function when asynchronous activity is finished.
        if (global.jasmine) {
            // Not using an arrow function to preserve context passed from call site
            return function (done) {
                if (!done) {
                    // if we run beforeEach in @angular/core/testing/testing_internal then we get no done
                    // fake it here and assume sync.
                    done = function () { };
                    done.fail = function (e) {
                        throw e;
                    };
                }
                runInTestZone(fn, this, done, function (err) {
                    if (typeof err === 'string') {
                        return done.fail(new Error(err));
                    }
                    else {
                        done.fail(err);
                    }
                });
            };
        }
        // Otherwise, return a promise which will resolve when asynchronous activity
        // is finished. This will be correctly consumed by the Mocha framework with
        // it('...', async(myFn)); or can be used in a custom framework.
        // Not using an arrow function to preserve context passed from call site
        return function () {
            var _this = this;
            return new Promise(function (finishCallback, failCallback) {
                runInTestZone(fn, _this, finishCallback, failCallback);
            });
        };
    };
    function runInTestZone(fn, context, finishCallback, failCallback) {
        var currentZone = Zone.current;
        var AsyncTestZoneSpec = Zone['AsyncTestZoneSpec'];
        if (AsyncTestZoneSpec === undefined) {
            throw new Error('AsyncTestZoneSpec is needed for the async() test helper but could not be found. ' +
                'Please make sure that your environment includes zone.js/dist/async-test.js');
        }
        var ProxyZoneSpec = Zone['ProxyZoneSpec'];
        if (ProxyZoneSpec === undefined) {
            throw new Error('ProxyZoneSpec is needed for the async() test helper but could not be found. ' +
                'Please make sure that your environment includes zone.js/dist/proxy.js');
        }
        var proxyZoneSpec = ProxyZoneSpec.get();
        ProxyZoneSpec.assertPresent();
        // We need to create the AsyncTestZoneSpec outside the ProxyZone.
        // If we do it in ProxyZone then we will get to infinite recursion.
        var proxyZone = Zone.current.getZoneWith('ProxyZoneSpec');
        var previousDelegate = proxyZoneSpec.getDelegate();
        proxyZone.parent.run(function () {
            var testZoneSpec = new AsyncTestZoneSpec(function () {
                // Need to restore the original zone.
                if (proxyZoneSpec.getDelegate() == testZoneSpec) {
                    // Only reset the zone spec if it's
                    // sill this one. Otherwise, assume
                    // it's OK.
                    proxyZoneSpec.setDelegate(previousDelegate);
                }
                testZoneSpec.unPatchPromiseForTest();
                currentZone.run(function () {
                    finishCallback();
                });
            }, function (error) {
                // Need to restore the original zone.
                if (proxyZoneSpec.getDelegate() == testZoneSpec) {
                    // Only reset the zone spec if it's sill this one. Otherwise, assume it's OK.
                    proxyZoneSpec.setDelegate(previousDelegate);
                }
                testZoneSpec.unPatchPromiseForTest();
                currentZone.run(function () {
                    failCallback(error);
                });
            }, 'test');
            proxyZoneSpec.setDelegate(testZoneSpec);
            testZoneSpec.patchPromiseForTest();
        });
        return Zone.current.runGuarded(fn, context);
    }
});

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
(function (global) {
    var OriginalDate = global.Date;
    var FakeDate = /** @class */ (function () {
        function FakeDate() {
            if (arguments.length === 0) {
                var d = new OriginalDate();
                d.setTime(FakeDate.now());
                return d;
            }
            else {
                var args = Array.prototype.slice.call(arguments);
                return new (OriginalDate.bind.apply(OriginalDate, __spread([void 0], args)))();
            }
        }
        FakeDate.now = function () {
            var fakeAsyncTestZoneSpec = Zone.current.get('FakeAsyncTestZoneSpec');
            if (fakeAsyncTestZoneSpec) {
                return fakeAsyncTestZoneSpec.getCurrentRealTime() + fakeAsyncTestZoneSpec.getCurrentTime();
            }
            return OriginalDate.now.apply(this, arguments);
        };
        return FakeDate;
    }());
    FakeDate.UTC = OriginalDate.UTC;
    FakeDate.parse = OriginalDate.parse;
    // keep a reference for zone patched timer function
    var timers = {
        setTimeout: global.setTimeout,
        setInterval: global.setInterval,
        clearTimeout: global.clearTimeout,
        clearInterval: global.clearInterval
    };
    var Scheduler = /** @class */ (function () {
        function Scheduler() {
            // Next scheduler id.
            this.nextId = 1;
            // Scheduler queue with the tuple of end time and callback function - sorted by end time.
            this._schedulerQueue = [];
            // Current simulated time in millis.
            this._currentTime = 0;
            // Current real time in millis.
            this._currentRealTime = OriginalDate.now();
        }
        Scheduler.prototype.getCurrentTime = function () {
            return this._currentTime;
        };
        Scheduler.prototype.getCurrentRealTime = function () {
            return this._currentRealTime;
        };
        Scheduler.prototype.setCurrentRealTime = function (realTime) {
            this._currentRealTime = realTime;
        };
        Scheduler.prototype.scheduleFunction = function (cb, delay, args, isPeriodic, isRequestAnimationFrame, id) {
            if (args === void 0) { args = []; }
            if (isPeriodic === void 0) { isPeriodic = false; }
            if (isRequestAnimationFrame === void 0) { isRequestAnimationFrame = false; }
            if (id === void 0) { id = -1; }
            var currentId = id < 0 ? this.nextId++ : id;
            var endTime = this._currentTime + delay;
            // Insert so that scheduler queue remains sorted by end time.
            var newEntry = {
                endTime: endTime,
                id: currentId,
                func: cb,
                args: args,
                delay: delay,
                isPeriodic: isPeriodic,
                isRequestAnimationFrame: isRequestAnimationFrame
            };
            var i = 0;
            for (; i < this._schedulerQueue.length; i++) {
                var currentEntry = this._schedulerQueue[i];
                if (newEntry.endTime < currentEntry.endTime) {
                    break;
                }
            }
            this._schedulerQueue.splice(i, 0, newEntry);
            return currentId;
        };
        Scheduler.prototype.removeScheduledFunctionWithId = function (id) {
            for (var i = 0; i < this._schedulerQueue.length; i++) {
                if (this._schedulerQueue[i].id == id) {
                    this._schedulerQueue.splice(i, 1);
                    break;
                }
            }
        };
        Scheduler.prototype.tick = function (millis, doTick) {
            if (millis === void 0) { millis = 0; }
            var finalTime = this._currentTime + millis;
            var lastCurrentTime = 0;
            if (this._schedulerQueue.length === 0 && doTick) {
                doTick(millis);
                return;
            }
            while (this._schedulerQueue.length > 0) {
                var current = this._schedulerQueue[0];
                if (finalTime < current.endTime) {
                    // Done processing the queue since it's sorted by endTime.
                    break;
                }
                else {
                    // Time to run scheduled function. Remove it from the head of queue.
                    var current_1 = this._schedulerQueue.shift();
                    lastCurrentTime = this._currentTime;
                    this._currentTime = current_1.endTime;
                    if (doTick) {
                        doTick(this._currentTime - lastCurrentTime);
                    }
                    var retval = current_1.func.apply(global, current_1.args);
                    if (!retval) {
                        // Uncaught exception in the current scheduled function. Stop processing the queue.
                        break;
                    }
                }
            }
            this._currentTime = finalTime;
        };
        Scheduler.prototype.flush = function (limit, flushPeriodic, doTick) {
            if (limit === void 0) { limit = 20; }
            if (flushPeriodic === void 0) { flushPeriodic = false; }
            if (flushPeriodic) {
                return this.flushPeriodic(doTick);
            }
            else {
                return this.flushNonPeriodic(limit, doTick);
            }
        };
        Scheduler.prototype.flushPeriodic = function (doTick) {
            if (this._schedulerQueue.length === 0) {
                return 0;
            }
            // Find the last task currently queued in the scheduler queue and tick
            // till that time.
            var startTime = this._currentTime;
            var lastTask = this._schedulerQueue[this._schedulerQueue.length - 1];
            this.tick(lastTask.endTime - startTime, doTick);
            return this._currentTime - startTime;
        };
        Scheduler.prototype.flushNonPeriodic = function (limit, doTick) {
            var startTime = this._currentTime;
            var lastCurrentTime = 0;
            var count = 0;
            while (this._schedulerQueue.length > 0) {
                count++;
                if (count > limit) {
                    throw new Error('flush failed after reaching the limit of ' + limit +
                        ' tasks. Does your code use a polling timeout?');
                }
                // flush only non-periodic timers.
                // If the only remaining tasks are periodic(or requestAnimationFrame), finish flushing.
                if (this._schedulerQueue.filter(function (task) { return !task.isPeriodic && !task.isRequestAnimationFrame; })
                    .length === 0) {
                    break;
                }
                var current = this._schedulerQueue.shift();
                lastCurrentTime = this._currentTime;
                this._currentTime = current.endTime;
                if (doTick) {
                    // Update any secondary schedulers like Jasmine mock Date.
                    doTick(this._currentTime - lastCurrentTime);
                }
                var retval = current.func.apply(global, current.args);
                if (!retval) {
                    // Uncaught exception in the current scheduled function. Stop processing the queue.
                    break;
                }
            }
            return this._currentTime - startTime;
        };
        return Scheduler;
    }());
    var FakeAsyncTestZoneSpec = /** @class */ (function () {
        function FakeAsyncTestZoneSpec(namePrefix, trackPendingRequestAnimationFrame, macroTaskOptions) {
            if (trackPendingRequestAnimationFrame === void 0) { trackPendingRequestAnimationFrame = false; }
            this.trackPendingRequestAnimationFrame = trackPendingRequestAnimationFrame;
            this.macroTaskOptions = macroTaskOptions;
            this._scheduler = new Scheduler();
            this._microtasks = [];
            this._lastError = null;
            this._uncaughtPromiseErrors = Promise[Zone.__symbol__('uncaughtPromiseErrors')];
            this.pendingPeriodicTimers = [];
            this.pendingTimers = [];
            this.patchDateLocked = false;
            this.properties = { 'FakeAsyncTestZoneSpec': this };
            this.name = 'fakeAsyncTestZone for ' + namePrefix;
            // in case user can't access the construction of FakeAsyncTestSpec
            // user can also define macroTaskOptions by define a global variable.
            if (!this.macroTaskOptions) {
                this.macroTaskOptions = global[Zone.__symbol__('FakeAsyncTestMacroTask')];
            }
        }
        FakeAsyncTestZoneSpec.assertInZone = function () {
            if (Zone.current.get('FakeAsyncTestZoneSpec') == null) {
                throw new Error('The code should be running in the fakeAsync zone to call this function');
            }
        };
        FakeAsyncTestZoneSpec.prototype._fnAndFlush = function (fn, completers) {
            var _this = this;
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                fn.apply(global, args);
                if (_this._lastError === null) {
                    if (completers.onSuccess != null) {
                        completers.onSuccess.apply(global);
                    }
                    // Flush microtasks only on success.
                    _this.flushMicrotasks();
                }
                else {
                    if (completers.onError != null) {
                        completers.onError.apply(global);
                    }
                }
                // Return true if there were no errors, false otherwise.
                return _this._lastError === null;
            };
        };
        FakeAsyncTestZoneSpec._removeTimer = function (timers, id) {
            var index = timers.indexOf(id);
            if (index > -1) {
                timers.splice(index, 1);
            }
        };
        FakeAsyncTestZoneSpec.prototype._dequeueTimer = function (id) {
            var _this = this;
            return function () {
                FakeAsyncTestZoneSpec._removeTimer(_this.pendingTimers, id);
            };
        };
        FakeAsyncTestZoneSpec.prototype._requeuePeriodicTimer = function (fn, interval, args, id) {
            var _this = this;
            return function () {
                // Requeue the timer callback if it's not been canceled.
                if (_this.pendingPeriodicTimers.indexOf(id) !== -1) {
                    _this._scheduler.scheduleFunction(fn, interval, args, true, false, id);
                }
            };
        };
        FakeAsyncTestZoneSpec.prototype._dequeuePeriodicTimer = function (id) {
            var _this = this;
            return function () {
                FakeAsyncTestZoneSpec._removeTimer(_this.pendingPeriodicTimers, id);
            };
        };
        FakeAsyncTestZoneSpec.prototype._setTimeout = function (fn, delay, args, isTimer) {
            if (isTimer === void 0) { isTimer = true; }
            var removeTimerFn = this._dequeueTimer(this._scheduler.nextId);
            // Queue the callback and dequeue the timer on success and error.
            var cb = this._fnAndFlush(fn, { onSuccess: removeTimerFn, onError: removeTimerFn });
            var id = this._scheduler.scheduleFunction(cb, delay, args, false, !isTimer);
            if (isTimer) {
                this.pendingTimers.push(id);
            }
            return id;
        };
        FakeAsyncTestZoneSpec.prototype._clearTimeout = function (id) {
            FakeAsyncTestZoneSpec._removeTimer(this.pendingTimers, id);
            this._scheduler.removeScheduledFunctionWithId(id);
        };
        FakeAsyncTestZoneSpec.prototype._setInterval = function (fn, interval, args) {
            var id = this._scheduler.nextId;
            var completers = { onSuccess: null, onError: this._dequeuePeriodicTimer(id) };
            var cb = this._fnAndFlush(fn, completers);
            // Use the callback created above to requeue on success.
            completers.onSuccess = this._requeuePeriodicTimer(cb, interval, args, id);
            // Queue the callback and dequeue the periodic timer only on error.
            this._scheduler.scheduleFunction(cb, interval, args, true);
            this.pendingPeriodicTimers.push(id);
            return id;
        };
        FakeAsyncTestZoneSpec.prototype._clearInterval = function (id) {
            FakeAsyncTestZoneSpec._removeTimer(this.pendingPeriodicTimers, id);
            this._scheduler.removeScheduledFunctionWithId(id);
        };
        FakeAsyncTestZoneSpec.prototype._resetLastErrorAndThrow = function () {
            var error = this._lastError || this._uncaughtPromiseErrors[0];
            this._uncaughtPromiseErrors.length = 0;
            this._lastError = null;
            throw error;
        };
        FakeAsyncTestZoneSpec.prototype.getCurrentTime = function () {
            return this._scheduler.getCurrentTime();
        };
        FakeAsyncTestZoneSpec.prototype.getCurrentRealTime = function () {
            return this._scheduler.getCurrentRealTime();
        };
        FakeAsyncTestZoneSpec.prototype.setCurrentRealTime = function (realTime) {
            this._scheduler.setCurrentRealTime(realTime);
        };
        FakeAsyncTestZoneSpec.patchDate = function () {
            if (global['Date'] === FakeDate) {
                // already patched
                return;
            }
            global['Date'] = FakeDate;
            FakeDate.prototype = OriginalDate.prototype;
            // try check and reset timers
            // because jasmine.clock().install() may
            // have replaced the global timer
            FakeAsyncTestZoneSpec.checkTimerPatch();
        };
        FakeAsyncTestZoneSpec.resetDate = function () {
            if (global['Date'] === FakeDate) {
                global['Date'] = OriginalDate;
            }
        };
        FakeAsyncTestZoneSpec.checkTimerPatch = function () {
            if (global.setTimeout !== timers.setTimeout) {
                global.setTimeout = timers.setTimeout;
                global.clearTimeout = timers.clearTimeout;
            }
            if (global.setInterval !== timers.setInterval) {
                global.setInterval = timers.setInterval;
                global.clearInterval = timers.clearInterval;
            }
        };
        FakeAsyncTestZoneSpec.prototype.lockDatePatch = function () {
            this.patchDateLocked = true;
            FakeAsyncTestZoneSpec.patchDate();
        };
        FakeAsyncTestZoneSpec.prototype.unlockDatePatch = function () {
            this.patchDateLocked = false;
            FakeAsyncTestZoneSpec.resetDate();
        };
        FakeAsyncTestZoneSpec.prototype.tick = function (millis, doTick) {
            if (millis === void 0) { millis = 0; }
            FakeAsyncTestZoneSpec.assertInZone();
            this.flushMicrotasks();
            this._scheduler.tick(millis, doTick);
            if (this._lastError !== null) {
                this._resetLastErrorAndThrow();
            }
        };
        FakeAsyncTestZoneSpec.prototype.flushMicrotasks = function () {
            var _this = this;
            FakeAsyncTestZoneSpec.assertInZone();
            var flushErrors = function () {
                if (_this._lastError !== null || _this._uncaughtPromiseErrors.length) {
                    // If there is an error stop processing the microtask queue and rethrow the error.
                    _this._resetLastErrorAndThrow();
                }
            };
            while (this._microtasks.length > 0) {
                var microtask = this._microtasks.shift();
                microtask.func.apply(microtask.target, microtask.args);
            }
            flushErrors();
        };
        FakeAsyncTestZoneSpec.prototype.flush = function (limit, flushPeriodic, doTick) {
            FakeAsyncTestZoneSpec.assertInZone();
            this.flushMicrotasks();
            var elapsed = this._scheduler.flush(limit, flushPeriodic, doTick);
            if (this._lastError !== null) {
                this._resetLastErrorAndThrow();
            }
            return elapsed;
        };
        FakeAsyncTestZoneSpec.prototype.clearAllMacrotasks = function () {
            while (this.pendingTimers.length > 0) {
                var timerId = this.pendingTimers.shift();
                this._clearTimeout(timerId);
            }
            while (this.pendingPeriodicTimers.length > 0) {
                var intervalId = this.pendingPeriodicTimers.shift();
                this._clearInterval(intervalId);
            }
        };
        FakeAsyncTestZoneSpec.prototype.onScheduleTask = function (delegate, current, target, task) {
            switch (task.type) {
                case 'microTask':
                    var args = task.data && task.data.args;
                    // should pass additional arguments to callback if have any
                    // currently we know process.nextTick will have such additional
                    // arguments
                    var additionalArgs = void 0;
                    if (args) {
                        var callbackIndex = task.data.cbIdx;
                        if (typeof args.length === 'number' && args.length > callbackIndex + 1) {
                            additionalArgs = Array.prototype.slice.call(args, callbackIndex + 1);
                        }
                    }
                    this._microtasks.push({
                        func: task.invoke,
                        args: additionalArgs,
                        target: task.data && task.data.target
                    });
                    break;
                case 'macroTask':
                    switch (task.source) {
                        case 'setTimeout':
                            task.data['handleId'] = this._setTimeout(task.invoke, task.data['delay'], Array.prototype.slice.call(task.data['args'], 2));
                            break;
                        case 'setImmediate':
                            task.data['handleId'] = this._setTimeout(task.invoke, 0, Array.prototype.slice.call(task.data['args'], 1));
                            break;
                        case 'setInterval':
                            task.data['handleId'] = this._setInterval(task.invoke, task.data['delay'], Array.prototype.slice.call(task.data['args'], 2));
                            break;
                        case 'XMLHttpRequest.send':
                            throw new Error('Cannot make XHRs from within a fake async test. Request URL: ' +
                                task.data['url']);
                        case 'requestAnimationFrame':
                        case 'webkitRequestAnimationFrame':
                        case 'mozRequestAnimationFrame':
                            // Simulate a requestAnimationFrame by using a setTimeout with 16 ms.
                            // (60 frames per second)
                            task.data['handleId'] = this._setTimeout(task.invoke, 16, task.data['args'], this.trackPendingRequestAnimationFrame);
                            break;
                        default:
                            // user can define which macroTask they want to support by passing
                            // macroTaskOptions
                            var macroTaskOption = this.findMacroTaskOption(task);
                            if (macroTaskOption) {
                                var args_1 = task.data && task.data['args'];
                                var delay = args_1 && args_1.length > 1 ? args_1[1] : 0;
                                var callbackArgs = macroTaskOption.callbackArgs ? macroTaskOption.callbackArgs : args_1;
                                if (!!macroTaskOption.isPeriodic) {
                                    // periodic macroTask, use setInterval to simulate
                                    task.data['handleId'] = this._setInterval(task.invoke, delay, callbackArgs);
                                    task.data.isPeriodic = true;
                                }
                                else {
                                    // not periodic, use setTimeout to simulate
                                    task.data['handleId'] = this._setTimeout(task.invoke, delay, callbackArgs);
                                }
                                break;
                            }
                            throw new Error('Unknown macroTask scheduled in fake async test: ' + task.source);
                    }
                    break;
                case 'eventTask':
                    task = delegate.scheduleTask(target, task);
                    break;
            }
            return task;
        };
        FakeAsyncTestZoneSpec.prototype.onCancelTask = function (delegate, current, target, task) {
            switch (task.source) {
                case 'setTimeout':
                case 'requestAnimationFrame':
                case 'webkitRequestAnimationFrame':
                case 'mozRequestAnimationFrame':
                    return this._clearTimeout(task.data['handleId']);
                case 'setInterval':
                    return this._clearInterval(task.data['handleId']);
                default:
                    // user can define which macroTask they want to support by passing
                    // macroTaskOptions
                    var macroTaskOption = this.findMacroTaskOption(task);
                    if (macroTaskOption) {
                        var handleId = task.data['handleId'];
                        return macroTaskOption.isPeriodic ? this._clearInterval(handleId) :
                            this._clearTimeout(handleId);
                    }
                    return delegate.cancelTask(target, task);
            }
        };
        FakeAsyncTestZoneSpec.prototype.onInvoke = function (delegate, current, target, callback, applyThis, applyArgs, source) {
            try {
                FakeAsyncTestZoneSpec.patchDate();
                return delegate.invoke(target, callback, applyThis, applyArgs, source);
            }
            finally {
                if (!this.patchDateLocked) {
                    FakeAsyncTestZoneSpec.resetDate();
                }
            }
        };
        FakeAsyncTestZoneSpec.prototype.findMacroTaskOption = function (task) {
            if (!this.macroTaskOptions) {
                return null;
            }
            for (var i = 0; i < this.macroTaskOptions.length; i++) {
                var macroTaskOption = this.macroTaskOptions[i];
                if (macroTaskOption.source === task.source) {
                    return macroTaskOption;
                }
            }
            return null;
        };
        FakeAsyncTestZoneSpec.prototype.onHandleError = function (parentZoneDelegate, currentZone, targetZone, error) {
            this._lastError = error;
            return false; // Don't propagate error to parent zone.
        };
        return FakeAsyncTestZoneSpec;
    }());
    // Export the class so that new instances can be created with proper
    // constructor params.
    Zone['FakeAsyncTestZoneSpec'] = FakeAsyncTestZoneSpec;
})(typeof window === 'object' && window || typeof self === 'object' && self || global);

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Zone.__load_patch('fakeasync', function (global, Zone, api) {
    var FakeAsyncTestZoneSpec = Zone && Zone['FakeAsyncTestZoneSpec'];
    var ProxyZoneSpec = Zone && Zone['ProxyZoneSpec'];
    var _fakeAsyncTestZoneSpec = null;
    /**
     * Clears out the shared fake async zone for a test.
     * To be called in a global `beforeEach`.
     *
     * @experimental
     */
    function resetFakeAsyncZone() {
        if (_fakeAsyncTestZoneSpec) {
            _fakeAsyncTestZoneSpec.unlockDatePatch();
        }
        _fakeAsyncTestZoneSpec = null;
        // in node.js testing we may not have ProxyZoneSpec in which case there is nothing to reset.
        ProxyZoneSpec && ProxyZoneSpec.assertPresent().resetDelegate();
    }
    /**
     * Wraps a function to be executed in the fakeAsync zone:
     * - microtasks are manually executed by calling `flushMicrotasks()`,
     * - timers are synchronous, `tick()` simulates the asynchronous passage of time.
     *
     * If there are any pending timers at the end of the function, an exception will be thrown.
     *
     * Can be used to wrap inject() calls.
     *
     * ## Example
     *
     * {@example core/testing/ts/fake_async.ts region='basic'}
     *
     * @param fn
     * @returns The function wrapped to be executed in the fakeAsync zone
     *
     * @experimental
     */
    function fakeAsync(fn, options) {
        if (options === void 0) { options = { checkNested: true, checkRemainingMacrotasks: true }; }
        // Not using an arrow function to preserve context passed from call site
        if (global['__zone_symbol__fakeAsyncCheckRemaining'] === false) {
            options.checkRemainingMacrotasks = false;
        }
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var proxyZoneSpec = ProxyZoneSpec.assertPresent();
            if (Zone.current.get('FakeAsyncTestZoneSpec')) {
                if (options.checkNested) {
                    throw new Error('fakeAsync() calls can not be nested');
                }
                // already in fakeAsyncZone
                return fn.apply(this, args);
            }
            try {
                // in case jasmine.clock init a fakeAsyncTestZoneSpec
                if (!_fakeAsyncTestZoneSpec) {
                    if (proxyZoneSpec.getDelegate() instanceof FakeAsyncTestZoneSpec) {
                        if (options.checkNested) {
                            throw new Error('fakeAsync() calls can not be nested');
                        }
                        // already in fakeAsyncZone
                        return fn.apply(this, args);
                    }
                    _fakeAsyncTestZoneSpec = new FakeAsyncTestZoneSpec();
                }
                var res = void 0;
                var lastProxyZoneSpec = proxyZoneSpec.getDelegate();
                proxyZoneSpec.setDelegate(_fakeAsyncTestZoneSpec);
                _fakeAsyncTestZoneSpec.lockDatePatch();
                try {
                    res = fn.apply(this, args);
                    flushMicrotasks();
                }
                finally {
                    proxyZoneSpec.setDelegate(lastProxyZoneSpec);
                }
                // TODO: @JiaLiPassion, we don't need to report error here.
                // need to confirm.
                if (options.checkRemainingMacrotasks) {
                    if (_fakeAsyncTestZoneSpec.pendingPeriodicTimers.length > 0) {
                        throw new Error(_fakeAsyncTestZoneSpec.pendingPeriodicTimers.length + " " +
                            "periodic timer(s) still in the queue.");
                    }
                    if (_fakeAsyncTestZoneSpec.pendingTimers.length > 0) {
                        throw new Error(_fakeAsyncTestZoneSpec.pendingTimers.length + " timer(s) still in the queue.");
                    }
                }
                return res;
            }
            finally {
                resetFakeAsyncZone();
            }
        };
    }
    function _getFakeAsyncZoneSpec() {
        if (_fakeAsyncTestZoneSpec == null) {
            _fakeAsyncTestZoneSpec = Zone.current.get('FakeAsyncTestZoneSpec');
            if (_fakeAsyncTestZoneSpec == null) {
                throw new Error('The code should be running in the fakeAsync zone to call this function');
            }
        }
        return _fakeAsyncTestZoneSpec;
    }
    /**
     * Simulates the asynchronous passage of time for the timers in the fakeAsync zone.
     *
     * The microtasks queue is drained at the very start of this function and after any timer callback
     * has been executed.
     *
     * ## Example
     *
     * {@example core/testing/ts/fake_async.ts region='basic'}
     *
     * @experimental
     */
    function tick(millis, doTick) {
        if (millis === void 0) { millis = 0; }
        _getFakeAsyncZoneSpec().tick(millis, doTick);
    }
    /**
     * Simulates the asynchronous passage of time for the timers in the fakeAsync zone by
     * draining the macrotask queue until it is empty. The returned value is the milliseconds
     * of time that would have been elapsed.
     *
     * @param maxTurns
     * @returns The simulated time elapsed, in millis.
     *
     * @experimental
     */
    function flush(maxTurns, isPeriodic) {
        if (isPeriodic === void 0) { isPeriodic = false; }
        return _getFakeAsyncZoneSpec().flush(maxTurns, isPeriodic);
    }
    /**
     * Discard all remaining periodic tasks.
     *
     * @experimental
     */
    function discardPeriodicTasks() {
        var zoneSpec = _getFakeAsyncZoneSpec();
        var pendingTimers = zoneSpec.pendingPeriodicTimers;
        zoneSpec.pendingPeriodicTimers.length = 0;
    }
    /**
     * Flush any pending microtasks.
     *
     * @experimental
     */
    function flushMicrotasks() {
        _getFakeAsyncZoneSpec().flushMicrotasks();
    }
    /**
     * Clear all microtasks
     *
     * @experimental
     */
    function clearAllMacrotasks() {
        _getFakeAsyncZoneSpec().clearAllMacrotasks();
    }
    /**
     * flush all macroTasks and discard periodic tasks
     *
     * @experimental
     */
    function flushAndDiscardPeriodicTasks() {
        var fakeAsyncSpec = _getFakeAsyncZoneSpec();
        fakeAsyncSpec.flush(100, true);
        discardPeriodicTasks();
    }
    Zone[api.symbol('fakeAsyncTest')] =
        { resetFakeAsyncZone: resetFakeAsyncZone, flushMicrotasks: flushMicrotasks, discardPeriodicTasks: discardPeriodicTasks, tick: tick, flush: flush, fakeAsync: fakeAsync, clearAllMacrotasks: clearAllMacrotasks };
    /**
     * expose those function to global
     */
    global['resetFakeAsyncZone'] = resetFakeAsyncZone;
    global['flushMicrotasks'] = flushMicrotasks;
    global['discardPeriodicTasks'] = discardPeriodicTasks;
    global['tick'] = tick;
    global['flush'] = flush;
    global['fakeAsyncTest'] = fakeAsync;
    global['clearAllMacrotasks'] = clearAllMacrotasks;
    global['flushAndDiscardPeriodicTasks'] = flushAndDiscardPeriodicTasks;
});

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Promise for async/fakeAsync zoneSpec test
 * can support async operation which not supported by zone.js
 * such as
 * it ('test jsonp in AsyncZone', async() => {
 *   new Promise(res => {
 *     jsonp(url, (data) => {
 *       // success callback
 *       res(data);
 *     });
 *   }).then((jsonpResult) => {
 *     // get jsonp result.
 *
 *     // user will expect AsyncZoneSpec wait for
 *     // then, but because jsonp is not zone aware
 *     // AsyncZone will finish before then is called.
 *   });
 * });
 */
Zone.__load_patch('promisefortest', function (global, Zone, api) {
    var symbolState = api.symbol('state');
    var UNRESOLVED = null;
    var symbolParentUnresolved = api.symbol('parentUnresolved');
    // patch Promise.prototype.then to keep an internal
    // number for tracking unresolved chained promise
    // we will decrease this number when the parent promise
    // being resolved/rejected and chained promise was
    // scheduled as a microTask.
    // so we can know such kind of chained promise still
    // not resolved in AsyncTestZone
    Promise[api.symbol('patchPromiseForTest')] = function patchPromiseForTest() {
        var oriThen = Promise[Zone.__symbol__('ZonePromiseThen')];
        if (oriThen) {
            return;
        }
        oriThen = Promise[Zone.__symbol__('ZonePromiseThen')] = Promise.prototype.then;
        Promise.prototype.then = function () {
            var chained = oriThen.apply(this, arguments);
            if (this[symbolState] === UNRESOLVED) {
                // parent promise is unresolved.
                var asyncTestZoneSpec = Zone.current.get('AsyncTestZoneSpec');
                if (asyncTestZoneSpec) {
                    asyncTestZoneSpec.unresolvedChainedPromiseCount++;
                    chained[symbolParentUnresolved] = true;
                }
            }
            return chained;
        };
    };
    Promise[api.symbol('unPatchPromiseForTest')] = function unpatchPromiseForTest() {
        // restore origin then
        var oriThen = Promise[Zone.__symbol__('ZonePromiseThen')];
        if (oriThen) {
            Promise.prototype.then = oriThen;
            Promise[Zone.__symbol__('ZonePromiseThen')] = undefined;
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

var symbol = Zone.__symbol__;
function mappingMochaMethods(jasmine, global, context) {
    if (context && !context.timeout) {
        context.timeout = function (timeout) {
            jasmine['__zone_symbol__DEFAULT_TIMEOUT_INTERVAL'] = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            jasmine.DEFAULT_TIMEOUT_INTERVAL = timeout;
        };
    }
    if (context && !context.skip) {
        context.skip = function () {
            if (typeof global['pending'] === 'function') {
                global['pending']();
            }
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
Zone.__load_patch('jasmine', function (global) {
    var __extends = function (d, b) {
        for (var p in b)
            if (b.hasOwnProperty(p))
                d[p] = b[p];
        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
    // Patch jasmine's describe/it/beforeEach/afterEach functions so test code always runs
    // in a testZone (ProxyZone). (See: angular/zone.js#91 & angular/angular#10503)
    if (!Zone)
        throw new Error('Missing: zone.js');
    if (typeof jasmine == 'undefined') {
        // not using jasmine, just return;
        return;
    }
    if (jasmine['__zone_symbol__isBridge']) {
        // jasmine is a mock bridge
        return;
    }
    if (jasmine['__zone_patch__'])
        throw new Error("'jasmine' has already been patched with 'Zone'.");
    jasmine['__zone_patch__'] = true;
    var SyncTestZoneSpec = Zone['SyncTestZoneSpec'];
    var ProxyZoneSpec = Zone['ProxyZoneSpec'];
    if (!SyncTestZoneSpec)
        throw new Error('Missing: SyncTestZoneSpec');
    if (!ProxyZoneSpec)
        throw new Error('Missing: ProxyZoneSpec');
    var ambientZone = Zone.current;
    // Create a synchronous-only zone in which to run `describe` blocks in order to raise an
    // error if any asynchronous operations are attempted inside of a `describe` but outside of
    // a `beforeEach` or `it`.
    var syncZone = ambientZone.fork(new SyncTestZoneSpec('jasmine.describe'));
    var symbol = Zone.__symbol__;
    // Monkey patch all of the jasmine DSL so that each function runs in appropriate zone.
    var jasmineEnv = jasmine.getEnv();
    ['describe', 'xdescribe', 'fdescribe'].forEach(function (methodName) {
        var originalJasmineFn = jasmineEnv[methodName];
        jasmineEnv[methodName] = function (description, specDefinitions) {
            return originalJasmineFn.call(this, description, wrapDescribeInZone(specDefinitions));
        };
    });
    ['it', 'xit', 'fit'].forEach(function (methodName) {
        var originalJasmineFn = jasmineEnv[methodName];
        jasmineEnv[symbol(methodName)] = originalJasmineFn;
        jasmineEnv[methodName] = function (description, specDefinitions, timeout) {
            var wrappedSpecDef = wrapTestInZone(specDefinitions);
            return originalJasmineFn.apply(this, typeof timeout === 'number' ? [description, wrappedSpecDef, timeout] :
                [description, wrappedSpecDef]);
        };
    });
    ['beforeAll', 'afterAll', 'beforeEach', 'afterEach'].forEach(function (methodName) {
        var originalJasmineFn = jasmineEnv[methodName];
        jasmineEnv[symbol(methodName)] = originalJasmineFn;
        jasmineEnv[methodName] = function (specDefinitions, timeout) {
            var wrappedSpecDef = wrapTestInZone(specDefinitions);
            return originalJasmineFn.apply(this, typeof timeout === 'number' ? [wrappedSpecDef, timeout] : [wrappedSpecDef]);
        };
    });
    patchJasmineClock(jasmine, global);
    /**
     * Gets a function wrapping the body of a Jasmine `describe` block to execute in a
     * synchronous-only zone.
     */
    function wrapDescribeInZone(describeBody) {
        return function () {
            mappingMochaMethods(jasmine, global, this);
            return syncZone.run(describeBody, this, arguments);
        };
    }
    function runInTestZone(testBody, applyThis, queueRunner, done) {
        var isClockInstalled = jasmine[symbol('clockInstalled')] === true;
        var testProxyZoneSpec = queueRunner.testProxyZoneSpec;
        var testProxyZone = queueRunner.testProxyZone;
        if (isClockInstalled) {
            // auto run a fakeAsync
            var fakeAsyncModule = Zone[Zone.__symbol__('fakeAsyncTest')];
            if (fakeAsyncModule && typeof fakeAsyncModule.fakeAsync === 'function') {
                testBody = fakeAsyncModule.fakeAsync(testBody);
            }
        }
        mappingMochaMethods(jasmine, global, applyThis);
        if (done) {
            return testProxyZone.run(testBody, applyThis, [done]);
        }
        else {
            return testProxyZone.run(testBody, applyThis);
        }
    }
    /**
     * Gets a function wrapping the body of a Jasmine `it/beforeEach/afterEach` block to
     * execute in a ProxyZone zone.
     * This will run in `testProxyZone`. The `testProxyZone` will be reset by the `ZoneQueueRunner`
     */
    function wrapTestInZone(testBody) {
        // The `done` callback is only passed through if the function expects at least one argument.
        // Note we have to make a function with correct number of arguments, otherwise jasmine will
        // think that all functions are sync or async.
        return (testBody && (testBody.length ? function (done) {
            return runInTestZone(testBody, this, this.queueRunner, done);
        } : function () {
            return runInTestZone(testBody, this, this.queueRunner);
        }));
    }
    var QueueRunner = jasmine.QueueRunner;
    jasmine.QueueRunner = (function (_super) {
        __extends(ZoneQueueRunner, _super);
        function ZoneQueueRunner(attrs) {
            var _this = this;
            attrs.onComplete = (function (fn) { return function () {
                // All functions are done, clear the test zone.
                _this.testProxyZone = null;
                _this.testProxyZoneSpec = null;
                var originalTimeout = jasmine['__zone_symbol__DEFAULT_TIMEOUT_INTERVAL'];
                if (typeof originalTimeout === 'number') {
                    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
                }
                ambientZone.scheduleMicroTask('jasmine.onComplete', fn);
            }; })(attrs.onComplete);
            var nativeSetTimeout = global['__zone_symbol__setTimeout'];
            var nativeClearTimeout = global['__zone_symbol__clearTimeout'];
            if (nativeSetTimeout) {
                // should run setTimeout inside jasmine outside of zone
                attrs.timeout = {
                    setTimeout: nativeSetTimeout ? nativeSetTimeout : global.setTimeout,
                    clearTimeout: nativeClearTimeout ? nativeClearTimeout : global.clearTimeout
                };
            }
            // create a userContext to hold the queueRunner itself
            // so we can access the testProxy in it/xit/beforeEach ...
            if (jasmine.UserContext) {
                if (!attrs.userContext) {
                    attrs.userContext = new jasmine.UserContext();
                }
                attrs.userContext.queueRunner = this;
            }
            else {
                if (!attrs.userContext) {
                    attrs.userContext = {};
                }
                attrs.userContext.queueRunner = this;
            }
            // patch attrs.onException
            var onException = attrs.onException;
            attrs.onException = function (error) {
                if (error &&
                    error.message ===
                        'Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.') {
                    // jasmine timeout, we can make the error message more
                    // reasonable to tell what tasks are pending
                    var proxyZoneSpec = this && this.testProxyZoneSpec;
                    if (proxyZoneSpec) {
                        var pendingTasksInfo = proxyZoneSpec.getAndClearPendingTasksInfo();
                        error.message += pendingTasksInfo;
                    }
                }
                if (onException) {
                    onException.call(this, error);
                }
            };
            _super.call(this, attrs);
        }
        ZoneQueueRunner.prototype.execute = function () {
            var _this = this;
            var zone = Zone.current;
            var isChildOfAmbientZone = false;
            while (zone) {
                if (zone === ambientZone) {
                    isChildOfAmbientZone = true;
                    break;
                }
                zone = zone.parent;
            }
            if (!isChildOfAmbientZone)
                throw new Error('Unexpected Zone: ' + Zone.current.name);
            // This is the zone which will be used for running individual tests.
            // It will be a proxy zone, so that the tests function can retroactively install
            // different zones.
            // Example:
            //   - In beforeEach() do childZone = Zone.current.fork(...);
            //   - In it() try to do fakeAsync(). The issue is that because the beforeEach forked the
            //     zone outside of fakeAsync it will be able to escape the fakeAsync rules.
            //   - Because ProxyZone is parent fo `childZone` fakeAsync can retroactively add
            //     fakeAsync behavior to the childZone.
            this.testProxyZoneSpec = new ProxyZoneSpec();
            this.testProxyZone = ambientZone.fork(this.testProxyZoneSpec);
            if (!Zone.currentTask) {
                // if we are not running in a task then if someone would register a
                // element.addEventListener and then calling element.click() the
                // addEventListener callback would think that it is the top most task and would
                // drain the microtask queue on element.click() which would be incorrect.
                // For this reason we always force a task when running jasmine tests.
                Zone.current.scheduleMicroTask('jasmine.execute().forceTask', function () { return QueueRunner.prototype.execute.call(_this); });
            }
            else {
                _super.prototype.execute.call(this);
            }
        };
        return ZoneQueueRunner;
    })(QueueRunner);
});

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// TODO: @JiaLiPassion, add mocha/jest bridge for jasmine later
// import './mocha-bridge/mocha-bridge';

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
function mappingBDD$1(jasmine, Mocha, global) {
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

var __read$1 = (undefined && undefined.__read) || function (o, n) {
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
var __spread$1 = (undefined && undefined.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read$1(arguments[i]));
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
                    var args = expects ? __spread$1(expects) : [];
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
                    var args = expects ? __spread$1(expects) : [];
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
    mappingBDD$1(jasmine, global.Mocha, global);
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
function mappingBDD$2(jest, Mocha, global) {
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
    mappingBDD$2(jest, global.Mocha, global);
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

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// load test related files into bundle in correct order

})));
