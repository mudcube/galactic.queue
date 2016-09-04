module.exports = function (items, handler, processes) {
	processes || (processes = 1)

	var queue = {}
	var _done = false
	var _results = Array.isArray(items) ? [] : {}
	var _resolve
	var _reject
	var _keys = []
	var _items = []

	var _promise = EventEmitter(new Promise((resolve, reject) => {
		_resolve = resolve
		_reject = reject
		queue.cancel = cancel
		queue.progress = 0.0
		queue.remaining = 0
		queue.total = 0
		add(items)
		setTimeout(begin, 0)
	}))

	_promise.onProgress = function (handler) {
		return _promise.on('progress', handler)
	}

	return _promise

	function add(items) {
		forEach(items, (item, key) => {
			_items.push(item)
			_keys.push(key)
			queue.remaining ++
			queue.total ++
		})

		function forEach(object, handler) {
			var length = object.length
			if (typeof length === 'number' && length > -1 && length % 1 === 0) {
				for (var i = 0; i < length; i++) {
					handler(object[i], i)
				}
			} else {
				var keys = Object.keys(object)
				for (var i = 0, length = keys.length; i < length; i++) {
					var key = keys[i]
					handler(object[key], key)
				}
			}
		}
	}

	function begin() {
		for (var i = 0; i < processes; i ++) {
			next()
		}
	}

	function next() {
		if (_done) {
			return
		}

		var total = queue.total
		if (total) {
			var remaining = queue.remaining
			var progress = queue.progress = 1.0 - remaining / total
			_promise.emit('progress', progress)

			if (remaining) {
				queue.remaining --
				var index = total - remaining
				var key = _keys[index]
				var item = _items.shift()
				var promise = handler(item, key, queue)
				if (promise && promise.then) {
					promise.then((result) => {
						_results[key] = result
						next()
					}).catch(
						_reject
					)
					return
				}

				_results[key] = promise
				next()
				return
			}
		}

		_done = true
		_resolve(_results)
	}

	function cancel(message) {
		if (_done) {
			return
		}

		_done = true
		_reject({
			name: 'cancel',
			message,
			results: _results
		})
	}
}

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function EventEmitter(proto) {
	proto || (proto = {});
	if (proto.on || proto.off || proto.emit) {
		return proto; // already has handlers
	}

	var always = {};
	var handlers = {};
	var uniqueId = 1;

	function createId(type, handler) {
		if (typeof handler !== 'function') {
			console.error(type + ' listener is undefined');
			return;
		}

		var handlerId = handler.uniqueId || (handler.uniqueId = uniqueId++);
		return type + '.' + handlerId;
	}

	function listener(type) {
		if (handlers[type]) {
			return handlers[type];
		} else {
			return handlers[type] = Stack(type);
		}
	}

	function Stack(type) {
		var stack = {};

		function emitter() {
			var overrides = false;
			for (var key in stack) {
				if (stack[key].apply(proto, arguments)) {
					overrides = true;
				}
			}
			return overrides;
		}

		emitter.add = function (handler, that) {
			var fid = createId(type, handler);
			if (stack[fid] === undefined && handler) {
				stack[fid] = handler;
			}
			return {
				add: function add() {
					stack[fid] = handler;
				},
				remove: function remove() {
					delete stack[fid];
				}
			};
		};

		emitter.remove = function (handler) {
			var fid = createId(type, handler);
			if (stack[fid] !== undefined && handler) {
				delete stack[fid];
			}
		};

		return emitter;
	}

	proto.on = function (type, handler) {
		if (always[type]) {
			handler.apply(undefined, _toConsumableArray(always[type]));
		}

		var emitter = listener(type).add(handler);
		var out = toEmitter(this);
		out.add = emitter.add; //- depreciate
		out.remove = emitter.remove; //- depreciate
		out.on = this.on;
		out.off = this.off;
		out.emit = this.emit;
		return out;
	};

	proto.on.handlers = handlers;

	proto.off = function (type, handler) {
		if (handler) {
			listener(type).remove(handler);
		} else {
			delete handlers[type];
		}
	};

	proto.emit = function (type) {
		var stack = handlers[type];
		if (stack) {
			var args = Array.prototype.slice.call(arguments).slice(1);
			return stack.apply(proto, args);
		}
	};

	proto.emit.andNotifyNewHandlers = function (type) {
		var _proto;

		always[type] = arguments;
		(_proto = proto).emit.apply(_proto, arguments);
	};

	proto.emit.promiseRequest = function (type) {
		//- depreciate
		return new Promise(function (resolve, reject) {
			proto.emit(type, resolve, reject);
		});
	};
	return proto;
}

function toEmitter(object) {
	if (!object.then) {
		return {};
	}

	if (object.on && object.off && object.emit) {
		return object;
	}
	return EventEmitter(object);
}
